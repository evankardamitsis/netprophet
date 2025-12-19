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
 * Prioritizes last name matching - searches by last name first, then filters/ranks by first name
 */
export async function findMatchingPlayers(
  firstName: string,
  lastName: string
): Promise<PlayerLookupResult> {
  // Primary search: Use last name as the primary search criterion
  // The database function should prioritize surname matching
  const { data: matches, error: searchError } = await supabase.rpc(
    "find_matching_players",
    {
      search_name: firstName,
      search_surname: lastName, // Last name is the primary search field
    }
  );

  if (searchError) {
    // Log full Supabase error details for debugging in case of failures
    console.error("❌ find_matching_players RPC failed:", {
      message: searchError.message,
      details: (searchError as any).details,
      hint: (searchError as any).hint,
      code: (searchError as any).code,
    });
    throw new Error("Failed to search for matching players");
  }

  // If no matches found with last name, return empty
  // The database function should handle surname-first matching internally
  const uniqueMatches = matches || [];

  return {
    matches: uniqueMatches,
    searchedNormalOrder: true,
    searchedReversedOrder: false,
    normalOrderMatches: uniqueMatches.length,
    reversedOrderMatches: 0,
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
      // Try given_name and family_name first (Google OAuth)
      const givenName = user?.user_metadata?.given_name || null;
      const familyName = user?.user_metadata?.family_name || null;

      if (givenName && familyName) {
        firstName = givenName;
        lastName = familyName;
      } else {
        const fullName =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          user?.user_metadata?.display_name ||
          null;

        if (fullName) {
          const nameParts = fullName.trim().split(" ");
          if (nameParts.length >= 2) {
            firstName = nameParts[0];
            lastName = nameParts[nameParts.length - 1];
          }
        }
      }
    } else {
      firstName = metadataFirstName;
      lastName = metadataLastName;
    }

    // Last resort: try to extract from email address
    if ((!firstName || !lastName) && user?.email) {
      try {
        // Extract local part of email (before @)
        const emailLocalPart = user.email.split("@")[0];
        // Remove dots, underscores, and hyphens, then split by spaces
        const cleanedEmail = emailLocalPart.replace(/[._-]/g, " ");
        const emailParts = cleanedEmail
          .trim()
          .split(/\s+/)
          .filter((part) => part.length > 0);

        if (emailParts.length >= 2) {
          // Capitalize first letter of each part
          const capitalize = (str: string) =>
            str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
          firstName = firstName || capitalize(emailParts[0]);
          lastName = lastName || capitalize(emailParts[emailParts.length - 1]);
        } else if (emailParts.length === 1 && !firstName) {
          firstName =
            emailParts[0].charAt(0).toUpperCase() +
            emailParts[0].slice(1).toLowerCase();
        }
      } catch (e) {
        // Silently fail if email parsing fails
        console.warn("Failed to extract name from email:", e);
      }
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
