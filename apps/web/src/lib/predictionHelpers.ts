// Enhanced prediction types
export interface PredictionOptions {
    winner: string;
    matchResult: string; // e.g., "3-0", "3-1", "3-2", "2-1", "2-0"
    set1Score: string;
    set2Score: string;
    set3Score: string;
    set4Score: string;
    set5Score: string;
    set1Winner: string;
    set2Winner: string;
    set3Winner: string;
    set4Winner: string;
    set5Winner: string;
    tieBreak: string;
    totalGames: string;
    acesLeader: string;
    doubleFaults: string;
    breakPoints: string;
    // New fields for tiebreak predictions
    set1TieBreak: string; // "yes" or "no"
    set2TieBreak: string; // "yes" or "no"
    set1TieBreakScore: string; // e.g., "7-5", "7-6"
    set2TieBreakScore: string; // e.g., "7-5", "7-6"
    superTieBreak: string; // "yes" or "no" - for amateur format
    superTieBreakScore: string; // e.g., "10-8", "10-6"
    superTieBreakWinner: string; // player name
}

export interface PlayerOdds {
    name: string;
    odds: number;
}

export function createEmptyPredictions(): PredictionOptions {
    return {
        winner: '',
        matchResult: '',
        set1Score: '',
        set2Score: '',
        set3Score: '',
        set4Score: '',
        set5Score: '',
        set1Winner: '',
        set2Winner: '',
        set3Winner: '',
        set4Winner: '',
        set5Winner: '',
        tieBreak: '',
        totalGames: '',
        acesLeader: '',
        doubleFaults: '',
        breakPoints: '',
        // New tiebreak fields
        set1TieBreak: '',
        set2TieBreak: '',
        set1TieBreakScore: '',
        set2TieBreakScore: '',
        superTieBreak: '',
        superTieBreakScore: '',
        superTieBreakWinner: ''
    };
}

export function getSetsToShowFromResult(matchResult: string, isAmateurFormat: boolean = false): number {
    if (!matchResult) return 0;

    const [sets1, sets2] = matchResult.split('-').map(Number);
    
    // For amateur format with 2-1/1-2, only show 2 sets (3rd is super tiebreak)
    if (isAmateurFormat && ['2-1', '1-2'].includes(matchResult)) {
        return 2;
    }
    
    // Total sets played = winner's sets + loser's sets
    return sets1 + sets2;
}

export function getSetWinnersFromResult(matchResult: string, winner: string, player1Name: string, player2Name: string): string[] {
    if (!matchResult || !winner) return [];

    const [sets1, sets2] = matchResult.split('-').map(Number);
    const isPlayer1Winner = winner === player1Name;
    const winnerSets = isPlayer1Winner ? sets1 : sets2;
    const loserSets = isPlayer1Winner ? sets2 : sets1;

    const setWinners: string[] = [];

    // Add winner's sets first (consecutive wins)
    for (let i = 0; i < winnerSets; i++) {
        setWinners.push(winner);
    }

    // Add loser's sets (if any)
    for (let i = 0; i < loserSets; i++) {
        setWinners.push(isPlayer1Winner ? player2Name : player1Name);
    }

    return setWinners;
}

export function buildPredictionText(formPredictions: PredictionOptions): string {
    const predictionParts: string[] = [];

    if (formPredictions.winner) {
        predictionParts.push(`Winner: ${formPredictions.winner}`);
    }

    if (formPredictions.matchResult) {
        predictionParts.push(`Result: ${formPredictions.matchResult}`);
    }

    // Add set scores if available
    const setScores = [
        formPredictions.set1Score,
        formPredictions.set2Score,
        formPredictions.set3Score,
        formPredictions.set4Score,
        formPredictions.set5Score
    ].filter(score => score !== '');

    if (setScores.length > 0) {
        predictionParts.push(`Sets: ${setScores.join(', ')}`);
    }

    // Add tiebreak predictions
    if (formPredictions.set1TieBreak) {
        predictionParts.push(`Set 1 TB: ${formPredictions.set1TieBreak}`);
        if (formPredictions.set1TieBreak === 'yes' && formPredictions.set1TieBreakScore) {
            predictionParts.push(`Set 1 TB Score: ${formPredictions.set1TieBreakScore}`);
        }
    }

    if (formPredictions.set2TieBreak) {
        predictionParts.push(`Set 2 TB: ${formPredictions.set2TieBreak}`);
        if (formPredictions.set2TieBreak === 'yes' && formPredictions.set2TieBreakScore) {
            predictionParts.push(`Set 2 TB Score: ${formPredictions.set2TieBreakScore}`);
        }
    }

    // Add super tiebreak predictions
    if (formPredictions.superTieBreakWinner) {
        predictionParts.push(`Super TB Winner: ${formPredictions.superTieBreakWinner}`);
        if (formPredictions.superTieBreakScore) {
            predictionParts.push(`Super TB Score: ${formPredictions.superTieBreakScore}`);
        }
    }

    // Add other predictions
    if (formPredictions.tieBreak) {
        predictionParts.push(`Tie-break: ${formPredictions.tieBreak}`);
    }

    if (formPredictions.totalGames) {
        predictionParts.push(`Total Games: ${formPredictions.totalGames}`);
    }

    if (formPredictions.acesLeader) {
        predictionParts.push(`Most Aces: ${formPredictions.acesLeader}`);
    }

    if (formPredictions.doubleFaults) {
        predictionParts.push(`Double Faults: ${formPredictions.doubleFaults}`);
    }

    if (formPredictions.breakPoints) {
        predictionParts.push(`Break Points: ${formPredictions.breakPoints}`);
    }

    return predictionParts.join(' | ');
}

export function getPredictionCount(formPredictions: PredictionOptions): number {
    return Object.values(formPredictions).filter(value => value !== '').length;
}

export function hasPredictions(formPredictions: PredictionOptions): boolean {
    return Object.values(formPredictions).some(value => value !== '');
}

/**
 * Calculate multiplier based on betting odds and prediction complexity
 * @param selectedWinner - The predicted winner
 * @param player1 - Player 1 odds
 * @param player2 - Player 2 odds
 * @param predictionCount - Number of predictions made
 * @returns The calculated multiplier
 */
export function calculateMultiplier(
    selectedWinner: string,
    player1: PlayerOdds,
    player2: PlayerOdds,
    predictionCount: number
): number {
    // Get the odds for the selected winner
    const winnerOdds = selectedWinner === player1.name ? player1.odds : player2.odds;
    
    // Base multiplier is the betting odds
    let multiplier = winnerOdds;
    
    // Add small bonuses for prediction complexity
    if (predictionCount >= 8) {
        multiplier += 0.3; // +0.3x for 8+ predictions
    } else if (predictionCount >= 6) {
        multiplier += 0.2; // +0.2x for 6+ predictions
    } else if (predictionCount >= 4) {
        multiplier += 0.15; // +0.15x for 4+ predictions
    } else if (predictionCount >= 2) {
        multiplier += 0.1; // +0.1x for 2+ predictions
    }
    
    return Math.round(multiplier * 100) / 100; // Round to 2 decimal places
}

/**
 * Get multiplier options for display
 * @param player1 - Player 1 odds
 * @param player2 - Player 2 odds
 * @returns Array of multiplier options with descriptions
 */
export function getMultiplierOptions(player1: PlayerOdds, player2: PlayerOdds) {
    const baseOdds1 = player1.odds;
    const baseOdds2 = player2.odds;
    
    return [
        { 
            value: Math.min(baseOdds1, baseOdds2), 
            label: `${Math.min(baseOdds1, baseOdds2).toFixed(2)}x`, 
            description: 'Base odds (1 prediction)' 
        },
        { 
            value: Math.min(baseOdds1, baseOdds2) + 0.1, 
            label: `${(Math.min(baseOdds1, baseOdds2) + 0.1).toFixed(2)}x`, 
            description: '2+ predictions' 
        },
        { 
            value: Math.min(baseOdds1, baseOdds2) + 0.15, 
            label: `${(Math.min(baseOdds1, baseOdds2) + 0.15).toFixed(2)}x`, 
            description: '4+ predictions' 
        },
        { 
            value: Math.min(baseOdds1, baseOdds2) + 0.2, 
            label: `${(Math.min(baseOdds1, baseOdds2) + 0.2).toFixed(2)}x`, 
            description: '6+ predictions' 
        },
        { 
            value: Math.min(baseOdds1, baseOdds2) + 0.3, 
            label: `${(Math.min(baseOdds1, baseOdds2) + 0.3).toFixed(2)}x`, 
            description: '8+ predictions' 
        },
    ];
} 