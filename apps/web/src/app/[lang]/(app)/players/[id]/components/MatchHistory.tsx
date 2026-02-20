'use client';

import { Player } from '@netprophet/lib';
import { Card, CardContent } from '@netprophet/ui';
import { useDictionary } from '@/context/DictionaryContext';

interface MatchHistoryProps {
    player: Player;
    matches: any[];
}

export function MatchHistory({ player, matches }: MatchHistoryProps) {
    const { dict } = useDictionary();

    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
            <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-6">
                    <h3 className="text-xl font-black text-white mb-6 drop-shadow-lg">
                        {(dict?.matches?.matchTypeSingles || 'Singles')} • {dict?.athletes?.last5 || 'Last 5 Matches'}
                    </h3>

                    {matches.length > 0 ? (
                        <div className="space-y-3">
                            {matches.map((match: any) => {
                                const playerUuid = player.id;
                                const isPlayerA = match.player_a_id === playerUuid;
                                const opponent = isPlayerA ? match.player_b : match.player_a;
                                const opponentName = `${opponent?.first_name || ''} ${opponent?.last_name || ''}`.trim();
                                const matchResult = Array.isArray(match.match_results) ? match.match_results[0] : match.match_results;

                                let isWinner: boolean;
                                if (match.winner_id != null) {
                                    isWinner = match.winner_id === playerUuid;
                                } else if (matchResult?.set1_score) {
                                    const sets = [matchResult.set1_score, matchResult.set2_score, matchResult.set3_score].filter(Boolean);
                                    let setsWonByA = 0, setsWonByB = 0;
                                    for (const s of sets) {
                                        const [a, b] = (s as string).split('-').map(Number);
                                        if (a != null && b != null) {
                                            if (a > b) setsWonByA++;
                                            else if (b > a) setsWonByB++;
                                        }
                                    }
                                    isWinner = isPlayerA ? setsWonByA > setsWonByB : setsWonByB > setsWonByA;
                                } else {
                                    isWinner = false;
                                }

                                const rawSets = [matchResult?.set1_score, matchResult?.set2_score, matchResult?.set3_score].filter(Boolean) as string[];
                                const score = rawSets.length
                                    ? rawSets.map((s) => {
                                        const [a, b] = s.split('-').map(Number);
                                        if (a == null || b == null) return s;
                                        return isPlayerA ? `${a}-${b}` : `${b}-${a}`;
                                    }).join(', ')
                                    : 'N/A';

                                const tournament = Array.isArray(match.tournaments) ? match.tournaments[0] : match.tournaments;
                                const tournamentName = tournament?.name || 'Tournament';
                                const category = Array.isArray(match.tournament_categories) ? match.tournament_categories[0] : match.tournament_categories;
                                const categoryName = category?.name;
                                const roundName = match.round;

                                return (
                                    <div
                                        key={match.id}
                                        className={`p-4 rounded-xl border-2 transition-all ${isWinner
                                            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50'
                                            : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${isWinner
                                                    ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                                                    : 'bg-gradient-to-br from-red-500 to-pink-500 text-white'
                                                    }`}>
                                                    {isWinner ? 'W' : 'L'}
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold text-sm">
                                                        vs {opponentName}
                                                    </div>
                                                    <div className="text-purple-300 text-xs">
                                                        {tournamentName}
                                                        {(categoryName || roundName) && (
                                                            <span className="text-purple-400/80">
                                                                {[roundName, categoryName].filter(Boolean).map((x) => ` • ${x}`).join('')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-black text-sm">
                                                    {score}
                                                </div>
                                                <div className="text-purple-300 text-xs">
                                                    {new Date(match.start_time).toLocaleDateString('en-GB', {
                                                        day: 'numeric',
                                                        month: 'short'
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex gap-3 justify-center">
                            {player.last5.map((result, idx) => (
                                <div
                                    key={idx}
                                    className={`w-14 h-14 rounded-full text-lg font-black flex items-center justify-center shadow-lg transform hover:scale-110 transition-all ${result === 'W'
                                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                                        : 'bg-gradient-to-br from-red-500 to-pink-500 text-white'
                                        }`}
                                >
                                    {result}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
