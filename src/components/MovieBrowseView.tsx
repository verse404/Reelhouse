import { useState } from 'react';
import {
  Clock,
  Compass,
  ExternalLink,
  Heart,
  MapPin,
  Navigation,
  Play,
  Sparkles,
  Tag,
  Train,
} from 'lucide-react';
import type {
  AppLanguage,
  Cinema,
  CityTimeZone,
  FormatType,
  Movie,
  ScreeningSession,
} from '../types/cinema';
import { formatDistanceKm, formatRuntime, formatSessionPrice } from '../utils/formatters';
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

export interface MovieWithVenueSessions {
  movie: Movie;
  venues: Array<{
    cinema: Cinema;
    sessions: ScreeningSession[];
  }>;
  totalSessions: number;
}

interface MovieBrowseViewProps {
  items: MovieWithVenueSessions[];
  isShanghai?: boolean;
  timeZone?: CityTimeZone;
  isMultiDay?: boolean;
  lang?: AppLanguage;
  userOrigin: UserLocationOrigin;
  shortlistedIds: Set<string>;
  favoriteCinemaIds: Set<string>;
  favoritesOnlyActive: boolean;
  hiddenPastTodayCount: number;
  cheapTuesdayIso?: string;
  onSelectSession: (session: ScreeningSession) => void;
  onToggleShortlist: (sessionId: string) => void;
  onToggleFavoriteCinema: (cinemaId: string) => void;
  onInspectRatings: (movie: Movie) => void;
  onWatchTrailer: (movie: Movie) => void;
  onShowPastToday: () => void;
  onJumpToCheapTuesday: () => void;
  onResetFilters: () => void;
}

type MovieSortOption =
  | 'recommended'
  | 'imdb'
  | 'rt'
  | 'douban'
  | 'shortest'
  | 'sessions';

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

export function MovieBrowseView({
  items,
  isShanghai = false,
  timeZone,
  isMultiDay = false,
  lang = 'en',
  userOrigin,
  shortlistedIds,
  favoriteCinemaIds,
  favoritesOnlyActive,
  hiddenPastTodayCount,
  cheapTuesdayIso,
  onSelectSession,
  onToggleShortlist,
  onToggleFavoriteCinema,
  onInspectRatings,
  onWatchTrailer,
  onShowPastToday,
  onJumpToCheapTuesday,
  onResetFilters,
}: MovieBrowseViewProps) {
  const [sortBy, setSortBy] = useState<MovieSortOption>('recommended');
  const t = getUiText(lang);

  if (items.length === 0) {
    return (
      <div className="empty-state" role="status">
        <h2 className="empty-state__title">
          {favoritesOnlyActive
            ? lang === 'zh'
              ? '你收藏的影院暂无符合当前筛选的排片'
              : 'No screenings at your favorite cinemas match this selection'
            : hiddenPastTodayCount > 0
              ? lang === 'zh'
                ? '今天余下的匹配场次均已开场'
                : 'Remaining screenings for today have already begun'
              : lang === 'zh'
                ? '当前筛选条件下暂无排片'
                : 'No screenings match the current selection'}
        </h2>
        <p className="empty-state__body">
          {favoritesOnlyActive
            ? lang === 'zh'
              ? '点击任意影院旁的心形图标即可收藏常去影院，或点击下方重置筛选浏览全城影院。'
              : 'Tap the heart icon next to any cinema name to add favorite houses, or restore the full archive to browse every venue.'
            : hiddenPastTodayCount > 0
              ? lang === 'zh'
                ? `今天早些时候已有 ${hiddenPastTodayCount} 场匹配排片开场 — 可切换到明天或其他日期，或展开今日历史场次。`
                : `${hiddenPastTodayCount} matching ${
                    hiddenPastTodayCount === 1 ? 'session has' : 'sessions have'
                  } already started earlier today — select Tomorrow or another date above, or reveal earlier sessions.`
              : lang === 'zh'
                ? '可放宽院线、商圈、制式或评分筛选条件，或直接查看周二特惠排片。'
                : 'Refine your chain, precinct, format, or critical reception thresholds—or step directly into Tuesday’s salon concessions across town.'}
        </p>
        <div className="empty-state__actions">
          {hiddenPastTodayCount > 0 && (
            <button
              type="button"
              id="empty-show-past-today-btn"
              className="btn-secondary"
              onClick={onShowPastToday}
            >
              {lang === 'zh'
                ? `显示今日已开场场次 (${hiddenPastTodayCount})`
                : `Show Earlier Today (${hiddenPastTodayCount})`}
            </button>
          )}
          <button
            type="button"
            id="empty-reset-filters-btn"
            className="btn-primary"
            onClick={onResetFilters}
          >
            {lang === 'zh' ? '重置全部筛选' : 'Restore Full Archive'}
          </button>
          {cheapTuesdayIso && (
            <button
              type="button"
              id="empty-jump-tuesday-btn"
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

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'imdb') {
      return (b.movie.ratings.imdb.score ?? -1) - (a.movie.ratings.imdb.score ?? -1);
    }
    if (sortBy === 'rt') {
      return (
        (b.movie.ratings.rottenTomatoes.tomatometerPercent ?? -1) -
        (a.movie.ratings.rottenTomatoes.tomatometerPercent ?? -1)
      );
    }
    if (sortBy === 'douban') {
      return (b.movie.ratings.douban.score ?? -1) - (a.movie.ratings.douban.score ?? -1);
    }
    if (sortBy === 'shortest') {
      return a.movie.runtimeMinutes - b.movie.runtimeMinutes;
    }
    if (sortBy === 'sessions') {
      return b.totalSessions - a.totalSessions;
    }
    const featDiff = (b.movie.isFeaturedMarquee ? 1 : 0) - (a.movie.isFeaturedMarquee ? 1 : 0);
    if (featDiff !== 0) return featDiff;
    return (b.movie.ratings.imdb.score ?? -1) - (a.movie.ratings.imdb.score ?? -1);
  });

  return (
    <section className="results-section" aria-label="Curated film programme">
      <div className="results-toolbar">
        <div className="results-toolbar__title-group">
          <span className="results-toolbar__kicker">CATALOGUE RAISONNÉ</span>
          <h2 className="results-toolbar__heading">
            {t.worksInProjection(sortedItems.length)}
          </h2>
        </div>

        <label className="inline-select">
          <span className="inline-select__label">{lang === 'zh' ? '排序' : 'Order'}</span>
          <select
            id="movie-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as MovieSortOption)}
            className="inline-select__control"
          >
            <option value="recommended">{lang === 'zh' ? '策划推荐排序' : 'Curator’s Sequence'}</option>
            <option value="imdb">{lang === 'zh' ? 'IMDb 评分最高' : 'Highest IMDb Score'}</option>
            <option value="rt">{lang === 'zh' ? '烂番茄评分最高' : 'Highest Rotten Tomatoes'}</option>
            <option value="douban">{lang === 'zh' ? '豆瓣评分最高' : 'Highest Douban (豆瓣)'}</option>
            <option value="sessions">{lang === 'zh' ? '今日排片场次最多' : 'Most Daily Sessions'}</option>
            <option value="shortest">{lang === 'zh' ? '片长最短' : 'Shortest Duration'}</option>
          </select>
        </label>
      </div>

      <div className="movie-list">
        {sortedItems.map(({ movie, venues }, index) => {
          const catalogNumber = String(index + 1).padStart(2, '0');
          const displayTitle = getDisplayMovieTitle(movie, lang, isShanghai);
          const displayTagline = getDisplayMovieTagline(movie, lang);
          const displaySynopsis = getDisplayMovieSynopsis(movie, lang);

          return (
            <article key={movie.id} className="movie-card" id={`movie-card-${movie.id}`}>
              <div className="movie-card__film-col">
                <div className="movie-card__poster-wrap">
                  <span className="movie-card__index" aria-hidden="true">
                    {catalogNumber}
                  </span>
                  <MoviePoster movie={movie} size="md" />
                </div>

                <div className="movie-card__details">
                  <div className="movie-card__badges">
                    <span className="auteur-credit">
                      {lang === 'zh'
                        ? `导演：${movie.director}`
                        : `A FILM BY ${movie.director.toUpperCase()}`}
                    </span>
                    <span
                      className={`rating-badge rating-badge--${movie.classification
                        .toLowerCase()
                        .replace('+', 'plus')}`}
                    >
                      {movie.classification}
                    </span>
                    <span className="meta-inline">
                      <Clock size={12} aria-hidden="true" />
                      {formatRuntime(movie.runtimeMinutes, lang)}
                    </span>
                  </div>

                  <h3 className="movie-card__title">{displayTitle}</h3>
                  <p className="movie-card__epigraph">“{displayTagline}”</p>

                  <p className="movie-card__byline">
                    {movie.genres.join(' · ')} — {movie.languageNote} ({movie.countryOrigin},{' '}
                    {movie.releaseYear})
                  </p>

                  <div className="movie-card__ratings-row">
                    <RatingsPillBar
                      movie={movie}
                      lang={lang}
                      onInspectRatings={onInspectRatings}
                    />
                    {movie.trailerYoutubeKey && (
                      <button
                        type="button"
                        id={`movie-trailer-btn-${movie.id}`}
                        className="trailer-pill-btn"
                        onClick={() => onWatchTrailer(movie)}
                        aria-label={`Watch official trailer for ${displayTitle}`}
                      >
                        <Play size={11} aria-hidden="true" fill="currentColor" />
                        <span>{t.watchTrailer}</span>
                      </button>
                    )}
                  </div>

                  <p className="movie-card__synopsis">{displaySynopsis}</p>

                  <p className="movie-card__cast">
                    <span>{lang === 'zh' ? '主演' : 'FEATURING'}</span> {movie.castLead.join(' · ')}
                  </p>

                  {movie.editorialPickReason && (
                    <p className="movie-card__curator-note">{movie.editorialPickReason}</p>
                  )}
                </div>
              </div>

              <div className="movie-card__venues-col">
                <div className="venues-header">
                  <span>{t.maisonsScreening(venues.length)}</span>
                  <span className="venues-header__hint">
                    {lang === 'zh'
                      ? '点击场次查看详情 · 书签加入好友对比'
                      : 'Select hour for dossier · Bookmark for folio'}
                  </span>
                </div>

                {venues.length > 1 && (() => {
                  let cheapest: { cinema: Cinema; session: ScreeningSession; km: number } | null =
                    null;
                  let closest: { cinema: Cinema; km: number } | null = null;
                  let bestFmt: { cinema: Cinema; format: FormatType; rank: number } | null = null;

                  for (const v of venues) {
                    const km = getCinemaDistanceInfo(v.cinema, userOrigin).km;
                    if (!closest || km < closest.km) {
                      closest = { cinema: v.cinema, km };
                    }
                    for (const s of v.sessions) {
                      if (
                        !cheapest ||
                        s.priceAud < cheapest.session.priceAud ||
                        (s.priceAud === cheapest.session.priceAud && km < cheapest.km)
                      ) {
                        cheapest = { cinema: v.cinema, session: s, km };
                      }
                      const rank = FORMAT_RANK[s.format] ?? 1;
                      if (!bestFmt || rank > bestFmt.rank) {
                        bestFmt = { cinema: v.cinema, format: s.format, rank };
                      }
                    }
                  }

                  return (
                    <div
                      className="film-quick-verdict"
                      aria-label={lang === 'zh' ? '快捷选座建议' : 'Quick venue highlights'}
                    >
                      {cheapest && (
                        <button
                          type="button"
                          className="verdict-jump-pill verdict-jump-pill--deal"
                          onClick={() => scrollToVenueRow(movie.id, cheapest!.cinema.id)}
                        >
                          <Tag size={11} aria-hidden="true" />
                          <span>
                            {lang === 'zh' ? '今日最低 ' : 'Cheapest '}
                            <strong>
                              {formatSessionPrice(
                                cheapest.session.priceAud,
                                cheapest.session.currency ?? (isShanghai ? 'CNY' : 'AUD'),
                                true
                              )}
                            </strong>
                            {' · '}
                            {getDisplayCinemaName(cheapest.cinema, lang)}
                          </span>
                        </button>
                      )}
                      {closest && (
                        <button
                          type="button"
                          className="verdict-jump-pill"
                          onClick={() => scrollToVenueRow(movie.id, closest!.cinema.id)}
                        >
                          <Compass size={11} aria-hidden="true" />
                          <span>
                            {lang === 'zh' ? '最近 ' : 'Closest '}
                            <strong>{formatDistanceKm(closest.km, lang)}</strong>
                            {' · '}
                            {getDisplayCinemaName(closest.cinema, lang)}
                          </span>
                        </button>
                      )}
                      {bestFmt && bestFmt.rank > 1 && (
                        <button
                          type="button"
                          className="verdict-jump-pill verdict-jump-pill--format"
                          onClick={() => scrollToVenueRow(movie.id, bestFmt!.cinema.id)}
                        >
                          <Sparkles size={11} aria-hidden="true" />
                          <span>
                            <strong>{bestFmt.format}</strong>
                            {' · '}
                            {getDisplayCinemaName(bestFmt.cinema, lang)}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                <div className="venue-schedule-stack">
                  {venues.map(({ cinema, sessions }) => {
                    const isFav = favoriteCinemaIds.has(cinema.id);
                    const dist = getCinemaDistanceInfo(cinema, userOrigin);
                    const displayCinemaName = getDisplayCinemaName(cinema, lang);
                    return (
                      <div
                        key={cinema.id}
                        id={`venue-row-${movie.id}-${cinema.id}`}
                        className="venue-schedule-row"
                      >
                        <div className="venue-schedule-row__info">
                          <div className="venue-schedule-row__title-line">
                            <button
                              type="button"
                              id={`movie-venue-fav-${movie.id}-${cinema.id}`}
                              className={`fav-inline-btn ${isFav ? 'fav-inline-btn--active' : ''}`}
                              aria-pressed={isFav}
                              aria-label={
                                isFav
                                  ? `Remove ${displayCinemaName} from favorites`
                                  : `Add ${displayCinemaName} to favorites`
                              }
                              title={isFav ? 'Favorited cinema' : 'Add cinema to favorites'}
                              onClick={() => onToggleFavoriteCinema(cinema.id)}
                            >
                              <Heart
                                size={13}
                                aria-hidden="true"
                                fill={isFav ? 'currentColor' : 'none'}
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
                              {formatDistanceKm(dist.km)} {dist.compactSuffix}
                            </span>
                          </p>
                          <p className="venue-schedule-row__transit">
                            <Train size={11} aria-hidden="true" />
                            <span>{cinema.transitNote}</span>
                          </p>
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
                              id={`movie-venue-maps-${movie.id}-${cinema.id}`}
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
                          timeZone={timeZone ?? (isShanghai ? 'Asia/Shanghai' : 'Australia/Melbourne')}
                          lang={lang}
                          showDateGroups={isMultiDay}
                          shortlistedIds={shortlistedIds}
                          onSelectSession={onSelectSession}
                          onToggleShortlist={onToggleShortlist}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
