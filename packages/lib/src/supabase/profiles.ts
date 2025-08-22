import { supabase } from './client';

export interface Profile {
  id: string;
  email: string;
  username?: string | null;
  avatar_url?: string | null;
  is_admin: boolean | null;
  suspended?: boolean;
  created_at: string | null;
  language_preference?: string | null;
}

export class ProfilesService {
  /**
   * Update user's language preference
   */
  static async updateLanguagePreference(language: 'en' | 'el'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to update language preference');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ language_preference: language })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating language preference:', error);
      throw new Error(`Failed to update language preference: ${error.message}`);
    }
  }

  /**
   * Get user's language preference
   */
  static async getLanguagePreference(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to get language preference');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('language_preference')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error getting language preference:', error);
      throw new Error(`Failed to get language preference: ${error.message}`);
    }

    return data?.language_preference || 'en';
  }

  /**
   * Get user profile
   */
  static async getProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error getting profile:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }

    return data;
  }
}
