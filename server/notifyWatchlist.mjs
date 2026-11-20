import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LIVE_CATALOG_PATH = path.join(__dirname, 'cache', 'live_catalog.json');
const WATCH_CONFIG_PATH = path.join(__dirname, 'watchlist-alerts.json');

async function loadPreviousCatalogSnapshot() {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['show', 'HEAD:server/cache/live_catalog.json'],
      { cwd: PROJECT_ROOT, maxBuffer: 64 * 1024 * 1024 }
    );
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

async function loadWatchConfig() {
  const fallback = {
    watchTitleKeywords: [],
    watchFormats: ['35mm / 70mm'],
    watchVenueIds: [],
    maxAlertsPerRun: 10,
  };
  try {
    const fileCfg = JSON.parse(await fs.readFile(WATCH_CONFIG_PATH, 'utf-8'));
    const envKeywords = (process.env.REELHOUSE_WATCH_TITLES || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      watchTitleKeywords:
        envKeywords.length > 0 ? envKeywords : fileCfg.watchTitleKeywords || [],
      watchFormats: Array.isArray(fileCfg.watchFormats) ? fileCfg.watchFormats : [],
      watchVenueIds: Array.isArray(fileCfg.watchVenueIds) ? fileCfg.watchVenueIds : [],
      maxAlertsPerRun: Number(fileCfg.maxAlertsPerRun) || 10,
    };
  } catch {
    return fallback;
  }
}

function collectWatchMatches(catalog, cfg) {
  if (!catalog || !Array.isArray(catalog.sessions)) return [];
  const movieById = new Map((catalog.movies || []).map((m) => [m.id, m]));
  const cinemaById = new Map((catalog.cinemas || []).map((c) => [c.id, c]));
  const keywords = cfg.watchTitleKeywords.map((k) => k.toLowerCase()).filter(Boolean);
  const formats = new Set(cfg.watchFormats);
  const venues = new Set(cfg.watchVenueIds);

  const grouped = new Map();
  for (const s of catalog.sessions) {
    const movie = movieById.get(s.movieId);
    const cinema = cinemaById.get(s.cinemaId);
    if (!movie || !cinema) continue;

    const titleBlob = `${movie.title} ${movie.ratings?.douban?.chineseTitle || ''}`.toLowerCase();
    const matchesKeyword = keywords.some((kw) => titleBlob.includes(kw));
    const matchesFilmPrint =
      formats.has(s.format) ||
      (Array.isArray(s.accessibilityTags) &&
        s.accessibilityTags.some((t) => /35mm|70mm/i.test(t)) &&
        formats.has('35mm / 70mm'));
    const isWatchedVenueHighlight =
      venues.has(cinema.id) && (matchesKeyword || matchesFilmPrint);

    if (!matchesKeyword && !matchesFilmPrint && !isWatchedVenueHighlight) continue;

    const groupKey = `${cinema.id}|${movie.id}|${s.dateIso}|${s.format}`;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        groupKey,
        title: movie.title,
        zhTitle: movie.ratings?.douban?.chineseTitle || '',
        cinemaName: cinema.name,
        city: cinema.city,
        dateIso: s.dateIso,
        format: s.format,
        tags: s.accessibilityTags || [],
        times: [],
      });
    }
    grouped.get(groupKey).times.push(s.startTime24);
  }
  return Array.from(grouped.values());
}

async function dispatchAlerts(subject, body) {
  const tasks = [];

  if (process.env.BARK_URL || process.env.BARK_KEY) {
    const base = process.env.BARK_URL
      ? process.env.BARK_URL.replace(/\/+$/, '')
      : `https://api.day.app/${encodeURIComponent(process.env.BARK_KEY)}`;
    tasks.push(
      fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: subject, body, group: 'Reelhouse' }),
        signal: AbortSignal.timeout(10000),
      })
    );
  }

  if (process.env.SERVERCHAN_SENDKEY) {
    const key = encodeURIComponent(process.env.SERVERCHAN_SENDKEY);
    tasks.push(
      fetch(`https://sctapi.ftqq.com/${key}.send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ title: subject, desp: body }),
        signal: AbortSignal.timeout(10000),
      })
    );
  }

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const token = encodeURIComponent(process.env.TELEGRAM_BOT_TOKEN);
    tasks.push(
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `${subject}\n\n${body}`,
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10000),
      })
    );
  }

  if (process.env.REELHOUSE_ALERT_WEBHOOK_URL) {
    tasks.push(
      fetch(process.env.REELHOUSE_ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${subject}\n${body}`, title: subject, body }),
        signal: AbortSignal.timeout(10000),
      })
    );
  }

  if (tasks.length === 0) {
    console.log('[Reelhouse Radar] No notification channel secrets configured; skipping push.');
    return;
  }

  const results = await Promise.allSettled(tasks);
  console.log(
    `[Reelhouse Radar] Dispatched ${results.filter((r) => r.status === 'fulfilled').length}/${tasks.length} notifications.`
  );
}

async function run() {
  const currentCatalog = JSON.parse(await fs.readFile(LIVE_CATALOG_PATH, 'utf-8'));
  const prevCatalog = await loadPreviousCatalogSnapshot();
  const cfg = await loadWatchConfig();

  const currentMatches = collectWatchMatches(currentCatalog, cfg);
  const prevKeys = new Set(collectWatchMatches(prevCatalog, cfg).map((m) => m.groupKey));
  const newlyDropped = currentMatches
    .filter((m) => !prevKeys.has(m.groupKey))
    .slice(0, cfg.maxAlertsPerRun);

  if (newlyDropped.length === 0) {
    console.log('[Reelhouse Radar] No newly dropped watchlist or 35mm/70mm screenings today.');
    return;
  }

  const lines = newlyDropped.map((item) => {
    const tagSuffix = item.tags.length > 0 ? ` [${item.tags.join(', ')}]` : '';
    const timesPreview = item.times.slice(0, 4).join(', ');
    const zhPart = item.zhTitle && item.zhTitle !== item.title ? ` (${item.zhTitle})` : '';
    return `• ${item.title}${zhPart} @ ${item.cinemaName} — ${item.dateIso} · ${item.format}${tagSuffix} (${timesPreview})`;
  });

  const subject = `🎬 Reelhouse Alert: ${newlyDropped.length} new screening drop(s)`;
  const body = lines.join('\n');
  console.log(`${subject}\n${body}`);
  await dispatchAlerts(subject, body);
}

run().catch((err) => {
  console.warn('[Reelhouse Radar] Non-fatal alert error:', err instanceof Error ? err.message : err);
});
