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
  console.log("🔍 Player Lookup - Starting search...");
  console.log(
    "   Input: firstName='" + firstName + "', lastName='" + lastName + "'"
  );

  // Try normal order first
  console.log(
    "🔍 Trying normal order: first=" + firstName + ", last=" + lastName
  );
  const { data: matches1, error: searchError1 } = await supabase.rpc(
    "find_matching_players",
    {
      search_name: firstName,
      search_surname: lastName,
    }
  );

  if (searchError1) {
    console.error("❌ Error searching (normal order):", searchError1);
  } else {
    console.log(
      "   ✅ Normal order results:",
      matches1?.length || 0,
      "matches"
    );
  }

  // Try reversed order as fallback
  console.log(
    "🔍 Trying reversed order: first=" + lastName + ", last=" + firstName
  );
  const { data: matches2, error: searchError2 } = await supabase.rpc(
    "find_matching_players",
    {
      search_name: lastName,
      search_surname: firstName,
    }
  );

  if (searchError2) {
    console.error("❌ Error searching (reversed order):", searchError2);
  } else {
    console.log(
      "   ✅ Reversed order results:",
      matches2?.length || 0,
      "matches"
    );
  }

  // If both searches failed, throw error
  if (searchError1 && searchError2) {
    console.error("❌ Both searches failed");
    throw new Error("Failed to search for matching players");
  }

  // Combine results from both searches, removing duplicates
  const allMatches = [...(matches1 || []), ...(matches2 || [])];
  const uniqueMatches = allMatches.filter(
    (match, index, self) => index === self.findIndex((m) => m.id === match.id)
  );

  console.log("✅ Player Lookup - Search completed");
  console.log("   Total unique matches:", uniqueMatches.length);
  if (uniqueMatches.length > 0) {
    console.log(
      "   Matches:",
      uniqueMatches.map((m) => `${m.first_name} ${m.last_name}`).join(", ")
    );
  }

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
 */
export async function getUserName(
  userId: string
): Promise<{ firstName: string | null; lastName: string | null }> {
  console.log("🔍 Debug - getUserName called with userId:", userId);

  // Get profile data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .single();

  console.log("🔍 Debug - Profile query result:", { profile, profileError });

  // Get user metadata for name fallback
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("🔍 Debug - User metadata:", user?.user_metadata);

  // Determine name source: profile table or user_metadata
  let firstName = profile?.first_name || null;
  let lastName = profile?.last_name || null;

  // Fallback to user_metadata if profile doesn't have names
  if (!firstName || !lastName) {
    firstName = user?.user_metadata?.firstName || null;
    lastName = user?.user_metadata?.lastName || null;
    console.log("📋 Using names from user_metadata:", firstName, lastName);
  } else {
    console.log("📋 Using names from profile table:", firstName, lastName);
  }

  console.log("🔍 Debug - Final result:", { firstName, lastName });
  return { firstName, lastName };
}
