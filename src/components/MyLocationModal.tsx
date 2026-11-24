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
import type { AppLanguage, CityId, CityMeta } from '../types/cinema';
import { getUiText } from '../utils/i18n';
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
  lang?: AppLanguage;
  userOrigin: UserLocationOrigin;
  onClose: () => void;
  onApplyCustomCoordinates: (place: GeocodedPlaceResult, sourceId: 'gps' | 'custom') => void;
  onSelectHub: (hubId: string) => void;
  onResetLocation: () => void;
}

export function MyLocationModal({
  isOpen,
  cityMeta,
  lang = 'en',
  userOrigin,
  onClose,
  onApplyCustomCoordinates,
  onSelectHub,
  onResetLocation,
}: MyLocationModalProps) {
  const t = getUiText(lang);
  const displayCityName = t.cityNames[cityMeta.id] ?? cityMeta.name;
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
      setGpsErrorMsg(
        lang === 'zh'
          ? '当前浏览器不支持定位功能。'
          : 'Geolocation is not supported by this browser.'
      );
      return;
    }
    if (!window.isSecureContext) {
      setGpsState('insecure');
      setGpsErrorMsg(
        lang === 'zh'
          ? '浏览器 GPS 定位需要 HTTPS 环境，可直接在下方搜索商圈、邮编或街道地址。'
          : 'Browser GPS requires an HTTPS origin. Enter your suburb, postcode, or street address right below instead!'
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
            label: lang === 'zh' ? '当前实时 GPS 坐标' : 'My Live GPS Coordinates',
            shortLabel: lang === 'zh' ? '当前位置' : 'your GPS',
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
          lang === 'zh'
            ? '定位权限未开启或暂时不可用，请在下方搜索你的区域、邮编或地址。'
            : 'Location permission was declined or unavailable — search your suburb, postcode, or street below instead.'
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  };

  const placeholderText =
    cityMeta.id === 'shanghai'
      ? lang === 'zh'
        ? '输入地址、商圈或地铁站 — 如：静安寺、淮海中路、陆家嘴、五角场…'
        : 'Type address, district, or Metro station — e.g. 静安寺, 淮海中路, 陆家嘴, 五角场…'
      : cityMeta.id === 'sydney'
        ? lang === 'zh'
          ? '输入悉尼区名、邮编或街道 — 如：2010, Surry Hills, UNSW, Chatswood…'
          : 'Type suburb, postcode, or street — e.g. 2010, Surry Hills, UNSW, Chatswood…'
        : lang === 'zh'
          ? '输入墨尔本区名、邮编或街道 — 如：3053, South Yarra, Clayton, Bourke St…'
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
              {lang === 'zh'
                ? '距离雷达 · 墨尔本 · 悉尼 · 上海'
                : 'Proximity Radar · Melbourne, Sydney & Shanghai'}
            </span>
            <h2 id="my-location-modal-title" className="shortlist-title">
              {lang === 'zh' ? '设置我的位置与最近影院' : 'Set My Location & Closest Cinemas'}
            </h2>
          </div>

          <button
            type="button"
            id="close-my-location-modal-btn"
            className="icon-close-btn"
            onClick={onClose}
            aria-label={lang === 'zh' ? '关闭位置设置弹窗' : 'Close My Location dialog'}
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
                <span className="loc-current-banner__kicker">
                  {lang === 'zh' ? '当前测距起点' : 'ACTIVE DISTANCE ORIGIN'}
                </span>
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
                <span>{lang === 'zh' ? '恢复默认市中心' : 'Reset to Default'}</span>
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
                  ? lang === 'zh'
                    ? '正在获取当前位置坐标…'
                    : 'Detecting your live coordinates…'
                  : lang === 'zh'
                    ? '使用我的实时 GPS 定位'
                    : 'Use My Current GPS Location'}
              </strong>
              <span>
                {lang === 'zh'
                  ? '自动识别所在城市（墨尔本/悉尼/上海）并按距离排序影院'
                  : 'Automatically detects Melbourne, Sydney, or Shanghai & ranks closest cinemas'}
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
              {lang === 'zh'
                ? '或搜索任意商圈、邮编、地标或街道地址'
                : 'Or Search Any Suburb, Postcode, Landmark, or Street Address'}
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
                  aria-label={lang === 'zh' ? '清除搜索' : 'Clear location search'}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {isSearching && (
              <p className="loc-searching-note">
                <Loader2 size={13} className="spin-icon" aria-hidden="true" />{' '}
                {lang === 'zh' ? '正在查询坐标…' : 'Searching coordinates…'}
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
              {lang === 'zh'
                ? `快捷选择 ${displayCityName} 热门片区`
                : `Quick-Pick ${cityMeta.name} Precincts`}
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
