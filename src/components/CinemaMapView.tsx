import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  Compass,
  ExternalLink,
  Heart,
  LocateFixed,
  Maximize2,
  Minus,
  Navigation,
  Play,
  Plus,
  Train,
} from 'lucide-react';
import type { AppLanguage, Cinema, CityMeta, Movie, ScreeningSession } from '../types/cinema';
import type { SalonEdition } from './HeaderBar';
import type { CinemaWithMovieSessions } from './CinemaBrowseView';
import { formatDistanceKm, formatRuntime } from '../utils/formatters';
import { getDisplayCinemaName, getDisplayMovieTitle, getUiText } from '../utils/i18n';
import {
  getCinemaCoords,
  getCinemaDistanceInfo,
  type UserLocationOrigin,
} from '../utils/proximity';
import {
  buildSafeGoogleMapsDirectionsUrl,
  buildSafeGoogleMapsUrl,
  getSafeOutboundCinemaUrl,
} from '../utils/security';
import { MoviePoster } from './MoviePoster';
import { RatingsPillBar } from './RatingsPillBar';
import { SessionPill } from './SessionPill';

interface CinemaMapViewProps {
  cityMeta: CityMeta;
  lang?: AppLanguage;
  edition: SalonEdition;
  allCityCinemas: Cinema[];
  cinemaItems: CinemaWithMovieSessions[];
  userOrigin: UserLocationOrigin;
  shortlistedIds: Set<string>;
  favoriteCinemaIds: Set<string>;
  onSelectSession: (session: ScreeningSession) => void;
  onToggleShortlist: (sessionId: string) => void;
  onToggleFavoriteCinema: (cinemaId: string) => void;
  onInspectRatings: (movie: Movie) => void;
  onWatchTrailer: (movie: Movie) => void;
  onOpenLocationModal: () => void;
  onFilterByCinema: (cinemaId: string) => void;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 10;
const MAX_ZOOM = 16;
const SUBDOMAINS = ['a', 'b', 'c'];

function lngToWorldX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * TILE_SIZE * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
  const rad = (clamped * Math.PI) / 180;
  const n = Math.log(Math.tan(Math.PI / 4 + rad / 2));
  return ((1 - n / Math.PI) / 2) * TILE_SIZE * Math.pow(2, zoom);
}

function worldXToLng(worldX: number, zoom: number): number {
  const worldSize = TILE_SIZE * Math.pow(2, zoom);
  const raw = (worldX / worldSize) * 360 - 180;
  return Math.max(-180, Math.min(180, raw));
}

function worldYToLat(worldY: number, zoom: number): number {
  const worldSize = TILE_SIZE * Math.pow(2, zoom);
  const n = Math.PI - (2 * Math.PI * worldY) / worldSize;
  const deg = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return Math.max(-85, Math.min(85, deg));
}

function getMetersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

export function CinemaMapView({
  cityMeta,
  lang = 'en',
  edition,
  allCityCinemas,
  cinemaItems,
  userOrigin,
  shortlistedIds,
  favoriteCinemaIds,
  onSelectSession,
  onToggleShortlist,
  onToggleFavoriteCinema,
  onInspectRatings,
  onWatchTrailer,
  onOpenLocationModal,
  onFilterByCinema,
}: CinemaMapViewProps) {
  const isShanghai = cityMeta.id === 'shanghai';
  const t = getUiText(lang);
  const originKey = `${cityMeta.id}:${userOrigin.id}:${userOrigin.lat.toFixed(3)}:${userOrigin.lng.toFixed(3)}`;

  const [camera, setCamera] = useState<{
    key: string;
    lat: number;
    lng: number;
    zoom: number;
  }>(() => ({
    key: originKey,
    lat: userOrigin.lat,
    lng: userOrigin.lng,
    zoom: userOrigin.isCustomOrigin ? 13 : 12,
  }));

  const [selectedPinState, setSelectedPinState] = useState<{
    city: string;
    cinemaId: string | null;
  }>({ city: cityMeta.id, cinemaId: null });

  const [showRings, setShowRings] = useState(true);
  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: 780,
    height: 540,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startWorldX: number;
    startWorldY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        setViewport({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const centerLat = camera.key === originKey ? camera.lat : userOrigin.lat;
  const centerLng = camera.key === originKey ? camera.lng : userOrigin.lng;
  const zoom = camera.key === originKey ? camera.zoom : userOrigin.isCustomOrigin ? 13 : 12;

  const byCinemaId = useMemo(
    () => new Map(cinemaItems.map((item) => [item.cinema.id, item])),
    [cinemaItems]
  );

  const rankedVenues = useMemo(() => {
    return allCityCinemas
      .map((cinema) => {
        const coords = getCinemaCoords(cinema);
        const dist = getCinemaDistanceInfo(cinema, userOrigin);
        const prog = byCinemaId.get(cinema.id);
        return {
          cinema,
          coords,
          dist,
          movies: prog?.movies ?? [],
          totalSessions: prog?.totalSessions ?? 0,
        };
      })
      .filter((v): v is typeof v & { coords: { lat: number; lng: number } } => v.coords !== null)
      .sort((a, b) => a.dist.km - b.dist.km);
  }, [allCityCinemas, byCinemaId, userOrigin]);

  const closestVenueId = rankedVenues[0]?.cinema.id ?? null;

  const explicitSelectedId =
    selectedPinState.city === cityMeta.id ? selectedPinState.cinemaId : null;
  const activeSelectedVenue =
    rankedVenues.find((v) => v.cinema.id === explicitSelectedId) ??
    rankedVenues.find((v) => v.totalSessions > 0) ??
    rankedVenues[0] ??
    null;

  // Compute Web Mercator viewport coordinates & visible raster tiles
  const centerWorldX = lngToWorldX(centerLng, zoom);
  const centerWorldY = latToWorldY(centerLat, zoom);
  const topLeftWorldX = centerWorldX - viewport.width / 2;
  const topLeftWorldY = centerWorldY - viewport.height / 2;

  const maxTileIndex = Math.pow(2, zoom) - 1;
  const startTileX = Math.max(0, Math.floor(topLeftWorldX / TILE_SIZE));
  const endTileX = Math.min(maxTileIndex, Math.floor((topLeftWorldX + viewport.width) / TILE_SIZE));
  const startTileY = Math.max(0, Math.floor(topLeftWorldY / TILE_SIZE));
  const endTileY = Math.min(maxTileIndex, Math.floor((topLeftWorldY + viewport.height) / TILE_SIZE));

  const tileStyle = edition === 'ivoire' ? 'light_all' : 'dark_all';
  const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
  for (let tx = startTileX; tx <= endTileX; tx++) {
    for (let ty = startTileY; ty <= endTileY; ty++) {
      const sub = SUBDOMAINS[Math.abs(tx + ty) % SUBDOMAINS.length];
      tiles.push({
        key: `${tileStyle}-${zoom}-${tx}-${ty}`,
        url: `https://${sub}.basemaps.cartocdn.com/${tileStyle}/${zoom}/${tx}/${ty}@2x.png`,
        left: Math.round(tx * TILE_SIZE - topLeftWorldX),
        top: Math.round(ty * TILE_SIZE - topLeftWorldY),
      });
    }
  }

  const originScreenX = lngToWorldX(userOrigin.lng, zoom) - topLeftWorldX;
  const originScreenY = latToWorldY(userOrigin.lat, zoom) - topLeftWorldY;
  const metersPerPx = getMetersPerPixel(userOrigin.lat, zoom);
  const ringRadiiKm = [1, 3, 5];

  const updateCamera = (nextLat: number, nextLng: number, nextZoom: number) => {
    setCamera({
      key: originKey,
      lat: Math.max(-85, Math.min(85, nextLat)),
      lng: Math.max(-180, Math.min(180, nextLng)),
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom)),
    });
  };

  const handleFitCityVenues = () => {
    if (rankedVenues.length === 0) return;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const v of rankedVenues) {
      minLat = Math.min(minLat, v.coords.lat);
      maxLat = Math.max(maxLat, v.coords.lat);
      minLng = Math.min(minLng, v.coords.lng);
      maxLng = Math.max(maxLng, v.coords.lng);
    }
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    updateCamera(midLat, midLng, 11);
  };

  return (
    <section className="cinema-map-section" aria-label={`${cityMeta.name} interactive cinema map`}>
      <div className="results-toolbar">
        <div className="results-toolbar__title-group">
          <span className="results-toolbar__kicker">CARTOGRAPHIE CINÉMATOGRAPHIQUE</span>
          <h2 className="results-toolbar__heading">
            {rankedVenues.filter((v) => v.totalSessions > 0).length} of {rankedVenues.length}{' '}
            {cityMeta.name} Cinemas Screening
          </h2>
        </div>

        <div className="map-toolbar-actions">
          <button
            type="button"
            className={`format-chip ${showRings ? 'format-chip--active' : ''}`}
            onClick={() => setShowRings((r) => !r)}
            aria-pressed={showRings}
          >
            <Compass size={12} aria-hidden="true" />
            <span>Distance Rings (1 · 3 · 5 km)</span>
          </button>

          <button
            type="button"
            className="format-chip"
            onClick={onOpenLocationModal}
          >
            <LocateFixed size={12} aria-hidden="true" />
            <span>
              {userOrigin.isCustomOrigin ? `Origin: ${userOrigin.shortLabel}` : 'Set My Location'}
            </span>
          </button>
        </div>
      </div>

      <div className="cinema-map-layout">
        {/* Interactive Slippy Map Canvas */}
        <div className="cinema-map-stage-wrap">
          <div
            ref={containerRef}
            className="cinema-map-canvas"
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button, a')) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              dragRef.current = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                startWorldX: centerWorldX,
                startWorldY: centerWorldY,
                moved: false,
              };
            }}
            onPointerMove={(e) => {
              const d = dragRef.current;
              if (!d || d.pointerId !== e.pointerId) return;
              const dx = e.clientX - d.startX;
              const dy = e.clientY - d.startY;
              if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
              const nextWX = d.startWorldX - dx;
              const nextWY = d.startWorldY - dy;
              updateCamera(worldYToLat(nextWY, zoom), worldXToLng(nextWX, zoom), zoom);
            }}
            onPointerUp={(e) => {
              if (dragRef.current?.pointerId === e.pointerId) {
                dragRef.current = null;
              }
            }}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 1 : -1;
              const nextZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
              if (nextZ !== zoom) {
                updateCamera(centerLat, centerLng, nextZ);
              }
            }}
          >
            {/* Raster Map Tiles */}
            <div className="cinema-map-tiles" aria-hidden="true">
              {tiles.map((t) => (
                <img
                  key={t.key}
                  src={t.url}
                  alt=""
                  draggable={false}
                  className="cinema-map-tile"
                  style={{
                    left: `${t.left}px`,
                    top: `${t.top}px`,
                    width: `${TILE_SIZE}px`,
                    height: `${TILE_SIZE}px`,
                  }}
                />
              ))}
            </div>

            {/* Concentric 1km / 3km / 5km Distance Rings SVG */}
            {showRings && (
              <svg
                className="cinema-map-rings-svg"
                width={viewport.width}
                height={viewport.height}
                aria-hidden="true"
              >
                {ringRadiiKm.map((km) => {
                  const pxRadius = (km * 1000) / metersPerPx;
                  if (pxRadius < 14 || pxRadius > 2200) return null;
                  return (
                    <g key={km}>
                      <circle
                        cx={originScreenX}
                        cy={originScreenY}
                        r={pxRadius}
                        className="cinema-map-ring-circle"
                      />
                      <text
                        x={originScreenX}
                        y={originScreenY - pxRadius - 5}
                        textAnchor="middle"
                        className="cinema-map-ring-label"
                      >
                        {km} km
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Pulsing User Origin Pin */}
            <div
              className="cinema-map-origin-pin"
              style={{ left: `${originScreenX}px`, top: `${originScreenY}px` }}
              title={userOrigin.label}
            >
              <span className="cinema-map-origin-pin__pulse" aria-hidden="true" />
              <span className="cinema-map-origin-pin__dot" aria-hidden="true" />
              <span className="cinema-map-origin-pin__tag">
                {userOrigin.isCustomOrigin ? userOrigin.shortLabel : 'CBD'}
              </span>
            </div>

            {/* All City Cinema Pins */}
            {rankedVenues.map(({ cinema, coords, totalSessions }) => {
              const sx = lngToWorldX(coords.lng, zoom) - topLeftWorldX;
              const sy = latToWorldY(coords.lat, zoom) - topLeftWorldY;
              if (sx < -60 || sx > viewport.width + 60 || sy < -60 || sy > viewport.height + 60) {
                return null;
              }
              const isSelected = activeSelectedVenue?.cinema.id === cinema.id;
              const isClosest = closestVenueId === cinema.id && userOrigin.isCustomOrigin;
              const isFav = favoriteCinemaIds.has(cinema.id);
              const isMuted = totalSessions === 0;

              return (
                <button
                  key={cinema.id}
                  type="button"
                  id={`map-pin-${cinema.id}`}
                  className={[
                    'cinema-map-pin',
                    isSelected ? 'cinema-map-pin--selected' : '',
                    isClosest ? 'cinema-map-pin--closest' : '',
                    isFav ? 'cinema-map-pin--fav' : '',
                    isMuted ? 'cinema-map-pin--muted' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ left: `${sx}px`, top: `${sy}px` }}
                  onClick={() => {
                    setSelectedPinState({ city: cityMeta.id, cinemaId: cinema.id });
                    updateCamera(coords.lat, coords.lng, Math.max(zoom, 13));
                  }}
                  aria-label={`${cinema.name} (${cinema.suburb}) — ${totalSessions} sessions`}
                >
                  <span className="cinema-map-pin__badge">
                    {isFav ? '♥ ' : ''}
                    {totalSessions}
                  </span>
                  { (zoom >= 13 || isSelected || isClosest) && (
                    <span className="cinema-map-pin__label">{cinema.name}</span>
                  )}
                </button>
              );
            })}

            {/* Map Floating Controls */}
            <div className="cinema-map-controls" role="group" aria-label="Map zoom and framing">
              <button
                type="button"
                className="cinema-map-ctrl-btn"
                onClick={() => updateCamera(centerLat, centerLng, zoom + 1)}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
                title="Zoom in"
              >
                <Plus size={15} />
              </button>
              <button
                type="button"
                className="cinema-map-ctrl-btn"
                onClick={() => updateCamera(centerLat, centerLng, zoom - 1)}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
                title="Zoom out"
              >
                <Minus size={15} />
              </button>
              <button
                type="button"
                className="cinema-map-ctrl-btn"
                onClick={() =>
                  updateCamera(userOrigin.lat, userOrigin.lng, userOrigin.isCustomOrigin ? 13 : 12)
                }
                aria-label="Center on active location"
                title="Center on My Location / CBD"
              >
                <LocateFixed size={14} />
              </button>
              <button
                type="button"
                className="cinema-map-ctrl-btn"
                onClick={handleFitCityVenues}
                aria-label={`Show all ${cityMeta.name} cinemas`}
                title={`Fit all ${cityMeta.name} cinemas`}
              >
                <Maximize2 size={14} />
              </button>
            </div>

            <div className="cinema-map-attribution" aria-hidden="true">
              © OpenStreetMap · © CARTO
            </div>
          </div>

          {/* Quick Horizontal Closest-Pin Strip Beneath Map */}
          <div className="cinema-map-quickstrip" aria-label="Jump to cinema on map">
            {rankedVenues.slice(0, 10).map((v, idx) => {
              const active = activeSelectedVenue?.cinema.id === v.cinema.id;
              return (
                <button
                  key={v.cinema.id}
                  type="button"
                  className={`map-quick-pill ${active ? 'map-quick-pill--active' : ''}`}
                  onClick={() => {
                    setSelectedPinState({ city: cityMeta.id, cinemaId: v.cinema.id });
                    updateCamera(v.coords.lat, v.coords.lng, 14);
                  }}
                >
                  <span className="map-quick-pill__rank">#{idx + 1}</span>
                  <span className="map-quick-pill__name">{v.cinema.name}</span>
                  <span className="map-quick-pill__km">{formatDistanceKm(v.dist.km)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Cinema Live Session Inspector Panel */}
        {activeSelectedVenue && (
          <aside className="cinema-map-inspector" aria-live="polite">
            <div className="cinema-map-inspector__head">
              <div className="cinema-map-inspector__badges">
                <span className="chain-tag">{activeSelectedVenue.cinema.chain}</span>
                <span className="vibe-tag">{activeSelectedVenue.cinema.vibe}</span>
                {closestVenueId === activeSelectedVenue.cinema.id && userOrigin.isCustomOrigin && (
                  <span className="closest-rank-pill">#1 CLOSEST</span>
                )}
              </div>

              <h3 className="cinema-map-inspector__title">
                {getDisplayCinemaName(activeSelectedVenue.cinema, lang)}
              </h3>
              <p className="cinema-map-inspector__sub">
                {activeSelectedVenue.cinema.suburb} ·{' '}
                <strong>
                  {formatDistanceKm(activeSelectedVenue.dist.km)}{' '}
                  {activeSelectedVenue.dist.compactSuffix}
                </strong>
              </p>
              <p className="cinema-map-inspector__transit">
                <Train size={12} aria-hidden="true" />
                <span>{activeSelectedVenue.cinema.transitNote}</span>
              </p>

              <div className="cinema-map-inspector__actions">
                <button
                  type="button"
                  className={`fav-maison-btn ${
                    favoriteCinemaIds.has(activeSelectedVenue.cinema.id)
                      ? 'fav-maison-btn--active'
                      : ''
                  }`}
                  onClick={() => onToggleFavoriteCinema(activeSelectedVenue.cinema.id)}
                >
                  <Heart
                    size={13}
                    fill={
                      favoriteCinemaIds.has(activeSelectedVenue.cinema.id)
                        ? 'currentColor'
                        : 'none'
                    }
                  />
                  <span>
                    {favoriteCinemaIds.has(activeSelectedVenue.cinema.id)
                      ? t.favorited
                      : t.favorite}
                  </span>
                </button>

                <a
                  href={
                    userOrigin.isCustomOrigin
                      ? buildSafeGoogleMapsDirectionsUrl(
                          userOrigin.lat,
                          userOrigin.lng,
                          activeSelectedVenue.cinema.name,
                          activeSelectedVenue.cinema.address
                        )
                      : buildSafeGoogleMapsUrl(
                          activeSelectedVenue.cinema.name,
                          activeSelectedVenue.cinema.address
                        )
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="maps-action-btn"
                >
                  <Navigation size={12} aria-hidden="true" />
                  <span>{userOrigin.isCustomOrigin ? t.directions : t.googleMaps}</span>
                  <ExternalLink size={11} aria-hidden="true" />
                </a>

                {getSafeOutboundCinemaUrl(activeSelectedVenue.cinema.bookingDomainUrl) && (
                  <button
                    type="button"
                    className="maps-action-btn"
                    onClick={() => onFilterByCinema(activeSelectedVenue.cinema.id)}
                  >
                    <span>{lang === 'zh' ? '只看此影院' : 'Solo Filter'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="cinema-map-inspector__sessions">
              {activeSelectedVenue.movies.length === 0 ? (
                <p className="cinema-map-inspector__empty">
                  No remaining sessions match your active date/time filters at this cinema — pick
                  another day above or reset filters to view its full schedule.
                </p>
              ) : (
                activeSelectedVenue.movies.map(({ movie, sessions }) => (
                  <div key={movie.id} className="map-film-block">
                    <div className="map-film-block__head">
                      <MoviePoster movie={movie} size="sm" />
                      <div className="map-film-block__info">
                        <h4 className="map-film-block__title">
                          {getDisplayMovieTitle(movie, lang, isShanghai)}
                        </h4>
                        <p className="map-film-block__meta">
                          <span className="rating-badge">{movie.classification}</span>
                          <span>
                            <Clock size={11} aria-hidden="true" />{' '}
                            {formatRuntime(movie.runtimeMinutes)}
                          </span>
                        </p>
                        <div className="programme-film-row__ratings">
                          <RatingsPillBar
                            movie={movie}
                            compact
                            contextKey={`map-${activeSelectedVenue.cinema.id}`}
                            onInspectRatings={onInspectRatings}
                          />
                          {movie.trailerYoutubeKey && (
                            <button
                              type="button"
                              className="trailer-pill-btn trailer-pill-btn--compact"
                              onClick={() => onWatchTrailer(movie)}
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
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
