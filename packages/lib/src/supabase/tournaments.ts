import { supabase } from './client';
import { Database } from '../types/database';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type TournamentInsert = Database['public']['Tables']['tournaments']['Insert'];
type TournamentUpdate = Database['public']['Tables']['tournaments']['Update'];

type TournamentCategory = Database['public']['Tables']['tournament_categories']['Row'];
type TournamentCategoryInsert = Database['public']['Tables']['tournament_categories']['Insert'];
type TournamentCategoryUpdate = Database['public']['Tables']['tournament_categories']['Update'];

type TournamentParticipant = Database['public']['Tables']['tournament_participants']['Row'];
type TournamentParticipantInsert = Database['public']['Tables']['tournament_participants']['Insert'];
type TournamentParticipantUpdate = Database['public']['Tables']['tournament_participants']['Update'];

// Tournament Management
export async function getTournaments() {
    const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getTournament(id: string) {
    const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function createTournament(tournament: TournamentInsert) {
    const { data, error } = await supabase
        .from('tournaments')
        .insert(tournament)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateTournament(id: string, updates: TournamentUpdate) {
    const { data, error } = await supabase
        .from('tournaments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteTournament(id: string) {
    const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Tournament Categories Management
export async function getTournamentCategories(tournamentId: string) {
    const { data, error } = await supabase
        .from('tournament_categories')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('name');

    if (error) throw error;
    return data;
}

export async function getTournamentCategory(id: string) {
    const { data, error } = await supabase
        .from('tournament_categories')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function createTournamentCategory(category: TournamentCategoryInsert) {
    const { data, error } = await supabase
        .from('tournament_categories')
        .insert(category)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateTournamentCategory(id: string, updates: TournamentCategoryUpdate) {
    const { data, error } = await supabase
        .from('tournament_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteTournamentCategory(id: string) {
    const { error } = await supabase
        .from('tournament_categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Tournament Participants Management
export async function getTournamentParticipants(tournamentId: string) {
    const { data, error } = await supabase
        .from('tournament_participants')
        .select(`
            *,
            players (
                id,
                first_name,
                last_name,
                ntrp_rating,
                age,
                surface_preference
            ),
            tournament_categories (
                id,
                name
            )
        `)
        .eq('tournament_id', tournamentId)
        .order('registration_date');

    if (error) throw error;
    return data;
}

export async function getTournamentParticipant(id: string) {
    const { data, error } = await supabase
        .from('tournament_participants')
        .select(`
            *,
            players (
                id,
                first_name,
                last_name,
                ntrp_rating,
                age,
                surface_preference
            ),
            tournament_categories (
                id,
                name
            )
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function addTournamentParticipant(participant: TournamentParticipantInsert) {
    const { data, error } = await supabase
        .from('tournament_participants')
        .insert(participant)
        .select(`
            *,
            players (
                id,
                first_name,
                last_name,
                ntrp_rating,
                age,
                surface_preference
            ),
            tournament_categories (
                id,
                name
            )
        `)
        .single();

    if (error) throw error;
    return data;
}

export async function updateTournamentParticipant(id: string, updates: TournamentParticipantUpdate) {
    const { data, error } = await supabase
        .from('tournament_participants')
        .update(updates)
        .eq('id', id)
        .select(`
            *,
            players (
                id,
                first_name,
                last_name,
                ntrp_rating,
                age,
                surface_preference
            ),
            tournament_categories (
                id,
                name
            )
        `)
        .single();

    if (error) throw error;
    return data;
}

export async function removeTournamentParticipant(id: string) {
    const { error } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Utility functions
export async function getAvailablePlayers(tournamentId: string) {
    // Get players who are not already registered for this tournament
    const { data: participantIds } = await supabase
        .from('tournament_participants')
        .select('player_id')
        .eq('tournament_id', tournamentId);

    const registeredPlayerIds = participantIds?.map(p => p.player_id) || [];
    
    let query = supabase
        .from('players')
        .select('id, first_name, last_name, ntrp_rating, age, surface_preference')
        .order('first_name, last_name');

    // Only apply the not.in filter if there are registered players
    if (registeredPlayerIds.length > 0) {
        query = query.not('id', 'in', registeredPlayerIds);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
}

export async function getTournamentWithDetails(id: string) {
    const { data, error } = await supabase
        .from('tournaments')
        .select(`
            *,
            tournament_categories (*),
            tournament_participants (
                *,
                players (
                    id,
                    first_name,
                    last_name,
                    ntrp_rating,
                    age,
                    surface_preference
                ),
                tournament_categories (
                    id,
                    name
                )
            )
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
} 