'use client';

import { useState } from 'react';
import { MatchesGrid } from '@/components/matches/MatchesGrid';
import { MatchDetail } from '@/components/matches/MatchDetail';
import { Match } from '@/types/dashboard';
import { WelcomeBonus } from '@/components/matches/WelcomeBonus';
import { usePredictionSlip } from '@/context/PredictionSlipContext';

export default function DashboardPage() {
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { slipCollapsed } = usePredictionSlip();

    const handleSelectMatch = (match: Match) => {
        setSelectedMatch(match);
    };

    const handleBackToMatches = () => {
        setSelectedMatch(null);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <WelcomeBonus />
            {selectedMatch ? (
                <MatchDetail
                    match={selectedMatch}
                    onAddToPredictionSlip={() => { }}
                    onBack={handleBackToMatches}
                    sidebarOpen={sidebarOpen}
                />
            ) : (
                <div className="flex-1 overflow-hidden">
                    <MatchesGrid
                        onSelectMatch={handleSelectMatch}
                        sidebarOpen={sidebarOpen}
                        slipCollapsed={slipCollapsed}
                    />
                </div>
            )}
        </div>
    );
} 