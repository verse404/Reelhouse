import { Compass, ExternalLink, MapPin, Navigation, SlidersHorizontal, X } from 'lucide-react';
import type { Cinema, Movie, ScreeningSession } from '../types/cinema';
import { formatDistanceKm, formatTimeFromMinutes } from '../utils/formatters';
import { getCinemaDistanceInfo, type UserLocationOrigin } from '../utils/proximity';
import { buildSafeGoogleMapsDirectionsUrl } from '../utils/security';

interface ClosestCinemasSpotlightProps {
  cinemas: Cinema[];
  sessions: ScreeningSession[];
  movieMap: Map<string, Movie>;
  userOrigin: UserLocationOrigin;
  selectedCinemaId: string;
  onSelectCinemaFilter: (cinemaId: string) => void;
  onOpenLocationModal: () => void;
  onClearLocation: () => void;
}

export function ClosestCinemasSpotlight({
  cinemas,
  sessions,
  movieMap,
  userOrigin,
  selectedCinemaId,
  onSelectCinemaFilter,
  onOpenLocationModal,
  onClearLocation,
}: ClosestCinemasSpotlightProps) {
  if (!userOrigin.isCustomOrigin || cinemas.length === 0) {
    return null;
  }

  // Group active day's filtered/upcoming sessions by cinema so we can preview the next session
  const sessionsByCinema = new Map<string, ScreeningSession[]>();
  for (const s of sessions) {
    const arr = sessionsByCinema.get(s.cinemaId) ?? [];
    arr.push(s);
    sessionsByCinema.set(s.cinemaId, arr);
  }

  const rankedClosest = [...cinemas]
    .map((cinema) => ({
      cinema,
      dist: getCinemaDistanceInfo(cinema, userOrigin),
      venueSessions: sessionsByCinema.get(cinema.id) ?? [],
    }))
    .sort((a, b) => a.dist.km - b.dist.km)
    .slice(0, 4);

  return (
    <section
      className="closest-radar"
      aria-label={`Closest cinemas around ${userOrigin.shortLabel}`}
    >
      <div className="closest-radar__header">
        <div className="closest-radar__title-wrap">
          <span className="closest-radar__kicker">
            <Compass size={13} aria-hidden="true" />
            CLOSEST CINEMAS AROUND YOU
          </span>
          <h2 className="closest-radar__heading">
            Nearest Houses to <em>{userOrigin.label}</em>
          </h2>
        </div>

        <div className="closest-radar__controls">
          <button
            type="button"
            id="radar-change-location-btn"
            className="deal-toggle"
            onClick={onOpenLocationModal}
          >
            <SlidersHorizontal size={12} aria-hidden="true" />
            <span>Change Location</span>
          </button>
          <button
            type="button"
            id="radar-clear-location-btn"
            className="reset-btn"
            onClick={onClearLocation}
            title="Reset distance anchor to city centre"
          >
            <X size={12} aria-hidden="true" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="closest-radar__grid">
        {rankedClosest.map(({ cinema, dist, venueSessions }, idx) => {
          const nextSession = venueSessions[0];
          const nextMovie = nextSession ? movieMap.get(nextSession.movieId) : undefined;
          const isSelected = selectedCinemaId === cinema.id;
          const directionsUrl = buildSafeGoogleMapsDirectionsUrl(
            userOrigin.lat,
            userOrigin.lng,
            cinema.name,
            cinema.address
          );

          return (
            <article
              key={cinema.id}
              className={`closest-card ${idx === 0 ? 'closest-card--nearest' : ''} ${
                isSelected ? 'closest-card--selected' : ''
              }`}
            >
              <div className="closest-card__top">
                <span className="closest-card__rank">
                  {idx === 0 ? '#1 CLOSEST' : `#${idx + 1} NEARBY`}
                </span>
                <span className="closest-card__distance">
                  <MapPin size={12} aria-hidden="true" />
                  {formatDistanceKm(dist.km)}
                </span>
              </div>

              <h3 className="closest-card__name">{cinema.name}</h3>
              <p className="closest-card__suburb">
                <span className="chain-tag chain-tag--compact">{cinema.chain}</span>
                <span>{cinema.suburb}</span>
              </p>

              <p className="closest-card__next">
                {nextSession && nextMovie ? (
                  <>
                    <strong>
                      Next {formatTimeFromMinutes(nextSession.startMinutesFromMidnight)}
                    </strong>{' '}
                    · {nextMovie.title} ({venueSessions.length}{' '}
                    {venueSessions.length === 1 ? 'session' : 'sessions'})
                  </>
                ) : (
                  <span>Select another date or clear filters to view sessions</span>
                )}
              </p>

              <div className="closest-card__actions">
                <button
                  type="button"
                  id={`closest-filter-btn-${cinema.id}`}
                  className={`trailer-pill-btn trailer-pill-btn--compact ${
                    isSelected ? 'deal-toggle--active' : ''
                  }`}
                  onClick={() =>
                    onSelectCinemaFilter(isSelected ? 'all' : cinema.id)
                  }
                >
                  <span>{isSelected ? 'Showing Only ✓' : 'Show Sessions'}</span>
                </button>

                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id={`closest-directions-${cinema.id}`}
                  className="maps-inline-btn"
                  aria-label={`Get directions from ${userOrigin.shortLabel} to ${cinema.name}`}
                >
                  <Navigation size={10} aria-hidden="true" />
                  <span>Directions</span>
                  <ExternalLink size={10} aria-hidden="true" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
