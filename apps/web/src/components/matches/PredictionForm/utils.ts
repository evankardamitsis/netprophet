import type { PredictionOptions } from './types';

export function displayName(name: string, isDoubles: boolean): string {
    if (isDoubles) {
        const formatPlayerName = (fullName: string) => {
            const parts = fullName.trim().split(' ');
            if (parts.length >= 2) {
                const lastName = parts[parts.length - 1];
                const firstName = parts[0];
                const firstInitial = firstName.charAt(0).toUpperCase();
                return `${lastName} ${firstInitial}.`;
            }
            return fullName;
        };
        if (name.includes(' & ')) {
            const [player1, player2] = name.split(' & ');
            return `${formatPlayerName(player1)} & ${formatPlayerName(player2)}`;
        }
        return name;
    }
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        const lastName = parts[parts.length - 1];
        const firstName = parts[0];
        const firstInitial = firstName.charAt(0).toUpperCase();
        return `${lastName} ${firstInitial}.`;
    }
    return name;
}

export function validateSuperTiebreakScore(score: string, player1Wins: boolean): boolean {
    if (!score || score.trim() === '') return true;
    const pattern = /^\d+-\d+$/;
    if (!pattern.test(score.trim())) return false;
    const [score1, score2] = score.trim().split('-').map(Number);
    if (isNaN(score1) || isNaN(score2)) return false;
    const winnerScore = Math.max(score1, score2);
    if (winnerScore < 10) return false;
    const diff = Math.abs(score1 - score2);
    if (diff < 2) return false;
    if (player1Wins && score1 <= score2) return false;
    if (!player1Wins && score2 <= score1) return false;
    return true;
}

export function getIndividualBonus(count: number): number {
    return count * 0.2;
}

export function getTiebreakBonus(count: number): number {
    return count * 0.2;
}

export function getMaxSetWinnersBonus(formPredictions: PredictionOptions): number {
    if (!formPredictions.matchResult) return 0;
    if (['3-0', '0-3', '2-0', '0-2'].includes(formPredictions.matchResult)) return 0;
    if (['2-1', '1-2'].includes(formPredictions.matchResult)) return 0.2;
    const [sets1, sets2] = formPredictions.matchResult.split('-').map(Number);
    return (sets1 + sets2) * 0.2;
}

export function getMaxSetScoresBonus(formPredictions: PredictionOptions): number {
    if (!formPredictions.matchResult) return 0;
    if (['3-0', '0-3', '2-0', '0-2'].includes(formPredictions.matchResult)) {
        const [sets1, sets2] = formPredictions.matchResult.split('-').map(Number);
        return (sets1 + sets2) * 0.2;
    }
    return 0;
}

export function getMaxSetTiebreaksBonus(): number {
    return 0.4;
}
