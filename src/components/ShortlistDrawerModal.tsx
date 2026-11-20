import { useEffect, useState } from 'react';
import {
  Award,
  CalendarPlus,
  Check,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Navigation,
  Play,
  Sparkles,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  Cinema,
  CityId,
  Movie,
  ScreeningSession,
  ShortlistEntry,
} from '../types/cinema';
import { CITIES } from '../data/catalog';
import {
  formatCalendarChipParts,
  formatDistanceKm,
  formatPercent,
  formatSessionPrice,
  formatSessionWindow,
  formatTenPointScore,
} from '../utils/formatters';
import { getDisplayCinemaName, getDisplayMovieTitle, getUiText } from '../utils/i18n';
import { exportShortlistCardPng } from '../utils/planner';
import { getCinemaDistanceInfo, type UserLocationOrigin } from '../utils/proximity';
import {
  buildSafeGoogleCalendarUrl,
  buildSafeGoogleMapsUrl,
  buildShareableFolioUrl,
  copyTextSafely,
  downloadIcsFile,
  getSafeOutboundCinemaUrl,
} from '../utils/security';
import { MoviePoster } from './MoviePoster';
import { RatingsPillBar } from './RatingsPillBar';

export interface HydratedShortlistItem {
  entry: ShortlistEntry;
  session: ScreeningSession;
  movie: Movie;
  cinema: Cinema;
}

interface ShortlistDrawerModalProps {
  isOpen: boolean;
  items: HydratedShortlistItem[];
  activeCity: CityId;
  lang?: AppLanguage;
  userOrigin: UserLocationOrigin;
  hasTopOverlay?: boolean;
  onClose: () => void;
  onVote: (sessionId: string) => void;
  onRemove: (sessionId: string) => void;
  onClearAll: () => void;
  onInspectRatings: (movie: Movie) => void;
  onWatchTrailer: (movie: Movie) => void;
}

const FORMAT_GRANDEUR_SCORE: Record<ScreeningSession['format'], number> = {
  IMAX: 6,
  '35mm / 70mm': 5,
  'Dolby Atmos': 4,
  'Vmax / Xtremescreen': 3,
  'Gold Class / LUX': 3,
  Standard: 1,
};

export function ShortlistDrawerModal({
  isOpen,
  items,
  activeCity,
  lang = 'en',
  userOrigin,
  hasTopOverlay = false,
  onClose,
  onVote,
  onRemove,
  onClearAll,
  onInspectRatings,
  onWatchTrailer,
}: ShortlistDrawerModalProps) {
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [copiedLinkFeedback, setCopiedLinkFeedback] = useState(false);
  const [copiedVoteReply, setCopiedVoteReply] = useState(false);
  const [savedCardPng, setSavedCardPng] = useState(false);

  const t = getUiText(lang);

  useEffect(() => {
    if (!isOpen || hasTopOverlay) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, hasTopOverlay, onClose]);

  if (!isOpen) return null;

  // Compute smart decision badges across candidate sessions
  const minPrice = items.length > 0 ? Math.min(...items.map((i) => i.session.priceAud)) : 0;
  const maxFormatRank =
    items.length > 0
      ? Math.max(...items.map((i) => FORMAT_GRANDEUR_SCORE[i.session.format]))
      : 0;
  const maxCritic =
    items.length > 0 ? Math.max(...items.map((i) => i.movie.criticScorePercent)) : 0;
  const maxVotes = items.length > 0 ? Math.max(...items.map((i) => i.entry.votes)) : 0;

  const folioShareItems = items.map((i) => ({
    sessionId: i.session.id,
    votes: i.entry.votes,
  }));

  const handleCopyGroupPlan = async () => {
    if (items.length === 0) return;
    const shareUrl = buildShareableFolioUrl(activeCity, folioShareItems, lang, false);
    const lines = [
      lang === 'zh'
        ? '🎬 今晚观影候选清单 — 点击链接直接比价与投票：'
        : '🎬 Movie Night Options — Vote & Compare:',
      shareUrl,
      '',
      ...items.map((item, idx) => {
        const cityMeta = CITIES[item.session.city];
        const dayParts = formatCalendarChipParts(item.session.dateIso, cityMeta.timeZone, lang);
        const win = formatSessionWindow(
          item.session.startMinutesFromMidnight,
          item.movie.runtimeMinutes
        );
        const imdbStr =
          item.movie.ratings.imdb.score !== null
            ? formatTenPointScore(item.movie.ratings.imdb.score)
            : 'NR';
        const rtStr =
          item.movie.ratings.rottenTomatoes.tomatometerPercent !== null
            ? formatPercent(item.movie.ratings.rottenTomatoes.tomatometerPercent)
            : 'NR';
        const dbStr =
          item.movie.ratings.douban.score !== null
            ? formatTenPointScore(item.movie.ratings.douban.score)
            : 'NR';
        const sessCurrency = item.session.currency ?? cityMeta.currency;
        const displayTitle = getDisplayMovieTitle(item.movie, lang, item.session.city === 'shanghai');
        const displayCinema = getDisplayCinemaName(item.cinema, lang);
        return `${idx + 1}. ${displayTitle} (${item.movie.classification} | IMDb ${imdbStr} · RT ${rtStr} · 豆瓣 ${dbStr}) — ${displayCinema}, ${item.cinema.suburb} | ${dayParts.weekdayShort} ${dayParts.dayMonthShort}, ${
          win.startFormatted
        } (${item.session.format}, ${formatSessionPrice(item.session.priceAud, sessCurrency)}) [${
          lang === 'zh' ? '票数' : 'Votes'
        }: ${item.entry.votes}]`;
      }),
    ];

    const ok = await copyTextSafely(lines.join('\n'));
    if (ok) {
      setCopiedFeedback(true);
      window.setTimeout(() => setCopiedFeedback(false), 2600);
    } else {
      setCopiedFeedback(false);
    }
  };

  const handleShareFolioLink = async () => {
    if (items.length === 0) return;
    const shareUrl = buildShareableFolioUrl(activeCity, folioShareItems, lang, false);
    const ok = await copyTextSafely(shareUrl);
    if (ok) {
      setCopiedLinkFeedback(true);
      window.setTimeout(() => setCopiedLinkFeedback(false), 2800);
    }
  };

  const handleCopyVoteReply = async () => {
    if (items.length === 0) return;
    const replyUrl = buildShareableFolioUrl(activeCity, folioShareItems, lang, true);
    const sorted = [...items].sort((a, b) => b.entry.votes - a.entry.votes);
    const lines = [
      lang === 'zh'
        ? '🗳️ 我的选片投票更新（点击打开我的票数顺序）：'
        : '🗳️ My Updated Screening Votes (open link to load):',
      replyUrl,
      '',
      ...sorted.map((item, idx) => {
        const cityMeta = CITIES[item.session.city];
        const dayParts = formatCalendarChipParts(item.session.dateIso, cityMeta.timeZone, lang);
        const win = formatSessionWindow(
          item.session.startMinutesFromMidnight,
          item.movie.runtimeMinutes
        );
        const title = getDisplayMovieTitle(item.movie, lang, item.session.city === 'shanghai');
        const cinemaName = getDisplayCinemaName(item.cinema, lang);
        return `${idx + 1}. [${item.entry.votes} ${lang === 'zh' ? '票' : 'votes'}] ${title} — ${cinemaName} (${dayParts.weekdayShort} ${dayParts.dayMonthShort}, ${win.startFormatted})`;
      }),
    ];
    const ok = await copyTextSafely(lines.join('\n'));
    if (ok) {
      setCopiedVoteReply(true);
      window.setTimeout(() => setCopiedVoteReply(false), 2800);
    }
  };

  const handleSaveShareCard = async () => {
    if (items.length === 0) return;
    const cityMeta = CITIES[activeCity];
    const ok = await exportShortlistCardPng({
      items: items.map((i) => ({
        movie: i.movie,
        cinema: i.cinema,
        session: i.session,
        votes: i.entry.votes,
      })),
      cityName: t.cityNames[activeCity] ?? cityMeta.name,
      timeZone: cityMeta.timeZone,
      currency: cityMeta.currency,
      lang,
      userOrigin,
    });
    if (ok) {
      setSavedCardPng(true);
      window.setTimeout(() => setSavedCardPng(false), 2800);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-sheet modal-sheet--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortlist-modal-title"
      >
        <div className="modal-sheet__header">
          <div>
            <span className="ticket-kicker">Decision Helper · Solo or Group Picker</span>
            <h2 id="shortlist-modal-title" className="shortlist-title">
              {t.shortlistTitle(items.length)}
            </h2>
          </div>

          <div className="shortlist-header-actions">
            {items.length > 0 && (
              <>
                <button
                  type="button"
                  id="share-folio-link-btn"
                  className="btn-primary btn-primary--sm"
                  onClick={handleShareFolioLink}
                >
                  {copiedLinkFeedback ? <Check size={14} /> : <Link2 size={14} />}
                  <span>
                    {copiedLinkFeedback ? t.folioLinkCopied : t.shareFolioLink}
                  </span>
                </button>
                <button
                  type="button"
                  id="copy-vote-reply-btn"
                  className="btn-secondary"
                  onClick={handleCopyVoteReply}
                  title="Encode your updated votes back into the ?folio= link to reply in chat"
                >
                  {copiedVoteReply ? <Check size={14} /> : <ThumbsUp size={14} />}
                  <span>{copiedVoteReply ? t.voteReplyCopied : t.copyVoteReply}</span>
                </button>
                <button
                  type="button"
                  id="export-share-card-btn"
                  className="btn-secondary"
                  onClick={handleSaveShareCard}
                  title="Render & download a 1080px Noir Comparison Card PNG for WeChat / Instagram / iMessage"
                >
                  {savedCardPng ? <Check size={14} /> : <ImageIcon size={14} />}
                  <span>{savedCardPng ? t.shareCardSaved : t.saveShareCard}</span>
                </button>
                <button
                  type="button"
                  id="copy-group-plan-btn"
                  className="btn-secondary"
                  onClick={handleCopyGroupPlan}
                >
                  {copiedFeedback ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedFeedback ? t.copiedTextLink : t.copyTextSummary}</span>
                </button>
                <button
                  type="button"
                  id="clear-shortlist-btn"
                  className="reset-btn"
                  onClick={onClearAll}
                >
                  <Trash2 size={14} />
                  <span>{t.clearAll}</span>
                </button>
              </>
            )}
            <button
              type="button"
              id="close-shortlist-modal-btn"
              className="icon-close-btn"
              onClick={onClose}
              aria-label="Close shortlist comparison"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <h3 className="empty-state__title">Your comparison shortlist is empty</h3>
            <p className="empty-state__body">
              Bookmark 2 or more session times across Melbourne or Sydney using the{' '}
              <strong>bookmark icon</strong> on any session pill to compare finish times, formats,
              suburbs, and ticket prices side-by-side.
            </p>
          </div>
        ) : (
          <div className="comparison-grid">
            {items.map(({ entry, session, movie, cinema }) => {
              const cityMeta = CITIES[session.city];
              const dateParts = formatCalendarChipParts(session.dateIso, cityMeta.timeZone, lang);
              const win = formatSessionWindow(
                session.startMinutesFromMidnight,
                movie.runtimeMinutes
              );
              const safeUrl = getSafeOutboundCinemaUrl(cinema.bookingDomainUrl);
              const calInput = {
                movieTitle: movie.title,
                director: movie.director,
                format: session.format,
                auditoriumName: session.auditoriumName,
                cinemaName: cinema.name,
                address: cinema.address,
                dateIso: session.dateIso,
                startMinutesFromMidnight: session.startMinutesFromMidnight,
                runtimeMinutes: movie.runtimeMinutes,
                timeZone: cityMeta.timeZone,
                bookingUrl: safeUrl,
              };
              const googleCalendarUrl = buildSafeGoogleCalendarUrl(calInput);
              const displayTitle = getDisplayMovieTitle(movie, lang, session.city === 'shanghai');
              const displayCinema = getDisplayCinemaName(cinema, lang);

              const dist = getCinemaDistanceInfo(cinema, userOrigin);

              const badges: string[] = [];
              if (items.length > 1 && session.priceAud === minPrice) {
                badges.push(t.bestValue);
              }
              if (
                items.length > 1 &&
                FORMAT_GRANDEUR_SCORE[session.format] === maxFormatRank &&
                maxFormatRank > 1
              ) {
                badges.push(t.signatureFormat);
              }
              if (items.length > 1 && movie.criticScorePercent === maxCritic) {
                badges.push(t.topCriticPick);
              }
              const isGroupLeader = items.length > 1 && maxVotes > 1 && entry.votes === maxVotes;

              return (
                <article
                  key={session.id}
                  className={`compare-card ${isGroupLeader ? 'compare-card--leader' : ''}`}
                >
                  <div className="compare-card__top">
                    <div className="compare-card__verdicts">
                      {isGroupLeader && (
                        <span className="verdict-pill verdict-pill--leader">
                          <Award size={12} /> {t.groupFavourite}
                        </span>
                      )}
                      {badges.map((b) => (
                        <span key={b} className="verdict-pill">
                          <Sparkles size={11} /> {b}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      id={`remove-shortlist-${session.id}`}
                      className="compare-card__remove"
                      onClick={() => onRemove(session.id)}
                      aria-label={`Remove ${displayTitle} at ${displayCinema}`}
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="compare-card__film">
                    <MoviePoster movie={movie} size="sm" />
                    <div>
                      <span className="compare-card__city-tag">
                        {t.cityNames[session.city] ?? cityMeta.name}
                      </span>
                      <h3 className="compare-card__movie-title">{displayTitle}</h3>
                      <div className="compare-card__ratings-wrap">
                        <RatingsPillBar
                          movie={movie}
                          compact
                          contextKey={`shortlist-${session.id}`}
                          onInspectRatings={onInspectRatings}
                        />
                        {movie.trailerYoutubeKey && (
                          <button
                            type="button"
                            id={`shortlist-trailer-${session.id}`}
                            className="trailer-pill-btn trailer-pill-btn--compact"
                            onClick={() => onWatchTrailer(movie)}
                            aria-label={`Watch official trailer for ${displayTitle}`}
                          >
                            <Play size={10} aria-hidden="true" fill="currentColor" />
                            <span>{t.trailer}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <dl className="compare-specs">
                    <div className="compare-specs__row">
                      <dt>Cinema &amp; Suburb</dt>
                      <dd>
                        <strong>{cinema.name}</strong>
                        <span>
                          {cinema.suburb} (
                          {cinema.city === activeCity
                            ? `${formatDistanceKm(dist.km)} ${dist.fullSuffix}`
                            : `${formatDistanceKm(cinema.distanceFromCbdKm)} from CBD`}
                          )
                        </span>
                        <a
                          href={buildSafeGoogleMapsUrl(cinema.name, cinema.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          id={`shortlist-maps-${session.id}`}
                          className="maps-inline-btn maps-inline-btn--spaced"
                        >
                          <Navigation size={11} aria-hidden="true" />
                          <span>Open in Google Maps</span>
                          <ExternalLink size={10} aria-hidden="true" />
                        </a>
                      </dd>
                    </div>

                    <div className="compare-specs__row">
                      <dt>Date &amp; Window</dt>
                      <dd className="compare-specs__mono">
                        <strong>
                          {dateParts.weekdayShort} {dateParts.dayMonthShort}
                        </strong>
                        <span>
                          {win.startFormatted} → {win.finishFormatted}
                        </span>
                        <div className="compare-calendar-actions">
                          <a
                            href={googleCalendarUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            id={`shortlist-gcal-${session.id}`}
                            className="maps-inline-btn maps-inline-btn--spaced"
                            aria-label={`Add ${displayTitle} at ${displayCinema} to Google Calendar`}
                          >
                            <CalendarPlus size={11} aria-hidden="true" />
                            <span>{t.googleCalendar}</span>
                            <ExternalLink size={10} aria-hidden="true" />
                          </a>
                          <button
                            type="button"
                            id={`shortlist-ics-${session.id}`}
                            className="maps-inline-btn maps-inline-btn--spaced ics-btn"
                            onClick={() => downloadIcsFile(calInput)}
                          >
                            <Download size={11} aria-hidden="true" />
                            <span>{t.appleIcs}</span>
                          </button>
                        </div>
                      </dd>
                    </div>

                    <div className="compare-specs__row">
                      <dt>Screen &amp; Experience</dt>
                      <dd>
                        <strong>{session.format}</strong>
                        <span>{session.auditoriumName}</span>
                      </dd>
                    </div>

                    <div className="compare-specs__row">
                      <dt>Getting There</dt>
                      <dd>
                        <span>{cinema.transitNote}</span>
                      </dd>
                    </div>

                    <div className="compare-specs__row">
                      <dt>
                        Guide Price <span className="guide-price-tag">Guide</span>
                      </dt>
                      <dd className="compare-specs__price">
                        <strong>
                          {formatSessionPrice(
                            session.priceAud,
                            session.currency ?? cityMeta.currency
                          )}
                        </strong>
                        {session.dealLabel && <span>{session.dealLabel}</span>}
                        {session.priceNote && (
                          <span className="compare-specs__price-note">{session.priceNote}</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="compare-card__actions">
                    <button
                      type="button"
                      id={`vote-shortlist-${session.id}`}
                      className="vote-btn"
                      onClick={() => onVote(session.id)}
                    >
                      <ThumbsUp size={14} aria-hidden="true" />
                      <span>{t.vote(entry.votes)}</span>
                    </button>

                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        id={`book-shortlist-${session.id}`}
                        className="btn-primary btn-primary--sm"
                      >
                        <span>{t.book}</span>
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
