import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  CACHE_DIR,
  CACHE_FILE,
  PROJECT_ROOT,
  getApiConfig,
  syncLiveCatalog,
} from './syncCatalog.mjs';
import { refreshCachedCatalogRatings } from './ratingsEngine.mjs';
import { searchLocationsForQuery } from './geocode.mjs';

// Cryptographic synchronizer CSRF token generated per server boot (never hardcoded).
const SERVER_CSRF_TOKEN = crypto.randomBytes(32).toString('hex');

const SAFE_IP_REGEX = /^[0-9a-fA-F:.]{3,64}$/;
const MAX_RATE_BUCKETS = 2000;

function resolveClientIp(req) {
  const cfIp = typeof req.headers['cf-connecting-ip'] === 'string' ? req.headers['cf-connecting-ip'].trim() : '';
  if (cfIp && SAFE_IP_REGEX.test(cfIp)) return cfIp;

  const xff = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : '';
  if (xff) {
    const firstHop = xff.split(',')[0].trim();
    if (firstHop && SAFE_IP_REGEX.test(firstHop)) return firstHop;
  }

  return req.socket.remoteAddress || '127.0.0.1';
}

// Per-IP token bucket rate limiter (120 requests / minute, bounded eviction)
const rateBuckets = new Map();
function allowRateLimit(remoteIp) {
  const now = Date.now();
  if (rateBuckets.size >= MAX_RATE_BUCKETS) {
    for (const [ip, b] of rateBuckets.entries()) {
      if (now - b.windowStart > 60_000) rateBuckets.delete(ip);
    }
    while (rateBuckets.size >= MAX_RATE_BUCKETS) {
      const oldest = rateBuckets.keys().next().value;
      if (oldest === undefined) break;
      rateBuckets.delete(oldest);
    }
  }
  const entry = rateBuckets.get(remoteIp);
  if (!entry || now - entry.windowStart > 60_000) {
    rateBuckets.set(remoteIp, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= 120) return false;
  entry.count += 1;
  return true;
}

const COMPRESSIBLE_EXTS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.webmanifest']);

function negotiateCompression(req, rawBuf) {
  if (rawBuf.length < 1024) return { body: rawBuf, encoding: null };
  const ae = String(req.headers['accept-encoding'] || '');
  if (/\bbr\b/i.test(ae)) {
    return {
      body: zlib.brotliCompressSync(rawBuf, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
      }),
      encoding: 'br',
    };
  }
  if (/\bgzip\b/i.test(ae)) {
    return {
      body: zlib.gzipSync(rawBuf, { level: 6 }),
      encoding: 'gzip',
    };
  }
  return { body: rawBuf, encoding: null };
}

const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const SERVE_STATIC = process.env.SERVE_STATIC === '1';
const PUBLIC_READONLY_MODE = process.env.PUBLIC_READONLY_MODE === '1';
// On Render Free Tier (750 shared hrs/mo across all account apps), let Render sleep when idle
// and delegate all daily scraping/syncing to GitHub Actions (.github/workflows/daily-catalog-sync.yml).
const GITHUB_CRON_MANAGED = process.env.GITHUB_CRON_MANAGED === '1';

const REMOTE_CATALOG_POLL_MS =
  Math.max(5, Number.parseInt(process.env.REMOTE_CATALOG_POLL_MINUTES || '30', 10) || 30) * 60_000;
const REMOTE_CATALOG_ERROR_RETRY_MS = 2 * 60_000;
const MAX_REMOTE_CATALOG_BYTES = 20 * 1024 * 1024;

function parseAllowedRemoteCatalogUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const u = new URL(rawUrl.trim());
    if (u.protocol !== 'https:') return null;
    if (u.hostname.toLowerCase() !== 'raw.githubusercontent.com') return null;
    if (!u.pathname.endsWith('.json')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const REMOTE_CATALOG_URL = parseAllowedRemoteCatalogUrl(process.env.REMOTE_CATALOG_URL);

const STATIC_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const SPA_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; worker-src 'self'; manifest-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https://image.tmdb.org https://m.media-amazon.com https://*.pipi.cn https://server.arcgisonline.com data:; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://www.youtube.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self';",
};

function isAllowedOrigin(origin, requestHostHeader) {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    if (requestHostHeader && u.host === requestHostHeader) {
      return true;
    }
    if (process.env.PUBLIC_ALLOWED_ORIGIN && origin === process.env.PUBLIC_ALLOWED_ORIGIN) {
      return true;
    }
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function maskSecret(val) {
  if (!val || val.length < 4) return null;
  return `••••••••${val.slice(-4)}`;
}

const SAFE_KEY_REGEX = /^[A-Za-z0-9._-]{4,160}$/;

function parseCookies(cookieHeader) {
  const map = new Map();
  if (!cookieHeader) return map;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      map.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
    }
  }
  return map;
}

function verifyCsrf(req) {
  const headerToken = String(req.headers['x-csrf-token'] || '');
  const cookies = parseCookies(req.headers.cookie || '');
  const cookieToken = cookies.get('reelhouse_csrf') || '';
  if (!headerToken || !cookieToken) return false;
  try {
    const a = Buffer.from(headerToken, 'utf-8');
    const b = Buffer.from(SERVER_CSRF_TOKEN, 'utf-8');
    const c = Buffer.from(cookieToken, 'utf-8');
    if (a.length !== b.length || c.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b) && crypto.timingSafeEqual(c, b);
  } catch {
    return false;
  }
}

function readBoundedJsonBody(req, maxBytes = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

// TODO(security): Local owner BFF protected by PUBLIC_READONLY_MODE=1 in public containers
// plus Double-Submit/Synchronizer CSRF token; add full OAuth2/OIDC user sessions before
// any multi-tenant write features.
function writeJson(req, res, statusCode, payload, extraHeaders = {}) {
  const origin = req.headers.origin;
  const rawBuf = Buffer.from(JSON.stringify(payload), 'utf-8');
  const varyParts = ['Accept-Encoding'];
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    ...extraHeaders,
  };
  if (origin && isAllowedOrigin(origin, req.headers.host)) {
    headers['Access-Control-Allow-Origin'] = origin;
    varyParts.push('Origin');
  }
  headers['Vary'] = varyParts.join(', ');

  const etag = headers['ETag'];
  if (etag && req.headers['if-none-match'] === etag && (req.method === 'GET' || req.method === 'HEAD')) {
    res.writeHead(304, headers);
    res.end();
    return;
  }

  const { body, encoding } = negotiateCompression(req, rawBuf);
  if (encoding) {
    headers['Content-Encoding'] = encoding;
  }
  headers['Content-Length'] = String(body.length);
  res.writeHead(statusCode, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(body);
}

async function writeValidatedEnvKeys({
  tmdbApiKey,
  omdbApiKey,
  mdblistApiKey,
  serpapiApiKey,
}) {
  const current = await getApiConfig();
  const nextTmdb = tmdbApiKey !== undefined ? tmdbApiKey : current.tmdbApiKey;
  const nextOmdb = omdbApiKey !== undefined ? omdbApiKey : current.omdbApiKey;
  const nextMdblist = mdblistApiKey !== undefined ? mdblistApiKey : current.mdblistApiKey;
  const nextSerp = serpapiApiKey !== undefined ? serpapiApiKey : current.serpapiApiKey;

  for (const [label, val] of [
    ['TMDB API Key', nextTmdb],
    ['OMDb API Key', nextOmdb],
    ['MDBList API Key', nextMdblist],
    ['SerpApi Key', nextSerp],
  ]) {
    if (val && !SAFE_KEY_REGEX.test(val)) {
      throw new Error(`${label} contains invalid characters or length.`);
    }
  }

  const lines = [
    '# Reelhouse Live API Configuration (Managed safely via local BFF — chmod 600)',
    `TMDB_API_KEY=${nextTmdb}`,
    `OMDB_API_KEY=${nextOmdb}`,
    `MDBLIST_API_KEY=${nextMdblist}`,
    `SERPAPI_API_KEY=${nextSerp}`,
    `CACHE_TTL_HOURS=${current.cacheTtlHours}`,
    `RATINGS_TTL_HOURS=${current.ratingsTtlHours}`,
    'BFF_PORT=3100',
    '',
  ];

  const envPath = path.join(PROJECT_ROOT, '.env');
  await fs.writeFile(envPath, lines.join('\n'), { encoding: 'utf-8', mode: 0o600 });
}

let inFlightSync = null;
let inFlightRatingsRefresh = null;
let remoteCatalogCache = null;
let remoteCatalogEtag = null;
let remoteCatalogCheckedAtMs = 0;
let remoteCatalogNextCheckAfterMs = 0;
let hasCompletedInitialRemoteCheck = false;
let inFlightRemoteFetch = null;

function isValidCatalogSnapshot(candidate) {
  return Boolean(
    candidate &&
      typeof candidate === 'object' &&
      candidate.mode === 'live' &&
      Array.isArray(candidate.movies) &&
      candidate.movies.length > 0 &&
      Array.isArray(candidate.sessions) &&
      candidate.sessions.length > 0
  );
}

function getSyncedAtTimestampMs(snapshot) {
  const ts = snapshot?.syncedAtIso ? Date.parse(snapshot.syncedAtIso) : Number.NaN;
  return Number.isFinite(ts) ? ts : 0;
}

function pickFresherSnapshot(localSnap, remoteSnap) {
  if (!isValidCatalogSnapshot(remoteSnap)) return localSnap;
  if (!isValidCatalogSnapshot(localSnap)) return remoteSnap;
  return getSyncedAtTimestampMs(remoteSnap) >= getSyncedAtTimestampMs(localSnap)
    ? remoteSnap
    : localSnap;
}

async function refreshRemoteCatalog(currentSnapshot = null) {
  if (!REMOTE_CATALOG_URL) return null;
  if (inFlightRemoteFetch) return inFlightRemoteFetch;

  inFlightRemoteFetch = (async () => {
    const now = Date.now();
    try {
      const headers = {
        Accept: 'application/json',
        'User-Agent': 'Reelhouse-BFF/1.0',
      };
      if (remoteCatalogEtag) {
        headers['If-None-Match'] = remoteCatalogEtag;
      }

      const res = await fetch(REMOTE_CATALOG_URL, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(8000),
      });

      remoteCatalogCheckedAtMs = Date.now();
      remoteCatalogNextCheckAfterMs = remoteCatalogCheckedAtMs + REMOTE_CATALOG_POLL_MS;
      hasCompletedInitialRemoteCheck = true;

      if (res.status === 304) {
        return remoteCatalogCache;
      }
      if (!res.ok) {
        remoteCatalogNextCheckAfterMs = Date.now() + REMOTE_CATALOG_ERROR_RETRY_MS;
        return remoteCatalogCache;
      }

      const contentLen = Number.parseInt(res.headers.get('content-length') || '0', 10);
      if (Number.isFinite(contentLen) && contentLen > MAX_REMOTE_CATALOG_BYTES) {
        return remoteCatalogCache;
      }

      const text = await res.text();
      if (Buffer.byteLength(text, 'utf8') > MAX_REMOTE_CATALOG_BYTES) {
        return remoteCatalogCache;
      }

      const parsed = JSON.parse(text);
      if (!isValidCatalogSnapshot(parsed)) {
        return remoteCatalogCache;
      }

      const etag = res.headers.get('etag');
      if (etag) remoteCatalogEtag = etag;

      const best = pickFresherSnapshot(currentSnapshot || remoteCatalogCache, parsed);
      remoteCatalogCache = best;

      // Persist to container's local cache file atomically when writable
      if (best === parsed) {
        try {
          await fs.mkdir(CACHE_DIR, { recursive: true });
          const tmpPath = `${CACHE_FILE}.remote.tmp`;
          await fs.writeFile(tmpPath, text, 'utf-8');
          await fs.rename(tmpPath, CACHE_FILE);
        } catch {
          // Non-fatal on read-only filesystems; in-memory remoteCatalogCache stays fresh
        }
      }
      return remoteCatalogCache;
    } catch {
      remoteCatalogCheckedAtMs = now;
      remoteCatalogNextCheckAfterMs = Date.now() + REMOTE_CATALOG_ERROR_RETRY_MS;
      hasCompletedInitialRemoteCheck = true;
      return remoteCatalogCache;
    } finally {
      inFlightRemoteFetch = null;
    }
  })();

  return inFlightRemoteFetch;
}

async function getCachedOrFreshCatalog(forceSync = false) {
  const cfg = await getApiConfig();
  const configuredApis = {
    tmdb: Boolean(cfg.tmdbApiKey),
    omdb: Boolean(cfg.omdbApiKey),
    mdblist: Boolean(cfg.mdblistApiKey),
    serpapi: Boolean(cfg.serpapiApiKey),
  };

  if (!forceSync) {
    let localParsed = null;
    let localStatMtimeMs = 0;
    try {
      const stat = await fs.stat(CACHE_FILE);
      localStatMtimeMs = stat.mtimeMs;
      const raw = await fs.readFile(CACHE_FILE, 'utf-8');
      localParsed = JSON.parse(raw);
    } catch {
      // Fall through if CACHE_FILE does not exist yet
    }

    // When managed by GitHub Actions daily cron (Render Free Tier), optionally pull the latest
    // catalog from GitHub Raw on cold wake & periodically while awake (0 Render build minutes for data syncs),
    // while still sleeping cleanly after 15m idle with no background timers.
    if (GITHUB_CRON_MANAGED) {
      if (REMOTE_CATALOG_URL) {
        const shouldCheckRemote =
          !hasCompletedInitialRemoteCheck || Date.now() >= remoteCatalogNextCheckAfterMs;
        if (shouldCheckRemote) {
          const fetchPromise = refreshRemoteCatalog(localParsed);
          if (!hasCompletedInitialRemoteCheck) {
            await Promise.race([
              fetchPromise,
              new Promise((resolve) => setTimeout(resolve, 2500)),
            ]);
          }
        }
      }

      const resolved = pickFresherSnapshot(localParsed, remoteCatalogCache);
      if (resolved) {
        resolved.configuredApis = {
          tmdb: Boolean(cfg.tmdbApiKey || resolved.configuredApis?.tmdb),
          omdb: Boolean(cfg.omdbApiKey || resolved.configuredApis?.omdb),
          mdblist: Boolean(cfg.mdblistApiKey || resolved.configuredApis?.mdblist),
          serpapi: Boolean(cfg.serpapiApiKey || resolved.configuredApis?.serpapi),
        };
        return resolved;
      }
    }

    if (localParsed) {
      localParsed.configuredApis = {
        tmdb: Boolean(cfg.tmdbApiKey || localParsed.configuredApis?.tmdb),
        omdb: Boolean(cfg.omdbApiKey || localParsed.configuredApis?.omdb),
        mdblist: Boolean(cfg.mdblistApiKey || localParsed.configuredApis?.mdblist),
        serpapi: Boolean(cfg.serpapiApiKey || localParsed.configuredApis?.serpapi),
      };

      if (!cfg.tmdbApiKey) {
        return localParsed;
      }

      // Always measure true catalog age from syncedAtIso inside JSON rather than disk mtime
      // (container builds and git checkouts reset file mtime even when data is days old).
      const ageHours = localParsed.syncedAtIso
        ? (Date.now() - Date.parse(localParsed.syncedAtIso)) / 3_600_000
        : (Date.now() - localStatMtimeMs) / 3_600_000;

      const ratingsAgeHours = localParsed.ratingsSyncedAtIso
        ? (Date.now() - Date.parse(localParsed.ratingsSyncedAtIso)) / 3_600_000
        : ageHours;

      if (ageHours >= cfg.cacheTtlHours && !inFlightSync) {
        inFlightSync = syncLiveCatalog().finally(() => {
          inFlightSync = null;
        });
      } else if (
        ratingsAgeHours >= cfg.ratingsTtlHours &&
        !inFlightSync &&
        !inFlightRatingsRefresh
      ) {
        // Independent background refresh of IMDb + MDBList RT + Douban scores (0 SerpApi cost)
        inFlightRatingsRefresh = refreshCachedCatalogRatings({
          cacheFile: CACHE_FILE,
          cacheDir: CACHE_DIR,
          omdbApiKey: cfg.omdbApiKey,
          mdblistApiKey: cfg.mdblistApiKey,
        })
          .catch(() => null)
          .finally(() => {
            inFlightRatingsRefresh = null;
          });
      }
      return localParsed;
    }
  }

  if (!cfg.tmdbApiKey || GITHUB_CRON_MANAGED) {
    return {
      mode: 'curated',
      configuredApis,
      syncedAtIso: null,
    };
  }

  if (!inFlightSync) {
    inFlightSync = syncLiveCatalog().finally(() => {
      inFlightSync = null;
    });
  }
  return inFlightSync;
}

const initialCfg = await getApiConfig();
const PORT =
  Number.parseInt(process.env.PORT || process.env.BFF_PORT || '3100', 10) || 3100;
const BIND_HOST = process.env.CONTAINER_RUNTIME === '1' ? '0.0.0.0' : '127.0.0.1';

function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectDynamicOpenGraphTags(htmlText, req) {
  const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
  const safeHost = /^[a-zA-Z0-9.:-]+$/.test(rawHost) ? rawHost : '';
  const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const baseOrigin = safeHost ? `${proto}://${safeHost}` : '';

  const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
  const cityParam = reqUrl.searchParams.get('city');
  const folioParam = reqUrl.searchParams.get('folio');

  const cityLabel =
    cityParam === 'shanghai'
      ? 'Shanghai · 上海'
      : cityParam === 'sydney'
        ? 'Sydney, NSW'
        : cityParam === 'melbourne'
          ? 'Melbourne, VIC'
          : 'Melbourne, Sydney & Shanghai';

  let ogTitle = `REELHOUSE — ${cityLabel} Cinema Guide`;
  let ogDesc =
    '50 iconic cinemas · IMAX & 35mm/70mm · IMDb, Rotten Tomatoes & Douban ratings · Closest cinemas & group session comparison.';

  if (folioParam) {
    const count = folioParam.split(',').filter(Boolean).slice(0, 6).length;
    if (count > 0) {
      ogTitle = `Reelhouse Folio — Compare ${count} Shortlisted ${count === 1 ? 'Session' : 'Sessions'} (${cityLabel})`;
      ogDesc =
        'Open to compare film ratings, start & finish times, ticket prices, distances, and book side-by-side.';
    }
  }

  let out = htmlText
    .replace(
      /(property="og:title"\s+content=")[^"]*(")/,
      `$1${escapeHtmlAttr(ogTitle)}$2`
    )
    .replace(
      /(name="twitter:title"\s+content=")[^"]*(")/,
      `$1${escapeHtmlAttr(ogTitle)}$2`
    )
    .replace(
      /(property="og:description"\s+content=")[^"]*(")/,
      `$1${escapeHtmlAttr(ogDesc)}$2`
    )
    .replace(
      /(name="twitter:description"\s+content=")[^"]*(")/,
      `$1${escapeHtmlAttr(ogDesc)}$2`
    );

  if (baseOrigin) {
    const absImage = escapeHtmlAttr(`${baseOrigin}/og-reelhouse.jpg`);
    const safeCanonicalParams = new URLSearchParams();
    if (cityParam === 'melbourne' || cityParam === 'sydney' || cityParam === 'shanghai') {
      safeCanonicalParams.set('city', cityParam);
    }
    const qs = safeCanonicalParams.toString();
    const absCanonical = escapeHtmlAttr(`${baseOrigin}/${qs ? `?${qs}` : ''}`);
    out = out
      .replace(/(rel="canonical"\s+href=")[^"]*(")/, `$1${absCanonical}$2`)
      .replace(/(property="og:url"\s+content=")[^"]*(")/, `$1${absCanonical}$2`)
      .replace(/(property="og:image"\s+content=")[^"]*(")/, `$1${absImage}$2`)
      .replace(/(name="twitter:image"\s+content=")[^"]*(")/, `$1${absImage}$2`);
  }
  return out;
}

async function serveStaticSpaAsset(req, res, pathname) {
  const indexHtmlPath = path.join(DIST_DIR, 'index.html');
  let decodedPath = '/';
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', ...SPA_SECURITY_HEADERS });
    res.end('Bad Request');
    return;
  }

  // Strictly resolve against DIST_DIR and enforce trailing path.sep boundary check
  const candidate =
    decodedPath === '/' ? indexHtmlPath : path.resolve(DIST_DIR, `.${decodedPath}`);
  if (candidate !== indexHtmlPath && !candidate.startsWith(`${DIST_DIR}${path.sep}`)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...SPA_SECURITY_HEADERS });
    res.end('Forbidden');
    return;
  }

  let fileToServe = candidate;
  try {
    const stat = await fs.stat(fileToServe);
    if (!stat.isFile()) {
      fileToServe = indexHtmlPath;
    }
  } catch {
    // SPA client-side fallback to index.html for non-asset routes
    if (path.extname(decodedPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SPA_SECURITY_HEADERS });
      res.end('Not Found');
      return;
    }
    fileToServe = indexHtmlPath;
  }

  try {
    const stat = await fs.stat(fileToServe);
    let rawBody = await fs.readFile(fileToServe);
    const ext = path.extname(fileToServe).toLowerCase();
    if (fileToServe === indexHtmlPath) {
      rawBody = Buffer.from(injectDynamicOpenGraphTags(rawBody.toString('utf-8'), req), 'utf-8');
    }
    const contentType = STATIC_MIME_TYPES[ext] || 'application/octet-stream';
    const isHashedAsset = decodedPath.startsWith('/assets/');
    const etag =
      fileToServe === indexHtmlPath
        ? `W/"${crypto.createHash('sha1').update(rawBody).digest('hex').slice(0, 16)}"`
        : `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
      Vary: 'Accept-Encoding',
      ...SPA_SECURITY_HEADERS,
    };

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }

    const shouldCompress = COMPRESSIBLE_EXTS.has(ext);
    const { body, encoding } = shouldCompress
      ? negotiateCompression(req, rawBody)
      : { body: rawBody, encoding: null };
    if (encoding) {
      headers['Content-Encoding'] = encoding;
    }
    headers['Content-Length'] = String(body.length);

    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(body);
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', ...SPA_SECURITY_HEADERS });
    res.end('Static bundle not built yet. Run npm run build first.');
  }
}

const server = http.createServer(async (req, res) => {
  const remoteIp = resolveClientIp(req);
  if (!allowRateLimit(remoteIp)) {
    writeJson(req, res, 429, { error: 'Too many requests' });
    return;
  }

  if (req.headers.origin && !isAllowedOrigin(req.headers.origin, req.headers.host)) {
    writeJson(req, res, 403, { error: 'Forbidden origin' });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
    writeJson(req, res, 405, { error: 'Method not allowed' });
    return;
  }

  const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
  const isReadMethod = req.method === 'GET' || req.method === 'HEAD';

  if (isReadMethod && parsedUrl.pathname === '/api/healthz') {
    writeJson(req, res, 200, {
      ok: true,
      remoteCatalogEnabled: Boolean(REMOTE_CATALOG_URL),
      syncedAtIso: remoteCatalogCache?.syncedAtIso || null,
    });
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/geocode') {
    const q = parsedUrl.searchParams.get('q') || '';
    const cityParam = parsedUrl.searchParams.get('city') || 'melbourne';
    const safeCity =
      cityParam === 'sydney' || cityParam === 'shanghai' ? cityParam : 'melbourne';
    const results = await searchLocationsForQuery(q, safeCity);
    writeJson(req, res, 200, { ok: true, results });
    return;
  }

  if (isReadMethod && parsedUrl.pathname === '/api/status') {
    const cfg = await getApiConfig();
    const isHttps = req.headers['x-forwarded-proto'] === 'https';
    const cookieFlags = `Path=/; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}`;
    writeJson(
      req,
      res,
      200,
      {
        ok: true,
        readonly: PUBLIC_READONLY_MODE,
        csrfToken: PUBLIC_READONLY_MODE ? '' : SERVER_CSRF_TOKEN,
        configuredApis: {
          tmdb: Boolean(cfg.tmdbApiKey),
          omdb: Boolean(cfg.omdbApiKey),
          mdblist: Boolean(cfg.mdblistApiKey),
          serpapi: Boolean(cfg.serpapiApiKey),
        },
        maskedKeys: PUBLIC_READONLY_MODE
          ? { tmdb: null, omdb: null, mdblist: null, serpapi: null }
          : {
              tmdb: maskSecret(cfg.tmdbApiKey),
              omdb: maskSecret(cfg.omdbApiKey),
              mdblist: maskSecret(cfg.mdblistApiKey),
              serpapi: maskSecret(cfg.serpapiApiKey),
            },
      },
      {
        'Set-Cookie': `reelhouse_csrf=${SERVER_CSRF_TOKEN}; ${cookieFlags}`,
      }
    );
    return;
  }

  if (isReadMethod && parsedUrl.pathname === '/api/catalog') {
    try {
      const data = await getCachedOrFreshCatalog(false);
      const cityFilter = parsedUrl.searchParams.get('city');
      const isValidCity =
        cityFilter === 'melbourne' || cityFilter === 'sydney' || cityFilter === 'shanghai';

      let responsePayload = data;
      if (isValidCity && data && data.mode === 'live') {
        const citySessions = Array.isArray(data.sessions)
          ? data.sessions.filter((s) => s.city === cityFilter)
          : [];
        const cityMovieIds = new Set(citySessions.map((s) => s.movieId));
        const cityMovies = Array.isArray(data.movies)
          ? data.movies.filter((m) => cityMovieIds.has(m.id))
          : [];
        const cityCinemas = Array.isArray(data.cinemas)
          ? data.cinemas.filter((c) => c.city === cityFilter)
          : [];
        const cityComingSoon = Array.isArray(data.comingSoonMovies)
          ? data.comingSoonMovies
              .map((m) => {
                const matchingVenues = Array.isArray(m.upcomingVenues)
                  ? m.upcomingVenues.filter((v) => v.city === cityFilter)
                  : [];
                return matchingVenues.length > 0 ? { ...m, upcomingVenues: matchingVenues } : null;
              })
              .filter(Boolean)
          : [];

        responsePayload = {
          ...data,
          city: cityFilter,
          cinemas: cityCinemas,
          movies: cityMovies,
          comingSoonMovies: cityComingSoon,
          sessions: citySessions,
        };
      }

      const etagSeed = `${isValidCity ? cityFilter : 'all'}:${data.syncedAtIso || ''}:${data.ratingsSyncedAtIso || ''}:${Array.isArray(responsePayload.sessions) ? responsePayload.sessions.length : 0}:${Array.isArray(responsePayload.movies) ? responsePayload.movies.length : 0}`;
      const catalogEtag = `W/"${crypto.createHash('sha1').update(etagSeed).digest('hex').slice(0, 16)}"`;
      writeJson(req, res, 200, responsePayload, {
        'Cache-Control': 'public, max-age=60, must-revalidate',
        ETag: catalogEtag,
      });
    } catch {
      writeJson(req, res, 502, {
        mode: 'curated',
        error: 'Upstream sync temporarily unavailable; using curated fallback.',
      });
    }
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/configure-keys') {
    if (PUBLIC_READONLY_MODE) {
      writeJson(req, res, 403, {
        error: 'API key configuration is locked in public read-only deployment.',
      });
      return;
    }
    if (!verifyCsrf(req)) {
      writeJson(req, res, 403, { error: 'Invalid or missing CSRF security token. Reload page and try again.' });
      return;
    }

    try {
      const body = await readBoundedJsonBody(req);
      const patch = {};
      if (typeof body.tmdbApiKey === 'string' && body.tmdbApiKey.trim().length > 0) {
        patch.tmdbApiKey = body.tmdbApiKey.trim();
      }
      if (typeof body.omdbApiKey === 'string' && body.omdbApiKey.trim().length > 0) {
        patch.omdbApiKey = body.omdbApiKey.trim();
      }
      if (typeof body.mdblistApiKey === 'string' && body.mdblistApiKey.trim().length > 0) {
        patch.mdblistApiKey = body.mdblistApiKey.trim();
      }
      if (typeof body.serpapiApiKey === 'string' && body.serpapiApiKey.trim().length > 0) {
        patch.serpapiApiKey = body.serpapiApiKey.trim();
      }
      if (body.clearAll === true) {
        patch.tmdbApiKey = '';
        patch.omdbApiKey = '';
        patch.mdblistApiKey = '';
        patch.serpapiApiKey = '';
        await fs.rm(CACHE_FILE, { force: true });
      }

      await writeValidatedEnvKeys(patch);

      // Fast path: if live_catalog.json already exists and only rating keys (OMDb / MDBList) changed,
      // refresh true ratings in-place immediately without spending SerpApi showtime quota!
      const updatedCfg = await getApiConfig();
      let synced = null;
      const onlyRatingKeysUpdated =
        !patch.tmdbApiKey &&
        !patch.serpapiApiKey &&
        !body.clearAll &&
        (patch.mdblistApiKey || patch.omdbApiKey);

      if (onlyRatingKeysUpdated) {
        try {
          synced = await refreshCachedCatalogRatings({
            cacheFile: CACHE_FILE,
            cacheDir: CACHE_DIR,
            omdbApiKey: updatedCfg.omdbApiKey,
            mdblistApiKey: updatedCfg.mdblistApiKey,
            forceRefresh: true,
          });
        } catch {
          synced = null;
        }
      }
      if (!synced) {
        synced = await getCachedOrFreshCatalog(true);
      }

      writeJson(req, res, 200, {
        ok: true,
        mode: synced.mode,
        movieCount: Array.isArray(synced.movies) ? synced.movies.length : 0,
        comingSoonCount: Array.isArray(synced.comingSoonMovies) ? synced.comingSoonMovies.length : 0,
        sessionCount: Array.isArray(synced.sessions) ? synced.sessions.length : 0,
        syncedAtIso: synced.syncedAtIso || null,
      });
    } catch (err) {
      writeJson(req, res, 400, {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to validate keys or connect to upstream API.',
      });
    }
    return;
  }

  if (SERVE_STATIC && (req.method === 'GET' || req.method === 'HEAD') && !parsedUrl.pathname.startsWith('/api/')) {
    await serveStaticSpaAsset(req, res, parsedUrl.pathname);
    return;
  }

  writeJson(req, res, 404, { error: 'Not found' });
});

// Bind strictly to loopback 127.0.0.1 when running locally/testing; container runtime uses BIND_HOST.
server.listen(PORT, BIND_HOST, () => {
  const hasTmdb = Boolean(initialCfg.tmdbApiKey);
  console.log(
    `[Reelhouse BFF] Listening on http://${BIND_HOST}:${PORT} (mode=${hasTmdb ? 'live-ready' : 'curated-fallback'}, static=${SERVE_STATIC})`
  );

  // On Render Free Tier with remote catalog configured, warm the GitHub Raw snapshot right on boot
  // (no recurring setInterval timer so Render still sleeps cleanly after 15m idle).
  if (GITHUB_CRON_MANAGED && REMOTE_CATALOG_URL) {
    refreshRemoteCatalog(null).catch(() => null);
  }

  // Built-in proactive daily session refresh for standalone local/dedicated servers.
  // Disabled automatically when GITHUB_CRON_MANAGED=1 (Render Free Tier) so Render sleeps cleanly
  // when nobody is browsing and all scheduled scraping runs on GitHub Actions instead.
  if (hasTmdb && !GITHUB_CRON_MANAGED) {
    setTimeout(() => {
      getCachedOrFreshCatalog(false).catch(() => null);
    }, 2500).unref();

    setInterval(() => {
      getCachedOrFreshCatalog(false).catch(() => null);
    }, 6 * 3_600_000).unref();
  }
});
