import type {
  BrowseMode,
  CityId,
  CityTimeZone,
  FilterState,
  FinishByOption,
  ReleaseStatus,
  ShortlistEntry,
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
    if (parsed.hostname.toLowerCase() !== 'image.tmdb.org') return null;
    if (!parsed.pathname.startsWith('/t/p/')) return null;
    return parsed.toString();
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
    if (mode === 'movies' || mode === 'cinemas' || mode === 'map') {
      out.browseMode = mode as BrowseMode;
    }

    const date = params.get('date');
    if (date && SAFE_ISO_DATE_REGEX.test(date)) {
      out.dateIso = date;
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

    const finish = params.get('finish');
    if (finish === '1800' || finish === '2130' || finish === '2230' || finish === '2330') {
      out.finishBy = finish as FinishByOption;
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

/**
 * Parses and strictly validates shared Folio session IDs (`?folio=id1,id2,...`).
 */
export function parseValidatedFolioIds(search: string): string[] {
  try {
    const raw = new URLSearchParams(search).get('folio');
    if (!raw) return [];
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const part of raw.split(',')) {
      const trimmed = part.trim();
      if (SAFE_ID_REGEX.test(trimmed) && !seen.has(trimmed)) {
        seen.add(trimmed);
        ids.push(trimmed);
        if (ids.length >= 6) break;
      }
    }
    return ids;
  } catch {
    return [];
  }
}

/**
 * Builds a clean, shareable absolute URL containing up to 6 shortlisted Folio sessions.
 */
export function buildShareableFolioUrl(city: CityId, sessionIds: string[]): string {
  const safeIds = sessionIds.filter((id) => SAFE_ID_REGEX.test(id)).slice(0, 6);
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('city', city);
  if (safeIds.length > 0) {
    url.searchParams.set('folio', safeIds.join(','));
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
  activeFolioIds?: string[]
): string {
  const params = new URLSearchParams();
  if (preserveAdmin) {
    params.set('admin', '1');
  }
  params.set('city', filters.city);
  if (filters.releaseStatus !== 'in_cinemas') {
    params.set('status', filters.releaseStatus);
  }
  if (filters.browseMode !== 'movies') {
    params.set('mode', filters.browseMode);
  }
  if (filters.releaseStatus === 'in_cinemas' && filters.dateIso !== defaultTodayIso) {
    params.set('date', filters.dateIso);
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
  if (filters.suburb !== 'all') {
    params.set('suburb', filters.suburb);
  }
  if (filters.nearHubId !== 'cbd' && filters.nearHubId !== 'gps') {
    params.set('near', filters.nearHubId);
  }
  if (filters.releaseStatus === 'in_cinemas' && filters.finishBy !== 'all') {
    params.set('finish', filters.finishBy);
  }
  if (filters.searchQuery.trim().length > 0) {
    params.set('q', filters.searchQuery.trim());
  }
  if (activeFolioIds && activeFolioIds.length > 0) {
    const safeFolio = activeFolioIds.filter((id) => SAFE_ID_REGEX.test(id)).slice(0, 6);
    if (safeFolio.length > 0) {
      params.set('folio', safeFolio.join(','));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}
