export function getWinRateColor(rate: number): string {
    if (rate >= 70) return 'text-green-400';
    if (rate >= 50) return 'text-yellow-400';
    return 'text-red-400';
}

export function getNTRPColor(rating: number): string {
    if (rating >= 4.5) return 'text-purple-400';
    if (rating >= 4.0) return 'text-blue-400';
    if (rating >= 3.5) return 'text-green-400';
    if (rating >= 3.0) return 'text-yellow-400';
    return 'text-orange-400';
}

export function getSurfaceColor(surface: string): string {
    switch (surface.toLowerCase()) {
        case 'hard':
            return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        case 'clay':
            return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
        case 'grass':
            return 'bg-green-500/20 text-green-300 border-green-500/30';
        default:
            return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
}

export function getSurfaceTitle(surface: string): string {
    if (!surface) return 'The Tennis Player';
    const surfaceLower = surface.toLowerCase().trim();
    switch (surfaceLower) {
        case 'hard':
        case 'hard court':
        case 'hardcourt':
            return 'The Hardcourt Powerhouse';
        case 'clay':
        case 'clay court':
        case 'claycourt':
            return 'The Clay Specialist';
        case 'grass':
        case 'grass court':
        case 'grasscourt':
            return 'The Green Finesse';
        default:
            return 'The Tennis Player';
    }
}

export function getSurfaceTitleColor(surface: string): string {
    const surfaceLower = surface.toLowerCase().trim();
    switch (surfaceLower) {
        case 'hard':
        case 'hard court':
        case 'hardcourt':
            return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        case 'clay':
        case 'clay court':
        case 'claycourt':
            return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
        case 'grass':
        case 'grass court':
        case 'grasscourt':
            return 'bg-green-500/20 text-green-300 border border-green-500/30';
        default:
            return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
}

export function calculateWinRate(wins: number, losses: number): number {
    return wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
}
