import { useState } from 'react';
import {
  Building2,
  Check,
  Clock,
  Film,
  Heart,
  Link2,
  LocateFixed,
  MapPin,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  CalendarDayOption,
  CinemaVibe,
  CityMeta,
  FilterState,
  FinishByOption,
  FormatType,
  MinRatingOption,
  PriceCapOption,
  ReleaseStatus,
  TimeOfDay,
} from '../types/cinema';
import {
  formatCalendarChipParts,
  formatDistanceKm,
  formatSessionPrice,
} from '../utils/formatters';
import { CITY_LOCATION_HUBS, type UserLocationOrigin } from '../utils/proximity';
import { copyTextSafely, sanitizeSearchQuery } from '../utils/security';

export interface MovieDropdownOption {
  id: string;
  title: string;
}

export interface CinemaDropdownOption {
  id: string;
  name: string;
  suburb: string;
  chain: string;
  distanceKm: number;
  isFavorite: boolean;
}

interface SmartFilterDeckProps {
  cityMeta: CityMeta;
  calendarDays: CalendarDayOption[];
  movieOptions: MovieDropdownOption[];
  cinemaOptions: CinemaDropdownOption[];
  chains: Array<{ chain: string; count: number }>;
  cityFavoriteCount: number;
  suburbs: string[];
  genres: string[];
  filters: FilterState;
  userOrigin: UserLocationOrigin;
  gpsStatus: 'idle' | 'locating' | 'active' | 'blocked';
  activeFilterCount: number;
  isTodaySelected: boolean;
  hiddenPastTodayCount: number;
  inCinemasFilmCount: number;
  comingSoonFilmCount: number;
  onUpdateFilters: (patch: Partial<FilterState>) => void;
  onSelectNearHub: (hubId: string) => void;
  onRequestGps: () => void;
  onChangeReleaseStatus: (status: ReleaseStatus) => void;
  onToggleFormat: (format: FormatType) => void;
  onResetFilters: () => void;
}

const ALL_FORMATS: FormatType[] = [
  'IMAX',
  '35mm / 70mm',
  'Dolby Atmos',
  'Gold Class / LUX',
  'Vmax / Xtremescreen',
  'Standard',
];

const TIME_BUCKETS: Array<{ value: TimeOfDay; label: string; hint: string }> = [
  { value: 'all', label: 'Any Time', hint: 'All day' },
  { value: 'morning', label: 'Morning', hint: 'Before 12 pm' },
  { value: 'afternoon', label: 'Afternoon', hint: '12–5 pm' },
  { value: 'evening', label: 'Evening', hint: '5–8:30 pm' },
  { value: 'late', label: 'Late Night', hint: '8:30 pm+' },
];

const VIBE_OPTIONS: Array<CinemaVibe | 'all'> = [
  'all',
  'Indie & Arthouse',
  'Heritage Palace',
  'Grand Format',
  'Boutique Luxury',
  'Major Multiplex',
];

const RATING_OPTIONS: Array<{ value: MinRatingOption; label: string }> = [
  { value: 'all', label: 'Any Score' },
  { value: 'imdb8', label: 'IMDb 8.0+' },
  { value: 'rt90', label: 'Rotten Tomatoes 90%+' },
  { value: 'douban8', label: 'Douban (豆瓣) 8.0+' },
];

const FINISH_BY_OPTIONS: Array<{ value: FinishByOption; label: string }> = [
  { value: 'all', label: 'Any Finish' },
  { value: '1800', label: 'By 6:00 pm' },
  { value: '2130', label: 'By 9:30 pm' },
  { value: '2230', label: 'By 10:30 pm' },
  { value: '2330', label: 'By 11:30 pm' },
];

export function SmartFilterDeck({
  cityMeta,
  calendarDays,
  movieOptions,
  cinemaOptions,
  chains,
  cityFavoriteCount,
  suburbs,
  genres,
  filters,
  userOrigin,
  gpsStatus,
  activeFilterCount,
  isTodaySelected,
  hiddenPastTodayCount,
  inCinemasFilmCount,
  comingSoonFilmCount,
  onUpdateFilters,
  onSelectNearHub,
  onRequestGps,
  onChangeReleaseStatus,
  onToggleFormat,
  onResetFilters,
}: SmartFilterDeckProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const isComingSoon = filters.releaseStatus === 'coming_soon';
  const isShanghai = cityMeta.id === 'shanghai';
  const priceOptions: Array<{ value: PriceCapOption; label: string }> = isShanghai
    ? [
        { value: 'all', label: 'Any Price' },
        { value: 'under25', label: `Under ${formatSessionPrice(80, 'CNY', true)}` },
        { value: 'under18', label: `Under ${formatSessionPrice(50, 'CNY', true)}` },
      ]
    : [
        { value: 'all', label: 'Any Price' },
        { value: 'under25', label: `Under ${formatSessionPrice(25, 'AUD', true)}` },
        { value: 'under18', label: `Under ${formatSessionPrice(18, 'AUD', true)}` },
      ];

  const handleCopyShareLink = async () => {
    const ok = await copyTextSafely(window.location.href);
    if (ok) {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2400);
    }
  };

  return (
    <section className="filter-deck" aria-label="Session and venue filters">
      {/* Prominent Couture Season Horizon Switcher: IN CINEMAS vs COMING SOON */}
      <div className="season-horizon-bar" role="tablist" aria-label="Exhibition status">
        <button
          type="button"
          role="tab"
          id="deck-tab-in-cinemas"
          aria-selected={!isComingSoon}
          className={`season-horizon-tab ${!isComingSoon ? 'season-horizon-tab--active' : ''}`}
          onClick={() => onChangeReleaseStatus('in_cinemas')}
        >
          <span className="season-horizon-tab__title">In Cinemas</span>
          <span className="season-horizon-tab__sub">
            Now Showing in {cityMeta.name} ({inCinemasFilmCount})
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="deck-tab-coming-soon"
          aria-selected={isComingSoon}
          className={`season-horizon-tab ${isComingSoon ? 'season-horizon-tab--active' : ''}`}
          onClick={() => onChangeReleaseStatus('coming_soon')}
        >
          <span className="season-horizon-tab__title">Coming Soon</span>
          <span className="season-horizon-tab__sub">
            Forthcoming Premieres &amp; Advance Galas ({comingSoonFilmCount})
          </span>
        </button>
      </div>

      {/* Row 1: 7-Day Date Strip (for In Cinemas) + Instant Search */}
      <div
        className={`filter-deck__top-bar ${
          isComingSoon ? 'filter-deck__top-bar--search-only' : ''
        }`}
      >
        {!isComingSoon && (
          <div className="date-strip" role="tablist" aria-label="Screening date">
            {calendarDays.map((day) => {
              const parts = formatCalendarChipParts(day.dateIso, cityMeta.timeZone);
              const isSelected = filters.dateIso === day.dateIso;
              const topTag = day.isToday
                ? 'Today'
                : day.isTomorrow
                  ? 'Tomorrow'
                  : parts.weekdayShort;

              return (
                <button
                  key={day.dateIso}
                  type="button"
                  role="tab"
                  id={`date-tab-${day.dateIso}`}
                  aria-selected={isSelected}
                  className={`date-chip ${isSelected ? 'date-chip--active' : ''} ${
                    day.isCheapTuesday ? 'date-chip--tuesday' : ''
                  }`}
                  onClick={() => onUpdateFilters({ dateIso: day.dateIso })}
                >
                  <span className="date-chip__weekday">{topTag}</span>
                  <span className="date-chip__day">{parts.dayMonthShort}</span>
                  {!isShanghai && day.dayOfWeekIndex === 1 && (
                    <span className="date-chip__deal-tag">Discount Mon</span>
                  )}
                  {day.isCheapTuesday && (
                    <span className="date-chip__deal-tag">
                      {isShanghai ? '周二半价 Tue' : 'Cheap Tue'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="search-box">
          <Search size={15} className="search-box__icon" aria-hidden="true" />
          <input
            id="search-movies-cinemas-input"
            type="search"
            value={filters.searchQuery}
            onChange={(e) =>
              onUpdateFilters({ searchQuery: sanitizeSearchQuery(e.target.value) })
            }
            placeholder={
              isComingSoon
                ? `Search upcoming titles, auteurs, chains, or ${cityMeta.name} houses…`
                : `Search archive — film, auteur, chain, Chinese title, or ${cityMeta.name} suburb…`
            }
            className="search-box__input"
            aria-label="Search films, directors, cinema chains, or suburbs"
          />
          {filters.searchQuery.length > 0 && (
            <button
              type="button"
              id="clear-search-btn"
              className="search-box__clear"
              onClick={() => onUpdateFilters({ searchQuery: '' })}
              aria-label="Clear search query"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Direct Individual Film & Individual Cinema Dropdown Selectors */}
      <div className="direct-select-grid" aria-label="Select individual film or cinema">
        <div
          className={`direct-select-box ${
            filters.selectedMovieId !== 'all' ? 'direct-select-box--active' : ''
          }`}
        >
          <label htmlFor="movie-direct-select" className="direct-select-box__label">
            <Film size={13} aria-hidden="true" />
            <span>Film</span>
          </label>
          <select
            id="movie-direct-select"
            value={filters.selectedMovieId}
            onChange={(e) => onUpdateFilters({ selectedMovieId: e.target.value })}
            className="direct-select-box__select"
          >
            <option value="all">
              {isComingSoon
                ? `All Upcoming Films (${movieOptions.length})`
                : `All Films (${movieOptions.length})`}
            </option>
            {movieOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          {filters.selectedMovieId !== 'all' && (
            <button
              type="button"
              id="clear-movie-select-btn"
              className="direct-select-box__clear"
              onClick={() => onUpdateFilters({ selectedMovieId: 'all' })}
              aria-label="Clear selected film"
              title="Show all films"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div
          className={`direct-select-box ${
            filters.selectedCinemaId !== 'all' ? 'direct-select-box--active' : ''
          }`}
        >
          <label htmlFor="cinema-direct-select" className="direct-select-box__label">
            <Building2 size={13} aria-hidden="true" />
            <span>Cinema</span>
          </label>
          <select
            id="cinema-direct-select"
            value={filters.selectedCinemaId}
            onChange={(e) => onUpdateFilters({ selectedCinemaId: e.target.value })}
            className="direct-select-box__select"
          >
            <option value="all">
              All {cityMeta.name} Cinemas ({cinemaOptions.length})
            </option>
            {cinemaOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.isFavorite ? '♥ ' : ''}
                {c.name} — {c.suburb} · {formatDistanceKm(c.distanceKm)} ({c.chain})
              </option>
            ))}
          </select>
          {filters.selectedCinemaId !== 'all' && (
            <button
              type="button"
              id="clear-cinema-select-btn"
              className="direct-select-box__clear"
              onClick={() => onUpdateFilters({ selectedCinemaId: 'all' })}
              aria-label="Clear selected cinema"
              title="Show all cinemas"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div
          className={`direct-select-box ${
            userOrigin.isCustomOrigin ? 'direct-select-box--active' : ''
          }`}
        >
          <label htmlFor="near-me-hub-select" className="direct-select-box__label">
            <MapPin size={13} aria-hidden="true" />
            <span>Near Me</span>
          </label>
          <select
            id="near-me-hub-select"
            value={userOrigin.id}
            onChange={(e) => onSelectNearHub(e.target.value)}
            className="direct-select-box__select"
            aria-label={`Sort cinemas by distance from ${cityMeta.name} neighborhood`}
          >
            {userOrigin.id === 'gps' && (
              <option value="gps">📍 My Live GPS Location</option>
            )}
            {userOrigin.id === 'custom' && (
              <option value="custom">📍 {userOrigin.label}</option>
            )}
            {CITY_LOCATION_HUBS[cityMeta.id].map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            id="detect-gps-btn"
            className={`gps-trigger-btn ${
              userOrigin.id === 'gps' || userOrigin.id === 'custom'
                ? 'gps-trigger-btn--active'
                : ''
            }`}
            onClick={onRequestGps}
            disabled={gpsStatus === 'locating'}
            title="Set My Location via GPS, postcode, suburb, or street address"
            aria-label="Open My Location finder"
          >
            <LocateFixed size={12} aria-hidden="true" />
            <span>Locate</span>
          </button>
          {userOrigin.isCustomOrigin && (
            <button
              type="button"
              id="clear-near-me-btn"
              className="direct-select-box__clear"
              onClick={() => onSelectNearHub('cbd')}
              aria-label="Reset location to CBD"
              title={`Reset distance anchor to ${cityMeta.name} CBD`}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      {gpsStatus === 'blocked' && (
        <p className="gps-fallback-hint" role="status">
          Browser GPS is restricted on non-HTTPS previews — select any {cityMeta.name} precinct in{' '}
          <strong>Near Me</strong> above to rank all {cinemaOptions.length} cinemas by exact
          distance from you.
        </p>
      )}

      {/* Row 3: Top Cinema Chain & Favorite Cinemas Filter Bar */}
      <div className="filter-row filter-row--chains">
        <span className="filter-row__label">Chain</span>
        <div className="chip-scroll" role="group" aria-label={`${cityMeta.name} cinema chains and favorites`}>
          <button
            type="button"
            id="chain-chip-all"
            className={`filter-chip ${
              filters.chain === 'all' && !filters.favoritesOnly ? 'filter-chip--active' : ''
            }`}
            aria-pressed={filters.chain === 'all' && !filters.favoritesOnly}
            onClick={() => onUpdateFilters({ chain: 'all', favoritesOnly: false })}
          >
            All Chains
          </button>

          <button
            type="button"
            id="chain-chip-favorites"
            className={`filter-chip filter-chip--fav ${
              filters.favoritesOnly ? 'filter-chip--fav-active' : ''
            }`}
            aria-pressed={filters.favoritesOnly}
            onClick={() => onUpdateFilters({ favoritesOnly: !filters.favoritesOnly })}
          >
            <Heart
              size={12}
              aria-hidden="true"
              fill={filters.favoritesOnly ? 'currentColor' : 'none'}
            />
            <span>Favorites ({cityFavoriteCount})</span>
          </button>

          {chains.map(({ chain, count }) => {
            const active = filters.chain === chain;
            const slug = chain.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return (
              <button
                key={chain}
                type="button"
                id={`chain-chip-${slug}`}
                className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
                aria-pressed={active}
                onClick={() => onUpdateFilters({ chain: active ? 'all' : chain })}
              >
                <span>{chain}</span>
                <span className="filter-chip__count">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: Suburb Precinct Chips */}
      <div className="filter-row">
        <span className="filter-row__label">Suburb</span>
        <div className="chip-scroll" role="group" aria-label={`${cityMeta.name} suburbs`}>
          <button
            type="button"
            id="suburb-chip-all"
            className={`filter-chip ${filters.suburb === 'all' ? 'filter-chip--active' : ''}`}
            aria-pressed={filters.suburb === 'all'}
            onClick={() => onUpdateFilters({ suburb: 'all' })}
          >
            All {cityMeta.name}
          </button>
          {suburbs.map((suburb) => {
            const active = filters.suburb === suburb;
            const slug = suburb.toLowerCase().replace(/\s+/g, '-');
            return (
              <button
                key={suburb}
                type="button"
                id={`suburb-chip-${slug}`}
                className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
                aria-pressed={active}
                onClick={() => onUpdateFilters({ suburb: active ? 'all' : suburb })}
              >
                {suburb}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: Time of Day (In Cinemas only) & Format Chips */}
      <div className={isComingSoon ? 'filter-grid-single' : 'filter-grid-two'}>
        {!isComingSoon && (
          <div className="filter-row">
            <span className="filter-row__label">Hour</span>
            <div className="chip-scroll" role="group" aria-label="Time of day">
              {TIME_BUCKETS.map((bucket) => {
                const active = filters.timeOfDay === bucket.value;
                return (
                  <button
                    key={bucket.value}
                    type="button"
                    id={`time-chip-${bucket.value}`}
                    className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
                    aria-pressed={active}
                    title={bucket.hint}
                    onClick={() => onUpdateFilters({ timeOfDay: bucket.value })}
                  >
                    {bucket.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="filter-row">
          <span className="filter-row__label">Format</span>
          <div className="chip-scroll" role="group" aria-label="Screening format">
            {ALL_FORMATS.map((fmt) => {
              const active = filters.formats.includes(fmt);
              const slug = fmt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              return (
                <button
                  key={fmt}
                  type="button"
                  id={`format-chip-${slug}`}
                  className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => onToggleFormat(fmt)}
                >
                  {fmt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 4: Genre, Venue Vibe, Ratings, Budget & Deals */}
      <div className="filter-deck__bottom-bar">
        <div className="select-pair">
          <label className="inline-select">
            <span className="inline-select__label">Genre</span>
            <select
              id="genre-filter-select"
              value={filters.genre}
              onChange={(e) => onUpdateFilters({ genre: e.target.value })}
              className="inline-select__control"
            >
              <option value="all">All Genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-select">
            <span className="inline-select__label">Maison Vibe</span>
            <select
              id="vibe-filter-select"
              value={filters.vibe}
              onChange={(e) =>
                onUpdateFilters({ vibe: e.target.value as CinemaVibe | 'all' })
              }
              className="inline-select__control"
            >
              {VIBE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v === 'all' ? 'All Venue Vibes' : v}
                </option>
              ))}
            </select>
          </label>

          {!isComingSoon && (
            <label className="inline-select">
              <span className="inline-select__label">Budget</span>
              <select
                id="price-filter-select"
                value={filters.priceCap}
                onChange={(e) =>
                  onUpdateFilters({ priceCap: e.target.value as PriceCapOption })
                }
                className="inline-select__control"
              >
                {priceOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!isComingSoon && (
            <label className="inline-select">
              <span className="inline-select__label">Finish By</span>
              <select
                id="finish-by-filter-select"
                value={filters.finishBy}
                onChange={(e) =>
                  onUpdateFilters({ finishBy: e.target.value as FinishByOption })
                }
                className="inline-select__control"
                title="Filter screenings by estimated finish time (including 15 minutes of trailers)"
              >
                {FINISH_BY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="inline-select">
            <span className="inline-select__label">Ratings</span>
            <select
              id="rating-filter-select"
              value={filters.minRating}
              onChange={(e) =>
                onUpdateFilters({ minRating: e.target.value as MinRatingOption })
              }
              className="inline-select__control"
            >
              {RATING_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="deal-and-reset">
          {!isComingSoon && isTodaySelected && (hiddenPastTodayCount > 0 || filters.showPastToday) && (
            <button
              type="button"
              id="past-today-toggle-btn"
              className={`deal-toggle ${filters.showPastToday ? 'deal-toggle--active' : ''}`}
              aria-pressed={filters.showPastToday}
              title={
                filters.showPastToday
                  ? 'Hide sessions that already started more than 15 minutes ago today'
                  : 'Include earlier sessions from today that have already started'
              }
              onClick={() => onUpdateFilters({ showPastToday: !filters.showPastToday })}
            >
              <Clock size={13} aria-hidden="true" />
              <span>
                {filters.showPastToday
                  ? 'Showing Past Today · Hide'
                  : `Past Hidden (${hiddenPastTodayCount}) · Show`}
              </span>
            </button>
          )}

          {!isComingSoon && (
            <button
              type="button"
              id="deals-only-toggle-btn"
              className={`deal-toggle ${filters.dealsOnly ? 'deal-toggle--active' : ''}`}
              aria-pressed={filters.dealsOnly}
              onClick={() => onUpdateFilters({ dealsOnly: !filters.dealsOnly })}
            >
              <Sparkles size={13} aria-hidden="true" />
              <span>
                {isShanghai ? 'VIP & Tue Deals (特惠)' : 'Salon Deals (Mon & Tue)'}
              </span>
            </button>
          )}

          <button
            type="button"
            id="share-filter-link-btn"
            className={`deal-toggle ${copiedLink ? 'deal-toggle--active' : ''}`}
            onClick={handleCopyShareLink}
            title="Copy shareable deep-link URL for this exact city, date, film, and cinema selection"
          >
            {copiedLink ? (
              <Check size={13} aria-hidden="true" />
            ) : (
              <Link2 size={13} aria-hidden="true" />
            )}
            <span>{copiedLink ? 'Link Copied' : 'Share Link'}</span>
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              id="reset-all-filters-btn"
              className="reset-btn"
              onClick={onResetFilters}
            >
              <RotateCcw size={12} aria-hidden="true" />
              <span>Reset ({activeFilterCount})</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
