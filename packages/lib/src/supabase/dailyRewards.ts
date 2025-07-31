import { supabase } from './client';

export interface DailyRewardStatus {
  can_claim: boolean;
  current_streak: number;
  next_reward_amount: number;
}

export interface DailyRewardClaim {
  success: boolean;
  reward_amount: number;
  new_streak: number;
  message: string;
}

export class DailyRewardsService {
  /**
   * Check if user can claim daily reward
   */
  static async checkDailyReward(): Promise<DailyRewardStatus> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/daily-rewards?action=check`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check daily reward status');
    }

    const result = await response.json() as { data: DailyRewardStatus };
    return result.data;
  }

  /**
   * Claim daily reward
   */
  static async claimDailyReward(): Promise<DailyRewardClaim> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/daily-rewards?action=claim`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to claim daily reward');
    }

    const result = await response.json() as { data: DailyRewardClaim };
    return result.data;
  }

  /**
   * Get user's daily reward history
   */
  static async getDailyRewardHistory(): Promise<any[]> {
    const { data, error } = await supabase
      .from('daily_rewards')
      .select('*')
      .order('claimed_date', { ascending: false })
      .limit(30); // Last 30 days

    if (error) {
      throw error;
    }

    return data || [];
  }
} 