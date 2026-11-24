import { useState } from 'react';
import {
  Building2,
  Calendar,
  Check,
  Clock,
  Film,
  Heart,
  Link2,
  LocateFixed,
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
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
import { getUiText } from '../utils/i18n';
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
  lang?: AppLanguage;
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

const TIME_BUCKETS: Array<{ value: TimeOfDay; label: string; labelZh: string; hint: string }> = [
  { value: 'all', label: 'Any Time', labelZh: '全天不限', hint: 'All day' },
  { value: 'morning', label: 'Morning', labelZh: '上午场', hint: 'Before 12 pm' },
  { value: 'afternoon', label: 'Afternoon', labelZh: '下午场', hint: '12–5 pm' },
  { value: 'evening', label: 'Evening', labelZh: '黄金晚场', hint: '5–8:30 pm' },
  { value: 'late', label: 'Late Night', labelZh: '深夜场', hint: '8:30 pm+' },
];

const VIBE_OPTIONS: Array<{ value: CinemaVibe | 'all'; labelEn: string; labelZh: string }> = [
  { value: 'all', labelEn: 'All Venue Vibes', labelZh: '全部风格' },
  { value: 'Indie & Arthouse', labelEn: 'Indie & Arthouse', labelZh: '独立与艺术影院' },
  { value: 'Heritage Palace', labelEn: 'Heritage Palace', labelZh: '历史老牌影宫' },
  { value: 'Grand Format', labelEn: 'Grand Format', labelZh: '巨幕与特效厅' },
  { value: 'Boutique Luxury', labelEn: 'Boutique Luxury', labelZh: '精品奢华厅' },
  { value: 'Major Multiplex', labelEn: 'Major Multiplex', labelZh: '大型院线影城' },
];

const RATING_OPTIONS: Array<{ value: MinRatingOption; label: string; labelZh: string }> = [
  { value: 'all', label: 'Any Score', labelZh: '不限评分' },
  { value: 'imdb8', label: 'IMDb 8.0+', labelZh: 'IMDb 8.0+' },
  { value: 'rt90', label: 'Rotten Tomatoes 90%+', labelZh: '烂番茄 90%+' },
  { value: 'douban8', label: 'Douban (豆瓣) 8.0+', labelZh: '豆瓣 8.0+' },
];

const FINISH_BY_OPTIONS: Array<{ value: FinishByOption; label: string; labelZh: string }> = [
  { value: 'all', label: 'Any Finish', labelZh: '散场不限' },
  { value: '1800', label: 'By 6:00 pm', labelZh: '18:00 前散场' },
  { value: '2130', label: 'By 9:30 pm', labelZh: '21:30 前散场' },
  { value: '2230', label: 'By 10:30 pm', labelZh: '22:30 前散场' },
  { value: '2330', label: 'By 11:30 pm', labelZh: '23:30 前散场' },
];

export function SmartFilterDeck({
  cityMeta,
  lang = 'en',
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
  const [multiDayMode, setMultiDayMode] = useState(false);
  const t = getUiText(lang);
  const displayCityName = t.cityNames[cityMeta.id] ?? cityMeta.name;
  const isComingSoon = filters.releaseStatus === 'coming_soon';
  const isShanghai = cityMeta.id === 'shanghai';

  const selectedDates =
    filters.selectedDates && filters.selectedDates.length > 0
      ? filters.selectedDates
      : [filters.dateIso];
  const selectedDateSet = new Set(selectedDates);
  const isMultiActive = multiDayMode || selectedDates.length > 1;
  const calendarOrder = calendarDays.map((d) => d.dateIso);

  const sortDatesInOrder = (dates: string[]) =>
    Array.from(new Set(dates)).sort((a, b) => {
      const ia = calendarOrder.indexOf(a);
      const ib = calendarOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a.localeCompare(b);
    });

  const handleDateChipClick = (
    dateIso: string,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (event.shiftKey && selectedDates.length > 0) {
      const anchor = selectedDates[0];
      const i1 = calendarOrder.indexOf(anchor);
      const i2 = calendarOrder.indexOf(dateIso);
      if (i1 !== -1 && i2 !== -1) {
        const [start, end] = i1 <= i2 ? [i1, i2] : [i2, i1];
        const range = calendarOrder.slice(start, end + 1);
        setMultiDayMode(range.length > 1);
        onUpdateFilters({ dateIso: range[0], selectedDates: range });
        return;
      }
    }

    if (isMultiActive || event.metaKey || event.ctrlKey) {
      if (selectedDateSet.has(dateIso)) {
        if (selectedDates.length <= 1) return; // Always keep at least 1 day selected
        const next = selectedDates.filter((d) => d !== dateIso);
        onUpdateFilters({ dateIso: next[0], selectedDates: next });
      } else {
        const next = sortDatesInOrder([...selectedDates, dateIso]);
        setMultiDayMode(true);
        onUpdateFilters({ dateIso: next[0], selectedDates: next });
      }
      return;
    }

    onUpdateFilters({ dateIso, selectedDates: [dateIso] });
  };

  const handleToggleMultiDayMode = () => {
    if (isMultiActive) {
      setMultiDayMode(false);
      if (selectedDates.length > 1) {
        onUpdateFilters({ dateIso: selectedDates[0], selectedDates: [selectedDates[0]] });
      }
    } else {
      setMultiDayMode(true);
    }
  };

  const upcomingWeekendDates = calendarDays
    .slice(0, 7)
    .filter((d) => d.dayOfWeekIndex === 6 || d.dayOfWeekIndex === 0)
    .map((d) => d.dateIso);
  const next3Dates = calendarDays.slice(0, 3).map((d) => d.dateIso);
  const next7Dates = calendarDays.slice(0, 7).map((d) => d.dateIso);

  const isExactPreset = (preset: string[]) =>
    preset.length > 0 &&
    preset.length === selectedDates.length &&
    preset.every((d) => selectedDateSet.has(d));

  const applyDatePreset = (dates: string[]) => {
    if (dates.length === 0) return;
    const sorted = sortDatesInOrder(dates);
    setMultiDayMode(sorted.length > 1);
    onUpdateFilters({ dateIso: sorted[0], selectedDates: sorted });
  };
  const priceOptions: Array<{ value: PriceCapOption; label: string }> = isShanghai
    ? [
        { value: 'all', label: lang === 'zh' ? '不限票价' : 'Any Price' },
        {
          value: 'under25',
          label:
            lang === 'zh'
              ? `${formatSessionPrice(80, 'CNY', true)} 以内`
              : `Under ${formatSessionPrice(80, 'CNY', true)}`,
        },
        {
          value: 'under18',
          label:
            lang === 'zh'
              ? `${formatSessionPrice(50, 'CNY', true)} 以内`
              : `Under ${formatSessionPrice(50, 'CNY', true)}`,
        },
      ]
    : [
        { value: 'all', label: lang === 'zh' ? '不限票价' : 'Any Price' },
        {
          value: 'under25',
          label:
            lang === 'zh'
              ? `${formatSessionPrice(25, 'AUD', true)} 以内`
              : `Under ${formatSessionPrice(25, 'AUD', true)}`,
        },
        {
          value: 'under18',
          label:
            lang === 'zh'
              ? `${formatSessionPrice(18, 'AUD', true)} 以内`
              : `Under ${formatSessionPrice(18, 'AUD', true)}`,
        },
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
          <span className="season-horizon-tab__title">{t.inCinemas}</span>
          <span className="season-horizon-tab__sub">
            {lang === 'zh'
              ? `${displayCityName}正在热映 (${inCinemasFilmCount} 部)`
              : `Now Showing in ${cityMeta.name} (${inCinemasFilmCount})`}
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
          <span className="season-horizon-tab__title">{t.comingSoon}</span>
          <span className="season-horizon-tab__sub">
            {lang === 'zh'
              ? `新片定档与点映前瞻 (${comingSoonFilmCount} 部)`
              : `Forthcoming Premieres & Advance Galas (${comingSoonFilmCount})`}
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
          <div className="date-strip-col">
            <div className="date-multi-bar" role="group" aria-label={lang === 'zh' ? '多日选择与快捷日期' : 'Multi-day date selection'}>
              <button
                type="button"
                id="date-multi-mode-btn"
                className={`date-multi-pill ${isMultiActive ? 'date-multi-pill--active' : ''}`}
                aria-pressed={isMultiActive}
                onClick={handleToggleMultiDayMode}
                title={
                  lang === 'zh'
                    ? '开启后可同时点选多个日期合并查看场次（也支持 Ctrl/Cmd 或 Shift 连选）'
                    : 'Toggle to select multiple dates at once (or hold Ctrl/Cmd / Shift while clicking)'
                }
              >
                <Calendar size={11} aria-hidden="true" />
                <span>
                  {isMultiActive
                    ? lang === 'zh'
                      ? `多日选择 (${selectedDates.length}天)`
                      : `Multi-Day (${selectedDates.length})`
                    : lang === 'zh'
                      ? '+ 多日选择'
                      : '+ Multi-Day'}
                </span>
              </button>

              {upcomingWeekendDates.length > 1 && (
                <button
                  type="button"
                  id="date-preset-weekend"
                  className={`date-preset-pill ${
                    isExactPreset(upcomingWeekendDates) ? 'date-preset-pill--active' : ''
                  }`}
                  onClick={() => applyDatePreset(upcomingWeekendDates)}
                >
                  {lang === 'zh' ? '本周末' : 'Weekend'}
                </button>
              )}

              {next3Dates.length > 1 && (
                <button
                  type="button"
                  id="date-preset-next3"
                  className={`date-preset-pill ${
                    isExactPreset(next3Dates) ? 'date-preset-pill--active' : ''
                  }`}
                  onClick={() => applyDatePreset(next3Dates)}
                >
                  {lang === 'zh' ? '未来3天' : 'Next 3 Days'}
                </button>
              )}

              {next7Dates.length > 3 && (
                <button
                  type="button"
                  id="date-preset-next7"
                  className={`date-preset-pill ${
                    isExactPreset(next7Dates) ? 'date-preset-pill--active' : ''
                  }`}
                  onClick={() => applyDatePreset(next7Dates)}
                >
                  {lang === 'zh' ? '未来7天' : 'All 7 Days'}
                </button>
              )}

              {selectedDates.length > 1 && (
                <button
                  type="button"
                  id="date-preset-single-reset"
                  className="date-preset-pill date-preset-pill--clear"
                  onClick={() => {
                    setMultiDayMode(false);
                    onUpdateFilters({
                      dateIso: selectedDates[0],
                      selectedDates: [selectedDates[0]],
                    });
                  }}
                >
                  <X size={10} aria-hidden="true" />
                  <span>{lang === 'zh' ? '恢复单日' : 'Single Day'}</span>
                </button>
              )}
            </div>

            <div className="date-strip" role="group" aria-label="Screening dates">
              {calendarDays.map((day) => {
                const parts = formatCalendarChipParts(day.dateIso, cityMeta.timeZone, lang);
                const isSelected = selectedDateSet.has(day.dateIso);
                const topTag = day.isToday
                  ? lang === 'zh'
                    ? '今天'
                    : 'Today'
                  : day.isTomorrow
                    ? lang === 'zh'
                      ? '明天'
                      : 'Tomorrow'
                    : parts.weekdayShort;

                return (
                  <button
                    key={day.dateIso}
                    type="button"
                    id={`date-tab-${day.dateIso}`}
                    aria-pressed={isSelected}
                    className={`date-chip ${isSelected ? 'date-chip--active' : ''} ${
                      day.isCheapTuesday ? 'date-chip--tuesday' : ''
                    } ${isMultiActive ? 'date-chip--multi' : ''}`}
                    onClick={(e) => handleDateChipClick(day.dateIso, e)}
                    title={
                      isMultiActive
                        ? lang === 'zh'
                          ? '点击勾选或取消该日期'
                          : 'Click to toggle this date in your selection'
                        : lang === 'zh'
                          ? '点击切换日期 · 按住 Ctrl/Cmd 可多选'
                          : 'Click to view this date · Ctrl/Cmd+Click to add multiple days'
                    }
                  >
                    {isMultiActive && (
                      <span
                        className={`date-chip__check ${
                          isSelected ? 'date-chip__check--on' : ''
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected ? <Check size={9} /> : '+'}
                      </span>
                    )}
                    <span className="date-chip__weekday">{topTag}</span>
                    <span className="date-chip__day">{parts.dayMonthShort}</span>
                    {!isShanghai && day.dayOfWeekIndex === 1 && (
                      <span className="date-chip__deal-tag">
                        {lang === 'zh' ? '周一特惠' : 'Discount Mon'}
                      </span>
                    )}
                    {day.isCheapTuesday && (
                      <span className="date-chip__deal-tag">
                        {lang === 'zh'
                          ? '周二半价'
                          : isShanghai
                            ? '周二半价 Tue'
                            : 'Cheap Tue'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
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
              lang === 'zh'
                ? isComingSoon
                  ? `搜索即将上映片名、导演、院线或 ${displayCityName} 影院…`
                  : `搜索中英文片名、导演、演员、院线或 ${displayCityName} 商圈…`
                : isComingSoon
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
            <span>{lang === 'zh' ? '影片' : 'Film'}</span>
          </label>
          <select
            id="movie-direct-select"
            value={filters.selectedMovieId}
            onChange={(e) => onUpdateFilters({ selectedMovieId: e.target.value })}
            className="direct-select-box__select"
          >
            <option value="all">
              {lang === 'zh'
                ? isComingSoon
                  ? `全部即将上映 (${movieOptions.length} 部)`
                  : `全部热映影片 (${movieOptions.length} 部)`
                : isComingSoon
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
              title={lang === 'zh' ? '显示全部影片' : 'Show all films'}
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
            <span>{lang === 'zh' ? '影院' : 'Cinema'}</span>
          </label>
          <select
            id="cinema-direct-select"
            value={filters.selectedCinemaId}
            onChange={(e) => onUpdateFilters({ selectedCinemaId: e.target.value })}
            className="direct-select-box__select"
          >
            <option value="all">
              {lang === 'zh'
                ? `全部${displayCityName.split(' ')[0]}影院 (${cinemaOptions.length} 家)`
                : `All ${cityMeta.name} Cinemas (${cinemaOptions.length})`}
            </option>
            {cinemaOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.isFavorite ? '♥ ' : ''}
                {c.name} — {c.suburb} · {formatDistanceKm(c.distanceKm, lang)} ({c.chain})
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
              title={lang === 'zh' ? '显示全部影院' : 'Show all cinemas'}
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
            <span>{lang === 'zh' ? '附近' : 'Near Me'}</span>
          </label>
          <select
            id="near-me-hub-select"
            value={userOrigin.id}
            onChange={(e) => onSelectNearHub(e.target.value)}
            className="direct-select-box__select"
            aria-label={`Sort cinemas by distance from ${cityMeta.name} neighborhood`}
          >
            {userOrigin.id === 'gps' && (
              <option value="gps">
                {lang === 'zh' ? '📍 我的实时 GPS 位置' : '📍 My Live GPS Location'}
              </option>
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
            title={
              lang === 'zh'
                ? '通过 GPS、邮编、商圈或街道地址定位'
                : 'Set My Location via GPS, postcode, suburb, or street address'
            }
            aria-label="Open My Location finder"
          >
            <LocateFixed size={12} aria-hidden="true" />
            <span>{lang === 'zh' ? '定位' : 'Locate'}</span>
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
        <span className="filter-row__label">{lang === 'zh' ? '院线' : 'Chain'}</span>
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
            {t.allChains}
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
            <span>{t.favorites(cityFavoriteCount)}</span>
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
        <span className="filter-row__label">{lang === 'zh' ? '商圈' : 'Suburb'}</span>
        <div className="chip-scroll" role="group" aria-label={`${cityMeta.name} suburbs`}>
          <button
            type="button"
            id="suburb-chip-all"
            className={`filter-chip ${filters.suburb === 'all' ? 'filter-chip--active' : ''}`}
            aria-pressed={filters.suburb === 'all'}
            onClick={() => onUpdateFilters({ suburb: 'all' })}
          >
            {t.allCity(displayCityName)}
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
            <span className="filter-row__label">{lang === 'zh' ? '时段' : 'Hour'}</span>
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
                    {lang === 'zh' ? bucket.labelZh : bucket.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="filter-row">
          <span className="filter-row__label">{lang === 'zh' ? '影厅制式' : 'Format'}</span>
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
            <span className="inline-select__label">{lang === 'zh' ? '类型' : 'Genre'}</span>
            <select
              id="genre-filter-select"
              value={filters.genre}
              onChange={(e) => onUpdateFilters({ genre: e.target.value })}
              className="inline-select__control"
            >
              <option value="all">{lang === 'zh' ? '全部类型' : 'All Genres'}</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-select">
            <span className="inline-select__label">{lang === 'zh' ? '影院风格' : 'Maison Vibe'}</span>
            <select
              id="vibe-filter-select"
              value={filters.vibe}
              onChange={(e) =>
                onUpdateFilters({ vibe: e.target.value as CinemaVibe | 'all' })
              }
              className="inline-select__control"
            >
              {VIBE_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {lang === 'zh' ? v.labelZh : v.labelEn}
                </option>
              ))}
            </select>
          </label>

          {!isComingSoon && (
            <label className="inline-select">
              <span className="inline-select__label">{lang === 'zh' ? '预算' : 'Budget'}</span>
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
              <span className="inline-select__label">{lang === 'zh' ? '散场时间' : 'Finish By'}</span>
              <select
                id="finish-by-filter-select"
                value={filters.finishBy}
                onChange={(e) =>
                  onUpdateFilters({ finishBy: e.target.value as FinishByOption })
                }
                className="inline-select__control"
                title={
                  lang === 'zh'
                    ? '按预计散场时间筛选（含 15 分钟映前预告片）'
                    : 'Filter screenings by estimated finish time (including 15 minutes of trailers)'
                }
              >
                {FINISH_BY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {lang === 'zh' ? opt.labelZh : opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="inline-select">
            <span className="inline-select__label">{lang === 'zh' ? '评分' : 'Ratings'}</span>
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
                  {lang === 'zh' ? r.labelZh : r.label}
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
                lang === 'zh'
                  ? filters.showPastToday
                    ? '隐藏今日已开场超过 15 分钟的场次'
                    : '展开今日已经开场的历史场次'
                  : filters.showPastToday
                    ? 'Hide sessions that already started more than 15 minutes ago today'
                    : 'Include earlier sessions from today that have already started'
              }
              onClick={() => onUpdateFilters({ showPastToday: !filters.showPastToday })}
            >
              <Clock size={13} aria-hidden="true" />
              <span>
                {lang === 'zh'
                  ? filters.showPastToday
                    ? '已展开过时场次 · 隐藏'
                    : `已隐藏 ${hiddenPastTodayCount} 场过时 · 展开`
                  : filters.showPastToday
                    ? 'Showing Past Today · Hide'
                    : `Past Hidden (${hiddenPastTodayCount}) · Show`}
              </span>
            </button>
          )}

          {!isComingSoon && isTodaySelected && (
            <button
              type="button"
              id="make-it-only-toggle-btn"
              className={`deal-toggle make-it-pill ${filters.makeItOnly ? 'deal-toggle--active' : ''}`}
              aria-pressed={filters.makeItOnly}
              title={t.makeItFilterTitle}
              onClick={() => onUpdateFilters({ makeItOnly: !filters.makeItOnly })}
            >
              <Navigation size={13} aria-hidden="true" />
              <span>{t.makeItFilterLabel}</span>
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
              <span>{t.dealsLabel(isShanghai)}</span>
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
            <span>{copiedLink ? t.linkCopied : t.shareLink}</span>
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              id="reset-all-filters-btn"
              className="reset-btn"
              onClick={onResetFilters}
            >
              <RotateCcw size={12} aria-hidden="true" />
              <span>{t.reset(activeFilterCount)}</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
