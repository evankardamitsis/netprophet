export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      bets: {
        Row: {
          bet_amount: number;
          created_at: string;
          description: string | null;
          id: string;
          is_parlay: boolean | null;
          is_safe_bet: boolean | null;
          match_id: string;
          multiplier: number;
          outcome: string | null;
          parlay_base_odds: number | null;
          parlay_bonus_multiplier: number | null;
          parlay_final_odds: number | null;
          parlay_id: string | null;
          parlay_position: number | null;
          parlay_streak_booster: number | null;
          parlay_total_picks: number | null;
          potential_winnings: number;
          prediction: Json;
          resolved_at: string | null;
          safe_bet_cost: number | null;
          status: string;
          updated_at: string;
          user_id: string;
          winnings_paid: number | null;
        };
        Insert: {
          bet_amount: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_parlay?: boolean | null;
          is_safe_bet?: boolean | null;
          match_id: string;
          multiplier: number;
          outcome?: string | null;
          parlay_base_odds?: number | null;
          parlay_bonus_multiplier?: number | null;
          parlay_final_odds?: number | null;
          parlay_id?: string | null;
          parlay_position?: number | null;
          parlay_streak_booster?: number | null;
          parlay_total_picks?: number | null;
          potential_winnings: number;
          prediction: Json;
          resolved_at?: string | null;
          safe_bet_cost?: number | null;
          status?: string;
          updated_at?: string;
          user_id: string;
          winnings_paid?: number | null;
        };
        Update: {
          bet_amount?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_parlay?: boolean | null;
          is_safe_bet?: boolean | null;
          match_id?: string;
          multiplier?: number;
          outcome?: string | null;
          parlay_base_odds?: number | null;
          parlay_bonus_multiplier?: number | null;
          parlay_final_odds?: number | null;
          parlay_id?: string | null;
          parlay_position?: number | null;
          parlay_streak_booster?: number | null;
          parlay_total_picks?: number | null;
          potential_winnings?: number;
          prediction?: Json;
          resolved_at?: string | null;
          safe_bet_cost?: number | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          winnings_paid?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "bets_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_rewards: {
        Row: {
          claimed_date: string;
          created_at: string | null;
          id: string;
          reward_amount: number;
          streak_count: number;
          user_id: string;
        };
        Insert: {
          claimed_date: string;
          created_at?: string | null;
          id?: string;
          reward_amount: number;
          streak_count: number;
          user_id: string;
        };
        Update: {
          claimed_date?: string;
          created_at?: string | null;
          id?: string;
          reward_amount?: number;
          streak_count?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      match_results: {
        Row: {
          aces_leader_id: string | null;
          break_points_count: number | null;
          created_at: string | null;
          created_by: string | null;
          double_faults_count: number | null;
          id: string;
          match_id: string;
          match_result: string;
          set1_score: string | null;
          set1_tiebreak_score: string | null;
          set1_winner_id: string | null;
          set2_score: string | null;
          set2_tiebreak_score: string | null;
          set2_winner_id: string | null;
          set3_score: string | null;
          set3_tiebreak_score: string | null;
          set3_winner_id: string | null;
          set4_score: string | null;
          set4_tiebreak_score: string | null;
          set4_winner_id: string | null;
          set5_score: string | null;
          set5_tiebreak_score: string | null;
          set5_winner_id: string | null;
          super_tiebreak_score: string | null;
          super_tiebreak_winner_id: string | null;
          total_games: number | null;
          updated_at: string | null;
          winner_id: string;
        };
        Insert: {
          aces_leader_id?: string | null;
          break_points_count?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          double_faults_count?: number | null;
          id?: string;
          match_id: string;
          match_result: string;
          set1_score?: string | null;
          set1_tiebreak_score?: string | null;
          set1_winner_id?: string | null;
          set2_score?: string | null;
          set2_tiebreak_score?: string | null;
          set2_winner_id?: string | null;
          set3_score?: string | null;
          set3_tiebreak_score?: string | null;
          set3_winner_id?: string | null;
          set4_score?: string | null;
          set4_tiebreak_score?: string | null;
          set4_winner_id?: string | null;
          set5_score?: string | null;
          set5_tiebreak_score?: string | null;
          set5_winner_id?: string | null;
          super_tiebreak_score?: string | null;
          super_tiebreak_winner_id?: string | null;
          total_games?: number | null;
          updated_at?: string | null;
          winner_id: string;
        };
        Update: {
          aces_leader_id?: string | null;
          break_points_count?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          double_faults_count?: number | null;
          id?: string;
          match_id?: string;
          match_result?: string;
          set1_score?: string | null;
          set1_tiebreak_score?: string | null;
          set1_winner_id?: string | null;
          set2_score?: string | null;
          set2_tiebreak_score?: string | null;
          set2_winner_id?: string | null;
          set3_score?: string | null;
          set3_tiebreak_score?: string | null;
          set3_winner_id?: string | null;
          set4_score?: string | null;
          set4_tiebreak_score?: string | null;
          set4_winner_id?: string | null;
          set5_score?: string | null;
          set5_tiebreak_score?: string | null;
          set5_winner_id?: string | null;
          super_tiebreak_score?: string | null;
          super_tiebreak_winner_id?: string | null;
          total_games?: number | null;
          updated_at?: string | null;
          winner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_results_aces_leader_id_fkey";
            columns: ["aces_leader_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_set1_winner_id_fkey";
            columns: ["set1_winner_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_set2_winner_id_fkey";
            columns: ["set2_winner_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_set3_winner_id_fkey";
            columns: ["set3_winner_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_set4_winner_id_fkey";
            columns: ["set4_winner_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_set5_winner_id_fkey";
            columns: ["set5_winner_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_super_tiebreak_winner_id_fkey";
            columns: ["super_tiebreak_winner_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          category_id: string | null;
          created_at: string | null;
          format: string | null;
          id: string;
          lock_time: string | null;
          locked: boolean | null;
          odds_a: number | null;
          odds_b: number | null;
          player_a_id: string | null;
          player_b_id: string | null;
          points_value: number | null;
          processed: boolean | null;
          round:
            | "Round of 64"
            | "Round of 32"
            | "Round of 16"
            | "Quarterfinals"
            | "Semifinals"
            | "Finals"
            | null;
          start_time: string | null;
          status: string;
          tournament_id: string | null;
          updated_at: string | null;
          web_synced: boolean | null;
          winner_id: string | null;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string | null;
          format?: string | null;
          id?: string;
          lock_time?: string | null;
          locked?: boolean | null;
          odds_a?: number | null;
          odds_b?: number | null;
          player_a_id?: string | null;
          player_b_id?: string | null;
          points_value?: number | null;
          processed?: boolean | null;
          round?:
            | "Round of 64"
            | "Round of 32"
            | "Round of 16"
            | "Quarterfinals"
            | "Semifinals"
            | "Finals"
            | null;
          start_time?: string | null;
          status?: string;
          tournament_id?: string | null;
          updated_at?: string | null;
          web_synced?: boolean | null;
          winner_id?: string | null;
        };
        Update: {
          category_id?: string | null;
          created_at?: string | null;
          format?: string | null;
          id?: string;
          lock_time?: string | null;
          locked?: boolean | null;
          odds_a?: number | null;
          odds_b?: number | null;
          player_a_id?: string | null;
          player_b_id?: string | null;
          points_value?: number | null;
          processed?: boolean | null;
          round?:
            | "Round of 64"
            | "Round of 32"
            | "Round of 16"
            | "Quarterfinals"
            | "Semifinals"
            | "Finals"
            | null;
          start_time?: string | null;
          status?: string;
          tournament_id?: string | null;
          updated_at?: string | null;
          web_synced?: boolean | null;
          winner_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "tournament_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_player_a_id_fkey";
            columns: ["player_a_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_player_b_id_fkey";
            columns: ["player_b_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          data: Json | null;
          id: string;
          message: string;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          data?: Json | null;
          id?: string;
          message: string;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          data?: Json | null;
          id?: string;
          message?: string;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          age: number;
          aggressiveness: number;
          consistency: number;
          current_streak: number;
          fatigue_level: number | null;
          first_name: string;
          hand: string;
          id: string;
          injury_status: string;
          last_match_date: string | null;
          last_name: string;
          last5: string[];
          losses: number;
          notes: string | null;
          ntrp_rating: number;
          seasonal_form: number | null;
          stamina: number;
          streak_type: string;
          surface_preference: string;
          surface_win_rates: Json;
          wins: number;
        };
        Insert: {
          age: number;
          aggressiveness?: number;
          consistency?: number;
          current_streak?: number;
          fatigue_level?: number | null;
          first_name: string;
          hand: string;
          id?: string;
          injury_status?: string;
          last_match_date?: string | null;
          last_name: string;
          last5?: string[];
          losses?: number;
          notes?: string | null;
          ntrp_rating: number;
          seasonal_form?: number | null;
          stamina?: number;
          streak_type: string;
          surface_preference: string;
          surface_win_rates?: Json;
          wins?: number;
        };
        Update: {
          age?: number;
          aggressiveness?: number;
          consistency?: number;
          current_streak?: number;
          fatigue_level?: number | null;
          first_name?: string;
          hand?: string;
          id?: string;
          injury_status?: string;
          last_match_date?: string | null;
          last_name?: string;
          last5?: string[];
          losses?: number;
          notes?: string | null;
          ntrp_rating?: number;
          seasonal_form?: number | null;
          stamina?: number;
          streak_type?: string;
          surface_preference?: string;
          surface_win_rates?: Json;
          wins?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          accuracy_percentage: number | null;
          avatar_url: string | null;
          balance: number | null;
          best_winning_streak: number | null;
          created_at: string | null;
          current_winning_streak: number | null;
          daily_login_streak: number | null;
          email: string;
          has_received_welcome_bonus: boolean | null;
          id: string;
          is_admin: boolean | null;
          language_preference: string | null;
          last_leaderboard_update: string | null;
          leaderboard_points: number | null;
          leaderboard_prizes_earned: number | null;
          lost_bets: number | null;
          referral_bonus_earned: number | null;
          safe_bet_tokens: number | null;
          total_bets: number | null;
          total_correct_picks: number | null;
          total_losses: number | null;
          total_picks: number | null;
          total_winnings: number | null;
          updated_at: string | null;
          username: string | null;
          won_bets: number | null;
        };
        Insert: {
          accuracy_percentage?: number | null;
          avatar_url?: string | null;
          balance?: number | null;
          best_winning_streak?: number | null;
          created_at?: string | null;
          current_winning_streak?: number | null;
          daily_login_streak?: number | null;
          email: string;
          has_received_welcome_bonus?: boolean | null;
          id: string;
          is_admin?: boolean | null;
          language_preference?: string | null;
          last_leaderboard_update?: string | null;
          leaderboard_points?: number | null;
          leaderboard_prizes_earned?: number | null;
          lost_bets?: number | null;
          referral_bonus_earned?: number | null;
          safe_bet_tokens?: number | null;
          total_bets?: number | null;
          total_correct_picks?: number | null;
          total_losses?: number | null;
          total_picks?: number | null;
          total_winnings?: number | null;
          updated_at?: string | null;
          username?: string | null;
          won_bets?: number | null;
        };
        Update: {
          accuracy_percentage?: number | null;
          avatar_url?: string | null;
          balance?: number | null;
          best_winning_streak?: number | null;
          created_at?: string | null;
          current_winning_streak?: number | null;
          daily_login_streak?: number | null;
          email?: string;
          has_received_welcome_bonus?: boolean | null;
          id?: string;
          is_admin?: boolean | null;
          language_preference?: string | null;
          last_leaderboard_update?: string | null;
          leaderboard_points?: number | null;
          leaderboard_prizes_earned?: number | null;
          lost_bets?: number | null;
          referral_bonus_earned?: number | null;
          safe_bet_tokens?: number | null;
          total_bets?: number | null;
          total_correct_picks?: number | null;
          total_losses?: number | null;
          total_picks?: number | null;
          total_winnings?: number | null;
          updated_at?: string | null;
          username?: string | null;
          won_bets?: number | null;
        };
        Relationships: [];
      };
      tournament_categories: {
        Row: {
          age_max: number | null;
          age_min: number | null;
          created_at: string | null;
          current_participants: number | null;
          description: string | null;
          entry_fee: number | null;
          gender: string | null;
          id: string;
          max_participants: number | null;
          name: string;
          prize_pool: number | null;
          skill_level_max: string | null;
          skill_level_min: string | null;
          tournament_id: string;
          updated_at: string | null;
        };
        Insert: {
          age_max?: number | null;
          age_min?: number | null;
          created_at?: string | null;
          current_participants?: number | null;
          description?: string | null;
          entry_fee?: number | null;
          gender?: string | null;
          id?: string;
          max_participants?: number | null;
          name: string;
          prize_pool?: number | null;
          skill_level_max?: string | null;
          skill_level_min?: string | null;
          tournament_id: string;
          updated_at?: string | null;
        };
        Update: {
          age_max?: number | null;
          age_min?: number | null;
          created_at?: string | null;
          current_participants?: number | null;
          description?: string | null;
          entry_fee?: number | null;
          gender?: string | null;
          id?: string;
          max_participants?: number | null;
          name?: string;
          prize_pool?: number | null;
          skill_level_max?: string | null;
          skill_level_min?: string | null;
          tournament_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tournament_categories_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      tournament_participants: {
        Row: {
          category_id: string | null;
          final_position: number | null;
          id: string;
          player_id: string;
          points_earned: number | null;
          registration_date: string | null;
          seed_position: number | null;
          status: string;
          tournament_id: string;
        };
        Insert: {
          category_id?: string | null;
          final_position?: number | null;
          id?: string;
          player_id: string;
          points_earned?: number | null;
          registration_date?: string | null;
          seed_position?: number | null;
          status?: string;
          tournament_id: string;
        };
        Update: {
          category_id?: string | null;
          final_position?: number | null;
          id?: string;
          player_id?: string;
          points_earned?: number | null;
          registration_date?: string | null;
          seed_position?: number | null;
          status?: string;
          tournament_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tournament_participants_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "tournament_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_participants_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      tournaments: {
        Row: {
          created_at: string | null;
          current_participants: number | null;
          description: string | null;
          end_date: string;
          entry_fee: number | null;
          format: string;
          id: string;
          location: string | null;
          matches_type: string;
          max_participants: number | null;
          name: string;
          prize_pool: number | null;
          start_date: string;
          status: string;
          surface: string;
          tournament_type: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          current_participants?: number | null;
          description?: string | null;
          end_date: string;
          entry_fee?: number | null;
          format?: string;
          id?: string;
          location?: string | null;
          matches_type?: string;
          max_participants?: number | null;
          name: string;
          prize_pool?: number | null;
          start_date: string;
          status?: string;
          surface: string;
          tournament_type?: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          current_participants?: number | null;
          description?: string | null;
          end_date?: string;
          entry_fee?: number | null;
          format?: string;
          id?: string;
          location?: string | null;
          matches_type?: string;
          max_participants?: number | null;
          name?: string;
          prize_pool?: number | null;
          start_date?: string;
          status?: string;
          surface?: string;
          tournament_type?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          created_at: string | null;
          description: string | null;
          id: string;
          type: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          type: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      head_to_head: {
        Row: {
          id: string;
          player_a_id: string;
          player_b_id: string;
          player_a_wins: number;
          player_b_wins: number;
          total_matches: number;
          last_match_date: string | null;
          last_match_result: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_a_id: string;
          player_b_id: string;
          player_a_wins?: number;
          player_b_wins?: number;
          total_matches?: number;
          last_match_date?: string | null;
          last_match_result?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_a_id?: string;
          player_b_id?: string;
          player_a_wins?: number;
          player_b_wins?: number;
          total_matches?: number;
          last_match_date?: string | null;
          last_match_result?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "head_to_head_player_a_id_fkey";
            columns: ["player_a_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "head_to_head_player_b_id_fkey";
            columns: ["player_b_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      bet_stats: {
        Row: {
          active_bets: number | null;
          lost_bets: number | null;
          total_bet_amount: number | null;
          total_bets: number | null;
          total_losses: number | null;
          total_winnings: number | null;
          user_id: string | null;
          win_rate: number | null;
          won_bets: number | null;
        };
        Relationships: [];
      };
      parlay_stats: {
        Row: {
          active_parlays: number | null;
          avg_parlay_picks: number | null;
          lost_parlays: number | null;
          max_parlay_picks: number | null;
          parlay_win_rate: number | null;
          total_parlay_losses: number | null;
          total_parlay_winnings: number | null;
          total_parlays: number | null;
          user_id: string | null;
          won_parlays: number | null;
        };
        Relationships: [];
      };
      safe_bet_token_stats: {
        Row: {
          safe_bet_tokens: number | null;
          token_status: string | null;
          user_id: string | null;
        };
        Insert: {
          safe_bet_tokens?: number | null;
          token_status?: never;
          user_id?: string | null;
        };
        Update: {
          safe_bet_tokens?: number | null;
          token_status?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      award_safe_bet_tokens: {
        Args: { tokens_to_award: number; user_uuid: string };
        Returns: number;
      };
      calculate_parlay_outcome: {
        Args: { parlay_uuid: string };
        Returns: string;
      };
      can_claim_daily_reward: {
        Args: { user_uuid: string };
        Returns: {
          can_claim: boolean;
          current_streak: number;
          next_reward_amount: number;
        }[];
      };
      check_admin_status: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      check_set_score_prediction: {
        Args: { match_result: Record<string, unknown>; prediction: Json };
        Returns: boolean;
      };
      check_set_winner_prediction: {
        Args: { match_result: Record<string, unknown>; prediction: Json };
        Returns: boolean;
      };
      check_super_tiebreak_prediction: {
        Args: { match_result: Record<string, unknown>; prediction: Json };
        Returns: boolean;
      };
      check_tiebreak_prediction: {
        Args: { match_result: Record<string, unknown>; prediction: Json };
        Returns: boolean;
      };
      claim_daily_reward: {
        Args: { user_uuid: string };
        Returns: {
          message: string;
          new_streak: number;
          reward_amount: number;
          success: boolean;
        }[];
      };
      consume_safe_bet_tokens: {
        Args: { tokens_to_consume: number; user_uuid: string };
        Returns: boolean;
      };
      create_bet_notification: {
        Args:
          | {
              bet_id: string;
              bet_status: string;
              user_language?: string;
              user_uuid: string;
              winnings_amount?: number;
            }
          | {
              bet_id: string;
              bet_status: string;
              user_uuid: string;
              winnings_amount?: number;
            };
        Returns: undefined;
      };
      determine_bet_outcome: {
        Args: { match_result: Record<string, unknown>; prediction: Json };
        Returns: string;
      };
      get_weekly_leaderboard_stats: {
        Args: { week_start_date?: string };
        Returns: {
          accuracy_percentage: number;
          avatar_url: string;
          best_winning_streak: number;
          current_winning_streak: number;
          leaderboard_points: number;
          total_correct_picks: number;
          total_picks: number;
          user_id: string;
          username: string;
        }[];
      };
      is_admin_user: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_current_user_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      process_match_automation: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      resolve_bets_for_match: {
        Args: { match_id_param: string };
        Returns: undefined;
      };
      set_first_admin: {
        Args: { admin_email: string };
        Returns: undefined;
      };
      update_user_leaderboard_stats: {
        Args: { user_id_param: string };
        Returns: undefined;
      };
      get_head_to_head_record: {
        Args: { p_player_1_id: string; p_player_2_id: string };
        Returns: {
          player_a_id: string;
          player_b_id: string;
          player_a_wins: number;
          player_b_wins: number;
          total_matches: number;
          last_match_date: string | null;
          last_match_result: string | null;
        }[];
      };
      update_head_to_head_record: {
        Args: {
          p_player_a_id: string;
          p_player_b_id: string;
          p_winner_id: string;
          p_match_date: string;
        };
        Returns: undefined;
      };
      reverse_head_to_head_record: {
        Args: {
          p_player_a_id: string;
          p_player_b_id: string;
          p_previous_winner_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
