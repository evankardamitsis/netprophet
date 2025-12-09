import { supabase } from "./client";
import { Database } from "../types/database";

type Match = Database["public"]["Tables"]["matches"]["Row"];
type MatchInsert = Database["public"]["Tables"]["matches"]["Insert"];
type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];

// Enhanced Match Management
export async function getMatches(filters?: {
  tournament_id?: string;
  category_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}) {
  let query = supabase
    .from("matches")
    .select(
      `
            *,
            tournaments (
                id,
                name,
                surface,
                location,
                matches_type
            ),
            tournament_categories (
                id,
                name
            )
        `
    )
    .order("start_time", { ascending: true });

  if (filters?.tournament_id) {
    query = query.eq("tournament_id", filters.tournament_id);
  }
  if (filters?.category_id) {
    query = query.eq("category_id", filters.category_id);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.start_date) {
    query = query.gte("start_time", filters.start_date);
  }
  if (filters?.end_date) {
    query = query.lte("start_time", filters.end_date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getMatch(id: string) {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
            *,
            tournaments (
                id,
                name,
                surface,
                location,
                matches_type
            ),
            tournament_categories (
                id,
                name
            ),
            player_a:players!matches_player_a_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference,
                wins,
                losses,
                last5,
                current_streak,
                streak_type
            ),
        player_b:players!matches_player_b_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference,
                wins,
                losses,
                last5,
                current_streak,
                streak_type
            ),
            player_a1:players!matches_player_a1_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference,
                wins,
                losses,
                last5,
                current_streak,
                streak_type
            ),
            player_a2:players!matches_player_a2_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference,
                wins,
                losses,
                last5,
                current_streak,
                streak_type
            ),
            player_b1:players!matches_player_b1_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference,
                wins,
                losses,
                last5,
                current_streak,
                streak_type
            ),
            player_b2:players!matches_player_b2_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference,
                wins,
                losses,
                last5,
                current_streak,
                streak_type
            ),
            winner:players!matches_winner_id_fkey (
                id,
                first_name,
                last_name
            )
        `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createMatch(match: MatchInsert) {
  const { data, error } = await supabase
    .from("matches")
    .insert(match)
    .select(
      `
            *,
            tournaments (
                id,
                name,
                surface,
                location,
                matches_type
            ),
            tournament_categories (
                id,
                name
            ),
            player_a:players!matches_player_a_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_b:players!matches_player_b_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_a1:players!matches_player_a1_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_a2:players!matches_player_a2_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_b1:players!matches_player_b1_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_b2:players!matches_player_b2_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            winner:players!matches_winner_id_fkey (
                id,
                first_name,
                last_name
            )
        `
    )
    .single();

  if (error) throw error;
  return data;
}

export async function updateMatch(id: string, updates: MatchUpdate) {
  const { data, error } = await supabase
    .from("matches")
    .update(updates)
    .eq("id", id)
    .select(
      `
            *,
            tournaments (
                id,
                name,
                surface,
                location,
                matches_type
            ),
            tournament_categories (
                id,
                name
            ),
            player_a:players!matches_player_a_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_b:players!matches_player_b_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_a1:players!matches_player_a1_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_a2:players!matches_player_a2_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_b1:players!matches_player_b1_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_b2:players!matches_player_b2_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            winner:players!matches_winner_id_fkey (
                id,
                first_name,
                last_name
            )
        `
    )
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMatch(id: string) {
  const { error } = await supabase.from("matches").delete().eq("id", id);

  if (error) throw error;
}

// Match scheduling and management
export async function getUpcomingMatches(limit = 10) {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
            *,
            tournaments (
                id,
                name,
                surface,
                location,
                matches_type
            ),
            tournament_categories (
                id,
                name
            ),
            players!matches_player_a_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            players!matches_player_b_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            )
        `
    )
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getLiveMatches() {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
            *,
            tournaments (
                id,
                name,
                surface,
                location,
                matches_type
            ),
            tournament_categories (
                id,
                name
            ),
            players!matches_player_a_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            players!matches_player_b_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            )
        `
    )
    .eq("status", "live")
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getMatchesByTournament(tournamentId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
            *,
            tournaments (
                id,
                name,
                surface,
                location,
                matches_type
            ),
            tournament_categories (
                id,
                name
            ),
            player_a:players!matches_player_a_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_b:players!matches_player_b_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_a1:players!matches_player_a1_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_a2:players!matches_player_a2_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_b1:players!matches_player_b1_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            ),
            player_b2:players!matches_player_b2_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            )
        `
    )
    .eq("tournament_id", tournamentId)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data;
}

// Match result management
export async function updateMatchResult(
  id: string,
  result: {
    winner_id: string;
    status: "finished";
  }
) {
  const { data, error } = await supabase
    .from("matches")
    .update({
      winner_id: result.winner_id,
      status: result.status,
      processed: true,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Utility functions
export async function getAvailablePlayersForMatch(
  tournamentId?: string,
  categoryId?: string
) {
  let query = supabase
    .from("players")
    .select("id, first_name, last_name, ntrp_rating, age, surface_preference")
    .eq("is_active", true)
    .order("first_name, last_name");

  // If tournament is specified, only show players registered for that tournament
  if (tournamentId) {
    // First get the player IDs for this tournament

    let participantQuery = supabase
      .from("tournament_participants")
      .select("player_id")
      .eq("tournament_id", tournamentId);

    // Filter by category if specified
    if (categoryId) {
      participantQuery = participantQuery.eq("category_id", categoryId);
    } else {
      participantQuery = participantQuery.is("category_id", null);
    }

    const { data: participantIds } = await participantQuery;

    if (participantIds && participantIds.length > 0) {
      const playerIds = participantIds.map((p) => p.player_id);
      query = query.in("id", playerIds);
    } else {
      // No participants found, return empty array
      return [];
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function calculateMatchOddsSecure(matchIds: string[]) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  // Get the Supabase URL and key from environment variables
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase configuration not found");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/calculate-odds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({ matchIds }),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error || "Failed to calculate odds");
  }

  return await response.json();
}

export async function syncMatchesToWeb(matchIds: string[]) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  // Get the Supabase URL and key from environment variables
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase configuration not found");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/sync-matches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({ matchIds }),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error || "Failed to sync matches");
  }

  return await response.json();
}

export async function removeMatchesFromWeb(matchIds: string[]) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  // Get the Supabase URL and key from environment variables
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase configuration not found");
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/remove-matches-from-web`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({ matchIds }),
    }
  );

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error || "Failed to remove matches from web");
  }

  return await response.json();
}
