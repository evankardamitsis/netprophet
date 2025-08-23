import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '../store/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Utility function to get current user ID without making API calls
export const getCurrentUserId = (): string | null => {
  try {
    const { user } = useAuthStore.getState();
    return user?.id || null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

// Utility function to get current session without making API calls
export const getCurrentSession = (): any => {
  try {
    const { session } = useAuthStore.getState();
    return session;
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
}; 