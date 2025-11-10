import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Complete odds calculation algorithm
interface PlayerOddsData {
  id: string;
  firstName: string;
  lastName: string;
  ntrpRating: number;
  wins: number;
  losses: number;
  last5: ("W" | "L")[];
  currentStreak: number;
  streakType: "W" | "L";
  surfacePreference: string;
  surfaceWinRates?: {
    hardCourt?: number;
    clayCourt?: number;
    grassCourt?: number;
  };
  aggressiveness: number;
  stamina: number;
  consistency: number;
  age: number;
  hand: "left" | "right";
  club: string;
  notes?: string;
  lastMatchDate?: string;
  injuryStatus?: "healthy" | "minor" | "major";
  seasonalForm?: number;
  headToHeadRecord?: {
    opponentId: string;
    wins: number;
    losses: number;
    lastMatchResult?: "W" | "L";
    lastMatchDate?: string;
  };
}

interface MatchContext {
  surface: "Hard Court" | "Clay Court" | "Grass Court";
}

interface OddsResult {
  player1WinProbability: number;
  player2WinProbability: number;
  player1Odds: number;
  player2Odds: number;
  confidence: number;
  factors: {
    ntrpAdvantage: number;
    formAdvantage: number;
    surfaceAdvantage: number;
    experienceAdvantage: number;
    momentumAdvantage: number;
    headToHeadAdvantage: number;
  };
  recommendations: string[];
}

interface H2HRecordInput {
  wins: number;
  losses: number;
  lastMatchResult?: "W" | "L";
  lastMatchDate?: string;
}

function calculateOdds(
  player1: PlayerOddsData,
  player2: PlayerOddsData,
  context: MatchContext,
  h2hRecord?: H2HRecordInput
): OddsResult {
  const factors = calculateFactors(player1, player2, context, h2hRecord);

  // Calculate base probability from factors with NTRP-heavy weighting
  let player1Score = 0.5; // Start at 50%

  // Apply factor adjustments with dynamic NTRP weighting based on difference size
  const ntrpDiff = Math.abs(player1.ntrpRating - player2.ntrpRating);

  // Dynamic NTRP weighting: higher weight for larger differences and higher levels
  const baseRating = Math.min(player1.ntrpRating, player2.ntrpRating);
  let ntrpWeight = 0.25; // Base weight

  if (ntrpDiff >= 1.5) {
    // Level-aware weight for 1.5+ differences
    if (baseRating >= 4.0) {
      ntrpWeight = 0.6; // 60% weight at high levels (4.0+)
    } else {
      ntrpWeight = 0.55; // 55% weight at lower levels
    }
  } else if (ntrpDiff >= 1.0) {
    // Level-aware weight for 1.0+ differences
    if (baseRating >= 4.0) {
      ntrpWeight = 0.55; // 55% weight at high levels (4.0+)
    } else if (baseRating >= 3.5) {
      ntrpWeight = 0.5; // 50% weight at mid-high levels (3.5-4.0)
    } else {
      ntrpWeight = 0.45; // 45% weight at lower levels (<3.5)
    }
  } else if (ntrpDiff >= 0.5) {
    ntrpWeight = 0.35; // 35% weight for 0.5+ differences
  }

  const remainingWeight = 1.0 - ntrpWeight;
  const totalH2hMatches = (h2hRecord?.wins ?? 0) + (h2hRecord?.losses ?? 0);

  let headToHeadWeight = 0;
  if (totalH2hMatches > 0) {
    const baseH2HWeight = 0.08;
    const matchBonus = Math.min(0.12, totalH2hMatches * 0.02);
    const maxH2HWeight = Math.min(0.2, baseH2HWeight + matchBonus);
    headToHeadWeight = Math.min(remainingWeight * 0.4, maxH2HWeight);
  }

  const otherFactors = 4; // form, surface, experience, momentum
  const otherWeightPool = Math.max(remainingWeight - headToHeadWeight, 0);
  const otherFactorsWeight =
    otherFactors > 0 ? otherWeightPool / otherFactors : 0;

  player1Score += factors.ntrpAdvantage * ntrpWeight;
  player1Score += factors.formAdvantage * otherFactorsWeight;
  player1Score += factors.surfaceAdvantage * otherFactorsWeight;
  player1Score += factors.experienceAdvantage * otherFactorsWeight;
  player1Score += factors.momentumAdvantage * otherFactorsWeight;
  player1Score += factors.headToHeadAdvantage * headToHeadWeight;

  if (h2hRecord && totalH2hMatches >= 2) {
    const h2hWinRate = totalH2hMatches
      ? (h2hRecord.wins ?? 0) / totalH2hMatches
      : 0.5;
    const ratingDiffAdjustment = ntrpDiff <= 0.5 ? 1 - ntrpDiff * 0.8 : 0.6;
    const blendStrength = Math.max(
      0,
      Math.min(0.85, (0.25 + totalH2hMatches * 0.08) * ratingDiffAdjustment)
    );
    player1Score =
      player1Score * (1 - blendStrength) + h2hWinRate * blendStrength;
  }

  // Add uncertainty factor to prevent extreme results
  const uncertaintyFactor = 0.05; // 5% uncertainty
  const randomFactor = (Math.random() - 0.5) * uncertaintyFactor;
  player1Score += randomFactor;

  if (h2hRecord && totalH2hMatches >= 2) {
    const player1Wins = h2hRecord.wins ?? 0;
    const player2Wins = h2hRecord.losses ?? 0;
    if (player1Wins !== player2Wins) {
      const h2hTilt = Math.min(
        0.2,
        Math.abs(player1Wins - player2Wins) * 0.025 + totalH2hMatches * 0.01
      );
      if (player1Wins > player2Wins && player1Score < 0.5 + h2hTilt) {
        player1Score = 0.5 + h2hTilt;
      } else if (player2Wins > player1Wins && player1Score > 0.5 - h2hTilt) {
        player1Score = 0.5 - h2hTilt;
      }
    }
  }

  // Dynamic bounds based on NTRP difference - allow more extreme results for significant rating gaps
  let minBound = 0.2; // 20%
  let maxBound = 0.8; // 80%

  if (ntrpDiff < 0.2) {
    minBound = 0.35;
    maxBound = 0.65;
  } else if (ntrpDiff < 0.35) {
    minBound = 0.3;
    maxBound = 0.7;
  } else if (ntrpDiff >= 1.5) {
    // For very large differences (1.5+), allow extreme results
    minBound = 0.05; // 5%
    maxBound = 0.95; // 95%
  } else if (ntrpDiff >= 1.0) {
    // For large differences (1.0+), allow more extreme results
    minBound = 0.1; // 10%
    maxBound = 0.9; // 90%
  } else if (ntrpDiff >= 0.5) {
    // For moderate differences (0.5+), allow some extremes
    minBound = 0.15; // 15%
    maxBound = 0.85; // 85%
  }

  player1Score = Math.max(minBound, Math.min(maxBound, player1Score));

  const player2Score = 1 - player1Score;

  // Calculate decimal odds with slight margin for bookmaker profit
  const margin = 0.05; // 5% margin
  const player1Odds = (1 / player1Score) * (1 + margin);
  const player2Odds = (1 / player2Score) * (1 + margin);

  // Calculate confidence based on data quality and factor agreement
  const confidence = calculateConfidence(player1, player2, factors);

  // Generate recommendations
  const recommendations = generateRecommendations(
    player1,
    player2,
    factors,
    context
  );

  return {
    player1WinProbability: player1Score,
    player2WinProbability: player2Score,
    player1Odds: Math.round(player1Odds * 100) / 100,
    player2Odds: Math.round(player2Odds * 100) / 100,
    confidence,
    factors,
    recommendations,
  };
}

function calculateFactors(
  player1: PlayerOddsData,
  player2: PlayerOddsData,
  context: MatchContext,
  h2hRecord?: H2HRecordInput
) {
  return {
    ntrpAdvantage: calculateNTRPAdvantage(player1, player2),
    formAdvantage: calculateFormAdvantage(player1, player2),
    surfaceAdvantage: calculateSurfaceAdvantage(
      player1,
      player2,
      context.surface
    ),
    experienceAdvantage: calculateExperienceAdvantage(player1, player2),
    momentumAdvantage: calculateMomentumAdvantage(player1, player2),
    headToHeadAdvantage: calculateHeadToHeadAdvantage(
      player1,
      player2,
      h2hRecord
    ),
  };
}

function calculateNTRPAdvantage(
  player1: PlayerOddsData,
  player2: PlayerOddsData
): number {
  const ntrpDiff = player1.ntrpRating - player2.ntrpRating;
  const baseRating = Math.min(player1.ntrpRating, player2.ntrpRating);

  // Special case: when players have the same NTRP rating, make odds very close
  if (Math.abs(ntrpDiff) < 0.01) {
    // For identical ratings, apply minimal advantage based on other factors
    // This ensures odds stay very close (around 1.9-2.1 range)
    return Math.tanh(ntrpDiff * 0.1); // Very small impact
  }

  // Enhanced scaling for significant NTRP differences
  // For differences >= 1.0, apply level-aware stronger weighting
  if (Math.abs(ntrpDiff) >= 1.0) {
    // Level-aware multiplier: higher NTRP levels = bigger impact of differences
    let levelMultiplier;
    if (baseRating >= 4.5) {
      levelMultiplier = 3.5; // Very strong impact at high levels (4.5+)
    } else if (baseRating >= 4.0) {
      levelMultiplier = 3.0; // Strong impact at mid-high levels (4.0-4.5)
    } else if (baseRating >= 3.5) {
      levelMultiplier = 2.5; // Moderate impact at mid levels (3.5-4.0)
    } else {
      levelMultiplier = 2.0; // Lower impact at beginner levels (<3.5)
    }

    const significantDiffMultiplier =
      ntrpDiff >= 0 ? levelMultiplier : -levelMultiplier;
    return Math.max(-0.8, Math.min(0.8, ntrpDiff * significantDiffMultiplier));
  }

  // For smaller differences (< 0.5), use the existing level-aware scaling
  let levelMultiplier;
  if (baseRating >= 4.5) {
    levelMultiplier = 1.2; // Increased from 1.0
  } else if (baseRating >= 4.0) {
    levelMultiplier = 1.0; // Increased from 0.8
  } else if (baseRating >= 3.5) {
    levelMultiplier = 0.8; // Increased from 0.6
  } else {
    levelMultiplier = 0.6; // Increased from 0.4
  }

  // Apply enhanced sigmoid-like function for smaller differences
  const scaledDiff = ntrpDiff * levelMultiplier;
  return Math.tanh(scaledDiff * 1.0); // Increased from 0.8
}

function calculateFormAdvantage(
  player1: PlayerOddsData,
  player2: PlayerOddsData
): number {
  const p1Wins = player1.wins;
  const p1Losses = player1.losses;
  const p2Wins = player2.wins;
  const p2Losses = player2.losses;

  const p1Matches = p1Wins + p1Losses;
  const p2Matches = p2Wins + p2Losses;

  // Use Bayesian average for players with few matches
  const p1WinRate =
    p1Matches >= 10 ? p1Wins / p1Matches : (p1Wins + 5) / (p1Matches + 10);
  const p2WinRate =
    p2Matches >= 10 ? p2Wins / p2Matches : (p2Wins + 5) / (p2Matches + 10);

  // Calculate recent form with adaptive weighting
  const recentWeights = [0.4, 0.25, 0.2, 0.1, 0.05];
  const p1Last5 = player1.last5;
  const p2Last5 = player2.last5;

  const p1RecentForm = p1Last5.reduce(
    (sum, result, index) =>
      sum + (result === "W" ? recentWeights[index] || 0 : 0),
    0
  );
  const p2RecentForm = p2Last5.reduce(
    (sum, result, index) =>
      sum + (result === "W" ? recentWeights[index] || 0 : 0),
    0
  );

  // Adaptive weighting based on match count
  const recentWeight = Math.min(
    0.8,
    Math.max(0.5, (p1Matches + p2Matches) / 40)
  );
  const overallWeight = 1 - recentWeight;

  const p1Form = p1RecentForm * recentWeight + p1WinRate * overallWeight;
  const p2Form = p2RecentForm * recentWeight + p2WinRate * overallWeight;

  return Math.tanh((p1Form - p2Form) * 1.5);
}

function calculateSurfaceAdvantage(
  player1: PlayerOddsData,
  player2: PlayerOddsData,
  surface: string
): number {
  const getSurfaceWinRate = (
    player: PlayerOddsData,
    surface: string
  ): number => {
    if (!player.surfaceWinRates) {
      const preference = player.surfacePreference === surface ? 0.65 : 0.35;
      return preference;
    }

    switch (surface) {
      case "Hard Court":
        return player.surfaceWinRates.hardCourt || 0.5;
      case "Clay Court":
        return player.surfaceWinRates.clayCourt || 0.5;
      case "Grass Court":
        return player.surfaceWinRates.grassCourt || 0.5;
      default:
        return 0.5;
    }
  };

  const p1SurfaceWinRate = getSurfaceWinRate(player1, surface);
  const p2SurfaceWinRate = getSurfaceWinRate(player2, surface);

  const surfaceDiff = p1SurfaceWinRate - p2SurfaceWinRate;
  const surfaceAdvantage = surfaceDiff * 0.3;

  return Math.tanh(surfaceAdvantage);
}

function calculateHeadToHeadAdvantage(
  player1: PlayerOddsData,
  player2: PlayerOddsData,
  h2hRecord?: H2HRecordInput
): number {
  if (!h2hRecord) {
    return 0;
  }
  const totalMatches = h2hRecord.wins + h2hRecord.losses;
  if (totalMatches === 0) {
    return 0;
  }
  const p1H2HWinRate = h2hRecord.wins / totalMatches;
  let recentBonus = 0;
  if (h2hRecord.lastMatchResult && h2hRecord.lastMatchDate) {
    const lastMatchDate = new Date(h2hRecord.lastMatchDate);
    const daysSince =
      (Date.now() - lastMatchDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 180) {
      recentBonus = h2hRecord.lastMatchResult === "W" ? 0.05 : -0.05; // Reduced from 0.08 to 0.05
    }
  }
  const matchVolumeBoost = Math.min(0.4, totalMatches * 0.05);
  const rawAdvantage =
    (p1H2HWinRate - 0.5) * (0.8 + matchVolumeBoost) + recentBonus;
  return Math.tanh(rawAdvantage * 1.1);
}

function calculateExperienceAdvantage(
  player1: PlayerOddsData,
  player2: PlayerOddsData
): number {
  const p1Age = player1.age;
  const p1Wins = player1.wins;
  const p1Losses = player1.losses;
  const p2Age = player2.age;
  const p2Wins = player2.wins;
  const p2Losses = player2.losses;

  const p1Experience = p1Age * 0.3 + (p1Wins + p1Losses) * 0.7;
  const p2Experience = p2Age * 0.3 + (p2Wins + p2Losses) * 0.7;

  const experienceDiff = p1Experience - p2Experience;
  return Math.tanh(experienceDiff * 0.005);
}

function calculateMomentumAdvantage(
  player1: PlayerOddsData,
  player2: PlayerOddsData
): number {
  const p1StreakType = player1.streakType;
  const p1CurrentStreak = player1.currentStreak;
  const p2StreakType = player2.streakType;
  const p2CurrentStreak = player2.currentStreak;

  const p1Momentum =
    p1StreakType === "W"
      ? Math.sqrt(p1CurrentStreak)
      : -Math.sqrt(p1CurrentStreak);
  const p2Momentum =
    p2StreakType === "W"
      ? Math.sqrt(p2CurrentStreak)
      : -Math.sqrt(p2CurrentStreak);

  const momentumDiff = p1Momentum - p2Momentum;
  return Math.tanh(momentumDiff * 0.15);
}

function calculateConfidence(
  player1: PlayerOddsData,
  player2: PlayerOddsData,
  factors: any
): number {
  let confidence = 0.6;

  const p1Matches = player1.wins + player1.losses;
  const p2Matches = player2.wins + player2.losses;

  if (p1Matches >= 15 && p2Matches >= 15) confidence += 0.15;
  if (p1Matches >= 30 && p2Matches >= 30) confidence += 0.1;

  if (player1.surfaceWinRates && player2.surfaceWinRates) confidence += 0.05;

  if (player1.headToHeadRecord && player2.headToHeadRecord) confidence += 0.1;

  const factorVariance =
    Math.abs(factors.ntrpAdvantage) +
    Math.abs(factors.formAdvantage) +
    Math.abs(factors.surfaceAdvantage) +
    Math.abs(factors.headToHeadAdvantage);

  if (factorVariance > 0.6) confidence += 0.1;
  if (factorVariance > 1.0) confidence += 0.05;

  return Math.max(0.3, Math.min(0.95, confidence));
}

function generateRecommendations(
  player1: PlayerOddsData,
  player2: PlayerOddsData,
  factors: any,
  context: MatchContext
): string[] {
  const recommendations: string[] = [];

  if (Math.abs(factors.headToHeadAdvantage) > 0.1) {
    const advantaged = factors.headToHeadAdvantage > 0 ? player1 : player2;
    const opponent = factors.headToHeadAdvantage > 0 ? player2 : player1;
    const h2h = advantaged.headToHeadRecord;
    if (h2h && h2h.opponentId === opponent.id) {
      const totalMatches = h2h.wins + h2h.losses;
      const winRate = ((h2h.wins / totalMatches) * 100).toFixed(0);
      recommendations.push(
        `${advantaged.firstName} leads H2H vs ${opponent.firstName} ${h2h.wins}-${h2h.losses} (${winRate}% win rate)`
      );
    }
  }

  if (Math.abs(factors.ntrpAdvantage) > 0.1) {
    // Reduced threshold since NTRP is now more significant
    const stronger = factors.ntrpAdvantage > 0 ? player1 : player2;
    const strongerRating = stronger.ntrpRating;
    const weaker = factors.ntrpAdvantage > 0 ? player2 : player1;
    const weakerRating = weaker.ntrpRating;
    recommendations.push(
      `${stronger.firstName} has significant NTRP advantage (${strongerRating} vs ${weakerRating})`
    );
  }

  if (Math.abs(factors.surfaceAdvantage) > 0.1) {
    const advantaged = factors.surfaceAdvantage > 0 ? player1 : player2;
    if (advantaged.surfaceWinRates) {
      const surfaceKey = context.surface
        .toLowerCase()
        .replace(" ", "") as keyof typeof advantaged.surfaceWinRates;
      const winRate = advantaged.surfaceWinRates[surfaceKey];
      if (winRate) {
        recommendations.push(
          `${advantaged.firstName} excels on ${context.surface} (${(winRate * 100).toFixed(0)}% win rate)`
        );
      }
    }
  }

  if (Math.abs(factors.formAdvantage) > 0.1) {
    const inForm = factors.formAdvantage > 0 ? player1 : player2;
    const inFormLast5 = inForm.last5;
    const recentWins = inFormLast5.filter((r) => r === "W").length;
    recommendations.push(
      `${inForm.firstName} in good form (${recentWins}/5 recent wins)`
    );
  }

  return recommendations.slice(0, 3);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the user's session
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { matchIds } = await req.json();

    if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "matchIds array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (matchIds.length > 10) {
      return new Response(
        JSON.stringify({ error: "Maximum 10 matches allowed per request" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // OPTIMIZATION: Replace N+1 pattern with single batch query
    const { data: matches, error: matchesError } = await supabaseClient
      .from("matches")
      .select(
        `
        id,
        tournaments!inner (
          surface
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
          streak_type,
          age,
          hand,
          notes
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
          streak_type,
          age,
          hand,
          notes
        )
      `
      )
      .in("id", matchIds);

    if (matchesError) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch matches",
          details: matchesError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const results: any[] = [];

    // Process all matches in batch
    for (const match of matches || []) {
      try {
        if (!match) {
          results.push({ matchId: match.id, error: "Match not found" });
          continue;
        }

        if (!match.player_a || !match.player_b || !match.tournaments) {
          results.push({ matchId: match.id, error: "Incomplete match data" });
          continue;
        }

        // Convert to PlayerOddsData format
        const playerA: PlayerOddsData = {
          id: match.player_a.id,
          firstName: match.player_a.first_name,
          lastName: match.player_a.last_name,
          ntrpRating: match.player_a.ntrp_rating || 3.0,
          wins: match.player_a.wins || 0,
          losses: match.player_a.losses || 0,
          last5: match.player_a.last5 || ["W", "W", "L", "W", "L"],
          currentStreak: match.player_a.current_streak || 0,
          streakType: match.player_a.streak_type || "W",
          surfacePreference: match.player_a.surface_preference || "Hard Court",
          aggressiveness: 5,
          stamina: 5,
          consistency: 5,
          age: match.player_a.age || 25,
          hand: match.player_a.hand || "right",
          club: "Default Club",
          notes: match.player_a.notes || "",
        };

        const playerB: PlayerOddsData = {
          id: match.player_b.id,
          firstName: match.player_b.first_name,
          lastName: match.player_b.last_name,
          ntrpRating: match.player_b.ntrp_rating || 3.0,
          wins: match.player_b.wins || 0,
          losses: match.player_b.losses || 0,
          last5: match.player_b.last5 || ["L", "W", "W", "L", "W"],
          currentStreak: match.player_b.current_streak || 0,
          streakType: match.player_b.streak_type || "W",
          surfacePreference: match.player_b.surface_preference || "Hard Court",
          aggressiveness: 5,
          stamina: 5,
          consistency: 5,
          age: match.player_b.age || 25,
          hand: match.player_b.hand || "right",
          club: "Default Club",
          notes: match.player_b.notes || "",
        };

        const context: MatchContext = {
          surface: match.tournaments.surface as
            | "Hard Court"
            | "Clay Court"
            | "Grass Court",
        };

        // Fetch head-to-head record
        let h2hRecord: H2HRecordInput | undefined;
        let rawH2hRecord: {
          player_a_id: string;
          player_b_id: string;
          player_a_wins: number;
          player_b_wins: number;
          last_match_result: string | null;
          last_match_date: string | null;
        } | null = null;
        try {
          const { data: h2hData, error: h2hError } = await supabaseClient.rpc(
            "get_head_to_head_record",
            {
              p_player_1_id: playerA.id,
              p_player_2_id: playerB.id,
            }
          );

          if (!h2hError && h2hData && h2hData.length > 0) {
            rawH2hRecord = h2hData[0];
          }
        } catch (h2hError) {
          console.error("Error fetching head-to-head record:", h2hError);
          // Continue without head-to-head data if there's an error
        }

        const h2hFavorA = !!(
          rawH2hRecord &&
          rawH2hRecord.player_a_wins > rawH2hRecord.player_b_wins
        );
        const h2hFavorB = !!(
          rawH2hRecord &&
          rawH2hRecord.player_b_wins > rawH2hRecord.player_a_wins
        );

        const favoredPlayerId =
          rawH2hRecord &&
          rawH2hRecord.player_a_wins !== rawH2hRecord.player_b_wins
            ? rawH2hRecord.player_a_wins > rawH2hRecord.player_b_wins
              ? rawH2hRecord.player_a_id
              : rawH2hRecord.player_b_id
            : null;

        const defaultPlayer1IsHigherRated =
          playerA.ntrpRating >= playerB.ntrpRating;

        let player1IsHigherRated = defaultPlayer1IsHigherRated;
        if (favoredPlayerId) {
          if (favoredPlayerId === playerA.id) {
            player1IsHigherRated = true;
          } else if (favoredPlayerId === playerB.id) {
            player1IsHigherRated = false;
          }
        }

        const player1 = player1IsHigherRated ? playerA : playerB;
        const player2 = player1IsHigherRated ? playerB : playerA;

        if (rawH2hRecord) {
          const player1IsRecordA = rawH2hRecord.player_a_id === player1.id;
          const player1IsRecordB = rawH2hRecord.player_b_id === player1.id;

          if (player1IsRecordA || player1IsRecordB) {
            const player1Wins = player1IsRecordA
              ? rawH2hRecord.player_a_wins
              : rawH2hRecord.player_b_wins;
            const player1Losses = player1IsRecordA
              ? rawH2hRecord.player_b_wins
              : rawH2hRecord.player_a_wins;

            let lastMatchResult: "W" | "L" | undefined;
            if (
              rawH2hRecord.last_match_result === "A" ||
              rawH2hRecord.last_match_result === "B"
            ) {
              const playerAWon = rawH2hRecord.last_match_result === "A";
              const player1WonLast = player1IsRecordA
                ? playerAWon
                : !playerAWon;
              lastMatchResult = player1WonLast ? "W" : "L";
            }

            h2hRecord = {
              wins: player1Wins,
              losses: player1Losses,
              lastMatchResult,
              lastMatchDate: rawH2hRecord.last_match_date || undefined,
            };
          } else {
            h2hRecord = undefined;
          }
        }

        // Calculate odds using embedded algorithm with head-to-head data
        const oddsResult = calculateOdds(player1, player2, context, h2hRecord);

        // Map the calculated odds back to the correct players (A and B)
        const odds_a = player1IsHigherRated
          ? oddsResult.player1Odds
          : oddsResult.player2Odds;
        const odds_b = player1IsHigherRated
          ? oddsResult.player2Odds
          : oddsResult.player1Odds;

        // Update the match with calculated odds
        const { error: updateError } = await supabaseClient
          .from("matches")
          .update({
            odds_a: odds_a,
            odds_b: odds_b,
          })
          .eq("id", match.id);

        if (updateError) {
          results.push({
            matchId: match.id,
            error: "Failed to update match odds",
          });
        } else {
          results.push({
            matchId: match.id,
            success: true,
            odds: {
              player_a: odds_a,
              player_b: odds_b,
              confidence: oddsResult.confidence,
            },
          });
        }
      } catch (error) {
        results.push({ matchId: match.id, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        processed: results.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
