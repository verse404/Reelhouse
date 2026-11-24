import { useEffect } from 'react';
import {
  Bookmark,
  CalendarPlus,
  Check,
  Clock,
  Download,
  ExternalLink,
  Film,
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
import type { AppLanguage, Cinema, CityMeta, Movie, ScreeningSession } from '../types/cinema';
import {
  formatCalendarChipParts,
  formatDistanceKm,
  formatRuntime,
  formatSessionPrice,
  formatSessionWindow,
} from '../utils/formatters';
import { getDisplayCinemaName, getDisplayMovieTitle, getUiText } from '../utils/i18n';
import { findDoubleFeatureCandidates } from '../utils/planner';
import { getCinemaDistanceInfo, type UserLocationOrigin } from '../utils/proximity';
import {
  buildSafeGoogleCalendarUrl,
  buildSafeGoogleMapsDirectionsUrl,
  buildSafeGoogleMapsUrl,
  downloadIcsFile,
  getSafeOutboundCinemaUrl,
} from '../utils/security';
import { MoviePoster } from './MoviePoster';
import { RatingsPillBar } from './RatingsPillBar';

interface SessionDetailModalProps {
  session: ScreeningSession | null;
  movie: Movie | null;
  cinema: Cinema | null;
  cityMeta: CityMeta;
  lang?: AppLanguage;
  userOrigin: UserLocationOrigin;
  isShortlisted: boolean;
  isFavoriteCinema: boolean;
  sameDaySessions?: ScreeningSession[];
  movieMap?: Map<string, Movie>;
  cinemaMap?: Map<string, Cinema>;
  shortlistedIds?: Set<string>;
  hasTopOverlay?: boolean;
  onClose: () => void;
  onToggleShortlist: (sessionId: string) => void;
  onPinPairToShortlist?: (sessionIds: string[]) => void;
  onSelectSession?: (session: ScreeningSession) => void;
  onToggleFavoriteCinema: (cinemaId: string) => void;
  onInspectRatings: (movie: Movie) => void;
  onWatchTrailer: (movie: Movie) => void;
}

export function SessionDetailModal({
  session,
  movie,
  cinema,
  cityMeta,
  lang = 'en',
  userOrigin,
  isShortlisted,
  isFavoriteCinema,
  sameDaySessions = [],
  movieMap,
  cinemaMap,
  shortlistedIds,
  hasTopOverlay = false,
  onClose,
  onToggleShortlist,
  onPinPairToShortlist,
  onSelectSession,
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

  const t = getUiText(lang);
  const displayCityName = t.cityNames[cityMeta.id] ?? cityMeta.name;
  const dateParts = formatCalendarChipParts(session.dateIso, cityMeta.timeZone, lang);
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
  const calendarInput = {
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
  };
  const googleCalendarUrl = buildSafeGoogleCalendarUrl(calendarInput);
  const savings = session.regularPriceAud - session.priceAud;
  const sessionCurrency = session.currency ?? cityMeta.currency;
  const dist = getCinemaDistanceInfo(cinema, userOrigin);
  const displayMovieTitle = getDisplayMovieTitle(movie, lang, cityMeta.id === 'shanghai');
  const displayCinemaName = getDisplayCinemaName(cinema, lang);
  const doubleFeatureCandidates =
    movieMap && cinemaMap && sameDaySessions.length > 0
      ? findDoubleFeatureCandidates({
          firstSession: session,
          firstMovie: movie,
          firstCinema: cinema,
          sameDaySessions,
          movieMap,
          cinemaMap,
          maxResults: 3,
        })
      : [];

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
            <span>
              {lang === 'zh'
                ? `排片详情 · ${displayCityName}`
                : `Screening Summary · ${cityMeta.name}`}
            </span>
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
              {lang === 'zh' ? '导演：' : 'Directed by '}
              {movie.director} · {formatRuntime(movie.runtimeMinutes, lang)} ·{' '}
              {movie.languageNote}
            </p>
            <div className="ticket-hero__ratings">
              <RatingsPillBar
                movie={movie}
                lang={lang}
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
                  <span>{t.trailer}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="ticket-stub-grid">
          <div className="ticket-stub-cell">
            <span className="ticket-stub-cell__label">{lang === 'zh' ? '放映日期' : 'Date'}</span>
            <strong className="ticket-stub-cell__value">{dateParts.fullLabel}</strong>
          </div>

          <div className="ticket-stub-cell">
            <span className="ticket-stub-cell__label">
              {lang === 'zh'
                ? '开映 → 预计散场（含 15 分钟贴片）'
                : 'Start → Est. Finish (incl. 15m previews)'}
            </span>
            <strong className="ticket-stub-cell__value ticket-stub-cell__value--mono">
              <Clock size={14} aria-hidden="true" />
              {timeWindow.startFormatted} → {timeWindow.finishFormatted}
              {timeWindow.nextDay ? (lang === 'zh' ? ' (次日)' : ' (+1d)') : ''}
            </strong>
          </div>

          <div className="ticket-stub-cell">
            <span className="ticket-stub-cell__label">
              {lang === 'zh' ? '影院与影厅' : 'Cinema & Auditorium'}
            </span>
            <strong className="ticket-stub-cell__value">{displayCinemaName}</strong>
            <span className="ticket-stub-cell__sub">
              {cinema.chain} · {session.auditoriumName}
            </span>
          </div>

          <div className="ticket-stub-cell">
            <span className="ticket-stub-cell__label">
              {lang === 'zh' ? '成人参考票价 ' : 'Adult Guide Price '}
              <span className="guide-price-tag">
                {session.priceBasis === 'scraped_live'
                  ? lang === 'zh'
                    ? '实时抓取价'
                    : 'Live-Scraped Tariff'
                  : lang === 'zh'
                    ? '标准参考价'
                    : 'Guide Price'}
              </span>
            </span>
            <strong className="ticket-stub-cell__value ticket-stub-cell__value--price">
              {formatSessionPrice(session.priceAud, sessionCurrency)}
              {savings > 0.01 && (
                <span className="price-strike">
                  {lang === 'zh' ? '原价 ' : 'Reg. '}
                  {formatSessionPrice(session.regularPriceAud, sessionCurrency)}
                </span>
              )}
            </strong>
            {savings > 0.01 && (
              <span className="ticket-stub-cell__saving">
                {session.dealLabel ? `${session.dealLabel} · ` : ''}
                {lang === 'zh'
                  ? `较常规票价省 ${formatSessionPrice(savings, sessionCurrency)}`
                  : `Save ${formatSessionPrice(savings, sessionCurrency)} off regular box office`}
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
                <strong>{cinema.suburb}</strong> ({formatDistanceKm(dist.km, lang)}{' '}
                {dist.fullSuffix}) — {cinema.address}
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
                <span>{isFavoriteCinema ? t.favorited : t.favorite}</span>
              </button>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="modal-google-maps-link"
                className="maps-action-btn"
                aria-label={`Open ${displayCinemaName} in Google Maps`}
              >
                <Navigation size={12} aria-hidden="true" />
                <span>{userOrigin.isCustomOrigin ? t.directions : t.googleMaps}</span>
                <ExternalLink size={11} aria-hidden="true" />
              </a>

              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="modal-google-calendar-link"
                className="maps-action-btn"
                aria-label={`Add ${displayMovieTitle} at ${displayCinemaName} to Google Calendar`}
              >
                <CalendarPlus size={12} aria-hidden="true" />
                <span>{t.googleCalendar}</span>
                <ExternalLink size={11} aria-hidden="true" />
              </a>

              <button
                type="button"
                id="modal-download-ics-btn"
                className="maps-action-btn ics-btn"
                onClick={() => downloadIcsFile(calendarInput)}
                title="Download .ics calendar invite for Apple Calendar & Outlook"
              >
                <Download size={12} aria-hidden="true" />
                <span>{t.appleIcs}</span>
              </button>
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

        {/* Double Feature Matchmaker */}
        {sameDaySessions.length > 0 && (
          <section className="double-feature-panel" aria-label={t.doubleFeatureTitle}>
            <div className="double-feature-panel__head">
              <div>
                <h3 className="double-feature-panel__title">
                  <Film size={14} aria-hidden="true" />
                  <span>{t.doubleFeatureTitle}</span>
                </h3>
                <p className="double-feature-panel__sub">{t.doubleFeatureSub}</p>
              </div>
            </div>

            {doubleFeatureCandidates.length === 0 ? (
              <p className="double-feature-panel__empty">{t.doubleFeatureEmpty}</p>
            ) : (
              <div className="double-feature-grid">
                {doubleFeatureCandidates.map((cand) => {
                  const candTitle = getDisplayMovieTitle(
                    cand.movie,
                    lang,
                    cityMeta.id === 'shanghai'
                  );
                  const candCinemaName = getDisplayCinemaName(cand.cinema, lang);
                  const candWindow = formatSessionWindow(
                    cand.session.startMinutesFromMidnight,
                    cand.movie.runtimeMinutes
                  );
                  const candCurrency = cand.session.currency ?? sessionCurrency;
                  const bothPinned = Boolean(
                    shortlistedIds?.has(session.id) && shortlistedIds?.has(cand.session.id)
                  );
                  return (
                    <div key={cand.session.id} className="double-feature-card">
                      <div className="double-feature-card__top">
                        <span className="double-feature-card__handoff">
                          +{cand.breakMinutes} min ·{' '}
                          {cand.isSameCinema
                            ? t.sameVenue
                            : `${formatDistanceKm(cand.transferDistanceKm)}`}
                        </span>
                        <span className="double-feature-card__price">
                          {formatSessionPrice(cand.combinedPrice, candCurrency)} ·{' '}
                          {formatRuntime(cand.combinedRuntimeMinutes)}
                        </span>
                      </div>
                      <strong className="double-feature-card__title">{candTitle}</strong>
                      <div className="double-feature-card__meta">
                        <span>
                          {candWindow.startFormatted} → {candWindow.finishFormatted}
                        </span>
                        <span>· {cand.session.format}</span>
                        <span>· {candCinemaName}</span>
                      </div>
                      <div className="double-feature-card__actions">
                        {onPinPairToShortlist && (
                          <button
                            type="button"
                            className={`maps-action-btn ${bothPinned ? 'fav-maison-btn--active' : ''}`}
                            onClick={() => onPinPairToShortlist([session.id, cand.session.id])}
                          >
                            {bothPinned ? <Check size={12} /> : <Bookmark size={12} />}
                            <span>{bothPinned ? t.pinnedBoth : t.pinBothToFolio}</span>
                          </button>
                        )}
                        {onSelectSession && (
                          <button
                            type="button"
                            className="maps-action-btn"
                            onClick={() => onSelectSession(cand.session)}
                          >
                            <span>{t.viewSession}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <div className="modal-sheet__footer">
          <button
            type="button"
            id="modal-toggle-shortlist-btn"
            className={isShortlisted ? 'btn-secondary btn-secondary--active' : 'btn-secondary'}
            onClick={() => onToggleShortlist(session.id)}
          >
            {isShortlisted ? <Check size={16} /> : <Bookmark size={16} />}
            <span>{isShortlisted ? t.pinnedInShortlist : t.pinToCompare}</span>
          </button>

          {safeBookingUrl && (
            <a
              href={safeBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="modal-official-booking-link"
              className="btn-primary"
            >
              <span>{t.bookAt(displayCinemaName)}</span>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
