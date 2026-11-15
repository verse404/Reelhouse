import { useEffect } from 'react';
import {
  Bookmark,
  CalendarPlus,
  Check,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Navigation,
  Play,
  Sparkles,
  Ticket,
  Train,
  Wine,
  X,
} from 'lucide-react';
import type { Cinema, CityMeta, Movie, ScreeningSession } from '../types/cinema';
import {
  formatCalendarChipParts,
  formatDistanceKm,
  formatRuntime,
  formatSessionPrice,
  formatSessionWindow,
} from '../utils/formatters';
import { getCinemaDistanceInfo, type UserLocationOrigin } from '../utils/proximity';
import {
  buildSafeGoogleCalendarUrl,
  buildSafeGoogleMapsDirectionsUrl,
  buildSafeGoogleMapsUrl,
  getSafeOutboundCinemaUrl,
} from '../utils/security';
import { MoviePoster } from './MoviePoster';
import { RatingsPillBar } from './RatingsPillBar';

interface SessionDetailModalProps {
  session: ScreeningSession | null;
  movie: Movie | null;
  cinema: Cinema | null;
  cityMeta: CityMeta;
  userOrigin: UserLocationOrigin;
  isShortlisted: boolean;
  isFavoriteCinema: boolean;
  hasTopOverlay?: boolean;
  onClose: () => void;
  onToggleShortlist: (sessionId: string) => void;
  onToggleFavoriteCinema: (cinemaId: string) => void;
  onInspectRatings: (movie: Movie) => void;
  onWatchTrailer: (movie: Movie) => void;
}

export function SessionDetailModal({
  session,
  movie,
  cinema,
  cityMeta,
  userOrigin,
  isShortlisted,
  isFavoriteCinema,
  hasTopOverlay = false,
  onClose,
  onToggleShortlist,
  onToggleFavoriteCinema,
  onInspectRatings,
  onWatchTrailer,
}: SessionDetailModalProps) {
  useEffect(() => {
    if (!session || hasTopOverlay) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, hasTopOverlay, onClose]);

  if (!session || !movie || !cinema) return null;

  const dateParts = formatCalendarChipParts(session.dateIso, cityMeta.timeZone);
  const timeWindow = formatSessionWindow(
    session.startMinutesFromMidnight,
    movie.runtimeMinutes
  );
  const safeBookingUrl = getSafeOutboundCinemaUrl(cinema.bookingDomainUrl);
  const googleMapsUrl = userOrigin.isCustomOrigin
    ? buildSafeGoogleMapsDirectionsUrl(
        userOrigin.lat,
        userOrigin.lng,
        cinema.name,
        cinema.address
      )
    : buildSafeGoogleMapsUrl(cinema.name, cinema.address);
  const googleCalendarUrl = buildSafeGoogleCalendarUrl({
    movieTitle: movie.title,
    director: movie.director,
    format: session.format,
    auditoriumName: session.auditoriumName,
    cinemaName: cinema.name,
    address: cinema.address,
    dateIso: session.dateIso,
    startMinutesFromMidnight: session.startMinutesFromMidnight,
    runtimeMinutes: movie.runtimeMinutes,
    timeZone: cityMeta.timeZone,
    bookingUrl: safeBookingUrl,
  });
  const savings = session.regularPriceAud - session.priceAud;
  const sessionCurrency = session.currency ?? cityMeta.currency;
  const dist = getCinemaDistanceInfo(cinema, userOrigin);
  const displayMovieTitle =
    cityMeta.id === 'shanghai' &&
    movie.ratings.douban.chineseTitle &&
    movie.ratings.douban.chineseTitle !== movie.title
      ? `${movie.title} · ${movie.ratings.douban.chineseTitle}`
      : movie.title;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-sheet modal-sheet--ticket"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-modal-title"
      >
        <div className="modal-sheet__header">
          <div className="ticket-kicker">
            <Ticket size={15} aria-hidden="true" />
            <span>Screening Summary · {cityMeta.name}</span>
          </div>
          <button
            type="button"
            id="close-session-modal-btn"
            className="icon-close-btn"
            onClick={onClose}
            aria-label="Close session summary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="ticket-hero">
          <MoviePoster movie={movie} size="sm" />
          <div className="ticket-hero__info">
            <div className="movie-card__badges">
              <span className="rating-badge">{movie.classification}</span>
              <span className="format-highlight-badge">{session.format}</span>
              {session.dealLabel && (
                <span className="deal-inline-badge">
                  <Sparkles size={12} aria-hidden="true" />
                  {session.dealLabel}
                </span>
              )}
            </div>
            <h2 id="session-modal-title" className="ticket-hero__title">
              {displayMovieTitle}
            </h2>
            <p className="ticket-hero__sub">
              Directed by {movie.director} · {formatRuntime(movie.runtimeMinutes)} ·{' '}
              {movie.languageNote}
            </p>
            <div className="ticket-hero__ratings">
              <RatingsPillBar
                movie={movie}
                compact
                contextKey="session-modal"
                onInspectRatings={onInspectRatings}
              />
              {movie.trailerYoutubeKey && (
                <button
                  type="button"
                  id="modal-watch-trailer-btn"
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

        <div className="ticket-stub-grid">
          <div className="ticket-stub-cell">
            <span className="ticket-stub-cell__label">Date</span>
            <strong className="ticket-stub-cell__value">{dateParts.fullLabel}</strong>
          </div>

          <div className="ticket-stub-cell">
            <span className="ticket-stub-cell__label">Start → Est. Finish (incl. 15m previews)</span>
            <strong className="ticket-stub-cell__value ticket-stub-cell__value--mono">
              <Clock size={14} aria-hidden="true" />
              {timeWindow.startFormatted} → {timeWindow.finishFormatted}
              {timeWindow.nextDay ? ' (+1d)' : ''}
            </strong>
          </div>

          <div className="ticket-stub-cell">
            <span className="ticket-stub-cell__label">Cinema &amp; Auditorium</span>
            <strong className="ticket-stub-cell__value">{cinema.name}</strong>
            <span className="ticket-stub-cell__sub">
              {cinema.chain} · {session.auditoriumName}
            </span>
          </div>

          <div className="ticket-stub-cell">
            <span className="ticket-stub-cell__label">
              Adult Guide Price{' '}
              <span className="guide-price-tag">
                {session.priceBasis === 'scraped_live' ? 'Live-Scraped Tariff' : 'Guide Price'}
              </span>
            </span>
            <strong className="ticket-stub-cell__value ticket-stub-cell__value--price">
              {formatSessionPrice(session.priceAud, sessionCurrency)}
              {savings > 0.01 && (
                <span className="price-strike">
                  Reg. {formatSessionPrice(session.regularPriceAud, sessionCurrency)}
                </span>
              )}
            </strong>
            {savings > 0.01 && (
              <span className="ticket-stub-cell__saving">
                {session.dealLabel ? `${session.dealLabel} · ` : ''}Save{' '}
                {formatSessionPrice(savings, sessionCurrency)} off regular box office
              </span>
            )}
            {session.priceNote && (
              <span className="ticket-stub-cell__price-note">{session.priceNote}</span>
            )}
          </div>
        </div>

        <div className="ticket-logistics">
          <div className="ticket-logistics__location-row">
            <p>
              <MapPin size={14} aria-hidden="true" />
              <span>
                <strong>{cinema.suburb}</strong> ({formatDistanceKm(dist.km)} {dist.fullSuffix}) —{' '}
                {cinema.address}
              </span>
            </p>
            <div className="modal-venue-actions">
              <button
                type="button"
                id="modal-fav-cinema-btn"
                className={`fav-maison-btn ${isFavoriteCinema ? 'fav-maison-btn--active' : ''}`}
                aria-pressed={isFavoriteCinema}
                onClick={() => onToggleFavoriteCinema(cinema.id)}
              >
                <Heart
                  size={13}
                  aria-hidden="true"
                  fill={isFavoriteCinema ? 'currentColor' : 'none'}
                />
                <span>{isFavoriteCinema ? 'Favorited' : 'Favorite'}</span>
              </button>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="modal-google-maps-link"
                className="maps-action-btn"
                aria-label={`Open ${cinema.name} in Google Maps`}
              >
                <Navigation size={12} aria-hidden="true" />
                <span>{userOrigin.isCustomOrigin ? 'Directions' : 'Google Maps'}</span>
                <ExternalLink size={11} aria-hidden="true" />
              </a>

              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="modal-google-calendar-link"
                className="maps-action-btn"
                aria-label={`Add ${movie.title} at ${cinema.name} to Google Calendar`}
              >
                <CalendarPlus size={12} aria-hidden="true" />
                <span>Google Calendar</span>
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </div>
          </div>
          <p>
            <Train size={14} aria-hidden="true" />
            <span>{cinema.transitNote}</span>
          </p>
          <p>
            <Wine size={14} aria-hidden="true" />
            <span>{cinema.barAndFoodNote}</span>
          </p>
          {session.accessibilityTags.length > 0 && (
            <div className="accessibility-row">
              {session.accessibilityTags.map((tag) => (
                <span key={tag} className="access-chip">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="modal-sheet__footer">
          <button
            type="button"
            id="modal-toggle-shortlist-btn"
            className={isShortlisted ? 'btn-secondary btn-secondary--active' : 'btn-secondary'}
            onClick={() => onToggleShortlist(session.id)}
          >
            {isShortlisted ? <Check size={16} /> : <Bookmark size={16} />}
            <span>{isShortlisted ? 'Pinned in Shortlist' : 'Pin to Compare'}</span>
          </button>

          {safeBookingUrl && (
            <a
              href={safeBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="modal-official-booking-link"
              className="btn-primary"
            >
              <span>Book at {cinema.name}</span>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
