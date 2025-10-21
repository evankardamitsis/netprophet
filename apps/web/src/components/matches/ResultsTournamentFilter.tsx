'use client';

import { useDictionary } from '@/context/DictionaryContext';
import { useState, useMemo, useRef } from 'react';

interface MatchResult {
    id: string;
    tournament_name: string;
    category_name: string;
    player_a_name: string;
    player_a_ntrp: number;
    player_b_name: string;
    player_b_ntrp: number;
    winner_name: string;
    match_result: string;
    set1_score: string | null;
    set2_score: string | null;
    set3_score: string | null;
    set4_score: string | null;
    set5_score: string | null;
    set1_tiebreak_score: string | null;
    set2_tiebreak_score: string | null;
    set3_tiebreak_score: string | null;
    set4_tiebreak_score: string | null;
    set5_tiebreak_score: string | null;
    super_tiebreak_score: string | null;
    status: string;
    start_time: string;
    updated_at: string;
}

interface ResultsTournamentFilterProps {
    tournaments: string[];
    tournamentTotals: Record<string, number>;
    onTournamentSelect: (tournament: string | null) => void;
    selectedTournament: string | null;
}

export function ResultsTournamentFilter({ tournaments, tournamentTotals, onTournamentSelect, selectedTournament }: ResultsTournamentFilterProps) {
    const { dict } = useDictionary();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Sort tournaments alphabetically
    const sortedTournaments = useMemo(() => {
        return [...tournaments].sort();
    }, [tournaments]);

    // Calculate total matches across all tournaments
    const totalMatches = useMemo(() => {
        return Object.values(tournamentTotals).reduce((sum, count) => sum + count, 0);
    }, [tournamentTotals]);

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

    if (tournaments.length === 0) {
        return null; // Don't show filter if there are no tournaments
    }

    return (
        <div className="px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4">
            <div className="relative">
                {/* Navigation arrows row - only visible on large screens */}
                <div className="hidden lg:flex justify-end gap-2 mb-2">
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

                {/* Scrollable container */}
                <div
                    ref={scrollContainerRef}
                    className="flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    {/* All tournaments button */}
                    <button
                        onClick={() => onTournamentSelect(null)}
                        className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-medium transition-colors ${selectedTournament === null
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                            }`}
                    >
                        All Tournaments
                        <span className="ml-1.5 text-xs sm:text-sm opacity-75">({totalMatches})</span>
                    </button>

                    {/* Individual tournament buttons */}
                    {sortedTournaments.map((tournament) => (
                        <button
                            key={tournament}
                            onClick={() => onTournamentSelect(tournament)}
                            className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${selectedTournament === tournament
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                                }`}
                        >
                            {tournament}
                            <span className="ml-1.5 text-xs sm:text-sm opacity-75">({tournamentTotals[tournament] || 0})</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
