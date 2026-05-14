'use client';

import { Player } from '@netprophet/lib';
import { useDictionary } from '@/context/DictionaryContext';

interface MatchHistoryProps {
    player: Player;
    matches: any[];
}

export function MatchHistory({ player, matches }: MatchHistoryProps) {
    const { dict } = useDictionary();

    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#161F35] border border-white/[0.06] p-5">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
            <h3 className="text-sm font-black text-white mb-4">
                {(dict?.matches?.matchTypeSingles || 'Singles')} · {dict?.athletes?.last5 || 'Τελευταίοι 5'}
            </h3>

            {matches.length > 0 ? (
                <div className="space-y-2">
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
                                if (a != null && b != null) { if (a > b) setsWonByA++; else if (b > a) setsWonByB++; }
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
                                return isPlayerA ? `${a}–${b}` : `${b}–${a}`;
                            }).join(', ')
                            : '—';

                        const tournament = Array.isArray(match.tournaments) ? match.tournaments[0] : match.tournaments;
                        const tournamentName = tournament?.name || '';
                        const roundName = match.round;

                        return (
                            <div
                                key={match.id}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                                style={isWinner
                                    ? { background: 'rgba(0,230,118,0.06)', borderColor: 'rgba(0,230,118,0.2)' }
                                    : { background: 'rgba(255,69,69,0.06)', borderColor: 'rgba(255,69,69,0.2)' }
                                }
                            >
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
                                    style={isWinner
                                        ? { background: 'rgba(0,230,118,0.2)', color: '#00E676' }
                                        : { background: 'rgba(255,69,69,0.2)', color: '#FF4545' }
                                    }
                                >
                                    {isWinner ? 'W' : 'L'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">vs {opponentName}</p>
                                    <p className="text-[10px] text-[#4B5975] truncate">
                                        {[tournamentName, roundName].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs font-black text-white tabular-nums">{score}</p>
                                    <p className="text-[10px] text-[#4B5975]">
                                        {new Date(match.start_time).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex gap-2 justify-center py-2">
                    {player.last5.map((result, idx) => (
                        <div
                            key={idx}
                            className="w-10 h-10 rounded-full text-sm font-black flex items-center justify-center"
                            style={result === 'W'
                                ? { background: 'rgba(0,230,118,0.15)', color: '#00E676', border: '1px solid rgba(0,230,118,0.3)' }
                                : { background: 'rgba(255,69,69,0.15)', color: '#FF4545', border: '1px solid rgba(255,69,69,0.3)' }
                            }
                        >
                            {result}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
