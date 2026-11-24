import { Compass, ExternalLink, MapPin, Navigation, SlidersHorizontal, X } from 'lucide-react';
import type { AppLanguage, Cinema, Movie, ScreeningSession } from '../types/cinema';
import { formatDistanceKm, formatTimeFromMinutes } from '../utils/formatters';
import { getDisplayCinemaName, getDisplayMovieTitle, getUiText } from '../utils/i18n';
import { getCinemaDistanceInfo, type UserLocationOrigin } from '../utils/proximity';
import { buildSafeGoogleMapsDirectionsUrl } from '../utils/security';

interface ClosestCinemasSpotlightProps {
  cinemas: Cinema[];
  sessions: ScreeningSession[];
  movieMap: Map<string, Movie>;
  lang?: AppLanguage;
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
  lang = 'en',
  userOrigin,
  selectedCinemaId,
  onSelectCinemaFilter,
  onOpenLocationModal,
  onClearLocation,
}: ClosestCinemasSpotlightProps) {
  if (!userOrigin.isCustomOrigin || cinemas.length === 0) {
    return null;
  }
  const t = getUiText(lang);

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
      aria-label={
        lang === 'zh'
          ? `距离 ${userOrigin.shortLabel} 最近的影院`
          : `Closest cinemas around ${userOrigin.shortLabel}`
      }
    >
      <div className="closest-radar__header">
        <div className="closest-radar__title-wrap">
          <span className="closest-radar__kicker">
            <Compass size={13} aria-hidden="true" />
            {lang === 'zh' ? '距离你最近的影院雷达' : 'CLOSEST CINEMAS AROUND YOU'}
          </span>
          <h2 className="closest-radar__heading">
            {lang === 'zh' ? (
              <>
                距离 <em>{userOrigin.label}</em> 最近
              </>
            ) : (
              <>
                Nearest Houses to <em>{userOrigin.label}</em>
              </>
            )}
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
            <span>{lang === 'zh' ? '更改位置' : 'Change Location'}</span>
          </button>
          <button
            type="button"
            id="radar-clear-location-btn"
            className="reset-btn"
            onClick={onClearLocation}
            title={lang === 'zh' ? '重置为市中心默认坐标' : 'Reset distance anchor to city centre'}
          >
            <X size={12} aria-hidden="true" />
            <span>{lang === 'zh' ? '清除' : 'Clear'}</span>
          </button>
        </div>
      </div>

      <div className="closest-radar__grid">
        {rankedClosest.map(({ cinema, dist, venueSessions }, idx) => {
          const nextSession = venueSessions[0];
          const nextMovie = nextSession ? movieMap.get(nextSession.movieId) : undefined;
          const isSelected = selectedCinemaId === cinema.id;
          const displayCinema = getDisplayCinemaName(cinema, lang);
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
                  {idx === 0
                    ? lang === 'zh'
                      ? '#1 最近影院'
                      : '#1 CLOSEST'
                    : lang === 'zh'
                      ? `#${idx + 1} 附近影院`
                      : `#${idx + 1} NEARBY`}
                </span>
                <span className="closest-card__distance">
                  <MapPin size={12} aria-hidden="true" />
                  {formatDistanceKm(dist.km, lang)}
                </span>
              </div>

              <h3 className="closest-card__name">{displayCinema}</h3>
              <p className="closest-card__suburb">
                <span className="chain-tag chain-tag--compact">{cinema.chain}</span>
                <span>{cinema.suburb}</span>
              </p>

              <p className="closest-card__next">
                {nextSession && nextMovie ? (
                  <>
                    <strong>
                      {lang === 'zh' ? '下场 ' : 'Next '}
                      {formatTimeFromMinutes(nextSession.startMinutesFromMidnight)}
                    </strong>{' '}
                    · {getDisplayMovieTitle(nextMovie, lang, cinema.city === 'shanghai')} (
                    {venueSessions.length}{' '}
                    {venueSessions.length === 1 ? t.sessionSingular : t.sessionPlural})
                  </>
                ) : (
                  <span>
                    {lang === 'zh'
                      ? '可切换其他日期或重置筛选查看该影院排片'
                      : 'Select another date or clear filters to view sessions'}
                  </span>
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
                  <span>
                    {isSelected
                      ? lang === 'zh'
                        ? '仅看此影院 ✓'
                        : 'Showing Only ✓'
                      : lang === 'zh'
                        ? '查看排片'
                        : 'Show Sessions'}
                  </span>
                </button>

                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id={`closest-directions-${cinema.id}`}
                  className="maps-inline-btn"
                  aria-label={`Get directions from ${userOrigin.shortLabel} to ${displayCinema}`}
                >
                  <Navigation size={10} aria-hidden="true" />
                  <span>{t.directions}</span>
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
