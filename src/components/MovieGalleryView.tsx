import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Compass,
  ExternalLink,
  Film,
  Heart,
  LayoutList,
  MapPin,
  Navigation,
  Play,
  Sparkles,
  Star,
  Tag,
  Train,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  CalendarDayOption,
  CityMeta,
  CurrencyCode,
  FormatType,
  Movie,
  ScreeningSession,
} from '../types/cinema';
import {
  formatCalendarChipParts,
  formatDistanceKm,
  formatRuntime,
  formatSessionPrice,
} from '../utils/formatters';
import {
  getDisplayCinemaName,
  getDisplayMovieSynopsis,
  getDisplayMovieTagline,
  getDisplayMovieTitle,
  getUiText,
} from '../utils/i18n';
import { getCinemaDistanceInfo, type UserLocationOrigin } from '../utils/proximity';
import {
  buildSafeGoogleMapsDirectionsUrl,
  buildSafeGoogleMapsUrl,
} from '../utils/security';
import { MoviePoster } from './MoviePoster';
import { RatingsPillBar } from './RatingsPillBar';
import { SessionListByDate } from './SessionListByDate';
import type { MovieWithVenueSessions } from './MovieBrowseView';

export interface GalleryMovieSummary {
  movie: Movie;
  selectedDateVenueCount: number;
  selectedDateSessionCount: number;
  weekVenueCount: number;
  weekSessionCount: number;
  nextAvailableDateIso: string | null;
  lowestPrice: number | null;
  currency: CurrencyCode;
  topFormats: FormatType[];
}

export interface SelectedMovieDateSummary {
  day: CalendarDayOption;
  sessionCount: number;
  cinemaCount: number;
}

interface MovieGalleryViewProps {
  movies: GalleryMovieSummary[];
  selectedMovie: Movie | null;
  selectedMovieItem: MovieWithVenueSessions | null;
  selectedMovieDates: SelectedMovieDateSummary[];
  activeDateIso: string;
  selectedDates: string[];
  cityMeta: CityMeta;
  lang?: AppLanguage;
  userOrigin: UserLocationOrigin;
  shortlistedIds: Set<string>;
  favoriteCinemaIds: Set<string>;
  favoritesOnlyActive: boolean;
  hiddenPastTodayCount: number;
  cheapTuesdayIso?: string;
  onPickMovie: (movieId: string, preferredDateIso?: string | null) => void;
  onBackToAllMovies: () => void;
  onSelectDate: (dateIso: string) => void;
  onSelectDates: (dates: string[]) => void;
  onSwitchToFullSchedule: () => void;
  onSelectSession: (session: ScreeningSession) => void;
  onToggleShortlist: (sessionId: string) => void;
  onToggleFavoriteCinema: (cinemaId: string) => void;
  onInspectRatings: (movie: Movie) => void;
  onWatchTrailer: (movie: Movie) => void;
  onShowPastToday: () => void;
  onJumpToCheapTuesday: () => void;
  onResetFilters: () => void;
}

type GallerySortOption =
  | 'recommended'
  | 'imdb'
  | 'rt'
  | 'douban'
  | 'venues'
  | 'shortest'
  | 'title';

type VenueSortOption = 'closest' | 'cheapest' | 'earliest' | 'most_sessions';

const FORMAT_RANK: Record<FormatType, number> = {
  '35mm / 70mm': 6,
  IMAX: 5,
  'Dolby Atmos': 4,
  'Gold Class / LUX': 3,
  'Vmax / Xtremescreen': 2,
  Standard: 1,
};

function scrollToVenueRow(movieId: string, cinemaId: string) {
  const el = document.getElementById(`venue-row-${movieId}-${cinemaId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export function MovieGalleryView({
  movies,
  selectedMovie,
  selectedMovieItem,
  selectedMovieDates,
  activeDateIso,
  selectedDates,
  cityMeta,
  lang = 'en',
  userOrigin,
  shortlistedIds,
  favoriteCinemaIds,
  favoritesOnlyActive,
  hiddenPastTodayCount,
  cheapTuesdayIso,
  onPickMovie,
  onBackToAllMovies,
  onSelectDate,
  onSelectDates,
  onSwitchToFullSchedule,
  onSelectSession,
  onToggleShortlist,
  onToggleFavoriteCinema,
  onInspectRatings,
  onWatchTrailer,
  onShowPastToday,
  onJumpToCheapTuesday,
  onResetFilters,
}: MovieGalleryViewProps) {
  const [gallerySort, setGallerySort] = useState<GallerySortOption>('recommended');
  const [venueSort, setVenueSort] = useState<VenueSortOption>('closest');
  const [localFormatFilter, setLocalFormatFilter] = useState<FormatType | 'all'>('all');
  const [detailMultiDateMode, setDetailMultiDateMode] = useState(false);

  const effectiveSelectedDates = selectedDates.length > 0 ? selectedDates : [activeDateIso];
  const selectedDateSet = new Set(effectiveSelectedDates);
  const isDetailMultiActive = detailMultiDateMode || effectiveSelectedDates.length > 1;

  const t = getUiText(lang);
  const isShanghai = cityMeta.id === 'shanghai';
  const displayCityName = t.cityNames[cityMeta.id] ?? cityMeta.name;

  // =========================================================================
  // STEP 2: MOVIE PICKED -> FULL REVIEW HERO + ALL CINEMAS & SESSIONS
  // =========================================================================
  if (selectedMovie) {
    const displayTitle = getDisplayMovieTitle(selectedMovie, lang, isShanghai);
    const displayTagline = getDisplayMovieTagline(selectedMovie, lang);
    const displaySynopsis = getDisplayMovieSynopsis(selectedMovie, lang);
    const rawVenues = selectedMovieItem?.venues ?? [];

    const availableFormats = Array.from(
      new Set(rawVenues.flatMap((v) => v.sessions.map((s) => s.format)))
    ).sort((a, b) => FORMAT_RANK[b] - FORMAT_RANK[a]);

    const effectiveFormat: FormatType | 'all' =
      localFormatFilter !== 'all' && availableFormats.includes(localFormatFilter)
        ? localFormatFilter
        : 'all';

    const formatFilteredVenues =
      effectiveFormat === 'all'
        ? rawVenues
        : rawVenues
            .map((v) => ({
              cinema: v.cinema,
              sessions: v.sessions.filter((s) => s.format === effectiveFormat),
            }))
            .filter((v) => v.sessions.length > 0);

    const visibleVenues = [...formatFilteredVenues].sort((a, b) => {
      if (venueSort === 'cheapest') {
        const aMin = Math.min(...a.sessions.map((s) => s.priceAud));
        const bMin = Math.min(...b.sessions.map((s) => s.priceAud));
        if (aMin !== bMin) return aMin - bMin;
      } else if (venueSort === 'earliest') {
        const aEarly = Math.min(...a.sessions.map((s) => s.startMinutesFromMidnight));
        const bEarly = Math.min(...b.sessions.map((s) => s.startMinutesFromMidnight));
        if (aEarly !== bEarly) return aEarly - bEarly;
      } else if (venueSort === 'most_sessions') {
        if (b.sessions.length !== a.sessions.length) return b.sessions.length - a.sessions.length;
      } else {
        const aFav = favoriteCinemaIds.has(a.cinema.id) ? 1 : 0;
        const bFav = favoriteCinemaIds.has(b.cinema.id) ? 1 : 0;
        if (bFav !== aFav) return bFav - aFav;
      }
      return (
        getCinemaDistanceInfo(a.cinema, userOrigin).km -
        getCinemaDistanceInfo(b.cinema, userOrigin).km
      );
    });

    const visibleSessionCount = visibleVenues.reduce((sum, v) => sum + v.sessions.length, 0);
    const activeDateParts = formatCalendarChipParts(activeDateIso, cityMeta.timeZone, lang);
    const nextDayWithSessions = selectedMovieDates.find(
      (d) => d.day.dateIso !== activeDateIso && d.sessionCount > 0
    );

    // Quick Verdict calculations across visibleVenues
    let cheapestEntry: {
      cinemaId: string;
      cinemaName: string;
      price: number;
      currency: CurrencyCode;
    } | null = null;
    let closestEntry: { cinemaId: string; cinemaName: string; km: number } | null = null;
    let bestFormatEntry: {
      cinemaId: string;
      cinemaName: string;
      format: FormatType;
      rank: number;
    } | null = null;

    if (visibleVenues.length > 1) {
      for (const v of visibleVenues) {
        const cName = getDisplayCinemaName(v.cinema, lang);
        const distKm = getCinemaDistanceInfo(v.cinema, userOrigin).km;
        if (!closestEntry || distKm < closestEntry.km) {
          closestEntry = { cinemaId: v.cinema.id, cinemaName: cName, km: distKm };
        }
        for (const s of v.sessions) {
          const cur: CurrencyCode = s.currency ?? cityMeta.currency;
          if (!cheapestEntry || s.priceAud < cheapestEntry.price) {
            cheapestEntry = {
              cinemaId: v.cinema.id,
              cinemaName: cName,
              price: s.priceAud,
              currency: cur,
            };
          }
          const rank = FORMAT_RANK[s.format] ?? 1;
          if (rank > 1 && (!bestFormatEntry || rank > bestFormatEntry.rank)) {
            bestFormatEntry = {
              cinemaId: v.cinema.id,
              cinemaName: cName,
              format: s.format,
              rank,
            };
          }
        }
      }
    }

    return (
      <section
        className="results-section gallery-detail-section"
        id="movie-gallery-top"
        aria-label={lang === 'zh' ? `${displayTitle} 影院与场次` : `${displayTitle} cinemas and sessions`}
      >
        {/* Top Back Navigation */}
        <div className="gallery-detail-nav">
          <button
            type="button"
            id="gallery-back-to-movies-btn"
            className="btn-secondary gallery-back-btn"
            onClick={onBackToAllMovies}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>
              {lang === 'zh'
                ? `返回全部正在热映影片 (${movies.length})`
                : `Back to All Movies (${movies.length})`}
            </span>
          </button>

          <span className="gallery-step-badge">
            <Film size={12} aria-hidden="true" />
            <span>
              {lang === 'zh'
                ? '第二步 · 查看影院与场次'
                : 'STEP 2 OF 2 · CINEMAS & SESSIONS'}
            </span>
          </span>
        </div>

        {/* Full Movie Review Hero Card */}
        <article className="gallery-selected-hero" id={`gallery-selected-${selectedMovie.id}`}>
          <div className="gallery-selected-hero__poster">
            <MoviePoster movie={selectedMovie} size="lg" />
          </div>

          <div className="gallery-selected-hero__content">
            <div className="movie-card__badges">
              <span className="auteur-credit">
                {lang === 'zh'
                  ? `导演：${selectedMovie.director}`
                  : `A FILM BY ${selectedMovie.director.toUpperCase()}`}
              </span>
              <span
                className={`rating-badge rating-badge--${selectedMovie.classification
                  .toLowerCase()
                  .replace('+', 'plus')}`}
              >
                {selectedMovie.classification}
              </span>
              <span className="meta-inline">
                <Clock size={12} aria-hidden="true" />
                {formatRuntime(selectedMovie.runtimeMinutes, lang)}
              </span>
              <span className="meta-inline">{selectedMovie.releaseYear}</span>
            </div>

            <h2 className="gallery-selected-hero__title">{displayTitle}</h2>

            {displayTagline && (
              <p className="movie-card__epigraph">“{displayTagline}”</p>
            )}

            <p className="movie-card__byline">
              {selectedMovie.genres.join(' · ')} — {selectedMovie.languageNote} (
              {selectedMovie.countryOrigin}, {selectedMovie.releaseYear})
            </p>

            <div className="movie-card__ratings-row">
              <RatingsPillBar
                movie={selectedMovie}
                lang={lang}
                contextKey="gallery-detail"
                onInspectRatings={onInspectRatings}
              />
              {selectedMovie.trailerYoutubeKey && (
                <button
                  type="button"
                  id={`gallery-selected-trailer-${selectedMovie.id}`}
                  className="trailer-pill-btn"
                  onClick={() => onWatchTrailer(selectedMovie)}
                >
                  <Play size={11} aria-hidden="true" fill="currentColor" />
                  <span>{t.watchTrailer}</span>
                </button>
              )}
              <button
                type="button"
                id={`gallery-selected-ratings-${selectedMovie.id}`}
                className="btn-secondary gallery-detail-action-btn"
                onClick={() => onInspectRatings(selectedMovie)}
              >
                <Star size={12} aria-hidden="true" />
                <span>{lang === 'zh' ? '详细影评评分' : 'Full Score Breakdown'}</span>
              </button>
            </div>

            <p className="gallery-selected-hero__synopsis">{displaySynopsis}</p>

            {selectedMovie.castLead.length > 0 && (
              <p className="movie-card__cast">
                <span>{lang === 'zh' ? '主演' : 'FEATURING'}</span>{' '}
                {selectedMovie.castLead.join(' · ')}
              </p>
            )}
          </div>
        </article>

        {/* Per-Movie Multi-Day Date Selector */}
        {selectedMovieDates.length > 0 && (() => {
          const allOrder = selectedMovieDates.map((d) => d.day.dateIso);
          const availableFilmDates = selectedMovieDates
            .filter((d) => d.sessionCount > 0)
            .map((d) => d.day.dateIso);

          const sortFilmDates = (list: string[]) =>
            Array.from(new Set(list)).sort((a, b) => {
              const ia = allOrder.indexOf(a);
              const ib = allOrder.indexOf(b);
              return ia !== -1 && ib !== -1 ? ia - ib : a.localeCompare(b);
            });

          const handleDetailDateClick = (
            dIso: string,
            e: React.MouseEvent<HTMLButtonElement>
          ) => {
            if (e.shiftKey && effectiveSelectedDates.length > 0) {
              const i1 = allOrder.indexOf(effectiveSelectedDates[0]);
              const i2 = allOrder.indexOf(dIso);
              if (i1 !== -1 && i2 !== -1) {
                const [s, end] = i1 <= i2 ? [i1, i2] : [i2, i1];
                const range = allOrder.slice(s, end + 1);
                setDetailMultiDateMode(range.length > 1);
                onSelectDates(range);
                return;
              }
            }
            if (isDetailMultiActive || e.metaKey || e.ctrlKey) {
              if (selectedDateSet.has(dIso)) {
                if (effectiveSelectedDates.length <= 1) return;
                onSelectDates(effectiveSelectedDates.filter((d) => d !== dIso));
              } else {
                setDetailMultiDateMode(true);
                onSelectDates(sortFilmDates([...effectiveSelectedDates, dIso]));
              }
              return;
            }
            onSelectDate(dIso);
          };

          return (
            <div
              className="gallery-movie-dates"
              role="group"
              aria-label={lang === 'zh' ? '选择观影日期' : 'Choose screening dates for this movie'}
            >
              <div className="gallery-movie-dates__head">
                <span className="gallery-movie-dates__label">
                  <Calendar size={13} aria-hidden="true" />
                  <span>{lang === 'zh' ? '该片排片日期' : 'Dates Screening This Film'}</span>
                </span>

                <div className="date-multi-bar">
                  <button
                    type="button"
                    id="gallery-detail-multi-date-btn"
                    className={`date-multi-pill ${
                      isDetailMultiActive ? 'date-multi-pill--active' : ''
                    }`}
                    aria-pressed={isDetailMultiActive}
                    onClick={() => {
                      if (isDetailMultiActive) {
                        setDetailMultiDateMode(false);
                        if (effectiveSelectedDates.length > 1) {
                          onSelectDates([effectiveSelectedDates[0]]);
                        }
                      } else {
                        setDetailMultiDateMode(true);
                      }
                    }}
                  >
                    <Calendar size={11} aria-hidden="true" />
                    <span>
                      {isDetailMultiActive
                        ? lang === 'zh'
                          ? `多日选择 (${effectiveSelectedDates.length}天)`
                          : `Multi-Day (${effectiveSelectedDates.length})`
                        : lang === 'zh'
                          ? '+ 多日选择'
                          : '+ Multi-Day'}
                    </span>
                  </button>

                  {availableFilmDates.length > 1 && (
                    <button
                      type="button"
                      id="gallery-detail-all-days-btn"
                      className={`date-preset-pill ${
                        availableFilmDates.length === effectiveSelectedDates.length &&
                        availableFilmDates.every((d) => selectedDateSet.has(d))
                          ? 'date-preset-pill--active'
                          : ''
                      }`}
                      onClick={() => {
                        setDetailMultiDateMode(true);
                        onSelectDates(availableFilmDates);
                      }}
                    >
                      {lang === 'zh'
                        ? `全部有场次日 (${availableFilmDates.length})`
                        : `All Screening Days (${availableFilmDates.length})`}
                    </button>
                  )}

                  {effectiveSelectedDates.length > 1 && (
                    <button
                      type="button"
                      className="date-preset-pill date-preset-pill--clear"
                      onClick={() => {
                        setDetailMultiDateMode(false);
                        onSelectDates([effectiveSelectedDates[0]]);
                      }}
                    >
                      <X size={10} aria-hidden="true" />
                      <span>{lang === 'zh' ? '恢复单日' : 'Single Day'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="gallery-movie-dates__strip">
                {selectedMovieDates.map(({ day, sessionCount, cinemaCount }) => {
                  const parts = formatCalendarChipParts(day.dateIso, cityMeta.timeZone, lang);
                  const isSelected = selectedDateSet.has(day.dateIso);
                  const dayHead = day.isToday
                    ? lang === 'zh'
                      ? '今天'
                      : 'Today'
                    : day.isTomorrow
                      ? lang === 'zh'
                        ? '明天'
                        : 'Tomorrow'
                      : parts.weekdayShort;
                  return (
                    <button
                      key={day.dateIso}
                      type="button"
                      id={`gallery-movie-date-${day.dateIso}`}
                      aria-pressed={isSelected}
                      className={`gallery-date-pill ${
                        isSelected ? 'gallery-date-pill--active' : ''
                      } ${sessionCount === 0 ? 'gallery-date-pill--empty' : ''}`}
                      onClick={(e) => handleDetailDateClick(day.dateIso, e)}
                    >
                      <span className="gallery-date-pill__top">
                        <span>{dayHead}</span>
                        {isDetailMultiActive ? (
                          <span
                            className={`date-chip__check ${
                              isSelected ? 'date-chip__check--on' : ''
                            }`}
                            aria-hidden="true"
                          >
                            {isSelected ? <Check size={9} /> : '+'}
                          </span>
                        ) : (
                          day.isCheapTuesday && (
                            <em className="gallery-date-pill__deal">
                              {lang === 'zh' ? '特惠' : 'Deal'}
                            </em>
                          )
                        )}
                      </span>
                      <span className="gallery-date-pill__date">{parts.dayMonthShort}</span>
                      <span className="gallery-date-pill__count">
                        {sessionCount > 0
                          ? lang === 'zh'
                            ? `${cinemaCount}家 · ${sessionCount}场`
                            : `${cinemaCount}v · ${sessionCount}x`
                          : lang === 'zh'
                            ? '无场次'
                            : 'None'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Venues Toolbar: Count + Format Quick-Chips + Sort */}
        <div className="gallery-venues-toolbar">
          <div className="gallery-venues-toolbar__heading">
            <h3>
              {lang === 'zh'
                ? `${visibleVenues.length} 家影院 · ${visibleSessionCount} 场排片`
                : `${visibleVenues.length} ${
                    visibleVenues.length === 1 ? 'Cinema' : 'Cinemas'
                  } · ${visibleSessionCount} ${
                    visibleSessionCount === 1 ? 'Session' : 'Sessions'
                  }`}
            </h3>
            <span className="gallery-venues-toolbar__date">
              {displayCityName} ·{' '}
              {effectiveSelectedDates.length === 1
                ? activeDateParts.fullLabel
                : lang === 'zh'
                  ? `已选 ${effectiveSelectedDates.length} 天 (${effectiveSelectedDates
                      .slice(0, 3)
                      .map((d) => formatCalendarChipParts(d, cityMeta.timeZone, lang).dayMonthShort)
                      .join('、')}${effectiveSelectedDates.length > 3 ? ' 等' : ''})`
                  : `${effectiveSelectedDates.length} days (${effectiveSelectedDates
                      .slice(0, 3)
                      .map((d) => formatCalendarChipParts(d, cityMeta.timeZone, lang).dayMonthShort)
                      .join(', ')}${effectiveSelectedDates.length > 3 ? '…' : ''})`}
            </span>
          </div>

          <div className="gallery-venues-toolbar__controls">
            {availableFormats.length > 1 && (
              <div
                className="gallery-format-chips"
                role="group"
                aria-label={lang === 'zh' ? '按放映制式筛选' : 'Filter by screening format'}
              >
                <button
                  type="button"
                  className={`gallery-format-chip ${
                    effectiveFormat === 'all' ? 'gallery-format-chip--active' : ''
                  }`}
                  onClick={() => setLocalFormatFilter('all')}
                >
                  {lang === 'zh' ? '全部制式' : 'All Formats'}
                </button>
                {availableFormats.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    className={`gallery-format-chip ${
                      effectiveFormat === fmt ? 'gallery-format-chip--active' : ''
                    }`}
                    onClick={() => setLocalFormatFilter(fmt)}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            )}

            {visibleVenues.length > 1 && (
              <label className="inline-select">
                <span className="inline-select__label">
                  {lang === 'zh' ? '影院排序' : 'Sort Venues'}
                </span>
                <select
                  id="gallery-venue-sort-select"
                  value={venueSort}
                  onChange={(e) => setVenueSort(e.target.value as VenueSortOption)}
                  className="inline-select__control"
                >
                  <option value="closest">
                    {lang === 'zh' ? '距离最近优先' : 'Closest First'}
                  </option>
                  <option value="cheapest">
                    {lang === 'zh' ? '票价最低优先' : 'Lowest Price'}
                  </option>
                  <option value="earliest">
                    {lang === 'zh' ? '最近开场优先' : 'Earliest Showtime'}
                  </option>
                  <option value="most_sessions">
                    {lang === 'zh' ? '场次最多优先' : 'Most Sessions'}
                  </option>
                </select>
              </label>
            )}
          </div>
        </div>

        {/* Quick Verdict Jump Strip */}
        {visibleVenues.length > 1 && (cheapestEntry || closestEntry || bestFormatEntry) && (
          <div
            className="film-quick-verdict"
            role="group"
            aria-label={
              lang === 'zh'
                ? '快速定位最便宜、最近或最佳制式影院'
                : 'Quick jump to cheapest, closest, or best format venue'
            }
          >
            {cheapestEntry && (
              <button
                type="button"
                className="verdict-jump-pill verdict-jump-pill--deal"
                onClick={() => scrollToVenueRow(selectedMovie.id, cheapestEntry.cinemaId)}
              >
                <Tag size={11} aria-hidden="true" />
                <span>{lang === 'zh' ? '最低票价' : 'Cheapest'}:</span>
                <strong>
                  {formatSessionPrice(cheapestEntry.price, cheapestEntry.currency, true)}
                </strong>
                <span>· {cheapestEntry.cinemaName}</span>
              </button>
            )}
            {closestEntry && (
              <button
                type="button"
                className="verdict-jump-pill"
                onClick={() => scrollToVenueRow(selectedMovie.id, closestEntry.cinemaId)}
              >
                <Compass size={11} aria-hidden="true" />
                <span>{lang === 'zh' ? '距离最近' : 'Closest'}:</span>
                <strong>{formatDistanceKm(closestEntry.km, lang)}</strong>
                <span>· {closestEntry.cinemaName}</span>
              </button>
            )}
            {bestFormatEntry && (
              <button
                type="button"
                className="verdict-jump-pill verdict-jump-pill--format"
                onClick={() => scrollToVenueRow(selectedMovie.id, bestFormatEntry.cinemaId)}
              >
                <Sparkles size={11} aria-hidden="true" />
                <span>{lang === 'zh' ? '最佳制式' : 'Best Format'}:</span>
                <strong>{bestFormatEntry.format}</strong>
                <span>· {bestFormatEntry.cinemaName}</span>
              </button>
            )}
          </div>
        )}

        {/* All Cinemas & Sessions List */}
        {visibleVenues.length === 0 ? (
          <div className="empty-state" role="status">
            <h3 className="empty-state__title">
              {favoritesOnlyActive
                ? lang === 'zh'
                  ? '你收藏的影院当天暂无该片排片'
                  : 'None of your favorite cinemas are screening this film on the selected date'
                : hiddenPastTodayCount > 0
                  ? lang === 'zh'
                    ? '该片今日余下场次均已开场'
                    : 'Remaining screenings of this film for today have already begun'
                  : lang === 'zh'
                    ? '当前日期或筛选条件下暂无该片排片'
                    : 'No screenings of this film match your active filters on this date'}
            </h3>
            <p className="empty-state__body">
              {nextDayWithSessions
                ? lang === 'zh'
                  ? '你可以切换到上方有排片的其他日期，或放宽当前影院/制式/价格筛选条件。'
                  : 'Pick another date in the 7-day strip above where this film is screening, or widen your venue/format filters.'
                : lang === 'zh'
                  ? '可尝试清除制式或影院筛选条件以查看全部排片。'
                  : 'Try clearing your format, precinct, or price filters to reveal all available screenings.'}
            </p>
            <div className="empty-state__actions">
              {nextDayWithSessions && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onSelectDate(nextDayWithSessions.day.dateIso)}
                >
                  {lang === 'zh'
                    ? `切换到下一排片日 (${nextDayWithSessions.sessionCount} 场)`
                    : `Jump to Next Available Day (${nextDayWithSessions.sessionCount} sessions)`}
                </button>
              )}
              {effectiveFormat !== 'all' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setLocalFormatFilter('all')}
                >
                  {lang === 'zh' ? '显示全部制式' : 'Show All Formats'}
                </button>
              )}
              {hiddenPastTodayCount > 0 && (
                <button type="button" className="btn-secondary" onClick={onShowPastToday}>
                  {lang === 'zh'
                    ? `显示今日已开场场次 (${hiddenPastTodayCount})`
                    : `Show Earlier Today (${hiddenPastTodayCount})`}
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={onResetFilters}>
                {lang === 'zh' ? '重置筛选条件' : 'Reset Filters'}
              </button>
            </div>
          </div>
        ) : (
          <div className="venue-schedule-stack gallery-venue-stack">
            {visibleVenues.map(({ cinema, sessions }) => {
              const isFav = favoriteCinemaIds.has(cinema.id);
              const distInfo = getCinemaDistanceInfo(cinema, userOrigin);
              const displayCinemaName = getDisplayCinemaName(cinema, lang);
              return (
                <div
                  key={cinema.id}
                  id={`venue-row-${selectedMovie.id}-${cinema.id}`}
                  className="venue-schedule-row gallery-venue-row"
                >
                  <div className="venue-schedule-row__info">
                    <div className="venue-schedule-row__title-line">
                      <button
                        type="button"
                        id={`fav-cinema-btn-gal-${selectedMovie.id}-${cinema.id}`}
                        className={`fav-inline-btn ${isFav ? 'fav-inline-btn--active' : ''}`}
                        aria-pressed={isFav}
                        aria-label={
                          isFav
                            ? `Remove ${displayCinemaName} from favorite cinemas`
                            : `Add ${displayCinemaName} to favorite cinemas`
                        }
                        title={
                          isFav
                            ? lang === 'zh'
                              ? '取消收藏该影院'
                              : 'Remove from My Favorite Cinemas'
                            : lang === 'zh'
                              ? '收藏该影院'
                              : 'Save to My Favorite Cinemas'
                        }
                        onClick={() => onToggleFavoriteCinema(cinema.id)}
                      >
                        <Heart
                          size={13}
                          fill={isFav ? 'currentColor' : 'none'}
                          aria-hidden="true"
                        />
                      </button>
                      <h4 className="venue-schedule-row__name">{displayCinemaName}</h4>
                      <span className="chain-tag chain-tag--compact">{cinema.chain}</span>
                      <span className="vibe-tag">{cinema.vibe}</span>
                    </div>
                    <p className="venue-schedule-row__suburb">
                      <MapPin size={11} aria-hidden="true" />
                      <span>{cinema.suburb}</span>
                      <span aria-hidden="true">—</span>
                      <span>
                        {userOrigin.isCustomOrigin
                          ? lang === 'zh'
                            ? `距你 ${formatDistanceKm(distInfo.km, lang)}`
                            : `${formatDistanceKm(distInfo.km, lang)} from you`
                          : lang === 'zh'
                            ? `距市中心 ${formatDistanceKm(distInfo.km, lang)}`
                            : `${formatDistanceKm(distInfo.km, lang)} from CBD`}
                      </span>
                    </p>
                    <p className="venue-schedule-row__transit">
                      <Train size={11} aria-hidden="true" />
                      <span>{cinema.transitNote}</span>
                    </p>
                    {cinema.dealHighlight && (
                      <p className="gallery-venue-row__deal">{cinema.dealHighlight}</p>
                    )}
                    <div className="venue-schedule-row__maps">
                      <a
                        href={
                          userOrigin.isCustomOrigin
                            ? buildSafeGoogleMapsDirectionsUrl(
                                userOrigin.lat,
                                userOrigin.lng,
                                cinema.name,
                                cinema.address
                              )
                            : buildSafeGoogleMapsUrl(cinema.name, cinema.address)
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="maps-inline-btn"
                        aria-label={`Open ${displayCinemaName} on Google Maps`}
                      >
                        <Navigation size={11} aria-hidden="true" />
                        <span>
                          {userOrigin.isCustomOrigin ? t.directions : t.googleMaps}
                        </span>
                        <ExternalLink size={10} aria-hidden="true" />
                      </a>
                    </div>
                  </div>

                  <SessionListByDate
                    sessions={sessions}
                    timeZone={cityMeta.timeZone}
                    lang={lang}
                    showDateGroups={effectiveSelectedDates.length > 1}
                    shortlistedIds={shortlistedIds}
                    onSelectSession={onSelectSession}
                    onToggleShortlist={onToggleShortlist}
                    ariaLabel={`${cinema.name} showtimes`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  // =========================================================================
  // STEP 1: ALL MOVIES CURRENTLY ON (POSTER GALLERY WALL)
  // =========================================================================
  if (movies.length === 0) {
    return (
      <div className="empty-state" id="movie-gallery-top" role="status">
        <h2 className="empty-state__title">
          {favoritesOnlyActive
            ? lang === 'zh'
              ? '你收藏的影院暂无符合当前筛选的热映影片'
              : 'No currently showing films at your favorite cinemas match this selection'
            : lang === 'zh'
              ? '当前筛选条件下暂无正在热映的影片'
              : 'No currently showing films match your active selection'}
        </h2>
        <p className="empty-state__body">
          {lang === 'zh'
            ? '可放宽院线、商圈、制式或评分条件，或重置筛选查看全部正在热映影片。'
            : 'Relax your chain, suburb, format, genre, or rating filters to browse every movie currently screening in town.'}
        </p>
        <div className="empty-state__actions">
          <button
            type="button"
            id="gallery-empty-reset-btn"
            className="btn-primary"
            onClick={onResetFilters}
          >
            {lang === 'zh' ? '重置全部筛选' : 'Restore Full Catalogue'}
          </button>
          {cheapTuesdayIso && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onJumpToCheapTuesday}
            >
              {lang === 'zh' ? '查看周二半价场' : 'View Cheap Tuesday'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const sortedMovies = [...movies].sort((a, b) => {
    if (gallerySort === 'imdb') {
      return (b.movie.ratings.imdb.score ?? -1) - (a.movie.ratings.imdb.score ?? -1);
    }
    if (gallerySort === 'rt') {
      return (
        (b.movie.ratings.rottenTomatoes.tomatometerPercent ?? -1) -
        (a.movie.ratings.rottenTomatoes.tomatometerPercent ?? -1)
      );
    }
    if (gallerySort === 'douban') {
      return (b.movie.ratings.douban.score ?? -1) - (a.movie.ratings.douban.score ?? -1);
    }
    if (gallerySort === 'venues') {
      return (
        b.selectedDateVenueCount - a.selectedDateVenueCount ||
        b.weekVenueCount - a.weekVenueCount ||
        b.weekSessionCount - a.weekSessionCount
      );
    }
    if (gallerySort === 'shortest') {
      return a.movie.runtimeMinutes - b.movie.runtimeMinutes;
    }
    if (gallerySort === 'title') {
      return getDisplayMovieTitle(a.movie, lang, isShanghai).localeCompare(
        getDisplayMovieTitle(b.movie, lang, isShanghai)
      );
    }
    // Default recommended order: films screening on selected date first, then featured, then IMDb, then sessions
    const aHasSelected = a.selectedDateSessionCount > 0 ? 1 : 0;
    const bHasSelected = b.selectedDateSessionCount > 0 ? 1 : 0;
    if (bHasSelected !== aHasSelected) return bHasSelected - aHasSelected;
    const featDiff = (b.movie.isFeaturedMarquee ? 1 : 0) - (a.movie.isFeaturedMarquee ? 1 : 0);
    if (featDiff !== 0) return featDiff;
    const imdbDiff = (b.movie.ratings.imdb.score ?? -1) - (a.movie.ratings.imdb.score ?? -1);
    if (imdbDiff !== 0) return imdbDiff;
    return b.weekSessionCount - a.weekSessionCount;
  });

  return (
    <section
      className="results-section gallery-section"
      id="movie-gallery-top"
      aria-label={lang === 'zh' ? '正在热映全部影片' : 'All movies currently showing'}
    >
      <div className="results-toolbar gallery-toolbar">
        <div className="results-toolbar__title-group">
          <span className="results-toolbar__kicker">
            {lang === 'zh'
              ? '正在热映 · 第一步：浏览与挑选影片'
              : 'NOW SHOWING · STEP 1 OF 2'}
          </span>
          <h2 className="results-toolbar__heading">
            {lang === 'zh'
              ? `${displayCityName}正在热映 · 共 ${sortedMovies.length} 部影片`
              : `${sortedMovies.length} ${
                  sortedMovies.length === 1 ? 'Movie' : 'Movies'
                } Currently On in ${cityMeta.name}`}
          </h2>
          <p className="gallery-toolbar__subtitle">
            {lang === 'zh'
              ? '浏览海报、评分与剧情简介 — 点击任意影片，即可查看全部放映影院与详细场次。'
              : 'Review posters, ratings, and synopses below — pick any film to see every cinema and showtime.'}
          </p>
        </div>

        <div className="gallery-toolbar__actions">
          <label className="inline-select">
            <span className="inline-select__label">{lang === 'zh' ? '排序' : 'Order'}</span>
            <select
              id="gallery-sort-select"
              value={gallerySort}
              onChange={(e) => setGallerySort(e.target.value as GallerySortOption)}
              className="inline-select__control"
            >
              <option value="recommended">
                {lang === 'zh' ? '策划推荐排序' : 'Curator’s Sequence'}
              </option>
              <option value="imdb">
                {lang === 'zh' ? 'IMDb 评分最高' : 'Highest IMDb Score'}
              </option>
              <option value="rt">
                {lang === 'zh' ? '烂番茄评分最高' : 'Highest Rotten Tomatoes'}
              </option>
              <option value="douban">
                {lang === 'zh' ? '豆瓣评分最高' : 'Highest Douban (豆瓣)'}
              </option>
              <option value="venues">
                {lang === 'zh' ? '上映影院最多' : 'Most Cinemas Showing'}
              </option>
              <option value="shortest">
                {lang === 'zh' ? '片长最短' : 'Shortest Duration'}
              </option>
              <option value="title">
                {lang === 'zh' ? '按片名排序' : 'Title A–Z'}
              </option>
            </select>
          </label>

          <button
            type="button"
            id="gallery-switch-full-schedule-btn"
            className="btn-secondary gallery-schedule-switch-btn"
            onClick={onSwitchToFullSchedule}
          >
            <LayoutList size={13} aria-hidden="true" />
            <span>{lang === 'zh' ? '展开全部排片' : 'Full Schedule View'}</span>
          </button>
        </div>
      </div>

      <div className="movie-gallery-grid">
        {sortedMovies.map((item) => {
          const {
            movie,
            selectedDateVenueCount,
            selectedDateSessionCount,
            weekVenueCount,
            nextAvailableDateIso,
            lowestPrice,
            currency,
            topFormats,
          } = item;
          const displayTitle = getDisplayMovieTitle(movie, lang, isShanghai);
          const displaySynopsis = getDisplayMovieSynopsis(movie, lang);
          const premiumFormats = topFormats.filter((f) => f !== 'Standard').slice(0, 2);
          const nextParts = nextAvailableDateIso
            ? formatCalendarChipParts(nextAvailableDateIso, cityMeta.timeZone, lang)
            : null;
          const hasAnyScore =
            movie.ratings.imdb.score != null ||
            movie.ratings.rottenTomatoes.tomatometerPercent != null ||
            movie.ratings.douban.score != null;

          return (
            <article
              key={movie.id}
              id={`gallery-film-card-${movie.id}`}
              className="gallery-film-card"
            >
              <button
                type="button"
                className="gallery-film-card__poster-btn"
                onClick={() =>
                  onPickMovie(
                    movie.id,
                    selectedDateSessionCount > 0 ? null : nextAvailableDateIso
                  )
                }
                aria-label={
                  lang === 'zh'
                    ? `选择《${displayTitle}》查看影院与场次`
                    : `Pick ${displayTitle} to view all cinemas and sessions`
                }
              >
                <div className="gallery-film-card__poster">
                  <MoviePoster movie={movie} size="md" />
                </div>

                <div className="gallery-film-card__poster-cta" aria-hidden="true">
                  <span>
                    {lang === 'zh' ? '查看影院与场次' : 'See Cinemas & Sessions'}
                  </span>
                  <ArrowRight size={13} />
                </div>
              </button>

              <div className="gallery-film-card__body">
                <div className="gallery-film-card__meta-strip">
                  <span
                    className={`rating-badge rating-badge--${movie.classification
                      .toLowerCase()
                      .replace('+', 'plus')}`}
                  >
                    {movie.classification}
                  </span>
                  <span className="meta-inline">
                    <Clock size={11} aria-hidden="true" />
                    {formatRuntime(movie.runtimeMinutes, lang)}
                  </span>
                  {premiumFormats.length > 0 && (
                    <span className="gallery-format-pill">{premiumFormats[0]}</span>
                  )}
                </div>

                <div className="gallery-film-card__head">
                  <button
                    type="button"
                    className="gallery-film-card__title-btn"
                    onClick={() =>
                      onPickMovie(
                        movie.id,
                        selectedDateSessionCount > 0 ? null : nextAvailableDateIso
                      )
                    }
                  >
                    <h3 className="gallery-film-card__title">{displayTitle}</h3>
                  </button>
                  <p className="gallery-film-card__director">
                    {movie.director} · {movie.releaseYear}
                  </p>
                </div>

                <div className="gallery-film-card__genres">
                  {movie.genres.slice(0, 3).map((g) => (
                    <span key={g} className="gallery-genre-tag">
                      {g}
                    </span>
                  ))}
                </div>

                {hasAnyScore && (
                  <button
                    type="button"
                    className="gallery-film-card__ratings"
                    onClick={() => onInspectRatings(movie)}
                    title={
                      lang === 'zh'
                        ? '点击查看 IMDb / 烂番茄 / 豆瓣 详细评分'
                        : 'Inspect full IMDb, Rotten Tomatoes & Douban breakdown'
                    }
                  >
                    {movie.ratings.imdb.score != null && (
                      <span className="gallery-score-chip gallery-score-chip--imdb">
                        <span>IMDb</span>
                        <strong>{movie.ratings.imdb.score.toFixed(1)}</strong>
                      </span>
                    )}
                    {movie.ratings.rottenTomatoes.tomatometerPercent != null && (
                      <span className="gallery-score-chip gallery-score-chip--rt">
                        <span>RT</span>
                        <strong>{movie.ratings.rottenTomatoes.tomatometerPercent}%</strong>
                      </span>
                    )}
                    {movie.ratings.douban.score != null && (
                      <span className="gallery-score-chip gallery-score-chip--douban">
                        <span>{lang === 'zh' ? '豆瓣' : 'DB'}</span>
                        <strong>{movie.ratings.douban.score.toFixed(1)}</strong>
                      </span>
                    )}
                  </button>
                )}

                <p className="gallery-film-card__synopsis">{displaySynopsis}</p>

                <div className="gallery-film-card__availability">
                  {selectedDateSessionCount > 0 ? (
                    <span className="gallery-avail-live">
                      {lang === 'zh'
                        ? `${selectedDateVenueCount} 家影院 · ${selectedDateSessionCount} 场`
                        : `${selectedDateVenueCount} ${
                            selectedDateVenueCount === 1 ? 'cinema' : 'cinemas'
                          } · ${selectedDateSessionCount} ${
                            selectedDateSessionCount === 1 ? 'session' : 'sessions'
                          }`}
                      {lowestPrice != null && (
                        <>
                          {' · '}
                          <strong>
                            {lang === 'zh'
                              ? `${formatSessionPrice(lowestPrice, currency, true)}起`
                              : `From ${formatSessionPrice(lowestPrice, currency, true)}`}
                          </strong>
                        </>
                      )}
                    </span>
                  ) : nextParts ? (
                    <span className="gallery-avail-next">
                      {lang === 'zh'
                        ? `下场排片：${nextParts.dayMonthShort} · ${weekVenueCount} 家影院`
                        : `Next: ${nextParts.weekdayShort} ${nextParts.dayMonthShort} · ${weekVenueCount} ${
                            weekVenueCount === 1 ? 'cinema' : 'cinemas'
                          }`}
                    </span>
                  ) : (
                    <span className="gallery-avail-next">
                      {lang === 'zh'
                        ? `本周 ${weekVenueCount} 家影院排片`
                        : `${weekVenueCount} ${
                            weekVenueCount === 1 ? 'cinema' : 'cinemas'
                          } this week`}
                    </span>
                  )}
                </div>

                <div className="gallery-film-card__actions">
                  <button
                    type="button"
                    id={`gallery-pick-movie-${movie.id}`}
                    className="btn-primary gallery-film-card__pick-btn"
                    onClick={() =>
                      onPickMovie(
                        movie.id,
                        selectedDateSessionCount > 0 ? null : nextAvailableDateIso
                      )
                    }
                  >
                    <span>
                      {lang === 'zh' ? '查看影院与场次' : 'Cinemas & Sessions'}
                    </span>
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>

                  {movie.trailerYoutubeKey && (
                    <button
                      type="button"
                      className="btn-secondary gallery-film-card__trailer-btn"
                      onClick={() => onWatchTrailer(movie)}
                      aria-label={
                        lang === 'zh'
                          ? `观看《${displayTitle}》预告片`
                          : `Watch ${displayTitle} trailer`
                      }
                      title={t.watchTrailer}
                    >
                      <Play size={12} aria-hidden="true" />
                      <span>{t.trailer}</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
