import { supabase } from './client';
import type { Database } from '../types/database';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

export interface TransactionWithDetails extends Transaction {
  // Add any additional fields if needed
}

export class TransactionsService {
  /**
   * Get recent transactions for the current user
   */
  static async getRecentTransactions(limit: number = 10): Promise<TransactionWithDetails[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view transactions');
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return (data || []) as TransactionWithDetails[];
  }

  /**
   * Get transaction statistics for the current user
   */
  static async getTransactionStats(): Promise<{
    totalTransactions: number;
    totalWinnings: number;
    totalLosses: number;
    totalBets: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        totalTransactions: 0,
        totalWinnings: 0,
        totalLosses: 0,
        totalBets: 0,
      };
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching transaction stats:', error);
      return {
        totalTransactions: 0,
        totalWinnings: 0,
        totalLosses: 0,
        totalBets: 0,
      };
    }

    const transactions = data || [];
    const totalTransactions = transactions.length;
    const totalWinnings = transactions
      .filter(t => t.type === 'win')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalLosses = transactions
      .filter(t => t.type === 'loss')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalBets = transactions
      .filter(t => t.type === 'bet')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      totalTransactions,
      totalWinnings,
      totalLosses,
      totalBets,
    };
  }

  /**
   * Create a new transaction
   */
  static async createTransaction(transactionData: Omit<TransactionInsert, 'user_id'>): Promise<Transaction> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create transactions');
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transactionData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error.message}`);
    }

    return data;
  }
}
