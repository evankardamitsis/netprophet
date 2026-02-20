'use client';

import { Player } from '@netprophet/lib';
import { Card, CardContent } from '@netprophet/ui';
import { useDictionary } from '@/context/DictionaryContext';

interface DoublesSectionProps {
    player: Player;
    matches: any[];
}

export function DoublesSection({ player, matches }: DoublesSectionProps) {
    const { dict } = useDictionary();

    const hasDoublesMatches = ((player.doublesWins ?? 0) + (player.doublesLosses ?? 0)) > 0;

    if (!hasDoublesMatches) return null;

    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
            <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-6">
                    <h3 className="text-xl font-black text-white mb-6 drop-shadow-lg">
                        {dict?.matches?.matchTypeDoubles || 'Doubles'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="text-2xl font-black text-white">
                                {(player.doublesWins ?? 0)}-{(player.doublesLosses ?? 0)}
                            </div>
                            <div className="text-purple-300 font-bold">
                                {dict?.athletes?.record || 'Record'}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-2xl font-black text-white">
                                {player.doublesCurrentStreak ?? 0} {(player.doublesStreakType ?? 'W') === 'W'
                                    ? (player.doublesCurrentStreak === 1 ? (dict?.athletes?.win || 'Win') : (dict?.athletes?.wins || 'Wins'))
                                    : (player.doublesCurrentStreak === 1 ? (dict?.athletes?.loss || 'Loss') : (dict?.athletes?.losses || 'Losses'))
                                }
                            </div>
                            <div className="text-purple-300 font-bold">
                                {dict?.athletes?.currentStreak || 'Current Streak'}
                            </div>
                        </div>
                    </div>
                    <h4 className="text-sm font-bold text-purple-300 mb-3">
                        {dict?.athletes?.last5 || 'Last 5 Matches'}
                    </h4>
                    {matches.length > 0 ? (
                        <div className="space-y-3">
                            {matches.map((match: any) => {
                                const playerUuid = player.id;
                                const isOnTeamA = match.player_a1_id === playerUuid || match.player_a2_id === playerUuid;
                                const matchResult = Array.isArray(match.match_results) ? match.match_results[0] : match.match_results;
                                const winnerTeam = matchResult?.match_winner_team;
                                const isWinner = winnerTeam === (isOnTeamA ? 'team_a' : 'team_b');

                                const opponents = isOnTeamA
                                    ? [match.player_b1, match.player_b2]
                                    : [match.player_a1, match.player_a2];
                                const opponentNames = opponents
                                    .filter(Boolean)
                                    .map((p: any) => `${p?.first_name || ''} ${p?.last_name || ''}`.trim())
                                    .filter(Boolean);
                                const opponentLabel = opponentNames.length > 0
                                    ? `vs ${opponentNames.join(' & ')}`
                                    : 'vs Opponents';

                                const rawSets = [matchResult?.set1_score, matchResult?.set2_score, matchResult?.set3_score].filter(Boolean) as string[];
                                const score = rawSets.length
                                    ? rawSets.map((s) => {
                                        const [a, b] = s.split('-').map(Number);
                                        if (a == null || b == null) return s;
                                        return isOnTeamA ? `${a}-${b}` : `${b}-${a}`;
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
                                                        {opponentLabel}
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
                                                <div className="text-white font-black text-sm">{score}</div>
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
                            {(player.doublesLast5 || []).map((result: string, idx: number) => (
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
