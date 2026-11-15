import { useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Navigation,
  Play,
  Sparkles,
  Train,
} from 'lucide-react';
import type { BrowseMode, Cinema, CityMeta, Movie, UpcomingVenuePreview } from '../types/cinema';
import {
  formatAustralianReleaseDate,
  formatDistanceKm,
  formatRuntime,
  getDaysUntilRelease,
} from '../utils/formatters';
import { getCinemaDistanceInfo, type UserLocationOrigin } from '../utils/proximity';
import { buildSafeGoogleMapsUrl, getSafeOutboundCinemaUrl } from '../utils/security';
import { MoviePoster } from './MoviePoster';
import { RatingsPillBar } from './RatingsPillBar';

export interface ComingSoonMovieItem {
  movie: Movie;
  cityVenues: Array<{
    cinema: Cinema;
    preview: UpcomingVenuePreview;
  }>;
}

interface ComingSoonViewProps {
  items: ComingSoonMovieItem[];
  cityMeta: CityMeta;
  userOrigin: UserLocationOrigin;
  browseMode: BrowseMode;
  watchlistedIds: Set<string>;
  favoriteCinemaIds: Set<string>;
  onToggleWatchlist: (movieId: string) => void;
  onToggleFavoriteCinema: (cinemaId: string) => void;
  onInspectRatings: (movie: Movie) => void;
  onWatchTrailer: (movie: Movie) => void;
  onResetFilters: () => void;
}

type ComingSoonSort = 'release_date' | 'imdb' | 'rt' | 'douban';
type ComingSoonHouseSort = 'indie' | 'distance' | 'premieres';

export function ComingSoonView({
  items,
  cityMeta,
  userOrigin,
  browseMode,
  watchlistedIds,
  favoriteCinemaIds,
  onToggleWatchlist,
  onToggleFavoriteCinema,
  onInspectRatings,
  onWatchTrailer,
  onResetFilters,
}: ComingSoonViewProps) {
  const [sortBy, setSortBy] = useState<ComingSoonSort>('release_date');
  const [houseSortBy, setHouseSortBy] = useState<ComingSoonHouseSort>('indie');
  const [watchlistOnly, setWatchlistOnly] = useState(false);

  const visibleItems = watchlistOnly
    ? items.filter((item) => watchlistedIds.has(item.movie.id))
    : items;

  if (visibleItems.length === 0) {
    return (
      <div className="empty-state" role="status">
        <h2 className="empty-state__title">
          {watchlistOnly
            ? 'Your Coming Soon watchlist has no matches here'
            : 'No forthcoming premieres match these filters'}
        </h2>
        <p className="empty-state__body">
          {watchlistOnly
            ? 'Save upcoming titles using "+ Save to Watchlist", or view the full forthcoming season.'
            : 'Restore the full archive to explore upcoming Melbourne and Sydney premieres, 35mm previews, and Boxing Day galas.'}
        </p>
        <div className="empty-state__actions">
          {watchlistOnly ? (
            <button
              type="button"
              id="show-all-coming-soon-btn"
              className="btn-primary"
              onClick={() => setWatchlistOnly(false)}
            >
              View All Forthcoming Works
            </button>
          ) : (
            <button
              type="button"
              id="coming-soon-reset-btn"
              className="btn-primary"
              onClick={onResetFilters}
            >
              Restore Full Archive
            </button>
          )}
        </div>
      </div>
    );
  }

  const sortedMovies = [...visibleItems].sort((a, b) => {
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
    return (a.movie.releaseDateIso ?? '').localeCompare(b.movie.releaseDateIso ?? '');
  });

  // If user is in "Maisons & Houses" mode, group upcoming premieres by Cinema House!
  if (browseMode === 'cinemas') {
    const byCinema = new Map<
      string,
      {
        cinema: Cinema;
        entries: Array<{ movie: Movie; preview: UpcomingVenuePreview }>;
      }
    >();

    for (const { movie, cityVenues } of sortedMovies) {
      for (const { cinema, preview } of cityVenues) {
        let group = byCinema.get(cinema.id);
        if (!group) {
          group = { cinema, entries: [] };
          byCinema.set(cinema.id, group);
        }
        group.entries.push({ movie, preview });
      }
    }

    const vibePriority: Record<Cinema['vibe'], number> = {
      'Heritage Palace': 1,
      'Indie & Arthouse': 2,
      'Grand Format': 3,
      'Boutique Luxury': 4,
      'Major Multiplex': 5,
    };

    const effectiveHouseSort: ComingSoonHouseSort =
      userOrigin.isCustomOrigin && houseSortBy === 'indie' ? 'distance' : houseSortBy;

    const houseGroups = Array.from(byCinema.values()).sort((a, b) => {
      const aFav = favoriteCinemaIds.has(a.cinema.id) ? 1 : 0;
      const bFav = favoriteCinemaIds.has(b.cinema.id) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;

      const aDist = getCinemaDistanceInfo(a.cinema, userOrigin).km;
      const bDist = getCinemaDistanceInfo(b.cinema, userOrigin).km;

      if (effectiveHouseSort === 'distance') {
        return aDist - bDist;
      }
      if (effectiveHouseSort === 'premieres') {
        return b.entries.length - a.entries.length;
      }
      const diff = vibePriority[a.cinema.vibe] - vibePriority[b.cinema.vibe];
      if (diff !== 0) return diff;
      return aDist - bDist;
    });

    return (
      <section className="results-section" aria-label="Forthcoming premieres by cinema house">
        <div className="results-toolbar">
          <div className="results-toolbar__title-group">
            <span className="results-toolbar__kicker">AVANT-PREMIÈRES BY MAISON</span>
            <h2 className="results-toolbar__heading">
              {houseGroups.length} {cityMeta.name}{' '}
              {houseGroups.length === 1 ? 'House' : 'Houses'} Hosting Upcoming Premieres
            </h2>
          </div>

          <div className="cs-toolbar-controls">
            <button
              type="button"
              id="cs-house-watchlist-filter-btn"
              className={`deal-toggle ${watchlistOnly ? 'deal-toggle--active' : ''}`}
              aria-pressed={watchlistOnly}
              onClick={() => setWatchlistOnly((prev) => !prev)}
            >
              <Bell size={13} aria-hidden="true" />
              <span>Saved Watchlist ({watchlistedIds.size})</span>
            </button>

            <label className="inline-select">
              <span className="inline-select__label">Order Venues</span>
              <select
                id="cs-house-sort-select"
                value={effectiveHouseSort}
                onChange={(e) => setHouseSortBy(e.target.value as ComingSoonHouseSort)}
                className="inline-select__control"
              >
                <option value="indie">Heritage &amp; Indie First</option>
                <option value="distance">
                  {userOrigin.isCustomOrigin
                    ? `Closest to ${userOrigin.id === 'gps' ? 'You' : userOrigin.shortLabel}`
                    : 'Closest to CBD'}
                </option>
                <option value="premieres">Most Upcoming Premieres</option>
              </select>
            </label>
          </div>
        </div>

        <div className="cinema-list">
          {houseGroups.map(({ cinema, entries }) => {
            const safeUrl = getSafeOutboundCinemaUrl(cinema.bookingDomainUrl);
            const googleMapsUrl = buildSafeGoogleMapsUrl(cinema.name, cinema.address);
            const isFav = favoriteCinemaIds.has(cinema.id);
            const dist = getCinemaDistanceInfo(cinema, userOrigin);
            return (
              <article
                key={cinema.id}
                className={`cinema-card ${isFav ? 'cinema-card--favorited' : ''}`}
                id={`coming-soon-cinema-${cinema.id}`}
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
                    </div>
                    <h3 className="cinema-card__name">{cinema.name}</h3>
                    <p className="cinema-card__address">{cinema.address}</p>
                  </div>

                  <div className="cinema-card__cta-group">
                    <button
                      type="button"
                      id={`cs-cinema-fav-${cinema.id}`}
                      className={`fav-maison-btn ${isFav ? 'fav-maison-btn--active' : ''}`}
                      aria-pressed={isFav}
                      onClick={() => onToggleFavoriteCinema(cinema.id)}
                    >
                      <Heart
                        size={13}
                        aria-hidden="true"
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                      <span>{isFav ? 'Favorited' : 'Favorite'}</span>
                    </button>

                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      id={`cs-cinema-maps-${cinema.id}`}
                      className="maps-action-btn"
                    >
                      <Navigation size={12} aria-hidden="true" />
                      <span>Google Maps</span>
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        id={`cs-cinema-site-${cinema.id}`}
                        className="venue-link"
                      >
                        <span>Advance Bookings</span>
                        <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="cinema-programme">
                  {entries.map(({ movie, preview }) => {
                    const saved = watchlistedIds.has(movie.id);
                    const releaseFormatted = movie.releaseDateIso
                      ? formatAustralianReleaseDate(movie.releaseDateIso, cityMeta.timeZone)
                      : 'Coming Soon';

                    return (
                      <div key={movie.id} className="programme-film-row">
                        <div className="programme-film-row__movie">
                          <MoviePoster movie={movie} size="sm" />
                          <div>
                            <span className="coming-release-kicker">
                              RELEASES {releaseFormatted.toUpperCase()}
                            </span>
                            <h4 className="programme-film-row__title">
                              {cityMeta.id === 'shanghai' &&
                              movie.ratings.douban.chineseTitle &&
                              movie.ratings.douban.chineseTitle !== movie.title
                                ? `${movie.title} · ${movie.ratings.douban.chineseTitle}`
                                : movie.title}
                            </h4>
                            <p className="programme-film-row__meta">
                              <span className="rating-badge">{movie.classification}</span>
                              <span>{formatRuntime(movie.runtimeMinutes)}</span>
                              <span>Dir. {movie.director}</span>
                            </p>
                            <div className="programme-film-row__ratings">
                              <RatingsPillBar
                                movie={movie}
                                compact
                                contextKey={`cs-${cinema.id}`}
                                onInspectRatings={onInspectRatings}
                              />
                              {movie.trailerYoutubeKey && (
                                <button
                                  type="button"
                                  id={`cs-house-trailer-${cinema.id}-${movie.id}`}
                                  className="trailer-pill-btn trailer-pill-btn--compact"
                                  onClick={() => onWatchTrailer(movie)}
                                  aria-label={`Watch official trailer for ${movie.title}`}
                                >
                                  <Play size={10} aria-hidden="true" fill="currentColor" />
                                  <span>Trailer</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="cs-house-preview-box">
                          <div>
                            <span className="format-highlight-badge">{preview.format}</span>
                            <p className="cs-house-preview-box__note">{preview.previewNote}</p>
                          </div>

                          <button
                            type="button"
                            id={`cs-house-watchlist-${cinema.id}-${movie.id}`}
                            className={`watchlist-btn ${saved ? 'watchlist-btn--saved' : ''}`}
                            aria-pressed={saved}
                            onClick={() => onToggleWatchlist(movie.id)}
                          >
                            {saved ? <Check size={13} /> : <Bell size={13} />}
                            <span>{saved ? 'In Watchlist' : 'Watchlist'}</span>
                          </button>
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

  return (
    <section className="results-section" aria-label="Coming soon film premieres">
      <div className="results-toolbar">
        <div className="results-toolbar__title-group">
          <span className="results-toolbar__kicker">PROCHAINEMENT · FORTHCOMING SEASON</span>
          <h2 className="results-toolbar__heading">
            {sortedMovies.length} {sortedMovies.length === 1 ? 'Premiere' : 'Premieres'} Coming to{' '}
            {cityMeta.name}
          </h2>
        </div>

        <div className="cs-toolbar-controls">
          <button
            type="button"
            id="filter-watchlist-only-btn"
            className={`deal-toggle ${watchlistOnly ? 'deal-toggle--active' : ''}`}
            aria-pressed={watchlistOnly}
            onClick={() => setWatchlistOnly((prev) => !prev)}
          >
            <Bell size={13} aria-hidden="true" />
            <span>Saved Watchlist ({watchlistedIds.size})</span>
          </button>

          <label className="inline-select">
            <span className="inline-select__label">Order</span>
            <select
              id="coming-soon-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ComingSoonSort)}
              className="inline-select__control"
            >
              <option value="release_date">Chronological Release</option>
              <option value="imdb">Festival Buzz — IMDb</option>
              <option value="rt">Festival Buzz — Rotten Tomatoes</option>
              <option value="douban">Festival Buzz — Douban (豆瓣)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="movie-list">
        {sortedMovies.map(({ movie, cityVenues }, index) => {
          const catalogNumber = String(index + 1).padStart(2, '0');
          const releaseFormatted = movie.releaseDateIso
            ? formatAustralianReleaseDate(movie.releaseDateIso, cityMeta.timeZone)
            : 'Forthcoming';
          const daysUntil = movie.releaseDateIso
            ? getDaysUntilRelease(movie.releaseDateIso, cityMeta.timeZone)
            : null;
          const isSaved = watchlistedIds.has(movie.id);

          return (
            <article key={movie.id} className="movie-card" id={`coming-soon-card-${movie.id}`}>
              <div className="movie-card__film-col">
                <div className="movie-card__poster-wrap">
                  <span className="movie-card__index" aria-hidden="true">
                    {catalogNumber}
                  </span>
                  <MoviePoster movie={movie} size="md" />
                </div>

                <div className="movie-card__details">
                  <div className="cs-release-ribbon">
                    <span className="cs-release-date">
                      <Calendar size={12} aria-hidden="true" />
                      {releaseFormatted}
                    </span>
                    {daysUntil !== null && (
                      <span className="cs-countdown-tag">
                        {daysUntil === 0 ? 'RELEASING TODAY' : `IN ${daysUntil} DAYS`}
                      </span>
                    )}
                    {movie.releaseOccasion && (
                      <span className="cs-occasion-tag">
                        <Sparkles size={11} aria-hidden="true" />
                        {movie.releaseOccasion}
                      </span>
                    )}
                  </div>

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
                    {cityMeta.id === 'shanghai' &&
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
                        id={`cs-trailer-btn-${movie.id}`}
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

                  <div className="cs-watchlist-action-row">
                    <button
                      type="button"
                      id={`watchlist-toggle-${movie.id}`}
                      className={`watchlist-btn ${isSaved ? 'watchlist-btn--saved' : ''}`}
                      aria-pressed={isSaved}
                      onClick={() => onToggleWatchlist(movie.id)}
                    >
                      {isSaved ? <Check size={14} /> : <Bell size={14} />}
                      <span>{isSaved ? 'Saved in Watchlist' : 'Save to Watchlist'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="movie-card__venues-col">
                <div className="venues-header">
                  <span>
                    {cityVenues.length} CONFIRMED {cityMeta.name.toUpperCase()}{' '}
                    {cityVenues.length === 1 ? 'MAISON' : 'MAISONS'}
                  </span>
                  <span className="venues-header__hint">
                    Advance gala previews &amp; opening engagements
                  </span>
                </div>

                <div className="venue-schedule-stack">
                  {cityVenues.map(({ cinema, preview }) => {
                    const safeUrl = getSafeOutboundCinemaUrl(cinema.bookingDomainUrl);
                    const googleMapsUrl = buildSafeGoogleMapsUrl(cinema.name, cinema.address);
                    const isFav = favoriteCinemaIds.has(cinema.id);
                    const dist = getCinemaDistanceInfo(cinema, userOrigin);

                    return (
                      <div key={cinema.id} className="venue-schedule-row">
                        <div className="venue-schedule-row__info">
                          <div className="venue-schedule-row__title-line">
                            <button
                              type="button"
                              id={`cs-venue-fav-${movie.id}-${cinema.id}`}
                              className={`fav-inline-btn ${isFav ? 'fav-inline-btn--active' : ''}`}
                              aria-pressed={isFav}
                              aria-label={
                                isFav
                                  ? `Remove ${cinema.name} from favorites`
                                  : `Add ${cinema.name} to favorites`
                              }
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
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              id={`cs-venue-maps-${movie.id}-${cinema.id}`}
                              className="maps-inline-btn"
                            >
                              <Navigation size={11} aria-hidden="true" />
                              <span>Google Maps</span>
                              <ExternalLink size={10} aria-hidden="true" />
                            </a>
                          </div>
                        </div>

                        <div className="cs-preview-ticket-card">
                          <div className="cs-preview-ticket-card__top">
                            <span className="format-highlight-badge">{preview.format}</span>
                          </div>
                          <p className="cs-preview-ticket-card__note">{preview.previewNote}</p>
                          {safeUrl && (
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              id={`cs-advance-link-${movie.id}-${cinema.id}`}
                              className="venue-link"
                            >
                              <span>Enquire / Pre-Book at Venue</span>
                              <ExternalLink size={11} aria-hidden="true" />
                            </a>
                          )}
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
