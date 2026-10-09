import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@netprophet/db';
import { AuthFailure, EMAIL_RE, authErrorKind } from './authErrors';
import { supabase } from './supabase';

export { AuthFailure, EMAIL_RE, type AuthErrorKind } from './authErrors';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  /** false until the stored session has been read */
  ready: boolean;
  session: Session | null;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function fail(err: { status?: number; code?: string; message: string }): never {
  throw new AuthFailure(authErrorKind(err), err.message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
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
      async signOut() {
        await supabase?.auth.signOut();
      },
    }),
    [ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
