import { supabase } from "./client";
import { Database } from "../types/database";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
type TournamentInsert = Database["public"]["Tables"]["tournaments"]["Insert"];
type TournamentUpdate = Database["public"]["Tables"]["tournaments"]["Update"];

type TournamentCategory =
  Database["public"]["Tables"]["tournament_categories"]["Row"];
type TournamentCategoryInsert =
  Database["public"]["Tables"]["tournament_categories"]["Insert"];
type TournamentCategoryUpdate =
  Database["public"]["Tables"]["tournament_categories"]["Update"];

type TournamentParticipant =
  Database["public"]["Tables"]["tournament_participants"]["Row"];
type TournamentParticipantInsert =
  Database["public"]["Tables"]["tournament_participants"]["Insert"];
type TournamentParticipantUpdate =
  Database["public"]["Tables"]["tournament_participants"]["Update"];

// Tournament Management
export async function getTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getTournament(id: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createTournament(tournament: TournamentInsert) {
  const { data, error } = await supabase
    .from("tournaments")
    .insert(tournament)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTournament(id: string, updates: TournamentUpdate) {
  const { data, error } = await supabase
    .from("tournaments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function deleteTournament(id: string) {
  const { error } = await supabase.from("tournaments").delete().eq("id", id);

  if (error) throw error;
}

// Tournament Categories Management
export async function getTournamentCategories(tournamentId: string) {
  const { data, error } = await supabase
    .from("tournament_categories")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("name");

  if (error) throw error;
  return data;
}

export async function getTournamentCategory(id: string) {
  const { data, error } = await supabase
    .from("tournament_categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createTournamentCategory(
  category: TournamentCategoryInsert
) {
  const { data, error } = await supabase
    .from("tournament_categories")
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTournamentCategory(
  id: string,
  updates: TournamentCategoryUpdate
) {
  const { data, error } = await supabase
    .from("tournament_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTournamentCategory(id: string) {
  const { error } = await supabase
    .from("tournament_categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Tournament Participants Management
export async function getTournamentParticipants(tournamentId: string) {
  const { data, error } = await supabase
    .from("tournament_participants")
    .select(
      `
            *,
            players (
                id,
                first_name,
                last_name,
                ntrp_rating,
                age,
                surface_preference
            )
        `
    )
    .eq("tournament_id", tournamentId)
    .order("registration_date");

  if (error) throw error;
  return data;
}

export async function getTournamentParticipant(id: string) {
  const { data, error } = await supabase
    .from("tournament_participants")
    .select(
      `
            *,
            players (
                id,
                first_name,
                last_name,
                ntrp_rating,
                age,
                surface_preference
            )
        `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function addTournamentParticipant(
  participant: TournamentParticipantInsert
) {
  const { data, error } = await supabase
    .from("tournament_participants")
    .insert(participant)
    .select(
      `
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
        `
    )
    .single();

  if (error) throw error;
  return data;
}

export async function updateTournamentParticipant(
  id: string,
  updates: TournamentParticipantUpdate
) {
  const { data, error } = await supabase
    .from("tournament_participants")
    .update(updates)
    .eq("id", id)
    .select(
      `
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
        `
    )
    .single();

  if (error) throw error;
  return data;
}

export async function removeTournamentParticipant(id: string) {
  const { error } = await supabase
    .from("tournament_participants")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Utility functions
export async function getAvailablePlayers(tournamentId: string) {
  // Get players who are not already registered for this tournament
  const { data: participantIds } = await supabase
    .from("tournament_participants")
    .select("player_id")
    .eq("tournament_id", tournamentId);

  const registeredPlayerIds = participantIds?.map((p) => p.player_id) || [];

  let query = supabase
    .from("players")
    .select("id, first_name, last_name, ntrp_rating, age, surface_preference")
    .eq("is_active", true)
    .order("first_name, last_name");

  // Only apply the not.in filter if there are registered players
  if (registeredPlayerIds.length > 0) {
    query = query.not("id", "in", registeredPlayerIds);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getTournamentWithDetails(id: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select(
      `
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
                )
            )
        `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// Utility function to manually sync tournament participants from matches
export async function syncTournamentParticipants(tournamentId: string) {
  const { error } = await supabase.rpc("sync_existing_tournament_participants");

  if (error) throw error;
  return { success: true };
}

// Tournament Teams Management
export async function getTournamentTeams(tournamentId: string) {
  const { data, error } = await supabase
    .from("tournament_teams")
    .select(
      `
            *,
            captain:players!tournament_teams_captain_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating
            ),
            team_members (
                id,
                player_id,
                player:players (
                    id,
                    first_name,
                    last_name,
                    ntrp_rating,
                    age,
                    surface_preference
                )
            )
        `
    )
    .eq("tournament_id", tournamentId)
    .order("name");

  if (error) throw error;
  return data;
}

export async function getTournamentTeam(id: string) {
  const { data, error } = await supabase
    .from("tournament_teams")
    .select(
      `
            *,
            captain:players!tournament_teams_captain_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating
            ),
            team_members (
                id,
                player_id,
                player:players (
                    id,
                    first_name,
                    last_name,
                    ntrp_rating,
                    age,
                    surface_preference
                )
            )
        `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createTournamentTeam(team: {
  tournament_id: string;
  name: string;
  captain_id: string | null;
  member_ids: string[];
}) {
  // First create the team
  const { data: teamData, error: teamError } = await supabase
    .from("tournament_teams")
    .insert({
      tournament_id: team.tournament_id,
      name: team.name,
      captain_id: team.captain_id,
    })
    .select()
    .single();

  if (teamError) throw teamError;

  // Then add team members if any
  if (team.member_ids && team.member_ids.length > 0) {
    const members = team.member_ids.map((player_id) => ({
      team_id: teamData.id,
      player_id,
    }));

    const { error: membersError } = await supabase
      .from("team_members")
      .insert(members);

    if (membersError) throw membersError;
  }

  // Return the team with all relations
  return getTournamentTeam(teamData.id);
}

export async function updateTournamentTeam(
  id: string,
  updates: {
    name?: string;
    captain_id?: string | null;
    member_ids?: string[];
  }
) {
  // Update team basic info
  const teamUpdates: any = {};
  if (updates.name !== undefined) teamUpdates.name = updates.name;
  if (updates.captain_id !== undefined)
    teamUpdates.captain_id = updates.captain_id;

  if (Object.keys(teamUpdates).length > 0) {
    const { error: teamError } = await supabase
      .from("tournament_teams")
      .update(teamUpdates)
      .eq("id", id);

    if (teamError) throw teamError;
  }

  // Update team members if provided
  if (updates.member_ids !== undefined) {
    // Delete existing members
    const { error: deleteError } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", id);

    if (deleteError) throw deleteError;

    // Add new members
    if (updates.member_ids.length > 0) {
      const members = updates.member_ids.map((player_id) => ({
        team_id: id,
        player_id,
      }));

      const { error: membersError } = await supabase
        .from("team_members")
        .insert(members);

      if (membersError) throw membersError;
    }
  }

  // Return the updated team with all relations
  return getTournamentTeam(id);
}

export async function deleteTournamentTeam(id: string) {
  // Team members will be deleted automatically due to CASCADE
  const { error } = await supabase
    .from("tournament_teams")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
