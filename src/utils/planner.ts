import type { AppLanguage, Cinema, CityId, Movie, ScreeningSession } from '../types/cinema';
import {
  formatCalendarChipParts,
  formatDistanceKm,
  formatRuntime,
  formatSessionPrice,
  formatSessionWindow,
  formatTimeFromMinutes,
} from './formatters';
import { computeHaversineKm, getCinemaCoords, type UserLocationOrigin } from './proximity';
import { getDisplayMovieTitle } from './i18n';

export interface ReachabilityInfo {
  travelMinutes: number;
  minutesUntilStart: number;
  canMakeIt: boolean;
  status: 'past' | 'tight' | 'leave_soon' | 'ready';
}

export function estimateTransitMinutes(distanceKm: number, city: CityId): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 10;
  const perKmFactor = city === 'shanghai' ? 2.8 : 3.2;
  return Math.max(10, Math.min(75, Math.round(8 + distanceKm * perKmFactor)));
}

/**
 * Evaluates whether a user at `userOrigin` can realistically still reach today's session.
 * Includes estimated transit travel + 10-minute pre-feature grace buffer before trailers end.
 */
export function evaluateSessionReachability(
  distanceKm: number,
  city: CityId,
  startMinutesFromMidnight: number,
  localNowMinutes: number
): ReachabilityInfo {
  const travelMinutes = estimateTransitMinutes(distanceKm, city);
  const minutesUntilStart = startMinutesFromMidnight - localNowMinutes;
  const arrivalDelta = minutesUntilStart + 10 - travelMinutes; // +10m preview grace
  if (arrivalDelta < 0) {
    return { travelMinutes, minutesUntilStart, canMakeIt: false, status: 'past' };
  }
  if (arrivalDelta <= 15) {
    return { travelMinutes, minutesUntilStart, canMakeIt: true, status: 'leave_soon' };
  }
  if (minutesUntilStart <= 90) {
    return { travelMinutes, minutesUntilStart, canMakeIt: true, status: 'tight' };
  }
  return { travelMinutes, minutesUntilStart, canMakeIt: true, status: 'ready' };
}

export interface DoubleFeatureCandidate {
  session: ScreeningSession;
  movie: Movie;
  cinema: Cinema;
  isSameCinema: boolean;
  transferDistanceKm: number;
  breakMinutes: number;
  combinedRuntimeMinutes: number;
  combinedPrice: number;
}

/**
 * Finds compatible Film B sessions on the same date starting 10–75 minutes after Film A ends
 * (including Film A's 15-minute trailer window) at the same cinema or within 3 km.
 */
export function findDoubleFeatureCandidates(params: {
  firstSession: ScreeningSession;
  firstMovie: Movie;
  firstCinema: Cinema;
  sameDaySessions: ScreeningSession[];
  movieMap: Map<string, Movie>;
  cinemaMap: Map<string, Cinema>;
  maxResults?: number;
}): DoubleFeatureCandidate[] {
  const {
    firstSession,
    firstMovie,
    firstCinema,
    sameDaySessions,
    movieMap,
    cinemaMap,
    maxResults = 4,
  } = params;

  const firstEndMinutes = firstSession.startMinutesFromMidnight + firstMovie.runtimeMinutes + 15;
  const firstCoords = getCinemaCoords(firstCinema);
  const minBreak = 10;
  const maxBreak = 75;
  const candidates: DoubleFeatureCandidate[] = [];

  for (const cand of sameDaySessions) {
    if (cand.id === firstSession.id) continue;
    if (cand.movieId === firstSession.movieId) continue;

    const candCinema = cinemaMap.get(cand.cinemaId);
    const candMovie = movieMap.get(cand.movieId);
    if (!candCinema || !candMovie) continue;

    const isSameCinema = candCinema.id === firstCinema.id;
    let transferDistanceKm = 0;
    if (!isSameCinema) {
      const candCoords = getCinemaCoords(candCinema);
      if (!firstCoords || !candCoords) continue;
      transferDistanceKm = computeHaversineKm(
        firstCoords.lat,
        firstCoords.lng,
        candCoords.lat,
        candCoords.lng
      );
      if (transferDistanceKm > 3.0) continue;
    }

    const requiredTransferBuffer = isSameCinema
      ? minBreak
      : Math.max(minBreak, Math.round(12 + transferDistanceKm * 6));
    const breakMinutes = cand.startMinutesFromMidnight - firstEndMinutes;
    if (breakMinutes < requiredTransferBuffer || breakMinutes > maxBreak) continue;

    candidates.push({
      session: cand,
      movie: candMovie,
      cinema: candCinema,
      isSameCinema,
      transferDistanceKm,
      breakMinutes,
      combinedRuntimeMinutes: firstMovie.runtimeMinutes + candMovie.runtimeMinutes,
      combinedPrice: Math.round((firstSession.priceAud + cand.priceAud) * 100) / 100,
    });
  }

  candidates.sort((a, b) => {
    if (a.isSameCinema !== b.isSameCinema) return a.isSameCinema ? -1 : 1;
    if (Math.abs(a.transferDistanceKm - b.transferDistanceKm) > 0.2) {
      return a.transferDistanceKm - b.transferDistanceKm;
    }
    return a.breakMinutes - b.breakMinutes;
  });

  // Keep at most one best time slot per second movie so suggestions show variety
  const picked: DoubleFeatureCandidate[] = [];
  const seenMovies = new Set<string>();
  for (const c of candidates) {
    if (seenMovies.has(c.movie.id)) continue;
    seenMovies.add(c.movie.id);
    picked.push(c);
    if (picked.length >= maxResults) break;
  }
  return picked;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncateToFit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 4 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

export interface ShortlistShareCardItem {
  movie: Movie;
  cinema: Cinema;
  session: ScreeningSession;
  votes: number;
}

/**
 * Renders a self-contained editorial Noir Share Card PNG (1080x1350) purely via Canvas 2D
 * with zero external tainted images, and downloads it directly to the user's device.
 */
export async function exportShortlistCardPng(params: {
  items: ShortlistShareCardItem[];
  cityName: string;
  timeZone: ScreeningSession['city'] extends never
    ? never
    : 'Australia/Melbourne' | 'Australia/Sydney' | 'Asia/Shanghai';
  currency: 'AUD' | 'CNY';
  lang: AppLanguage;
  userOrigin: UserLocationOrigin;
}): Promise<boolean> {
  const { items, cityName, lang } = params;
  if (items.length === 0) return false;

  const width = 1080;
  const visible = items.slice(0, 5);
  const rowHeight = 196;
  const height = Math.max(820, 310 + visible.length * rowHeight + 110);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // Obsidian velvet background gradient
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0b0a09');
  bg.addColorStop(1, '#151210');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle gold frame border
  ctx.strokeStyle = 'rgba(216, 179, 106, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, width - 64, height - 64);

  // Header
  ctx.fillStyle = '#d8b36a';
  ctx.font = '600 22px Georgia, serif';
  ctx.fillText(
    lang === 'zh' ? 'REELHOUSE · 好友观影对比清单' : 'REELHOUSE · SALON CINÉMATOGRAPHIQUE',
    68,
    92
  );

  ctx.fillStyle = '#f5efe6';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.fillText(
    lang === 'zh' ? `${cityName} · 选片投票卡` : `${cityName} Screening Shortlist`,
    68,
    152
  );

  ctx.fillStyle = '#b4a999';
  ctx.font = '400 22px sans-serif';
  ctx.fillText(
    lang === 'zh'
      ? `共 ${visible.length} 个候选场次 · 含排片时间、规格与参考票价`
      : `${visible.length} candidate screenings compared · Times, formats & guide prices`,
    68,
    194
  );

  ctx.strokeStyle = 'rgba(245, 239, 230, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(68, 224);
  ctx.lineTo(width - 68, 224);
  ctx.stroke();

  let y = 252;
  const maxVotes = Math.max(...visible.map((x) => x.votes));

  visible.forEach((item, idx) => {
    const isLeader = visible.length > 1 && maxVotes > 1 && item.votes === maxVotes;
    drawRoundedRectPath(ctx, 68, y, width - 136, 172, 14);
    ctx.fillStyle = isLeader ? 'rgba(216, 179, 106, 0.11)' : 'rgba(255, 255, 255, 0.035)';
    ctx.fill();
    ctx.strokeStyle = isLeader ? 'rgba(216, 179, 106, 0.65)' : 'rgba(245, 239, 230, 0.14)';
    ctx.lineWidth = isLeader ? 2 : 1;
    ctx.stroke();

    const dayParts = formatCalendarChipParts(
      item.session.dateIso,
      item.session.city === 'shanghai'
        ? 'Asia/Shanghai'
        : item.session.city === 'sydney'
          ? 'Australia/Sydney'
          : 'Australia/Melbourne',
      lang
    );
    const win = formatSessionWindow(
      item.session.startMinutesFromMidnight,
      item.movie.runtimeMinutes
    );
    const curr = item.session.currency ?? (item.session.city === 'shanghai' ? 'CNY' : 'AUD');
    const priceStr = formatSessionPrice(item.session.priceAud, curr, true);

    // Index badge
    ctx.fillStyle = '#d8b36a';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`0${idx + 1}`, 94, y + 42);

    // Format + Price + Votes right column
    ctx.textAlign = 'right';
    ctx.fillStyle = '#d8b36a';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(priceStr, width - 94, y + 48);

    ctx.fillStyle = '#dfd7cc';
    ctx.font = '600 18px sans-serif';
    ctx.fillText(
      `${item.session.format} · ${item.votes} ${lang === 'zh' ? '票' : item.votes === 1 ? 'vote' : 'votes'}`,
      width - 94,
      y + 82
    );
    ctx.textAlign = 'left';

    // Film Title
    const title = getDisplayMovieTitle(item.movie, lang, item.session.city === 'shanghai');
    ctx.fillStyle = '#f8f4ed';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.fillText(truncateToFit(ctx, title, 630), 140, y + 46);

    // Cinema & Time
    ctx.fillStyle = '#e4dccf';
    ctx.font = '500 21px sans-serif';
    ctx.fillText(
      truncateToFit(
        ctx,
        `${item.cinema.name} (${item.cinema.suburb})`,
        680
      ),
      140,
      y + 86
    );

    ctx.fillStyle = '#d8b36a';
    ctx.font = '600 20px monospace';
    ctx.fillText(
      `${dayParts.weekdayShort} ${dayParts.dayMonthShort} · ${win.startFormatted} → ${win.finishFormatted}`,
      140,
      y + 122
    );

    const ratings: string[] = [];
    if (item.movie.ratings.imdb.score !== null) {
      ratings.push(`IMDb ${item.movie.ratings.imdb.score.toFixed(1)}`);
    }
    if (item.movie.ratings.rottenTomatoes.tomatometerPercent !== null) {
      ratings.push(`RT ${item.movie.ratings.rottenTomatoes.tomatometerPercent}%`);
    }
    if (item.movie.ratings.douban.score !== null) {
      ratings.push(`豆瓣 ${item.movie.ratings.douban.score.toFixed(1)}`);
    }
    ratings.push(formatRuntime(item.movie.runtimeMinutes));
    if (item.session.accessibilityTags.length > 0) {
      ratings.push(item.session.accessibilityTags[0]);
    }
    ctx.fillStyle = '#9f9486';
    ctx.font = '400 18px sans-serif';
    ctx.fillText(truncateToFit(ctx, ratings.join(' · '), width - 220), 140, y + 152);

    y += rowHeight;
  });

  // Footer
  ctx.fillStyle = '#8b8072';
  ctx.font = '400 19px sans-serif';
  ctx.fillText(
    lang === 'zh'
      ? `由 Reelhouse 生成 · 含实时影讯与票价参考`
      : `Generated by Reelhouse · Open shared link to vote & book seats`,
    68,
    height - 62
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = '#d8b36a';
  ctx.fillText(
    `${formatTimeFromMinutes(visible[0].session.startMinutesFromMidnight)} · ${formatDistanceKm(visible[0].cinema.distanceFromCbdKm)}`,
    width - 68,
    height - 62
  );
  ctx.textAlign = 'left';

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reelhouse-shortlist-${visible[0].session.dateIso}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}
