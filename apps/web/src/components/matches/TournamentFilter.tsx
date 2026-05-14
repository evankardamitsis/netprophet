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

    if (tournaments.length === 0) {
        return null; // Don't show filter if there are no tournaments
    }

    return (
        <div className="px-3 xs:px-4 sm:px-5 md:px-6 py-2">
            <div
                ref={scrollContainerRef}
                className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {/* All tournaments button */}
                <button
                    onClick={() => onTournamentSelect(null)}
                    className={[
                        "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-[7px]",
                        "rounded-full text-[13px] font-semibold border transition-all duration-150",
                        "whitespace-nowrap",
                        selectedTournament === null
                            ? "bg-[#FFD60A]/10 border-[#FFD60A]/30 text-[#FFD60A]"
                            : "bg-[#161F35] border-white/[0.06] text-[#94A3B8] hover:border-white/[0.12] hover:text-white",
                    ].join(" ")}
                >
                    {dict?.matches?.selectTournament || 'Όλα'}
                    <span className={[
                        "text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                        selectedTournament === null ? "bg-[#FFD60A]/20" : "bg-white/[0.08]",
                    ].join(" ")}>
                        {activeMatches.length}
                    </span>
                </button>

                {/* Individual tournament buttons */}
                {tournaments.map((tournament) => (
                    <button
                        key={tournament}
                        onClick={() => onTournamentSelect(tournament)}
                        className={[
                            "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-[7px]",
                            "rounded-full text-[13px] font-semibold border transition-all duration-150",
                            "whitespace-nowrap",
                            selectedTournament === tournament
                                ? "bg-[#FFD60A]/10 border-[#FFD60A]/30 text-[#FFD60A]"
                                : "bg-[#161F35] border-white/[0.06] text-[#94A3B8] hover:border-white/[0.12] hover:text-white",
                        ].join(" ")}
                    >
                        {tournament}
                        <span className={[
                            "text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                            selectedTournament === tournament ? "bg-[#FFD60A]/20" : "bg-white/[0.08]",
                        ].join(" ")}>
                            {tournamentCounts[tournament]}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
