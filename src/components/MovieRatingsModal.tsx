import { useEffect } from 'react';
import { Award, ExternalLink, Star, Users, X } from 'lucide-react';
import type { AppLanguage, Movie } from '../types/cinema';
import {
  formatCompactCount,
  formatExactCount,
  formatPercent,
  formatRuntime,
  formatTenPointScore,
} from '../utils/formatters';
import { getDisplayMovieTitle } from '../utils/i18n';
import { getSafeOutboundRatingUrl } from '../utils/security';
import { MoviePoster } from './MoviePoster';

interface MovieRatingsModalProps {
  movie: Movie | null;
  lang?: AppLanguage;
  onClose: () => void;
}

export function MovieRatingsModal({ movie, lang = 'en', onClose }: MovieRatingsModalProps) {
  useEffect(() => {
    if (!movie) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movie, onClose]);

  if (!movie) return null;

  const { imdb, rottenTomatoes, douban } = movie.ratings;
  const safeImdbUrl = getSafeOutboundRatingUrl(imdb.url);
  const safeRtUrl = getSafeOutboundRatingUrl(rottenTomatoes.url);
  const safeDoubanUrl = getSafeOutboundRatingUrl(douban.url);

  // Normalized composite index out of 100 across verified non-null platforms
  const normalizedValues: number[] = [];
  if (imdb.score !== null) normalizedValues.push(imdb.score * 10);
  if (rottenTomatoes.tomatometerPercent !== null) {
    normalizedValues.push(rottenTomatoes.tomatometerPercent);
  }
  if (douban.score !== null) normalizedValues.push(douban.score * 10);

  const compositePercent =
    normalizedValues.length > 0
      ? Math.round(
          normalizedValues.reduce((acc, v) => acc + v, 0) / normalizedValues.length
        )
      : null;

  const displayTitle = getDisplayMovieTitle(movie, lang, false);

  return (
    <div
      className="modal-backdrop modal-backdrop--top"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-sheet modal-sheet--ratings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ratings-modal-title"
      >
        <div className="modal-sheet__header">
          <div>
            <span className="ticket-kicker">
              {lang === 'zh' ? '跨平台综合口碑评分' : 'Cross-Platform Film Reception'}
            </span>
            <h2 id="ratings-modal-title" className="shortlist-title">
              {lang === 'zh'
                ? 'IMDb · 烂番茄 · 豆瓣电影'
                : 'IMDb · Rotten Tomatoes · Douban (豆瓣)'}
            </h2>
          </div>

          <button
            type="button"
            id="close-ratings-modal-btn"
            className="icon-close-btn"
            onClick={onClose}
            aria-label={lang === 'zh' ? '关闭评分详情弹窗' : 'Close ratings breakdown'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Film summary banner */}
        <div className="ratings-film-banner">
          <MoviePoster movie={movie} size="sm" />
          <div className="ratings-film-banner__meta">
            <div className="movie-card__badges">
              <span className="rating-badge">{movie.classification}</span>
              <span className="vibe-tag">{movie.releaseYear}</span>
              <span className="vibe-tag">{formatRuntime(movie.runtimeMinutes, lang)}</span>
            </div>
            <h3 className="ratings-film-banner__title">
              {lang === 'zh' ? (
                displayTitle
              ) : (
                <>
                  {movie.title}{' '}
                  {douban.chineseTitle && douban.chineseTitle !== movie.title && (
                    <span className="ratings-film-banner__zh">{douban.chineseTitle}</span>
                  )}
                </>
              )}
            </h3>
            <p className="ratings-film-banner__sub">
              {lang === 'zh' ? '导演：' : 'Directed by '}
              <strong>{movie.director}</strong> · {movie.countryOrigin} ·{' '}
              {movie.genres.join(' / ')}
            </p>
          </div>

          <div className="composite-score-box">
            <span className="composite-score-box__label">
              {lang === 'zh' ? '综合口碑指数' : 'Verified Index'}
            </span>
            <strong className="composite-score-box__val">
              {compositePercent !== null
                ? formatPercent(compositePercent)
                : lang === 'zh'
                  ? '暂无'
                  : 'NR'}
            </strong>
            <span className="composite-score-box__hint">
              {normalizedValues.length > 0
                ? lang === 'zh'
                  ? `基于 ${normalizedValues.length} 个平台实测均值`
                  : `${normalizedValues.length}-platform consensus`
                : lang === 'zh'
                  ? '待开分'
                  : 'Awaiting scores'}
            </span>
          </div>
        </div>

        {/* 3-Column Platform Cards */}
        <div className="platform-ratings-grid">
          {/* 1. IMDb */}
          <article className="platform-card platform-card--imdb">
            <div className="platform-card__head">
              <span className="platform-brand platform-brand--imdb">IMDb</span>
              <span className="platform-card__count">
                <Users size={12} aria-hidden="true" />
                {imdb.votes > 0
                  ? lang === 'zh'
                    ? `${formatCompactCount(imdb.votes, lang)} 人评分`
                    : `${formatCompactCount(imdb.votes, lang)} votes`
                  : lang === 'zh'
                    ? 'IMDb 官方数据'
                    : 'Official IMDb feed'}
              </span>
            </div>

            <div className="platform-score-main">
              <Star size={22} className="imdb-star-icon" aria-hidden="true" />
              <strong className="platform-score-main__number">
                {imdb.score !== null ? formatTenPointScore(imdb.score) : lang === 'zh' ? '暂无' : 'NR'}
              </strong>
              {imdb.score !== null && <span className="platform-score-main__denom">/ 10</span>}
            </div>

            <div className="meter-track" aria-hidden="true">
              <div
                className="meter-fill meter-fill--imdb"
                style={{ width: `${imdb.score !== null ? Math.min(100, imdb.score * 10) : 0}%` }}
              />
            </div>

            <p className="platform-card__note">
              {imdb.score !== null
                ? lang === 'zh'
                  ? '同步自 IMDb 官方每日评分库与 OMDb。'
                  : 'Verified IMDb user rating synced from IMDb’s official daily dataset & OMDb.'
                : lang === 'zh'
                  ? 'IMDb 暂未开分（尚未公映或评分人数不足）。'
                  : 'Not yet rated on IMDb (pre-release or insufficient opening-day ballots).'}
            </p>

            {safeImdbUrl && (
              <a
                href={safeImdbUrl}
                target="_blank"
                rel="noopener noreferrer"
                id={`external-imdb-link-${movie.id}`}
                className="platform-ext-link"
              >
                <span>{lang === 'zh' ? '前往 IMDb 查看' : 'View on IMDb'}</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </article>

          {/* 2. Rotten Tomatoes */}
          <article className="platform-card platform-card--rt">
            <div className="platform-card__head">
              <span className="platform-brand platform-brand--rt">
                {lang === 'zh' ? '烂番茄 Rotten Tomatoes' : 'Rotten Tomatoes'}
              </span>
              <span className="rt-cert-pill">
                <Award size={11} aria-hidden="true" />
                {rottenTomatoes.badge}
              </span>
            </div>

            <div className="rt-dual-scores">
              <div className="rt-score-col">
                <span className="rt-score-col__label">
                  {lang === 'zh' ? '专业影评' : 'Tomatometer'}
                </span>
                <strong className="rt-score-col__val">
                  {rottenTomatoes.tomatometerPercent !== null
                    ? formatPercent(rottenTomatoes.tomatometerPercent)
                    : lang === 'zh'
                      ? '暂无'
                      : 'NR'}
                </strong>
                <span className="rt-score-col__sub">
                  {rottenTomatoes.criticReviews > 0
                    ? lang === 'zh'
                      ? `${rottenTomatoes.criticReviews} 篇影评`
                      : `${rottenTomatoes.criticReviews} critic reviews`
                    : lang === 'zh'
                      ? '认证影评人'
                      : 'Accredited critics'}
                </span>
              </div>

              <div className="rt-score-col">
                <span className="rt-score-col__label">
                  {lang === 'zh' ? '观众爆米花' : 'Popcornmeter'}
                </span>
                <strong className="rt-score-col__val rt-score-col__val--aud">
                  {rottenTomatoes.audiencePercent !== null
                    ? formatPercent(rottenTomatoes.audiencePercent)
                    : lang === 'zh'
                      ? '暂无'
                      : 'NR'}
                </strong>
                <span className="rt-score-col__sub">
                  {lang === 'zh' ? '购票认证观众' : 'Verified audience'}
                </span>
              </div>
            </div>

            <div className="meter-track" aria-hidden="true">
              <div
                className="meter-fill meter-fill--rt"
                style={{ width: `${rottenTomatoes.tomatometerPercent ?? 0}%` }}
              />
            </div>

            <p className="platform-card__note">
              {rottenTomatoes.tomatometerPercent !== null
                ? lang === 'zh'
                  ? '同步自 MDBList 与 OMDb 的专业媒体与观众口碑。'
                  : 'Verified critic & audience percentages synced via MDBList / OMDb.'
                : lang === 'zh'
                  ? '烂番茄暂未发布新鲜度评分。'
                  : 'No Tomatometer published yet (awaiting accredited critic reviews).'}
            </p>

            {safeRtUrl && (
              <a
                href={safeRtUrl}
                target="_blank"
                rel="noopener noreferrer"
                id={`external-rt-link-${movie.id}`}
                className="platform-ext-link"
              >
                <span>{lang === 'zh' ? '前往烂番茄查看' : 'View on Rotten Tomatoes'}</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </article>

          {/* 3. Douban (豆瓣电影) */}
          <article className="platform-card platform-card--douban">
            <div className="platform-card__head">
              <span className="platform-brand platform-brand--douban">豆瓣 Douban</span>
              <span className="platform-card__count">
                <Users size={12} aria-hidden="true" />
                {douban.votes > 0
                  ? lang === 'zh'
                    ? `${formatCompactCount(douban.votes, lang)} 人评价`
                    : `${formatCompactCount(douban.votes, lang)} votes`
                  : douban.score !== null
                    ? lang === 'zh'
                      ? '已收录评分'
                      : 'Verified score'
                    : lang === 'zh'
                      ? '暂无评分'
                      : '0 votes'}
              </span>
            </div>

            <div className="douban-score-and-bars">
              <div className="douban-big-score">
                <strong>
                  {douban.score !== null ? formatTenPointScore(douban.score) : '暂无'}
                </strong>
                {douban.score !== null && <span>/ 10</span>}
              </div>

              {Array.isArray(douban.starBreakdownPercent) &&
                douban.starBreakdownPercent.length === 5 && (
                  <div
                    className="douban-histogram"
                    aria-label={lang === 'zh' ? '豆瓣五星评分分布' : 'Douban 5-star breakdown'}
                  >
                    {douban.starBreakdownPercent.map((pct, index) => {
                      const stars = 5 - index;
                      return (
                        <div key={stars} className="douban-hist-row">
                          <span className="douban-hist-row__label">{stars}★</span>
                          <div className="douban-hist-row__bar-bg">
                            <div
                              className="douban-hist-row__bar-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="douban-hist-row__pct">{formatPercent(pct)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>

            <div className="meter-track" aria-hidden="true">
              <div
                className="meter-fill meter-fill--imdb"
                style={{ width: `${douban.score !== null ? Math.min(100, douban.score * 10) : 0}%` }}
              />
            </div>

            <p className="platform-card__note">
              {douban.votes > 0
                ? lang === 'zh'
                  ? `来自豆瓣电影 ${formatExactCount(douban.votes)} 位观众实测评价。`
                  : `${formatExactCount(douban.votes)} verified Douban voters (${formatExactCount(
                      douban.votes
                    )} 人评价).`
                : douban.score !== null
                  ? lang === 'zh'
                    ? '已同步豆瓣电影实测评分（具体星级占比请前往豆瓣页面查看）。'
                    : 'Verified Douban rating synced from Douban film archive.'
                  : lang === 'zh'
                    ? '豆瓣暂未开分（尚未公映或评价人数不足）。'
                    : 'Not yet rated on Douban (暂无评分).'}
            </p>

            {safeDoubanUrl && (
              <a
                href={safeDoubanUrl}
                target="_blank"
                rel="noopener noreferrer"
                id={`external-douban-link-${movie.id}`}
                className="platform-ext-link"
              >
                <span>{lang === 'zh' ? '前往豆瓣电影查看' : 'View on Douban (豆瓣电影)'}</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
