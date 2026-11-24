import { useState } from 'react';
import {
  Bell,
  Calendar,
  CalendarPlus,
  Check,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Navigation,
  Play,
  Sparkles,
  Train,
} from 'lucide-react';
import type {
  AppLanguage,
  BrowseMode,
  Cinema,
  CityMeta,
  Movie,
  UpcomingVenuePreview,
} from '../types/cinema';
import {
  formatAustralianReleaseDate,
  formatDistanceKm,
  formatRuntime,
  getDaysUntilRelease,
} from '../utils/formatters';
import {
  getDisplayCinemaName,
  getDisplayMovieSynopsis,
  getDisplayMovieTagline,
  getDisplayMovieTitle,
  getUiText,
} from '../utils/i18n';
import { getCinemaDistanceInfo, type UserLocationOrigin } from '../utils/proximity';
import {
  buildSafeGoogleMapsUrl,
  downloadReleaseReminderIcs,
  getSafeOutboundCinemaUrl,
} from '../utils/security';
import { MoviePoster } from './MoviePoster';
import { RatingsPillBar } from './RatingsPillBar';

export interface ComingSoonMovieItem {
  movie: Movie;
  cityVenues: Array<{
    cinema: Cinema;
    preview: UpcomingVenuePreview;
  }>;
}

interface ComingSoonViewProps {
  items: ComingSoonMovieItem[];
  cityMeta: CityMeta;
  lang?: AppLanguage;
  userOrigin: UserLocationOrigin;
  browseMode: BrowseMode;
  watchlistedIds: Set<string>;
  favoriteCinemaIds: Set<string>;
  onToggleWatchlist: (movieId: string) => void;
  onToggleFavoriteCinema: (cinemaId: string) => void;
  onInspectRatings: (movie: Movie) => void;
  onWatchTrailer: (movie: Movie) => void;
  onResetFilters: () => void;
}

type ComingSoonSort = 'release_date' | 'imdb' | 'rt' | 'douban';
type ComingSoonHouseSort = 'indie' | 'distance' | 'premieres';

export function ComingSoonView({
  items,
  cityMeta,
  lang = 'en',
  userOrigin,
  browseMode,
  watchlistedIds,
  favoriteCinemaIds,
  onToggleWatchlist,
  onToggleFavoriteCinema,
  onInspectRatings,
  onWatchTrailer,
  onResetFilters,
}: ComingSoonViewProps) {
  const [sortBy, setSortBy] = useState<ComingSoonSort>('release_date');
  const [houseSortBy, setHouseSortBy] = useState<ComingSoonHouseSort>('indie');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const t = getUiText(lang);
  const displayCityName = t.cityNames[cityMeta.id] ?? cityMeta.name;
  const isShanghai = cityMeta.id === 'shanghai';

  // Defensively exclude any stale past-dated entries so old releases never display "RELEASING TODAY"
  const upcomingOnlyItems = items.filter((item) => {
    if (!item.movie.releaseDateIso) return true;
    return getDaysUntilRelease(item.movie.releaseDateIso, cityMeta.timeZone) >= 0;
  });

  const visibleItems = watchlistOnly
    ? upcomingOnlyItems.filter((item) => watchlistedIds.has(item.movie.id))
    : upcomingOnlyItems;

  if (visibleItems.length === 0) {
    return (
      <div className="empty-state" role="status">
        <h2 className="empty-state__title">
          {watchlistOnly
            ? lang === 'zh'
              ? '你的想看清单中暂无匹配新片'
              : 'Your Coming Soon watchlist has no matches here'
            : lang === 'zh'
              ? '当前筛选条件下暂无即将上映影片'
              : 'No forthcoming premieres match these filters'}
        </h2>
        <p className="empty-state__body">
          {watchlistOnly
            ? lang === 'zh'
              ? '点击影片卡片上的「加入想看提醒」，或切回全部即将上映片单。'
              : 'Save upcoming titles using "+ Save to Watchlist", or view the full forthcoming season.'
            : lang === 'zh'
              ? '重置筛选条件，浏览墨尔本、悉尼与上海即将上映的新片定档前瞻。'
              : 'Restore the full archive to explore upcoming Melbourne, Sydney, and Shanghai premieres and advance engagements.'}
        </p>
        <div className="empty-state__actions">
          {watchlistOnly ? (
            <button
              type="button"
              id="show-all-coming-soon-btn"
              className="btn-primary"
              onClick={() => setWatchlistOnly(false)}
            >
              {lang === 'zh' ? '查看全部即将上映影片' : 'View All Forthcoming Works'}
            </button>
          ) : (
            <button
              type="button"
              id="coming-soon-reset-btn"
              className="btn-primary"
              onClick={onResetFilters}
            >
              {lang === 'zh' ? '重置全部筛选' : 'Restore Full Archive'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const sortedMovies = [...visibleItems].sort((a, b) => {
    if (sortBy === 'imdb') {
      return (b.movie.ratings.imdb.score ?? -1) - (a.movie.ratings.imdb.score ?? -1);
    }
    if (sortBy === 'rt') {
      return (
        (b.movie.ratings.rottenTomatoes.tomatometerPercent ?? -1) -
        (a.movie.ratings.rottenTomatoes.tomatometerPercent ?? -1)
      );
    }
    if (sortBy === 'douban') {
      return (b.movie.ratings.douban.score ?? -1) - (a.movie.ratings.douban.score ?? -1);
    }
    return (a.movie.releaseDateIso ?? '').localeCompare(b.movie.releaseDateIso ?? '');
  });

  // If user is in "Maisons & Houses" mode, group upcoming premieres by Cinema House!
  if (browseMode === 'cinemas') {
    const byCinema = new Map<
      string,
      {
        cinema: Cinema;
        entries: Array<{ movie: Movie; preview: UpcomingVenuePreview }>;
      }
    >();

    for (const { movie, cityVenues } of sortedMovies) {
      for (const { cinema, preview } of cityVenues) {
        let group = byCinema.get(cinema.id);
        if (!group) {
          group = { cinema, entries: [] };
          byCinema.set(cinema.id, group);
        }
        group.entries.push({ movie, preview });
      }
    }

    const vibePriority: Record<Cinema['vibe'], number> = {
      'Heritage Palace': 1,
      'Indie & Arthouse': 2,
      'Grand Format': 3,
      'Boutique Luxury': 4,
      'Major Multiplex': 5,
    };

    const effectiveHouseSort: ComingSoonHouseSort =
      userOrigin.isCustomOrigin && houseSortBy === 'indie' ? 'distance' : houseSortBy;

    const houseGroups = Array.from(byCinema.values()).sort((a, b) => {
      const aFav = favoriteCinemaIds.has(a.cinema.id) ? 1 : 0;
      const bFav = favoriteCinemaIds.has(b.cinema.id) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;

      const aDist = getCinemaDistanceInfo(a.cinema, userOrigin).km;
      const bDist = getCinemaDistanceInfo(b.cinema, userOrigin).km;

      if (effectiveHouseSort === 'distance') {
        return aDist - bDist;
      }
      if (effectiveHouseSort === 'premieres') {
        return b.entries.length - a.entries.length;
      }
      const diff = vibePriority[a.cinema.vibe] - vibePriority[b.cinema.vibe];
      if (diff !== 0) return diff;
      return aDist - bDist;
    });

    return (
      <section className="results-section" aria-label="Forthcoming premieres by cinema house">
        <div className="results-toolbar">
          <div className="results-toolbar__title-group">
            <span className="results-toolbar__kicker">
              {lang === 'zh' ? '按影院查看新片前瞻' : 'AVANT-PREMIÈRES BY MAISON'}
            </span>
            <h2 className="results-toolbar__heading">
              {lang === 'zh'
                ? `${displayCityName} ${houseGroups.length} 家预计排映新片影院`
                : `${houseGroups.length} ${cityMeta.name} ${houseGroups.length === 1 ? 'House' : 'Houses'} Expected to Screen Upcoming Releases`}
            </h2>
          </div>

          <div className="cs-toolbar-controls">
            <button
              type="button"
              id="cs-house-watchlist-filter-btn"
              className={`deal-toggle ${watchlistOnly ? 'deal-toggle--active' : ''}`}
              aria-pressed={watchlistOnly}
              onClick={() => setWatchlistOnly((prev) => !prev)}
            >
              <Bell size={13} aria-hidden="true" />
              <span>
                {lang === 'zh'
                  ? `想看清单 (${watchlistedIds.size})`
                  : `Saved Watchlist (${watchlistedIds.size})`}
              </span>
            </button>

            <label className="inline-select">
              <span className="inline-select__label">
                {lang === 'zh' ? '影院排序' : 'Order Venues'}
              </span>
              <select
                id="cs-house-sort-select"
                value={effectiveHouseSort}
                onChange={(e) => setHouseSortBy(e.target.value as ComingSoonHouseSort)}
                className="inline-select__control"
              >
                <option value="indie">
                  {lang === 'zh' ? '艺术与老牌影院优先' : 'Heritage & Indie First'}
                </option>
                <option value="distance">
                  {lang === 'zh'
                    ? `距我最近 (${userOrigin.id === 'gps' ? '当前位置' : userOrigin.shortLabel})`
                    : userOrigin.isCustomOrigin
                      ? `Closest to ${userOrigin.id === 'gps' ? 'You' : userOrigin.shortLabel}`
                      : 'Closest to CBD'}
                </option>
                <option value="premieres">
                  {lang === 'zh' ? '预计新片最多' : 'Most Upcoming Premieres'}
                </option>
              </select>
            </label>
          </div>
        </div>

        <div className="cinema-list">
          {houseGroups.map(({ cinema, entries }) => {
            const safeUrl = getSafeOutboundCinemaUrl(cinema.bookingDomainUrl);
            const googleMapsUrl = buildSafeGoogleMapsUrl(cinema.name, cinema.address);
            const isFav = favoriteCinemaIds.has(cinema.id);
            const dist = getCinemaDistanceInfo(cinema, userOrigin);
            const displayCinema = getDisplayCinemaName(cinema, lang);
            return (
              <article
                key={cinema.id}
                className={`cinema-card ${isFav ? 'cinema-card--favorited' : ''}`}
                id={`coming-soon-cinema-${cinema.id}`}
              >
                <div className="cinema-card__header">
                  <div className="cinema-card__identity">
                    <div className="cinema-card__topline">
                      <span className="chain-tag">{cinema.chain}</span>
                      <span className="vibe-tag vibe-tag--prominent">{cinema.vibe}</span>
                      <span className="cinema-card__suburb">
                        <MapPin size={13} aria-hidden="true" />
                        {cinema.suburb} · {formatDistanceKm(dist.km, lang)} {dist.fullSuffix}
                      </span>
                    </div>
                    <h3 className="cinema-card__name">{displayCinema}</h3>
                    <p className="cinema-card__address">{cinema.address}</p>
                  </div>

                  <div className="cinema-card__cta-group">
                    <button
                      type="button"
                      id={`cs-cinema-fav-${cinema.id}`}
                      className={`fav-maison-btn ${isFav ? 'fav-maison-btn--active' : ''}`}
                      aria-pressed={isFav}
                      onClick={() => onToggleFavoriteCinema(cinema.id)}
                    >
                      <Heart
                        size={13}
                        aria-hidden="true"
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                      <span>{isFav ? t.favorited : t.favorite}</span>
                    </button>

                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      id={`cs-cinema-maps-${cinema.id}`}
                      className="maps-action-btn"
                    >
                      <Navigation size={12} aria-hidden="true" />
                      <span>{t.googleMaps}</span>
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        id={`cs-cinema-site-${cinema.id}`}
                        className="venue-link"
                      >
                        <span>{lang === 'zh' ? '查询影院预售' : 'Check Venue Pre-Sales'}</span>
                        <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="cinema-programme">
                  {entries.map(({ movie, preview }) => {
                    const saved = watchlistedIds.has(movie.id);
                    const releaseFormatted = movie.releaseDateIso
                      ? formatAustralianReleaseDate(movie.releaseDateIso, cityMeta.timeZone, lang)
                      : lang === 'zh'
                        ? '即将定档'
                        : 'Coming Soon';

                    return (
                      <div key={movie.id} className="programme-film-row">
                        <div className="programme-film-row__movie">
                          <MoviePoster movie={movie} size="sm" />
                          <div>
                            <span className="coming-release-kicker">
                              {lang === 'zh'
                                ? `预计上映 · ${releaseFormatted}`
                                : `RELEASES ${releaseFormatted.toUpperCase()}`}
                            </span>
                            <h4 className="programme-film-row__title">
                              {getDisplayMovieTitle(movie, lang, isShanghai)}
                            </h4>
                            <p className="programme-film-row__meta">
                              <span className="rating-badge">{movie.classification}</span>
                              <span>{formatRuntime(movie.runtimeMinutes, lang)}</span>
                              <span>
                                {lang === 'zh' ? `导演：${movie.director}` : `Dir. ${movie.director}`}
                              </span>
                            </p>
                            <div className="programme-film-row__ratings">
                              <RatingsPillBar
                                movie={movie}
                                lang={lang}
                                compact
                                contextKey={`cs-${cinema.id}`}
                                onInspectRatings={onInspectRatings}
                              />
                              {movie.trailerYoutubeKey && (
                                <button
                                  type="button"
                                  id={`cs-house-trailer-${cinema.id}-${movie.id}`}
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

                        <div className="cs-house-preview-box">
                          <div>
                            <span className="format-highlight-badge">{preview.format}</span>
                            <p className="cs-house-preview-box__note">{preview.previewNote}</p>
                          </div>

                          <button
                            type="button"
                            id={`cs-house-watchlist-${cinema.id}-${movie.id}`}
                            className={`watchlist-btn ${saved ? 'watchlist-btn--saved' : ''}`}
                            aria-pressed={saved}
                            onClick={() => onToggleWatchlist(movie.id)}
                          >
                            {saved ? <Check size={13} /> : <Bell size={13} />}
                            <span>
                              {saved
                                ? lang === 'zh'
                                  ? '已加想看'
                                  : 'In Watchlist'
                                : lang === 'zh'
                                  ? '想看提醒'
                                  : 'Watchlist'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="results-section" aria-label="Coming soon film premieres">
      <div className="results-toolbar">
        <div className="results-toolbar__title-group">
          <span className="results-toolbar__kicker">
            {lang === 'zh' ? '新片定档前瞻 · 即将上映' : 'PROCHAINEMENT · FORTHCOMING SEASON'}
          </span>
          <h2 className="results-toolbar__heading">
            {lang === 'zh'
              ? `${displayCityName}即将上映 ${sortedMovies.length} 部新片`
              : `${sortedMovies.length} ${sortedMovies.length === 1 ? 'Premiere' : 'Premieres'} Coming to ${cityMeta.name}`}
          </h2>
        </div>

        <div className="cs-toolbar-controls">
          <button
            type="button"
            id="filter-watchlist-only-btn"
            className={`deal-toggle ${watchlistOnly ? 'deal-toggle--active' : ''}`}
            aria-pressed={watchlistOnly}
            onClick={() => setWatchlistOnly((prev) => !prev)}
          >
            <Bell size={13} aria-hidden="true" />
            <span>
              {lang === 'zh'
                ? `想看清单 (${watchlistedIds.size})`
                : `Saved Watchlist (${watchlistedIds.size})`}
            </span>
          </button>

          <label className="inline-select">
            <span className="inline-select__label">{lang === 'zh' ? '排序' : 'Order'}</span>
            <select
              id="coming-soon-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ComingSoonSort)}
              className="inline-select__control"
            >
              <option value="release_date">
                {lang === 'zh' ? '按上映日期先后' : 'Chronological Release'}
              </option>
              <option value="imdb">
                {lang === 'zh' ? 'IMDb 热度评分优先' : 'Festival Buzz — IMDb'}
              </option>
              <option value="rt">
                {lang === 'zh' ? '烂番茄口碑优先' : 'Festival Buzz — Rotten Tomatoes'}
              </option>
              <option value="douban">
                {lang === 'zh' ? '豆瓣口碑优先' : 'Festival Buzz — Douban (豆瓣)'}
              </option>
            </select>
          </label>
        </div>
      </div>

      <div className="movie-list">
        {sortedMovies.map(({ movie, cityVenues }, index) => {
          const catalogNumber = String(index + 1).padStart(2, '0');
          const releaseFormatted = movie.releaseDateIso
            ? formatAustralianReleaseDate(movie.releaseDateIso, cityMeta.timeZone, lang)
            : lang === 'zh'
              ? '即将上映'
              : 'Forthcoming';
          const daysUntil = movie.releaseDateIso
            ? getDaysUntilRelease(movie.releaseDateIso, cityMeta.timeZone)
            : null;
          const isSaved = watchlistedIds.has(movie.id);
          const displayTitle = getDisplayMovieTitle(movie, lang, isShanghai);
          const displayTagline = getDisplayMovieTagline(movie, lang);
          const displaySynopsis = getDisplayMovieSynopsis(movie, lang);

          return (
            <article key={movie.id} className="movie-card" id={`coming-soon-card-${movie.id}`}>
              <div className="movie-card__film-col">
                <div className="movie-card__poster-wrap">
                  <span className="movie-card__index" aria-hidden="true">
                    {catalogNumber}
                  </span>
                  <MoviePoster movie={movie} size="md" />
                </div>

                <div className="movie-card__details">
                  <div className="cs-release-ribbon">
                    <span className="cs-release-date">
                      <Calendar size={12} aria-hidden="true" />
                      {releaseFormatted}
                    </span>
                    {daysUntil !== null && daysUntil >= 0 && (
                      <span className="cs-countdown-tag">
                        {daysUntil === 0
                          ? lang === 'zh'
                            ? '今日上映'
                            : 'RELEASING TODAY'
                          : lang === 'zh'
                            ? `${daysUntil} 天后上映`
                            : `IN ${daysUntil} ${daysUntil === 1 ? 'DAY' : 'DAYS'}`}
                      </span>
                    )}
                    {movie.releaseOccasion && (
                      <span className="cs-occasion-tag">
                        <Sparkles size={11} aria-hidden="true" />
                        {movie.releaseOccasion}
                      </span>
                    )}
                  </div>

                  <div className="movie-card__badges">
                    <span className="auteur-credit">
                      {lang === 'zh'
                        ? `导演：${movie.director}`
                        : `A FILM BY ${movie.director.toUpperCase()}`}
                    </span>
                    <span
                      className={`rating-badge rating-badge--${movie.classification
                        .toLowerCase()
                        .replace('+', 'plus')}`}
                    >
                      {movie.classification}
                    </span>
                    <span className="meta-inline">
                      <Clock size={12} aria-hidden="true" />
                      {formatRuntime(movie.runtimeMinutes, lang)}
                    </span>
                  </div>

                  <h3 className="movie-card__title">{displayTitle}</h3>
                  <p className="movie-card__epigraph">“{displayTagline}”</p>

                  <p className="movie-card__byline">
                    {movie.genres.join(' · ')} — {movie.languageNote} ({movie.countryOrigin},{' '}
                    {movie.releaseYear})
                  </p>

                  <div className="movie-card__ratings-row">
                    <RatingsPillBar
                      movie={movie}
                      lang={lang}
                      onInspectRatings={onInspectRatings}
                    />
                    {movie.trailerYoutubeKey && (
                      <button
                        type="button"
                        id={`cs-trailer-btn-${movie.id}`}
                        className="trailer-pill-btn"
                        onClick={() => onWatchTrailer(movie)}
                        aria-label={`Watch official trailer for ${movie.title}`}
                      >
                        <Play size={11} aria-hidden="true" fill="currentColor" />
                        <span>{t.watchTrailer}</span>
                      </button>
                    )}
                  </div>

                  <p className="movie-card__synopsis">{displaySynopsis}</p>

                  <p className="movie-card__cast">
                    <span>{lang === 'zh' ? '主演' : 'FEATURING'}</span> {movie.castLead.join(' · ')}
                  </p>

                  {movie.editorialPickReason && (
                    <p className="movie-card__curator-note">{movie.editorialPickReason}</p>
                  )}

                  <div className="cs-watchlist-action-row">
                    <button
                      type="button"
                      id={`watchlist-toggle-${movie.id}`}
                      className={`watchlist-btn ${isSaved ? 'watchlist-btn--saved' : ''}`}
                      aria-pressed={isSaved}
                      onClick={() => onToggleWatchlist(movie.id)}
                    >
                      {isSaved ? <Check size={14} /> : <Bell size={14} />}
                      <span>
                        {isSaved
                          ? lang === 'zh'
                            ? '已加入想看清单'
                            : 'Saved in Watchlist'
                          : lang === 'zh'
                            ? '加入想看提醒'
                            : 'Save to Watchlist'}
                      </span>
                    </button>

                    {movie.releaseDateIso && (
                      <button
                        type="button"
                        id={`cs-release-ics-${movie.id}`}
                        className="watchlist-btn"
                        onClick={() =>
                          downloadReleaseReminderIcs({
                            movieTitle: displayTitle,
                            director: movie.director,
                            releaseDateIso: movie.releaseDateIso!,
                            cityName: displayCityName,
                            genres: movie.genres,
                          })
                        }
                        title={
                          lang === 'zh'
                            ? '导出公映日历提醒 (.ics) 到 Apple 日历 / Outlook'
                            : 'Download release-day .ics reminder for Apple Calendar / Outlook'
                        }
                      >
                        <CalendarPlus size={14} aria-hidden="true" />
                        <span>
                          {lang === 'zh' ? '添加上映日历 (.ics)' : 'Add Release Reminder (.ics)'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="movie-card__venues-col">
                <div className="venues-header">
                  <span>
                    {lang === 'zh'
                      ? `${cityVenues.length} 家预计排映影院`
                      : `${cityVenues.length} EXPECTED ${cityMeta.name.toUpperCase()} ${cityVenues.length === 1 ? 'MAISON' : 'MAISONS'}`}
                  </span>
                  <span className="venues-header__hint">
                    {lang === 'zh'
                      ? '基于院线排映习惯预测 · 请以影院官方预售为准'
                      : 'Projected release venues — check official box office for pre-sales'}
                  </span>
                </div>

                <div className="venue-schedule-stack">
                  {cityVenues.map(({ cinema, preview }) => {
                    const safeUrl = getSafeOutboundCinemaUrl(cinema.bookingDomainUrl);
                    const googleMapsUrl = buildSafeGoogleMapsUrl(cinema.name, cinema.address);
                    const isFav = favoriteCinemaIds.has(cinema.id);
                    const dist = getCinemaDistanceInfo(cinema, userOrigin);
                    const displayCinema = getDisplayCinemaName(cinema, lang);

                    return (
                      <div key={cinema.id} className="venue-schedule-row">
                        <div className="venue-schedule-row__info">
                          <div className="venue-schedule-row__title-line">
                            <button
                              type="button"
                              id={`cs-venue-fav-${movie.id}-${cinema.id}`}
                              className={`fav-inline-btn ${isFav ? 'fav-inline-btn--active' : ''}`}
                              aria-pressed={isFav}
                              aria-label={
                                isFav
                                  ? `Remove ${displayCinema} from favorites`
                                  : `Add ${displayCinema} to favorites`
                              }
                              onClick={() => onToggleFavoriteCinema(cinema.id)}
                            >
                              <Heart
                                size={13}
                                aria-hidden="true"
                                fill={isFav ? 'currentColor' : 'none'}
                              />
                            </button>
                            <h4 className="venue-schedule-row__name">{displayCinema}</h4>
                            <span className="chain-tag chain-tag--compact">{cinema.chain}</span>
                            <span className="vibe-tag">{cinema.vibe}</span>
                          </div>
                          <p className="venue-schedule-row__suburb">
                            <MapPin size={11} aria-hidden="true" />
                            <span>{cinema.suburb}</span>
                            <span aria-hidden="true">—</span>
                            <span>
                              {formatDistanceKm(dist.km, lang)} {dist.compactSuffix}
                            </span>
                          </p>
                          <p className="venue-schedule-row__transit">
                            <Train size={11} aria-hidden="true" />
                            <span>{cinema.transitNote}</span>
                          </p>
                          <div className="venue-schedule-row__maps">
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              id={`cs-venue-maps-${movie.id}-${cinema.id}`}
                              className="maps-inline-btn"
                            >
                              <Navigation size={11} aria-hidden="true" />
                              <span>{t.googleMaps}</span>
                              <ExternalLink size={10} aria-hidden="true" />
                            </a>
                          </div>
                        </div>

                        <div className="cs-preview-ticket-card">
                          <div className="cs-preview-ticket-card__top">
                            <span className="format-highlight-badge">{preview.format}</span>
                          </div>
                          <p className="cs-preview-ticket-card__note">{preview.previewNote}</p>
                          {safeUrl && (
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              id={`cs-advance-link-${movie.id}-${cinema.id}`}
                              className="venue-link"
                            >
                              <span>
                                {lang === 'zh'
                                  ? '查看影院预售动态'
                                  : 'Check Venue Pre-Sales'}
                              </span>
                              <ExternalLink size={11} aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
