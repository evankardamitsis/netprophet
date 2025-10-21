'use client';

import { Match } from '@/types/dashboard';
import { LiveMatchesGrid } from './LiveMatchesGrid';
import { MatchesTable } from './MatchesTable';

interface AllMatchesProps {
    liveMatches: Match[];
    upcomingMatches: Match[];
    onSelectMatch?: (match: Match) => void;
    sidebarOpen?: boolean;
    slipCollapsed?: boolean;
}

export function AllMatches({
    liveMatches,
    upcomingMatches,
    onSelectMatch,
    sidebarOpen = true,
    slipCollapsed
}: AllMatchesProps) {
    return (
        <div className="flex flex-col w-full">
            {/* Live Matches Section - Hidden on mobile */}
            <div className="hidden lg:block">
                <LiveMatchesGrid
                    liveMatches={liveMatches}
                    sidebarOpen={sidebarOpen}
                    slipCollapsed={slipCollapsed}
                />
            </div>

            {/* Upcoming Matches Section */}
            {upcomingMatches.length > 0 && (
                <div className="pb-6">
                    <MatchesTable
                        matches={upcomingMatches}
                        onSelectMatch={onSelectMatch}
                        sidebarOpen={sidebarOpen}
                        slipCollapsed={slipCollapsed}
                    />
                </div>
            )}
        </div>
    );
}