import { supabase } from "./client";
import type { Player } from "../types/player";

const TABLE = "players";

function mapPlayer(row: any): Player {
  // Explicitly extract gender to ensure it's included
  const genderValue: "men" | "women" | null =
    row.gender === "men" ? "men" : row.gender === "women" ? "women" : null;

  // Create player object - use spread operator to ensure gender is included
  const playerObj: any = {
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
    // Surface-specific statistics
    hardWins: row.hard_wins,
    hardLosses: row.hard_losses,
    hardMatches: row.hard_matches,
    hardWinRate: row.hard_win_rate,
    clayWins: row.clay_wins,
    clayLosses: row.clay_losses,
    clayMatches: row.clay_matches,
    clayWinRate: row.clay_win_rate,
    grassWins: row.grass_wins,
    grassLosses: row.grass_losses,
    grassMatches: row.grass_matches,
    grassWinRate: row.grass_win_rate,
    aggressiveness: row.aggressiveness,
    stamina: row.stamina,
    consistency: row.consistency,
    age: row.age,
    hand: row.hand,
    gender: genderValue,
    notes: row.notes,
    lastMatchDate: row.last_match_date,
    injuryStatus: row.injury_status,
    seasonalForm: row.seasonal_form,
    photoUrl: row.photo_url,
    isActive: row.is_active,
    isHidden: row.is_hidden,
    isDemoPlayer: row.is_demo_player,
    claimedByUserId: row.claimed_by_user_id,
    claimedAt: row.claimed_at,
  };

  // Verify gender is in the object before type assertion
  if (!("gender" in playerObj)) {
    // Force add it if missing
    playerObj.gender = genderValue;
  }

  const player = playerObj as Player;
  return player;
}

// Map Player object from camelCase to snake_case for DB writes
function toDbPlayer(player: Partial<Player>): any {
  const dbPlayer: any = {};

  // Only include fields that are explicitly provided (not undefined)
  if (player.firstName !== undefined) dbPlayer.first_name = player.firstName;
  if (player.lastName !== undefined) dbPlayer.last_name = player.lastName;
  if (player.ntrpRating !== undefined) dbPlayer.ntrp_rating = player.ntrpRating;
  if (player.wins !== undefined) dbPlayer.wins = player.wins;
  if (player.losses !== undefined) dbPlayer.losses = player.losses;
  if (player.last5 !== undefined) dbPlayer.last5 = player.last5;
  if (player.currentStreak !== undefined)
    dbPlayer.current_streak = player.currentStreak;
  if (player.streakType !== undefined) dbPlayer.streak_type = player.streakType;
  if (player.surfacePreference !== undefined)
    dbPlayer.surface_preference = player.surfacePreference;
  if (player.surfaceWinRates !== undefined)
    dbPlayer.surface_win_rates = player.surfaceWinRates;
  // Surface-specific stats
  if (player.hardWins !== undefined) dbPlayer.hard_wins = player.hardWins;
  if (player.hardLosses !== undefined) dbPlayer.hard_losses = player.hardLosses;
  if (player.hardMatches !== undefined)
    dbPlayer.hard_matches = player.hardMatches;
  if (player.hardWinRate !== undefined)
    dbPlayer.hard_win_rate = player.hardWinRate;
  if (player.clayWins !== undefined) dbPlayer.clay_wins = player.clayWins;
  if (player.clayLosses !== undefined) dbPlayer.clay_losses = player.clayLosses;
  if (player.clayMatches !== undefined)
    dbPlayer.clay_matches = player.clayMatches;
  if (player.clayWinRate !== undefined)
    dbPlayer.clay_win_rate = player.clayWinRate;
  if (player.grassWins !== undefined) dbPlayer.grass_wins = player.grassWins;
  if (player.grassLosses !== undefined)
    dbPlayer.grass_losses = player.grassLosses;
  if (player.grassMatches !== undefined)
    dbPlayer.grass_matches = player.grassMatches;
  if (player.grassWinRate !== undefined)
    dbPlayer.grass_win_rate = player.grassWinRate;
  // General stats
  if (player.aggressiveness !== undefined)
    dbPlayer.aggressiveness = player.aggressiveness;
  if (player.stamina !== undefined) dbPlayer.stamina = player.stamina;
  if (player.consistency !== undefined)
    dbPlayer.consistency = player.consistency;
  if (player.age !== undefined) dbPlayer.age = player.age;
  if (player.hand !== undefined) dbPlayer.hand = player.hand;
  if ("gender" in player) dbPlayer.gender = player.gender; // Can be null, so check if key exists
  if (player.notes !== undefined) dbPlayer.notes = player.notes;
  if (player.lastMatchDate !== undefined)
    dbPlayer.last_match_date = player.lastMatchDate;
  if (player.injuryStatus !== undefined)
    dbPlayer.injury_status = player.injuryStatus;
  if (player.seasonalForm !== undefined)
    dbPlayer.seasonal_form = player.seasonalForm;
  // photo_url can be null, so we need to check if the key exists (not just undefined)
  if ("photoUrl" in player) dbPlayer.photo_url = player.photoUrl;
  if (player.isActive !== undefined) dbPlayer.is_active = player.isActive;
  if (player.isHidden !== undefined) dbPlayer.is_hidden = player.isHidden;
  if (player.isDemoPlayer !== undefined)
    dbPlayer.is_demo_player = player.isDemoPlayer;
  if (player.claimedByUserId !== undefined)
    dbPlayer.claimed_by_user_id = player.claimedByUserId;
  if (player.claimedAt !== undefined) dbPlayer.claimed_at = player.claimedAt;

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
  searchTerm?: string,
  isActiveFilter?: boolean,
) {
  let query = supabase.from(TABLE).select("*", { count: "exact" });

  // Add search filter if provided (using normalized columns for accent-insensitive search)
  if (searchTerm && searchTerm.trim()) {
    const searchValue = searchTerm.trim().toLowerCase();
    // Search using normalized columns for accent and case-insensitive matching
    query = query.or(
      `first_name_normalized.like.%${searchValue}%,last_name_normalized.like.%${searchValue}%`,
    );
  }

  // Filter by active / inactive status at DB level if requested
  if (typeof isActiveFilter === "boolean") {
    query = query.eq("is_active", isActiveFilter);
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

// Import shared slug utility
import { createSlug } from "../utils/slug";

// Fetch player by slug (name-based URL)
export async function fetchPlayerBySlug(slug: string) {
  // Get all players and find by matching slug
  const { data, error } = await supabase.from(TABLE).select("*");

  if (error) {
    console.error("[fetchPlayerBySlug] Supabase error:", error);
    throw error;
  }

  // Find player where slug matches first_name + last_name
  const player = data?.find((p) => {
    const playerName = `${p.first_name || ""} ${p.last_name || ""}`.trim();
    const playerSlug = createSlug(playerName);
    return playerSlug === slug;
  });

  if (!player) {
    throw new Error("Player not found");
  }

  return mapPlayer(player);
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
  // Check for existing players to avoid duplicates
  const { data: existingPlayers } = await supabase
    .from(TABLE)
    .select("first_name, last_name");

  const existingSet = new Set(
    (existingPlayers || []).map((p) =>
      `${p.first_name}|${p.last_name}`.toLowerCase(),
    ),
  );

  // Filter out duplicates
  const newPlayers = players.filter((player) => {
    const key = `${player.firstName}|${player.lastName}`.toLowerCase();
    return !existingSet.has(key);
  });

  console.log(`Total players to import: ${players.length}`);
  console.log(
    `Existing players (skipped): ${players.length - newPlayers.length}`,
  );
  console.log(`New players (will import): ${newPlayers.length}`);

  if (newPlayers.length === 0) {
    return [] as Player[];
  }

  // Insert in batches of 500 to avoid query size limits
  const BATCH_SIZE = 500;
  const allInsertedPlayers: Player[] = [];

  for (let i = 0; i < newPlayers.length; i += BATCH_SIZE) {
    const batch = newPlayers.slice(i, i + BATCH_SIZE);
    const dbPlayers = batch.map(toDbPlayer);

    console.log(
      `Inserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(newPlayers.length / BATCH_SIZE)} (${batch.length} players)`,
    );

    const { data, error } = await supabase
      .from(TABLE)
      .insert(dbPlayers)
      .select();
    if (error) throw error;

    if (data) {
      allInsertedPlayers.push(...(data as unknown as Player[]));
    }
  }

  console.log(`Successfully inserted ${allInsertedPlayers.length} players`);
  return allInsertedPlayers;
}

export async function updatePlayer(id: string, updates: Partial<Player>) {
  const dbUpdates = toDbPlayer(updates);
  console.log("Updating player in DB:", { id, updates: dbUpdates });
  const { data, error } = await supabase
    .from(TABLE)
    .update(dbUpdates)
    .eq("id", id)
    .select();
  if (error) {
    console.error("Error updating player:", error);
    throw error;
  }
  // Map the database response (snake_case) to Player type (camelCase)
  const updatedPlayer = data?.[0] ? mapPlayer(data[0]) : null;
  console.log("Player updated successfully:", {
    id,
    photo_url: dbUpdates.photo_url,
    photoUrl: updatedPlayer?.photoUrl,
  });
  return updatedPlayer;
}

export async function deletePlayer(id: string) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function updatePlayerStatus(id: string, isActive: boolean) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_active: isActive })
    .eq("id", id)
    .select();
  if (error) throw error;

  // If deactivating the player, unclaim any user who has claimed this player
  if (!isActive && data?.[0]) {
    const player = data[0];

    // Check if this player has been claimed by a user
    if (player.claimed_by_user_id) {
      console.log(
        `Player ${id} deactivated. Unclaiming user ${player.claimed_by_user_id}`,
      );

      // Reset the player's claim fields so it can be found by find_matching_players
      const { error: playerUnclaimError } = await supabase
        .from(TABLE)
        .update({
          claimed_by_user_id: null,
          claimed_at: null,
          is_hidden: true, // Make it hidden again so find_matching_players can find it
          is_demo_player: false, // Ensure it's not marked as demo player
        })
        .eq("id", id);

      if (playerUnclaimError) {
        console.error(`Error unclaiming player ${id}:`, playerUnclaimError);
      }

      // Reset the user's profile claim status to allow them to claim again
      const { error: userUnclaimError } = await supabase
        .from("profiles")
        .update({
          profile_claim_status: "pending",
          claimed_player_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("claimed_player_id", id);

      if (userUnclaimError) {
        console.error(
          `Error unclaiming user for player ${id}:`,
          userUnclaimError,
        );
        // Don't throw error, just log it - the player status update was successful
      } else {
        console.log(
          `Successfully unclaimed user ${player.claimed_by_user_id} from player ${id}`,
        );
      }
    }
  }

  return data?.[0] as unknown as Player;
}

export async function fetchActivePlayers() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("is_active", true);
  if (error) {
    console.error("[fetchActivePlayers] Supabase error:", error);
    throw error;
  }

  const mapped = (data ?? []).map(mapPlayer);
  return mapped;
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
  tournamentSurface?: string,
) {
  try {
    // Get current player data
    const winner = await fetchPlayerById(winnerId);
    const loser = await fetchPlayerById(loserId);

    // Helper function to update surface win rates
    const updateSurfaceWinRate = (
      player: any,
      surface: string,
      isWin: boolean,
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
        true,
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
        false,
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

    // Update head-to-head record
    try {
      await supabase.rpc("update_head_to_head_record", {
        p_player_a_id: winnerId,
        p_player_b_id: loserId,
        p_winner_id: winnerId,
        p_match_date: matchDate,
      });
    } catch (h2hError) {
      console.error("Error updating head-to-head record:", h2hError);
      // Don't fail the entire update if head-to-head update fails
    }

    // Update both players in database
    await Promise.all([
      updatePlayer(winnerId, updatedWinner),
      updatePlayer(loserId, updatedLoser),
    ]);

    console.log(
      `Updated player stats for match ${matchId}: Winner ${winner.firstName} ${winner.lastName}, Loser ${loser.firstName} ${loser.lastName}${tournamentSurface ? ` on ${tournamentSurface}` : ""}`,
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
  tournamentSurface?: string,
) {
  try {
    // Get current player data
    const winner = await fetchPlayerById(winnerId);
    const loser = await fetchPlayerById(loserId);

    // Helper function to reverse surface win rates
    const reverseSurfaceWinRate = (
      player: any,
      surface: string,
      wasWin: boolean,
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
        true,
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
        false,
      );
    }

    // Update loser streak (simplified - reset to 0)
    updatedLoser.currentStreak = 0;
    updatedLoser.streakType = "W";

    // Update loser seasonal form
    const loserRecentResults = updatedLoser.last5;
    const loserRecentWins = loserRecentResults.filter((r) => r === "W").length;
    updatedLoser.seasonalForm = loserRecentWins / loserRecentResults.length;

    // Reverse head-to-head record
    try {
      await supabase.rpc("reverse_head_to_head_record", {
        p_player_a_id: winnerId,
        p_player_b_id: loserId,
        p_previous_winner_id: winnerId,
      });
    } catch (h2hError) {
      console.error("Error reversing head-to-head record:", h2hError);
      // Don't fail the entire update if head-to-head update fails
    }

    // Update both players in database
    await Promise.all([
      updatePlayer(winnerId, updatedWinner),
      updatePlayer(loserId, updatedLoser),
    ]);

    console.log(
      `Reversed player stats for match ${matchId}: Previous Winner ${winner.firstName} ${winner.lastName}, Previous Loser ${loser.firstName} ${loser.lastName}${tournamentSurface ? ` on ${tournamentSurface}` : ""}`,
    );
  } catch (error) {
    console.error("Error reversing player stats from match result:", error);
    throw error;
  }
}

/**
 * Get head-to-head record between two players
 */
export async function getHeadToHeadRecord(
  player1Id: string,
  player2Id: string,
) {
  try {
    const { data, error } = await supabase.rpc("get_head_to_head_record", {
      p_player_1_id: player1Id,
      p_player_2_id: player2Id,
    });

    if (error) {
      console.error("Error fetching head-to-head record:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const record = data[0];

    const player1IsRecordA = record.player_a_id === player1Id;
    const player1Wins = player1IsRecordA
      ? record.player_a_wins
      : record.player_b_wins;
    const player1Losses = player1IsRecordA
      ? record.player_b_wins
      : record.player_a_wins;

    let lastMatchResult: "W" | "L" | undefined;
    if (record.last_match_result === "A" || record.last_match_result === "B") {
      const playerAWonLast = record.last_match_result === "A";
      const player1WonLast = player1IsRecordA
        ? playerAWonLast
        : !playerAWonLast;
      lastMatchResult = player1WonLast ? "W" : "L";
    }

    // Convert to the format expected by the odds calculation algorithm
    return {
      wins: player1Wins,
      losses: player1Losses,
      lastMatchResult,
      lastMatchDate: record.last_match_date || undefined,
    };
  } catch (error) {
    console.error("Error fetching head-to-head record:", error);
    return null;
  }
}

/**
 * Get last 5 matches for a specific player with match details
 */
export async function getPlayerMatchHistory(playerId: string) {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        id,
        start_time,
        status,
        round,
        player_a_id,
        player_b_id,
        winner_id,
        player_a:players!matches_player_a_id_fkey(
          id,
          first_name,
          last_name
        ),
        player_b:players!matches_player_b_id_fkey(
          id,
          first_name,
          last_name
        ),
        match_results(
          match_result,
          set1_score,
          set2_score,
          set3_score
        ),
        tournaments(
          name
        ),
        tournament_categories!matches_category_id_fkey(
          name
        )
      `,
      )
      .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
      .eq("status", "finished")
      .order("start_time", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching player match history:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching player match history:", error);
    return [];
  }
}
