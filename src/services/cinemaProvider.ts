import {
  buildSevenDayCalendar,
  CINEMAS,
  CITIES,
  COMING_SOON_MOVIES,
  generateCuratedSessions,
  MOVIES,
} from '../data/catalog';
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
  hydrateFromLiveBff(): Promise<LiveSyncStatus>;
}

interface BffCatalogPayload {
  mode?: 'curated' | 'live';
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

class HybridAustralianCinemaProvider implements CinemaDataProvider {
  private readonly curatedSessions: ScreeningSession[];
  private activeCinemas: Cinema[];
  private activeMovies: Movie[];
  private activeComingSoon: Movie[];
  private activeSessions: ScreeningSession[];
  private sessionIndex: Map<string, ScreeningSession>;
  private syncStatus: LiveSyncStatus;

  constructor() {
    this.curatedSessions = generateCuratedSessions();
    this.activeCinemas = CINEMAS;
    this.activeMovies = MOVIES;
    this.activeComingSoon = COMING_SOON_MOVIES;
    this.activeSessions = this.curatedSessions;
    this.sessionIndex = new Map(this.activeSessions.map((s) => [s.id, s]));
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

  async hydrateFromLiveBff(): Promise<LiveSyncStatus> {
    try {
      let response = await fetch('/api/catalog', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      const contentType = response?.headers.get('content-type') || '';
      if (!response || !response.ok || !contentType.includes('application/json')) {
        response = await fetch('./live_catalog.json', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }).catch(() => null);
      }
      if (!response || !response.ok) return this.syncStatus;

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
          // If user entered TMDB/OMDb keys first before SerpApi, map live TMDB films onto
          // curated Melbourne & Sydney timetable slots so sessions remain browsable immediately.
          const oldIds = MOVIES.map((m) => m.id);
          const idRemap = new Map<string, string>();
          oldIds.forEach((oldId, idx) => {
            const liveMovie = this.activeMovies[idx % this.activeMovies.length];
            if (liveMovie) idRemap.set(oldId, liveMovie.id);
          });
          this.activeSessions = this.curatedSessions.map((s) => ({
            ...s,
            movieId: idRemap.get(s.movieId) ?? this.activeMovies[0].id,
          }));
        }

        this.sessionIndex = new Map(this.activeSessions.map((s) => [s.id, s]));
        this.syncStatus = {
          mode: 'live',
          syncedAtIso: payload.syncedAtIso ?? null,
          hasLiveSessions: Boolean(payload.hasLiveSessions),
          configuredApis,
        };
      } else {
        this.syncStatus = {
          mode: 'curated',
          syncedAtIso: null,
          hasLiveSessions: false,
          configuredApis,
        };
      }
    } catch {
      // Offline or standalone static build — keep curated salon catalog cleanly
    }
    return this.syncStatus;
  }
}

export const cinemaDataService: CinemaDataProvider = new HybridAustralianCinemaProvider();
