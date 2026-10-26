import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { resetAnalytics } from './analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@netprophet/db';
import { AuthFailure, EMAIL_RE, appleName, authErrorKind, passwordErrorKind } from './authErrors';
import { isReviewEmail } from './reviewAccount';
import { markMeStale } from './meStore';
import { api, supabase } from './supabase';

export { AuthFailure, EMAIL_RE, type AuthErrorKind } from './authErrors';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  /** false until the stored session has been read */
  ready: boolean;
  session: Session | null;
  /**
   * Development builds only: «Άλλη φορά» enters without an account and the app runs on the sample
   * data in src/mock. Removed before launch, with the button.
   */
  guest: boolean;
  enterAsGuest(): void;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  /** the store reviewers' account only (REVIEW_EMAIL); everyone else signs in with a one-time code */
  signInWithPassword(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  /** iOS only (App Store guideline 4.8): the native Sign in with Apple sheet, then Supabase with its identity token */
  signInWithApple(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const GUEST_KEY = 'np.devGuest';
/**
 * Dev builds only, and only when asked for (EXPO_PUBLIC_DEV_GUEST=1): the founder wants real data everywhere (14 Oct),
 * so «Άλλη φορά» and its sample data are off unless a developer turns them on. See AuthState.guest.
 */
export const guestAllowed = __DEV__ && process.env.EXPO_PUBLIC_DEV_GUEST === '1';

/** the name Sign in with Apple gave on the first sign-in, until onboarding has used it */
const APPLE_NAME_KEY = 'np.appleName';

/** The name Apple handed over (first sign-in only), for the first onboarding step. Null when there is none. */
export async function readAppleName(): Promise<{ first: string; surname: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(APPLE_NAME_KEY);
    return raw ? appleName(JSON.parse(raw) as { givenName?: string; familyName?: string }) : null;
  } catch {
    return null;
  }
}

export function clearAppleName(): void {
  AsyncStorage.removeItem(APPLE_NAME_KEY).catch(() => undefined);
}

/** Sign in with Apple shows only on iOS, where the system supports it (never Android or web). */
export function useAppleAvailable(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    let live = true;
    AppleAuthentication.isAvailableAsync()
      .then((v) => live && setOn(v))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return on;
}

function fail(err: { status?: number; code?: string; message: string }): never {
  throw new AuthFailure(authErrorKind(err), err.message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuest] = useState(false);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return undefined;
    const stored = guestAllowed ? AsyncStorage.getItem(GUEST_KEY).catch(() => null) : Promise.resolve(null);
    Promise.all([supabase.auth.getSession(), stored]).then(([{ data }, g]) => {
      setSession(data.session);
      setGuest(g === '1');
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      guest,
      enterAsGuest() {
        if (!guestAllowed) return;
        AsyncStorage.setItem(GUEST_KEY, '1').catch(() => undefined);
        setGuest(true);
      },
      async sendCode(email) {
        if (!supabase) return;
        if (!EMAIL_RE.test(email)) throw new AuthFailure('invalidEmail', 'invalid email');
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
        if (error) fail(error);
      },
      async verifyCode(email, code) {
        if (!supabase) return;
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
        if (error) fail(error);
      },
      async signInWithPassword(email, password) {
        if (!supabase) return;
        // never a password request for any other address: the screen does not offer it, and this does not send it
        if (!isReviewEmail(email)) throw new AuthFailure('generic', 'password sign-in is for the review account only');
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw new AuthFailure(passwordErrorKind(error), error.message);
      },
      async signInWithGoogle() {
        if (!supabase) return;
        if (Platform.OS === 'web') {
          // full-page redirect; detectSessionInUrl finishes the PKCE exchange on return
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
          });
          if (error) fail(error);
          return;
        }
        // native: open the consent page in an auth session, then exchange the returned code
        const redirectTo = Linking.createURL('auth/callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error || !data.url) fail(error ?? { message: 'no oauth url' });
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success') return;
        const authCode = new URL(result.url).searchParams.get('code');
        if (!authCode) fail({ message: 'no code in redirect' });
        const exchanged = await supabase.auth.exchangeCodeForSession(authCode);
        if (exchanged.error) fail(exchanged.error);
      },
      async signInWithApple() {
        if (!supabase || Platform.OS !== 'ios') return;
        // Apple gets the SHA-256 of the nonce, Supabase the nonce itself, and checks one against the other
        const raw = Crypto.randomUUID();
        const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
        let credential: AppleAuthentication.AppleAuthenticationCredential;
        try {
          credential = await AppleAuthentication.signInAsync({
            requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
            nonce: hashed,
          });
        } catch (err) {
          // closed the sheet: nothing to say, as with Google
          if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
          fail({ message: (err as Error).message ?? 'apple sign-in failed' });
        }
        if (!credential.identityToken) fail({ message: 'no identity token from apple' });
        // the name comes only now, on the first sign-in, and never in the token: keep it before the session lands
        const name = appleName(credential.fullName);
        if (name) await AsyncStorage.setItem(APPLE_NAME_KEY, JSON.stringify({ givenName: name.first, familyName: name.surname })).catch(() => undefined);
        const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: raw });
        if (error) fail(error);
        if (!name || !api) return;
        // best effort: a profile with no name of its own takes Apple's (onboarding also reads the kept one)
        try {
          const me = await api.getMe();
          const p = me?.profile;
          if (p && !p.first_name && !p.surname) {
            await api.updateProfile({ first_name: name.first, surname: name.surname, display_name: `${name.first} ${name.surname}`.trim() });
            markMeStale();
          }
        } catch {
          // the onboarding prefill still has the kept name
        }
      },
      async signOut() {
        resetAnalytics();
        clearAppleName();
        AsyncStorage.removeItem(GUEST_KEY).catch(() => undefined);
        setGuest(false);
        await supabase?.auth.signOut();
      },
    }),
    [ready, session, guest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
