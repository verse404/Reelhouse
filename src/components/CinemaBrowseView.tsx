import { useState } from 'react';
import {
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Navigation,
  Play,
  Sparkles,
  Train,
  Wine,
} from 'lucide-react';
import type { AppLanguage, Cinema, Movie, ScreeningSession } from '../types/cinema';
import { formatDistanceKm, formatRuntime } from '../utils/formatters';
import { getDisplayCinemaName, getDisplayMovieTitle, getUiText } from '../utils/i18n';
import { getCinemaDistanceInfo, type UserLocationOrigin } from '../utils/proximity';
import {
  buildSafeGoogleMapsDirectionsUrl,
  buildSafeGoogleMapsUrl,
  getSafeOutboundCinemaUrl,
} from '../utils/security';
import { MoviePoster } from './MoviePoster';
import { RatingsPillBar } from './RatingsPillBar';
import { SessionPill } from './SessionPill';

export interface CinemaWithMovieSessions {
  cinema: Cinema;
  movies: Array<{
    movie: Movie;
    sessions: ScreeningSession[];
  }>;
  totalSessions: number;
}

interface CinemaBrowseViewProps {
  items: CinemaWithMovieSessions[];
  isShanghai?: boolean;
  lang?: AppLanguage;
  userOrigin: UserLocationOrigin;
  shortlistedIds: Set<string>;
  favoriteCinemaIds: Set<string>;
  favoritesOnlyActive: boolean;
  hiddenPastTodayCount: number;
  onSelectSession: (session: ScreeningSession) => void;
  onToggleShortlist: (sessionId: string) => void;
  onToggleFavoriteCinema: (cinemaId: string) => void;
  onInspectRatings: (movie: Movie) => void;
  onWatchTrailer: (movie: Movie) => void;
  onShowPastToday: () => void;
  onResetFilters: () => void;
}

type CinemaSortOption = 'indie' | 'distance' | 'sessions';

export function CinemaBrowseView({
  items,
  isShanghai = false,
  lang = 'en',
  userOrigin,
  shortlistedIds,
  favoriteCinemaIds,
  favoritesOnlyActive,
  hiddenPastTodayCount,
  onSelectSession,
  onToggleShortlist,
  onToggleFavoriteCinema,
  onInspectRatings,
  onWatchTrailer,
  onShowPastToday,
  onResetFilters,
}: CinemaBrowseViewProps) {
  const [sortBy, setSortBy] = useState<CinemaSortOption>('indie');
  const t = getUiText(lang);
  const effectiveSortBy: CinemaSortOption =
    userOrigin.isCustomOrigin && sortBy === 'indie' ? 'distance' : sortBy;

  if (items.length === 0) {
    return (
      <div className="empty-state" role="status">
        <h2 className="empty-state__title">
          {favoritesOnlyActive
            ? 'No favorite cinemas match this selection yet'
            : hiddenPastTodayCount > 0
              ? 'Remaining screenings for today have already begun'
              : 'No cinemas match these filters'}
        </h2>
        <p className="empty-state__body">
          {favoritesOnlyActive
            ? 'Tap the heart button ("Favorite") on any cinema card or venue row to build your personal list of favorite houses, or reset filters to browse all venues.'
            : hiddenPastTodayCount > 0
              ? `${hiddenPastTodayCount} matching ${
                  hiddenPastTodayCount === 1 ? 'session has' : 'sessions have'
                } already started earlier today — pick Tomorrow above or reveal earlier sessions.`
              : 'Reset your chain, suburb, format, rating, or price filters to view all venues and schedules.'}
        </p>
        <div className="empty-state__actions">
          {hiddenPastTodayCount > 0 && (
            <button
              type="button"
              id="cinema-empty-show-past-btn"
              className="btn-secondary"
              onClick={onShowPastToday}
            >
              Show Earlier Today ({hiddenPastTodayCount})
            </button>
          )}
          <button
            type="button"
            id="cinema-empty-reset-btn"
            className="btn-primary"
            onClick={onResetFilters}
          >
            Show All Cinemas
          </button>
        </div>
      </div>
    );
  }

  const vibePriority: Record<Cinema['vibe'], number> = {
    'Heritage Palace': 1,
    'Indie & Arthouse': 2,
    'Grand Format': 3,
    'Boutique Luxury': 4,
    'Major Multiplex': 5,
  };

  const sortedItems = [...items].sort((a, b) => {
    const aFav = favoriteCinemaIds.has(a.cinema.id) ? 1 : 0;
    const bFav = favoriteCinemaIds.has(b.cinema.id) ? 1 : 0;
    if (bFav !== aFav) return bFav - aFav;

    const aDist = getCinemaDistanceInfo(a.cinema, userOrigin).km;
    const bDist = getCinemaDistanceInfo(b.cinema, userOrigin).km;

    if (effectiveSortBy === 'distance') {
      return aDist - bDist;
    }
    if (effectiveSortBy === 'sessions') {
      return b.totalSessions - a.totalSessions;
    }
    const diff = vibePriority[a.cinema.vibe] - vibePriority[b.cinema.vibe];
    if (diff !== 0) return diff;
    return aDist - bDist;
  });

  return (
    <section className="results-section" aria-label="Cinemas and daily programmes">
      <div className="results-toolbar">
        <h2 className="results-toolbar__heading">
          {t.cinemasScreening(sortedItems.length)}
        </h2>
        <label className="inline-select">
          <span className="inline-select__label">
            {lang === 'zh' ? '影院排序' : 'Order Venues'}
          </span>
          <select
            id="cinema-sort-select"
            value={effectiveSortBy}
            onChange={(e) => setSortBy(e.target.value as CinemaSortOption)}
            className="inline-select__control"
          >
            <option value="indie">{lang === 'zh' ? '艺术与老牌影院优先' : 'Heritage & Indie First'}</option>
            <option value="distance">
              {lang === 'zh'
                ? `距我最近 (${userOrigin.id === 'gps' ? '当前位置' : userOrigin.shortLabel})`
                : userOrigin.isCustomOrigin
                  ? `Closest to ${userOrigin.id === 'gps' ? 'You' : userOrigin.shortLabel}`
                  : 'Closest to CBD'}
            </option>
            <option value="sessions">{lang === 'zh' ? '今日排片最多' : 'Most Daily Sessions'}</option>
          </select>
        </label>
      </div>

      <div className="cinema-list">
        {sortedItems.map(({ cinema, movies }) => {
          const safeUrl = getSafeOutboundCinemaUrl(cinema.bookingDomainUrl);
          const googleMapsUrl = userOrigin.isCustomOrigin
            ? buildSafeGoogleMapsDirectionsUrl(
                userOrigin.lat,
                userOrigin.lng,
                cinema.name,
                cinema.address
              )
            : buildSafeGoogleMapsUrl(cinema.name, cinema.address);
          const isFav = favoriteCinemaIds.has(cinema.id);
          const dist = getCinemaDistanceInfo(cinema, userOrigin);
          const displayCinemaName = getDisplayCinemaName(cinema, lang);
          return (
            <article
              key={cinema.id}
              className={`cinema-card ${isFav ? 'cinema-card--favorited' : ''}`}
              id={`cinema-card-${cinema.id}`}
            >
              <div className="cinema-card__header">
                <div className="cinema-card__identity">
                  <div className="cinema-card__topline">
                    <span className="chain-tag">{cinema.chain}</span>
                    <span className="vibe-tag vibe-tag--prominent">{cinema.vibe}</span>
                    <span className="cinema-card__suburb">
                      <MapPin size={13} aria-hidden="true" />
                      {cinema.suburb} · {formatDistanceKm(dist.km)} {dist.fullSuffix}
                    </span>
                    <span className="cinema-card__screens">
                      {cinema.screenCount} {cinema.screenCount === 1 ? 'screen' : 'screens'}
                    </span>
                  </div>

                  <h3 className="cinema-card__name">{displayCinemaName}</h3>
                  <p className="cinema-card__address">{cinema.address}</p>

                  <div className="cinema-card__perks">
                    <span className="perk-item">
                      <Train size={13} aria-hidden="true" />
                      {cinema.transitNote}
                    </span>
                    <span className="perk-item">
                      <Wine size={13} aria-hidden="true" />
                      {cinema.barAndFoodNote}
                    </span>
                    <span className="perk-item perk-item--deal">
                      <Sparkles size={13} aria-hidden="true" />
                      {cinema.dealHighlight}
                    </span>
                  </div>
                </div>

                <div className="cinema-card__side">
                  <div className="cinema-card__formats">
                    {cinema.supportedFormats.map((fmt) => (
                      <span key={fmt} className="format-outline-chip">
                        {fmt}
                      </span>
                    ))}
                  </div>
                  <div className="cinema-card__cta-group">
                    <button
                      type="button"
                      id={`cinema-fav-btn-${cinema.id}`}
                      className={`fav-maison-btn ${isFav ? 'fav-maison-btn--active' : ''}`}
                      aria-pressed={isFav}
                      aria-label={
                        isFav
                          ? `Remove ${displayCinemaName} from favorite cinemas`
                          : `Add ${displayCinemaName} to favorite cinemas`
                      }
                      onClick={() => onToggleFavoriteCinema(cinema.id)}
                    >
                      <Heart
                        size={13}
                        aria-hidden="true"
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                      <span>{isFav ? t.favorited : t.favorite}</span>
                    </button>

                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      id={`cinema-maps-link-${cinema.id}`}
                      className="maps-action-btn"
                      aria-label={`Open ${displayCinemaName} (${cinema.suburb}) in Google Maps`}
                    >
                      <Navigation size={12} aria-hidden="true" />
                      <span>{userOrigin.isCustomOrigin ? t.directions : t.googleMaps}</span>
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>

                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        id={`cinema-site-link-${cinema.id}`}
                        className="venue-link"
                      >
                        <span>{lang === 'zh' ? '影院官网' : 'Official Venue Site'}</span>
                        <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="cinema-programme">
                {movies.map(({ movie, sessions }) => {
                  const displayMovieTitle = getDisplayMovieTitle(movie, lang, isShanghai);
                  return (
                  <div key={movie.id} className="programme-film-row">
                    <div className="programme-film-row__movie">
                      <MoviePoster movie={movie} size="sm" />
                      <div>
                        <h4 className="programme-film-row__title">{displayMovieTitle}</h4>
                        <p className="programme-film-row__meta">
                          <span className="rating-badge">{movie.classification}</span>
                          <span>
                            <Clock size={12} aria-hidden="true" />{' '}
                            {formatRuntime(movie.runtimeMinutes)}
                          </span>
                          <span>{movie.genres.slice(0, 2).join(' · ')}</span>
                        </p>
                        <div className="programme-film-row__ratings">
                          <RatingsPillBar
                            movie={movie}
                            compact
                            contextKey={cinema.id}
                            onInspectRatings={onInspectRatings}
                          />
                          {movie.trailerYoutubeKey && (
                            <button
                              type="button"
                              id={`cinema-trailer-btn-${cinema.id}-${movie.id}`}
                              className="trailer-pill-btn trailer-pill-btn--compact"
                              onClick={() => onWatchTrailer(movie)}
                              aria-label={`Watch official trailer for ${displayMovieTitle}`}
                            >
                              <Play size={10} aria-hidden="true" fill="currentColor" />
                              <span>{t.trailer}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="session-pills-wrap">
                      {sessions.map((session) => (
                        <SessionPill
                          key={session.id}
                          session={session}
                          lang={lang}
                          isShortlisted={shortlistedIds.has(session.id)}
                          onSelectSession={onSelectSession}
                          onToggleShortlist={onToggleShortlist}
                        />
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
