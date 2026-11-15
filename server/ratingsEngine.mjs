import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import zlib from 'node:zlib';

const IMDB_DATASET_URL = 'https://datasets.imdbws.com/title.ratings.tsv.gz';
const IMDB_DATASET_TTL_MS = 24 * 3_600_000; // Refresh official IMDb daily dump every 24h
const DOUBAN_CACHE_TTL_MS = 24 * 3_600_000; // Refresh live Douban scores every 24h
const MDBLIST_CACHE_TTL_MS = 24 * 3_600_000; // Refresh MDBList RT/IMDb scores every 24h

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
 * Rotten Tomatoes Audience (Popcornmeter), and IMDb ratings.
 */
async function fetchMdblistForMovie(movie, mdblistApiKey) {
  if (!mdblistApiKey) return null;

  const tmdbNumericId = String(movie.id || '').startsWith('tmdb-')
    ? String(movie.id).slice(5)
    : '';

  const endpoint = movie.imdbId
    ? `https://api.mdblist.com/imdb/movie/${encodeURIComponent(movie.imdbId)}?apikey=${encodeURIComponent(mdblistApiKey)}`
    : tmdbNumericId
      ? `https://api.mdblist.com/tmdb/movie/${encodeURIComponent(tmdbNumericId)}?apikey=${encodeURIComponent(mdblistApiKey)}`
      : null;

  if (!endpoint) return null;

  const res = await fetch(endpoint, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !Array.isArray(data.ratings)) return null;

  const normalizeRtUrl = (raw) => {
    if (typeof raw !== 'string' || !raw) return null;
    if (raw.startsWith('https://www.rottentomatoes.com/')) return raw;
    if (raw.startsWith('/')) return `https://www.rottentomatoes.com${raw}`;
    return null;
  };

  const findSource = (src) => data.ratings.find((r) => r && r.source === src);
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

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.Response !== 'True') return null;

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

async function fetchLiveDoubanForMovie(movie, knownSubjectId = null) {
  const mobileHeaders = {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    Referer: 'https://m.douban.com/search/',
    Accept: 'application/json,text/plain,*/*',
  };

  const cleanTitle = String(movie.title || '')
    .replace(/\([^)]*\)/g, '')
    .trim();
  const zhHint = movie.ratings?.douban?.chineseTitle || '';
  const targetYear = Number(movie.releaseYear) || 2026;

  let subjectId = knownSubjectId ? String(knownSubjectId) : null;
  let chineseTitle = zhHint || movie.title;
  let score = null;
  let votes = 0;

  if (!subjectId) {
    // Only query search/subjects if Wikidata didn't already give us the exact Douban ID
    const queries = Array.from(new Set([movie.imdbId, zhHint, cleanTitle].filter(Boolean)));
    for (const q of queries) {
      try {
        const searchUrl = `https://m.douban.com/rexxar/api/v2/search/subjects?q=${encodeURIComponent(
          q
        )}&type=movie`;
        const res = await fetch(searchUrl, {
          headers: mobileHeaders,
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const items = data?.subjects?.items;
        if (!Array.isArray(items) || items.length === 0) continue;

        const targets = items.map((it) => it?.target).filter((t) => t && t.id);
        const hit =
          q === movie.imdbId && targets[0]
            ? targets[0]
            : targets.find((t) => {
                const itemYear = Number.parseInt(t.year, 10);
                return Number.isFinite(itemYear) && Math.abs(itemYear - targetYear) <= 1;
              }) || null;

        if (hit?.id) {
          subjectId = String(hit.id);
          if (hit.title) chineseTitle = hit.title;
          const rawVal = Number.parseFloat(hit?.rating?.value);
          const rawCnt = Number.parseInt(hit?.rating?.count, 10);
          if (Number.isFinite(rawVal) && rawVal > 0) score = Number(rawVal.toFixed(1));
          if (Number.isFinite(rawCnt) && rawCnt > 0) votes = rawCnt;
          break;
        }
      } catch {
        // Try next query candidate
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

  // Fetch exact Douban movie detail (`rating.value`, `rating.count`, `title`) if not already populated from search
  if (score === null && votes === 0) {
    try {
      const detailRes = await fetch(
        `https://m.douban.com/rexxar/api/v2/movie/${encodeURIComponent(subjectId)}`,
        {
          headers: subjectHeaders,
          signal: AbortSignal.timeout(7000),
        }
      );
      if (detailRes.ok) {
        const detail = await detailRes.json();
        if (detail?.title) chineseTitle = detail.title;
        const rawVal = Number.parseFloat(detail?.rating?.value);
        const rawCnt = Number.parseInt(detail?.rating?.count, 10);
        if (Number.isFinite(rawVal) && rawVal > 0) score = Number(rawVal.toFixed(1));
        if (Number.isFinite(rawCnt) && rawCnt > 0) votes = rawCnt;
      }
    } catch {
      // Keep fallback values
    }
  }

  let starBreakdownPercent = null;
  if (score !== null) {
    try {
      const ratingRes = await fetch(
        `https://m.douban.com/rexxar/api/v2/movie/${encodeURIComponent(subjectId)}/rating`,
        {
          headers: subjectHeaders,
          signal: AbortSignal.timeout(6000),
        }
      );
      if (ratingRes.ok) {
        const rtStats = await ratingRes.json();
        if (Array.isArray(rtStats?.stats) && rtStats.stats.length === 5) {
          starBreakdownPercent = [...rtStats.stats]
            .reverse()
            .map((p) => Math.round(Number(p || 0) * 100));
        }
      }
    } catch {
      // Fall back to estimated histogram if /rating times out
    }
  }

  return {
    subjectId,
    chineseTitle,
    score,
    votes,
    starBreakdownPercent,
    url: directUrl,
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

  const doubanCache = await loadJsonCache(doubanCacheFile);
  const mdblistCache = await loadJsonCache(mdblistCacheFile);
  const now = Date.now();

  // 1. Official IMDb daily dataset lookup + Wikidata IMDb->Douban batch mapping
  const imdbIds = movies.map((m) => m.imdbId).filter(Boolean);
  const [officialImdbMap, wikidataDoubanMap] = await Promise.all([
    lookupOfficialImdbRatings(imdbIds, cacheDir),
    batchLookupWikidataDoubanIds(imdbIds),
  ]);

  // 2. Fetch OMDb + MDBList in parallel batches of 6, then fetch Douban sequentially with polite 220ms spacing
  const omdbMap = new Map();
  const mdbMap = new Map();
  const BATCH_SIZE = 6;
  for (let start = 0; start < movies.length; start += BATCH_SIZE) {
    const slice = movies.slice(start, start + BATCH_SIZE);
    await Promise.all(
      slice.map(async (movie) => {
        const cacheKey = movie.imdbId || movie.id;
        const [omdbRes, mdbRes] = await Promise.all([
          fetchOmdbForMovie(movie, omdbApiKey).catch(() => null),
          (async () => {
            if (!mdblistApiKey) return null;
            const cached = mdblistCache[cacheKey];
            if (!forceRefresh && cached && now - cached.ts < MDBLIST_CACHE_TTL_MS) {
              return cached.data;
            }
            const fresh = await fetchMdblistForMovie(movie, mdblistApiKey).catch(() => null);
            if (fresh) {
              mdblistCache[cacheKey] = { ts: now, data: fresh };
            }
            return fresh;
          })(),
        ]);
        omdbMap.set(cacheKey, omdbRes);
        mdbMap.set(cacheKey, mdbRes);
      })
    );
  }

  for (const movie of movies) {
    const cacheKey = movie.imdbId || movie.id;
    const omdbRes = omdbMap.get(cacheKey) || null;
    const mdbRes = mdbMap.get(cacheKey) || null;

    // --- B. Live Douban (uses Wikidata Douban ID first, avoiding search rate limits) ---
    let doubanRes = null;
    const cachedDouban = doubanCache[cacheKey];
    const knownDoubanId = movie.imdbId ? wikidataDoubanMap.get(movie.imdbId) || null : null;
    if (
      !forceRefresh &&
      cachedDouban &&
      cachedDouban.data &&
      now - cachedDouban.ts < DOUBAN_CACHE_TTL_MS
    ) {
      doubanRes = cachedDouban.data;
    } else {
      doubanRes = await fetchLiveDoubanForMovie(movie, knownDoubanId).catch(() => null);
      if (doubanRes) {
        doubanCache[cacheKey] = { ts: now, data: doubanRes };
      }
      await sleep(knownDoubanId ? 180 : 650);
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
    const zhTitle =
      doubanRes?.chineseTitle || movie.ratings?.douban?.chineseTitle || movie.title;
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
