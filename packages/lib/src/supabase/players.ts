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

// Map Player object from camelCase to snake_case for DB writes
function toDbPlayer(player: Partial<Player>): any {
  return {
    id: player.id,
    first_name: player.firstName,
    last_name: player.lastName,
    ntrp_rating: player.ntrpRating,
    wins: player.wins,
    losses: player.losses,
    last5: player.last5,
    current_streak: player.currentStreak,
    streak_type: player.streakType,
    surface_preference: player.surfacePreference,
    surface_win_rates: player.surfaceWinRates,
    aggressiveness: player.aggressiveness,
    stamina: player.stamina,
    consistency: player.consistency,
    age: player.age,
    hand: player.hand,
    notes: player.notes,
    last_match_date: player.lastMatchDate,
    fatigue_level: player.fatigueLevel,
    injury_status: player.injuryStatus,
    seasonal_form: player.seasonalForm,
  };
}

export async function fetchPlayers() {
  const { data, error } = await supabase.from(TABLE).select('*');
  if (error) {
    console.error('[fetchPlayers] Supabase error:', error);
    throw error;
  }
  const mapped = (data ?? []).map(mapPlayer);
  return mapped;
}

export async function insertPlayer(player: Player) {
  const dbPlayer = toDbPlayer(player);
  const { data, error } = await supabase.from(TABLE).insert([dbPlayer]).select();
  if (error) throw error;
  return data?.[0] as unknown as Player;
}

export async function bulkInsertPlayers(players: Player[]) {
  const dbPlayers = players.map(toDbPlayer);
  const { data, error } = await supabase.from(TABLE).insert(dbPlayers).select();
  if (error) throw error;
  return data as unknown as Player[];
}

export async function updatePlayer(id: string, updates: Partial<Player>) {
  const dbUpdates = toDbPlayer(updates);
  console.log('Updating player in DB:', dbUpdates);
  const { data, error } = await supabase.from(TABLE).update(dbUpdates).eq('id', id).select();
  if (error) throw error;
  return data?.[0] as unknown as Player;
}

export async function deletePlayer(id: string) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
} 