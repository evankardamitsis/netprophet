import { Leaderboard } from '@/components/matches/Leaderboard';

export default function LeaderboardPage() {
    return (
        <div className="flex flex-col flex-1 min-h-0 w-full overflow-auto p-4 sm:p-6 lg:p-8">
            <Leaderboard />
        </div>
    );
} 