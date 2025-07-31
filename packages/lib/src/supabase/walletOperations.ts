import { supabase } from './client';

export interface WalletOperationResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class WalletOperationsService {
  /**
   * Place a bet
   */
  static async placeBet(amount: number, matchId: string, description: string): Promise<WalletOperationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-operations?action=place_bet`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, matchId, description }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as { error: string };
      throw new Error(error.error || 'Failed to place bet');
    }

    return await response.json() as WalletOperationResult;
  }

  /**
   * Claim welcome bonus
   */
  static async claimWelcomeBonus(): Promise<WalletOperationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-operations?action=claim_welcome_bonus`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Welcome bonus response status:', response.status);
    console.log('Welcome bonus response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      try {
        const errorText = await response.text();
        console.error('Welcome bonus error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Failed to claim welcome bonus' };
        }
        throw new Error(errorData.error || 'Failed to claim welcome bonus');
      } catch (parseError) {
        console.error('Welcome bonus parse error:', parseError);
        throw new Error('Failed to claim welcome bonus');
      }
    }

    try {
      const responseText = await response.text();
      console.log('Welcome bonus response text:', responseText);
      
      if (!responseText) {
        console.error('Empty response from welcome bonus function');
        throw new Error('Empty response from server');
      }
      
      const result = JSON.parse(responseText) as WalletOperationResult;
      console.log('Welcome bonus parsed result:', result);
      return result;
    } catch (parseError) {
      console.error('Failed to parse welcome bonus response:', parseError);
      throw new Error('Invalid response from server');
    }
  }

  /**
   * Add referral bonus
   */
  static async addReferralBonus(amount: number): Promise<WalletOperationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-operations?action=add_referral_bonus`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as { error: string };
      throw new Error(error.error || 'Failed to add referral bonus');
    }

    return await response.json() as WalletOperationResult;
  }

  /**
   * Add leaderboard prize
   */
  static async addLeaderboardPrize(amount: number): Promise<WalletOperationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-operations?action=add_leaderboard_prize`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as { error: string };
      throw new Error(error.error || 'Failed to add leaderboard prize');
    }

    return await response.json() as WalletOperationResult;
  }

  /**
   * Purchase item
   */
  static async purchaseItem(cost: number, itemName: string): Promise<WalletOperationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-operations?action=purchase_item`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cost, itemName }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as { error: string };
      throw new Error(error.error || 'Failed to purchase item');
    }

    return await response.json() as WalletOperationResult;
  }

  /**
   * Enter tournament
   */
  static async enterTournament(cost: number, tournamentName: string): Promise<WalletOperationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-operations?action=enter_tournament`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cost, tournamentName }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as { error: string };
      throw new Error(error.error || 'Failed to enter tournament');
    }

    return await response.json() as WalletOperationResult;
  }

  /**
   * Unlock insight
   */
  static async unlockInsight(cost: number, insightName: string): Promise<WalletOperationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-operations?action=unlock_insight`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cost, insightName }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as { error: string };
      throw new Error(error.error || 'Failed to unlock insight');
    }

    return await response.json() as WalletOperationResult;
  }

  /**
   * Record win
   */
  static async recordWin(stake: number, odds: number, description: string): Promise<WalletOperationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-operations?action=record_win`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stake, odds, description }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as { error: string };
      throw new Error(error.error || 'Failed to record win');
    }

    return await response.json() as WalletOperationResult;
  }

  /**
   * Record loss
   */
  static async recordLoss(stake: number, description: string): Promise<WalletOperationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-operations?action=record_loss`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stake, description }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as { error: string };
      throw new Error(error.error || 'Failed to record loss');
    }

    return await response.json() as WalletOperationResult;
  }
} 