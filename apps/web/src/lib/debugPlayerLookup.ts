/**
 * Debug utility for player lookup testing
 * This helps debug why specific name combinations don't match
 */

import { supabase } from "@netprophet/lib";

export async function debugPlayerLookup(firstName: string, lastName: string) {
  console.log("🔍 Debug Player Lookup");
  console.log("Input:", { firstName, lastName });

  // Test 1: Direct database query to see what's in the players table
  console.log("\n📊 Step 1: Checking players table...");
  const { data: allPlayers, error: playersError } = await supabase
    .from("players")
    .select(
      "id, first_name, last_name, is_hidden, claimed_by_user_id, is_demo_player"
    )
    .or(
      "first_name.ilike.%ευαγγελος%,last_name.ilike.%ευαγγελος%,first_name.ilike.%ΕΥΑΓΓΕΛΟΣ%,last_name.ilike.%ΕΥΑΓΓΕΛΟΣ%,first_name.ilike.%καρδαμίτσης%,last_name.ilike.%καρδαμίτσης%,first_name.ilike.%ΚΑΡΔΑΜΙΤΣΗΣ%,last_name.ilike.%ΚΑΡΔΑΜΙΤΣΗΣ%"
    );

  if (playersError) {
    console.error("❌ Error fetching players:", playersError);
  } else {
    console.log("Found players:", allPlayers?.length || 0);
    allPlayers?.forEach((player) => {
      console.log(
        `  - ${player.first_name} ${player.last_name} (hidden: ${player.is_hidden}, claimed: ${player.claimed_by_user_id}, demo: ${player.is_demo_player})`
      );
    });
  }

  // Also check for any players with similar names
  console.log("\n📊 Step 1b: Checking for any players with similar names...");
  const { data: similarPlayers, error: similarError } = await supabase
    .from("players")
    .select(
      "id, first_name, last_name, is_hidden, claimed_by_user_id, is_demo_player"
    )
    .or(
      "first_name.ilike.%καρδαμίτσης%,last_name.ilike.%καρδαμίτσης%,first_name.ilike.%ΚΑΡΔΑΜΙΤΣΗΣ%,last_name.ilike.%ΚΑΡΔΑΜΙΤΣΗΣ%"
    )
    .limit(10);

  if (similarError) {
    console.error("❌ Error fetching similar players:", similarError);
  } else {
    console.log("Found similar players:", similarPlayers?.length || 0);
    similarPlayers?.forEach((player) => {
      console.log(
        `  - ${player.first_name} ${player.last_name} (hidden: ${player.is_hidden}, claimed: ${player.claimed_by_user_id}, demo: ${player.is_demo_player})`
      );
    });
  }

  // Test 2: Test the transliteration function
  console.log("\n🔄 Step 2: Testing transliteration...");
  const { data: transliterationTest, error: transliterationError } =
    await supabase.rpc("transliterate_greeklish_to_greek", {
      greeklish_text: firstName,
    });

  if (transliterationError) {
    console.error("❌ Transliteration error:", transliterationError);
  } else {
    console.log(`Transliteration: "${firstName}" -> "${transliterationTest}"`);
  }

  const { data: transliterationTest2, error: transliterationError2 } =
    await supabase.rpc("transliterate_greeklish_to_greek", {
      greeklish_text: lastName,
    });

  if (transliterationError2) {
    console.error("❌ Transliteration error:", transliterationError2);
  } else {
    console.log(`Transliteration: "${lastName}" -> "${transliterationTest2}"`);
  }

  // Test 3: Test the find_matching_players function directly
  console.log("\n🎯 Step 3: Testing find_matching_players function...");
  const { data: matches, error: matchError } = await supabase.rpc(
    "find_matching_players",
    {
      search_name: firstName,
      search_surname: lastName,
    }
  );

  if (matchError) {
    console.error("❌ Match error:", matchError);
  } else {
    console.log("Matches found:", matches?.length || 0);
    matches?.forEach((match: any) => {
      console.log(
        `  - ${match.first_name} ${match.last_name} (score: ${match.match_score})`
      );
    });
  }

  // Test 4: Test with reversed order
  console.log("\n🔄 Step 4: Testing reversed order...");
  const { data: reversedMatches, error: reversedError } = await supabase.rpc(
    "find_matching_players",
    {
      search_name: lastName,
      search_surname: firstName,
    }
  );

  if (reversedError) {
    console.error("❌ Reversed match error:", reversedError);
  } else {
    console.log("Reversed matches found:", reversedMatches?.length || 0);
    reversedMatches?.forEach((match: any) => {
      console.log(
        `  - ${match.first_name} ${match.last_name} (score: ${match.match_score})`
      );
    });
  }

  // Test 5: Test fuzzy matching
  console.log("\n🔍 Step 5: Testing fuzzy matching...");
  const { data: fuzzyMatches, error: fuzzyError } = await supabase.rpc(
    "find_similar_players",
    {
      search_name: firstName,
      search_surname: lastName,
      similarity_threshold: 0.6,
    }
  );

  if (fuzzyError) {
    console.error("❌ Fuzzy match error:", fuzzyError);
  } else {
    console.log("Fuzzy matches found:", fuzzyMatches?.length || 0);
    fuzzyMatches?.forEach((match: any) => {
      console.log(
        `  - ${match.first_name} ${match.last_name} (similarity: ${match.similarity_score}, score: ${match.match_score})`
      );
    });
  }

  return {
    allPlayers,
    transliteration: {
      firstName: transliterationTest,
      lastName: transliterationTest2,
    },
    normalMatches: matches,
    reversedMatches: reversedMatches,
    fuzzyMatches: fuzzyMatches,
  };
}
