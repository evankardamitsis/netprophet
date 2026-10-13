export interface IngestCounts {
  run_id?: string;
  dry?: boolean;
  rows_seen?: number;
  health?: Health;
  created?: number;
  updated?: number;
  results?: number;
  results_skipped?: number;
  new_players?: number;
  linked?: number;
  held_for_review?: number;
  walkovers_to_decide?: number;
  moved?: number;
  attached?: number;
  score_conflicts?: number;
  missing?: number;
  cancelled?: number;
}

export interface DrawCounts {
  draws?: number;
  people?: number;
  linked?: number;
  rows_seen?: number;
  dry?: boolean;
}

export type Health = 'ok' | 'drop' | 'empty' | 'error';

export interface SourceTournament {
  id: string;
  name: string;
  venue: string | null;
  area_id: string | null;
  surface: string | null;
  starts_on: string | null;
  ends_on: string | null;
  active: boolean;
  source_kind: 'sheet' | 'csv' | 'site' | null;
  source_url: string | null;
  draw_url: string | null;
  draws: number;
  ongoing: boolean;
  season_start_year: number | null;
  last_run_at: string | null;
  matches: number;
  open_reviews: number;
  last_run: { at: string; trigger: 'cron' | 'staff' | 'dry'; health: Health; rows_seen: number; counts: IngestCounts; error: string | null } | null;
  last_draw_run: { at: string; trigger: 'cron' | 'staff' | 'dry'; health: Health; rows_seen: number; counts: DrawCounts; error: string | null } | null;
}

export interface ReviewPerson {
  raw: string;
  surname: string;
  first: string;
  candidates: { id: string; first_name: string; surname: string; score: number }[] | null;
}

export interface ReviewRow {
  date: string;
  time: string;
  category_raw: string;
  level: string;
  discipline: string;
  side1: { raw?: string; surname?: string; first?: string }[];
  side2: { raw?: string; surname?: string; first?: string }[];
  score_raw?: string;
}

export interface ReviewItem {
  id: string;
  kind: 'people' | 'walkover' | 'score_conflict';
  tournament_id: string;
  tournament: string;
  match_id: string | null;
  payload: { row: ReviewRow; unclear?: ReviewPerson[] };
  created_at: string;
}
