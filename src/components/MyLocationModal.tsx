import { useEffect, useState } from 'react';
import {
  Check,
  Compass,
  Loader2,
  LocateFixed,
  MapPin,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import type { CityId, CityMeta } from '../types/cinema';
import {
  CITY_LOCATION_HUBS,
  detectClosestSupportedCity,
  type UserLocationOrigin,
} from '../utils/proximity';
import { sanitizeSearchQuery } from '../utils/security';
import { searchLocalGazetteer } from '../utils/localGazetteer';

export interface GeocodedPlaceResult {
  label: string;
  shortLabel: string;
  city: CityId;
  lat: number;
  lng: number;
}

interface MyLocationModalProps {
  isOpen: boolean;
  cityMeta: CityMeta;
  userOrigin: UserLocationOrigin;
  onClose: () => void;
  onApplyCustomCoordinates: (place: GeocodedPlaceResult, sourceId: 'gps' | 'custom') => void;
  onSelectHub: (hubId: string) => void;
  onResetLocation: () => void;
}

export function MyLocationModal({
  isOpen,
  cityMeta,
  userOrigin,
  onClose,
  onApplyCustomCoordinates,
  onSelectHub,
  onResetLocation,
}: MyLocationModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodedPlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gpsState, setGpsState] = useState<'idle' | 'locating' | 'error' | 'insecure'>('idle');
  const [gpsErrorMsg, setGpsErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleQueryChange = (rawValue: string) => {
    const next = sanitizeSearchQuery(rawValue);
    setQuery(next);
    if (next.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
    } else {
      setIsSearching(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(trimmed)}&city=${encodeURIComponent(cityMeta.id)}`,
          { headers: { Accept: 'application/json' } }
        );
        const ctype = res.headers.get('content-type') || '';
        if (!res.ok || !ctype.includes('application/json')) {
          throw new Error('Static host fallback');
        }
        const data = (await res.json()) as { ok?: boolean; results?: GeocodedPlaceResult[] };
        if (!cancelled) {
          setResults(
            Array.isArray(data.results) && data.results.length > 0
              ? data.results
              : searchLocalGazetteer(trimmed, cityMeta.id)
          );
          setIsSearching(false);
        }
      } catch {
        if (!cancelled) {
          setResults(searchLocalGazetteer(trimmed, cityMeta.id));
          setIsSearching(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, cityMeta.id, isOpen]);

  if (!isOpen) return null;

  const handleUseBrowserGps = () => {
    if (!navigator.geolocation) {
      setGpsState('error');
      setGpsErrorMsg('Geolocation is not supported by this browser.');
      return;
    }
    if (!window.isSecureContext) {
      setGpsState('insecure');
      setGpsErrorMsg(
        'Browser GPS requires an HTTPS origin. Enter your suburb, postcode, or street address right below instead!'
      );
      return;
    }

    setGpsState('locating');
    setGpsErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const nearestCity = detectClosestSupportedCity(lat, lng) ?? cityMeta.id;
        setGpsState('idle');
        onApplyCustomCoordinates(
          {
            label: 'My Live GPS Coordinates',
            shortLabel: 'your GPS',
            city: nearestCity,
            lat,
            lng,
          },
          'gps'
        );
        onClose();
      },
      () => {
        setGpsState('error');
        setGpsErrorMsg(
          'Location permission was declined or unavailable — search your suburb, postcode, or street below instead.'
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  };

  const placeholderText =
    cityMeta.id === 'shanghai'
      ? 'Type address, district, or Metro station — e.g. 静安寺, 淮海中路, 陆家嘴, 五角场…'
      : cityMeta.id === 'sydney'
        ? 'Type suburb, postcode, or street — e.g. 2010, Surry Hills, UNSW, Chatswood…'
        : 'Type suburb, postcode, or street — e.g. 3053, South Yarra, Clayton, Bourke St…';

  return (
    <div
      className="modal-backdrop modal-backdrop--top"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-sheet modal-sheet--ticket"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-location-modal-title"
      >
        <div className="modal-sheet__header">
          <div>
            <span className="ticket-kicker">
              <Compass size={14} aria-hidden="true" />
              Proximity Radar · Melbourne, Sydney &amp; Shanghai
            </span>
            <h2 id="my-location-modal-title" className="shortlist-title">
              Set My Location &amp; Closest Cinemas
            </h2>
          </div>

          <button
            type="button"
            id="close-my-location-modal-btn"
            className="icon-close-btn"
            onClick={onClose}
            aria-label="Close My Location dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="loc-modal-body">
          {/* Current active origin pill */}
          <div className="loc-current-banner">
            <div className="loc-current-banner__info">
              <MapPin size={15} className="dock-icon" aria-hidden="true" />
              <div>
                <span className="loc-current-banner__kicker">ACTIVE DISTANCE ORIGIN</span>
                <strong>{userOrigin.label}</strong>
              </div>
            </div>
            {userOrigin.isCustomOrigin && (
              <button
                type="button"
                id="loc-modal-reset-btn"
                className="reset-btn"
                onClick={() => {
                  onResetLocation();
                  onClose();
                }}
              >
                <RotateCcw size={12} aria-hidden="true" />
                <span>Reset to Default</span>
              </button>
            )}
          </div>

          {/* 1-Click Live GPS */}
          <button
            type="button"
            id="loc-modal-use-gps-btn"
            className="loc-gps-hero-btn"
            onClick={handleUseBrowserGps}
            disabled={gpsState === 'locating'}
          >
            {gpsState === 'locating' ? (
              <Loader2 size={16} className="spin-icon" aria-hidden="true" />
            ) : (
              <LocateFixed size={16} aria-hidden="true" />
            )}
            <div className="loc-gps-hero-btn__text">
              <strong>
                {gpsState === 'locating'
                  ? 'Detecting your live coordinates…'
                  : 'Use My Current GPS Location'}
              </strong>
              <span>
                Automatically detects Melbourne, Sydney, or Shanghai &amp; ranks closest cinemas
              </span>
            </div>
          </button>

          {gpsErrorMsg && (
            <p className="api-feedback-banner api-feedback-banner--error" role="status">
              {gpsErrorMsg}
            </p>
          )}

          {/* Address / Suburb / Postcode Search */}
          <div className="loc-search-block">
            <label htmlFor="loc-address-search-input" className="api-field-group__label">
              Or Search Any Suburb, Postcode, Landmark, or Street Address
            </label>
            <div className="search-box">
              <Search size={15} className="search-box__icon" aria-hidden="true" />
              <input
                id="loc-address-search-input"
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder={placeholderText}
                className="search-box__input"
                autoFocus
              />
              {query.length > 0 && (
                <button
                  type="button"
                  className="search-box__clear"
                  onClick={() => handleQueryChange('')}
                  aria-label="Clear location search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {isSearching && (
              <p className="loc-searching-note">
                <Loader2 size={13} className="spin-icon" aria-hidden="true" /> Searching
                coordinates…
              </p>
            )}

            {results.length > 0 && (
              <ul className="loc-results-list" aria-label="Matching locations">
                {results.map((r, idx) => (
                  <li key={`${r.city}-${r.lat}-${r.lng}-${idx}`}>
                    <button
                      type="button"
                      className="loc-result-item"
                      onClick={() => {
                        onApplyCustomCoordinates(r, 'custom');
                        onClose();
                      }}
                    >
                      <div className="loc-result-item__main">
                        <MapPin size={14} aria-hidden="true" />
                        <span>{r.label}</span>
                      </div>
                      <span className="chain-tag chain-tag--compact">
                        {r.city.toUpperCase()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick-Pick Precincts for Current City */}
          <div className="loc-hubs-block">
            <span className="api-field-group__label">
              Quick-Pick {cityMeta.name} Precincts
            </span>
            <div className="loc-hubs-grid">
              {CITY_LOCATION_HUBS[cityMeta.id]
                .filter((h) => h.id !== 'cbd')
                .map((hub) => {
                  const active = userOrigin.id === hub.id;
                  return (
                    <button
                      key={hub.id}
                      type="button"
                      className={`loc-hub-chip ${active ? 'loc-hub-chip--active' : ''}`}
                      onClick={() => {
                        onSelectHub(hub.id);
                        onClose();
                      }}
                    >
                      {active ? <Check size={12} /> : <MapPin size={12} />}
                      <span>{hub.shortLabel}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
