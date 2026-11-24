import {
  buildSevenDayCalendar,
  CINEMAS,
  CITIES,
} from '../data/citiesMeta';
import type {
  CalendarDayOption,
  Cinema,
  CityId,
  CityMeta,
  LiveSyncStatus,
  Movie,
  ScreeningSession,
} from '../types/cinema';

export interface CinemaDataProvider {
  getCityMeta(city: CityId): CityMeta;
  getCalendarDays(city: CityId): CalendarDayOption[];
  getCinemas(city: CityId): Cinema[];
  getMovies(): Movie[];
  getComingSoonMovies(): Movie[];
  getSessionsForCity(city: CityId): ScreeningSession[];
  getSessionsForCityAndDate(city: CityId, dateIso: string): ScreeningSession[];
  getSessionById(sessionId: string): ScreeningSession | undefined;
  getSyncStatus(): LiveSyncStatus;
  hydrateFromLiveBff(city?: CityId, forceRefresh?: boolean): Promise<LiveSyncStatus>;
}

interface BffCatalogPayload {
  mode?: 'curated' | 'live';
  city?: CityId | 'all';
  syncedAtIso?: string | null;
  hasLiveSessions?: boolean;
  configuredApis?: {
    tmdb?: boolean;
    omdb?: boolean;
    mdblist?: boolean;
    serpapi?: boolean;
  };
  cinemas?: Cinema[];
  movies?: Movie[];
  comingSoonMovies?: Movie[];
  sessions?: ScreeningSession[];
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return existing;
  const map = new Map<string, T>();
  for (const item of existing) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}

class HybridAustralianCinemaProvider implements CinemaDataProvider {
  private activeCinemas: Cinema[];
  private activeMovies: Movie[];
  private activeComingSoon: Movie[];
  private activeSessions: ScreeningSession[];
  private sessionIndex: Map<string, ScreeningSession>;
  private syncStatus: LiveSyncStatus;
  private loadedCities: Set<CityId>;
  private inFlightByCity: Map<string, Promise<LiveSyncStatus>>;
  private fullStaticLoaded = false;

  constructor() {
    this.activeCinemas = CINEMAS;
    this.activeMovies = [];
    this.activeComingSoon = [];
    this.activeSessions = [];
    this.sessionIndex = new Map();
    this.loadedCities = new Set();
    this.inFlightByCity = new Map();
    this.syncStatus = {
      mode: 'curated',
      syncedAtIso: null,
      hasLiveSessions: false,
      configuredApis: { tmdb: false, omdb: false, serpapi: false },
    };
  }

  getCityMeta(city: CityId): CityMeta {
    return CITIES[city];
  }

  getCalendarDays(city: CityId): CalendarDayOption[] {
    return buildSevenDayCalendar(city);
  }

  getCinemas(city: CityId): Cinema[] {
    return this.activeCinemas.filter((c) => c.city === city);
  }

  getMovies(): Movie[] {
    return this.activeMovies;
  }

  getComingSoonMovies(): Movie[] {
    return this.activeComingSoon;
  }

  getSessionsForCity(city: CityId): ScreeningSession[] {
    return this.activeSessions.filter((s) => s.city === city);
  }

  getSessionsForCityAndDate(city: CityId, dateIso: string): ScreeningSession[] {
    return this.activeSessions.filter((s) => s.city === city && s.dateIso === dateIso);
  }

  getSessionById(sessionId: string): ScreeningSession | undefined {
    return this.sessionIndex.get(sessionId);
  }

  getSyncStatus(): LiveSyncStatus {
    return this.syncStatus;
  }

  private async loadCuratedFallback(): Promise<void> {
    if (this.activeSessions.length > 0 && this.activeMovies.length > 0) return;
    const mod = await import('../data/catalog');
    const curatedSessions = mod.generateCuratedSessions();
    this.activeCinemas = mod.CINEMAS;
    this.activeMovies = mod.MOVIES;
    this.activeComingSoon = mod.COMING_SOON_MOVIES;
    this.activeSessions = curatedSessions;
    this.sessionIndex = new Map(curatedSessions.map((s) => [s.id, s]));
  }

  async hydrateFromLiveBff(
    city: CityId = 'melbourne',
    forceRefresh = false
  ): Promise<LiveSyncStatus> {
    if (!forceRefresh && (this.fullStaticLoaded || this.loadedCities.has(city))) {
      return this.syncStatus;
    }

    const inflightKey = `${city}:${forceRefresh ? '1' : '0'}`;
    const existingPromise = this.inFlightByCity.get(inflightKey);
    if (existingPromise) return existingPromise;

    const task = this.performHydrate(city, forceRefresh).finally(() => {
      this.inFlightByCity.delete(inflightKey);
    });
    this.inFlightByCity.set(inflightKey, task);
    return task;
  }

  private async performHydrate(city: CityId, forceRefresh: boolean): Promise<LiveSyncStatus> {
    try {
      if (forceRefresh) {
        this.loadedCities.clear();
        this.fullStaticLoaded = false;
      }

      const isStaticOnlyBuild = import.meta.env.VITE_STATIC_ONLY === '1';
      let isFullStaticFallback = false;
      let response: Response | null = null;

      if (isStaticOnlyBuild) {
        response = await fetch(`./live_catalog_${encodeURIComponent(city)}.json`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }).catch(() => null);
      } else {
        response = await fetch(`/api/catalog?city=${encodeURIComponent(city)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }).catch(() => null);
      }

      const contentType = response?.headers.get('content-type') || '';
      if (!response || !response.ok || !contentType.includes('application/json')) {
        isFullStaticFallback = true;
        response = await fetch('./live_catalog.json', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }).catch(() => null);
      }
      if (!response || !response.ok) {
        await this.loadCuratedFallback();
        return this.syncStatus;
      }

      const payload = (await response.json()) as BffCatalogPayload;
      const configuredApis = {
        tmdb: Boolean(payload.configuredApis?.tmdb),
        omdb: Boolean(payload.configuredApis?.omdb),
        mdblist: Boolean(payload.configuredApis?.mdblist),
        serpapi: Boolean(payload.configuredApis?.serpapi),
      };

      if (
        payload.mode === 'live' &&
        Array.isArray(payload.movies) &&
        payload.movies.length > 0
      ) {
        if (isFullStaticFallback || payload.city === 'all' || !payload.city) {
          this.fullStaticLoaded = true;
          this.loadedCities.add('melbourne');
          this.loadedCities.add('sydney');
          this.loadedCities.add('shanghai');
          this.activeMovies = payload.movies;
          if (Array.isArray(payload.comingSoonMovies) && payload.comingSoonMovies.length > 0) {
            this.activeComingSoon = payload.comingSoonMovies;
          }
          if (Array.isArray(payload.cinemas) && payload.cinemas.length > 0) {
            this.activeCinemas = payload.cinemas;
          }
          if (payload.hasLiveSessions && Array.isArray(payload.sessions) && payload.sessions.length > 0) {
            this.activeSessions = payload.sessions;
          } else {
            await this.remapCuratedSessions();
          }
        } else {
          this.loadedCities.add(city);
          this.activeMovies = mergeById(this.activeMovies, payload.movies);
          if (Array.isArray(payload.comingSoonMovies)) {
            this.activeComingSoon = mergeById(this.activeComingSoon, payload.comingSoonMovies);
          }
          if (Array.isArray(payload.cinemas) && payload.cinemas.length > 0) {
            this.activeCinemas = mergeById(this.activeCinemas, payload.cinemas);
          }
          if (payload.hasLiveSessions && Array.isArray(payload.sessions) && payload.sessions.length > 0) {
            const otherCities = this.activeSessions.filter((s) => s.city !== city);
            this.activeSessions = [...otherCities, ...payload.sessions];
          } else {
            await this.remapCuratedSessions();
          }
        }

        this.sessionIndex = new Map(this.activeSessions.map((s) => [s.id, s]));
        this.syncStatus = {
          mode: 'live',
          syncedAtIso: payload.syncedAtIso ?? null,
          hasLiveSessions: Boolean(payload.hasLiveSessions),
          configuredApis,
        };
      } else {
        await this.loadCuratedFallback();
        this.syncStatus = {
          mode: 'curated',
          syncedAtIso: null,
          hasLiveSessions: false,
          configuredApis,
        };
      }
    } catch {
      await this.loadCuratedFallback();
    }
    return this.syncStatus;
  }

  private async remapCuratedSessions(): Promise<void> {
    const mod = await import('../data/catalog');
    const curatedSessions = mod.generateCuratedSessions();
    const oldIds = mod.MOVIES.map((m) => m.id);
    const idRemap = new Map<string, string>();
    oldIds.forEach((oldId, idx) => {
      const liveMovie = this.activeMovies[idx % this.activeMovies.length];
      if (liveMovie) idRemap.set(oldId, liveMovie.id);
    });
    this.activeSessions = curatedSessions.map((s) => ({
      ...s,
      movieId: idRemap.get(s.movieId) ?? this.activeMovies[0]?.id ?? s.movieId,
    }));
  }
}

export const cinemaDataService: CinemaDataProvider = new HybridAustralianCinemaProvider();
