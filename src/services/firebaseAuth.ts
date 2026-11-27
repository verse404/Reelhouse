import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { AppLanguage } from '../types/cinema';
import {
  maskEmailForDisplay,
  validateCloudUserPreferences,
  type CloudUserPreferences,
} from '../utils/security';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export interface ReelhouseAuthUser {
  uid: string;
  displayName: string;
  maskedEmail: string;
  emailVerified: boolean;
  providerId: 'google.com' | 'password';
  photoURL: string | null;
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let initPromise: Promise<boolean> | null = null;

function isValidFirebaseConfig(raw: unknown): raw is FirebaseClientConfig {
  if (!raw || typeof raw !== 'object') return false;
  const c = raw as Record<string, unknown>;
  const safeStr = (v: unknown, max = 200) =>
    typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
  return (
    safeStr(c.apiKey, 120) &&
    safeStr(c.authDomain, 200) &&
    safeStr(c.projectId, 120) &&
    safeStr(c.appId, 200)
  );
}

function readBuildTimeFirebaseConfig(): FirebaseClientConfig | null {
  const env = import.meta.env;
  const candidate = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  return isValidFirebaseConfig(candidate) ? candidate : null;
}

async function fetchRuntimeFirebaseConfig(): Promise<FirebaseClientConfig | null> {
  try {
    const res = await fetch('/api/client-config', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    const ctype = res.headers.get('content-type') || '';
    if (!res.ok || !ctype.includes('application/json')) return null;
    const payload = (await res.json()) as { ok?: boolean; firebase?: unknown };
    if (payload?.ok && isValidFirebaseConfig(payload.firebase)) {
      return payload.firebase;
    }
    return null;
  } catch {
    return null;
  }
}

function sanitizeSafePhotoUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return null;
    if (u.hostname !== 'lh3.googleusercontent.com') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function toSafeAuthUser(user: User): ReelhouseAuthUser {
  const isGoogle = user.providerData.some((p) => p?.providerId === 'google.com');
  const rawName = (user.displayName || '').trim();
  const masked = maskEmailForDisplay(user.email || '');
  return {
    uid: user.uid,
    displayName: rawName.slice(0, 48) || masked || 'Member',
    maskedEmail: masked,
    emailVerified: Boolean(user.emailVerified),
    providerId: isGoogle ? 'google.com' : 'password',
    photoURL: sanitizeSafePhotoUrl(user.photoURL),
  };
}

/**
 * Initializes the Firebase Auth & Firestore client once using either build-time
 * `VITE_FIREBASE_*` variables or runtime `/api/client-config` from the BFF.
 * Never hardcodes credentials in committed source code.
 *
 * TODO(security): Firebase Web SDK stores short-lived ID tokens & refresh tokens
 * in browser IndexedDB (`browserLocalPersistence`) rather than backend HttpOnly
 * session cookies so login works identically on Render and static x20web with zero
 * BFF session state; Firestore Security Rules strictly enforce `request.auth.uid == userId`.
 * TODO(security): Consider enabling Firebase Identity Platform MFA and leaked-password
 * protection in the Firebase Console if upgrading beyond the Spark Free Plan.
 */
export async function initFirebaseClient(): Promise<boolean> {
  if (firebaseAuth && firebaseDb) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const cfg = readBuildTimeFirebaseConfig() ?? (await fetchRuntimeFirebaseConfig());
    if (!cfg) return false;

    const existing = getApps();
    firebaseApp = existing.length > 0 ? existing[0] : initializeApp(cfg);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);

    try {
      await setPersistence(firebaseAuth, browserLocalPersistence);
    } catch {
      // Fall back to default SDK persistence if browser storage is restricted
    }
    return true;
  })().catch(() => {
    initPromise = null;
    return false;
  });

  return initPromise;
}

export function isFirebaseReady(): boolean {
  return Boolean(firebaseAuth && firebaseDb);
}

export function subscribeAuthState(
  onUserChange: (user: ReelhouseAuthUser | null) => void
): () => void {
  if (!firebaseAuth) return () => {};
  return onAuthStateChanged(firebaseAuth, (user) => {
    onUserChange(user ? toSafeAuthUser(user) : null);
  });
}

export function validatePasswordStrength(
  password: string,
  lang: AppLanguage
): string | null {
  if (password.length < 8) {
    return lang === 'zh'
      ? '密码至少需要 8 位字符（建议 12 位以上）。'
      : 'Password must be at least 8 characters (12+ recommended).';
  }
  if (password.length > 128) {
    return lang === 'zh'
      ? '密码长度不能超过 128 位字符。'
      : 'Password cannot exceed 128 characters.';
  }
  return null;
}

export function validateEmailSyntax(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<ReelhouseAuthUser> {
  if (!firebaseAuth) throw new Error('auth/not-configured');
  const trimmedEmail = email.trim();
  const cred = await createUserWithEmailAndPassword(firebaseAuth, trimmedEmail, password);
  const cleanName = String(displayName || '').trim().slice(0, 48);
  if (cleanName) {
    await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
  }
  // Automatically send email verification link on registration
  await sendEmailVerification(cred.user).catch(() => {});
  return toSafeAuthUser(cred.user);
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<ReelhouseAuthUser> {
  if (!firebaseAuth) throw new Error('auth/not-configured');
  const cred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
  return toSafeAuthUser(cred.user);
}

export async function signInWithGoogle(): Promise<ReelhouseAuthUser> {
  if (!firebaseAuth) throw new Error('auth/not-configured');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(firebaseAuth, provider);
  return toSafeAuthUser(cred.user);
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!firebaseAuth) throw new Error('auth/not-configured');
  await sendPasswordResetEmail(firebaseAuth, email.trim());
}

export async function resendVerificationEmail(): Promise<void> {
  if (!firebaseAuth?.currentUser) throw new Error('auth/no-user');
  await sendEmailVerification(firebaseAuth.currentUser);
}

export async function signOutUser(): Promise<void> {
  if (!firebaseAuth) return;
  await signOut(firebaseAuth);
}

/**
 * Loads the signed-in user's saved preferences document from Cloud Firestore
 * (`/users/{uid}`) and validates every field through a strict allow-list.
 */
export async function loadCloudUserPreferences(
  uid: string
): Promise<Partial<CloudUserPreferences> | null> {
  if (!firebaseDb || !uid) return null;
  const ref = doc(firebaseDb, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return validateCloudUserPreferences(snap.data());
}

/**
 * Saves validated user preferences to Cloud Firestore (`/users/{uid}`) with merge semantics.
 * Firestore Security Rules restrict writes strictly to `request.auth.uid == userId`.
 */
export async function saveCloudUserPreferences(
  uid: string,
  prefs: CloudUserPreferences
): Promise<void> {
  if (!firebaseDb || !uid) return;
  const validated = validateCloudUserPreferences(prefs);
  const ref = doc(firebaseDb, 'users', uid);
  await setDoc(
    ref,
    {
      ...validated,
      schemaVersion: 1,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Maps Firebase Auth error codes to safe, generic bilingual messages.
 * Intentionally avoids enumerating whether an email exists on sign-in failures.
 */
export function mapAuthErrorMessage(err: unknown, lang: AppLanguage): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : err instanceof Error
        ? err.message
        : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return lang === 'zh'
        ? '邮箱或密码不正确，请检查后重试。'
        : 'Invalid email or password. Please check and try again.';
    case 'auth/email-already-in-use':
      return lang === 'zh'
        ? '该邮箱已注册，请直接登录或点击“忘记密码”。'
        : 'An account with this email already exists. Try signing in or resetting your password.';
    case 'auth/weak-password':
      return lang === 'zh'
        ? '密码强度不足，请使用至少 8 位字符的强密码。'
        : 'Password is too weak. Please choose at least 8 characters.';
    case 'auth/too-many-requests':
      return lang === 'zh'
        ? '尝试次数过多，请稍后再试。'
        : 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return lang === 'zh'
        ? '已取消 Google 登录窗口。'
        : 'Google sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return lang === 'zh'
        ? '浏览器拦截了登录弹窗，请允许此站点弹窗或使用邮箱登录。'
        : 'Your browser blocked the sign-in popup. Allow popups for this site or sign in with email.';
    case 'auth/unauthorized-domain':
      return lang === 'zh'
        ? '当前域名尚未加入 Firebase 授权域名列表。'
        : 'This domain is not authorized in Firebase Console yet.';
    case 'auth/network-request-failed':
      return lang === 'zh'
        ? '网络连接失败，请检查网络后重试。'
        : 'Network error. Please check your connection and try again.';
    case 'auth/not-configured':
      return lang === 'zh'
        ? '账号云同步服务尚未配置环境变量。'
        : 'Account sync is not configured for this deployment yet.';
    default:
      return lang === 'zh'
        ? '登录请求未能完成，请稍后重试。'
        : 'Unable to complete sign-in right now. Please try again.';
  }
}
