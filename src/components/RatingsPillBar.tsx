import { BarChart3 } from 'lucide-react';
import type { AppLanguage, Movie } from '../types/cinema';
import { formatPercent, formatTenPointScore } from '../utils/formatters';

interface RatingsPillBarProps {
  movie: Movie;
  lang?: AppLanguage;
  compact?: boolean;
  contextKey?: string;
  onInspectRatings: (movie: Movie) => void;
}

/**
 * Interactive tri-platform ratings bar (IMDb, Rotten Tomatoes, Douban).
 * Clicking opens the detailed cross-platform ratings breakdown modal.
 */
export function RatingsPillBar({
  movie,
  lang = 'en',
  compact = false,
  contextKey,
  onInspectRatings,
}: RatingsPillBarProps) {
  const { imdb, rottenTomatoes, douban } = movie.ratings;
  const suffix = contextKey ? `-${contextKey}` : compact ? '-compact' : '';
  const nr = lang === 'zh' ? '暂无' : 'NR';
  const imdbLabel = imdb.score !== null ? formatTenPointScore(imdb.score) : nr;
  const rtLabel =
    rottenTomatoes.tomatometerPercent !== null
      ? formatPercent(rottenTomatoes.tomatometerPercent)
      : nr;
  const doubanLabel = douban.score !== null ? formatTenPointScore(douban.score) : nr;

  return (
    <button
      type="button"
      id={`check-ratings-${movie.id}${suffix}`}
      className={`ratings-pill-bar ${compact ? 'ratings-pill-bar--compact' : ''}`}
      onClick={() => onInspectRatings(movie)}
      aria-label={
        lang === 'zh'
          ? `查看《${movie.title}》的 IMDb (${imdbLabel})、烂番茄 (${rtLabel})、豆瓣 (${doubanLabel}) 评分详情`
          : `Check IMDb (${imdbLabel}), Rotten Tomatoes (${rtLabel}), and Douban (${doubanLabel}) ratings for ${movie.title}`
      }
      title={
        lang === 'zh'
          ? '点击查看 IMDb、烂番茄与豆瓣完整评分详情'
          : 'Click to inspect full IMDb, Rotten Tomatoes & Douban breakdown'
      }
    >
      <span className="rating-source-chip rating-source-chip--imdb">
        <span className="rating-source-chip__tag">IMDb</span>
        <strong className="rating-source-chip__val">{imdbLabel}</strong>
      </span>

      <span className="rating-source-chip rating-source-chip--rt">
        <span className="rating-source-chip__tag">{lang === 'zh' ? '烂番茄' : 'RT'}</span>
        <strong className="rating-source-chip__val">{rtLabel}</strong>
      </span>

      <span className="rating-source-chip rating-source-chip--douban">
        <span className="rating-source-chip__tag">豆瓣</span>
        <strong className="rating-source-chip__val">{doubanLabel}</strong>
      </span>

      {!compact && (
        <span className="ratings-pill-bar__cta">
          <BarChart3 size={12} aria-hidden="true" />
          <span>{lang === 'zh' ? '评分详情' : 'Check Ratings'}</span>
        </span>
      )}
    </button>
  );
}
