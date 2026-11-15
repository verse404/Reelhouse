import { useState } from 'react';
import { Clock, ExternalLink, Heart, MapPin, Navigation, Play, Train } from 'lucide-react';
import type { Cinema, Movie, ScreeningSession } from '../types/cinema';
import { formatDistanceKm, formatRuntime } from '../utils/formatters';
import { getCinemaDistanceInfo, type UserLocationOrigin } from '../utils/proximity';
import {
  buildSafeGoogleMapsDirectionsUrl,
  buildSafeGoogleMapsUrl,
} from '../utils/security';
import { MoviePoster } from './MoviePoster';
import { RatingsPillBar } from './RatingsPillBar';
import { SessionPill } from './SessionPill';

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

export function MovieBrowseView({
  items,
  isShanghai = false,
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

  if (items.length === 0) {
    return (
      <div className="empty-state" role="status">
        <h2 className="empty-state__title">
          {favoritesOnlyActive
            ? 'No screenings at your favorite cinemas match this selection'
            : hiddenPastTodayCount > 0
              ? 'Remaining screenings for today have already begun'
              : 'No screenings match the current selection'}
        </h2>
        <p className="empty-state__body">
          {favoritesOnlyActive
            ? 'Tap the heart icon next to any cinema name to add favorite houses, or restore the full archive to browse every venue.'
            : hiddenPastTodayCount > 0
              ? `${hiddenPastTodayCount} matching ${
                  hiddenPastTodayCount === 1 ? 'session has' : 'sessions have'
                } already started earlier today — select Tomorrow or another date above, or reveal earlier sessions.`
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
              Show Earlier Today ({hiddenPastTodayCount})
            </button>
          )}
          <button
            type="button"
            id="empty-reset-filters-btn"
            className="btn-primary"
            onClick={onResetFilters}
          >
            Restore Full Archive
          </button>
          {cheapTuesdayIso && (
            <button
              type="button"
              id="empty-jump-tuesday-btn"
              className="btn-secondary"
              onClick={onJumpToCheapTuesday}
            >
              View Cheap Tuesday
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
            {sortedItems.length} {sortedItems.length === 1 ? 'Work' : 'Works'} in Projection
          </h2>
        </div>

        <label className="inline-select">
          <span className="inline-select__label">Order</span>
          <select
            id="movie-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as MovieSortOption)}
            className="inline-select__control"
          >
            <option value="recommended">Curator’s Sequence</option>
            <option value="imdb">Highest IMDb Score</option>
            <option value="rt">Highest Rotten Tomatoes</option>
            <option value="douban">Highest Douban (豆瓣)</option>
            <option value="sessions">Most Daily Sessions</option>
            <option value="shortest">Shortest Duration</option>
          </select>
        </label>
      </div>

      <div className="movie-list">
        {sortedItems.map(({ movie, venues }, index) => {
          const catalogNumber = String(index + 1).padStart(2, '0');

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
                    <span className="auteur-credit">A FILM BY {movie.director.toUpperCase()}</span>
                    <span
                      className={`rating-badge rating-badge--${movie.classification
                        .toLowerCase()
                        .replace('+', 'plus')}`}
                    >
                      {movie.classification}
                    </span>
                    <span className="meta-inline">
                      <Clock size={12} aria-hidden="true" />
                      {formatRuntime(movie.runtimeMinutes)}
                    </span>
                  </div>

                  <h3 className="movie-card__title">
                    {isShanghai &&
                    movie.ratings.douban.chineseTitle &&
                    movie.ratings.douban.chineseTitle !== movie.title
                      ? `${movie.title} · ${movie.ratings.douban.chineseTitle}`
                      : movie.title}
                  </h3>
                  <p className="movie-card__epigraph">“{movie.tagline}”</p>

                  <p className="movie-card__byline">
                    {movie.genres.join(' · ')} — {movie.languageNote} ({movie.countryOrigin},{' '}
                    {movie.releaseYear})
                  </p>

                  <div className="movie-card__ratings-row">
                    <RatingsPillBar movie={movie} onInspectRatings={onInspectRatings} />
                    {movie.trailerYoutubeKey && (
                      <button
                        type="button"
                        id={`movie-trailer-btn-${movie.id}`}
                        className="trailer-pill-btn"
                        onClick={() => onWatchTrailer(movie)}
                        aria-label={`Watch official trailer for ${movie.title}`}
                      >
                        <Play size={11} aria-hidden="true" fill="currentColor" />
                        <span>Watch Trailer</span>
                      </button>
                    )}
                  </div>

                  <p className="movie-card__synopsis">{movie.synopsis}</p>

                  <p className="movie-card__cast">
                    <span>FEATURING</span> {movie.castLead.join(' · ')}
                  </p>

                  {movie.editorialPickReason && (
                    <p className="movie-card__curator-note">{movie.editorialPickReason}</p>
                  )}
                </div>
              </div>

              <div className="movie-card__venues-col">
                <div className="venues-header">
                  <span>
                    {venues.length} {venues.length === 1 ? 'MAISON' : 'MAISONS'} SCREENING
                  </span>
                  <span className="venues-header__hint">
                    Select hour for dossier · Bookmark for folio
                  </span>
                </div>

                <div className="venue-schedule-stack">
                  {venues.map(({ cinema, sessions }) => {
                    const isFav = favoriteCinemaIds.has(cinema.id);
                    const dist = getCinemaDistanceInfo(cinema, userOrigin);
                    return (
                      <div key={cinema.id} className="venue-schedule-row">
                        <div className="venue-schedule-row__info">
                          <div className="venue-schedule-row__title-line">
                            <button
                              type="button"
                              id={`movie-venue-fav-${movie.id}-${cinema.id}`}
                              className={`fav-inline-btn ${isFav ? 'fav-inline-btn--active' : ''}`}
                              aria-pressed={isFav}
                              aria-label={
                                isFav
                                  ? `Remove ${cinema.name} from favorites`
                                  : `Add ${cinema.name} to favorites`
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
                            <h4 className="venue-schedule-row__name">{cinema.name}</h4>
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
                              aria-label={`Open ${cinema.name} on Google Maps`}
                            >
                              <Navigation size={11} aria-hidden="true" />
                              <span>
                                {userOrigin.isCustomOrigin ? 'Directions' : 'Google Maps'}
                              </span>
                              <ExternalLink size={10} aria-hidden="true" />
                            </a>
                          </div>
                        </div>

                        <div className="session-pills-wrap">
                          {sessions.map((session) => (
                            <SessionPill
                              key={session.id}
                              session={session}
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
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
