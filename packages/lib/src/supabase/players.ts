import { supabase } from "./client";
import type { Player } from "../types/player";

const TABLE = "players";

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
  const dbPlayer: any = {
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

  // Only include id if it's not empty (let DB generate UUID if empty)
  if (player.id && player.id.trim() !== "") {
    dbPlayer.id = player.id;
  }

  return dbPlayer;
}

export async function fetchPlayers() {
  const { data, error } = await supabase.from(TABLE).select("*");
  if (error) {
    console.error("[fetchPlayers] Supabase error:", error);
    throw error;
  }
  const mapped = (data ?? []).map(mapPlayer);
  return mapped;
}

export async function fetchPlayersPaginated(
  page: number = 1,
  pageSize: number = 20,
  sortBy?: string,
  sortOrder: "asc" | "desc" = "asc",
  searchTerm?: string
) {
  let query = supabase.from(TABLE).select("*", { count: "exact" });

  // Add search filter if provided
  if (searchTerm && searchTerm.trim()) {
    const searchValue = searchTerm.trim();
    query = query.or(
      `first_name.ilike.%${searchValue}%,last_name.ilike.%${searchValue}%`
    );
  }

  // Add sorting
  if (sortBy) {
    query = query.order(sortBy, { ascending: sortOrder === "asc" });
  } else {
    query = query.order("last_name", { ascending: true });
  }

  // Add pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("[fetchPlayersPaginated] Supabase error:", error);
    throw error;
  }

  const mapped = (data ?? []).map(mapPlayer);
  return {
    players: mapped,
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function fetchPlayerById(id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("[fetchPlayerById] Supabase error:", error);
    throw error;
  }
  if (!data) {
    throw new Error("Player not found");
  }
  return mapPlayer(data);
}

export async function insertPlayer(player: Player) {
  const dbPlayer = toDbPlayer(player);
  const { data, error } = await supabase
    .from(TABLE)
    .insert([dbPlayer])
    .select();
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
  console.log("Updating player in DB:", dbUpdates);
  const { data, error } = await supabase
    .from(TABLE)
    .update(dbUpdates)
    .eq("id", id)
    .select();
  if (error) throw error;
  return data?.[0] as unknown as Player;
}

export async function deletePlayer(id: string) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

/**
 * Update player statistics based on match result
 * This function should be called when a match result is added/updated
 */
export async function updatePlayerStatsFromMatchResult(
  matchId: string,
  winnerId: string,
  loserId: string,
  matchDate: string,
  tournamentSurface?: string
) {
  try {
    // Get current player data
    const winner = await fetchPlayerById(winnerId);
    const loser = await fetchPlayerById(loserId);

    // Helper function to update surface win rates
    const updateSurfaceWinRate = (
      player: any,
      surface: string,
      isWin: boolean
    ) => {
      const surfaceKey = getSurfaceKey(surface);
      if (!surfaceKey) return player;

      const currentRate = player.surfaceWinRates?.[surfaceKey] || 0.5;
      const currentWins = Math.round(currentRate * 10); // Assuming we track last 10 matches per surface
      const currentLosses = 10 - currentWins;

      if (isWin) {
        const newWins = currentWins + 1;
        const newRate = newWins / 10;
        return {
          ...player,
          surfaceWinRates: {
            ...player.surfaceWinRates,
            [surfaceKey]: Math.min(1, newRate),
          },
        };
      } else {
        const newLosses = currentLosses + 1;
        const newRate = currentWins / 10;
        return {
          ...player,
          surfaceWinRates: {
            ...player.surfaceWinRates,
            [surfaceKey]: Math.max(0, newRate),
          },
        };
      }
    };

    // Update winner stats
    let updatedWinner = {
      ...winner,
      wins: winner.wins + 1,
      last5: [...winner.last5.slice(1), "W"], // Remove oldest, add new W
      lastMatchDate: matchDate,
    };

    // Update winner surface win rates if tournament surface is provided
    if (tournamentSurface) {
      updatedWinner = updateSurfaceWinRate(
        updatedWinner,
        tournamentSurface,
        true
      );
    }

    // Update winner streak
    if (winner.streakType === "W") {
      updatedWinner.currentStreak = winner.currentStreak + 1;
    } else {
      updatedWinner.currentStreak = 1;
      updatedWinner.streakType = "W";
    }

    // Update winner seasonal form (simple average of last 10 matches)
    const recentResults = updatedWinner.last5;
    const recentWins = recentResults.filter((r) => r === "W").length;
    updatedWinner.seasonalForm = recentWins / recentResults.length;

    // Update loser stats
    let updatedLoser = {
      ...loser,
      losses: loser.losses + 1,
      last5: [...loser.last5.slice(1), "L"], // Remove oldest, add new L
      lastMatchDate: matchDate,
    };

    // Update loser surface win rates if tournament surface is provided
    if (tournamentSurface) {
      updatedLoser = updateSurfaceWinRate(
        updatedLoser,
        tournamentSurface,
        false
      );
    }

    // Update loser streak
    if (loser.streakType === "L") {
      updatedLoser.currentStreak = loser.currentStreak + 1;
    } else {
      updatedLoser.currentStreak = 1;
      updatedLoser.streakType = "L";
    }

    // Update loser seasonal form
    const loserRecentResults = updatedLoser.last5;
    const loserRecentWins = loserRecentResults.filter((r) => r === "W").length;
    updatedLoser.seasonalForm = loserRecentWins / loserRecentResults.length;

    // Update both players in database
    await Promise.all([
      updatePlayer(winnerId, updatedWinner),
      updatePlayer(loserId, updatedLoser),
    ]);

    console.log(
      `Updated player stats for match ${matchId}: Winner ${winner.firstName} ${winner.lastName}, Loser ${loser.firstName} ${loser.lastName}${tournamentSurface ? ` on ${tournamentSurface}` : ""}`
    );
  } catch (error) {
    console.error("Error updating player stats from match result:", error);
    throw error;
  }
}

/**
 * Helper function to map tournament surface to surface key
 */
function getSurfaceKey(surface: string): string | null {
  const surfaceMap: { [key: string]: string } = {
    "Hard Court": "hardCourt",
    hard: "hardCourt",
    Hard: "hardCourt",
    "Clay Court": "clayCourt",
    clay: "clayCourt",
    Clay: "clayCourt",
    "Grass Court": "grassCourt",
    grass: "grassCourt",
    Grass: "grassCourt",
    Indoor: "indoor",
    indoor: "indoor",
    Carpet: "indoor", // Map carpet to indoor
    carpet: "indoor",
  };

  return surfaceMap[surface] || null;
}

/**
 * Reverse player statistics when a match result is deleted
 * This function should be called when a match result is deleted
 */
export async function reversePlayerStatsFromMatchResult(
  matchId: string,
  winnerId: string,
  loserId: string,
  tournamentSurface?: string
) {
  try {
    // Get current player data
    const winner = await fetchPlayerById(winnerId);
    const loser = await fetchPlayerById(loserId);

    // Helper function to reverse surface win rates
    const reverseSurfaceWinRate = (
      player: any,
      surface: string,
      wasWin: boolean
    ) => {
      const surfaceKey = getSurfaceKey(surface);
      if (!surfaceKey) return player;

      const currentRate = player.surfaceWinRates?.[surfaceKey] || 0.5;
      const currentWins = Math.round(currentRate * 10);
      const currentLosses = 10 - currentWins;

      if (wasWin) {
        // Reverse a win - decrease wins
        const newWins = Math.max(0, currentWins - 1);
        const newRate = newWins / 10;
        return {
          ...player,
          surfaceWinRates: {
            ...player.surfaceWinRates,
            [surfaceKey]: Math.max(0, newRate),
          },
        };
      } else {
        // Reverse a loss - decrease losses (increase wins)
        const newWins = Math.min(10, currentWins + 1);
        const newRate = newWins / 10;
        return {
          ...player,
          surfaceWinRates: {
            ...player.surfaceWinRates,
            [surfaceKey]: Math.min(1, newRate),
          },
        };
      }
    };

    // Reverse winner stats
    let updatedWinner = {
      ...winner,
      wins: Math.max(0, winner.wins - 1), // Don't go below 0
      last5: [...winner.last5.slice(1), "L"], // Remove oldest, add L (assuming this was their most recent match)
    };

    // Reverse winner surface win rates if tournament surface is provided
    if (tournamentSurface) {
      updatedWinner = reverseSurfaceWinRate(
        updatedWinner,
        tournamentSurface,
        true
      );
    }

    // Update winner streak (simplified - reset to 0)
    updatedWinner.currentStreak = 0;
    updatedWinner.streakType = "L";

    // Update winner seasonal form
    const recentResults = updatedWinner.last5;
    const recentWins = recentResults.filter((r) => r === "W").length;
    updatedWinner.seasonalForm = recentWins / recentResults.length;

    // Reverse loser stats
    let updatedLoser = {
      ...loser,
      losses: Math.max(0, loser.losses - 1), // Don't go below 0
      last5: [...loser.last5.slice(1), "W"], // Remove oldest, add W (assuming this was their most recent match)
    };

    // Reverse loser surface win rates if tournament surface is provided
    if (tournamentSurface) {
      updatedLoser = reverseSurfaceWinRate(
        updatedLoser,
        tournamentSurface,
        false
      );
    }

    // Update loser streak (simplified - reset to 0)
    updatedLoser.currentStreak = 0;
    updatedLoser.streakType = "W";

    // Update loser seasonal form
    const loserRecentResults = updatedLoser.last5;
    const loserRecentWins = loserRecentResults.filter((r) => r === "W").length;
    updatedLoser.seasonalForm = loserRecentWins / loserRecentResults.length;

    // Update both players in database
    await Promise.all([
      updatePlayer(winnerId, updatedWinner),
      updatePlayer(loserId, updatedLoser),
    ]);

    console.log(
      `Reversed player stats for match ${matchId}: Previous Winner ${winner.firstName} ${winner.lastName}, Previous Loser ${loser.firstName} ${loser.lastName}${tournamentSurface ? ` on ${tournamentSurface}` : ""}`
    );
  } catch (error) {
    console.error("Error reversing player stats from match result:", error);
    throw error;
  }
}
