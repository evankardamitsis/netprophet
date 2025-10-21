export interface PlayerMatch {
  id: string;
  first_name: string;
  last_name: string;
  is_hidden: boolean;
  is_active: boolean;
  claimed_by_user_id: string | null;
  is_demo_player: boolean;
  match_score?: number;
}
