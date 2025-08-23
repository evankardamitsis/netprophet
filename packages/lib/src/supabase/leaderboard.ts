import { getCurrentUserId, supabase } from './client';

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
        // Use the database function to get weekly leaderboard stats
        const { data: weeklyStats, error } = await supabase
            .rpc('get_weekly_leaderboard_stats');

        if (error) {
            console.error('Error fetching weekly leaderboard:', error);
            throw new Error(`Failed to fetch weekly leaderboard: ${error.message}`);
        }

        // The function returns an array, so we need to slice it for the limit
        const limitedStats = (weeklyStats || []).slice(0, limit);

        return limitedStats.map((entry: any, index: number) => ({
            userId: entry.user_id,
            username: entry.username,
            avatarUrl: entry.avatar_url,
            totalPoints: entry.leaderboard_points || 0,
            currentStreak: entry.current_winning_streak || 0,
            bestStreak: entry.best_winning_streak || 0,
            correctPicks: entry.total_correct_picks || 0,
            totalPicks: entry.total_picks || 0,
            accuracyPercentage: entry.accuracy_percentage || 0,
            rank: index + 1
        }));
    }

    /**
     * Get all-time leaderboard
     */
    static async getAllTimeLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
        // Use the pre-calculated database columns for all-time leaderboard
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, leaderboard_points, current_winning_streak, best_winning_streak, total_correct_picks, total_picks, accuracy_percentage')
            .not('username', 'is', null)
            .gte('total_picks', 1) // Only include users who have made picks
            .order('leaderboard_points', { ascending: false })
            .order('current_winning_streak', { ascending: false })
            .limit(limit);

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        }

        return (profiles || []).map((profile, index) => ({
            userId: profile.id,
            username: profile.username,
            avatarUrl: profile.avatar_url,
            totalPoints: profile.leaderboard_points || 0,
            currentStreak: profile.current_winning_streak || 0,
            bestStreak: profile.best_winning_streak || 0,
            correctPicks: profile.total_correct_picks || 0,
            totalPicks: profile.total_picks || 0,
            accuracyPercentage: profile.accuracy_percentage || 0,
            rank: index + 1
        }));
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

        // Get user profile with leaderboard stats
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, leaderboard_points, current_winning_streak, best_winning_streak, total_correct_picks, total_picks, accuracy_percentage')
            .eq('id', targetUserId)
            .single();

        if (profileError || !profile) {
            console.error('Error fetching user profile:', profileError);
            return null;
        }

        // Get active bets for additional stats
        const { data: activeBets, error: activeBetsError } = await supabase
            .from('bets')
            .select('*')
            .eq('user_id', targetUserId)
            .eq('status', 'active');

        if (activeBetsError) {
            console.error('Error fetching active bets:', activeBetsError);
        }

        // Get parlay stats
        const { data: parlayBets, error: parlayBetsError } = await supabase
            .from('bets')
            .select('*')
            .eq('user_id', targetUserId)
            .eq('is_parlay', true);

        if (parlayBetsError) {
            console.error('Error fetching parlay bets:', parlayBetsError);
        }

        // Get winnings and losses
        const { data: wonBets, error: wonBetsError } = await supabase
            .from('bets')
            .select('winnings_paid')
            .eq('user_id', targetUserId)
            .eq('status', 'won');

        const { data: lostBets, error: lostBetsError } = await supabase
            .from('bets')
            .select('bet_amount')
            .eq('user_id', targetUserId)
            .eq('status', 'lost');

        const totalWinnings = wonBets?.reduce((sum, bet) => sum + (bet.winnings_paid || 0), 0) || 0;
        const totalLosses = lostBets?.reduce((sum, bet) => sum + bet.bet_amount, 0) || 0;
        const parlayWins = parlayBets?.filter(bet => bet.status === 'won').length || 0;

        return {
            userId: profile.id,
            username: profile.username,
            avatarUrl: profile.avatar_url,
            totalPoints: profile.leaderboard_points || 0,
            currentStreak: profile.current_winning_streak || 0,
            bestStreak: profile.best_winning_streak || 0,
            correctPicks: profile.total_correct_picks || 0,
            totalPicks: profile.total_picks || 0,
            activeBets: activeBets?.length || 0,
            accuracyPercentage: profile.accuracy_percentage || 0,
            totalWinnings,
            totalLosses,
            parlayWins,
            totalParlays: parlayBets?.length || 0
        };
    }

    /**
     * Get current user's rank in weekly leaderboard
     */
    static async getCurrentUserWeeklyRank(): Promise<number | null> {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user?.id) {
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
        
        if (!user?.id) {
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
