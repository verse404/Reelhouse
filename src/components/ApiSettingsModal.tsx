import { useEffect, useState } from 'react';
import { Check, ExternalLink, KeyRound, RefreshCw, ShieldCheck, X } from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncedSuccessfully: () => Promise<void>;
}

interface BffStatusResponse {
  ok: boolean;
  csrfToken: string;
  configuredApis: {
    tmdb: boolean;
    omdb: boolean;
    mdblist?: boolean;
    serpapi: boolean;
  };
  maskedKeys: {
    tmdb: string | null;
    omdb: string | null;
    mdblist?: string | null;
    serpapi: string | null;
  };
}

export function ApiSettingsModal({
  isOpen,
  onClose,
  onSyncedSuccessfully,
}: ApiSettingsModalProps) {
  const [csrfToken, setCsrfToken] = useState('');
  const [maskedKeys, setMaskedKeys] = useState<{
    tmdb: string | null;
    omdb: string | null;
    mdblist?: string | null;
    serpapi: string | null;
  }>({ tmdb: null, omdb: null, mdblist: null, serpapi: null });

  const [tmdbInput, setTmdbInput] = useState('');
  const [omdbInput, setOmdbInput] = useState('');
  const [mdblistInput, setMdblistInput] = useState('');
  const [serpInput, setSerpInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleClose = () => {
    setFeedback(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/status', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data: BffStatusResponse) => {
        if (data.ok) {
          setCsrfToken(data.csrfToken);
          setMaskedKeys(data.maskedKeys);
        }
      })
      .catch(() => {
        setFeedback({
          kind: 'error',
          text: 'Could not reach local BFF server.',
        });
      });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFeedback(null);
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveAndSync = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/configure-keys', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          tmdbApiKey: tmdbInput,
          omdbApiKey: omdbInput,
          mdblistApiKey: mdblistInput,
          serpapiApiKey: serpInput,
        }),
      });
      const result = (await res.json()) as {
        ok?: boolean;
        mode?: string;
        movieCount?: number;
        comingSoonCount?: number;
        sessionCount?: number;
        error?: string;
      };

      if (!res.ok || !result.ok) {
        setFeedback({
          kind: 'error',
          text: result.error || 'Key verification or upstream sync failed.',
        });
        setIsSaving(false);
        return;
      }

      setTmdbInput('');
      setOmdbInput('');
      setMdblistInput('');
      setSerpInput('');

      // Refresh status masks & hydrate live app data
      const statusRes = await fetch('/api/status', { credentials: 'same-origin' });
      const statusData = (await statusRes.json()) as BffStatusResponse;
      if (statusData.ok) {
        setMaskedKeys(statusData.maskedKeys);
      }

      await onSyncedSuccessfully();

      if (result.mode === 'live') {
        setFeedback({
          kind: 'success',
          text: `Live sync complete — loaded ${result.movieCount ?? 0} In-Cinemas films, ${
            result.comingSoonCount ?? 0
          } Coming-Soon premieres${
            (result.sessionCount ?? 0) > 0
              ? `, and ${result.sessionCount} live Melbourne/Sydney showtimes!`
              : '!'
          }`,
        });
      } else {
        setFeedback({
          kind: 'error',
          text: 'Please enter at least a valid TMDB API Key to activate Live Mode.',
        });
      }
    } catch {
      setFeedback({
        kind: 'error',
        text: 'Network error communicating with local BFF server.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop modal-backdrop--top"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="modal-sheet modal-sheet--ticket"
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-settings-modal-title"
      >
        <div className="modal-sheet__header">
          <div>
            <span className="ticket-kicker">
              <KeyRound size={13} aria-hidden="true" />
              Server-Side BFF Configuration
            </span>
            <h2 id="api-settings-modal-title" className="shortlist-title">
              Connect Free Live Cinema APIs
            </h2>
          </div>

          <button
            type="button"
            id="close-api-settings-btn"
            className="icon-close-btn"
            onClick={handleClose}
            aria-label="Close API configuration"
          >
            <X size={18} />
          </button>
        </div>

        <p className="api-modal-intro">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>
            Keys entered below are stored strictly on your private server (
            <code>.env</code>, <code>chmod 600</code>) and are never exposed in
            browser bundles. Leave a box blank to keep an already saved key.
          </span>
        </p>

        <div className="api-fields-stack">
          {/* 1. TMDB */}
          <div className="api-field-group">
            <div className="api-field-group__head">
              <label htmlFor="input-tmdb-key" className="api-field-group__label">
                1. TMDB API Key <span>(Required — AU Movies, Posters &amp; Coming Soon)</span>
              </label>
              <a
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                id="get-tmdb-key-link"
                className="venue-link"
              >
                <span>Get Free Key</span>
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </div>
            <input
              id="input-tmdb-key"
              type="password"
              autoComplete="off"
              value={tmdbInput}
              onChange={(e) => setTmdbInput(e.target.value)}
              placeholder={
                maskedKeys.tmdb
                  ? `Saved (${maskedKeys.tmdb}) — paste new key to replace`
                  : 'Paste 32-character TMDB API Key…'
              }
              className="api-secret-input"
            />
          </div>

          {/* 2. OMDb */}
          <div className="api-field-group">
            <div className="api-field-group__head">
              <label htmlFor="input-omdb-key" className="api-field-group__label">
                2. OMDb API Key <span>(Free 1,000/day — Supplemental Classic Film Ratings)</span>
              </label>
              <a
                href="https://www.omdbapi.com/apikey.aspx"
                target="_blank"
                rel="noopener noreferrer"
                id="get-omdb-key-link"
                className="venue-link"
              >
                <span>Get Free Key</span>
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </div>
            <input
              id="input-omdb-key"
              type="password"
              autoComplete="off"
              value={omdbInput}
              onChange={(e) => setOmdbInput(e.target.value)}
              placeholder={
                maskedKeys.omdb
                  ? `Saved (${maskedKeys.omdb}) — paste new key to replace`
                  : 'Paste 8-character OMDb API Key…'
              }
              className="api-secret-input"
            />
          </div>

          {/* 3. MDBList (Rotten Tomatoes) */}
          <div className="api-field-group">
            <div className="api-field-group__head">
              <label htmlFor="input-mdblist-key" className="api-field-group__label">
                3. MDBList API Key <span>(Free 1,000/day — True Rotten Tomatoes &amp; Audience %)</span>
              </label>
              <a
                href="https://mdblist.com/preferences/"
                target="_blank"
                rel="noopener noreferrer"
                id="get-mdblist-key-link"
                className="venue-link"
              >
                <span>Get Free Key</span>
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </div>
            <input
              id="input-mdblist-key"
              type="password"
              autoComplete="off"
              value={mdblistInput}
              onChange={(e) => setMdblistInput(e.target.value)}
              placeholder={
                maskedKeys.mdblist
                  ? `Saved (${maskedKeys.mdblist}) — paste new key to replace`
                  : 'Paste free MDBList API Key for verified Rotten Tomatoes scores…'
              }
              className="api-secret-input"
            />
          </div>

          {/* 4. SerpApi */}
          <div className="api-field-group">
            <div className="api-field-group__head">
              <label htmlFor="input-serp-key" className="api-field-group__label">
                4. SerpApi Key <span>(Free 250/mo — Live Melbourne &amp; Sydney Showtimes)</span>
              </label>
              <a
                href="https://serpapi.com/manage-api-key"
                target="_blank"
                rel="noopener noreferrer"
                id="get-serp-key-link"
                className="venue-link"
              >
                <span>Get Free Key</span>
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </div>
            <input
              id="input-serp-key"
              type="password"
              autoComplete="off"
              value={serpInput}
              onChange={(e) => setSerpInput(e.target.value)}
              placeholder={
                maskedKeys.serpapi
                  ? `Saved (${maskedKeys.serpapi}) — paste new key to replace`
                  : 'Paste SerpApi private key (optional if starting with TMDB/OMDb)…'
              }
              className="api-secret-input"
            />
          </div>
        </div>

        {feedback && (
          <div
            className={`api-feedback-banner ${
              feedback.kind === 'success'
                ? 'api-feedback-banner--success'
                : 'api-feedback-banner--error'
            }`}
            role="status"
          >
            {feedback.kind === 'success' && <Check size={15} aria-hidden="true" />}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="modal-sheet__footer">
          <button
            type="button"
            id="cancel-api-modal-btn"
            className="btn-secondary"
            onClick={handleClose}
          >
            Close
          </button>

          <button
            type="button"
            id="save-and-sync-api-btn"
            className="btn-primary"
            disabled={isSaving}
            onClick={handleSaveAndSync}
          >
            <RefreshCw size={14} className={isSaving ? 'spin-icon' : ''} aria-hidden="true" />
            <span>{isSaving ? 'Syncing Live AU Data…' : 'Save Keys & Sync Live Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
