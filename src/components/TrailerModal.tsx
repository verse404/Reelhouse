import { useEffect } from 'react';
import { ExternalLink, Film, X } from 'lucide-react';
import type { Movie } from '../types/cinema';
import { formatRuntime } from '../utils/formatters';
import { getSafeYoutubeEmbedUrl, getSafeYoutubeWatchUrl } from '../utils/security';

interface TrailerModalProps {
  movie: Movie | null;
  onClose: () => void;
}

export function TrailerModal({ movie, onClose }: TrailerModalProps) {
  useEffect(() => {
    if (!movie) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movie, onClose]);

  if (!movie) return null;

  const embedUrl = getSafeYoutubeEmbedUrl(movie.trailerYoutubeKey);
  const watchUrl = getSafeYoutubeWatchUrl(movie.trailerYoutubeKey);
  if (!embedUrl) return null;

  return (
    <div
      className="modal-backdrop modal-backdrop--top"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-sheet modal-sheet--trailer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trailer-modal-title"
      >
        <div className="modal-sheet__header">
          <div>
            <span className="ticket-kicker">
              <Film size={13} aria-hidden="true" />
              Official Theatrical Trailer · {movie.releaseYear} · {formatRuntime(movie.runtimeMinutes)}
            </span>
            <h2 id="trailer-modal-title" className="shortlist-title">
              {movie.title}
            </h2>
          </div>

          <div className="trailer-modal__header-actions">
            {watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="trailer-open-youtube-link"
                className="venue-link"
              >
                <span>Open on YouTube</span>
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              id="close-trailer-modal-btn"
              className="icon-close-btn"
              onClick={onClose}
              aria-label="Close trailer player"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="trailer-player-frame">
          <iframe
            src={embedUrl}
            title={`Official trailer for ${movie.title}`}
            className="trailer-player-frame__iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
