'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@netprophet/lib';
import { Button } from '@netprophet/ui';

interface Match {
    id: string;
    player_a: string;
    player_b: string;
    played_at: string;
    prob_a: number | null;
    prob_b: number | null;
    points_fav: number | null;
    points_dog: number | null;
    a_score: number | null;
    b_score: number | null;
}

async function fetchMatches(): Promise<Match[]> {
    const { data, error } = await supabase
        .from('matches')
        .select(`
      id,
      player_a,
      player_b,
      played_at,
      prob_a,
      prob_b,
      points_fav,
      points_dog,
      a_score,
      b_score
    `)
        .order('played_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

export function MatchesList() {
    const { data: matches, isLoading, error } = useQuery({
        queryKey: ['matches'],
        queryFn: fetchMatches,
    });

    if (isLoading) return <div>Loading matches...</div>;
    if (error) return <div>Error loading matches: {error.message}</div>;

    return (
        <div className="h-full overflow-y-auto space-y-4">
            {matches?.map((match) => (
                <div
                    key={match.id}
                    className="border rounded-lg p-4 bg-white shadow-sm"
                >
                    <div className="flex justify-between items-center">
                        <div className="flex-1">
                            <div className="text-lg font-semibold">
                                {match.player_a} vs {match.player_b}
                            </div>
                            <div className="text-sm text-gray-600">
                                {new Date(match.played_at).toLocaleDateString()}
                            </div>
                            {match.a_score !== null && match.b_score !== null && (
                                <div className="text-sm font-medium">
                                    Score: {match.a_score} - {match.b_score}
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            {match.prob_a && match.prob_b && (
                                <div className="text-sm">
                                    <div>Player A: {(match.prob_a * 100).toFixed(1)}%</div>
                                    <div>Player B: {(match.prob_b * 100).toFixed(1)}%</div>
                                </div>
                            )}
                            {match.points_fav && match.points_dog && (
                                <div className="text-xs text-gray-500 mt-1">
                                    <div>Fav: {match.points_fav}pts</div>
                                    <div>Dog: {match.points_dog}pts</div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                        <Button size="sm" variant="outline">
                            Predict Player A
                        </Button>
                        <Button size="sm" variant="outline">
                            Predict Player B
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
} 