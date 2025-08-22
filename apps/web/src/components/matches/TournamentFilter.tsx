'use client';

import { Match } from '@/types/dashboard';
import { useDictionary } from '@/context/DictionaryContext';
import { useState, useMemo } from 'react';

interface TournamentFilterProps {
    matches: Match[];
    onTournamentSelect: (tournament: string | null) => void;
    selectedTournament: string | null;
}

export function TournamentFilter({ matches, onTournamentSelect, selectedTournament }: TournamentFilterProps) {
    const { dict } = useDictionary();

    // Extract unique tournaments from matches
    const tournaments = useMemo(() => {
        const uniqueTournaments = Array.from(new Set(matches.map(match => match.tournament)));
        return uniqueTournaments.sort();
    }, [matches]);

    // Count matches per tournament
    const tournamentCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        matches.forEach(match => {
            counts[match.tournament] = (counts[match.tournament] || 0) + 1;
        });
        return counts;
    }, [matches]);

    if (tournaments.length <= 1) {
        return null; // Don't show filter if there's only one tournament or no tournaments
    }

    return (
        <div className="px-3 xs:px-4 sm:px-5 md:px-6 py-4">
            <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* All tournaments button */}
                <button
                    onClick={() => onTournamentSelect(null)}
                    className={`flex-shrink-0 px-3 xs:px-4 py-1.5 xs:py-2 rounded-full text-xs xs:text-sm font-medium transition-colors ${selectedTournament === null
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                        }`}
                >
                    All Tournaments
                    <span className="ml-1.5 text-xs opacity-75">({matches.length})</span>
                </button>

                {/* Individual tournament buttons */}
                {tournaments.map((tournament) => (
                    <button
                        key={tournament}
                        onClick={() => onTournamentSelect(tournament)}
                        className={`flex-shrink-0 px-3 xs:px-4 py-1.5 xs:py-2 rounded-full text-xs xs:text-sm font-medium transition-colors whitespace-nowrap ${selectedTournament === tournament
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                            }`}
                    >
                        {tournament}
                        <span className="ml-1.5 text-xs opacity-75">({tournamentCounts[tournament]})</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
