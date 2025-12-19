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
    partnershipBonus?: number; // For doubles only
    teamChemistry?: number; // For doubles only
  };
  recommendations: string[];
}

interface DoublesH2HRecord {
  team_a_wins: number;
  team_b_wins: number;
  total_matches: number;
  last_match_result?: "A" | "B";
  last_match_date?: string;
}

interface PartnershipRecord {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  last_match_date?: string;
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

  // Special case: When NTRP is the same (or very close) and no H2H, reduce other factors significantly
  // This keeps odds closer together (e.g., 1.85-2.15 instead of 1.62-3.00)
  const isSameNTRP = ntrpDiff < 0.1; // Consider ratings within 0.1 as "same"
  const hasNoH2H = totalH2hMatches === 0;
  const shouldReduceOtherFactors = isSameNTRP && hasNoH2H;

  const otherFactors = 4; // form, surface, experience, momentum
  let otherWeightPool = Math.max(remainingWeight - headToHeadWeight, 0);

  // Reduce other factors weight when NTRP is same and no H2H
  if (shouldReduceOtherFactors) {
    // Reduce other factors to only 30% of their normal weight
    // This keeps the odds much closer together
    otherWeightPool = otherWeightPool * 0.3;
  }

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

  // Special case: When NTRP is the same (or very close) and no H2H, keep odds much closer
  // This prevents extreme odds like 1.62 vs 3.00, keeping them around 1.85-2.15 range
  if (shouldReduceOtherFactors) {
    // Tighter bounds: 0.42-0.58 probability range = ~1.72-2.38 odds range
    // This ensures odds stay much closer together
    minBound = 0.42;
    maxBound = 0.58;
  } else if (ntrpDiff < 0.2) {
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

// ============================================================================
// DOUBLES ODDS CALCULATION
// ============================================================================

/**
 * Calculate win probabilities and odds for a doubles tennis match
 * Uses weighted averages to combine two players' stats into team stats
 */
function calculateDoublesOdds(
  teamA: { player1: PlayerOddsData; player2: PlayerOddsData },
  teamB: { player1: PlayerOddsData; player2: PlayerOddsData },
  context: MatchContext,
  doublesH2H?: DoublesH2HRecord,
  partnershipA?: PartnershipRecord,
  partnershipB?: PartnershipRecord
): OddsResult {
  // Combine players into team stats using weighted averages (stronger player weighted more)
  const teamAStats = combinePlayerStats(teamA.player1, teamA.player2);
  const teamBStats = combinePlayerStats(teamB.player1, teamB.player2);

  // Calculate partnership bonuses
  const partnershipBonusA = calculatePartnershipBonus(partnershipA);
  const partnershipBonusB = calculatePartnershipBonus(partnershipB);
  const partnershipAdvantage = partnershipBonusA - partnershipBonusB;

  // Calculate team chemistry (from partnership win rate)
  const teamChemistryA = calculateTeamChemistry(partnershipA);
  const teamChemistryB = calculateTeamChemistry(partnershipB);
  const chemistryAdvantage = teamChemistryA - teamChemistryB;

  // Calculate doubles H2H advantage
  const doublesH2HAdvantage = calculateDoublesH2HAdvantage(doublesH2H);

  // Calculate factors using team stats
  const factors = calculateDoublesFactors(
    teamAStats,
    teamBStats,
    context,
    doublesH2HAdvantage,
    partnershipAdvantage,
    chemistryAdvantage
  );

  // Calculate base probability from factors with NTRP-heavy weighting (same as singles)
  let teamAScore = 0.5; // Start at 50%

  const ntrpDiff = Math.abs(teamAStats.ntrpRating - teamBStats.ntrpRating);
  const baseRating = Math.min(teamAStats.ntrpRating, teamBStats.ntrpRating);
  let ntrpWeight = 0.25; // Base weight

  if (ntrpDiff >= 1.5) {
    if (baseRating >= 4.0) {
      ntrpWeight = 0.6;
    } else {
      ntrpWeight = 0.55;
    }
  } else if (ntrpDiff >= 1.0) {
    if (baseRating >= 4.0) {
      ntrpWeight = 0.55;
    } else if (baseRating >= 3.5) {
      ntrpWeight = 0.5;
    } else {
      ntrpWeight = 0.45;
    }
  } else if (ntrpDiff >= 0.5) {
    ntrpWeight = 0.35;
  }

  const remainingWeight = 1.0 - ntrpWeight;
  const totalH2hMatches = doublesH2H?.total_matches ?? 0;

  let headToHeadWeight = 0;
  if (totalH2hMatches > 0) {
    const baseH2HWeight = 0.08;
    const matchBonus = Math.min(0.12, totalH2hMatches * 0.02);
    const maxH2HWeight = Math.min(0.2, baseH2HWeight + matchBonus);
    headToHeadWeight = Math.min(remainingWeight * 0.4, maxH2HWeight);
  }

  // Partnership bonus gets separate weight (5% of remaining)
  const partnershipWeight = Math.min(0.05, remainingWeight * 0.1);
  const otherFactors = 4; // form, surface, experience, momentum
  const otherWeightPool = Math.max(
    remainingWeight - headToHeadWeight - partnershipWeight,
    0
  );
  const otherFactorsWeight =
    otherFactors > 0 ? otherWeightPool / otherFactors : 0;

  teamAScore += factors.ntrpAdvantage * ntrpWeight;
  teamAScore += factors.formAdvantage * otherFactorsWeight;
  teamAScore += factors.surfaceAdvantage * otherFactorsWeight;
  teamAScore += factors.experienceAdvantage * otherFactorsWeight;
  teamAScore += factors.momentumAdvantage * otherFactorsWeight;
  teamAScore += factors.headToHeadAdvantage * headToHeadWeight;
  teamAScore += factors.partnershipBonus! * partnershipWeight;

  // Apply chemistry to form advantage
  teamAScore += chemistryAdvantage * otherFactorsWeight * 0.5;

  // Blend with doubles H2H if available
  if (doublesH2H && totalH2hMatches >= 2) {
    const h2hWinRate =
      totalH2hMatches > 0 ? doublesH2H.team_a_wins / totalH2hMatches : 0.5;
    const ratingDiffAdjustment = ntrpDiff <= 0.5 ? 1 - ntrpDiff * 0.8 : 0.6;
    const blendStrength = Math.max(
      0,
      Math.min(0.85, (0.25 + totalH2hMatches * 0.08) * ratingDiffAdjustment)
    );
    teamAScore = teamAScore * (1 - blendStrength) + h2hWinRate * blendStrength;
  }

  // Add uncertainty factor
  const uncertaintyFactor = 0.05;
  const randomFactor = (Math.random() - 0.5) * uncertaintyFactor;
  teamAScore += randomFactor;

  // Apply H2H tilt if available
  if (doublesH2H && totalH2hMatches >= 2) {
    const teamAWins = doublesH2H.team_a_wins ?? 0;
    const teamBWins = doublesH2H.team_b_wins ?? 0;
    if (teamAWins !== teamBWins) {
      const h2hTilt = Math.min(
        0.2,
        Math.abs(teamAWins - teamBWins) * 0.025 + totalH2hMatches * 0.01
      );
      if (teamAWins > teamBWins && teamAScore < 0.5 + h2hTilt) {
        teamAScore = 0.5 + h2hTilt;
      } else if (teamBWins > teamAWins && teamAScore > 0.5 - h2hTilt) {
        teamAScore = 0.5 - h2hTilt;
      }
    }
  }

  // Dynamic bounds for doubles - allow more extreme odds when teams have significant NTRP differences
  // Especially when one team has a significantly lower-rated player
  let minBound = 0.2;
  let maxBound = 0.8;

  // Calculate minimum NTRP in each team to detect weak links
  const teamAMinNTRP = Math.min(
    teamA.player1.ntrpRating,
    teamA.player2.ntrpRating
  );
  const teamBMinNTRP = Math.min(
    teamB.player1.ntrpRating,
    teamB.player2.ntrpRating
  );
  const minNTRPDiff = Math.abs(teamAMinNTRP - teamBMinNTRP);

  // Calculate maximum NTRP in each team
  const teamAMaxNTRP = Math.max(
    teamA.player1.ntrpRating,
    teamA.player2.ntrpRating
  );
  const teamBMaxNTRP = Math.max(
    teamB.player1.ntrpRating,
    teamB.player2.ntrpRating
  );

  // Check if one team has a significantly weaker player (weak link)
  const hasWeakLink = minNTRPDiff >= 0.5;
  const weakLinkDiff = minNTRPDiff;

  // Determine which team has the weak link and check if they have a high-rated player (4.5+) to compensate
  let weakLinkPenalty = 0;
  if (hasWeakLink) {
    const teamAHasWeakLink = teamAMinNTRP < teamBMinNTRP;
    const weakLinkTeam = teamAHasWeakLink ? teamA : teamB;
    const weakLinkTeamMaxNTRP = teamAHasWeakLink ? teamAMaxNTRP : teamBMaxNTRP;

    // If the weak link team doesn't have a 4.5+ player, apply additional penalty
    // This makes the weak link have more negative impact in doubles
    if (weakLinkTeamMaxNTRP < 4.5) {
      // Calculate penalty based on weak link difference
      // Larger weak link + no high-rated player = bigger penalty
      const basePenalty = weakLinkDiff * 0.08; // Base 8% per 1.0 NTRP difference (reduced from 15%)
      const noHighRatedBonus = (4.5 - weakLinkTeamMaxNTRP) * 0.05; // Additional 5% per 0.1 below 4.5 (reduced from 10%)
      weakLinkPenalty = Math.min(0.15, basePenalty + noHighRatedBonus); // Cap at 15% penalty (reduced from 25%)

      // Apply penalty to the team with the weak link
      if (teamAHasWeakLink) {
        teamAScore -= weakLinkPenalty;
      } else {
        teamAScore += weakLinkPenalty;
      }
    }
  }

  // When there's a weak link, allow more extreme bounds based on the weak link difference
  // Make bounds slightly more extreme if weak link team has no 4.5+ player
  if (hasWeakLink) {
    const teamAHasWeakLink = teamAMinNTRP < teamBMinNTRP;
    const weakLinkTeamMaxNTRP = teamAHasWeakLink ? teamAMaxNTRP : teamBMaxNTRP;
    const hasNoHighRatedPlayer = weakLinkTeamMaxNTRP < 4.5;

    if (weakLinkDiff >= 1.5) {
      minBound = hasNoHighRatedPlayer ? 0.05 : 0.05;
      maxBound = hasNoHighRatedPlayer ? 0.95 : 0.95;
    } else if (weakLinkDiff >= 1.0) {
      minBound = hasNoHighRatedPlayer ? 0.08 : 0.1;
      maxBound = hasNoHighRatedPlayer ? 0.92 : 0.9;
    } else if (weakLinkDiff >= 0.5) {
      minBound = hasNoHighRatedPlayer ? 0.12 : 0.15;
      maxBound = hasNoHighRatedPlayer ? 0.88 : 0.85;
    }
  } else {
    // No weak link - use tighter bounds based on average NTRP difference
    if (ntrpDiff < 0.2) {
      minBound = 0.35;
      maxBound = 0.65;
    } else if (ntrpDiff < 0.35) {
      minBound = 0.3;
      maxBound = 0.7;
    } else if (ntrpDiff >= 1.5) {
      minBound = 0.05;
      maxBound = 0.95;
    } else if (ntrpDiff >= 1.0) {
      minBound = 0.1;
      maxBound = 0.9;
    } else if (ntrpDiff >= 0.5) {
      minBound = 0.15;
      maxBound = 0.85;
    }
  }

  teamAScore = Math.max(minBound, Math.min(maxBound, teamAScore));
  const teamBScore = 1 - teamAScore;

  // Calculate decimal odds with margin
  const margin = 0.05;
  const teamAOdds = (1 / teamAScore) * (1 + margin);
  const teamBOdds = (1 / teamBScore) * (1 + margin);

  // Calculate confidence
  const confidence = calculateDoublesConfidence(
    teamAStats,
    teamBStats,
    factors,
    partnershipA,
    partnershipB,
    doublesH2H
  );

  // Generate recommendations
  const recommendations = generateDoublesRecommendations(
    teamA,
    teamB,
    factors,
    context,
    partnershipA,
    partnershipB,
    doublesH2H
  );

  return {
    player1WinProbability: teamAScore,
    player2WinProbability: teamBScore,
    player1Odds: Math.round(teamAOdds * 100) / 100,
    player2Odds: Math.round(teamBOdds * 100) / 100,
    confidence,
    factors: {
      ...factors,
      partnershipBonus: factors.partnershipBonus,
      teamChemistry: chemistryAdvantage,
    },
    recommendations,
  };
}

/**
 * Combine two players' stats into team stats using weighted averages
 * Stronger player (higher NTRP) gets 60% weight, weaker gets 40%
 */
function combinePlayerStats(
  player1: PlayerOddsData,
  player2: PlayerOddsData
): PlayerOddsData {
  // Determine stronger and weaker player
  const stronger = player1.ntrpRating >= player2.ntrpRating ? player1 : player2;
  const weaker = player1.ntrpRating >= player2.ntrpRating ? player2 : player1;

  // Weighted averages
  const ntrpRating = stronger.ntrpRating * 0.6 + weaker.ntrpRating * 0.4;
  const wins = Math.round(stronger.wins * 0.6 + weaker.wins * 0.4);
  const losses = Math.round(stronger.losses * 0.6 + weaker.losses * 0.4);

  // Form: weighted average of last5
  const recentWeights = [0.4, 0.25, 0.2, 0.1, 0.05];
  const strongerForm = stronger.last5.reduce(
    (sum, result, index) =>
      sum + (result === "W" ? recentWeights[index] || 0 : 0),
    0
  );
  const weakerForm = weaker.last5.reduce(
    (sum, result, index) =>
      sum + (result === "W" ? recentWeights[index] || 0 : 0),
    0
  );
  const combinedForm = strongerForm * 0.6 + weakerForm * 0.4;
  // Convert back to last5 array (approximate)
  const last5: ("W" | "L")[] = [];
  for (let i = 0; i < 5; i++) {
    last5.push(combinedForm > 0.5 ? "W" : "L");
  }

  // Surface: best of both (if one has 70%, team gets 70%)
  const getSurfaceWinRate = (
    player: PlayerOddsData,
    surface: string
  ): number => {
    if (!player.surfaceWinRates) {
      return player.surfacePreference === surface ? 0.65 : 0.35;
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
  const strongerSurface = getSurfaceWinRate(
    stronger,
    stronger.surfacePreference
  );
  const weakerSurface = getSurfaceWinRate(weaker, weaker.surfacePreference);
  const surfaceWinRates = {
    hardCourt: Math.max(strongerSurface, weakerSurface),
    clayCourt: Math.max(strongerSurface, weakerSurface),
    grassCourt: Math.max(strongerSurface, weakerSurface),
  };

  // Experience: average
  const age = Math.round(stronger.age * 0.5 + weaker.age * 0.5);
  const totalMatches =
    stronger.wins + stronger.losses + weaker.wins + weaker.losses;

  // Momentum: average
  const strongerMomentum =
    stronger.streakType === "W"
      ? Math.sqrt(stronger.currentStreak)
      : -Math.sqrt(stronger.currentStreak);
  const weakerMomentum =
    weaker.streakType === "W"
      ? Math.sqrt(weaker.currentStreak)
      : -Math.sqrt(weaker.currentStreak);
  const avgMomentum = (strongerMomentum + weakerMomentum) / 2;
  const currentStreak = Math.abs(avgMomentum);
  const streakType: "W" | "L" = avgMomentum >= 0 ? "W" : "L";

  return {
    id: `${stronger.id}-${weaker.id}`, // Combined ID
    firstName: `${stronger.firstName} & ${weaker.firstName}`,
    lastName: `${stronger.lastName} & ${weaker.lastName}`,
    ntrpRating,
    wins,
    losses,
    last5,
    currentStreak,
    streakType,
    surfacePreference: stronger.surfacePreference, // Use stronger player's preference
    surfaceWinRates,
    aggressiveness: (stronger.aggressiveness + weaker.aggressiveness) / 2,
    stamina: (stronger.stamina + weaker.stamina) / 2,
    consistency: (stronger.consistency + weaker.consistency) / 2,
    age,
    hand: stronger.hand, // Use stronger player's hand
    club: stronger.club,
    notes: `${stronger.notes || ""} / ${weaker.notes || ""}`,
  };
}

/**
 * Calculate partnership bonus based on matches played together
 * 0-4 matches: No bonus
 * 5-9 matches: +1% per 5 matches (max +1%)
 * 10-19 matches: +2% per 5 matches (max +3%)
 * 20+ matches: +3% per 5 matches (max +10%)
 */
function calculatePartnershipBonus(partnership?: PartnershipRecord): number {
  if (!partnership || partnership.total_matches === 0) {
    return 0;
  }

  const matches = partnership.total_matches;

  if (matches < 5) {
    return 0;
  } else if (matches < 10) {
    return 0.01; // +1%
  } else if (matches < 20) {
    const bonus = Math.floor(matches / 5) * 0.01;
    return Math.min(0.03, bonus); // Max +3%
  } else {
    const bonus = Math.floor(matches / 5) * 0.03;
    return Math.min(0.1, bonus); // Max +10%
  }
}

/**
 * Calculate team chemistry from partnership win rate
 * Win rate > 0.6: +5% chemistry bonus
 * Win rate 0.5-0.6: +2% chemistry bonus
 * Win rate < 0.4: -2% chemistry penalty
 * No partnership: 0% (neutral)
 */
function calculateTeamChemistry(partnership?: PartnershipRecord): number {
  if (!partnership || partnership.total_matches < 5) {
    return 0; // Need at least 5 matches together
  }

  const winRate = partnership.win_rate;

  if (winRate > 0.6) {
    return 0.05; // +5%
  } else if (winRate >= 0.5) {
    return 0.02; // +2%
  } else if (winRate < 0.4) {
    return -0.02; // -2% penalty
  }

  return 0; // Neutral for 0.4-0.5
}

/**
 * Calculate doubles H2H advantage
 */
function calculateDoublesH2HAdvantage(doublesH2H?: DoublesH2HRecord): number {
  if (!doublesH2H || doublesH2H.total_matches === 0) {
    return 0;
  }

  const totalMatches = doublesH2H.total_matches;
  const teamAWinRate = doublesH2H.team_a_wins / totalMatches;

  let recentBonus = 0;
  if (doublesH2H.last_match_result && doublesH2H.last_match_date) {
    const lastMatchDate = new Date(doublesH2H.last_match_date);
    const daysSince =
      (Date.now() - lastMatchDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 180) {
      recentBonus = doublesH2H.last_match_result === "A" ? 0.05 : -0.05;
    }
  }

  const matchVolumeBoost = Math.min(0.4, totalMatches * 0.05);
  const rawAdvantage =
    (teamAWinRate - 0.5) * (0.8 + matchVolumeBoost) + recentBonus;

  return Math.tanh(rawAdvantage * 1.1);
}

/**
 * Calculate doubles factors
 */
function calculateDoublesFactors(
  teamA: PlayerOddsData,
  teamB: PlayerOddsData,
  context: MatchContext,
  doublesH2HAdvantage: number,
  partnershipAdvantage: number,
  chemistryAdvantage: number
) {
  return {
    ntrpAdvantage: calculateNTRPAdvantage(teamA, teamB),
    formAdvantage: calculateFormAdvantage(teamA, teamB),
    surfaceAdvantage: calculateSurfaceAdvantage(teamA, teamB, context.surface),
    experienceAdvantage: calculateExperienceAdvantage(teamA, teamB),
    momentumAdvantage: calculateMomentumAdvantage(teamA, teamB),
    headToHeadAdvantage: doublesH2HAdvantage,
    partnershipBonus: partnershipAdvantage,
  };
}

/**
 * Calculate confidence for doubles matches
 */
function calculateDoublesConfidence(
  teamA: PlayerOddsData,
  teamB: PlayerOddsData,
  factors: any,
  partnershipA?: PartnershipRecord,
  partnershipB?: PartnershipRecord,
  doublesH2H?: DoublesH2HRecord
): number {
  let confidence = 0.6;

  const teamAMatches = teamA.wins + teamA.losses;
  const teamBMatches = teamB.wins + teamB.losses;

  if (teamAMatches >= 15 && teamBMatches >= 15) confidence += 0.15;
  if (teamAMatches >= 30 && teamBMatches >= 30) confidence += 0.1;

  if (teamA.surfaceWinRates && teamB.surfaceWinRates) confidence += 0.05;

  if (doublesH2H && doublesH2H.total_matches > 0) confidence += 0.1;

  // Partnership history bonus
  if (partnershipA && partnershipA.total_matches >= 10) confidence += 0.05;
  if (partnershipB && partnershipB.total_matches >= 10) confidence += 0.05;

  const factorVariance =
    Math.abs(factors.ntrpAdvantage) +
    Math.abs(factors.formAdvantage) +
    Math.abs(factors.surfaceAdvantage) +
    Math.abs(factors.headToHeadAdvantage);

  if (factorVariance > 0.6) confidence += 0.1;
  if (factorVariance > 1.0) confidence += 0.05;

  return Math.max(0.3, Math.min(0.95, confidence));
}

/**
 * Generate recommendations for doubles matches
 */
function generateDoublesRecommendations(
  teamA: { player1: PlayerOddsData; player2: PlayerOddsData },
  teamB: { player1: PlayerOddsData; player2: PlayerOddsData },
  factors: any,
  context: MatchContext,
  partnershipA?: PartnershipRecord,
  partnershipB?: PartnershipRecord,
  doublesH2H?: DoublesH2HRecord
): string[] {
  const recommendations: string[] = [];

  // Doubles H2H
  if (doublesH2H && doublesH2H.total_matches > 0) {
    const teamAWinRate = (
      (doublesH2H.team_a_wins / doublesH2H.total_matches) *
      100
    ).toFixed(0);
    recommendations.push(
      `Team A leads H2H ${doublesH2H.team_a_wins}-${doublesH2H.team_b_wins} (${teamAWinRate}% win rate)`
    );
  }

  // Partnership history
  if (partnershipA && partnershipA.total_matches >= 5) {
    const winRate = (partnershipA.win_rate * 100).toFixed(0);
    recommendations.push(
      `Team A partnership: ${partnershipA.wins}-${partnershipA.losses} (${winRate}% win rate)`
    );
  }

  if (partnershipB && partnershipB.total_matches >= 5) {
    const winRate = (partnershipB.win_rate * 100).toFixed(0);
    recommendations.push(
      `Team B partnership: ${partnershipB.wins}-${partnershipB.losses} (${winRate}% win rate)`
    );
  }

  // NTRP advantage
  if (Math.abs(factors.ntrpAdvantage) > 0.1) {
    const stronger = factors.ntrpAdvantage > 0 ? "Team A" : "Team B";
    recommendations.push(`${stronger} has NTRP advantage`);
  }

  // Surface advantage
  if (Math.abs(factors.surfaceAdvantage) > 0.1) {
    const advantaged = factors.surfaceAdvantage > 0 ? "Team A" : "Team B";
    recommendations.push(`${advantaged} excels on ${context.surface}`);
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
    // Fetch both singles and doubles players
    const { data: matches, error: matchesError } = await supabaseClient
      .from("matches")
      .select(
        `
        id,
        match_type,
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
          streak_type,
          age,
          hand,
          notes
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
          streak_type,
          age,
          hand,
          notes
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
          streak_type,
          age,
          hand,
          notes
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

        const matchType = match.match_type || "singles";

        // Route to singles or doubles algorithm
        if (matchType === "doubles") {
          // Doubles match processing
          if (
            !match.player_a1 ||
            !match.player_a2 ||
            !match.player_b1 ||
            !match.player_b2 ||
            !match.tournaments
          ) {
            results.push({
              matchId: match.id,
              error: "Incomplete doubles match data",
            });
            continue;
          }

          // Convert to PlayerOddsData format
          const playerA1: PlayerOddsData = {
            id: match.player_a1.id,
            firstName: match.player_a1.first_name,
            lastName: match.player_a1.last_name,
            ntrpRating: match.player_a1.ntrp_rating || 3.0,
            wins: match.player_a1.wins || 0,
            losses: match.player_a1.losses || 0,
            last5: match.player_a1.last5 || ["W", "W", "L", "W", "L"],
            currentStreak: match.player_a1.current_streak || 0,
            streakType: match.player_a1.streak_type || "W",
            surfacePreference:
              match.player_a1.surface_preference || "Hard Court",
            aggressiveness: 5,
            stamina: 5,
            consistency: 5,
            age: match.player_a1.age || 25,
            hand: match.player_a1.hand || "right",
            club: "Default Club",
            notes: match.player_a1.notes || "",
          };

          const playerA2: PlayerOddsData = {
            id: match.player_a2.id,
            firstName: match.player_a2.first_name,
            lastName: match.player_a2.last_name,
            ntrpRating: match.player_a2.ntrp_rating || 3.0,
            wins: match.player_a2.wins || 0,
            losses: match.player_a2.losses || 0,
            last5: match.player_a2.last5 || ["W", "W", "L", "W", "L"],
            currentStreak: match.player_a2.current_streak || 0,
            streakType: match.player_a2.streak_type || "W",
            surfacePreference:
              match.player_a2.surface_preference || "Hard Court",
            aggressiveness: 5,
            stamina: 5,
            consistency: 5,
            age: match.player_a2.age || 25,
            hand: match.player_a2.hand || "right",
            club: "Default Club",
            notes: match.player_a2.notes || "",
          };

          const playerB1: PlayerOddsData = {
            id: match.player_b1.id,
            firstName: match.player_b1.first_name,
            lastName: match.player_b1.last_name,
            ntrpRating: match.player_b1.ntrp_rating || 3.0,
            wins: match.player_b1.wins || 0,
            losses: match.player_b1.losses || 0,
            last5: match.player_b1.last5 || ["L", "W", "W", "L", "W"],
            currentStreak: match.player_b1.current_streak || 0,
            streakType: match.player_b1.streak_type || "W",
            surfacePreference:
              match.player_b1.surface_preference || "Hard Court",
            aggressiveness: 5,
            stamina: 5,
            consistency: 5,
            age: match.player_b1.age || 25,
            hand: match.player_b1.hand || "right",
            club: "Default Club",
            notes: match.player_b1.notes || "",
          };

          const playerB2: PlayerOddsData = {
            id: match.player_b2.id,
            firstName: match.player_b2.first_name,
            lastName: match.player_b2.last_name,
            ntrpRating: match.player_b2.ntrp_rating || 3.0,
            wins: match.player_b2.wins || 0,
            losses: match.player_b2.losses || 0,
            last5: match.player_b2.last5 || ["L", "W", "W", "L", "W"],
            currentStreak: match.player_b2.current_streak || 0,
            streakType: match.player_b2.streak_type || "W",
            surfacePreference:
              match.player_b2.surface_preference || "Hard Court",
            aggressiveness: 5,
            stamina: 5,
            consistency: 5,
            age: match.player_b2.age || 25,
            hand: match.player_b2.hand || "right",
            club: "Default Club",
            notes: match.player_b2.notes || "",
          };

          const context: MatchContext = {
            surface: match.tournaments.surface as
              | "Hard Court"
              | "Clay Court"
              | "Grass Court",
          };

          // Fetch doubles H2H record
          let doublesH2H: DoublesH2HRecord | undefined;
          try {
            const { data: h2hData, error: h2hError } = await supabaseClient.rpc(
              "get_doubles_h2h_record",
              {
                p_team_a_p1_id: playerA1.id,
                p_team_a_p2_id: playerA2.id,
                p_team_b_p1_id: playerB1.id,
                p_team_b_p2_id: playerB2.id,
              }
            );

            if (!h2hError && h2hData && h2hData.length > 0) {
              const record = h2hData[0];
              doublesH2H = {
                team_a_wins: record.team_a_wins,
                team_b_wins: record.team_b_wins,
                total_matches: record.total_matches,
                last_match_result:
                  record.last_match_result === "A"
                    ? "A"
                    : record.last_match_result === "B"
                      ? "B"
                      : undefined,
                last_match_date: record.last_match_date || undefined,
              };
            }
          } catch (h2hError) {
            console.error("Error fetching doubles H2H record:", h2hError);
          }

          // Fetch partnership records
          let partnershipA: PartnershipRecord | undefined;
          let partnershipB: PartnershipRecord | undefined;

          try {
            // Team A partnership
            const { data: partnershipAData, error: partnershipAError } =
              await supabaseClient.rpc("get_partnership_record", {
                p_player_1_id: playerA1.id,
                p_player_2_id: playerA2.id,
              });

            if (
              !partnershipAError &&
              partnershipAData &&
              partnershipAData.length > 0
            ) {
              const record = partnershipAData[0];
              partnershipA = {
                total_matches: record.total_matches,
                wins: record.wins,
                losses: record.losses,
                win_rate: parseFloat(record.win_rate),
                last_match_date: record.last_match_date || undefined,
              };
            }
          } catch (partnershipError) {
            console.error("Error fetching partnership A:", partnershipError);
          }

          try {
            // Team B partnership
            const { data: partnershipBData, error: partnershipBError } =
              await supabaseClient.rpc("get_partnership_record", {
                p_player_1_id: playerB1.id,
                p_player_2_id: playerB2.id,
              });

            if (
              !partnershipBError &&
              partnershipBData &&
              partnershipBData.length > 0
            ) {
              const record = partnershipBData[0];
              partnershipB = {
                total_matches: record.total_matches,
                wins: record.wins,
                losses: record.losses,
                win_rate: parseFloat(record.win_rate),
                last_match_date: record.last_match_date || undefined,
              };
            }
          } catch (partnershipError) {
            console.error("Error fetching partnership B:", partnershipError);
          }

          // Calculate doubles odds
          const oddsResult = calculateDoublesOdds(
            { player1: playerA1, player2: playerA2 },
            { player1: playerB1, player2: playerB2 },
            context,
            doublesH2H,
            partnershipA,
            partnershipB
          );

          // Update the match with calculated odds (odds_a = team A, odds_b = team B)
          const { error: updateError } = await supabaseClient
            .from("matches")
            .update({
              odds_a: oddsResult.player1Odds,
              odds_b: oddsResult.player2Odds,
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
                team_a: oddsResult.player1Odds,
                team_b: oddsResult.player2Odds,
                confidence: oddsResult.confidence,
              },
            });
          }
        } else {
          // Singles match processing (existing logic)
          if (!match.player_a || !match.player_b || !match.tournaments) {
            results.push({
              matchId: match.id,
              error: "Incomplete match data",
            });
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
            surfacePreference:
              match.player_a.surface_preference || "Hard Court",
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
            surfacePreference:
              match.player_b.surface_preference || "Hard Court",
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
          const oddsResult = calculateOdds(
            player1,
            player2,
            context,
            h2hRecord
          );

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
        } // End of else block for singles
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
