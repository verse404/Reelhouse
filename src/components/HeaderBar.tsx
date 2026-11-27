import { KeyRound, Languages, LocateFixed, Sun, Moon, User, UserCheck } from 'lucide-react';
import type { AppLanguage, BrowseMode, CityId, ReleaseStatus } from '../types/cinema';
import type { ReelhouseAuthUser } from '../services/firebaseAuth';
import type { CloudSyncState } from './AccountModal';
import { getUiText } from '../utils/i18n';
import type { UserLocationOrigin } from '../utils/proximity';

export type SalonEdition = 'noir' | 'ivoire';

interface HeaderBarProps {
  city: CityId;
  lang: AppLanguage;
  userOrigin: UserLocationOrigin;
  releaseStatus: ReleaseStatus;
  browseMode: BrowseMode;
  edition: SalonEdition;
  showAdminApiButton?: boolean;
  isLiveMode: boolean;
  shortlistCount: number;
  matchingSessionCount: number;
  comingSoonCount: number;
  authUser: ReelhouseAuthUser | null;
  cloudSyncState: CloudSyncState;
  onChangeCity: (city: CityId) => void;
  onToggleLanguage: () => void;
  onChangeReleaseStatus: (status: ReleaseStatus) => void;
  onChangeBrowseMode: (mode: BrowseMode) => void;
  onOpenLocationModal: () => void;
  onToggleEdition: () => void;
  onOpenApiSettings: () => void;
  onOpenAccountModal: () => void;
  onOpenShortlist: () => void;
  onResetHome: () => void;
}

export function HeaderBar({
  city,
  lang,
  userOrigin,
  releaseStatus,
  browseMode,
  edition,
  showAdminApiButton = false,
  isLiveMode,
  shortlistCount,
  matchingSessionCount,
  comingSoonCount,
  authUser,
  cloudSyncState,
  onChangeCity,
  onToggleLanguage,
  onChangeReleaseStatus,
  onChangeBrowseMode,
  onOpenLocationModal,
  onToggleEdition,
  onOpenApiSettings,
  onOpenAccountModal,
  onOpenShortlist,
  onResetHome,
}: HeaderBarProps) {
  const formattedShortlistCount = String(shortlistCount).padStart(2, '0');
  const t = getUiText(lang);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button
          type="button"
          id="brand-home-reset-btn"
          className="brand-lockup brand-lockup--btn"
          onClick={onResetHome}
          aria-label="Return to Reelhouse main programme"
        >
          <span className="brand-lockup__name">REELHOUSE</span>
          <span className="brand-lockup__divider" aria-hidden="true" />
          <span className="brand-lockup__sub">Salon Cinématographique</span>
        </button>

        <nav className="header-controls" aria-label="Primary salon navigation">
          {/* City Tabs */}
          <div className="couture-tabs" role="group" aria-label="Select city">
            <button
              type="button"
              id="city-switch-melbourne"
              className={`couture-tab ${city === 'melbourne' ? 'couture-tab--active' : ''}`}
              aria-pressed={city === 'melbourne'}
              onClick={() => onChangeCity('melbourne')}
            >
              <span>{t.cityNames.melbourne}</span>
              <small>VIC</small>
            </button>
            <button
              type="button"
              id="city-switch-sydney"
              className={`couture-tab ${city === 'sydney' ? 'couture-tab--active' : ''}`}
              aria-pressed={city === 'sydney'}
              onClick={() => onChangeCity('sydney')}
            >
              <span>{t.cityNames.sydney}</span>
              <small>NSW</small>
            </button>
            <button
              type="button"
              id="city-switch-shanghai"
              className={`couture-tab ${city === 'shanghai' ? 'couture-tab--active' : ''}`}
              aria-pressed={city === 'shanghai'}
              onClick={() => onChangeCity('shanghai')}
            >
              <span>{t.cityNames.shanghai}</span>
              <small>SH · 沪</small>
            </button>
          </div>

          <span className="header-rule-v" aria-hidden="true" />

          {/* In Cinemas vs Coming Soon Tabs */}
          <div className="couture-tabs" role="group" aria-label="Release horizon">
            <button
              type="button"
              id="header-status-in-cinemas"
              className={`couture-tab ${
                releaseStatus === 'in_cinemas' ? 'couture-tab--active' : ''
              }`}
              aria-pressed={releaseStatus === 'in_cinemas'}
              onClick={() => onChangeReleaseStatus('in_cinemas')}
            >
              <span>{t.inCinemas}</span>
            </button>
            <button
              type="button"
              id="header-status-coming-soon"
              className={`couture-tab ${
                releaseStatus === 'coming_soon' ? 'couture-tab--active' : ''
              }`}
              aria-pressed={releaseStatus === 'coming_soon'}
              onClick={() => onChangeReleaseStatus('coming_soon')}
            >
              <span>{t.comingSoon}</span>
            </button>
          </div>

          <span className="header-rule-v" aria-hidden="true" />

          {/* Perspective Tabs */}
          <div className="couture-tabs" role="group" aria-label="Browse perspective">
            <button
              type="button"
              id="browse-mode-gallery"
              className={`couture-tab ${browseMode === 'gallery' ? 'couture-tab--active' : ''}`}
              aria-pressed={browseMode === 'gallery'}
              onClick={() => onChangeBrowseMode('gallery')}
            >
              <span>{t.filmsGallery}</span>
            </button>
            <button
              type="button"
              id="browse-mode-movies"
              className={`couture-tab ${browseMode === 'movies' ? 'couture-tab--active' : ''}`}
              aria-pressed={browseMode === 'movies'}
              onClick={() => onChangeBrowseMode('movies')}
            >
              <span>{t.programme}</span>
            </button>
            <button
              type="button"
              id="browse-mode-cinemas"
              className={`couture-tab ${browseMode === 'cinemas' ? 'couture-tab--active' : ''}`}
              aria-pressed={browseMode === 'cinemas'}
              onClick={() => onChangeBrowseMode('cinemas')}
            >
              <span>{t.maisons}</span>
            </button>
            <button
              type="button"
              id="browse-mode-map"
              className={`couture-tab ${browseMode === 'map' ? 'couture-tab--active' : ''}`}
              aria-pressed={browseMode === 'map'}
              onClick={() => onChangeBrowseMode('map')}
            >
              <span>{t.map}</span>
            </button>
          </div>
        </nav>

        <div className="header-actions">
          <span className="header-session-tally" aria-live="polite">
            {releaseStatus === 'in_cinemas'
              ? `${matchingSessionCount} ${matchingSessionCount === 1 ? t.sessionSingular : t.sessionPlural}`
              : `${comingSoonCount} ${comingSoonCount === 1 ? t.premiereSingular : t.premierePlural}`}
          </span>

          <button
            type="button"
            id="open-my-location-header-btn"
            className={`edition-toggle ${
              userOrigin.isCustomOrigin ? 'edition-toggle--live' : ''
            }`}
            onClick={onOpenLocationModal}
            title="Set your GPS or street/suburb location to find the closest cinemas around you"
          >
            <LocateFixed size={12} aria-hidden="true" />
            <span>
              {userOrigin.isCustomOrigin ? `${t.nearPrefix}: ${userOrigin.shortLabel}` : t.myLocation}
            </span>
          </button>

          {showAdminApiButton && (
            <button
              type="button"
              id="open-api-settings-header-btn"
              className={`edition-toggle ${isLiveMode ? 'edition-toggle--live' : ''}`}
              onClick={onOpenApiSettings}
              title="Admin: Configure TMDB, MDBList, OMDb & SerpApi keys for live data"
            >
              <KeyRound size={12} aria-hidden="true" />
              <span>{isLiveMode ? 'LIVE API ✓' : 'LIVE API'}</span>
            </button>
          )}

          <button
            type="button"
            id="toggle-language-btn"
            className={`edition-toggle ${lang === 'zh' ? 'edition-toggle--live' : ''}`}
            onClick={onToggleLanguage}
            aria-label={lang === 'en' ? 'Switch interface to 中文' : 'Switch interface to English'}
            title="Switch Bilingual EN / 中文 Mode"
          >
            <Languages size={12} aria-hidden="true" />
            <span>{lang === 'en' ? '中文' : 'EN'}</span>
          </button>

          <button
            type="button"
            id="toggle-salon-edition-btn"
            className="edition-toggle"
            onClick={onToggleEdition}
            aria-label={
              edition === 'noir'
                ? 'Switch to Ivoire gallery paper edition'
                : 'Switch to Noir obsidian velvet edition'
            }
            title="Switch Noir / Ivoire Salon Edition"
          >
            {edition === 'noir' ? <Sun size={13} /> : <Moon size={13} />}
            <span>{edition === 'noir' ? 'IVOIRE' : 'NOIR'}</span>
          </button>

          <button
            type="button"
            id="open-account-header-btn"
            className={`edition-toggle account-header-btn ${
              authUser ? 'edition-toggle--live account-header-btn--signed-in' : ''
            }`}
            onClick={onOpenAccountModal}
            aria-label={
              authUser
                ? lang === 'zh'
                  ? `会员账号：${authUser.displayName}`
                  : `Member account: ${authUser.displayName}`
                : lang === 'zh'
                  ? '登录或注册 Reelhouse 账号以跨设备同步偏好'
                  : 'Sign in or create an account to sync favorite cinemas across devices'
            }
            title={
              authUser
                ? lang === 'zh'
                  ? '查看会员档案与云端同步设置'
                  : 'Manage member profile & cloud sync preferences'
                : lang === 'zh'
                  ? '登录 / 注册账号保存收藏影院与偏好'
                  : 'Sign in / Register to save favorite cinemas & preferences'
            }
          >
            {authUser ? <UserCheck size={12} aria-hidden="true" /> : <User size={12} aria-hidden="true" />}
            <span className="account-header-btn__label">
              {authUser ? authUser.displayName : lang === 'zh' ? '登录' : 'SIGN IN'}
            </span>
            {authUser && (
              <span
                className={`account-header-btn__dot account-header-btn__dot--${cloudSyncState}`}
                aria-hidden="true"
              />
            )}
          </button>

          <button
            type="button"
            id="open-shortlist-header-btn"
            className={`shortlist-trigger ${
              shortlistCount > 0 ? 'shortlist-trigger--populated' : ''
            }`}
            onClick={onOpenShortlist}
          >
            <span>{t.folio}</span>
            <span className="shortlist-trigger__badge">[{formattedShortlistCount}]</span>
          </button>
        </div>
      </div>
    </header>
  );
}
