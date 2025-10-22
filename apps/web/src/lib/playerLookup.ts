import { supabase } from "@netprophet/lib";

interface PlayerMatch {
  id: string;
  first_name: string;
  last_name: string;
  is_hidden: boolean;
  is_active: boolean;
  claimed_by_user_id: string | null;
  is_demo_player: boolean;
  match_score?: number;
}

interface PlayerLookupResult {
  matches: PlayerMatch[];
  searchedNormalOrder: boolean;
  searchedReversedOrder: boolean;
  normalOrderMatches: number;
  reversedOrderMatches: number;
}

/**
 * Search for matching players in the database
 * Tries both normal order (firstName, lastName) and reversed order (lastName, firstName)
 * to handle cases where names might be entered in different orders
 */
export async function findMatchingPlayers(
  firstName: string,
  lastName: string
): Promise<PlayerLookupResult> {
  // Try normal order first
  const { data: matches1, error: searchError1 } = await supabase.rpc(
    "find_matching_players",
    {
      search_name: firstName,
      search_surname: lastName,
    }
  );

  // Try reversed order as fallback
  const { data: matches2, error: searchError2 } = await supabase.rpc(
    "find_matching_players",
    {
      search_name: lastName,
      search_surname: firstName,
    }
  );

  // If both searches failed, throw error
  if (searchError1 && searchError2) {
    throw new Error("Failed to search for matching players");
  }

  // Combine results from both searches, removing duplicates
  const allMatches = [...(matches1 || []), ...(matches2 || [])];
  const uniqueMatches = allMatches.filter(
    (match, index, self) => index === self.findIndex((m) => m.id === match.id)
  );

  return {
    matches: uniqueMatches,
    searchedNormalOrder: !searchError1,
    searchedReversedOrder: !searchError2,
    normalOrderMatches: matches1?.length || 0,
    reversedOrderMatches: matches2?.length || 0,
  };
}

/**
 * Get user's name from profile or user_metadata
 * Automatically syncs names from user_metadata to profile table for Gmail/OAuth users
 */
export async function getUserName(
  userId: string
): Promise<{ firstName: string | null; lastName: string | null }> {
  // Get profile data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .single();

  // Get user metadata for name fallback
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Determine name source: profile table or user_metadata
  let firstName = profile?.first_name || null;
  let lastName = profile?.last_name || null;
  let needsSync = false;

  // Fallback to user_metadata if profile doesn't have names
  if (!firstName || !lastName) {
    // Check both camelCase and snake_case versions in user_metadata
    const metadataFirstName =
      user?.user_metadata?.firstName || user?.user_metadata?.first_name || null;
    const metadataLastName =
      user?.user_metadata?.lastName || user?.user_metadata?.last_name || null;

    // If still no names, try OAuth fields (Google, GitHub, etc.)
    if (!metadataFirstName || !metadataLastName) {
      const fullName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.user_metadata?.display_name ||
        user?.user_metadata?.given_name ||
        user?.user_metadata?.family_name ||
        null;

      if (fullName) {
        const nameParts = fullName.trim().split(" ");
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts[nameParts.length - 1];
        }
      }
    } else {
      firstName = metadataFirstName;
      lastName = metadataLastName;
    }

    // If we found names in metadata but not in profile, sync them
    if (
      firstName &&
      lastName &&
      (!profile?.first_name || !profile?.last_name)
    ) {
      needsSync = true;
    }
  }

  // Auto-sync names from user_metadata to profile table for Gmail/OAuth users
  if (needsSync && firstName && lastName) {
    try {
      const { error: syncError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (syncError) {
        console.error("Error syncing names to profile:", syncError);
      }
    } catch (error) {
      console.error("Error during name sync:", error);
    }
  }

  return { firstName, lastName };
}
