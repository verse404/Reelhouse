import { KeyRound, LocateFixed, Sun, Moon } from 'lucide-react';
import type { BrowseMode, CityId, ReleaseStatus } from '../types/cinema';
import type { UserLocationOrigin } from '../utils/proximity';

export type SalonEdition = 'noir' | 'ivoire';

interface HeaderBarProps {
  city: CityId;
  userOrigin: UserLocationOrigin;
  releaseStatus: ReleaseStatus;
  browseMode: BrowseMode;
  edition: SalonEdition;
  showAdminApiButton?: boolean;
  isLiveMode: boolean;
  shortlistCount: number;
  matchingSessionCount: number;
  comingSoonCount: number;
  onChangeCity: (city: CityId) => void;
  onChangeReleaseStatus: (status: ReleaseStatus) => void;
  onChangeBrowseMode: (mode: BrowseMode) => void;
  onOpenLocationModal: () => void;
  onToggleEdition: () => void;
  onOpenApiSettings: () => void;
  onOpenShortlist: () => void;
  onResetHome: () => void;
}

export function HeaderBar({
  city,
  userOrigin,
  releaseStatus,
  browseMode,
  edition,
  showAdminApiButton = false,
  isLiveMode,
  shortlistCount,
  matchingSessionCount,
  comingSoonCount,
  onChangeCity,
  onChangeReleaseStatus,
  onChangeBrowseMode,
  onOpenLocationModal,
  onToggleEdition,
  onOpenApiSettings,
  onOpenShortlist,
  onResetHome,
}: HeaderBarProps) {
  const formattedShortlistCount = String(shortlistCount).padStart(2, '0');

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
              <span>Melbourne</span>
              <small>VIC</small>
            </button>
            <button
              type="button"
              id="city-switch-sydney"
              className={`couture-tab ${city === 'sydney' ? 'couture-tab--active' : ''}`}
              aria-pressed={city === 'sydney'}
              onClick={() => onChangeCity('sydney')}
            >
              <span>Sydney</span>
              <small>NSW</small>
            </button>
            <button
              type="button"
              id="city-switch-shanghai"
              className={`couture-tab ${city === 'shanghai' ? 'couture-tab--active' : ''}`}
              aria-pressed={city === 'shanghai'}
              onClick={() => onChangeCity('shanghai')}
            >
              <span>Shanghai</span>
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
              <span>In Cinemas</span>
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
              <span>Coming Soon</span>
            </button>
          </div>

          <span className="header-rule-v" aria-hidden="true" />

          {/* Perspective Tabs */}
          <div className="couture-tabs" role="group" aria-label="Browse perspective">
            <button
              type="button"
              id="browse-mode-movies"
              className={`couture-tab ${browseMode === 'movies' ? 'couture-tab--active' : ''}`}
              aria-pressed={browseMode === 'movies'}
              onClick={() => onChangeBrowseMode('movies')}
            >
              <span>Programme</span>
            </button>
            <button
              type="button"
              id="browse-mode-cinemas"
              className={`couture-tab ${browseMode === 'cinemas' ? 'couture-tab--active' : ''}`}
              aria-pressed={browseMode === 'cinemas'}
              onClick={() => onChangeBrowseMode('cinemas')}
            >
              <span>Maisons</span>
            </button>
          </div>
        </nav>

        <div className="header-actions">
          <span className="header-session-tally" aria-live="polite">
            {releaseStatus === 'in_cinemas'
              ? `${matchingSessionCount} ${matchingSessionCount === 1 ? 'session' : 'sessions'}`
              : `${comingSoonCount} ${comingSoonCount === 1 ? 'premiere' : 'premieres'}`}
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
              {userOrigin.isCustomOrigin ? `NEAR: ${userOrigin.shortLabel}` : 'MY LOCATION'}
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
            id="open-shortlist-header-btn"
            className={`shortlist-trigger ${
              shortlistCount > 0 ? 'shortlist-trigger--populated' : ''
            }`}
            onClick={onOpenShortlist}
          >
            <span>FOLIO</span>
            <span className="shortlist-trigger__badge">[{formattedShortlistCount}]</span>
          </button>
        </div>
      </div>
    </header>
  );
}
