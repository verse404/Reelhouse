export type CityId = 'melbourne' | 'sydney' | 'shanghai';

export type CityTimeZone = 'Australia/Melbourne' | 'Australia/Sydney' | 'Asia/Shanghai';

export type CurrencyCode = 'AUD' | 'CNY';

export type BrowseMode = 'movies' | 'cinemas' | 'map';

export type ReleaseStatus = 'in_cinemas' | 'coming_soon';

export type TimeOfDay = 'all' | 'morning' | 'afternoon' | 'evening' | 'late';

export type FormatType =
  | 'IMAX'
  | 'Dolby Atmos'
  | '35mm / 70mm'
  | 'Gold Class / LUX'
  | 'Vmax / Xtremescreen'
  | 'Standard';

export type CinemaVibe =
  | 'Indie & Arthouse'
  | 'Heritage Palace'
  | 'Grand Format'
  | 'Boutique Luxury'
  | 'Major Multiplex';

export type ClassificationRating = 'G' | 'PG' | 'M' | 'MA15+';

export type PriceCapOption = 'all' | 'under18' | 'under25';

export type MinRatingOption = 'all' | 'imdb8' | 'rt90' | 'douban8';

export type FinishByOption = 'all' | '1800' | '2130' | '2230' | '2330';

export interface CityMeta {
  id: CityId;
  name: string;
  stateCode: 'VIC' | 'NSW' | 'SH';
  currency: CurrencyCode;
  timeZone: CityTimeZone;
  tagline: string;
  editorialNote: string;
}

export interface Cinema {
  id: string;
  city: CityId;
  name: string;
  chain: string;
  suburb: string;
  address: string;
  lat?: number;
  lng?: number;
  distanceFromCbdKm: number;
  transitNote: string;
  vibe: CinemaVibe;
  supportedFormats: FormatType[];
  barAndFoodNote: string;
  dealHighlight: string;
  bookingDomainUrl: string;
  screenCount: number;
}

export type PosterThemeId =
  | 'dune-amber'
  | 'coastal-noir'
  | 'glass-nocturne'
  | 'kyoto-clock'
  | 'velvet-static'
  | 'mood-crimson'
  | 'orbital-grid'
  | 'saltwater-sun'
  | 'echo-ivory'
  | 'bathurst-carbon'
  | 'cambon-silk'
  | 'mirror-monolith'
  | 'cicada-jade'
  | 'tasman-storm'
  | 'orpheus-velvet'
  | 'cradle-mist';

export interface MovieRatings {
  imdb: {
    score: number | null; // out of 10, e.g. 8.6 (null = Not Yet Rated)
    votes: number;
    url: string;
  };
  rottenTomatoes: {
    tomatometerPercent: number | null; // 0-100 (null = Not Yet Rated)
    audiencePercent: number | null; // 0-100 (null = Not Yet Rated)
    criticReviews: number;
    badge: 'Certified Fresh' | 'Fresh' | 'Rotten' | 'Awaiting Reviews';
    url: string;
  };
  douban: {
    score: number | null; // out of 10, e.g. 8.7 (null = 暂无评分)
    votes: number;
    chineseTitle: string;
    /** 5-star down to 1-star percentages summing to 100 (null when unrated) */
    starBreakdownPercent: [number, number, number, number, number] | null;
    consensusNote: string;
    url: string;
  };
}

export interface UpcomingVenuePreview {
  cinemaId: string;
  city: CityId;
  format: FormatType;
  previewNote: string; // e.g. "Advance 35mm Gala — Wed 25 Nov, 7:30 pm"
}

export interface LiveSyncStatus {
  mode: 'curated' | 'live';
  syncedAtIso: string | null;
  hasLiveSessions: boolean;
  configuredApis: {
    tmdb: boolean;
    omdb: boolean;
    mdblist?: boolean;
    serpapi: boolean;
  };
}

export interface Movie {
  id: string;
  title: string;
  director: string;
  releaseYear: number;
  releaseStatus?: ReleaseStatus;
  /** Australian cinema release date YYYY-MM-DD for Coming Soon titles */
  releaseDateIso?: string;
  /** Optional marquee occasion label, e.g. "Boxing Day Gala Release" */
  releaseOccasion?: string;
  upcomingVenues?: UpcomingVenuePreview[];
  /** Optional live official poster URL from TMDB (image.tmdb.org) */
  posterUrl?: string;
  /** Optional official YouTube trailer video ID from TMDB */
  trailerYoutubeKey?: string;
  runtimeMinutes: number;
  classification: ClassificationRating;
  genres: string[];
  criticScorePercent: number;
  audienceScorePercent: number;
  ratings: MovieRatings;
  countryOrigin: string;
  languageNote: string;
  tagline: string;
  synopsis: string;
  editorialPickReason?: string;
  isFeaturedMarquee?: boolean;
  posterTheme: PosterThemeId;
  castLead: string[];
}

export interface ScreeningSession {
  id: string;
  movieId: string;
  cinemaId: string;
  city: CityId;
  currency?: CurrencyCode;
  /** ISO date string YYYY-MM-DD in local city calendar */
  dateIso: string;
  /** 24-hour HH:MM in local city time */
  startTime24: string;
  startMinutesFromMidnight: number;
  auditoriumName: string;
  format: FormatType;
  priceAud: number;
  regularPriceAud: number;
  isDealSession: boolean;
  dealLabel?: string;
  priceBasis?: 'scraped_live' | 'published_card';
  priceNote?: string;
  accessibilityTags: string[];
  seatsRemainingLevel: 'plenty' | 'filling' | 'low';
}

export interface CalendarDayOption {
  dateIso: string;
  dayOfWeekIndex: number; // 0 = Sun, 1 = Mon, 2 = Tue...
  isToday: boolean;
  isTomorrow: boolean;
  isCheapTuesday: boolean;
}

export interface FilterState {
  city: CityId;
  releaseStatus: ReleaseStatus;
  browseMode: BrowseMode;
  dateIso: string;
  selectedMovieId: string; // 'all' or specific Movie.id
  selectedCinemaId: string; // 'all' or specific Cinema.id
  chain: string; // 'all' or specific cinema chain
  favoritesOnly: boolean;
  suburb: string; // 'all' or specific suburb
  timeOfDay: TimeOfDay;
  formats: FormatType[];
  vibe: CinemaVibe | 'all';
  genre: string; // 'all' or specific genre
  priceCap: PriceCapOption;
  minRating: MinRatingOption;
  finishBy: FinishByOption;
  nearHubId: string; // 'cbd' | 'gps' | city neighborhood hub id
  dealsOnly: boolean;
  showPastToday: boolean;
  searchQuery: string;
}

export interface ShortlistEntry {
  sessionId: string;
  votes: number;
  addedAtMs: number;
}
