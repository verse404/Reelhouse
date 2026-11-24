import type {
  AppLanguage,
  BrowseMode,
  CinemaVibe,
  CityId,
  CityTimeZone,
  FilterState,
  FinishByOption,
  FormatType,
  MinRatingOption,
  PriceCapOption,
  ReleaseStatus,
  ShortlistEntry,
  TimeOfDay,
} from '../types/cinema';

/**
 * Strict allow-list of official Australian cinema domains permitted for outbound booking links.
 * Prevents open-redirect and `javascript:` / `data:` URI injection attacks.
 */
const ALLOWED_CINEMA_HOSTS = new Set<string>([
  'imaxmelbourne.com.au',
  'www.imaxmelbourne.com.au',
  'cinemanova.com.au',
  'www.cinemanova.com.au',
  'astortheatre.net.au',
  'www.astortheatre.net.au',
  'palacecinemas.com.au',
  'www.palacecinemas.com.au',
  'hoyts.com.au',
  'www.hoyts.com.au',
  'villagecinemas.com.au',
  'www.villagecinemas.com.au',
  'imax.com.au',
  'www.imax.com.au',
  'ourgoldenage.com.au',
  'www.ourgoldenage.com.au',
  'ritzcinemas.com.au',
  'www.ritzcinemas.com.au',
  'eventcinemas.com.au',
  'www.eventcinemas.com.au',
  'dendy.com.au',
  'www.dendy.com.au',
  'newtown.dendy.com.au',
  'readingcinemas.com.au',
  'www.readingcinemas.com.au',
  'unitedcinemas.com.au',
  'www.unitedcinemas.com.au',
  'lidocinemas.com.au',
  'www.lidocinemas.com.au',
  'classiccinemas.com.au',
  'www.classiccinemas.com.au',
  'cameocinemas.com.au',
  'www.cameocinemas.com.au',
  'suntheatre.com.au',
  'www.suntheatre.com.au',
  'orpheum.com.au',
  'www.orpheum.com.au',
  'maoyan.com',
  'www.maoyan.com',
  'm.maoyan.com',
  'wandacinemas.com',
  'www.wandacinemas.com',
  'cinema.com.cn',
  'www.cinema.com.cn',
]);

/**
 * Allow-list of external film rating platforms (IMDb, Rotten Tomatoes, Douban).
 */
const ALLOWED_RATING_HOSTS = new Set<string>([
  'imdb.com',
  'www.imdb.com',
  'rottentomatoes.com',
  'www.rottentomatoes.com',
  'movie.douban.com',
  'search.douban.com',
  'www.douban.com',
]);

/**
 * Validates that an outbound booking URL uses HTTPS and belongs to an allow-listed cinema domain.
 * Returns null if validation fails (fail-closed).
 */
export function getSafeOutboundCinemaUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') {
      return null;
    }
    if (!ALLOWED_CINEMA_HOSTS.has(parsed.hostname.toLowerCase())) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validates that an outbound rating link uses HTTPS and belongs to IMDb, Rotten Tomatoes, or Douban.
 */
export function getSafeOutboundRatingUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') {
      return null;
    }
    if (!ALLOWED_RATING_HOSTS.has(parsed.hostname.toLowerCase())) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validates that a live movie poster URL comes strictly from TMDB's official HTTPS CDN.
 */
export function getSafePosterImageUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (host === 'image.tmdb.org' && parsed.pathname.startsWith('/t/p/')) {
      return parsed.toString();
    }
    if (host === 'm.media-amazon.com' && parsed.pathname.startsWith('/images/')) {
      return parsed.toString();
    }
    if ((host === 'pipi.cn' || host.endsWith('.pipi.cn')) && parsed.pathname.length > 1) {
      if (!parsed.search) {
        parsed.search = '?imageMogr2/quality/80';
      }
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Builds a safe, RFC-3986 encoded universal Google Maps search URL for a cinema venue.
 * Uses the official Google Maps URLs API (`https://www.google.com/maps/search/?api=1&query=...`).
 */
export function buildSafeGoogleMapsUrl(cinemaName: string, address: string): string {
  const mapsUrl = new URL('https://www.google.com/maps/search/');
  mapsUrl.searchParams.set('api', '1');
  mapsUrl.searchParams.set('query', `${cinemaName}, ${address}`);
  return mapsUrl.toString();
}

/**
 * Builds a safe, RFC-3986 encoded universal Google Maps turn-by-turn directions URL
 * from the user's selected coordinates to a specific cinema venue.
 */
export function buildSafeGoogleMapsDirectionsUrl(
  originLat: number,
  originLng: number,
  cinemaName: string,
  address: string
): string {
  if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
    return buildSafeGoogleMapsUrl(cinemaName, address);
  }
  const dirUrl = new URL('https://www.google.com/maps/dir/');
  dirUrl.searchParams.set('api', '1');
  dirUrl.searchParams.set('origin', `${originLat.toFixed(5)},${originLng.toFixed(5)}`);
  dirUrl.searchParams.set('destination', `${cinemaName}, ${address}`);
  return dirUrl.toString();
}

/**
 * Copies text to the clipboard safely across both HTTPS and non-HTTPS (e.g. local HTTP) origins.
 */
export async function copyTextSafely(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textArea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Sanitizes free-text search input by stripping control characters and bounding length.
 */
export function sanitizeSearchQuery(rawInput: string): string {
  // Strip ASCII control characters while preserving Unicode letters, spaces, and punctuation.
  let cleaned = '';
  for (const ch of rawInput) {
    const code = ch.charCodeAt(0);
    if (code >= 0x20 && code !== 0x7f) {
      cleaned += ch;
    }
    if (cleaned.length >= 80) {
      break;
    }
  }
  return cleaned;
}

const SHORTLIST_STORAGE_KEY = 'reelhouse_shortlist_v1';
const WATCHLIST_STORAGE_KEY = 'reelhouse_watchlist_v1';
const FAVORITE_CINEMAS_STORAGE_KEY = 'reelhouse_fav_cinemas_v1';
const CITY_STORAGE_KEY = 'reelhouse_city_v1';
const EDITION_STORAGE_KEY = 'reelhouse_edition_v1';
const LANGUAGE_STORAGE_KEY = 'reelhouse_lang_v1';

// Safe session ID pattern: lowercase alphanumeric + hyphens/underscores
const SAFE_ID_REGEX = /^[a-z0-9_-]{3,96}$/i;

/**
 * Reads non-sensitive UI shortlist state from localStorage with strict schema validation.
 * NOTE: Never store authentication tokens, session IDs, or PII in localStorage.
 * TODO(security): When user accounts or group sync are introduced via a backend BFF,
 * authenticate sessions exclusively with HttpOnly, Secure, SameSite=Lax cookies (`__Host-session`)
 * and protect state-changing endpoints with CSRF tokens.
 */
export function loadValidatedShortlist(): ShortlistEntry[] {
  try {
    const raw = window.localStorage.getItem(SHORTLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validated: ShortlistEntry[] = [];
    for (const item of parsed.slice(0, 8)) {
      if (
        typeof item === 'object' &&
        item !== null &&
        'sessionId' in item &&
        typeof item.sessionId === 'string' &&
        SAFE_ID_REGEX.test(item.sessionId)
      ) {
        const votesRaw = 'votes' in item && typeof item.votes === 'number' ? item.votes : 1;
        const addedRaw =
          'addedAtMs' in item && typeof item.addedAtMs === 'number' ? item.addedAtMs : Date.now();
        validated.push({
          sessionId: item.sessionId,
          votes: Math.max(0, Math.min(99, Math.floor(votesRaw))),
          addedAtMs: addedRaw,
        });
      }
    }
    return validated;
  } catch {
    return [];
  }
}

export function saveShortlist(entries: ShortlistEntry[]): void {
  try {
    const bounded = entries.slice(0, 8);
    window.localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(bounded));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadValidatedCity(): CityId {
  try {
    const raw = window.localStorage.getItem(CITY_STORAGE_KEY);
    if (raw === 'melbourne' || raw === 'sydney' || raw === 'shanghai') {
      return raw;
    }
    return 'melbourne';
  } catch {
    return 'melbourne';
  }
}

export function saveCityPreference(city: CityId): void {
  try {
    window.localStorage.setItem(CITY_STORAGE_KEY, city);
  } catch {
    // Ignore storage errors
  }
}

export function loadValidatedEdition(): 'noir' | 'ivoire' {
  try {
    const raw = window.localStorage.getItem(EDITION_STORAGE_KEY);
    if (raw === 'ivoire' || raw === 'noir') {
      return raw;
    }
    return 'noir';
  } catch {
    return 'noir';
  }
}

export function saveEditionPreference(edition: 'noir' | 'ivoire'): void {
  try {
    window.localStorage.setItem(EDITION_STORAGE_KEY, edition);
  } catch {
    // Ignore storage errors
  }
}

export function loadValidatedLanguage(search = ''): AppLanguage {
  try {
    if (search) {
      const urlLang = new URLSearchParams(search).get('lang');
      if (urlLang === 'zh' || urlLang === 'en') {
        return urlLang;
      }
    }
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (raw === 'zh' || raw === 'en') {
      return raw;
    }
    return 'en';
  } catch {
    return 'en';
  }
}

export function saveLanguagePreference(lang: AppLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors
  }
}

export function loadValidatedWatchlist(): string[] {
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === 'string' && SAFE_ID_REGEX.test(id))
      .slice(0, 24);
  } catch {
    return [];
  }
}

export function saveWatchlist(movieIds: string[]): void {
  try {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(movieIds.slice(0, 24)));
  } catch {
    // Ignore storage errors
  }
}

export function loadValidatedFavoriteCinemas(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITE_CINEMAS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === 'string' && SAFE_ID_REGEX.test(id))
      .slice(0, 32);
  } catch {
    return [];
  }
}

export function saveFavoriteCinemas(cinemaIds: string[]): void {
  try {
    window.localStorage.setItem(
      FAVORITE_CINEMAS_STORAGE_KEY,
      JSON.stringify(cinemaIds.slice(0, 32))
    );
  } catch {
    // Ignore storage errors
  }
}

const SAFE_YOUTUBE_KEY_REGEX = /^[A-Za-z0-9_-]{8,16}$/;
const SAFE_ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a YouTube video key and builds a privacy-enhanced youtube-nocookie embed URL.
 */
export function getSafeYoutubeEmbedUrl(youtubeKey?: string): string | null {
  if (!youtubeKey || !SAFE_YOUTUBE_KEY_REGEX.test(youtubeKey)) return null;
  const embed = new URL(`https://www.youtube-nocookie.com/embed/${youtubeKey}`);
  embed.searchParams.set('autoplay', '1');
  embed.searchParams.set('rel', '0');
  embed.searchParams.set('modestbranding', '1');
  return embed.toString();
}

export function getSafeYoutubeWatchUrl(youtubeKey?: string): string | null {
  if (!youtubeKey || !SAFE_YOUTUBE_KEY_REGEX.test(youtubeKey)) return null;
  const watch = new URL('https://www.youtube.com/watch');
  watch.searchParams.set('v', youtubeKey);
  return watch.toString();
}

export interface GoogleCalendarSessionInput {
  movieTitle: string;
  director: string;
  format: string;
  auditoriumName: string;
  cinemaName: string;
  address: string;
  dateIso: string;
  startMinutesFromMidnight: number;
  runtimeMinutes: number;
  timeZone: CityTimeZone;
  bookingUrl?: string | null;
}

function formatFloatingCalDateTime(dateIso: string, totalMinutesFromStartDay: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dayOffset = Math.floor(totalMinutesFromStartDay / 1440);
  const remMins = ((totalMinutesFromStartDay % 1440) + 1440) % 1440;
  const hh = Math.floor(remMins / 60);
  const mm = remMins % 60;
  const dt = new Date(Date.UTC(y, m - 1, d + dayOffset, hh, mm, 0));
  const yyyy = String(dt.getUTCFullYear()).padStart(4, '0');
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  const hStr = String(dt.getUTCHours()).padStart(2, '0');
  const mStr = String(dt.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}${mo}${dd}T${hStr}${mStr}00`;
}

/**
 * Builds a safe, RFC-3986 encoded Google Calendar event creation link anchored to the
 * exact local Australian city IANA timezone (`ctz=Australia/Melbourne` or `Australia/Sydney`),
 * including 15 minutes of pre-feature trailers and handling post-midnight finishes accurately.
 */
export function buildSafeGoogleCalendarUrl(input: GoogleCalendarSessionInput): string {
  const startStamp = formatFloatingCalDateTime(input.dateIso, input.startMinutesFromMidnight);
  const finishTotal = input.startMinutesFromMidnight + input.runtimeMinutes + 15;
  const endStamp = formatFloatingCalDateTime(input.dateIso, finishTotal);

  const detailLines = [
    `${input.movieTitle} — Directed by ${input.director}`,
    `Format: ${input.format} (${input.auditoriumName})`,
    `Includes ~15 minutes of pre-feature previews/trailers.`,
  ];
  if (input.bookingUrl) {
    detailLines.push(`Tickets & Venue: ${input.bookingUrl}`);
  }

  const calUrl = new URL('https://calendar.google.com/calendar/render');
  calUrl.searchParams.set('action', 'TEMPLATE');
  calUrl.searchParams.set('text', `${input.movieTitle} (${input.format}) — ${input.cinemaName}`);
  calUrl.searchParams.set('dates', `${startStamp}/${endStamp}`);
  calUrl.searchParams.set('ctz', input.timeZone);
  calUrl.searchParams.set('location', `${input.cinemaName}, ${input.address}`);
  calUrl.searchParams.set('details', detailLines.join('\n'));
  return calUrl.toString();
}

function escapeIcsText(raw: string): string {
  // Strip unsafe ASCII control characters (keeping \n for escaped line breaks) and escape RFC 5545 delimiters.
  let clean = '';
  for (const ch of String(raw || '')) {
    const code = ch.charCodeAt(0);
    if (ch === '\n' || (code >= 0x20 && code !== 0x7f)) {
      clean += ch;
    }
  }
  return clean
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function getTzWallClockComponents(utcMs: number, timeZone: CityTimeZone): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const getNum = (t: string) => Number.parseInt(parts.find((p) => p.type === t)?.value ?? '0', 10);
  const h = getNum('hour') % 24;
  return Date.UTC(getNum('year'), getNum('month') - 1, getNum('day'), h, getNum('minute'), 0);
}

function formatUtcIcsStamp(utcMs: number): string {
  const dt = new Date(utcMs);
  const y = String(dt.getUTCFullYear()).padStart(4, '0');
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  const h = String(dt.getUTCHours()).padStart(2, '0');
  const m = String(dt.getUTCMinutes()).padStart(2, '0');
  return `${y}${mo}${d}T${h}${m}00Z`;
}

function localWallMinutesToUtcMs(
  dateIso: string,
  totalMinutesFromStartDay: number,
  timeZone: CityTimeZone
): number {
  const [y, m, d] = dateIso.split('-').map(Number);
  const targetWallMs = Date.UTC(y, m - 1, d, 0, totalMinutesFromStartDay, 0);
  let guessUtc = targetWallMs;
  for (let i = 0; i < 2; i++) {
    const representedWallMs = getTzWallClockComponents(guessUtc, timeZone);
    guessUtc += targetWallMs - representedWallMs;
  }
  return guessUtc;
}

/**
 * Generates an RFC 5545 `.ics` calendar invite compatible with Apple Calendar, iOS, macOS,
 * Outlook, and Google Calendar, accurately converting city local time (incl. DST) to UTC.
 */
export function buildSafeIcsContent(input: GoogleCalendarSessionInput): string {
  const startUtcMs = localWallMinutesToUtcMs(
    input.dateIso,
    input.startMinutesFromMidnight,
    input.timeZone
  );
  const endUtcMs = startUtcMs + (input.runtimeMinutes + 15) * 60_000;
  const nowUtcMs = Date.now();
  const safeUidSlug = `${input.dateIso}-${input.startMinutesFromMidnight}-${input.cinemaName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 48);

  const descParts = [
    `${input.movieTitle} — Directed by ${input.director}`,
    `Format: ${input.format} (${input.auditoriumName})`,
    'Includes ~15 minutes of pre-feature previews/trailers.',
  ];
  if (input.bookingUrl) {
    descParts.push(`Tickets & Venue: ${input.bookingUrl}`);
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Reelhouse//Cinema Guide//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${safeUidSlug}@reelhouse.app`,
    `DTSTAMP:${formatUtcIcsStamp(nowUtcMs)}`,
    `DTSTART:${formatUtcIcsStamp(startUtcMs)}`,
    `DTEND:${formatUtcIcsStamp(endUtcMs)}`,
    `SUMMARY:${escapeIcsText(`${input.movieTitle} (${input.format}) — ${input.cinemaName}`)}`,
    `LOCATION:${escapeIcsText(`${input.cinemaName}, ${input.address}`)}`,
    `DESCRIPTION:${escapeIcsText(descParts.join('\n'))}`,
    ...(input.bookingUrl ? [`URL:${input.bookingUrl}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * Triggers a safe client-side `.ics` download for Apple Calendar / Outlook without touching servers.
 */
export function downloadIcsFile(input: GoogleCalendarSessionInput): void {
  const icsBody = buildSafeIcsContent(input);
  const blob = new Blob([icsBody], { type: 'text/calendar;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const slug = `${input.movieTitle}-${input.dateIso}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${slug || 'reelhouse-screening'}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

export interface ReleaseReminderIcsInput {
  movieTitle: string;
  director: string;
  releaseDateIso: string;
  cityName: string;
  genres: string[];
}

/**
 * Builds an all-day RFC 5545 `.ics` calendar reminder for an upcoming theatrical release date.
 */
export function buildReleaseReminderIcsContent(input: ReleaseReminderIcsInput): string {
  const [y, m, d] = input.releaseDateIso.split('-').map(Number);
  const startDt = new Date(Date.UTC(y, m - 1, d));
  const endDt = new Date(Date.UTC(y, m - 1, d + 1));
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const formatYmd = (dt: Date) =>
    `${dt.getUTCFullYear()}${pad2(dt.getUTCMonth() + 1)}${pad2(dt.getUTCDate())}`;

  const safeUidSlug = `release-${input.releaseDateIso}-${input.movieTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 52);

  const desc = [
    `${input.movieTitle} — Directed by ${input.director}`,
    `Genres: ${input.genres.join(', ') || 'Feature Film'}`,
    `Opening in ${input.cityName} cinemas. Check Reelhouse for session times & tickets.`,
  ].join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Reelhouse//Release Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${safeUidSlug}@reelhouse.app`,
    `DTSTAMP:${formatUtcIcsStamp(Date.now())}`,
    `DTSTART;VALUE=DATE:${formatYmd(startDt)}`,
    `DTEND;VALUE=DATE:${formatYmd(endDt)}`,
    `SUMMARY:${escapeIcsText(`In Cinemas (${input.cityName}): ${input.movieTitle}`)}`,
    `DESCRIPTION:${escapeIcsText(desc)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * Triggers a safe client-side `.ics` release-day reminder download for Apple Calendar / Outlook / Google Calendar.
 */
export function downloadReleaseReminderIcs(input: ReleaseReminderIcsInput): void {
  if (!SAFE_ISO_DATE_REGEX.test(input.releaseDateIso)) return;
  const icsBody = buildReleaseReminderIcsContent(input);
  const blob = new Blob([icsBody], { type: 'text/calendar;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const slug = `${input.movieTitle}-${input.releaseDateIso}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${slug || 'reelhouse-release'}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

const VALID_URL_FORMATS = new Set<FormatType>([
  'IMAX',
  '35mm / 70mm',
  'Dolby Atmos',
  'Gold Class / LUX',
  'Vmax / Xtremescreen',
  'Standard',
]);

const VALID_URL_VIBES = new Set<CinemaVibe>([
  'Indie & Arthouse',
  'Heritage Palace',
  'Grand Format',
  'Boutique Luxury',
  'Major Multiplex',
]);

/**
 * Parses and strictly validates shareable URL query parameters (`?city=...&date=...&film=...&cinema=...`).
 */
export function parseValidatedUrlFilters(search: string): Partial<FilterState> {
  const out: Partial<FilterState> = {};
  try {
    const params = new URLSearchParams(search);
    const city = params.get('city');
    if (city === 'melbourne' || city === 'sydney' || city === 'shanghai') {
      out.city = city as CityId;
    }

    const status = params.get('status');
    if (status === 'in_cinemas' || status === 'coming_soon') {
      out.releaseStatus = status as ReleaseStatus;
    }

    const mode = params.get('mode');
    if (mode === 'gallery' || mode === 'movies' || mode === 'cinemas' || mode === 'map') {
      out.browseMode = mode as BrowseMode;
    }

    const date = params.get('date');
    if (date) {
      const validDates = Array.from(
        new Set(
          date
            .split(',')
            .map((s) => s.trim())
            .filter((s) => SAFE_ISO_DATE_REGEX.test(s))
        )
      ).slice(0, 14);
      if (validDates.length > 0) {
        out.dateIso = validDates[0];
        out.selectedDates = validDates;
      }
    }

    const film = params.get('film');
    if (film && SAFE_ID_REGEX.test(film)) {
      out.selectedMovieId = film;
    }

    const cinema = params.get('cinema');
    if (cinema && SAFE_ID_REGEX.test(cinema)) {
      out.selectedCinemaId = cinema;
    }

    const chain = params.get('chain');
    if (chain) {
      const cleanChain = sanitizeSearchQuery(chain).trim();
      if (cleanChain.length > 0 && cleanChain.length <= 40) {
        out.chain = cleanChain;
      }
    }

    if (params.get('favs') === '1') {
      out.favoritesOnly = true;
    }

    const suburb = params.get('suburb');
    if (suburb) {
      const cleanSuburb = sanitizeSearchQuery(suburb).trim();
      if (cleanSuburb.length > 0 && cleanSuburb.length <= 40) {
        out.suburb = cleanSuburb;
      }
    }

    const near = params.get('near');
    if (near && SAFE_ID_REGEX.test(near) && near !== 'gps') {
      out.nearHubId = near;
    }

    const time = params.get('time');
    if (time === 'morning' || time === 'afternoon' || time === 'evening' || time === 'late') {
      out.timeOfDay = time as TimeOfDay;
    }

    const fmtParam = params.get('fmt');
    if (fmtParam) {
      const parsedFormats = fmtParam
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is FormatType => VALID_URL_FORMATS.has(s as FormatType));
      if (parsedFormats.length > 0) {
        out.formats = Array.from(new Set(parsedFormats));
      }
    }

    const vibe = params.get('vibe');
    if (vibe && VALID_URL_VIBES.has(vibe as CinemaVibe)) {
      out.vibe = vibe as CinemaVibe;
    }

    const genre = params.get('genre');
    if (genre) {
      const cleanGenre = sanitizeSearchQuery(genre).trim();
      if (cleanGenre.length > 0 && cleanGenre.length <= 32) {
        out.genre = cleanGenre;
      }
    }

    const price = params.get('price');
    if (price === 'under25' || price === 'under18') {
      out.priceCap = price as PriceCapOption;
    }

    const rating = params.get('rating');
    if (rating === 'imdb8' || rating === 'rt90' || rating === 'douban8') {
      out.minRating = rating as MinRatingOption;
    }

    const finish = params.get('finish');
    if (finish === '1800' || finish === '2130' || finish === '2230' || finish === '2330') {
      out.finishBy = finish as FinishByOption;
    }

    if (params.get('deals') === '1') {
      out.dealsOnly = true;
    }

    if (params.get('makeit') === '1') {
      out.makeItOnly = true;
    }

    if (params.get('past') === '1') {
      out.showPastToday = true;
    }

    const q = params.get('q');
    if (q) {
      out.searchQuery = sanitizeSearchQuery(q);
    }
  } catch {
    // Ignore malformed query strings cleanly
  }
  return out;
}

/**
 * Checks whether the admin UI query parameter (`?admin=1`) is present in the URL.
 * Note: UI visibility only; server-side mutation protection is enforced independently
 * via PUBLIC_READONLY_MODE=1 and CSRF verification in server/index.mjs.
 */
export function isAdminUrlFlagPresent(search: string): boolean {
  try {
    return new URLSearchParams(search).get('admin') === '1';
  } catch {
    return false;
  }
}

export interface ParsedFolioUrlEntry {
  sessionId: string;
  votes: number;
}

const FOLIO_TOKEN_REGEX = /^([a-z0-9_-]{3,96})(?::(\d{1,2}))?$/i;

/**
 * Parses and strictly validates shared Folio session tokens (`?folio=id1,id2` or `?folio=id1:3,id2:1`).
 */
export function parseValidatedFolioEntries(search: string): ParsedFolioUrlEntry[] {
  try {
    const raw = new URLSearchParams(search).get('folio');
    if (!raw) return [];
    const seen = new Set<string>();
    const entries: ParsedFolioUrlEntry[] = [];
    for (const part of raw.split(',')) {
      const m = part.trim().match(FOLIO_TOKEN_REGEX);
      if (!m) continue;
      const id = m[1];
      const parsedVotes = m[2] ? Number.parseInt(m[2], 10) : 1;
      const votes = Number.isFinite(parsedVotes) ? Math.max(1, Math.min(99, parsedVotes)) : 1;
      if (SAFE_ID_REGEX.test(id) && !seen.has(id)) {
        seen.add(id);
        entries.push({ sessionId: id, votes });
        if (entries.length >= 6) break;
      }
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * Parses and strictly validates shared Folio session IDs (`?folio=id1,id2,...`).
 */
export function parseValidatedFolioIds(search: string): string[] {
  return parseValidatedFolioEntries(search).map((e) => e.sessionId);
}

export type FolioShareInput = string | { sessionId: string; votes?: number };

/**
 * Builds a clean, shareable absolute URL containing up to 6 shortlisted Folio sessions
 * (optionally preserving group vote counts via `id:votes` tokens).
 */
export function buildShareableFolioUrl(
  city: CityId,
  items: FolioShareInput[],
  lang?: AppLanguage,
  includeVotes = false
): string {
  const tokens: string[] = [];
  for (const item of items.slice(0, 6)) {
    const sid = typeof item === 'string' ? item : item.sessionId;
    if (!SAFE_ID_REGEX.test(sid)) continue;
    const rawVotes = typeof item === 'string' ? 1 : item.votes ?? 1;
    const clampedVotes = Math.max(1, Math.min(99, Math.floor(rawVotes)));
    tokens.push(includeVotes || clampedVotes > 1 ? `${sid}:${clampedVotes}` : sid);
  }
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('city', city);
  if (lang === 'zh') {
    url.searchParams.set('lang', 'zh');
  }
  if (tokens.length > 0) {
    url.searchParams.set('folio', tokens.join(','));
  }
  return url.toString();
}

/**
 * Serializes non-default filter selections into a clean, shareable URL query string.
 */
export function buildShareableFilterQueryString(
  filters: FilterState,
  defaultTodayIso: string,
  preserveAdmin = false,
  activeFolioItems?: FolioShareInput[],
  lang: AppLanguage = 'en'
): string {
  const params = new URLSearchParams();
  if (preserveAdmin) {
    params.set('admin', '1');
  }
  params.set('city', filters.city);
  if (lang === 'zh') {
    params.set('lang', 'zh');
  }
  if (filters.releaseStatus !== 'in_cinemas') {
    params.set('status', filters.releaseStatus);
  }
  if (filters.browseMode !== 'gallery') {
    params.set('mode', filters.browseMode);
  }
  const activeDates =
    filters.selectedDates && filters.selectedDates.length > 0
      ? filters.selectedDates
      : [filters.dateIso];
  if (
    filters.releaseStatus === 'in_cinemas' &&
    (activeDates.length > 1 || activeDates[0] !== defaultTodayIso)
  ) {
    params.set('date', activeDates.join(','));
  }
  if (filters.selectedMovieId !== 'all') {
    params.set('film', filters.selectedMovieId);
  }
  if (filters.selectedCinemaId !== 'all') {
    params.set('cinema', filters.selectedCinemaId);
  }
  if (filters.chain !== 'all') {
    params.set('chain', filters.chain);
  }
  if (filters.favoritesOnly) {
    params.set('favs', '1');
  }
  if (filters.suburb !== 'all') {
    params.set('suburb', filters.suburb);
  }
  if (filters.nearHubId !== 'cbd' && filters.nearHubId !== 'gps') {
    params.set('near', filters.nearHubId);
  }
  if (filters.releaseStatus === 'in_cinemas' && filters.timeOfDay !== 'all') {
    params.set('time', filters.timeOfDay);
  }
  if (filters.formats.length > 0) {
    params.set('fmt', filters.formats.join(','));
  }
  if (filters.vibe !== 'all') {
    params.set('vibe', filters.vibe);
  }
  if (filters.genre !== 'all') {
    params.set('genre', filters.genre);
  }
  if (filters.releaseStatus === 'in_cinemas' && filters.priceCap !== 'all') {
    params.set('price', filters.priceCap);
  }
  if (filters.minRating !== 'all') {
    params.set('rating', filters.minRating);
  }
  if (filters.releaseStatus === 'in_cinemas' && filters.finishBy !== 'all') {
    params.set('finish', filters.finishBy);
  }
  if (filters.releaseStatus === 'in_cinemas' && filters.dealsOnly) {
    params.set('deals', '1');
  }
  if (filters.releaseStatus === 'in_cinemas' && filters.makeItOnly) {
    params.set('makeit', '1');
  }
  if (filters.releaseStatus === 'in_cinemas' && filters.showPastToday) {
    params.set('past', '1');
  }
  if (filters.searchQuery.trim().length > 0) {
    params.set('q', filters.searchQuery.trim());
  }
  if (activeFolioItems && activeFolioItems.length > 0) {
    const tokens: string[] = [];
    for (const item of activeFolioItems.slice(0, 6)) {
      const sid = typeof item === 'string' ? item : item.sessionId;
      if (!SAFE_ID_REGEX.test(sid)) continue;
      const v = typeof item === 'string' ? 1 : item.votes ?? 1;
      const clamped = Math.max(1, Math.min(99, Math.floor(v)));
      tokens.push(clamped > 1 ? `${sid}:${clamped}` : sid);
    }
    if (tokens.length > 0) {
      params.set('folio', tokens.join(','));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}
