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
    };
  };
} 