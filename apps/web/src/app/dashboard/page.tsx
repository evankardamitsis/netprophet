'use client';

import { useState } from 'react';
import { MatchesGrid } from '@/components/dashboard/MatchesGrid';
import { MatchDetail } from '@/components/dashboard/MatchDetail';
import { Match } from '@/types/dashboard';
import { WelcomeBonus } from '@/components/dashboard/WelcomeBonus';

export default function DashboardPage() {
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleSelectMatch = (match: Match) => {
        setSelectedMatch(match);
    };

    const handleBackToMatches = () => {
        setSelectedMatch(null);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <WelcomeBonus />
            {selectedMatch ? (
                <MatchDetail
                    match={selectedMatch}
                    onAddToPredictionSlip={() => { }}
                    onBack={handleBackToMatches}
                    sidebarOpen={sidebarOpen}
                />
            ) : (
                <MatchesGrid
                    onSelectMatch={handleSelectMatch}
                    sidebarOpen={sidebarOpen}
                />
            )}
        </div>
    );
} 