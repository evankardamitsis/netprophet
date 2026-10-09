import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNetprophetClient, rpc, type NetprophetClient } from '@netprophet/db';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * The app talks to Supabase only when both public env values are set. Without them it runs on the
 * mock data in src/mock, so `expo export` and CI work with no backend.
 */
export const supabase: NetprophetClient | null =
  url && publishableKey
    ? createNetprophetClient(url, publishableKey, {
        auth: {
          // web keeps the session in localStorage (supabase-js default); native in AsyncStorage
          storage: Platform.OS === 'web' ? undefined : AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: Platform.OS === 'web',
          flowType: 'pkce',
        },
      })
    : null;

export const isLive = supabase !== null;

export const api = supabase ? rpc(supabase) : null;
