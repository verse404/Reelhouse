import type { AppLanguage, CityTimeZone, ScreeningSession } from '../types/cinema';
import { formatCalendarChipParts, getLocalTodayIso } from '../utils/formatters';
import { SessionPill } from './SessionPill';

interface SessionListByDateProps {
  sessions: ScreeningSession[];
  timeZone: CityTimeZone;
  lang?: AppLanguage;
  showDateGroups?: boolean;
  shortlistedIds: Set<string>;
  onSelectSession: (session: ScreeningSession) => void;
  onToggleShortlist: (sessionId: string) => void;
  ariaLabel?: string;
}

export function SessionListByDate({
  sessions,
  timeZone,
  lang = 'en',
  showDateGroups = false,
  shortlistedIds,
  onSelectSession,
  onToggleShortlist,
  ariaLabel,
}: SessionListByDateProps) {
  const uniqueDates = Array.from(new Set(sessions.map((s) => s.dateIso))).sort();
  const shouldGroup = showDateGroups || uniqueDates.length > 1;

  if (!shouldGroup) {
    return (
      <div className="session-pills-wrap" role="list" aria-label={ariaLabel}>
        {sessions.map((session) => (
          <div key={session.id} role="listitem">
            <SessionPill
              session={session}
              lang={lang}
              isShortlisted={shortlistedIds.has(session.id)}
              onSelectSession={onSelectSession}
              onToggleShortlist={onToggleShortlist}
            />
          </div>
        ))}
      </div>
    );
  }

  const todayIso = getLocalTodayIso(timeZone);
  const byDate = new Map<string, ScreeningSession[]>();
  for (const s of sessions) {
    const bucket = byDate.get(s.dateIso) ?? [];
    bucket.push(s);
    byDate.set(s.dateIso, bucket);
  }

  return (
    <div className="session-date-groups" aria-label={ariaLabel}>
      {uniqueDates.map((dIso) => {
        const daySessions = (byDate.get(dIso) ?? []).sort(
          (a, b) => a.startMinutesFromMidnight - b.startMinutesFromMidnight
        );
        const parts = formatCalendarChipParts(dIso, timeZone, lang);
        const isToday = dIso === todayIso;
        const label = isToday
          ? lang === 'zh'
            ? `今天 · ${parts.dayMonthShort}`
            : `Today · ${parts.dayMonthShort}`
          : `${parts.weekdayShort} · ${parts.dayMonthShort}`;

        return (
          <div key={dIso} className="session-date-group">
            <div className="session-date-group__header">
              <span className="session-date-group__label">{label}</span>
              <span className="session-date-group__count">
                {lang === 'zh'
                  ? `${daySessions.length} 场`
                  : `${daySessions.length} ${daySessions.length === 1 ? 'session' : 'sessions'}`}
              </span>
            </div>
            <div className="session-pills-wrap" role="list">
              {daySessions.map((session) => (
                <div key={session.id} role="listitem">
                  <SessionPill
                    session={session}
                    lang={lang}
                    isShortlisted={shortlistedIds.has(session.id)}
                    onSelectSession={onSelectSession}
                    onToggleShortlist={onToggleShortlist}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
