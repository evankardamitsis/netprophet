import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RewardsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Rewards</h1>
                <p className="text-gray-400 mt-2">
                    Manage rewards and points system
                </p>
            </div>

            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white">Rewards Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-400">
                        This page will contain rewards management functionality including:
                    </p>
                    <ul className="list-disc list-inside mt-4 space-y-2 text-gray-400">
                        <li>Reward creation and configuration</li>
                        <li>Points system management</li>
                        <li>User reward history</li>
                        <li>Redemption tracking</li>
                        <li>Reward analytics and reports</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
} 