import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import zlib from 'node:zlib';

const IMDB_DATASET_URL = 'https://datasets.imdbws.com/title.ratings.tsv.gz';
const IMDB_DATASET_TTL_MS = 24 * 3_600_000; // Refresh official IMDb daily dump every 24h
const DOUBAN_SETTLED_CACHE_TTL_MS = 7 * 24 * 3_600_000; // Settled Douban scores (500+ votes)
const DOUBAN_CACHE_TTL_MS = 24 * 3_600_000; // Refresh live Douban scores every 24h
const DOUBAN_UNRATED_TTL_MS = 12 * 3_600_000; // Retry confirmed-unrated films every 12h
const MDBLIST_SETTLED_CACHE_TTL_MS = 7 * 24 * 3_600_000; // Settled RT/IMDb scores (50+ critic reviews)
const MDBLIST_CACHE_TTL_MS = 24 * 3_600_000; // Refresh MDBList RT/IMDb scores every 24h
const MDBLIST_EMPTY_TTL_MS = 6 * 3_600_000; // Retry empty MDBList entries every 6h
const OMDB_CACHE_TTL_MS = 24 * 3_600_000; // Cache OMDb lookups to stay well under 1k/day cap
const OMDB_EMPTY_TTL_MS = 6 * 3_600_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildEstimatedDoubanStars(score10) {
  if (score10 >= 8.5) return [52, 34, 11, 2, 1];
  if (score10 >= 7.8) return [32, 45, 18, 4, 1];
  if (score10 >= 7.0) return [19, 44, 28, 7, 2];
  if (score10 >= 6.0) return [11, 31, 41, 13, 4];
  return [6, 17, 38, 25, 14];
}

/**
 * Ensures the official IMDb daily dataset (`title.ratings.tsv.gz`, ~8.3 MB) is cached locally,
 * then streams it through gunzip to extract exact `{ score, votes }` for the requested `tt...` IDs.
 */
export async function lookupOfficialImdbRatings(imdbIds, cacheDir) {
  const wanted = new Set(imdbIds.filter((id) => typeof id === 'string' && id.startsWith('tt')));
  const results = new Map();
  if (wanted.size === 0) return results;

  await fsp.mkdir(cacheDir, { recursive: true });
  const gzPath = path.join(cacheDir, 'imdb_title_ratings.tsv.gz');

  let needsDownload = true;
  try {
    const stat = await fsp.stat(gzPath);
    if (Date.now() - stat.mtimeMs < IMDB_DATASET_TTL_MS && stat.size > 1_000_000) {
      needsDownload = false;
    }
  } catch {
    needsDownload = true;
  }

  if (needsDownload) {
    try {
      const res = await fetch(IMDB_DATASET_URL, {
        signal: AbortSignal.timeout(25000),
      });
      if (res.ok && res.body) {
        const tmpPath = `${gzPath}.tmp`;
        const fileStream = fs.createWriteStream(tmpPath);
        await new Promise((resolve, reject) => {
          Readable.fromWeb(res.body).pipe(fileStream);
          fileStream.on('finish', resolve);
          fileStream.on('error', reject);
        });
        await fsp.rename(tmpPath, gzPath);
      }
    } catch {
      // If download fails and an older gz file exists, we can still read it below
    }
  }

  try {
    await fsp.access(gzPath);
  } catch {
    return results;
  }

  const gunzip = zlib.createGunzip();
  const source = fs.createReadStream(gzPath);
  const rl = readline.createInterface({
    input: source.pipe(gunzip),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Fast prefix check before splitting: tconst\taverageRating\tnumVotes
    const tab1 = line.indexOf('\t');
    if (tab1 <= 2) continue;
    const tconst = line.slice(0, tab1);
    if (!wanted.has(tconst)) continue;

    const tab2 = line.indexOf('\t', tab1 + 1);
    if (tab2 <= tab1) continue;
    const rating = Number.parseFloat(line.slice(tab1 + 1, tab2));
    const votes = Number.parseInt(line.slice(tab2 + 1), 10);
    if (Number.isFinite(rating) && rating > 0) {
      results.set(tconst, {
        score: rating,
        votes: Number.isFinite(votes) && votes > 0 ? votes : 0,
      });
    }
    if (results.size === wanted.size) {
      rl.close();
      source.destroy();
      break;
    }
  }

  return results;
}

/**
 * Queries MDBList (`api.mdblist.com`) for verified Rotten Tomatoes Tomatometer,
 * Rotten Tomatoes Audience (Popcornmeter), and IMDb ratings, retrying transient 429/5xx responses.
 */
async function fetchJsonWithRetry(url, headers = {}, timeoutMs = 10000, maxAttempts = 2) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) {
        return { ok: true, status: res.status, data: await res.json() };
      }
      if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts - 1) {
        await sleep(750 * (attempt + 1));
        continue;
      }
      return { ok: false, status: res.status, data: null };
    } catch {
      if (attempt < maxAttempts - 1) {
        await sleep(600 * (attempt + 1));
        continue;
      }
      return { ok: false, status: 0, data: null };
    }
  }
  return { ok: false, status: 0, data: null };
}

function parseMdblistRatingsArray(ratingsArray) {
  const normalizeRtUrl = (raw) => {
    if (typeof raw !== 'string' || !raw) return null;
    if (raw.startsWith('https://www.rottentomatoes.com/')) return raw;
    if (raw.startsWith('/')) return `https://www.rottentomatoes.com${raw}`;
    return null;
  };

  const findSource = (src) => ratingsArray.find((r) => r && r.source === src);
  const rtCritics = findSource('tomatoes');
  const rtAudience = findSource('popcorn') || findSource('tomatoesaudience');
  const imdbObj = findSource('imdb');

  const out = {};
  if (rtCritics && typeof rtCritics.value === 'number' && rtCritics.value >= 0) {
    out.tomatometerPercent = Math.round(rtCritics.value);
    out.criticReviews = typeof rtCritics.votes === 'number' ? rtCritics.votes : 0;
    const resolvedUrl = normalizeRtUrl(rtCritics.url);
    if (resolvedUrl) out.rtUrl = resolvedUrl;
  }
  if (rtAudience && typeof rtAudience.value === 'number' && rtAudience.value >= 0) {
    out.audiencePercent = Math.round(rtAudience.value);
    if (!out.rtUrl) {
      const resolvedUrl = normalizeRtUrl(rtAudience.url);
      if (resolvedUrl) out.rtUrl = resolvedUrl;
    }
  }
  if (imdbObj && typeof imdbObj.value === 'number' && imdbObj.value > 0) {
    out.imdbScore = Number(imdbObj.value.toFixed(1));
    out.imdbVotes = typeof imdbObj.votes === 'number' ? imdbObj.votes : 0;
  }
  return out;
}

async function fetchMdblistForMovie(movie, mdblistApiKey) {
  if (!mdblistApiKey) return null;

  const tmdbNumericId = String(movie.id || '').startsWith('tmdb-')
    ? String(movie.id).slice(5)
    : '';

  const candidateUrls = [];
  if (movie.imdbId) {
    candidateUrls.push(
      `https://api.mdblist.com/imdb/movie/${encodeURIComponent(movie.imdbId)}?apikey=${encodeURIComponent(mdblistApiKey)}`
    );
  }
  if (tmdbNumericId) {
    candidateUrls.push(
      `https://api.mdblist.com/tmdb/movie/${encodeURIComponent(tmdbNumericId)}?apikey=${encodeURIComponent(mdblistApiKey)}`
    );
  }
  if (candidateUrls.length === 0) return null;

  let anyHttpOk = false;
  for (const endpoint of candidateUrls) {
    const resp = await fetchJsonWithRetry(endpoint, {}, 10000, 2);
    if (!resp.ok || !resp.data || !Array.isArray(resp.data.ratings)) continue;
    anyHttpOk = true;
    const parsed = parseMdblistRatingsArray(resp.data.ratings);
    if (Object.keys(parsed).length > 0) {
      return parsed;
    }
  }

  return anyHttpOk ? {} : null;
}

/**
 * Queries OMDb for IMDb rating/votes and Rotten Tomatoes (when available on older/catalog films).
 */
async function fetchOmdbForMovie(movie, omdbApiKey) {
  if (!omdbApiKey) return null;
  const url = new URL('https://www.omdbapi.com/');
  if (movie.imdbId) {
    url.searchParams.set('i', movie.imdbId);
  } else {
    url.searchParams.set('t', movie.title);
    if (movie.releaseYear) url.searchParams.set('y', String(movie.releaseYear));
  }
  url.searchParams.set('apikey', omdbApiKey);

  const resp = await fetchJsonWithRetry(url.toString(), {}, 8000, 2);
  const data = resp.data;
  if (!resp.ok || !data) return null;
  if (data.Response !== 'True') {
    // Do not treat quota-limit responses as valid empty records
    if (String(data.Error || '').toLowerCase().includes('limit')) return null;
    return {};
  }

  const out = {};
  const imdbScore = Number.parseFloat(data.imdbRating);
  const imdbVotes = Number.parseInt(String(data.imdbVotes || '').replace(/,/g, ''), 10);
  if (Number.isFinite(imdbScore) && imdbScore > 0) {
    out.imdbScore = imdbScore;
  }
  if (Number.isFinite(imdbVotes) && imdbVotes > 0) {
    out.imdbVotes = imdbVotes;
  }

  const rtEntry = Array.isArray(data.Ratings)
    ? data.Ratings.find((r) => r.Source === 'Rotten Tomatoes')
    : null;
  if (rtEntry?.Value) {
    const pct = Number.parseInt(String(rtEntry.Value).replace('%', ''), 10);
    if (Number.isFinite(pct) && pct >= 0) {
      out.tomatometerPercent = pct;
    }
  }
  return out;
}

/**
 * Queries Douban's public JSON endpoints (`j/subject_suggest` + `j/subject_abstract`)
 * with strict release-year matching (±1 year) to retrieve real live Douban scores,
 * direct `/subject/<id>/` URLs, official Chinese titles, and featured short reviews (`豆瓣热评`).
 */
/**
 * Batch-resolves IMDb `tt...` IDs to Douban Movie Subject IDs (`P4529`) in a single
 * Wikidata SPARQL query so we avoid hitting Douban's rate-limited search endpoint!
 */
async function batchLookupWikidataDoubanIds(imdbIds) {
  const map = new Map();
  const cleanIds = Array.from(
    new Set(imdbIds.filter((id) => typeof id === 'string' && /^tt\d+$/.test(id)))
  );
  if (cleanIds.length === 0) return map;

  const values = cleanIds.map((id) => `"${id}"`).join(' ');
  const sparql = `SELECT ?imdb ?douban WHERE { VALUES ?imdb { ${values} } ?item wdt:P345 ?imdb ; wdt:P4529 ?douban . }`;
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CinemaSalonGuide/1.0',
        Accept: 'application/sparql-results+json,application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return map;
    const data = await res.json();
    for (const row of data?.results?.bindings || []) {
      const tt = row?.imdb?.value;
      const dbId = row?.douban?.value;
      if (tt && dbId && /^\d+$/.test(dbId)) {
        map.set(tt, dbId);
      }
    }
  } catch {
    // Fall back to individual search if Wikidata is unreachable
  }
  return map;
}

const NON_FEATURE_EVENT_PATTERN =
  /^(?:jiff|casffa|nt live|rbo cinema|doctor who day)\b|forging the one ring|the play$/i;

function isSuspiciousEventMovie(movie) {
  return (
    String(movie?.id || '').startsWith('live-film-') &&
    NON_FEATURE_EVENT_PATTERN.test(String(movie?.title || ''))
  );
}

async function fetchLiveDoubanForMovie(movie, knownSubjectId = null) {
  if (!knownSubjectId && isSuspiciousEventMovie(movie)) {
    return null;
  }

  const desktopHeaders = {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    Referer: 'https://movie.douban.com/',
    Accept: 'application/json,text/plain,*/*',
  };
  const mobileHeaders = {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    Referer: 'https://m.douban.com/',
    Accept: 'application/json,text/plain,*/*',
  };

  const cleanTitle = String(movie.title || '')
    .replace(/\([^)]*\)/g, '')
    .trim();
  const zhHint = String(movie.ratings?.douban?.chineseTitle || '')
    .replace(/[\u200e\u200f]/g, '')
    .trim();
  const targetYear = Number(movie.releaseYear) || 2026;
  const normClean = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  let subjectId =
    knownSubjectId && /^\d+$/.test(String(knownSubjectId)) ? String(knownSubjectId) : null;
  let chineseTitle = zhHint || movie.title;
  let score = null;
  let votes = 0;
  let fetchedOk = false;

  if (!subjectId) {
    // Use `movie.douban.com/j/subject_suggest` (reliable 200 OK; `rexxar/search/subjects` returns 403 WAF)
    const isRealChineseHint = /[\u4e00-\u9fff]/.test(zhHint);
    const searchCandidates = [];
    if (isRealChineseHint) searchCandidates.push(zhHint);
    if (!String(movie.id || '').startsWith('live-film-') && cleanTitle.length >= 2) {
      searchCandidates.push(cleanTitle);
    }

    for (const q of Array.from(new Set(searchCandidates))) {
      try {
        const suggestUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(q)}`;
        const res = await fetch(suggestUrl, {
          headers: desktopHeaders,
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) continue;
        const items = await res.json();
        if (!Array.isArray(items) || items.length === 0) continue;

        const hit = items.find((item) => {
          if (!item || item.type !== 'movie' || !item.id || !/^\d+$/.test(String(item.id))) {
            return false;
          }
          const itemYear = Number.parseInt(item.year, 10);
          if (!Number.isFinite(itemYear) || Math.abs(itemYear - targetYear) > 1) return false;
          const tTitle = String(item.title || '').trim();
          const tSub = String(item.sub_title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          if (isRealChineseHint && q === zhHint) {
            return tTitle === zhHint || tTitle.includes(zhHint) || zhHint.includes(tTitle);
          }
          return (
            normClean.length >= 3 &&
            (tSub === normClean || tSub.includes(normClean) || normClean.includes(tSub))
          );
        });

        if (hit?.id) {
          subjectId = String(hit.id);
          if (hit.title) chineseTitle = hit.title;
          break;
        }
      } catch {
        // Try next candidate
      }
    }
  }

  if (!subjectId) {
    return null;
  }

  const directUrl = `https://movie.douban.com/subject/${subjectId}/`;
  const subjectHeaders = {
    ...mobileHeaders,
    Referer: `https://m.douban.com/movie/subject/${subjectId}/`,
  };

  // 1) Primary exact detail check (`m.douban.com/rexxar/api/v2/movie/<id>`)
  try {
    const detailRes = await fetch(
      `https://m.douban.com/rexxar/api/v2/movie/${encodeURIComponent(subjectId)}`,
      {
        headers: subjectHeaders,
        signal: AbortSignal.timeout(7000),
      }
    );
    if (detailRes.ok) {
      fetchedOk = true;
      const detail = await detailRes.json();
      if (detail?.title) chineseTitle = detail.title;
      const rawVal = Number.parseFloat(detail?.rating?.value);
      const rawCnt = Number.parseInt(detail?.rating?.count, 10);
      if (Number.isFinite(rawVal) && rawVal > 0) score = Number(rawVal.toFixed(1));
      if (Number.isFinite(rawCnt) && rawCnt > 0) votes = rawCnt;
    }
  } catch {
    // Fall back to desktop abstract endpoint below
  }

  // 2) Secondary backup (`movie.douban.com/j/subject_abstract`) if rexxar was blocked/timed out
  if (!fetchedOk) {
    try {
      const absRes = await fetch(
        `https://movie.douban.com/j/subject_abstract?subject_id=${encodeURIComponent(subjectId)}`,
        {
          headers: {
            ...desktopHeaders,
            Referer: directUrl,
          },
          signal: AbortSignal.timeout(7000),
        }
      );
      if (absRes.ok) {
        const absData = await absRes.json();
        const subj = absData?.subject;
        if (subj && typeof subj === 'object') {
          fetchedOk = true;
          if (subj.title) {
            chineseTitle = String(subj.title).split(' ')[0] || chineseTitle;
          }
          const rawVal = Number.parseFloat(subj.rate);
          if (Number.isFinite(rawVal) && rawVal > 0) score = Number(rawVal.toFixed(1));
        }
      }
    } catch {
      // Leave fetchedOk=false so cached score isn't overwritten with null
    }
  }

  // CRITICAL: Do not emit an unverified null score when Douban blocked/failed HTTP checks!
  if (!fetchedOk && score === null) {
    return null;
  }

  return {
    subjectId,
    chineseTitle,
    score,
    votes,
    starBreakdownPercent: null,
    url: directUrl,
    fetchedOk: true,
  };
}

async function loadJsonCache(filePath) {
  try {
    return JSON.parse(await fsp.readFile(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

async function saveJsonCache(filePath, obj) {
  try {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // Ignore cache write errors
  }
}

function computeRtBadge(tomatometer) {
  if (tomatometer === null || tomatometer === undefined) return 'Awaiting Reviews';
  if (tomatometer >= 75) return 'Certified Fresh';
  if (tomatometer >= 60) return 'Fresh';
  return 'Rotten';
}

/**
 * Enriches an array of Movie objects in-place with TRUE, verified ratings from:
 *   1. Official IMDb daily dataset (`datasets.imdbws.com`) + OMDb + MDBList
 *   2. MDBList (`api.mdblist.com`) + OMDb for Rotten Tomatoes (Tomatometer & Popcornmeter)
 *   3. Douban public JSON (`movie.douban.com/j/subject_suggest` + `j/subject_abstract`)
 * Never fabricates or copies TMDB averages into missing platform badges (uses `null` -> `NR`).
 */
export async function enrichMoviesWithTrueRatings(
  movies,
  { omdbApiKey = '', mdblistApiKey = '', cacheDir, forceRefresh = false }
) {
  if (!Array.isArray(movies) || movies.length === 0) return movies;

  const doubanCacheFile = path.join(cacheDir, 'douban_ratings_cache.json');
  const mdblistCacheFile = path.join(cacheDir, 'mdblist_ratings_cache.json');
  const omdbCacheFile = path.join(cacheDir, 'omdb_ratings_cache.json');

  const [doubanCache, mdblistCache, omdbCache] = await Promise.all([
    loadJsonCache(doubanCacheFile),
    loadJsonCache(mdblistCacheFile),
    loadJsonCache(omdbCacheFile),
  ]);
  const now = Date.now();

  // Purge known false-positive Douban matches on live event titles (e.g. JIFF / Rings of Power)
  for (const movie of movies) {
    if (isSuspiciousEventMovie(movie)) {
      delete doubanCache[movie.imdbId || movie.id];
    }
  }

  // 1. Official IMDb daily dataset lookup + Wikidata IMDb->Douban batch mapping (only for missing subjectIds!)
  const imdbIds = movies.map((m) => m.imdbId).filter(Boolean);
  const unmappedImdbIds = movies
    .filter((m) => {
      if (!m.imdbId) return false;
      const existing = doubanCache[m.imdbId]?.data;
      return !(existing && /^\d+$/.test(String(existing.subjectId || '')));
    })
    .map((m) => m.imdbId);

  const [officialImdbMap, wikidataDoubanMap] = await Promise.all([
    lookupOfficialImdbRatings(imdbIds, cacheDir),
    batchLookupWikidataDoubanIds(unmappedImdbIds),
  ]);

  // 2. Fetch OMDb + MDBList in parallel batches of 5 with polite pacing and stale-score preservation
  const omdbMap = new Map();
  const mdbMap = new Map();
  const BATCH_SIZE = 5;
  for (let start = 0; start < movies.length; start += BATCH_SIZE) {
    const slice = movies.slice(start, start + BATCH_SIZE);
    await Promise.all(
      slice.map(async (movie) => {
        const cacheKey = movie.imdbId || movie.id;
        const [omdbRes, mdbRes] = await Promise.all([
          (async () => {
            if (!omdbApiKey) return null;
            const cached = omdbCache[cacheKey];
            const cachedData = cached?.data || null;
            const ttl =
              cachedData && Object.keys(cachedData).length > 0
                ? OMDB_CACHE_TTL_MS
                : OMDB_EMPTY_TTL_MS;
            if (!forceRefresh && cached && now - cached.ts < ttl) {
              return cachedData;
            }
            const fresh = await fetchOmdbForMovie(movie, omdbApiKey).catch(() => null);
            if (fresh !== null) {
              const merged =
                Object.keys(fresh).length > 0 || !cachedData || Object.keys(cachedData).length === 0
                  ? fresh
                  : cachedData;
              omdbCache[cacheKey] = { ts: now, data: merged };
              return merged;
            }
            return cachedData;
          })(),
          (async () => {
            if (!mdblistApiKey) return null;
            const cached = mdblistCache[cacheKey];
            const cachedData = cached?.data || null;
            const isSettled =
              cachedData &&
              typeof cachedData.tomatometerPercent === 'number' &&
              (cachedData.criticReviews || 0) >= 50;
            const hasAnyScore =
              cachedData &&
              (typeof cachedData.tomatometerPercent === 'number' ||
                typeof cachedData.imdbScore === 'number');
            const ttl = isSettled
              ? MDBLIST_SETTLED_CACHE_TTL_MS
              : hasAnyScore
                ? MDBLIST_CACHE_TTL_MS
                : MDBLIST_EMPTY_TTL_MS;
            if (!forceRefresh && cached && now - cached.ts < ttl) {
              return cachedData;
            }
            const fresh = await fetchMdblistForMovie(movie, mdblistApiKey).catch(() => null);
            if (fresh !== null) {
              const merged =
                cachedData && Object.keys(cachedData).length > 0
                  ? { ...cachedData, ...fresh }
                  : fresh;
              mdblistCache[cacheKey] = { ts: now, data: merged };
              return merged;
            }
            return cachedData;
          })(),
        ]);
        omdbMap.set(cacheKey, omdbRes);
        mdbMap.set(cacheKey, mdbRes);
      })
    );
    if (start + BATCH_SIZE < movies.length) {
      await sleep(120);
    }
  }

  let consecutiveDoubanFailures = 0;
  for (const movie of movies) {
    const cacheKey = movie.imdbId || movie.id;
    const omdbRes = omdbMap.get(cacheKey) || null;
    const mdbRes = mdbMap.get(cacheKey) || null;

    // --- B. Live Douban (uses cached/Wikidata Douban ID first, preserves valid scores if rate-limited) ---
    let doubanRes = null;
    const cachedDouban = doubanCache[cacheKey];
    const cachedData = cachedDouban?.data || null;
    const cachedSubjectId =
      cachedData && /^\d+$/.test(String(cachedData.subjectId || ''))
        ? String(cachedData.subjectId)
        : null;
    const knownDoubanId =
      (movie.imdbId ? wikidataDoubanMap.get(movie.imdbId) : null) || cachedSubjectId || null;

    const cachedHasScore = Boolean(cachedData && cachedData.score !== null && cachedData.score > 0);
    const doubanTtl = cachedHasScore
      ? (cachedData.votes || 0) >= 500
        ? DOUBAN_SETTLED_CACHE_TTL_MS
        : DOUBAN_CACHE_TTL_MS
      : cachedData?.fetchedOk
        ? DOUBAN_UNRATED_TTL_MS
        : 0; // Force re-check of legacy unverified score:null entries!

    if (
      !forceRefresh &&
      cachedData &&
      doubanTtl > 0 &&
      now - cachedDouban.ts < doubanTtl
    ) {
      doubanRes = cachedData;
    } else if (isSuspiciousEventMovie(movie)) {
      doubanRes = null;
    } else if (consecutiveDoubanFailures >= 5 && !knownDoubanId) {
      // Avoid hammering Douban search after sustained 403/429 responses
      doubanRes = cachedData;
    } else {
      const freshDouban = await fetchLiveDoubanForMovie(movie, knownDoubanId).catch(() => null);
      if (freshDouban && freshDouban.score !== null) {
        if (!freshDouban.starBreakdownPercent && cachedData?.starBreakdownPercent) {
          freshDouban.starBreakdownPercent = cachedData.starBreakdownPercent;
        }
        doubanCache[cacheKey] = { ts: now, data: freshDouban };
        doubanRes = freshDouban;
        consecutiveDoubanFailures = 0;
      } else if (freshDouban && cachedHasScore) {
        // Never overwrite a valid previously verified Douban score with null
        doubanRes = cachedData;
      } else if (freshDouban) {
        doubanCache[cacheKey] = { ts: now, data: freshDouban };
        doubanRes = freshDouban;
        consecutiveDoubanFailures = 0;
      } else {
        consecutiveDoubanFailures += 1;
        doubanRes = cachedHasScore ? cachedData : cachedData?.subjectId ? cachedData : null;
      }
      await sleep(knownDoubanId ? 850 : 950);
    }

    // --- C. Reconcile True IMDb ---
    const datasetImdb = movie.imdbId ? officialImdbMap.get(movie.imdbId) : null;
    const trueImdbScore =
      datasetImdb?.score ?? mdbRes?.imdbScore ?? omdbRes?.imdbScore ?? null;
    const trueImdbVotes =
      datasetImdb?.votes ?? mdbRes?.imdbVotes ?? omdbRes?.imdbVotes ?? 0;

    const imdbUrl = movie.imdbId
      ? `https://www.imdb.com/title/${movie.imdbId}/`
      : `https://www.imdb.com/find/?q=${encodeURIComponent(movie.title)}&s=tt`;

    // --- D. Reconcile True Rotten Tomatoes ---
    const trueTomatometer =
      mdbRes?.tomatometerPercent ?? omdbRes?.tomatometerPercent ?? null;
    const trueAudiencePct = mdbRes?.audiencePercent ?? null;
    const rtReviews = mdbRes?.criticReviews ?? 0;
    const rtUrl =
      mdbRes?.rtUrl ||
      `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.title)}`;

    // --- E. Reconcile True Douban ---
    const zhTitle = String(
      doubanRes?.chineseTitle || movie.ratings?.douban?.chineseTitle || movie.title
    )
      .replace(/[\u200e\u200f]/g, '')
      .trim();
    const trueDoubanScore = doubanRes?.score ?? null;
    const trueDoubanVotes = doubanRes?.votes ?? 0;
    const trueDoubanStars =
      doubanRes?.starBreakdownPercent ||
      (trueDoubanScore !== null ? buildEstimatedDoubanStars(trueDoubanScore) : null);
    const doubanUrl =
      doubanRes?.url ||
      `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(
        movie.imdbId || zhTitle || movie.title
      )}&cat=1002`;

    const doubanNote =
      trueDoubanVotes > 0
        ? `${trueDoubanVotes} 人评价`
        : trueDoubanScore !== null
          ? '豆瓣已收录评分'
          : '暂无评分';

    movie.ratings = {
      imdb: {
        score: trueImdbScore,
        votes: trueImdbVotes,
        url: imdbUrl,
      },
      rottenTomatoes: {
        tomatometerPercent: trueTomatometer,
        audiencePercent: trueAudiencePct,
        criticReviews: rtReviews,
        badge: computeRtBadge(trueTomatometer),
        url: rtUrl,
      },
      douban: {
        score: trueDoubanScore,
        votes: trueDoubanVotes,
        chineseTitle: zhTitle,
        starBreakdownPercent: trueDoubanStars,
        consensusNote: doubanNote,
        url: doubanUrl,
      },
    };

    // Keep top-level sort/verdict helpers aligned with verified scores
    movie.criticScorePercent =
      trueTomatometer ??
      (trueImdbScore !== null ? Math.round(trueImdbScore * 10) : 0);
    movie.audienceScorePercent =
      trueAudiencePct ??
      (trueDoubanScore !== null ? Math.round(trueDoubanScore * 10) : movie.criticScorePercent);
  }

  await Promise.all([
    saveJsonCache(doubanCacheFile, doubanCache),
    saveJsonCache(mdblistCacheFile, mdblistCache),
    saveJsonCache(omdbCacheFile, omdbCache),
  ]);

  return movies;
}

/**
 * Refreshes ONLY movie review scores inside an existing `live_catalog.json` snapshot
 * (used by the 6-hour background score timer and when adding an MDBList API key,
 * spending ZERO SerpApi showtime queries).
 */
export async function refreshCachedCatalogRatings({
  cacheFile,
  cacheDir,
  omdbApiKey,
  mdblistApiKey,
  forceRefresh = false,
}) {
  const raw = await fsp.readFile(cacheFile, 'utf-8');
  const snapshot = JSON.parse(raw);

  const allLists = [
    ...(Array.isArray(snapshot.movies) ? snapshot.movies : []),
    ...(Array.isArray(snapshot.comingSoonMovies) ? snapshot.comingSoonMovies : []),
  ];

  await enrichMoviesWithTrueRatings(allLists, {
    omdbApiKey,
    mdblistApiKey,
    cacheDir,
    forceRefresh,
  });

  snapshot.ratingsSyncedAtIso = new Date().toISOString();
  snapshot.configuredApis = {
    ...snapshot.configuredApis,
    omdb: Boolean(omdbApiKey),
    mdblist: Boolean(mdblistApiKey),
  };

  await fsp.writeFile(cacheFile, JSON.stringify(snapshot, null, 2), 'utf-8');
  return snapshot;
}
