import { useEffect, useMemo, useState } from 'react';
import { BookmarkCheck, Check, Link2 } from 'lucide-react';
import { cinemaDataService } from './services/cinemaProvider';
import type {
  AppLanguage,
  BrowseMode,
  Cinema,
  CityId,
  FilterState,
  FormatType,
  LiveSyncStatus,
  Movie,
  ReleaseStatus,
  ScreeningSession,
  ShortlistEntry,
  TimeOfDay,
} from './types/cinema';
import {
  buildShareableFilterQueryString,
  buildShareableFolioUrl,
  copyTextSafely,
  isAdminUrlFlagPresent,
  loadValidatedCity,
  loadValidatedEdition,
  loadValidatedFavoriteCinemas,
  loadValidatedLanguage,
  loadValidatedShortlist,
  loadValidatedWatchlist,
  parseValidatedFolioEntries,
  parseValidatedUrlFilters,
  saveCityPreference,
  saveEditionPreference,
  saveFavoriteCinemas,
  saveLanguagePreference,
  saveShortlist,
  saveWatchlist,
} from './utils/security';
import { getLocalCurrentMinutesFromMidnight } from './utils/formatters';
import { getDisplayMovieTitle, getUiText } from './utils/i18n';
import { evaluateSessionReachability } from './utils/planner';
import {
  getCinemaDistanceInfo,
  resolveHubOrigin,
  type UserLocationOrigin,
} from './utils/proximity';
import { HeaderBar, type SalonEdition } from './components/HeaderBar';
import { HeroEditorialBanner } from './components/HeroEditorialBanner';
import { SmartFilterDeck } from './components/SmartFilterDeck';
import {
  MovieBrowseView,
  type MovieWithVenueSessions,
} from './components/MovieBrowseView';
import {
  CinemaBrowseView,
  type CinemaWithMovieSessions,
} from './components/CinemaBrowseView';
import {
  ComingSoonView,
  type ComingSoonMovieItem,
} from './components/ComingSoonView';
import { SessionDetailModal } from './components/SessionDetailModal';
import { MovieRatingsModal } from './components/MovieRatingsModal';
import { TrailerModal } from './components/TrailerModal';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { ClosestCinemasSpotlight } from './components/ClosestCinemasSpotlight';
import {
  MyLocationModal,
  type GeocodedPlaceResult,
} from './components/MyLocationModal';
import {
  ShortlistDrawerModal,
  type HydratedShortlistItem,
} from './components/ShortlistDrawerModal';
import { CinemaMapView } from './components/CinemaMapView';

function matchesTimeOfDay(minutesFromMidnight: number, bucket: TimeOfDay): boolean {
  if (bucket === 'all') return true;
  if (bucket === 'morning') return minutesFromMidnight < 12 * 60;
  if (bucket === 'afternoon') {
    return minutesFromMidnight >= 12 * 60 && minutesFromMidnight < 17 * 60;
  }
  if (bucket === 'evening') {
    return minutesFromMidnight >= 17 * 60 && minutesFromMidnight < 20 * 60 + 30;
  }
  return minutesFromMidnight >= 20 * 60 + 30;
}

export function App() {
  const [filters, setFilters] = useState<FilterState>(() => {
    const urlPatch = parseValidatedUrlFilters(window.location.search);
    let resolvedCity: CityId = urlPatch.city ?? loadValidatedCity();
    if (urlPatch.selectedCinemaId) {
      const shaMatch =
        urlPatch.selectedCinemaId.startsWith('sha-') ||
        cinemaDataService
          .getCinemas('shanghai')
          .some((c) => c.id === urlPatch.selectedCinemaId);
      const sydMatch =
        urlPatch.selectedCinemaId.startsWith('syd-') ||
        cinemaDataService
          .getCinemas('sydney')
          .some((c) => c.id === urlPatch.selectedCinemaId);
      const melMatch =
        urlPatch.selectedCinemaId.startsWith('mel-') ||
        cinemaDataService
          .getCinemas('melbourne')
          .some((c) => c.id === urlPatch.selectedCinemaId);
      if (shaMatch) resolvedCity = 'shanghai';
      else if (sydMatch) resolvedCity = 'sydney';
      else if (melMatch) resolvedCity = 'melbourne';
    }
    if (urlPatch.city || urlPatch.selectedCinemaId) {
      saveCityPreference(resolvedCity);
    }
    const baseCalendar = cinemaDataService.getCalendarDays(resolvedCity);
    const validDate =
      urlPatch.dateIso && baseCalendar.some((d) => d.dateIso === urlPatch.dateIso)
        ? urlPatch.dateIso
        : baseCalendar[0]?.dateIso ?? '2026-11-14';

    return {
      city: resolvedCity,
      releaseStatus: urlPatch.releaseStatus ?? 'in_cinemas',
      browseMode: urlPatch.browseMode ?? 'movies',
      dateIso: validDate,
      selectedMovieId: urlPatch.selectedMovieId ?? 'all',
      selectedCinemaId: urlPatch.selectedCinemaId ?? 'all',
      chain: urlPatch.chain ?? 'all',
      favoritesOnly: false,
      suburb: urlPatch.suburb ?? 'all',
      timeOfDay: 'all',
      formats: [],
      vibe: 'all',
      genre: 'all',
      priceCap: 'all',
      minRating: 'all',
      finishBy: urlPatch.finishBy ?? 'all',
      nearHubId: urlPatch.nearHubId ?? 'cbd',
      dealsOnly: urlPatch.dealsOnly ?? false,
      makeItOnly: urlPatch.makeItOnly ?? false,
      showPastToday: false,
      searchQuery: urlPatch.searchQuery ?? '',
    };
  });

  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customPlace, setCustomPlace] = useState<GeocodedPlaceResult | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'active' | 'blocked'>('idle');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [shortlist, setShortlist] = useState<ShortlistEntry[]>(() => {
    const sharedEntries = parseValidatedFolioEntries(window.location.search);
    if (sharedEntries.length > 0) {
      const seeded = sharedEntries.map((entry, idx) => ({
        sessionId: entry.sessionId,
        votes: entry.votes,
        addedAtMs: Date.now() + idx,
      }));
      saveShortlist(seeded);
      return seeded;
    }
    return loadValidatedShortlist();
  });
  const [watchlist, setWatchlist] = useState<string[]>(() => loadValidatedWatchlist());
  const [favoriteCinemas, setFavoriteCinemas] = useState<string[]>(() =>
    loadValidatedFavoriteCinemas()
  );
  const [edition, setEdition] = useState<SalonEdition>(() => loadValidatedEdition());
  const [lang, setLang] = useState<AppLanguage>(() => loadValidatedLanguage(window.location.search));
  const [selectedSession, setSelectedSession] = useState<ScreeningSession | null>(null);
  const [inspectedRatingsMovie, setInspectedRatingsMovie] = useState<Movie | null>(null);
  const [trailerMovie, setTrailerMovie] = useState<Movie | null>(null);
  const [isShortlistOpen, setIsShortlistOpen] = useState<boolean>(
    () => parseValidatedFolioEntries(window.location.search).length > 0
  );
  const [dockLinkCopied, setDockLinkCopied] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isAdminMode] = useState<boolean>(() => isAdminUrlFlagPresent(window.location.search));
  const [syncStatus, setSyncStatus] = useState<LiveSyncStatus>(() =>
    cinemaDataService.getSyncStatus()
  );
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    // Purely local minute clock tick so Today's 15-minute past-session grace window stays accurate
    // with zero network requests or page reloads.
    const timer = window.setInterval(() => setClockTick((t) => t + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.edition = edition;
  }, [edition]);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    cinemaDataService.hydrateFromLiveBff().then((status) => {
      if (!cancelled) {
        setSyncStatus(status);
        if (status.mode === 'live') {
          setCatalogRevision((r) => r + 1);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReloadLiveCatalog = async () => {
    const status = await cinemaDataService.hydrateFromLiveBff();
    setSyncStatus(status);
    setCatalogRevision((r) => r + 1);
  };

  const handleToggleEdition = () => {
    setEdition((prev) => {
      const next: SalonEdition = prev === 'noir' ? 'ivoire' : 'noir';
      saveEditionPreference(next);
      return next;
    });
  };

  const handleToggleLanguage = () => {
    setLang((prev) => {
      const next: AppLanguage = prev === 'en' ? 'zh' : 'en';
      saveLanguagePreference(next);
      return next;
    });
  };

  const cityMeta = cinemaDataService.getCityMeta(filters.city);
  const calendarDays = useMemo(
    () => cinemaDataService.getCalendarDays(filters.city),
    [filters.city]
  );
  const todayDateIso = calendarDays[0]?.dateIso ?? '';
  const isTodaySelected =
    filters.releaseStatus === 'in_cinemas' && filters.dateIso === todayDateIso;
  const localNowMinutes = useMemo(() => {
    void clockTick;
    return getLocalCurrentMinutesFromMidnight(cityMeta.timeZone);
  }, [cityMeta.timeZone, clockTick]);

  // Keep browser URL query string in sync with active filters for 1-click sharing (zero page reload).
  useEffect(() => {
    const defaultToday = calendarDays[0]?.dateIso ?? filters.dateIso;
    const activeFolioItems =
      isShortlistOpen && shortlist.length > 0
        ? shortlist.map((s) => ({ sessionId: s.sessionId, votes: s.votes }))
        : undefined;
    const qs = buildShareableFilterQueryString(
      filters,
      defaultToday,
      isAdminMode,
      activeFolioItems,
      lang
    );
    const nextRelativeUrl = `${window.location.pathname}${qs}${window.location.hash}`;
    const currentRelativeUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextRelativeUrl !== currentRelativeUrl) {
      window.history.replaceState(null, '', nextRelativeUrl);
    }
  }, [filters, calendarDays, isAdminMode, isShortlistOpen, shortlist, lang]);
  const cityCinemas = useMemo(
    () => {
      void catalogRevision;
      return cinemaDataService.getCinemas(filters.city);
    },
    [filters.city, catalogRevision]
  );
  const allMovies = useMemo(() => {
    void catalogRevision;
    return cinemaDataService.getMovies();
  }, [catalogRevision]);
  const comingSoonMovies = useMemo(() => {
    void catalogRevision;
    return cinemaDataService.getComingSoonMovies();
  }, [catalogRevision]);

  const movieMap = useMemo(
    () =>
      new Map<string, Movie>([
        ...allMovies.map((m): [string, Movie] => [m.id, m]),
        ...comingSoonMovies.map((m): [string, Movie] => [m.id, m]),
      ]),
    [allMovies, comingSoonMovies]
  );
  const allCinemasMap = useMemo(() => {
    void catalogRevision;
    const all = [
      ...cinemaDataService.getCinemas('melbourne'),
      ...cinemaDataService.getCinemas('sydney'),
      ...cinemaDataService.getCinemas('shanghai'),
    ];
    return new Map<string, Cinema>(all.map((c) => [c.id, c]));
  }, [catalogRevision]);

  const favoriteCinemaIds = useMemo(() => new Set(favoriteCinemas), [favoriteCinemas]);

  const chains = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cityCinemas) {
      counts.set(c.chain, (counts.get(c.chain) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([chain, count]) => ({ chain, count }))
      .sort((a, b) => b.count - a.count || a.chain.localeCompare(b.chain));
  }, [cityCinemas]);

  const cityFavoriteCount = useMemo(
    () => cityCinemas.filter((c) => favoriteCinemaIds.has(c.id)).length,
    [cityCinemas, favoriteCinemaIds]
  );

  const userOrigin = useMemo<UserLocationOrigin>(() => {
    if (filters.nearHubId === 'gps' && gpsCoords) {
      return {
        id: 'gps',
        label: 'My Live GPS Location',
        shortLabel: 'your GPS',
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        isCustomOrigin: true,
      };
    }
    if (filters.nearHubId === 'custom' && customPlace && customPlace.city === filters.city) {
      return {
        id: 'custom',
        label: customPlace.label,
        shortLabel: customPlace.shortLabel,
        lat: customPlace.lat,
        lng: customPlace.lng,
        isCustomOrigin: true,
      };
    }
    return resolveHubOrigin(filters.city, filters.nearHubId);
  }, [filters.city, filters.nearHubId, gpsCoords, customPlace]);

  const handleSelectNearHub = (hubId: string) => {
    if (hubId !== 'gps') {
      setGpsStatus('idle');
    }
    setFilters((prev) => ({ ...prev, nearHubId: hubId }));
  };

  const handleApplyCustomCoordinates = (
    place: GeocodedPlaceResult,
    sourceId: 'gps' | 'custom'
  ) => {
    if (sourceId === 'gps') {
      setGpsCoords({ lat: place.lat, lng: place.lng });
      setGpsStatus('active');
    } else {
      setCustomPlace(place);
      setGpsStatus('idle');
    }

    if (place.city !== filters.city) {
      saveCityPreference(place.city);
      const nextCalendar = cinemaDataService.getCalendarDays(place.city);
      const sameDateExists = nextCalendar.some((d) => d.dateIso === filters.dateIso);
      setFilters((prev) => ({
        ...prev,
        city: place.city,
        selectedMovieId: 'all',
        selectedCinemaId: 'all',
        chain: 'all',
        suburb: 'all',
        nearHubId: sourceId,
        dateIso: sameDateExists ? prev.dateIso : nextCalendar[0]?.dateIso ?? prev.dateIso,
      }));
    } else {
      setFilters((prev) => ({ ...prev, nearHubId: sourceId }));
    }
  };

  const handleOpenLocationModal = () => {
    setIsLocationModalOpen(true);
  };

  const cinemaOptions = useMemo(
    () =>
      [...cityCinemas]
        .map((c) => ({
          id: c.id,
          name: c.name,
          suburb: c.suburb,
          chain: c.chain,
          distanceKm: getCinemaDistanceInfo(c, userOrigin).km,
          isFavorite: favoriteCinemaIds.has(c.id),
        }))
        .sort((a, b) => {
          const aFav = a.isFavorite ? 1 : 0;
          const bFav = b.isFavorite ? 1 : 0;
          if (bFav !== aFav) return bFav - aFav;
          if (userOrigin.isCustomOrigin) {
            return a.distanceKm - b.distanceKm || a.name.localeCompare(b.name);
          }
          return a.name.localeCompare(b.name);
        }),
    [cityCinemas, favoriteCinemaIds, userOrigin]
  );

  const citySessionsAllDays = useMemo(() => {
    void catalogRevision;
    return cinemaDataService.getSessionsForCity(filters.city);
  }, [filters.city, catalogRevision]);

  const movieOptions = useMemo(() => {
    const formatDropdownTitle = (m: Movie) =>
      filters.city === 'shanghai' &&
      m.ratings.douban.chineseTitle &&
      m.ratings.douban.chineseTitle !== m.title
        ? `${m.title} · ${m.ratings.douban.chineseTitle}`
        : m.title;

    if (filters.releaseStatus === 'coming_soon') {
      const cityCs = comingSoonMovies.filter((m) =>
        (m.upcomingVenues ?? []).some((v) => v.city === filters.city)
      );
      return [...cityCs]
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((m) => ({ id: m.id, title: formatDropdownTitle(m) }));
    }
    const cityMovieIds = new Set(citySessionsAllDays.map((s) => s.movieId));
    return allMovies
      .filter((m) => cityMovieIds.has(m.id))
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((m) => ({ id: m.id, title: formatDropdownTitle(m) }));
  }, [filters.releaseStatus, filters.city, allMovies, comingSoonMovies, citySessionsAllDays]);

  const suburbs = useMemo(() => {
    const unique = Array.from(new Set(cityCinemas.map((c) => c.suburb)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [cityCinemas]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const m of [...allMovies, ...comingSoonMovies]) {
      for (const g of m.genres) set.add(g);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allMovies, comingSoonMovies]);

  const featuredMovies = useMemo(() => {
    if (citySessionsAllDays.length > 0) {
      const counts = new Map<string, number>();
      for (const s of citySessionsAllDays) {
        counts.set(s.movieId, (counts.get(s.movieId) ?? 0) + 1);
      }
      const topCityMovies = [...allMovies]
        .filter((m) => (counts.get(m.id) ?? 0) > 0)
        .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
        .slice(0, 3);
      if (topCityMovies.length > 0) return topCityMovies;
    }
    return allMovies.filter((m) => m.isFeaturedMarquee);
  }, [allMovies, citySessionsAllDays]);

  const handleResetHome = () => {
    const freshCal = cinemaDataService.getCalendarDays(filters.city);
    setFilters((prev) => ({
      ...prev,
      releaseStatus: 'in_cinemas',
      browseMode: 'movies',
      dateIso: freshCal[0]?.dateIso ?? prev.dateIso,
      selectedMovieId: 'all',
      selectedCinemaId: 'all',
      chain: 'all',
      favoritesOnly: false,
      suburb: 'all',
      timeOfDay: 'all',
      formats: [],
      vibe: 'all',
      genre: 'all',
      priceCap: 'all',
      minRating: 'all',
      finishBy: 'all',
      nearHubId: 'cbd',
      dealsOnly: false,
      showPastToday: false,
      searchQuery: '',
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFocusFeaturedMovie = (title: string) => {
    setFilters((prev) => ({
      ...prev,
      releaseStatus: 'in_cinemas',
      browseMode: 'movies',
      selectedMovieId: 'all',
      selectedCinemaId: 'all',
      chain: 'all',
      favoritesOnly: false,
      suburb: 'all',
      timeOfDay: 'all',
      formats: [],
      vibe: 'all',
      genre: 'all',
      priceCap: 'all',
      minRating: 'all',
      finishBy: 'all',
      dealsOnly: false,
      showPastToday: false,
      searchQuery: title,
    }));
  };
  const handleChangeCity = (nextCity: CityId) => {
    saveCityPreference(nextCity);
    setGpsStatus('idle');
    const nextCalendar = cinemaDataService.getCalendarDays(nextCity);
    const nextCinemas = cinemaDataService.getCinemas(nextCity);
    const nextCitySessions = cinemaDataService.getSessionsForCity(nextCity);
    const sameDateExists = nextCalendar.some((d) => d.dateIso === filters.dateIso);
    const sameChainExists = nextCinemas.some((c) => c.chain === filters.chain);
    const sameMovieExists =
      filters.selectedMovieId === 'all' ||
      filters.releaseStatus === 'coming_soon' ||
      nextCitySessions.some((s) => s.movieId === filters.selectedMovieId);
    setFilters((prev) => ({
      ...prev,
      city: nextCity,
      selectedMovieId: sameMovieExists ? prev.selectedMovieId : 'all',
      selectedCinemaId: 'all',
      chain: sameChainExists ? prev.chain : 'all',
      suburb: 'all',
      nearHubId: 'cbd',
      dateIso: sameDateExists ? prev.dateIso : nextCalendar[0]?.dateIso ?? prev.dateIso,
    }));
  };

  const handleChangeBrowseMode = (mode: BrowseMode) => {
    setFilters((prev) => ({ ...prev, browseMode: mode }));
  };

  const handleChangeReleaseStatus = (status: ReleaseStatus) => {
    setFilters((prev) => ({
      ...prev,
      releaseStatus: status,
      selectedMovieId: prev.releaseStatus === status ? prev.selectedMovieId : 'all',
    }));
  };

  const handleToggleWatchlist = (movieId: string) => {
    setWatchlist((prev) => {
      const exists = prev.includes(movieId);
      const next = exists ? prev.filter((id) => id !== movieId) : [...prev, movieId];
      saveWatchlist(next);
      return next;
    });
  };

  const handleToggleFavoriteCinema = (cinemaId: string) => {
    setFavoriteCinemas((prev) => {
      const exists = prev.includes(cinemaId);
      const next = exists ? prev.filter((id) => id !== cinemaId) : [...prev, cinemaId];
      saveFavoriteCinemas(next);
      return next;
    });
  };

  const handleUpdateFilters = (patch: Partial<FilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      // If user explicitly picks a specific cinema from the dropdown, relax incompatible chain/suburb/vibe filters
      if (patch.selectedCinemaId && patch.selectedCinemaId !== 'all') {
        const pickedCinema = allCinemasMap.get(patch.selectedCinemaId);
        if (pickedCinema) {
          if (next.chain !== 'all' && next.chain !== pickedCinema.chain) next.chain = 'all';
          if (next.suburb !== 'all' && next.suburb !== pickedCinema.suburb) next.suburb = 'all';
          if (next.vibe !== 'all' && next.vibe !== pickedCinema.vibe) next.vibe = 'all';
          if (next.favoritesOnly && !favoriteCinemaIds.has(pickedCinema.id)) {
            next.favoritesOnly = false;
          }
        }
      }

      // If user picks a specific Film or Cinema that has 0 sessions on the active day,
      // auto-jump to the earliest day in the 7-day strip where it IS screening!
      if (
        next.releaseStatus === 'in_cinemas' &&
        ((patch.selectedMovieId && patch.selectedMovieId !== 'all') ||
          (patch.selectedCinemaId && patch.selectedCinemaId !== 'all'))
      ) {
        const matchesSelection = (s: ScreeningSession, dIso: string) =>
          (next.selectedMovieId === 'all' || s.movieId === next.selectedMovieId) &&
          (next.selectedCinemaId === 'all' || s.cinemaId === next.selectedCinemaId) &&
          (dIso !== todayDateIso ||
            next.showPastToday ||
            s.startMinutesFromMidnight + 15 >= localNowMinutes);

        const hasOnCurrentDate = citySessionsAllDays.some(
          (s) => s.dateIso === next.dateIso && matchesSelection(s, next.dateIso)
        );
        if (!hasOnCurrentDate) {
          const nextAvailableDay = calendarDays.find((d) =>
            citySessionsAllDays.some((s) => s.dateIso === d.dateIso && matchesSelection(s, d.dateIso))
          );
          if (nextAvailableDay) {
            next.dateIso = nextAvailableDay.dateIso;
          }
        }
      }
      return next;
    });
  };

  const handleToggleFormat = (format: FormatType) => {
    setFilters((prev) => {
      const exists = prev.formats.includes(format);
      return {
        ...prev,
        formats: exists
          ? prev.formats.filter((f) => f !== format)
          : [...prev.formats, format],
      };
    });
  };

  const handleResetFilters = () => {
    setGpsStatus('idle');
    setFilters((prev) => ({
      ...prev,
      selectedMovieId: 'all',
      selectedCinemaId: 'all',
      chain: 'all',
      favoritesOnly: false,
      suburb: 'all',
      timeOfDay: 'all',
      formats: [],
      vibe: 'all',
      genre: 'all',
      priceCap: 'all',
      minRating: 'all',
      finishBy: 'all',
      nearHubId: 'cbd',
      dealsOnly: false,
      makeItOnly: false,
      showPastToday: false,
      searchQuery: '',
    }));
  };

  const cheapTuesdayDay = useMemo(
    () => calendarDays.find((d) => d.isCheapTuesday),
    [calendarDays]
  );

  const handleJumpToCheapTuesday = () => {
    if (!cheapTuesdayDay) return;
    setFilters((prev) => ({
      ...prev,
      dateIso: cheapTuesdayDay.dateIso,
      dealsOnly: true,
    }));
  };

  const spotlightDaySessions = useMemo(() => {
    void catalogRevision;
    const raw = cinemaDataService.getSessionsForCityAndDate(filters.city, filters.dateIso);
    if (!isTodaySelected || filters.showPastToday) return raw;
    return raw.filter((s) => s.startMinutesFromMidnight + 15 >= localNowMinutes);
  }, [
    filters.city,
    filters.dateIso,
    filters.showPastToday,
    isTodaySelected,
    localNowMinutes,
    catalogRevision,
  ]);

  // Core filtering pipeline across sessions, movies, and cinemas
  const { filteredSessions, hiddenPastTodayCount } = useMemo(() => {
    void catalogRevision;
    const daySessions = cinemaDataService.getSessionsForCityAndDate(
      filters.city,
      filters.dateIso
    );
    const query = filters.searchQuery.trim().toLowerCase();

    const baseMatched = daySessions.filter((session) => {
      const cinema = allCinemasMap.get(session.cinemaId);
      const movie = movieMap.get(session.movieId);
      if (!cinema || !movie) return false;

      if (filters.selectedMovieId !== 'all' && movie.id !== filters.selectedMovieId) return false;
      if (filters.selectedCinemaId !== 'all' && cinema.id !== filters.selectedCinemaId) {
        return false;
      }
      if (filters.chain !== 'all' && cinema.chain !== filters.chain) return false;
      if (filters.favoritesOnly && !favoriteCinemaIds.has(cinema.id)) return false;
      if (filters.suburb !== 'all' && cinema.suburb !== filters.suburb) return false;
      if (filters.vibe !== 'all' && cinema.vibe !== filters.vibe) return false;
      if (filters.genre !== 'all' && !movie.genres.includes(filters.genre)) return false;
      if (filters.formats.length > 0) {
        const matchesFormat = filters.formats.some((fmt) => {
          if (session.format === fmt) return true;
          if (
            fmt === '35mm / 70mm' &&
            session.accessibilityTags.some((tag) => /35mm|70mm/i.test(tag))
          ) {
            return true;
          }
          return false;
        });
        if (!matchesFormat) return false;
      }
      if (!matchesTimeOfDay(session.startMinutesFromMidnight, filters.timeOfDay)) {
        return false;
      }
      const lowCap = filters.city === 'shanghai' ? 50.0 : 18.0;
      const midCap = filters.city === 'shanghai' ? 80.0 : 25.0;
      if (filters.priceCap === 'under18' && session.priceAud > lowCap) return false;
      if (filters.priceCap === 'under25' && session.priceAud > midCap) return false;
      if (filters.finishBy !== 'all') {
        const hh = Number.parseInt(filters.finishBy.slice(0, 2), 10);
        const mm = Number.parseInt(filters.finishBy.slice(2, 4), 10);
        const cutoffMinutes = hh * 60 + mm;
        const estFinish = session.startMinutesFromMidnight + movie.runtimeMinutes + 15;
        if (estFinish > cutoffMinutes) return false;
      }
      if (filters.minRating === 'imdb8' && (movie.ratings.imdb.score ?? 0) < 8.0) return false;
      if (
        filters.minRating === 'rt90' &&
        (movie.ratings.rottenTomatoes.tomatometerPercent ?? 0) < 90
      ) {
        return false;
      }
      if (filters.minRating === 'douban8' && (movie.ratings.douban.score ?? 0) < 8.0) {
        return false;
      }
      if (filters.dealsOnly && !session.isDealSession) return false;
      if (isTodaySelected && filters.makeItOnly) {
        const distKm = getCinemaDistanceInfo(cinema, userOrigin).km;
        const reach = evaluateSessionReachability(
          distKm,
          filters.city,
          session.startMinutesFromMidnight,
          localNowMinutes
        );
        if (!reach.canMakeIt) return false;
      }

      if (query.length > 0) {
        const searchable = [
          movie.title,
          movie.ratings.douban.chineseTitle,
          movie.director,
          ...movie.castLead,
          ...movie.genres,
          ...session.accessibilityTags,
          cinema.name,
          cinema.chain,
          cinema.suburb,
          cinema.vibe,
          session.format,
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      return true;
    });

    if (!isTodaySelected) {
      return { filteredSessions: baseMatched, hiddenPastTodayCount: 0 };
    }

    // Auto-hide sessions on Today that started more than 15 minutes ago (trailer grace window)
    const isPastGraceWindow = (s: ScreeningSession) =>
      s.startMinutesFromMidnight + 15 < localNowMinutes;
    const pastCount = baseMatched.filter(isPastGraceWindow).length;

    if (filters.showPastToday || filters.makeItOnly) {
      return {
        filteredSessions: filters.makeItOnly
          ? baseMatched
          : baseMatched,
        hiddenPastTodayCount: filters.makeItOnly ? 0 : pastCount,
      };
    }

    return {
      filteredSessions: baseMatched.filter((s) => !isPastGraceWindow(s)),
      hiddenPastTodayCount: pastCount,
    };
  }, [
    filters,
    allCinemasMap,
    movieMap,
    favoriteCinemaIds,
    userOrigin,
    catalogRevision,
    isTodaySelected,
    localNowMinutes,
  ]);

  // Group into Movie-first structure
  const movieBrowseItems = useMemo<MovieWithVenueSessions[]>(() => {
    const byMovie = new Map<string, Map<string, ScreeningSession[]>>();
    for (const s of filteredSessions) {
      let venueMap = byMovie.get(s.movieId);
      if (!venueMap) {
        venueMap = new Map<string, ScreeningSession[]>();
        byMovie.set(s.movieId, venueMap);
      }
      const list = venueMap.get(s.cinemaId) ?? [];
      list.push(s);
      venueMap.set(s.cinemaId, list);
    }

    const result: MovieWithVenueSessions[] = [];
    for (const [movieId, venueMap] of byMovie.entries()) {
      const movie = movieMap.get(movieId);
      if (!movie) continue;
      const venues: MovieWithVenueSessions['venues'] = [];
      let totalSessions = 0;

      for (const [cinemaId, sessions] of venueMap.entries()) {
        const cinema = allCinemasMap.get(cinemaId);
        if (!cinema) continue;
        venues.push({ cinema, sessions });
        totalSessions += sessions.length;
      }

      venues.sort((a, b) => {
        const aFav = favoriteCinemaIds.has(a.cinema.id) ? 1 : 0;
        const bFav = favoriteCinemaIds.has(b.cinema.id) ? 1 : 0;
        if (bFav !== aFav) return bFav - aFav;
        return (
          getCinemaDistanceInfo(a.cinema, userOrigin).km -
          getCinemaDistanceInfo(b.cinema, userOrigin).km
        );
      });
      result.push({ movie, venues, totalSessions });
    }
    return result;
  }, [filteredSessions, movieMap, allCinemasMap, favoriteCinemaIds, userOrigin]);

  // Group into Cinema-first structure
  const cinemaBrowseItems = useMemo<CinemaWithMovieSessions[]>(() => {
    const byCinema = new Map<string, Map<string, ScreeningSession[]>>();
    for (const s of filteredSessions) {
      let filmMap = byCinema.get(s.cinemaId);
      if (!filmMap) {
        filmMap = new Map<string, ScreeningSession[]>();
        byCinema.set(s.cinemaId, filmMap);
      }
      const list = filmMap.get(s.movieId) ?? [];
      list.push(s);
      filmMap.set(s.movieId, list);
    }

    const result: CinemaWithMovieSessions[] = [];
    for (const [cinemaId, filmMap] of byCinema.entries()) {
      const cinema = allCinemasMap.get(cinemaId);
      if (!cinema) continue;
      const movies: CinemaWithMovieSessions['movies'] = [];
      let totalSessions = 0;

      for (const [movieId, sessions] of filmMap.entries()) {
        const movie = movieMap.get(movieId);
        if (!movie) continue;
        movies.push({ movie, sessions });
        totalSessions += sessions.length;
      }

      movies.sort((a, b) => b.movie.criticScorePercent - a.movie.criticScorePercent);
      result.push({ cinema, movies, totalSessions });
    }
    return result;
  }, [filteredSessions, allCinemasMap, movieMap]);

  // Coming Soon filtered items for the active city
  const comingSoonItems = useMemo<ComingSoonMovieItem[]>(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    const results: ComingSoonMovieItem[] = [];

    for (const movie of comingSoonMovies) {
      if (filters.selectedMovieId !== 'all' && movie.id !== filters.selectedMovieId) continue;
      if (filters.genre !== 'all' && !movie.genres.includes(filters.genre)) continue;
      if (filters.minRating === 'imdb8' && (movie.ratings.imdb.score ?? 0) < 8.0) continue;
      if (
        filters.minRating === 'rt90' &&
        (movie.ratings.rottenTomatoes.tomatometerPercent ?? 0) < 90
      ) {
        continue;
      }
      if (filters.minRating === 'douban8' && (movie.ratings.douban.score ?? 0) < 8.0) continue;

      const rawPreviews = (movie.upcomingVenues ?? []).filter((v) => v.city === filters.city);
      const matchingVenues: ComingSoonMovieItem['cityVenues'] = [];

      for (const preview of rawPreviews) {
        const cinema = allCinemasMap.get(preview.cinemaId);
        if (!cinema) continue;
        if (filters.selectedCinemaId !== 'all' && cinema.id !== filters.selectedCinemaId) continue;
        if (filters.chain !== 'all' && cinema.chain !== filters.chain) continue;
        if (filters.favoritesOnly && !favoriteCinemaIds.has(cinema.id)) continue;
        if (filters.suburb !== 'all' && cinema.suburb !== filters.suburb) continue;
        if (filters.vibe !== 'all' && cinema.vibe !== filters.vibe) continue;
        if (filters.formats.length > 0 && !filters.formats.includes(preview.format)) continue;

        if (query.length > 0) {
          const searchable = [
            movie.title,
            movie.ratings.douban.chineseTitle,
            movie.director,
            ...movie.castLead,
            ...movie.genres,
            cinema.name,
            cinema.chain,
            cinema.suburb,
            preview.format,
            preview.previewNote,
          ]
            .join(' ')
            .toLowerCase();
          if (!searchable.includes(query)) continue;
        }

        matchingVenues.push({ cinema, preview });
      }

      if (matchingVenues.length > 0) {
        matchingVenues.sort((a, b) => {
          const aFav = favoriteCinemaIds.has(a.cinema.id) ? 1 : 0;
          const bFav = favoriteCinemaIds.has(b.cinema.id) ? 1 : 0;
          if (bFav !== aFav) return bFav - aFav;
          return (
            getCinemaDistanceInfo(a.cinema, userOrigin).km -
            getCinemaDistanceInfo(b.cinema, userOrigin).km
          );
        });
        results.push({ movie, cityVenues: matchingVenues });
      }
    }

    return results;
  }, [comingSoonMovies, filters, allCinemasMap, favoriteCinemaIds, userOrigin]);

  const watchlistedIds = useMemo(() => new Set(watchlist), [watchlist]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedMovieId !== 'all') count++;
    if (filters.selectedCinemaId !== 'all') count++;
    if (filters.chain !== 'all') count++;
    if (filters.favoritesOnly) count++;
    if (filters.suburb !== 'all') count++;
    if (filters.releaseStatus === 'in_cinemas' && filters.timeOfDay !== 'all') count++;
    if (filters.formats.length > 0) count += filters.formats.length;
    if (filters.vibe !== 'all') count++;
    if (filters.genre !== 'all') count++;
    if (filters.releaseStatus === 'in_cinemas' && filters.priceCap !== 'all') count++;
    if (filters.releaseStatus === 'in_cinemas' && filters.finishBy !== 'all') count++;
    if (filters.nearHubId !== 'cbd') count++;
    if (filters.minRating !== 'all') count++;
    if (filters.releaseStatus === 'in_cinemas' && filters.dealsOnly) count++;
    if (filters.releaseStatus === 'in_cinemas' && filters.makeItOnly) count++;
    if (filters.searchQuery.trim().length > 0) count++;
    return count;
  }, [filters]);

  // Shortlist management
  const shortlistedIds = useMemo(
    () => new Set(shortlist.map((e) => e.sessionId)),
    [shortlist]
  );

  const handleToggleShortlist = (sessionId: string) => {
    setShortlist((prev) => {
      const exists = prev.some((e) => e.sessionId === sessionId);
      const next = exists
        ? prev.filter((e) => e.sessionId !== sessionId)
        : [...prev.slice(-5), { sessionId, votes: 1, addedAtMs: Date.now() }];
      saveShortlist(next);
      return next;
    });
  };

  const handlePinPairToShortlist = (sessionIds: string[]) => {
    setShortlist((prev) => {
      const next = [...prev];
      const existing = new Set(next.map((e) => e.sessionId));
      const now = Date.now();
      sessionIds.forEach((sid, idx) => {
        if (!existing.has(sid)) {
          existing.add(sid);
          next.push({ sessionId: sid, votes: 1, addedAtMs: now + idx });
        }
      });
      const sliced = next.slice(-6);
      saveShortlist(sliced);
      return sliced;
    });
  };

  const handleVoteShortlist = (sessionId: string) => {
    setShortlist((prev) => {
      const next = prev.map((e) =>
        e.sessionId === sessionId ? { ...e, votes: e.votes + 1 } : e
      );
      saveShortlist(next);
      return next;
    });
  };

  const handleClearShortlist = () => {
    saveShortlist([]);
    setShortlist([]);
  };

  const hydratedShortlist = useMemo<HydratedShortlistItem[]>(() => {
    void catalogRevision;
    const items: HydratedShortlistItem[] = [];
    for (const entry of shortlist) {
      const session = cinemaDataService.getSessionById(entry.sessionId);
      if (!session) continue;
      const movie = movieMap.get(session.movieId);
      const cinema = allCinemasMap.get(session.cinemaId);
      if (!movie || !cinema) continue;
      items.push({ entry, session, movie, cinema });
    }
    return items;
  }, [shortlist, movieMap, allCinemasMap, catalogRevision]);

  const selectedModalMovie = selectedSession
    ? movieMap.get(selectedSession.movieId) ?? null
    : null;
  const selectedModalCinema = selectedSession
    ? allCinemasMap.get(selectedSession.cinemaId) ?? null
    : null;
  const modalSameDaySessions = useMemo(() => {
    void catalogRevision;
    if (!selectedSession) return [];
    return cinemaDataService.getSessionsForCityAndDate(
      selectedSession.city,
      selectedSession.dateIso
    );
  }, [selectedSession, catalogRevision]);

  const t = getUiText(lang);

  return (
    <div className="app-shell">
      <HeaderBar
        city={filters.city}
        lang={lang}
        userOrigin={userOrigin}
        releaseStatus={filters.releaseStatus}
        browseMode={filters.browseMode}
        edition={edition}
        showAdminApiButton={isAdminMode}
        isLiveMode={syncStatus.mode === 'live'}
        shortlistCount={hydratedShortlist.length}
        matchingSessionCount={filteredSessions.length}
        comingSoonCount={comingSoonItems.length}
        onChangeCity={handleChangeCity}
        onToggleLanguage={handleToggleLanguage}
        onChangeReleaseStatus={handleChangeReleaseStatus}
        onChangeBrowseMode={handleChangeBrowseMode}
        onOpenLocationModal={handleOpenLocationModal}
        onToggleEdition={handleToggleEdition}
        onOpenApiSettings={() => setIsApiSettingsOpen(true)}
        onOpenShortlist={() => setIsShortlistOpen(true)}
        onResetHome={handleResetHome}
      />

      <main className="main-container">
        <HeroEditorialBanner
          cityMeta={cityMeta}
          lang={lang}
          userOrigin={userOrigin}
          featuredMovies={featuredMovies}
          activeSearchQuery={filters.searchQuery}
          onFocusMovieTitle={handleFocusFeaturedMovie}
          onOpenLocationModal={handleOpenLocationModal}
        />

        <SmartFilterDeck
          cityMeta={cityMeta}
          lang={lang}
          calendarDays={calendarDays}
          movieOptions={movieOptions}
          cinemaOptions={cinemaOptions}
          chains={chains}
          cityFavoriteCount={cityFavoriteCount}
          suburbs={suburbs}
          genres={genres}
          filters={filters}
          userOrigin={userOrigin}
          gpsStatus={gpsStatus}
          activeFilterCount={activeFilterCount}
          isTodaySelected={isTodaySelected}
          hiddenPastTodayCount={hiddenPastTodayCount}
          inCinemasFilmCount={movieBrowseItems.length}
          comingSoonFilmCount={comingSoonItems.length}
          onUpdateFilters={handleUpdateFilters}
          onSelectNearHub={handleSelectNearHub}
          onRequestGps={handleOpenLocationModal}
          onChangeReleaseStatus={handleChangeReleaseStatus}
          onToggleFormat={handleToggleFormat}
          onResetFilters={handleResetFilters}
        />

        <ClosestCinemasSpotlight
          cinemas={cityCinemas}
          sessions={spotlightDaySessions}
          movieMap={movieMap}
          userOrigin={userOrigin}
          selectedCinemaId={filters.selectedCinemaId}
          onSelectCinemaFilter={(cid) => handleUpdateFilters({ selectedCinemaId: cid })}
          onOpenLocationModal={handleOpenLocationModal}
          onClearLocation={() => handleSelectNearHub('cbd')}
        />

        {filters.releaseStatus === 'coming_soon' ? (
          <ComingSoonView
            items={comingSoonItems}
            cityMeta={cityMeta}
            userOrigin={userOrigin}
            browseMode={filters.browseMode}
            watchlistedIds={watchlistedIds}
            favoriteCinemaIds={favoriteCinemaIds}
            onToggleWatchlist={handleToggleWatchlist}
            onToggleFavoriteCinema={handleToggleFavoriteCinema}
            onInspectRatings={setInspectedRatingsMovie}
            onWatchTrailer={setTrailerMovie}
            onResetFilters={handleResetFilters}
          />
        ) : filters.browseMode === 'movies' ? (
          <MovieBrowseView
            items={movieBrowseItems}
            isShanghai={filters.city === 'shanghai'}
            lang={lang}
            userOrigin={userOrigin}
            shortlistedIds={shortlistedIds}
            favoriteCinemaIds={favoriteCinemaIds}
            favoritesOnlyActive={filters.favoritesOnly}
            hiddenPastTodayCount={hiddenPastTodayCount}
            cheapTuesdayIso={cheapTuesdayDay?.dateIso}
            onSelectSession={setSelectedSession}
            onToggleShortlist={handleToggleShortlist}
            onToggleFavoriteCinema={handleToggleFavoriteCinema}
            onInspectRatings={setInspectedRatingsMovie}
            onWatchTrailer={setTrailerMovie}
            onShowPastToday={() => handleUpdateFilters({ showPastToday: true })}
            onJumpToCheapTuesday={handleJumpToCheapTuesday}
            onResetFilters={handleResetFilters}
          />
        ) : filters.browseMode === 'map' ? (
          <CinemaMapView
            cityMeta={cityMeta}
            lang={lang}
            edition={edition}
            allCityCinemas={cityCinemas}
            cinemaItems={cinemaBrowseItems}
            userOrigin={userOrigin}
            shortlistedIds={shortlistedIds}
            favoriteCinemaIds={favoriteCinemaIds}
            onSelectSession={setSelectedSession}
            onToggleShortlist={handleToggleShortlist}
            onToggleFavoriteCinema={handleToggleFavoriteCinema}
            onInspectRatings={setInspectedRatingsMovie}
            onWatchTrailer={setTrailerMovie}
            onOpenLocationModal={handleOpenLocationModal}
            onFilterByCinema={(cid) =>
              handleUpdateFilters({ selectedCinemaId: cid, browseMode: 'cinemas' })
            }
          />
        ) : (
          <CinemaBrowseView
            items={cinemaBrowseItems}
            isShanghai={filters.city === 'shanghai'}
            lang={lang}
            userOrigin={userOrigin}
            shortlistedIds={shortlistedIds}
            favoriteCinemaIds={favoriteCinemaIds}
            favoritesOnlyActive={filters.favoritesOnly}
            hiddenPastTodayCount={hiddenPastTodayCount}
            onSelectSession={setSelectedSession}
            onToggleShortlist={handleToggleShortlist}
            onToggleFavoriteCinema={handleToggleFavoriteCinema}
            onInspectRatings={setInspectedRatingsMovie}
            onWatchTrailer={setTrailerMovie}
            onShowPastToday={() => handleUpdateFilters({ showPastToday: true })}
            onResetFilters={handleResetFilters}
          />
        )}
      </main>

      {/* Floating Comparison Bar when candidate sessions are shortlisted */}
      {hydratedShortlist.length > 0 && !isShortlistOpen && (
        <aside className="floating-shortlist-dock" aria-label="Shortlist comparison dock">
          <div className="floating-shortlist-dock__inner">
            <div className="floating-shortlist-dock__summary">
              <BookmarkCheck size={18} className="dock-icon" aria-hidden="true" />
              <div>
                <strong>
                  {lang === 'zh'
                    ? `已加入 ${hydratedShortlist.length} 场对比`
                    : `${hydratedShortlist.length} ${
                        hydratedShortlist.length === 1 ? 'session pinned' : 'sessions ready to compare'
                      }`}
                </strong>
                <span className="floating-shortlist-dock__names">
                  {hydratedShortlist
                    .map(
                      (h) =>
                        `${getDisplayMovieTitle(h.movie, lang, filters.city === 'shanghai')} (${h.cinema.suburb})`
                    )
                    .slice(0, 3)
                    .join(' · ')}
                </span>
              </div>
            </div>

            <div className="floating-shortlist-dock__actions">
              <button
                type="button"
                id="dock-share-folio-link-btn"
                className="btn-secondary"
                onClick={async () => {
                  const url = buildShareableFolioUrl(
                    filters.city,
                    hydratedShortlist.map((h) => ({
                      sessionId: h.session.id,
                      votes: h.entry.votes,
                    })),
                    lang,
                    false
                  );
                  const ok = await copyTextSafely(url);
                  if (ok) {
                    setDockLinkCopied(true);
                    window.setTimeout(() => setDockLinkCopied(false), 2600);
                  }
                }}
              >
                {dockLinkCopied ? <Check size={14} /> : <Link2 size={14} />}
                <span>{dockLinkCopied ? t.folioLinkCopied : t.shareFolioLink}</span>
              </button>
              <button
                type="button"
                id="dock-open-compare-btn"
                className="btn-primary btn-primary--sm"
                onClick={() => setIsShortlistOpen(true)}
              >
                {lang === 'zh' ? '并排比价对比' : 'Compare Side-by-Side'}
              </button>
            </div>
          </div>
        </aside>
      )}

      <footer className="site-footer">
        <div className="site-footer__inner">
          <p className="site-footer__brand">
            <strong>Reelhouse</strong> — Melbourne, Sydney &amp; Shanghai Cinema Discovery Guide
          </p>
          <p className="site-footer__note">
            Live &amp; curated multi-venue programming across 50 iconic &amp; flagship cinemas —
            Melbourne &amp; Sydney (Hoyts, Event, Village, Reading, United, Palace, Dendy, IMAX,
            Cinema Nova, Lido, Classic, Sun Theatre, Hayden Orpheum, Ritz &amp; Golden Age) and
            Shanghai (Grand Cinema 大光明, Shanghai Film Art Center 上海影城 SHO, Cathay 国泰,
            Palace iapm 百丽宫, MOViE MOViE, SFC 上影, Wanda IMAX, UME Xintiandi &amp; CGV). Confirm
            final seat pricing on the official cinema checkout.
          </p>
        </div>
      </footer>

      <SessionDetailModal
        session={selectedSession}
        movie={selectedModalMovie}
        cinema={selectedModalCinema}
        cityMeta={
          selectedSession
            ? cinemaDataService.getCityMeta(selectedSession.city)
            : cityMeta
        }
        lang={lang}
        userOrigin={userOrigin}
        isShortlisted={
          selectedSession ? shortlistedIds.has(selectedSession.id) : false
        }
        isFavoriteCinema={
          selectedModalCinema ? favoriteCinemaIds.has(selectedModalCinema.id) : false
        }
        sameDaySessions={modalSameDaySessions}
        movieMap={movieMap}
        cinemaMap={allCinemasMap}
        shortlistedIds={shortlistedIds}
        hasTopOverlay={
          inspectedRatingsMovie !== null || trailerMovie !== null || isLocationModalOpen
        }
        onClose={() => setSelectedSession(null)}
        onToggleShortlist={handleToggleShortlist}
        onPinPairToShortlist={handlePinPairToShortlist}
        onSelectSession={setSelectedSession}
        onToggleFavoriteCinema={handleToggleFavoriteCinema}
        onInspectRatings={setInspectedRatingsMovie}
        onWatchTrailer={setTrailerMovie}
      />

      <ShortlistDrawerModal
        isOpen={isShortlistOpen}
        items={hydratedShortlist}
        activeCity={filters.city}
        lang={lang}
        userOrigin={userOrigin}
        hasTopOverlay={
          inspectedRatingsMovie !== null || trailerMovie !== null || isLocationModalOpen
        }
        onClose={() => setIsShortlistOpen(false)}
        onVote={handleVoteShortlist}
        onRemove={handleToggleShortlist}
        onClearAll={handleClearShortlist}
        onInspectRatings={setInspectedRatingsMovie}
        onWatchTrailer={setTrailerMovie}
      />

      <MovieRatingsModal
        movie={inspectedRatingsMovie}
        onClose={() => setInspectedRatingsMovie(null)}
      />

      <TrailerModal
        movie={trailerMovie}
        onClose={() => setTrailerMovie(null)}
      />

      <MyLocationModal
        isOpen={isLocationModalOpen}
        cityMeta={cityMeta}
        userOrigin={userOrigin}
        onClose={() => setIsLocationModalOpen(false)}
        onApplyCustomCoordinates={handleApplyCustomCoordinates}
        onSelectHub={handleSelectNearHub}
        onResetLocation={() => handleSelectNearHub('cbd')}
      />

      {isAdminMode && (
        <ApiSettingsModal
          isOpen={isApiSettingsOpen}
          onClose={() => setIsApiSettingsOpen(false)}
          onSyncedSuccessfully={handleReloadLiveCatalog}
        />
      )}
    </div>
  );
}

export default App;
