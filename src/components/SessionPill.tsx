import { Bookmark, Check, Sparkles } from 'lucide-react';
import type { AppLanguage, ScreeningSession } from '../types/cinema';
import { formatSessionPrice, formatTimeFromMinutes } from '../utils/formatters';

interface SessionPillProps {
  session: ScreeningSession;
  lang?: AppLanguage;
  isShortlisted: boolean;
  onSelectSession: (session: ScreeningSession) => void;
  onToggleShortlist: (sessionId: string) => void;
}

function getFormatShortLabel(
  format: ScreeningSession['format'],
  tags: string[],
  lang: AppLanguage
): string {
  if (tags.some((t) => /70mm/i.test(t))) return '70mm';
  if (tags.some((t) => /35mm/i.test(t))) return '35mm';
  switch (format) {
    case 'IMAX':
      return 'IMAX';
    case 'Dolby Atmos':
      return 'Atmos';
    case '35mm / 70mm':
      return lang === 'zh' ? '胶片' : '35/70mm';
    case 'Gold Class / LUX':
      return lang === 'zh' ? '贵宾厅' : 'Luxury';
    case 'Vmax / Xtremescreen':
      return lang === 'zh' ? '巨幕' : 'Big Screen';
    case 'Standard':
      return lang === 'zh' ? '标准' : 'Standard';
  }
}

function getCompactHighlightTag(tags: string[], lang: AppLanguage): string | null {
  for (const tag of tags) {
    if (tag.includes('原版')) return '原版';
    if (tag.includes('粤语')) return '粤语';
    if (tag.includes('国语')) return lang === 'zh' ? '国语' : 'Mandarin';
    if (/open captions/i.test(tag)) return lang === 'zh' ? '字幕场' : 'OC';
    if (/rooftop/i.test(tag)) return lang === 'zh' ? '露天' : 'Rooftop';
    if (/cinity/i.test(tag)) return 'CINITY';
  }
  return null;
}

export function SessionPill({
  session,
  lang = 'en',
  isShortlisted,
  onSelectSession,
  onToggleShortlist,
}: SessionPillProps) {
  const formattedTime = formatTimeFromMinutes(session.startMinutesFromMidnight);
  const currency = session.currency ?? (session.city === 'shanghai' ? 'CNY' : 'AUD');
  const formattedPrice = formatSessionPrice(session.priceAud, currency, true);
  const isPremiumFormat = session.format !== 'Standard';
  const compactTag = getCompactHighlightTag(session.accessibilityTags, lang);

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
          {compactTag && <span className="session-pill__lang-tag">{compactTag}</span>}
          {session.seatsRemainingLevel === 'low' && (
            <span className="session-pill__scarcity" title="Selling fast">
              {lang === 'zh' ? '余票少' : 'Few left'}
            </span>
          )}
        </span>
        <span className="session-pill__meta-row">
          <span
            className={`session-pill__format ${
              isPremiumFormat ? 'session-pill__format--premium' : ''
            }`}
          >
            {getFormatShortLabel(session.format, session.accessibilityTags, lang)}
          </span>
          <span className="session-pill__price">
            {session.isDealSession && <Sparkles size={11} aria-hidden="true" />}
            <span>{formattedPrice}</span>
            <span className="session-pill__guide-badge">
              {lang === 'zh' ? '参考' : 'Guide'}
            </span>
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
