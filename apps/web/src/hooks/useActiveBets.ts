import { useState, useEffect } from 'react';
import { supabase } from '@netprophet/lib';
import { useAuth } from './useAuth';

/**
 * Hook to fetch active bets for the current user
 * Returns a Set of match IDs that have active bets and a map of matchId -> betId for linking
 */
export function useActiveBets() {
    const { user } = useAuth();
    const [activeBetMatchIds, setActiveBetMatchIds] = useState<Set<string>>(new Set());
    const [activeBetIdByMatchId, setActiveBetIdByMatchId] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setActiveBetMatchIds(new Set());
            setActiveBetIdByMatchId(new Map());
            setLoading(false);
            return;
        }

        const fetchActiveBets = async () => {
            try {
                const { data, error } = await supabase
                    .from('bets')
                    .select('id, match_id')
                    .eq('user_id', user.id)
                    .eq('status', 'active');

                if (error) {
                    console.error('Error fetching active bets:', error);
                    setActiveBetMatchIds(new Set());
                    setActiveBetIdByMatchId(new Map());
                } else {
                    const matchIds = new Set<string>();
                    const betIdByMatch = new Map<string, string>();
                    (data || []).forEach((bet: { id: string; match_id: string }) => {
                        matchIds.add(bet.match_id);
                        betIdByMatch.set(bet.match_id, bet.id);
                    });
                    setActiveBetMatchIds(matchIds);
                    setActiveBetIdByMatchId(betIdByMatch);
                }
            } catch (error) {
                console.error('Error in useActiveBets:', error);
                setActiveBetMatchIds(new Set());
                setActiveBetIdByMatchId(new Map());
            } finally {
                setLoading(false);
            }
        };

        fetchActiveBets();

        // Set up real-time subscription to listen for bet changes
        const channel = supabase
            .channel('active-bets-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bets',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    // Refetch when bets change
                    fetchActiveBets();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return { activeBetMatchIds, activeBetIdByMatchId, loading };
}
