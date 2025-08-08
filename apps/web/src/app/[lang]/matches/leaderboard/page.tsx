import { Leaderboard } from '@/components/matches/Leaderboard';

export default function LeaderboardPage() {
    return (
        <div className="flex flex-col flex-1 min-h-0 w-full overflow-auto p-0 sm:p-4">
            <Leaderboard />
        </div>
    );
} 