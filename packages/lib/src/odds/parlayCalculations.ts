// Define types locally since we can't import from web app
export interface ParlayCalculation {
    baseOdds: number;
    bonusMultiplier: number;
    finalOdds: number;
    potentialWinnings: number;
    bonusPercentage: number;
    isEligibleForBonus: boolean;
    streakBooster: number;
}

export interface PredictionItem {
    matchId: string;
    match: {
        id: string;
        tournament: string;
        player1: { name: string; odds: number };
        player2: { name: string; odds: number };
        time: string;
        status: string;
        isLocked: boolean;
    };
    prediction: string;
    points: number;
}

// Constants for parlay calculations
export const PARLAY_CONSTANTS = {
    BONUS_THRESHOLD: 3, // Minimum picks for bonus multiplier
    BONUS_PERCENTAGE: 0.05, // 5% bonus for 3+ picks
    STREAK_BOOSTER_THRESHOLD: 3, // Minimum streak for booster
    STREAK_BOOSTER_PERCENTAGE: 0.02, // 2% per streak level
    MAX_STREAK_BOOSTER: 0.20, // Maximum 20% streak bonus
    SAFE_BET_COST: 50, // Cost in tokens for safe bet feature
} as const;

/**
 * Calculate the odds for a specific prediction based on the selected outcome
 */
export function calculatePredictionOdds(prediction: PredictionItem): number {
    // For now, we'll use the player odds based on the prediction
    // In a real implementation, this would be more complex based on the specific prediction type
    
    const predictionText = prediction.prediction.toLowerCase();
    const player1Name = prediction.match.player1.name.toLowerCase();
    const player2Name = prediction.match.player2.name.toLowerCase();
    
    // Simple logic to determine which player's odds to use
    if (predictionText.includes(player1Name.split(' ')[1]?.toLowerCase() || '')) {
        return prediction.match.player1.odds;
    } else if (predictionText.includes(player2Name.split(' ')[1]?.toLowerCase() || '')) {
        return prediction.match.player2.odds;
    }
    
    // Default to average odds if we can't determine
    return (prediction.match.player1.odds + prediction.match.player2.odds) / 2;
}

/**
 * Calculate parlay odds and potential winnings
 */
export function calculateParlayOdds(
    predictions: PredictionItem[],
    stake: number,
    userStreak: number = 0,
    isSafeBet: boolean = false
): ParlayCalculation {
    if (predictions.length === 0) {
        return {
            baseOdds: 1,
            bonusMultiplier: 1,
            finalOdds: 1,
            potentialWinnings: 0,
            bonusPercentage: 0,
            isEligibleForBonus: false,
            streakBooster: 1,
        };
    }

    // Calculate base odds (product of all individual odds)
    const baseOdds = predictions.reduce((total, prediction) => {
        const odds = calculatePredictionOdds(prediction);
        return total * odds;
    }, 1);

    // Calculate bonus multiplier for 3+ picks
    const isEligibleForBonus = predictions.length >= PARLAY_CONSTANTS.BONUS_THRESHOLD;
    const bonusMultiplier = isEligibleForBonus ? (1 + PARLAY_CONSTANTS.BONUS_PERCENTAGE) : 1;
    const bonusPercentage = isEligibleForBonus ? PARLAY_CONSTANTS.BONUS_PERCENTAGE * 100 : 0;

    // Calculate streak booster
    const streakBooster = calculateStreakBooster(userStreak);

    // Calculate final odds with all bonuses
    const finalOdds = baseOdds * bonusMultiplier * streakBooster;

    // Calculate potential winnings
    const potentialWinnings = stake * finalOdds;

    return {
        baseOdds,
        bonusMultiplier,
        finalOdds,
        potentialWinnings,
        bonusPercentage,
        isEligibleForBonus,
        streakBooster,
    };
}

/**
 * Calculate streak booster based on user's current winning streak
 */
export function calculateStreakBooster(userStreak: number): number {
    if (userStreak < PARLAY_CONSTANTS.STREAK_BOOSTER_THRESHOLD) {
        return 1;
    }

    const boosterPercentage = Math.min(
        (userStreak - PARLAY_CONSTANTS.STREAK_BOOSTER_THRESHOLD + 1) * PARLAY_CONSTANTS.STREAK_BOOSTER_PERCENTAGE,
        PARLAY_CONSTANTS.MAX_STREAK_BOOSTER
    );

    return 1 + boosterPercentage;
}

/**
 * Calculate the cost of using a safe bet token
 */
export function calculateSafeBetCost(predictionCount: number): number {
    return PARLAY_CONSTANTS.SAFE_BET_COST * predictionCount;
}

/**
 * Format parlay odds for display
 */
export function formatParlayOdds(odds: number): string {
    return odds.toFixed(2);
}

/**
 * Format potential winnings for display
 */
export function formatWinnings(winnings: number): string {
    return winnings.toFixed(0);
}

/**
 * Get bonus description for UI
 */
export function getBonusDescription(predictions: PredictionItem[], userStreak: number): string[] {
    const descriptions: string[] = [];
    
    if (predictions.length >= PARLAY_CONSTANTS.BONUS_THRESHOLD) {
        descriptions.push(`🎯 ${PARLAY_CONSTANTS.BONUS_PERCENTAGE * 100}% Bonus for ${predictions.length}+ picks`);
    }
    
    if (userStreak >= PARLAY_CONSTANTS.STREAK_BOOSTER_THRESHOLD) {
        const boosterPercentage = calculateStreakBooster(userStreak) - 1;
        descriptions.push(`🔥 +${(boosterPercentage * 100).toFixed(1)}% Streak Booster (${userStreak} wins)`);
    }
    
    return descriptions;
}

/**
 * Validate if a parlay bet can be placed
 */
export function validateParlayBet(
    predictions: PredictionItem[],
    stake: number,
    userBalance: number
): { isValid: boolean; error?: string } {
    if (predictions.length < 2) {
        return { isValid: false, error: 'Parlay requires at least 2 predictions' };
    }
    
    if (stake <= 0) {
        return { isValid: false, error: 'Stake must be greater than 0' };
    }
    
    if (stake > userBalance) {
        return { isValid: false, error: 'Insufficient balance' };
    }
    
    // Check if any matches are already locked
    const lockedMatches = predictions.filter(p => p.match.isLocked);
    if (lockedMatches.length > 0) {
        return { isValid: false, error: 'Some matches are already locked' };
    }
    
    return { isValid: true };
} 