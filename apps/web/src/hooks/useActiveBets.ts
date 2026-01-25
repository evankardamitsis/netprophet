import { useState, useEffect } from 'react';
import { supabase } from '@netprophet/lib';
import { useAuth } from './useAuth';

/**
 * Hook to fetch active bets for the current user
 * Returns a Set of match IDs that have active bets
 */
export function useActiveBets() {
    const { user } = useAuth();
    const [activeBetMatchIds, setActiveBetMatchIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setActiveBetMatchIds(new Set());
            setLoading(false);
            return;
        }

        const fetchActiveBets = async () => {
            try {
                const { data, error } = await supabase
                    .from('bets')
                    .select('match_id')
                    .eq('user_id', user.id)
                    .eq('status', 'active');

                if (error) {
                    console.error('Error fetching active bets:', error);
                    setActiveBetMatchIds(new Set());
                } else {
                    const matchIds = new Set(data?.map(bet => bet.match_id) || []);
                    setActiveBetMatchIds(matchIds);
                }
            } catch (error) {
                console.error('Error in useActiveBets:', error);
                setActiveBetMatchIds(new Set());
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

    return { activeBetMatchIds, loading };
}
