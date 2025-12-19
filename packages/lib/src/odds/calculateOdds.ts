import { z } from "zod";

// Player data schema for odds calculation
export const PlayerOddsSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  ntrpRating: z.number().min(1.0).max(7.0),
  wins: z.number().min(0),
  losses: z.number().min(0),
  last5: z.array(z.enum(["W", "L"])).length(5),
  currentStreak: z.number().min(0),
  streakType: z.enum(["W", "L"]),
  surfacePreference: z.string(),
  // Add surface-specific win rates
  surfaceWinRates: z
    .object({
      hardCourt: z.number().min(0).max(1).optional(),
      clayCourt: z.number().min(0).max(1).optional(),
      grassCourt: z.number().min(0).max(1).optional(),
    })
    .optional(),
  aggressiveness: z.number().min(1).max(10),
  stamina: z.number().min(1).max(10),
  consistency: z.number().min(1).max(10),
  age: z.number().min(16).max(80),
  hand: z.enum(["left", "right"]),
  club: z.string(),
  notes: z.string().optional(),
  // New fields for enhanced accuracy
  lastMatchDate: z.string().optional(), // ISO date string
  injuryStatus: z.enum(["healthy", "minor", "major"]).optional(),
  seasonalForm: z.number().min(0).max(1).optional(), // Season win rate
  // Head-to-head record against specific opponent
  headToHeadRecord: z
    .object({
      opponentId: z.string(),
      wins: z.number().min(0),
      losses: z.number().min(0),
      lastMatchResult: z.enum(["W", "L"]).optional(),
      lastMatchDate: z.string().optional(),
    })
    .optional(),
});

export type PlayerOddsData = z.infer<typeof PlayerOddsSchema>;

// Match context for odds calculation
export const MatchContextSchema = z.object({
  surface: z.enum(["Hard Court", "Clay Court", "Grass Court", "Indoor"]),
});

export type MatchContext = z.infer<typeof MatchContextSchema>;

// Odds calculation result
export interface OddsResult {
  player1WinProbability: number; // 0-1
  player2WinProbability: number; // 0-1
  player1Odds: number; // Decimal odds (e.g., 2.5 means bet $1 to win $1.5)
  player2Odds: number;
  confidence: number; // 0-1, how confident the algorithm is
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

export interface H2HRecordInput {
  wins: number;
  losses: number;
  lastMatchResult?: "W" | "L";
  lastMatchDate?: string;
}

/**
 * Calculate win probabilities and odds for a tennis match
 */
export function calculateOdds(
  player1: PlayerOddsData,
  player2: PlayerOddsData,
  context: MatchContext,
  h2hRecord?: H2HRecordInput
): OddsResult {
  // Validate inputs
  PlayerOddsSchema.parse(player1);
  PlayerOddsSchema.parse(player2);
  MatchContextSchema.parse(context);

  const factors = calculateFactors(player1, player2, context, h2hRecord);

  // Calculate base probability from factors with NTRP-heavy weighting
  let player1Score = 0.5; // Start at 50%

  const ntrpDiff = Math.abs(player1.ntrpRating - player2.ntrpRating);
  const baseRating = Math.min(player1.ntrpRating, player2.ntrpRating);
  let ntrpWeight = 0.25; // base

  if (ntrpDiff >= 1.5) {
    ntrpWeight = baseRating >= 4.0 ? 0.6 : 0.55;
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

  const remainingWeight = 1 - ntrpWeight;
  const totalH2HMatches = h2hRecord
    ? (h2hRecord.wins ?? 0) + (h2hRecord.losses ?? 0)
    : 0;

  let headToHeadWeight = 0;
  if (totalH2HMatches > 0) {
    const baseH2HWeight = 0.08;
    const matchBonus = Math.min(0.12, totalH2HMatches * 0.02);
    const maxH2HWeight = Math.min(0.2, baseH2HWeight + matchBonus);
    headToHeadWeight = Math.min(remainingWeight * 0.4, maxH2HWeight);
  }

  // Special case: When NTRP is the same (or very close) and no H2H, reduce other factors significantly
  // This keeps odds closer together (e.g., 1.85-2.15 instead of 1.62-3.00)
  const isSameNTRP = ntrpDiff < 0.1; // Consider ratings within 0.1 as "same"
  const hasNoH2H = totalH2HMatches === 0;
  const shouldReduceOtherFactors = isSameNTRP && hasNoH2H;

  const otherFactors = 4; // form, surface, experience, momentum
  let otherWeightPool = Math.max(remainingWeight - headToHeadWeight, 0);

  // Reduce other factors weight when NTRP is same and no H2H
  if (shouldReduceOtherFactors) {
    // Reduce other factors to only 30% of their normal weight
    // This keeps the odds much closer together
    otherWeightPool = otherWeightPool * 0.3;
  }

  const otherFactorWeight =
    otherFactors > 0 ? otherWeightPool / otherFactors : 0;

  player1Score += factors.ntrpAdvantage * ntrpWeight;
  player1Score += factors.formAdvantage * otherFactorWeight;
  player1Score += factors.surfaceAdvantage * otherFactorWeight;
  player1Score += factors.experienceAdvantage * otherFactorWeight;
  player1Score += factors.momentumAdvantage * otherFactorWeight;
  player1Score += factors.headToHeadAdvantage * headToHeadWeight;

  if (h2hRecord && totalH2HMatches >= 2) {
    const h2hWinRate = totalH2HMatches ? h2hRecord.wins / totalH2HMatches : 0.5;
    const ratingDiffAdjustment = ntrpDiff <= 0.5 ? 1 - ntrpDiff * 0.8 : 0.6;
    const blendStrength = Math.max(
      0,
      Math.min(0.85, (0.25 + totalH2HMatches * 0.08) * ratingDiffAdjustment)
    );
    player1Score =
      player1Score * (1 - blendStrength) + h2hWinRate * blendStrength;
  }

  // Add uncertainty factor to prevent extreme results
  const uncertaintyFactor = 0.05; // 5% uncertainty
  const randomFactor = (Math.random() - 0.5) * uncertaintyFactor;
  player1Score += randomFactor;

  if (h2hRecord && totalH2HMatches >= 2) {
    const player1Wins = h2hRecord.wins ?? 0;
    const player2Wins = h2hRecord.losses ?? 0;
    if (player1Wins !== player2Wins) {
      const h2hTilt = Math.min(
        0.2,
        Math.abs(player1Wins - player2Wins) * 0.025 + totalH2HMatches * 0.01
      );
      if (player1Wins > player2Wins && player1Score < 0.5 + h2hTilt) {
        player1Score = 0.5 + h2hTilt;
      } else if (player2Wins > player1Wins && player1Score > 0.5 - h2hTilt) {
        player1Score = 0.5 - h2hTilt;
      }
    }
  }

  // Dynamic bounds based on NTRP difference - allow more extreme results for significant rating gaps
  let minBound = 0.15;
  let maxBound = 0.85;

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
    // For very large differences (1.5+), allow even more extreme results
    minBound = 0.05; // 5%
    maxBound = 0.95; // 95%
  } else if (ntrpDiff >= 1.0) {
    // For large differences (1.0+), allow more extreme results
    minBound = 0.1; // 10%
    maxBound = 0.9; // 90%
  } else if (ntrpDiff >= 0.5) {
    // For significant NTRP differences, allow more extreme probabilities
    minBound = 0.1; // 10%
    maxBound = 0.9; // 90%
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

interface Factors {
  ntrpAdvantage: number;
  formAdvantage: number;
  surfaceAdvantage: number;
  experienceAdvantage: number;
  momentumAdvantage: number;
  headToHeadAdvantage: number;
}

function calculateFactors(
  player1: PlayerOddsData,
  player2: PlayerOddsData,
  context: MatchContext,
  h2hRecord?: H2HRecordInput
): Factors {
  // NTRP Rating Advantage with non-linear scaling
  const ntrpAdvantage = calculateNTRPAdvantage(player1, player2);

  // Form Advantage with match count weighting
  const formAdvantage = calculateFormAdvantage(player1, player2);

  // Surface Advantage with enhanced calculation
  const surfaceAdvantage = calculateSurfaceAdvantage(
    player1,
    player2,
    context.surface
  );

  // Experience Advantage
  const experienceAdvantage = calculateExperienceAdvantage(player1, player2);

  // Momentum Advantage
  const momentumAdvantage = calculateMomentumAdvantage(player1, player2);

  // Head-to-Head Advantage (new)
  const headToHeadAdvantage = calculateHeadToHeadAdvantage(
    player1,
    player2,
    h2hRecord
  );

  // Fatigue Advantage (new)

  return {
    ntrpAdvantage,
    formAdvantage,
    surfaceAdvantage,
    experienceAdvantage,
    momentumAdvantage,
    headToHeadAdvantage,
  };
}

function calculateNTRPAdvantage(
  player1: PlayerOddsData,
  player2: PlayerOddsData
): number {
  const ntrpDiff = player1.ntrpRating - player2.ntrpRating;

  // Enhanced scaling for significant NTRP differences
  // For differences >= 0.5, apply much stronger weighting
  if (Math.abs(ntrpDiff) >= 0.5) {
    // For significant differences (0.5+), use linear scaling with high multiplier
    const significantDiffMultiplier = ntrpDiff >= 0 ? 1.5 : -1.5;
    return Math.max(-0.8, Math.min(0.8, ntrpDiff * significantDiffMultiplier));
  }

  // For smaller differences (< 0.5), use the existing non-linear scaling
  const baseRating = Math.min(player1.ntrpRating, player2.ntrpRating);
  const scalingFactor = baseRating < 4.0 ? 1.2 : baseRating < 5.0 ? 1.0 : 0.8; // Increased scaling

  // Apply enhanced sigmoid-like function
  const scaledDiff = ntrpDiff * scalingFactor;
  return Math.tanh(scaledDiff * 0.8); // Increased from 0.6
}

function calculateFormAdvantage(
  player1: PlayerOddsData,
  player2: PlayerOddsData
): number {
  // Calculate win rate with minimum match threshold
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
  const recentWeights = [0.4, 0.25, 0.2, 0.1, 0.05]; // More emphasis on most recent
  const p1Last5 = player1.last5;
  const p2Last5 = player2.last5;

  const p1RecentForm = p1Last5.reduce(
    (sum, result, index) => sum + (result === "W" ? recentWeights[index] : 0),
    0
  );
  const p2RecentForm = p2Last5.reduce(
    (sum, result, index) => sum + (result === "W" ? recentWeights[index] : 0),
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

  return Math.tanh((p1Form - p2Form) * 1.5); // Reduced from 2.5
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
      // Enhanced preference calculation
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

  // Enhanced surface advantage calculation
  const surfaceDiff = p1SurfaceWinRate - p2SurfaceWinRate;
  const surfaceAdvantage = surfaceDiff * 0.3; // Reduced from 0.5

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
      recentBonus = h2hRecord.lastMatchResult === "W" ? 0.05 : -0.05; // Reduced from 0.1/-0.1
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
  // Enhanced experience calculation
  const p1Age = player1.age;
  const p1Wins = player1.wins;
  const p1Losses = player1.losses;
  const p2Age = player2.age;
  const p2Wins = player2.wins;
  const p2Losses = player2.losses;

  // Weight age and match experience differently
  const p1Experience = p1Age * 0.3 + (p1Wins + p1Losses) * 0.7;
  const p2Experience = p2Age * 0.3 + (p2Wins + p2Losses) * 0.7;

  const experienceDiff = p1Experience - p2Experience;
  return Math.tanh(experienceDiff * 0.005); // Reduced from 0.008
}

function calculateMomentumAdvantage(
  player1: PlayerOddsData,
  player2: PlayerOddsData
): number {
  // Enhanced momentum calculation
  const p1StreakType = player1.streakType;
  const p1CurrentStreak = player1.currentStreak;
  const p2StreakType = player2.streakType;
  const p2CurrentStreak = player2.currentStreak;

  // Use square root scaling for diminishing returns
  const p1Momentum =
    p1StreakType === "W"
      ? Math.sqrt(p1CurrentStreak)
      : -Math.sqrt(p1CurrentStreak);
  const p2Momentum =
    p2StreakType === "W"
      ? Math.sqrt(p2CurrentStreak)
      : -Math.sqrt(p2CurrentStreak);

  const momentumDiff = p1Momentum - p2Momentum;
  return Math.tanh(momentumDiff * 0.15); // Reduced from 0.2
}

function calculateConfidence(
  player1: PlayerOddsData,
  player2: PlayerOddsData,
  factors: Factors
): number {
  // Enhanced confidence calculation
  let confidence = 0.6; // Lower base confidence

  // Data completeness
  const p1Matches = player1.wins + player1.losses;
  const p2Matches = player2.wins + player2.losses;

  if (p1Matches >= 15 && p2Matches >= 15) confidence += 0.15;
  if (p1Matches >= 30 && p2Matches >= 30) confidence += 0.1;

  // Surface data availability
  if (player1.surfaceWinRates && player2.surfaceWinRates) confidence += 0.05;

  // H2H data availability
  if (player1.headToHeadRecord && player2.headToHeadRecord) confidence += 0.1;

  // Factor agreement (high variance = more certain)
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
  factors: Factors,
  context: MatchContext
): string[] {
  const recommendations: string[] = [];

  // Head-to-head recommendations (highest priority)
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

  // NTRP recommendations
  if (Math.abs(factors.ntrpAdvantage) > 0.15) {
    const stronger = factors.ntrpAdvantage > 0 ? player1 : player2;
    const strongerRating = stronger.ntrpRating;
    recommendations.push(
      `${stronger.firstName} has NTRP advantage (${strongerRating})`
    );
  }

  // Surface recommendations with granular data
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

  // Form recommendations
  if (Math.abs(factors.formAdvantage) > 0.1) {
    const inForm = factors.formAdvantage > 0 ? player1 : player2;
    const inFormLast5 = inForm.last5;
    const recentWins = inFormLast5.filter((r) => r === "W").length;
    recommendations.push(
      `${inForm.firstName} in good form (${recentWins}/5 recent wins)`
    );
  }

  return recommendations.slice(0, 3); // Limit to top 3 recommendations
}

/**
 * Utility function to format odds for display
 */
export function formatOdds(odds: number): string {
  if (odds >= 2.0) {
    return `+${Math.round((odds - 1) * 100)}`;
  } else {
    return `-${Math.round(100 / (odds - 1))}`;
  }
}

/**
 * Utility function to get implied probability from odds
 */
export function oddsToProbability(odds: number): number {
  return 1 / odds;
}

/**
 * Utility function to calculate expected value
 */
export function calculateExpectedValue(
  odds: number,
  stake: number,
  probability: number
): number {
  return (odds - 1) * stake * probability - stake * (1 - probability);
}
