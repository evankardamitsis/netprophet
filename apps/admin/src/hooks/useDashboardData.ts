import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  totalUsers: number;
  activePlayers: number;
  tournaments: number;
  activeTournaments: number;
  liveMatches: number;
  upcomingMatches: number;
  totalRevenue: number;
  activeSessions: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch total users
        const { count: totalUsers, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // Fetch active players (users who have made predictions in the last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: activePlayers, error: activeError } = await supabase
          .from('bets')
          .select('user_id', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (activeError) throw activeError;

        // Get unique active users
        const { data: uniqueActiveUsers, error: uniqueError } = await supabase
          .from('bets')
          .select('user_id')
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (uniqueError) throw uniqueError;
        const uniqueActiveCount = new Set(uniqueActiveUsers?.map(bet => bet.user_id)).size;

        // Fetch tournaments
        const { data: tournaments, error: tournamentsError } = await supabase
          .from('tournaments')
          .select('*');

        if (tournamentsError) throw tournamentsError;

        const activeTournaments = tournaments?.filter(t => 
          new Date(t.start_date) <= new Date() && new Date(t.end_date) >= new Date()
        ).length || 0;

        // Fetch live matches
        const { data: liveMatches, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .eq('status', 'live');

        if (matchesError) throw matchesError;

        // Fetch upcoming matches (next 24 hours)
        const next24Hours = new Date();
        next24Hours.setHours(next24Hours.getHours() + 24);
        
        const { data: upcomingMatches, error: upcomingError } = await supabase
          .from('matches')
          .select('*')
          .eq('status', 'scheduled')
          .gte('start_time', new Date().toISOString())
          .lte('start_time', next24Hours.toISOString());

        if (upcomingError) throw upcomingError;

        // Fetch total revenue (from transactions)
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'purchase');

        if (transactionsError) throw transactionsError;

        const totalRevenue = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

        // Fetch recent activity (last 10 bets, tournaments, etc.)
        const { data: recentBets, error: betsError } = await supabase
          .from('bets')
          .select(`
            id,
            created_at,
            user_id
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (betsError) throw betsError;

        // Fetch usernames for the bets
        const userIds = recentBets?.map(bet => bet.user_id) || [];
        const { data: userProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Create a map of user_id to username
        const usernameMap = new Map(userProfiles?.map(profile => [profile.id, profile.username]) || []);

        const { data: recentTournaments, error: tournamentsRecentError } = await supabase
          .from('tournaments')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        if (tournamentsRecentError) throw tournamentsRecentError;

        // Combine and format recent activity
        const recentActivity = [
          ...(recentBets?.map(bet => {
            const username = usernameMap.get(bet.user_id);
            return {
              id: bet.id,
              type: 'prediction',
              description: `New prediction by ${username || 'User'}`,
              timestamp: bet.created_at
            };
          }) || []),
          ...(recentTournaments?.map(tournament => ({
            id: tournament.id,
            type: 'tournament',
            description: `Tournament "${tournament.name}" created`,
            timestamp: tournament.created_at
          })) || [])
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

        // Estimate active sessions (users who have been active in the last hour)
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        const { data: recentActivityData, error: activityError } = await supabase
          .from('bets')
          .select('user_id')
          .gte('created_at', oneHourAgo.toISOString());

        if (activityError) throw activityError;
        const activeSessions = new Set(recentActivityData?.map(bet => bet.user_id)).size;

        setStats({
          totalUsers: totalUsers || 0,
          activePlayers: uniqueActiveCount,
          tournaments: tournaments?.length || 0,
          activeTournaments,
          liveMatches: liveMatches?.length || 0,
          upcomingMatches: upcomingMatches?.length || 0,
          totalRevenue,
          activeSessions,
          recentActivity
        });

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return { stats, loading, error, refresh: fetchDashboardData };
}
