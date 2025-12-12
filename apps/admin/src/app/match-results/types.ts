export interface Match {
  id: string;
  match_type?: "singles" | "doubles";
  player_a: {
    id: string;
    first_name: string;
    last_name: string;
  };
  player_b: {
    id: string;
    first_name: string;
    last_name: string;
  };
  player_a1?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  player_a2?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  player_b1?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  player_b2?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  tournaments: {
    name: string;
    matches_type: string;
  } | null;
  status: string;
  start_time: string | null;
  web_synced: boolean | null;
}

export type FilterStatus = "all" | "finished" | "live" | "upcoming";

export interface FormData {
  winner_id: string;
  match_winner_team?: string; // For doubles: 'team_a' or 'team_b'
  match_result: string;
  set1_score: string;
  set2_score: string;
  set3_score: string;
  set4_score: string;
  set5_score: string;
  set1_winner_id: string;
  set2_winner_id: string;
  set3_winner_id: string;
  set4_winner_id: string;
  set5_winner_id: string;
  set1_winner_team?: string; // For doubles: 'team_a' or 'team_b'
  set2_winner_team?: string;
  set3_winner_team?: string;
  set4_winner_team?: string;
  set5_winner_team?: string;
  set1_tiebreak_score: string;
  set2_tiebreak_score: string;
  set3_tiebreak_score: string;
  set4_tiebreak_score: string;
  set5_tiebreak_score: string;
  super_tiebreak_score: string;
  super_tiebreak_winner_id: string;
  super_tiebreak_winner_team?: string; // For doubles: 'team_a' or 'team_b'
  [key: string]: string | undefined; // Allow dynamic property access
}
