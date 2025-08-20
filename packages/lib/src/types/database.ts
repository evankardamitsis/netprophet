export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          ntrp_rating: number;
          wins: number;
          losses: number;
          last5: string[];
          current_streak: number;
          streak_type: string;
          surface_preference: string;
          surface_win_rates: any;
          aggressiveness: number;
          stamina: number;
          consistency: number;
          age: number;
          hand: string;
          notes: string | null;
          last_match_date: string | null;
          fatigue_level: number | null;
          injury_status: string;
          seasonal_form: number | null;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          ntrp_rating: number;
          wins?: number;
          losses?: number;
          last5?: string[];
          current_streak?: number;
          streak_type: string;
          surface_preference: string;
          surface_win_rates?: any;
          aggressiveness?: number;
          stamina?: number;
          consistency?: number;
          age: number;
          hand: string;
          notes?: string | null;
          last_match_date?: string | null;
          fatigue_level?: number | null;
          injury_status?: string;
          seasonal_form?: number | null;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          ntrp_rating?: number;
          wins?: number;
          losses?: number;
          last5?: string[];
          current_streak?: number;
          streak_type?: string;
          surface_preference?: string;
          surface_win_rates?: any;
          aggressiveness?: number;
          stamina?: number;
          consistency?: number;
          age?: number;
          hand?: string;
          notes?: string | null;
          last_match_date?: string | null;
          fatigue_level?: number | null;
          injury_status?: string;
          seasonal_form?: number | null;
        };
      };
      tournaments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          start_date: string;
          end_date: string;
          status: string;
          surface: string;
          location: string | null;
          prize_pool: number | null;
          entry_fee: number;
          max_participants: number | null;
          current_participants: number;
          tournament_type: string;
          format: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          status?: string;
          surface: string;
          location?: string | null;
          prize_pool?: number | null;
          entry_fee?: number;
          max_participants?: number | null;
          current_participants?: number;
          tournament_type?: string;
          format?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          status?: string;
          surface?: string;
          location?: string | null;
          prize_pool?: number | null;
          entry_fee?: number;
          max_participants?: number | null;
          current_participants?: number;
          tournament_type?: string;
          format?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      tournament_categories: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          description: string | null;
          age_min: number | null;
          age_max: number | null;
          skill_level_min: string | null;
          skill_level_max: string | null;
          gender: string | null;
          max_participants: number | null;
          current_participants: number;
          entry_fee: number;
          prize_pool: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          description?: string | null;
          age_min?: number | null;
          age_max?: number | null;
          skill_level_min?: string | null;
          skill_level_max?: string | null;
          gender?: string | null;
          max_participants?: number | null;
          current_participants?: number;
          entry_fee?: number;
          prize_pool?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string;
          description?: string | null;
          age_min?: number | null;
          age_max?: number | null;
          skill_level_min?: string | null;
          skill_level_max?: string | null;
          gender?: string | null;
          max_participants?: number | null;
          current_participants?: number;
          entry_fee?: number;
          prize_pool?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tournament_participants: {
        Row: {
          id: string;
          tournament_id: string;
          category_id: string | null;
          player_id: string;
          registration_date: string;
          status: string;
          seed_position: number | null;
          final_position: number | null;
          points_earned: number;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          category_id?: string | null;
          player_id: string;
          registration_date?: string;
          status?: string;
          seed_position?: number | null;
          final_position?: number | null;
          points_earned?: number;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          category_id?: string | null;
          player_id?: string;
          registration_date?: string;
          status?: string;
          seed_position?: number | null;
          final_position?: number | null;
          points_earned?: number;
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
          format: string;
          tournament_id: string | null;
          category_id: string | null;
          round: string | null;
          court_number: number | null;
          status: string;
          start_time: string | null;
          lock_time: string | null;
          points_value: number;
          odds_a: number | null;
          odds_b: number | null;
          winner_id: string | null;
          match_duration: number | null;
          sets_a: number;
          sets_b: number;
          games_a: number;
          games_b: number;
          tiebreaks_a: number;
          tiebreaks_b: number;
          match_notes: string | null;
          web_synced: boolean;
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
          format?: string;
          tournament_id?: string | null;
          category_id?: string | null;
          round?: string | null;
          court_number?: number | null;
          status?: string;
          start_time?: string | null;
          lock_time?: string | null;
          points_value?: number;
          odds_a?: number | null;
          odds_b?: number | null;
          winner_id?: string | null;
          match_duration?: number | null;
          sets_a?: number;
          sets_b?: number;
          games_a?: number;
          games_b?: number;
          tiebreaks_a?: number;
          tiebreaks_b?: number;
          match_notes?: string | null;
          web_synced?: boolean;
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
          format?: string;
          tournament_id?: string | null;
          category_id?: string | null;
          round?: string | null;
          court_number?: number | null;
          status?: string;
          start_time?: string | null;
          lock_time?: string | null;
          points_value?: number;
          odds_a?: number | null;
          odds_b?: number | null;
          winner_id?: string | null;
          match_duration?: number | null;
          sets_a?: number;
          sets_b?: number;
          games_a?: number;
          games_b?: number;
          tiebreaks_a?: number;
          tiebreaks_b?: number;
          match_notes?: string | null;
          web_synced?: boolean;
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