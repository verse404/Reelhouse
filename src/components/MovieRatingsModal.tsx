import { useEffect } from 'react';
import { Award, ExternalLink, Star, Users, X } from 'lucide-react';
import type { Movie } from '../types/cinema';
import {
  formatCompactCount,
  formatExactCount,
  formatPercent,
  formatRuntime,
  formatTenPointScore,
} from '../utils/formatters';
import { getSafeOutboundRatingUrl } from '../utils/security';
import { MoviePoster } from './MoviePoster';

interface MovieRatingsModalProps {
  movie: Movie | null;
  onClose: () => void;
}

export function MovieRatingsModal({ movie, onClose }: MovieRatingsModalProps) {
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
            <span className="ticket-kicker">Cross-Platform Film Reception</span>
            <h2 id="ratings-modal-title" className="shortlist-title">
              IMDb · Rotten Tomatoes · Douban (豆瓣)
            </h2>
          </div>

          <button
            type="button"
            id="close-ratings-modal-btn"
            className="icon-close-btn"
            onClick={onClose}
            aria-label="Close ratings breakdown"
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
              <span className="vibe-tag">{formatRuntime(movie.runtimeMinutes)}</span>
            </div>
            <h3 className="ratings-film-banner__title">
              {movie.title}{' '}
              <span className="ratings-film-banner__zh">{douban.chineseTitle}</span>
            </h3>
            <p className="ratings-film-banner__sub">
              Directed by <strong>{movie.director}</strong> · {movie.countryOrigin} ·{' '}
              {movie.genres.join(' / ')}
            </p>
          </div>

          <div className="composite-score-box">
            <span className="composite-score-box__label">Verified Index</span>
            <strong className="composite-score-box__val">
              {compositePercent !== null ? formatPercent(compositePercent) : 'NR'}
            </strong>
            <span className="composite-score-box__hint">
              {normalizedValues.length > 0
                ? `${normalizedValues.length}-platform consensus`
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
                {imdb.votes > 0 ? `${formatCompactCount(imdb.votes)} votes` : 'Official IMDb feed'}
              </span>
            </div>

            <div className="platform-score-main">
              <Star size={22} className="imdb-star-icon" aria-hidden="true" />
              <strong className="platform-score-main__number">
                {imdb.score !== null ? formatTenPointScore(imdb.score) : 'NR'}
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
                ? 'Verified IMDb user rating synced from IMDb’s official daily dataset & OMDb.'
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
                <span>View on IMDb</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </article>

          {/* 2. Rotten Tomatoes */}
          <article className="platform-card platform-card--rt">
            <div className="platform-card__head">
              <span className="platform-brand platform-brand--rt">Rotten Tomatoes</span>
              <span className="rt-cert-pill">
                <Award size={11} aria-hidden="true" />
                {rottenTomatoes.badge}
              </span>
            </div>

            <div className="rt-dual-scores">
              <div className="rt-score-col">
                <span className="rt-score-col__label">Tomatometer</span>
                <strong className="rt-score-col__val">
                  {rottenTomatoes.tomatometerPercent !== null
                    ? formatPercent(rottenTomatoes.tomatometerPercent)
                    : 'NR'}
                </strong>
                <span className="rt-score-col__sub">
                  {rottenTomatoes.criticReviews > 0
                    ? `${rottenTomatoes.criticReviews} critic reviews`
                    : 'Accredited critics'}
                </span>
              </div>

              <div className="rt-score-col">
                <span className="rt-score-col__label">Popcornmeter</span>
                <strong className="rt-score-col__val rt-score-col__val--aud">
                  {rottenTomatoes.audiencePercent !== null
                    ? formatPercent(rottenTomatoes.audiencePercent)
                    : 'NR'}
                </strong>
                <span className="rt-score-col__sub">Verified audience</span>
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
                ? 'Verified critic & audience percentages synced via MDBList / OMDb.'
                : 'No Tomatometer published yet (connect free MDBList API key in LIVE API for full 2026 RT coverage).'}
            </p>

            {safeRtUrl && (
              <a
                href={safeRtUrl}
                target="_blank"
                rel="noopener noreferrer"
                id={`external-rt-link-${movie.id}`}
                className="platform-ext-link"
              >
                <span>View on Rotten Tomatoes</span>
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
                  ? `${formatCompactCount(douban.votes)} votes`
                  : douban.score !== null
                    ? 'Verified score'
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

              {douban.starBreakdownPercent && (
                <div className="douban-histogram" aria-label="Douban 5-star breakdown">
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

            <p className="platform-card__note">
              {douban.votes > 0
                ? `${formatExactCount(douban.votes)} verified Douban voters (${formatExactCount(
                    douban.votes
                  )} 人评价).`
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
                <span>View on Douban (豆瓣电影)</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
