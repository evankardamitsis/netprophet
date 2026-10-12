'use server';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';

/** Server actions for the import desk: everything goes through the staff-only api functions. */
type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

async function rpc(fn: string, args: object): Promise<unknown> {
  const client = await createV2ServerClient();
  if (!(await getStaff(client))) throw new Error('forbidden');
  const { data, error } = await (client.rpc.bind(client) as unknown as Rpc)(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export interface Tournament {
  id: string;
  name: string;
  venue: string | null;
  area_id: string | null;
  surface: 'clay' | 'hard' | 'grass' | 'carpet' | null;
  starts_on: string | null;
  ends_on: string | null;
  active: boolean;
  matches: number;
}

export interface Candidate {
  id: string;
  first_name: string;
  surname: string;
  area_id: string | null;
  score: number;
}

export async function listTournaments(): Promise<Tournament[]> {
  return (await rpc('admin_tournaments', {})) as Tournament[];
}

export interface TournamentDraft {
  id?: string;
  name: string;
  venue?: string;
  area_id?: string;
  /** clay, hard, grass, carpet, or '' for none yet; the database checks the value */
  surface?: string;
  starts_on?: string;
  ends_on?: string;
}

export async function saveTournament(t: TournamentDraft): Promise<string> {
  return (await rpc('admin_save_tournament', { p: t })) as string;
}

export async function matchPeople(people: { surname: string; first: string; first_alt: string }[]): Promise<{ alias: string | null; candidates: Candidate[] }[]> {
  return (await rpc('admin_match_people', { p_people: people })) as { alias: string | null; candidates: Candidate[] }[];
}

export interface ImportSummary {
  created: number;
  updated: number;
  results: number;
  results_skipped: number;
  new_players: number;
}

export async function importRows(tournamentId: string, rows: unknown[]): Promise<ImportSummary> {
  return (await rpc('admin_import_matches', { p_tournament_id: tournamentId, p_rows: rows })) as ImportSummary;
}
