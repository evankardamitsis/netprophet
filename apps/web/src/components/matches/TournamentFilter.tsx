'use client';

import { Match } from '@/types/dashboard';
import { useDictionary } from '@/context/DictionaryContext';
import { useState, useMemo, useRef } from 'react';

interface TournamentFilterProps {
    matches: Match[];
    onTournamentSelect: (tournament: string | null) => void;
    selectedTournament: string | null;
}

export function TournamentFilter({ matches, onTournamentSelect, selectedTournament }: TournamentFilterProps) {
    const { dict } = useDictionary();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Filter matches to only include live and upcoming ones
    const activeMatches = useMemo(() => {
        return matches.filter(match =>
            match.status === 'live' ||
            match.status === 'upcoming' ||
            match.status === 'scheduled'

        );
    }, [matches]);

    // Extract unique tournaments from active matches only
    const tournaments = useMemo(() => {
        const uniqueTournaments = Array.from(new Set(activeMatches.map(match => match.tournament)));
        return uniqueTournaments.sort();
    }, [activeMatches]);

    // Count active matches per tournament
    const tournamentCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        activeMatches.forEach(match => {
            counts[match.tournament] = (counts[match.tournament] || 0) + 1;
        });
        return counts;
    }, [activeMatches]);

    // Carousel navigation functions
    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
        }
    };

    if (tournaments.length <= 1) {
        return null; // Don't show filter if there's only one tournament or no tournaments
    }

    return (
        <div className="px-3 xs:px-4 sm:px-5 md:px-6 py-2 sm:py-1">
            {/* Label and Navigation */}
            <div className="flex items-center justify-between mb-2 sm:mb-1">
                <h3 className="text-sm sm:text-base font-medium text-gray-300">
                    {dict?.matches?.selectTournament || 'Select Tournament'}
                </h3>
                {/* Navigation arrows - only visible on large screens */}
                <div className="hidden lg:flex gap-2">
                    <button
                        onClick={scrollLeft}
                        className="w-8 h-8 text-white flex items-center justify-center transition-all duration-200 hover:text-gray-300 hover:scale-110 hover:bg-slate-700/50 rounded-full"
                        aria-label="Scroll left"
                    >
                        ←
                    </button>
                    <button
                        onClick={scrollRight}
                        className="w-8 h-8 text-white flex items-center justify-center transition-all duration-200 hover:text-gray-300 hover:scale-110 hover:bg-slate-700/50 rounded-full"
                        aria-label="Scroll right"
                    >
                        →
                    </button>
                </div>
            </div>

            <div className="relative">

                {/* Scrollable container */}
                <div
                    ref={scrollContainerRef}
                    className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    {/* All tournaments button */}
                    <button
                        onClick={() => onTournamentSelect(null)}
                        className={`flex-shrink-0 px-3 xs:px-4 py-1.5 xs:py-2 rounded-full text-sm xs:text-base font-medium transition-colors ${selectedTournament === null
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                            }`}
                    >
                        All Tournaments
                        <span className="ml-1.5 text-xs opacity-75">({activeMatches.length})</span>
                    </button>

                    {/* Individual tournament buttons */}
                    {tournaments.map((tournament) => (
                        <button
                            key={tournament}
                            onClick={() => onTournamentSelect(tournament)}
                            className={`flex-shrink-0 px-3 xs:px-4 py-1.5 xs:py-2 rounded-full text-sm xs:text-base font-medium transition-colors whitespace-nowrap ${selectedTournament === tournament
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
        </div>
    );
}
