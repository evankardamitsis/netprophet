import { supabase } from './client';
import type { Player } from '../types/player';

const TABLE = 'players';

function mapPlayer(row: any): Player {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    ntrpRating: Number(row.ntrp_rating),
    wins: row.wins,
    losses: row.losses,
    last5: row.last5,
    currentStreak: row.current_streak,
    streakType: row.streak_type,
    surfacePreference: row.surface_preference,
    surfaceWinRates: row.surface_win_rates,
    aggressiveness: row.aggressiveness,
    stamina: row.stamina,
    consistency: row.consistency,
    age: row.age,
    hand: row.hand,
    notes: row.notes,
    lastMatchDate: row.last_match_date,
    fatigueLevel: row.fatigue_level,
    injuryStatus: row.injury_status,
    seasonalForm: row.seasonal_form,
  };
}

export async function fetchPlayers() {
  const { data, error } = await supabase.from(TABLE).select('*');
  console.log('[fetchPlayers] Raw data from Supabase:', data);
  if (error) {
    console.error('[fetchPlayers] Supabase error:', error);
    throw error;
  }
  const mapped = (data ?? []).map(mapPlayer);
  console.log('[fetchPlayers] Mapped players:', mapped);
  return mapped;
}

export async function insertPlayer(player: Player) {
  const { data, error } = await supabase.from(TABLE).insert([player]).select();
  if (error) throw error;
  return data?.[0] as Player;
}

export async function bulkInsertPlayers(players: Player[]) {
  const { data, error } = await supabase.from(TABLE).insert(players).select();
  if (error) throw error;
  return data as Player[];
}

export async function updatePlayer(id: string, updates: Partial<Player>) {
  const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select();
  if (error) throw error;
  return data?.[0] as Player;
}

export async function deletePlayer(id: string) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
} 