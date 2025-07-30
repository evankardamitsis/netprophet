export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          name: string;
          club_id: string | null;
          elo: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          club_id?: string | null;
          elo?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          club_id?: string | null;
          elo?: number;
          created_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          player_a: string;
          player_b: string;
          a_score: number | null;
          b_score: number | null;
          played_at: string;
          prob_a: number | null;
          prob_b: number | null;
          points_fav: number | null;
          points_dog: number | null;
          processed: boolean;
        };
        Insert: {
          id?: string;
          player_a: string;
          player_b: string;
          a_score?: number | null;
          b_score?: number | null;
          played_at: string;
          prob_a?: number | null;
          prob_b?: number | null;
          points_fav?: number | null;
          points_dog?: number | null;
          processed?: boolean;
        };
        Update: {
          id?: string;
          player_a?: string;
          player_b?: string;
          a_score?: number | null;
          b_score?: number | null;
          played_at?: string;
          prob_a?: number | null;
          prob_b?: number | null;
          points_fav?: number | null;
          points_dog?: number | null;
          processed?: boolean;
        };
      };
      clubs: {
        Row: {
          id: string;
          name: string;
          city: string;
        };
        Insert: {
          id?: string;
          name: string;
          city: string;
        };
        Update: {
          id?: string;
          name?: string;
          city?: string;
        };
      };
      predictions: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          pick: string;
          stake_points: number;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          pick: string;
          stake_points?: number;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string;
          pick?: string;
          stake_points?: number;
          submitted_at?: string;
        };
      };
      bets: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          bet_amount: number;
          multiplier: number;
          potential_winnings: number;
          prediction: any; // JSONB
          status: 'active' | 'won' | 'lost' | 'cancelled';
          outcome: string | null;
          winnings_paid: number;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
          description: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          bet_amount: number;
          multiplier: number;
          potential_winnings: number;
          prediction: any; // JSONB
          status?: 'active' | 'won' | 'lost' | 'cancelled';
          outcome?: string | null;
          winnings_paid?: number;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          description?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string;
          bet_amount?: number;
          multiplier?: number;
          potential_winnings?: number;
          prediction?: any; // JSONB
          status?: 'active' | 'won' | 'lost' | 'cancelled';
          outcome?: string | null;
          winnings_paid?: number;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          description?: string | null;
        };
      };
    };
    Views: {
      app_users: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      bet_stats: {
        Row: {
          user_id: string;
          total_bets: number;
          won_bets: number;
          lost_bets: number;
          active_bets: number;
          total_bet_amount: number;
          total_winnings: number;
          total_losses: number;
          win_rate: number;
        };
        Insert: {
          user_id?: string;
          total_bets?: number;
          won_bets?: number;
          lost_bets?: number;
          active_bets?: number;
          total_bet_amount?: number;
          total_winnings?: number;
          total_losses?: number;
          win_rate?: number;
        };
        Update: {
          user_id?: string;
          total_bets?: number;
          won_bets?: number;
          lost_bets?: number;
          active_bets?: number;
          total_bet_amount?: number;
          total_winnings?: number;
          total_losses?: number;
          win_rate?: number;
        };
      };
    };
  };
} 