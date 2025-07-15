'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@netprophet/ui';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

// Icon components
const ChevronDownIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const XIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

import { Match } from '@/types/dashboard';

interface Tournament {
    id: number;
    name: string;
    status: 'active' | 'upcoming' | 'finished';
    matches: Match[];
}

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onMatchSelect: (match: Match) => void;
    selectedMatchId?: number;
}

// Mock data
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
                points: 250
            },
            {
                id: 2,
                tournament: 'Roland Garros 2024',
                player1: { name: 'Carlos Alcaraz', country: '🇪🇸', ranking: 3, odds: 1.65 },
                player2: { name: 'Daniil Medvedev', country: '🇷🇺', ranking: 4, odds: 2.35 },
                time: '16:30',
                court: 'Suzanne-Lenglen',
                status: 'upcoming',
                points: 200
            },
            {
                id: 3,
                tournament: 'Roland Garros 2024',
                player1: { name: 'Jannik Sinner', country: '🇮🇹', ranking: 5, odds: 1.95 },
                player2: { name: 'Alexander Zverev', country: '🇩🇪', ranking: 6, odds: 1.95 },
                time: '19:00',
                court: 'Court 1',
                status: 'upcoming',
                points: 180
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
                points: 150
            },
            {
                id: 5,
                tournament: 'Wimbledon 2024',
                player1: { name: 'Roger Federer', country: '🇨🇭', ranking: 9, odds: 3.00 },
                player2: { name: 'Nick Kyrgios', country: '🇦🇺', ranking: 10, odds: 1.40 },
                time: '15:30',
                court: 'Court 1',
                status: 'upcoming',
                points: 120
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
                points: 100
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
                points: 300
            },
        ]
    }
];

export function Sidebar({ isOpen, onClose, onMatchSelect, selectedMatchId }: SidebarProps) {
    const [expandedTournaments, setExpandedTournaments] = useState<Set<number>>(new Set([1])); // Default expand first tournament

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

    return (
        <div className={`
            fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:top-0 lg:bottom-0 lg:flex-shrink-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
            <div className="flex flex-col h-full">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Tournaments</h2>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 rounded-md hover:bg-gray-100"
                    >
                        <XIcon />
                    </button>
                </div>

                {/* Tournament List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {mockTournaments.map((tournament) => (
                        <Card key={tournament.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardHeader
                                className="pb-2 cursor-pointer"
                                onClick={() => toggleTournament(tournament.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        {expandedTournaments.has(tournament.id) ? (
                                            <ChevronDownIcon />
                                        ) : (
                                            <ChevronRightIcon />
                                        )}
                                        <CardTitle className="text-sm font-medium">{tournament.name}</CardTitle>
                                    </div>
                                    <Badge
                                        variant={getStatusColor(tournament.status)}
                                        className="text-xs"
                                    >
                                        {tournament.status === 'active' ? 'LIVE' : tournament.status.toUpperCase()}
                                    </Badge>
                                </div>
                            </CardHeader>

                            {expandedTournaments.has(tournament.id) && (
                                <CardContent className="pt-0">
                                    <div className="space-y-2">
                                        {tournament.matches.map((match) => (
                                            <div
                                                key={match.id}
                                                className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedMatchId === match.id
                                                    ? 'bg-blue-50 border border-blue-200'
                                                    : 'bg-gray-50 hover:bg-gray-100'
                                                    }`}
                                                onClick={() => onMatchSelect(match)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {match.player1.name} vs {match.player2.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">{match.court}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end space-y-1">
                                                        <Badge
                                                            variant={getMatchStatusColor(match.status)}
                                                            className="text-xs"
                                                        >
                                                            {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
                                                        </Badge>
                                                        <span className="text-xs text-gray-500">{match.time}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500 text-center">
                        {mockTournaments.filter(t => t.status === 'active').length} active tournaments
                    </div>
                </div>
            </div>
        </div>
    );
} 