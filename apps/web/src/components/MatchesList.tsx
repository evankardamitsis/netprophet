'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@netprophet/lib';
import { Button } from '@netprophet/ui';
import { useTheme } from './Providers';

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

// Demo mock data (copied from MatchesGrid.tsx, correct structure)
export const mockMatches = [
    {
        id: 1,
        tournament: 'Roland Garros 2024',
        player1: { name: 'Rafael Nadal', country: '🇪🇸', ranking: 1, odds: 2.15 },
        player2: { name: 'Novak Djokovic', country: '🇷🇸', ranking: 2, odds: 1.85 },
        time: '14:00',
        court: 'Philippe-Chatrier',
        status: 'live' as 'live',
        points: 250,
        startTime: new Date(Date.now() - 30 * 60 * 1000), // Started 30 minutes ago
        lockTime: new Date(Date.now() + 5 * 60 * 1000), // Locks in 5 minutes
        isLocked: false
    },
    {
        id: 2,
        tournament: 'Roland Garros 2024',
        player1: { name: 'Carlos Alcaraz', country: '🇪🇸', ranking: 3, odds: 1.65 },
        player2: { name: 'Daniil Medvedev', country: '🇷🇺', ranking: 4, odds: 2.35 },
        time: '16:30',
        court: 'Suzanne-Lenglen',
        status: 'upcoming' as 'upcoming',
        points: 200,
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Starts in 2 hours
        lockTime: new Date(Date.now() + 1.5 * 60 * 60 * 1000), // Locks in 1.5 hours
        isLocked: false
    },
    {
        id: 3,
        tournament: 'Wimbledon 2024',
        player1: { name: 'Jannik Sinner', country: '🇮🇹', ranking: 5, odds: 1.95 },
        player2: { name: 'Alexander Zverev', country: '🇩🇪', ranking: 6, odds: 1.95 },
        time: '13:00',
        court: 'Centre Court',
        status: 'upcoming' as 'upcoming',
        points: 180,
        startTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // Starts in 4 hours
        lockTime: new Date(Date.now() + 3.5 * 60 * 60 * 1000), // Locks in 3.5 hours
        isLocked: false
    },
    {
        id: 4,
        tournament: 'Wimbledon 2024',
        player1: { name: 'Andy Murray', country: '🇬🇧', ranking: 7, odds: 2.50 },
        player2: { name: 'Stefanos Tsitsipas', country: '🇬🇷', ranking: 8, odds: 1.60 },
        time: '15:30',
        court: 'Court 1',
        status: 'upcoming' as 'upcoming',
        points: 150,
        startTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // Starts in 6 hours
        lockTime: new Date(Date.now() + 5.5 * 60 * 60 * 1000), // Locks in 5.5 hours
        isLocked: false
    },
    {
        id: 5,
        tournament: 'US Open 2024',
        player1: { name: 'Daniil Medvedev', country: '🇷🇺', ranking: 4, odds: 1.80 },
        player2: { name: 'Andrey Rublev', country: '🇷🇺', ranking: 9, odds: 2.20 },
        time: '20:00',
        court: 'Arthur Ashe',
        status: 'upcoming' as 'upcoming',
        points: 120,
        startTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // Starts in 8 hours
        lockTime: new Date(Date.now() + 7.5 * 60 * 60 * 1000), // Locks in 7.5 hours
        isLocked: false
    },
    {
        id: 6,
        tournament: 'Roland Garros 2024',
        player1: { name: 'Casper Ruud', country: '🇳🇴', ranking: 10, odds: 2.80 },
        player2: { name: 'Hubert Hurkacz', country: '🇵🇱', ranking: 11, odds: 1.40 },
        time: '18:00',
        court: 'Court 2',
        status: 'upcoming' as 'upcoming',
        points: 100,
        startTime: new Date(Date.now() + 10 * 60 * 60 * 1000), // Starts in 10 hours
        lockTime: new Date(Date.now() + 9.5 * 60 * 60 * 1000), // Locks in 9.5 hours
        isLocked: false
    }
];

interface MatchesListProps {
    onSelectMatch?: (match: any) => void;
}

function Countdown({ targetTime, label }: { targetTime: Date; label: string }) {
    const [timeLeft, setTimeLeft] = useState<number>(targetTime.getTime() - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(targetTime.getTime() - Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, [targetTime]);

    if (timeLeft <= 0) return <span className="text-xs text-red-500 font-bold">LOCKED</span>;

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return (
        <span className="text-xs text-gray-500">
            {label}: {hours > 0 ? `${hours}h ` : ''}{minutes}m {seconds}s
        </span>
    );
}

export function MatchesList({ onSelectMatch }: MatchesListProps) {
    const matches = mockMatches;
    const isLoading = false;
    const error = null;
    const { theme } = useTheme();

    if (isLoading) return <div>Loading matches...</div>;
    if (error) return <div>Error loading matches.</div>;

    const liveMatches = matches.filter(m => m.status === 'live');
    const upcomingMatches = matches.filter(m => m.status === 'upcoming');

    return (
        <div className="h-full overflow-y-auto space-y-6 px-2">
            {liveMatches.length > 0 && (
                <div>
                    <div className={`text-sm font-bold mb-3 flex items-center gap-2 tracking-wide uppercase ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full animate-pulse ${theme === 'dark' ? 'bg-red-400' : 'bg-red-500'}`} /> Live Matches
                    </div>
                    <div className="space-y-3">
                        {liveMatches.map(match => (
                            <div
                                key={match.id}
                                className={`border rounded-xl p-4 shadow-sm flex flex-col gap-2 cursor-pointer transition-all duration-150 ${theme === 'dark' ? 'border-red-400 bg-[#23262F] hover:bg-red-900/10' : 'border-red-200 bg-white hover:bg-red-50'}`}
                                onClick={() => onSelectMatch?.(match)}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex flex-row flex-wrap items-center gap-2 flex-1 min-w-0">
                                        <span className={`font-semibold text-base whitespace-normal ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{match.player1.name} <span className="text-xs font-normal text-gray-500">({match.player1.odds})</span></span>
                                        <span className="text-xs font-bold text-gray-400">vs</span>
                                        <span className={`font-semibold text-base whitespace-normal ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{match.player2.name} <span className="text-xs font-normal text-gray-500">({match.player2.odds})</span></span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-red-400/20 text-red-300' : 'bg-red-100 text-red-600'}`}>LIVE</span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-gray-500 gap-3">
                                    <span className="truncate">{match.tournament} • {match.court}</span>
                                    <span>{match.time}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs gap-3 mt-1">
                                    <Countdown targetTime={match.lockTime} label="Lock in" />
                                    <span className={`text-gray-400`}>Started {Math.floor((Date.now() - match.startTime.getTime()) / 60000)} min ago</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {upcomingMatches.length > 0 && (
                <div>
                    <div className={`text-sm font-bold mb-3 tracking-wide uppercase ${theme === 'dark' ? 'text-blue-400' : 'text-gray-700'}`}>Upcoming Matches</div>
                    <div className="space-y-3">
                        {upcomingMatches.map(match => (
                            <div
                                key={match.id}
                                className={`border rounded-xl p-4 shadow-sm flex flex-col gap-2 cursor-pointer transition-all duration-150 ${theme === 'dark' ? 'border-blue-400 bg-[#23262F] hover:bg-blue-900/10' : 'border-blue-200 bg-white hover:bg-blue-50'}`}
                                onClick={() => onSelectMatch?.(match)}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex flex-row flex-wrap items-center gap-2 flex-1 min-w-0">
                                        <span className={`font-semibold text-base whitespace-normal ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{match.player1.name} <span className="text-xs font-normal text-gray-500">({match.player1.odds})</span></span>
                                        <span className="text-xs font-bold text-gray-400">vs</span>
                                        <span className={`font-semibold text-base whitespace-normal ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{match.player2.name} <span className="text-xs font-normal text-gray-500">({match.player2.odds})</span></span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-blue-400/20 text-blue-300' : 'bg-blue-100 text-blue-600'}`}>UPCOMING</span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-gray-500 gap-3">
                                    <span className="truncate">{match.tournament} • {match.court}</span>
                                    <span>{match.time}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs gap-3 mt-1">
                                    <Countdown targetTime={match.startTime} label="Starts in" />
                                    <span className={`text-gray-400`}>{new Date(match.startTime).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {matches.length === 0 && (
                <div className={`text-center py-12 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No matches available</div>
            )}
        </div>
    );
} 