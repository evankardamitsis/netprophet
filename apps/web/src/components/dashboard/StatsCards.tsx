'use client';

import { Card, CardContent, CardTitle } from '@/components/ui/card';

import { UserStats } from '@/types/dashboard';

// Icon components
function TrophyIcon() {
    return <svg className="h-8 w-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
}

function TargetIcon() {
    return <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
}

function CalendarIcon() {
    return <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
}

function UsersIcon() {
    return <svg className="h-8 w-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
}

interface StatsCardsProps {
    stats: UserStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="hover:scale-105 hover:shadow-accent/30 transition-transform duration-200">
                <CardContent>
                    <CardTitle>Total Points</CardTitle>
                    <div className="text-3xl font-extrabold text-accent mt-2">{stats.totalPoints.toLocaleString()}</div>
                </CardContent>
            </Card>

            <Card className="hover:scale-105 hover:shadow-accent/30 transition-transform duration-200">
                <CardContent>
                    <CardTitle>Correct Picks</CardTitle>
                    <div className="text-3xl font-extrabold text-green-400 mt-2">{stats.correctPicks}</div>
                </CardContent>
            </Card>

            <Card className="hover:scale-105 hover:shadow-accent/30 transition-transform duration-200">
                <CardContent>
                    <CardTitle>Current Streak</CardTitle>
                    <div className="text-3xl font-extrabold text-yellow-400 mt-2">{stats.activeStreak}</div>
                </CardContent>
            </Card>

            <Card className="hover:scale-105 hover:shadow-accent/30 transition-transform duration-200">
                <CardContent>
                    <CardTitle>Ranking</CardTitle>
                    <div className="text-3xl font-extrabold text-blue-400 mt-2">#{stats.ranking}</div>
                </CardContent>
            </Card>
        </div>
    );
} 