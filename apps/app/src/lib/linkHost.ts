import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Where the opponent link lives. The page is in this app for now (netprophet-app on the web); at cutover it
 * moves to the site. EXPO_PUBLIC_LINK_BASE points links at another host.
 */
const FALLBACK_BASE = 'https://netprophet-app.vercel.app';

export function linkBase(): string {
  const env = process.env.EXPO_PUBLIC_LINK_BASE;
  if (env) return env.replace(/\/+$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return FALLBACK_BASE;
}

/* «Κράτα το ματς στο προφίλ σου»: the token waits through sign-in, then onboarding claims with it */
const PENDING_KEY = 'np.link.pending';

export const savePendingLink = (token: string) => AsyncStorage.setItem(PENDING_KEY, token).catch(() => undefined);
export const readPendingLink = () => AsyncStorage.getItem(PENDING_KEY).catch(() => null);
export const clearPendingLink = () => AsyncStorage.removeItem(PENDING_KEY).catch(() => undefined);
