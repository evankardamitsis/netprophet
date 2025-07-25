import { Leaderboard } from '@/components/dashboard/Leaderboard';

export default function LeaderboardPage() {
    return (
        <div className="flex flex-col flex-1 min-h-0 w-full overflow-auto p-6">
            <Leaderboard />
        </div>
    );
} 