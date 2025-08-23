import { supabase } from './client';

export interface LeaderboardEntry {
    userId: string;
    username: string | null;
    avatarUrl: string | null;
    totalPoints: number;
    currentStreak: number;
    bestStreak: number;
    correctPicks: number;
    totalPicks: number;
    accuracyPercentage: number;
    rank: number;
}

export interface UserStats {
    userId: string;
    username: string | null;
    avatarUrl: string | null;
    totalPoints: number;
    currentStreak: number;
    bestStreak: number;
    correctPicks: number;
    totalPicks: number;
    activeBets: number;
    accuracyPercentage: number;
    totalWinnings: number | null;
    totalLosses: number | null;
    parlayWins: number;
    totalParlays: number;
}

export class LeaderboardService {
    /**
     * Calculate leaderboard points for a user
     */
    private static calculatePoints(wonBets: any[]): number {
        let totalPoints = 0;
        
        for (const bet of wonBets) {
            // Base points for winning (10 points per win)
            totalPoints += 10;
            
            // Bonus points for high odds wins (more risk = more points)
            if (bet.multiplier >= 2.0) {
                totalPoints += Math.floor(bet.multiplier * 5);
            }
            
            // Bonus points for parlay wins
            if (bet.is_parlay && bet.parlay_final_odds > 1.0) {
                totalPoints += Math.floor(bet.parlay_final_odds * 10);
            }
        }
        
        return totalPoints;
    }

    /**
     * Calculate current streak for a user
     */
    private static calculateCurrentStreak(resolvedBets: any[]): number {
        if (resolvedBets.length === 0) return 0;
        
        let currentStreak = 0;
        
        // Sort by resolved_at DESC to get most recent first
        const sortedBets = resolvedBets.sort((a, b) => 
            new Date(b.resolved_at).getTime() - new Date(a.resolved_at).getTime()
        );
        
        for (const bet of sortedBets) {
            if (bet.status === 'won') {
                currentStreak++;
            } else {
                break; // Streak ends on first loss
            }
        }
        
        return currentStreak;
    }

    /**
     * Calculate best streak for a user
     */
    private static calculateBestStreak(resolvedBets: any[]): number {
        if (resolvedBets.length === 0) return 0;
        
        let bestStreak = 0;
        let currentStreak = 0;
        let lastResult = null;
        
        // Sort by resolved_at ASC to process chronologically
        const sortedBets = resolvedBets.sort((a, b) => 
            new Date(a.resolved_at).getTime() - new Date(b.resolved_at).getTime()
        );
        
        for (const bet of sortedBets) {
            const currentResult = bet.status;
            
            if (lastResult === null || currentResult === lastResult) {
                if (currentResult === 'won') {
                    currentStreak++;
                } else {
                    currentStreak = 0; // Reset on loss
                }
                lastResult = currentResult;
            } else {
                // Different result, reset streak
                if (currentResult === 'won') {
                    currentStreak = 1;
                } else {
                    currentStreak = 0;
                }
                lastResult = currentResult;
            }
            
            if (currentStreak > bestStreak) {
                bestStreak = currentStreak;
            }
        }
        
        return bestStreak;
    }

    /**
     * Get weekly leaderboard
     */
    static async getWeeklyLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
        weekStart.setHours(0, 0, 0, 0);

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .not('username', 'is', null);

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        }

        const leaderboardData: LeaderboardEntry[] = [];

        for (const profile of profiles || []) {
            // Get user's bets for this week
            const { data: bets, error: betsError } = await supabase
                .from('bets')
                .select('*')
                .eq('user_id', profile.id)
                .gte('resolved_at', weekStart.toISOString())
                .in('status', ['won', 'lost']);

            if (betsError) {
                console.error(`Error fetching bets for user ${profile.id}:`, betsError);
                continue;
            }

            if (!bets || bets.length === 0) continue;

            const wonBets = bets.filter(bet => bet.status === 'won');
            const totalPoints = this.calculatePoints(wonBets);
            const currentStreak = this.calculateCurrentStreak(bets);
            const bestStreak = this.calculateBestStreak(bets);
            const correctPicks = wonBets.length;
            const totalPicks = bets.length;
            const accuracyPercentage = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100 * 10) / 10 : 0;

            leaderboardData.push({
                userId: profile.id,
                username: profile.username,
                avatarUrl: profile.avatar_url,
                totalPoints,
                currentStreak,
                bestStreak,
                correctPicks,
                totalPicks,
                accuracyPercentage,
                rank: 0 // Will be set after sorting
            });
        }

        // Sort by points and streak, then assign ranks
        leaderboardData.sort((a, b) => {
            if (a.totalPoints !== b.totalPoints) {
                return b.totalPoints - a.totalPoints;
            }
            return b.currentStreak - a.currentStreak;
        });

        leaderboardData.forEach((entry, index) => {
            entry.rank = index + 1;
        });

        return leaderboardData.slice(0, limit);
    }

    /**
     * Get all-time leaderboard
     */
    static async getAllTimeLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .not('username', 'is', null);

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        }

        const leaderboardData: LeaderboardEntry[] = [];

        for (const profile of profiles || []) {
            // Get all user's resolved bets
            const { data: bets, error: betsError } = await supabase
                .from('bets')
                .select('*')
                .eq('user_id', profile.id)
                .in('status', ['won', 'lost']);

            if (betsError) {
                console.error(`Error fetching bets for user ${profile.id}:`, betsError);
                continue;
            }

            if (!bets || bets.length === 0) continue;

            const wonBets = bets.filter(bet => bet.status === 'won');
            const totalPoints = this.calculatePoints(wonBets);
            const currentStreak = this.calculateCurrentStreak(bets);
            const bestStreak = this.calculateBestStreak(bets);
            const correctPicks = wonBets.length;
            const totalPicks = bets.length;
            const accuracyPercentage = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100 * 10) / 10 : 0;

            leaderboardData.push({
                userId: profile.id,
                username: profile.username,
                avatarUrl: profile.avatar_url,
                totalPoints,
                currentStreak,
                bestStreak,
                correctPicks,
                totalPicks,
                accuracyPercentage,
                rank: 0 // Will be set after sorting
            });
        }

        // Sort by points and best streak, then assign ranks
        leaderboardData.sort((a, b) => {
            if (a.totalPoints !== b.totalPoints) {
                return b.totalPoints - a.totalPoints;
            }
            return b.bestStreak - a.bestStreak;
        });

        leaderboardData.forEach((entry, index) => {
            entry.rank = index + 1;
        });

        return leaderboardData.slice(0, limit);
    }

    /**
     * Get user's leaderboard statistics
     */
    static async getUserStats(userId?: string): Promise<UserStats | null> {
        const { data: { user } } = await supabase.auth.getUser();
        const targetUserId = userId || user?.id;

        if (!targetUserId) {
            throw new Error('User must be authenticated to get leaderboard stats');
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', targetUserId)
            .single();

        if (profileError || !profile) {
            console.error('Error fetching user profile:', profileError);
            return null;
        }

        // Get all user's bets
        const { data: bets, error: betsError } = await supabase
            .from('bets')
            .select('*')
            .eq('user_id', targetUserId);

        if (betsError) {
            console.error('Error fetching user bets:', betsError);
            throw new Error(`Failed to fetch user bets: ${betsError.message}`);
        }

        if (!bets || bets.length === 0) {
            return {
                userId: profile.id,
                username: profile.username,
                avatarUrl: profile.avatar_url,
                totalPoints: 0,
                currentStreak: 0,
                bestStreak: 0,
                correctPicks: 0,
                totalPicks: 0,
                activeBets: 0,
                accuracyPercentage: 0,
                totalWinnings: 0,
                totalLosses: 0,
                parlayWins: 0,
                totalParlays: 0
            };
        }

        const resolvedBets = bets.filter(bet => bet.status === 'won' || bet.status === 'lost');
        const wonBets = bets.filter(bet => bet.status === 'won');
        const activeBets = bets.filter(bet => bet.status === 'active');
        const parlayBets = bets.filter(bet => bet.is_parlay);
        const parlayWins = parlayBets.filter(bet => bet.status === 'won').length;

        const totalPoints = this.calculatePoints(wonBets);
        const currentStreak = this.calculateCurrentStreak(resolvedBets);
        const bestStreak = this.calculateBestStreak(resolvedBets);
        const correctPicks = wonBets.length;
        const totalPicks = resolvedBets.length;
        const accuracyPercentage = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100 * 10) / 10 : 0;

        const totalWinnings = wonBets.reduce((sum, bet) => sum + (bet.winnings_paid || 0), 0);
        const totalLosses = bets.filter(bet => bet.status === 'lost').reduce((sum, bet) => sum + bet.bet_amount, 0);

        return {
            userId: profile.id,
            username: profile.username,
            avatarUrl: profile.avatar_url,
            totalPoints,
            currentStreak,
            bestStreak,
            correctPicks,
            totalPicks,
            activeBets: activeBets.length,
            accuracyPercentage,
            totalWinnings,
            totalLosses,
            parlayWins,
            totalParlays: parlayBets.length
        };
    }

    /**
     * Get current user's rank in weekly leaderboard
     */
    static async getCurrentUserWeeklyRank(): Promise<number | null> {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return null;
        }

        const weeklyLeaderboard = await this.getWeeklyLeaderboard(1000); // Get all users
        const userEntry = weeklyLeaderboard.find(entry => entry.userId === user.id);
        
        return userEntry ? userEntry.rank : null;
    }

    /**
     * Get current user's rank in all-time leaderboard
     */
    static async getCurrentUserAllTimeRank(): Promise<number | null> {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return null;
        }

        const allTimeLeaderboard = await this.getAllTimeLeaderboard(1000); // Get all users
        const userEntry = allTimeLeaderboard.find(entry => entry.userId === user.id);
        
        return userEntry ? userEntry.rank : null;
    }

    /**
     * Get leaderboard summary statistics
     */
    static async getLeaderboardSummary(timeFrame: 'weekly' | 'allTime'): Promise<{
        totalParticipants: number;
        topScore: number;
        bestStreak: number;
        averageAccuracy: number;
    }> {
        const leaderboardData = timeFrame === 'weekly' 
            ? await this.getWeeklyLeaderboard(1000)
            : await this.getAllTimeLeaderboard(1000);

        if (leaderboardData.length === 0) {
            return {
                totalParticipants: 0,
                topScore: 0,
                bestStreak: 0,
                averageAccuracy: 0
            };
        }

        const totalParticipants = leaderboardData.length;
        const topScore = Math.max(...leaderboardData.map(entry => entry.totalPoints));
        const bestStreak = Math.max(...leaderboardData.map(entry => entry.currentStreak));
        const averageAccuracy = leaderboardData.reduce((sum, entry) => sum + entry.accuracyPercentage, 0) / totalParticipants;

        return {
            totalParticipants,
            topScore,
            bestStreak,
            averageAccuracy: Math.round(averageAccuracy * 10) / 10 // Round to 1 decimal place
        };
    }
}
