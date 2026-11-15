import { BarChart3 } from 'lucide-react';
import type { Movie } from '../types/cinema';
import { formatPercent, formatTenPointScore } from '../utils/formatters';

interface RatingsPillBarProps {
  movie: Movie;
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
  compact = false,
  contextKey,
  onInspectRatings,
}: RatingsPillBarProps) {
  const { imdb, rottenTomatoes, douban } = movie.ratings;
  const suffix = contextKey ? `-${contextKey}` : compact ? '-compact' : '';
  const imdbLabel = imdb.score !== null ? formatTenPointScore(imdb.score) : 'NR';
  const rtLabel =
    rottenTomatoes.tomatometerPercent !== null
      ? formatPercent(rottenTomatoes.tomatometerPercent)
      : 'NR';
  const doubanLabel = douban.score !== null ? formatTenPointScore(douban.score) : 'NR';

  return (
    <button
      type="button"
      id={`check-ratings-${movie.id}${suffix}`}
      className={`ratings-pill-bar ${compact ? 'ratings-pill-bar--compact' : ''}`}
      onClick={() => onInspectRatings(movie)}
      aria-label={`Check IMDb (${imdbLabel}), Rotten Tomatoes (${rtLabel}), and Douban (${doubanLabel}) ratings for ${movie.title}`}
      title="Click to inspect full IMDb, Rotten Tomatoes & Douban breakdown"
    >
      <span className="rating-source-chip rating-source-chip--imdb">
        <span className="rating-source-chip__tag">IMDb</span>
        <strong className="rating-source-chip__val">{imdbLabel}</strong>
      </span>

      <span className="rating-source-chip rating-source-chip--rt">
        <span className="rating-source-chip__tag">RT</span>
        <strong className="rating-source-chip__val">{rtLabel}</strong>
      </span>

      <span className="rating-source-chip rating-source-chip--douban">
        <span className="rating-source-chip__tag">豆瓣</span>
        <strong className="rating-source-chip__val">{doubanLabel}</strong>
      </span>

      {!compact && (
        <span className="ratings-pill-bar__cta">
          <BarChart3 size={12} aria-hidden="true" />
          <span>Check Ratings</span>
        </span>
      )}
    </button>
  );
}
