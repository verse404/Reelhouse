import { Bookmark, Check, Sparkles } from 'lucide-react';
import type { ScreeningSession } from '../types/cinema';
import { formatSessionPrice, formatTimeFromMinutes } from '../utils/formatters';

interface SessionPillProps {
  session: ScreeningSession;
  isShortlisted: boolean;
  onSelectSession: (session: ScreeningSession) => void;
  onToggleShortlist: (sessionId: string) => void;
}

function getFormatShortLabel(format: ScreeningSession['format']): string {
  switch (format) {
    case 'IMAX':
      return 'IMAX';
    case 'Dolby Atmos':
      return 'Atmos';
    case '35mm / 70mm':
      return 'Film Print';
    case 'Gold Class / LUX':
      return 'Luxury';
    case 'Vmax / Xtremescreen':
      return 'Big Screen';
    case 'Standard':
      return 'Standard';
  }
}

export function SessionPill({
  session,
  isShortlisted,
  onSelectSession,
  onToggleShortlist,
}: SessionPillProps) {
  const formattedTime = formatTimeFromMinutes(session.startMinutesFromMidnight);
  const currency = session.currency ?? (session.city === 'shanghai' ? 'CNY' : 'AUD');
  const formattedPrice = formatSessionPrice(session.priceAud, currency, true);
  const isPremiumFormat = session.format !== 'Standard';

  return (
    <div
      className={`session-pill ${isShortlisted ? 'session-pill--shortlisted' : ''} ${
        session.isDealSession ? 'session-pill--deal' : ''
      }`}
    >
      <button
        type="button"
        id={`session-open-${session.id}`}
        className="session-pill__main"
        onClick={() => onSelectSession(session)}
        aria-label={`Inspect ${formattedTime} ${session.format} session — Guide Price ${formattedPrice}`}
        title={session.priceNote || `Published Box-Office Guide Price: ${formattedPrice}`}
      >
        <span className="session-pill__top-row">
          <span className="session-pill__time">{formattedTime}</span>
          {session.seatsRemainingLevel === 'low' && (
            <span className="session-pill__scarcity" title="Selling fast">
              Few left
            </span>
          )}
        </span>
        <span className="session-pill__meta-row">
          <span
            className={`session-pill__format ${
              isPremiumFormat ? 'session-pill__format--premium' : ''
            }`}
          >
            {getFormatShortLabel(session.format)}
          </span>
          <span className="session-pill__price">
            {session.isDealSession && <Sparkles size={11} aria-hidden="true" />}
            <span>{formattedPrice}</span>
            <span className="session-pill__guide-badge">Guide</span>
          </span>
        </span>
      </button>

      <button
        type="button"
        id={`session-pin-${session.id}`}
        className={`session-pill__pin ${isShortlisted ? 'session-pill__pin--active' : ''}`}
        onClick={() => onToggleShortlist(session.id)}
        aria-pressed={isShortlisted}
        aria-label={
          isShortlisted ? 'Remove session from shortlist' : 'Pin session to comparison shortlist'
        }
        title={isShortlisted ? 'Pinned to shortlist' : 'Compare in shortlist'}
      >
        {isShortlisted ? <Check size={14} strokeWidth={2.4} /> : <Bookmark size={14} />}
      </button>
    </div>
  );
}
