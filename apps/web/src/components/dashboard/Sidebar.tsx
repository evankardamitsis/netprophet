'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@netprophet/ui';
import { Card as UiCard } from '@/components/ui/card';
import { MatchesList } from '@/components/MatchesList';

import { Match } from '@/types/dashboard';
import { useMatchSelect } from '@/context/MatchSelectContext';
import { useTheme } from '../Providers';
import style from 'styled-jsx/style';

// Icon components
function ChevronDownIcon() {
    return <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
}

function ChevronRightIcon() {
    return <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
}

function XIcon() {
    return <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
}

interface Tournament {
    id: number;
    name: string;
    status: 'active' | 'upcoming' | 'finished';
    matches: Match[];
}

interface SidebarProps {
    onClose: () => void;
    onMatchSelect?: (match: Match) => void;
    selectedMatchId?: number;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

// Enhanced mock data with start times and lock times
const mockTournaments: Tournament[] = [
    {
        id: 1,
        name: 'Roland Garros 2024',
        status: 'active',
        matches: [
            {
                id: 1,
                tournament: 'Roland Garros 2024',
                player1: { name: 'Rafael Nadal', country: '🇪🇸', ranking: 1, odds: 2.15 },
                player2: { name: 'Novak Djokovic', country: '🇷🇸', ranking: 2, odds: 1.85 },
                time: '14:00',
                court: 'Philippe-Chatrier',
                status: 'live',
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
                status: 'upcoming',
                points: 200,
                startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Starts in 2 hours
                lockTime: new Date(Date.now() + 1.5 * 60 * 60 * 1000), // Locks in 1.5 hours
                isLocked: false
            },
            {
                id: 3,
                tournament: 'Roland Garros 2024',
                player1: { name: 'Jannik Sinner', country: '🇮🇹', ranking: 5, odds: 1.95 },
                player2: { name: 'Alexander Zverev', country: '🇩🇪', ranking: 6, odds: 1.95 },
                time: '19:00',
                court: 'Court 1',
                status: 'upcoming',
                points: 180,
                startTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // Starts in 4 hours
                lockTime: new Date(Date.now() + 3.5 * 60 * 60 * 1000), // Locks in 3.5 hours
                isLocked: false
            },
        ]
    },
    {
        id: 2,
        name: 'Wimbledon 2024',
        status: 'upcoming',
        matches: [
            {
                id: 4,
                tournament: 'Wimbledon 2024',
                player1: { name: 'Andy Murray', country: '🇬🇧', ranking: 7, odds: 2.50 },
                player2: { name: 'Stefanos Tsitsipas', country: '🇬🇷', ranking: 8, odds: 1.60 },
                time: '13:00',
                court: 'Centre Court',
                status: 'upcoming',
                points: 150,
                startTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // Starts in 6 hours
                lockTime: new Date(Date.now() + 5.5 * 60 * 60 * 1000), // Locks in 5.5 hours
                isLocked: false
            },
            {
                id: 5,
                tournament: 'Wimbledon 2024',
                player1: { name: 'Roger Federer', country: '🇨🇭', ranking: 9, odds: 3.00 },
                player2: { name: 'Nick Kyrgios', country: '🇦🇺', ranking: 10, odds: 1.40 },
                time: '15:30',
                court: 'Court 1',
                status: 'upcoming',
                points: 120,
                startTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // Starts in 8 hours
                lockTime: new Date(Date.now() + 7.5 * 60 * 60 * 1000), // Locks in 7.5 hours
                isLocked: false
            },
        ]
    },
    {
        id: 3,
        name: 'US Open 2024',
        status: 'upcoming',
        matches: [
            {
                id: 6,
                tournament: 'US Open 2024',
                player1: { name: 'Daniil Medvedev', country: '🇷🇺', ranking: 4, odds: 1.80 },
                player2: { name: 'Andrey Rublev', country: '🇷🇺', ranking: 11, odds: 2.20 },
                time: '20:00',
                court: 'Arthur Ashe',
                status: 'upcoming',
                points: 100,
                startTime: new Date(Date.now() + 10 * 60 * 60 * 1000), // Starts in 10 hours
                lockTime: new Date(Date.now() + 9.5 * 60 * 60 * 1000), // Locks in 9.5 hours
                isLocked: false
            },
        ]
    },
    {
        id: 4,
        name: 'Australian Open 2024',
        status: 'finished',
        matches: [
            {
                id: 7,
                tournament: 'Australian Open 2024',
                player1: { name: 'Novak Djokovic', country: '🇷🇸', ranking: 2, odds: 1.50 },
                player2: { name: 'Stefanos Tsitsipas', country: '🇬🇷', ranking: 8, odds: 2.80 },
                time: '19:30',
                court: 'Rod Laver Arena',
                status: 'finished',
                points: 300,
                startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started 24 hours ago
                lockTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Already locked
                isLocked: true
            },
        ]
    }
];

// Countdown component
function CountdownTimer({ lockTime }: { lockTime: Date }) {
    const [timeLeft, setTimeLeft] = useState<number>(0);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = lockTime.getTime() - Date.now();
            return Math.max(0, difference);
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);

            if (newTimeLeft <= 0) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [lockTime]);

    const formatTime = (ms: number) => {
        if (ms <= 0) return 'LOCKED';

        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;

    };

    const isUrgent = timeLeft < 5 * 60 * 1000; // Less than 5 minutes
    const isVeryUrgent = timeLeft < 60 * 1000; // Less than 1 minute

    return (
        <div className={`text-xs font-mono ${isVeryUrgent ? 'text-red-400 animate-pulse' : isUrgent ? 'text-orange-400' : 'text-gray-400'}`}>
            {formatTime(timeLeft)}
        </div>
    );
}

// Live Match Banner component
function LiveMatchBanner({ matches }: { matches: Match[] }) {
    const liveMatches = matches.filter(match => match.status === 'live' && !match.isLocked);

    if (liveMatches.length === 0) return null;

    return (
        <div className="mb-4 p-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-dashed border-red-700/50 rounded-xl">
            <div className="flex items-center space-x-2 mb-3">
                <span className="text-lg">🔥</span>
                <span className="font-semibold text-red-300 tracking-wide">Live Matches</span>
                <Badge variant="destructive" className="text-xs bg-red-900/50 text-red-300 border border-red-500">
                    {liveMatches.length}
                </Badge>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
                {liveMatches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-red-700/40">
                        <div className="flex-1">
                            <div className="text-sm font-semibold text-yellow-200">
                                {match.player1.name.split(' ')[1]} vs {match.player2.name.split(' ')[1]}
                            </div>
                            <div className="text-xs text-slate-400">{match.court}</div>
                        </div>
                        <div className="text-right">
                            <CountdownTimer lockTime={match.lockTime} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function Sidebar({ onClose, sidebarOpen, setSidebarOpen, onMatchSelect: onMatchSelectProp }: SidebarProps) {
    const matchSelectFromContext = useMatchSelect();
    const onMatchSelect = onMatchSelectProp || matchSelectFromContext;
    const [expandedTournaments, setExpandedTournaments] = useState<Set<number>>(new Set([1])); // Default expand first tournament
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const { theme } = useTheme();

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const toggleTournament = (tournamentId: number) => {
        const newExpanded = new Set(expandedTournaments);
        if (newExpanded.has(tournamentId)) {
            newExpanded.delete(tournamentId);
        } else {
            newExpanded.add(tournamentId);
        }
        setExpandedTournaments(newExpanded);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'destructive';
            case 'upcoming':
                return 'secondary';
            case 'finished':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const getMatchStatusColor = (status: string) => {
        switch (status) {
            case 'live':
                return 'destructive';
            case 'upcoming':
                return 'secondary';
            case 'finished':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    // Get all matches for the live banner
    const allMatches = mockTournaments.flatMap(t => t.matches);

    return (
        <aside
            className={`relative h-full flex flex-col gap-6 p-4 transition-transform duration-300 ease-in-out
                ${theme === 'dark' ? 'bg-[#1F222A] border-r border-[#23262F]' : 'bg-gray-100 border-r border-gray-200'}
                min-w-full sm:min-w-[320px] md:min-w-[380px] lg:min-w-[420px] xl:min-w-[450px] max-w-full w-full
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                fixed top-0 left-0 z-40 xl:relative
            `}
            style={{ boxShadow: sidebarOpen ? '2px 0 8px rgba(0,0,0,0.04)' : 'none' }}
        >
            <Card className={`mt-4 p-2 flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-[#23262F]' : 'bg-white'} min-w-0 sm:min-w-[280px] md:min-w-[340px] lg:min-w-[400px]`}>
                <MatchesList onSelectMatch={onMatchSelect} />
            </Card>
            {/* Add match list or other sidebar content here, styled with Card if needed */}
        </aside>
    );
} 