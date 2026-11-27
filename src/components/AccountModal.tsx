import { useEffect, useState, type FormEvent } from 'react';
import {
  Bookmark,
  Check,
  Cloud,
  CloudOff,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import type { AppLanguage, CityId } from '../types/cinema';
import { getUiText } from '../utils/i18n';
import {
  mapAuthErrorMessage,
  resendVerificationEmail,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  validateEmailSyntax,
  validatePasswordStrength,
  type ReelhouseAuthUser,
} from '../services/firebaseAuth';

export type CloudSyncState = 'idle' | 'syncing' | 'synced' | 'error';

interface AccountModalProps {
  isOpen: boolean;
  lang: AppLanguage;
  authConfigured: boolean;
  user: ReelhouseAuthUser | null;
  cloudSyncState: CloudSyncState;
  favoriteCinemasCount: number;
  favoritesOnlyDefault: boolean;
  defaultCity: CityId;
  locationLabel: string;
  watchlistCount: number;
  shortlistCount: number;
  onClose: () => void;
  onToggleFavoritesOnlyDefault: () => void;
  onManualSyncNow: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

type AuthTab = 'signin' | 'signup' | 'reset';

export function AccountModal({
  isOpen,
  lang,
  authConfigured,
  user,
  cloudSyncState,
  favoriteCinemasCount,
  favoritesOnlyDefault,
  defaultCity,
  locationLabel,
  watchlistCount,
  shortlistCount,
  onClose,
  onToggleFavoritesOnlyDefault,
  onManualSyncNow,
  onSignOut,
}: AccountModalProps) {
  const [tab, setTab] = useState<AuthTab>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    null
  );

  const isZh = lang === 'zh';
  const t = getUiText(lang);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetFormState = (nextTab: AuthTab) => {
    setTab(nextTab);
    setFeedback(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleClose = () => {
    setFeedback(null);
    setPassword('');
    setConfirmPassword('');
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setIsBusy(true);
    setFeedback(null);
    try {
      await signInWithGoogle();
      setFeedback({
        kind: 'success',
        text: isZh
          ? '已通过 Google 登录，正在同步你的个人偏好…'
          : 'Signed in with Google. Syncing your saved preferences…',
      });
    } catch (err) {
      setFeedback({ kind: 'error', text: mapAuthErrorMessage(err, lang) });
    } finally {
      setIsBusy(false);
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!validateEmailSyntax(email)) {
      setFeedback({
        kind: 'error',
        text: isZh ? '请输入有效的电子邮箱地址。' : 'Please enter a valid email address.',
      });
      return;
    }

    if (tab === 'reset') {
      setIsBusy(true);
      try {
        await sendPasswordReset(email);
        setFeedback({
          kind: 'success',
          text: isZh
            ? '如果该邮箱已注册，我们已向其发送密码重置链接（请检查收件箱及垃圾邮件）。'
            : 'If an account exists for that email, a password reset link has been sent.',
        });
      } catch (err) {
        setFeedback({ kind: 'error', text: mapAuthErrorMessage(err, lang) });
      } finally {
        setIsBusy(false);
      }
      return;
    }

    if (tab === 'signup') {
      const pwErr = validatePasswordStrength(password, lang);
      if (pwErr) {
        setFeedback({ kind: 'error', text: pwErr });
        return;
      }
      if (password !== confirmPassword) {
        setFeedback({
          kind: 'error',
          text: isZh ? '两次输入的密码不一致。' : 'Passwords do not match.',
        });
        return;
      }
      setIsBusy(true);
      try {
        await signUpWithEmail(email, password, displayName);
        setPassword('');
        setConfirmPassword('');
        setFeedback({
          kind: 'success',
          text: isZh
            ? '注册成功！我们已发送验证邮件，你的收藏与筛选偏好正在自动云端同步。'
            : 'Account created! A verification email is on its way and your preferences are now syncing.',
        });
      } catch (err) {
        setFeedback({ kind: 'error', text: mapAuthErrorMessage(err, lang) });
      } finally {
        setIsBusy(false);
      }
      return;
    }

    // Sign in
    if (!password) {
      setFeedback({
        kind: 'error',
        text: isZh ? '请输入密码。' : 'Please enter your password.',
      });
      return;
    }
    setIsBusy(true);
    try {
      await signInWithEmail(email, password);
      setPassword('');
      setFeedback({
        kind: 'success',
        text: isZh
          ? '登录成功，已恢复你的云端偏好设置。'
          : 'Welcome back — your cloud preferences have been restored.',
      });
    } catch (err) {
      setFeedback({ kind: 'error', text: mapAuthErrorMessage(err, lang) });
    } finally {
      setIsBusy(false);
    }
  };

  const handleResendVerification = async () => {
    setIsBusy(true);
    setFeedback(null);
    try {
      await resendVerificationEmail();
      setFeedback({
        kind: 'success',
        text: isZh
          ? '验证邮件已重新发送，请查收邮箱。'
          : 'Verification email resent. Please check your inbox.',
      });
    } catch (err) {
      setFeedback({ kind: 'error', text: mapAuthErrorMessage(err, lang) });
    } finally {
      setIsBusy(false);
    }
  };

  const handleManualSync = async () => {
    setIsBusy(true);
    setFeedback(null);
    try {
      await onManualSyncNow();
      setFeedback({
        kind: 'success',
        text: isZh ? '所有偏好已同步至云端。' : 'All preferences synced to the cloud.',
      });
    } catch {
      setFeedback({
        kind: 'error',
        text: isZh
          ? '同步失败，请稍后重试。'
          : 'Could not sync right now. Please try again in a moment.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOutClick = async () => {
    setIsBusy(true);
    try {
      await onSignOut();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      className="modal-backdrop modal-backdrop--top"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal-sheet modal-sheet--account">
        <div className="modal-sheet__header">
          <div>
            <span className="ticket-kicker">
              <UserCheck size={12} aria-hidden="true" />
              <span>
                {user
                  ? isZh
                    ? '会员档案 · 云端同步'
                    : 'MEMBER PROFILE · CLOUD SYNC'
                  : isZh
                    ? '会员通行证 · 跨设备同步'
                    : 'SALON MEMBERSHIP · CROSS-DEVICE SYNC'}
              </span>
            </span>
            <h2 id="account-modal-title" className="account-modal__title">
              {user
                ? user.displayName
                : tab === 'signup'
                  ? isZh
                    ? '创建 Reelhouse 账号'
                    : 'Create Your Reelhouse Account'
                  : tab === 'reset'
                    ? isZh
                      ? '重置账号密码'
                      : 'Reset Your Password'
                    : isZh
                      ? '登录 Reelhouse'
                      : 'Sign In to Reelhouse'}
            </h2>
          </div>

          <button
            type="button"
            id="close-account-modal-btn"
            className="icon-close-btn"
            onClick={handleClose}
            aria-label={isZh ? '关闭账号弹窗' : 'Close account modal'}
          >
            <X size={16} />
          </button>
        </div>

        {!authConfigured ? (
          <div className="account-feedback account-feedback--error">
            <CloudOff size={15} aria-hidden="true" />
            <span>
              {isZh
                ? '此部署环境尚未配置 Firebase 环境变量，暂不可使用云端账号同步。'
                : 'Firebase environment variables are not configured on this deployment yet.'}
            </span>
          </div>
        ) : user ? (
          <div className="account-profile">
            <div className="account-profile__identity">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="account-profile__avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="account-profile__avatar account-profile__avatar--initials">
                  {(user.displayName[0] || 'M').toUpperCase()}
                </div>
              )}

              <div className="account-profile__meta">
                <div className="account-profile__name-row">
                  <strong>{user.displayName}</strong>
                  <span
                    className={`account-sync-pill account-sync-pill--${cloudSyncState}`}
                    aria-live="polite"
                  >
                    {cloudSyncState === 'syncing' ? (
                      <>
                        <Loader2 size={11} className="spin-icon" aria-hidden="true" />
                        <span>{isZh ? '同步中…' : 'Syncing…'}</span>
                      </>
                    ) : cloudSyncState === 'error' ? (
                      <>
                        <CloudOff size={11} aria-hidden="true" />
                        <span>{isZh ? '本地已存' : 'Local Only'}</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={11} aria-hidden="true" />
                        <span>{isZh ? '已云端同步 ✓' : 'Cloud Synced ✓'}</span>
                      </>
                    )}
                  </span>
                </div>
                {user.maskedEmail && (
                  <p className="account-profile__email">
                    <Mail size={12} aria-hidden="true" />
                    <span>{user.maskedEmail}</span>
                    <span className="account-profile__provider">
                      · {user.providerId === 'google.com' ? 'Google' : isZh ? '邮箱密码' : 'Email'}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {user.providerId === 'password' && !user.emailVerified && (
              <div className="account-verify-banner">
                <span>
                  {isZh
                    ? '你的邮箱尚未完成验证，验证后可确保密码找回正常可用。'
                    : 'Your email is not verified yet. Verify it to keep account recovery active.'}
                </span>
                <button
                  type="button"
                  className="btn-secondary account-verify-banner__btn"
                  disabled={isBusy}
                  onClick={handleResendVerification}
                >
                  {isZh ? '重发验证邮件' : 'Resend Link'}
                </button>
              </div>
            )}

            <div className="account-saved-grid">
              <div className="account-saved-card">
                <Heart size={13} aria-hidden="true" />
                <div>
                  <span className="account-saved-card__label">
                    {isZh ? '收藏影院' : 'Favorite Cinemas'}
                  </span>
                  <strong>
                    {favoriteCinemasCount}{' '}
                    {isZh ? '家' : favoriteCinemasCount === 1 ? 'cinema' : 'cinemas'}
                  </strong>
                </div>
              </div>

              <div className="account-saved-card">
                <MapPin size={13} aria-hidden="true" />
                <div>
                  <span className="account-saved-card__label">
                    {isZh ? '默认城市与位置' : 'Default City & Area'}
                  </span>
                  <strong>
                    {t.cityNames[defaultCity]} · {locationLabel}
                  </strong>
                </div>
              </div>

              <div className="account-saved-card">
                <Bookmark size={13} aria-hidden="true" />
                <div>
                  <span className="account-saved-card__label">
                    {isZh ? '想看片单 & 对比夹' : 'Watchlist & Folio'}
                  </span>
                  <strong>
                    {watchlistCount} {isZh ? '部想看' : 'watchlist'} · {shortlistCount}{' '}
                    {isZh ? '场对比' : 'folio'}
                  </strong>
                </div>
              </div>
            </div>

            <label className="account-pref-toggle" htmlFor="account-fav-only-default-toggle">
              <div>
                <strong>
                  {isZh
                    ? '新标签页默认只看「我收藏的影院」'
                    : 'Always start new tabs with "Favorites Only"'}
                </strong>
                <span>
                  {isZh
                    ? '开启后，每次打开 Reelhouse 会自动按你收藏的影院筛选场次。'
                    : 'Automatically pre-filter showtimes to your favorite cinemas whenever you open Reelhouse.'}
                </span>
              </div>
              <input
                id="account-fav-only-default-toggle"
                type="checkbox"
                checked={favoritesOnlyDefault}
                onChange={onToggleFavoritesOnlyDefault}
              />
            </label>

            {feedback && (
              <div className={`account-feedback account-feedback--${feedback.kind}`}>
                {feedback.kind === 'success' ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <CloudOff size={14} aria-hidden="true" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="account-profile__actions">
              <button
                type="button"
                id="account-sync-now-btn"
                className="btn-secondary"
                disabled={isBusy}
                onClick={handleManualSync}
              >
                <RefreshCw size={13} className={isBusy ? 'spin-icon' : ''} aria-hidden="true" />
                <span>{isZh ? '立即同步' : 'Sync Now'}</span>
              </button>

              <button
                type="button"
                id="account-sign-out-btn"
                className="btn-secondary account-signout-btn"
                disabled={isBusy}
                onClick={handleSignOutClick}
              >
                <LogOut size={13} aria-hidden="true" />
                <span>{isZh ? '退出登录' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="account-auth">
            <p className="account-auth__subtitle">
              {isZh
                ? '登录后自动跨设备同步你收藏的影院、默认城市、所在区域、想看片单、对比夹与界面主题 — 当前浏览中已收藏的影院会自动合并保存。'
                : 'Save your favorite cinemas, "Favorites Only" default, city, home suburb, watchlist, Folio, and theme across every tab and device. Anything you already hearted will merge automatically.'}
            </p>

            {/* 1-Click Google Sign-In */}
            <button
              type="button"
              id="account-google-signin-btn"
              className="account-google-btn"
              disabled={isBusy}
              onClick={handleGoogleSignIn}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span>
                {isBusy
                  ? isZh
                    ? '连接 Google 中…'
                    : 'Connecting to Google…'
                  : isZh
                    ? '使用 Google 一键登录'
                    : 'Continue with Google'}
              </span>
            </button>

            <div className="account-divider" role="separator">
              <span>{isZh ? '或使用电子邮箱' : 'or continue with email'}</span>
            </div>

            {tab !== 'reset' && (
              <div className="account-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  id="account-tab-signin"
                  aria-selected={tab === 'signin'}
                  className={`account-tab ${tab === 'signin' ? 'account-tab--active' : ''}`}
                  onClick={() => resetFormState('signin')}
                >
                  {isZh ? '邮箱登录' : 'Sign In'}
                </button>
                <button
                  type="button"
                  role="tab"
                  id="account-tab-signup"
                  aria-selected={tab === 'signup'}
                  className={`account-tab ${tab === 'signup' ? 'account-tab--active' : ''}`}
                  onClick={() => resetFormState('signup')}
                >
                  {isZh ? '注册新账号' : 'Create Account'}
                </button>
              </div>
            )}

            <form className="account-form" onSubmit={handleEmailSubmit} noValidate>
              {tab === 'signup' && (
                <label className="account-field">
                  <span>{isZh ? '昵称（选填）' : 'Display Name (optional)'}</span>
                  <input
                    id="account-name-input"
                    type="text"
                    maxLength={48}
                    autoComplete="name"
                    placeholder={isZh ? '例如：SQ' : 'e.g. Alex'}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </label>
              )}

              <label className="account-field">
                <span>{isZh ? '电子邮箱' : 'Email Address'}</span>
                <input
                  id="account-email-input"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              {tab !== 'reset' && (
                <label className="account-field">
                  <span>
                    {isZh ? '密码' : 'Password'}
                    {tab === 'signup' && (
                      <small className="account-field__hint">
                        {isZh ? '至少 8 位（建议 12 位以上）' : 'Min 8 chars (12+ recommended)'}
                      </small>
                    )}
                  </span>
                  <div className="account-password-wrap">
                    <input
                      id="account-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="account-password-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword
                          ? isZh
                            ? '隐藏密码'
                            : 'Hide password'
                          : isZh
                            ? '显示密码'
                            : 'Show password'
                      }
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </label>
              )}

              {tab === 'signup' && (
                <label className="account-field">
                  <span>{isZh ? '确认密码' : 'Confirm Password'}</span>
                  <input
                    id="account-confirm-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </label>
              )}

              {feedback && (
                <div className={`account-feedback account-feedback--${feedback.kind}`}>
                  {feedback.kind === 'success' ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <CloudOff size={14} aria-hidden="true" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                id="account-submit-btn"
                className="btn-primary account-submit-btn"
                disabled={isBusy}
              >
                {isBusy && <Loader2 size={14} className="spin-icon" aria-hidden="true" />}
                <span>
                  {tab === 'signup'
                    ? isZh
                      ? '创建账号并开启云同步'
                      : 'Create Account & Sync'
                    : tab === 'reset'
                      ? isZh
                        ? '发送密码重置邮件'
                        : 'Send Password Reset Email'
                      : isZh
                        ? '登录并同步偏好'
                        : 'Sign In & Restore Preferences'}
                </span>
              </button>
            </form>

            <div className="account-footer-links">
              {tab === 'signin' && (
                <button
                  type="button"
                  className="account-text-link"
                  onClick={() => resetFormState('reset')}
                >
                  {isZh ? '忘记密码？' : 'Forgot password?'}
                </button>
              )}
              {tab === 'reset' && (
                <button
                  type="button"
                  className="account-text-link"
                  onClick={() => resetFormState('signin')}
                >
                  {isZh ? '返回邮箱登录' : '← Back to Sign In'}
                </button>
              )}
              <span className="account-security-note">
                <ShieldCheck size={12} aria-hidden="true" />
                <span>
                  {isZh
                    ? '由 Firebase 安全托管 · 仅本人可读个人数据'
                    : 'Secured by Firebase Auth · Private per-user rules'}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
