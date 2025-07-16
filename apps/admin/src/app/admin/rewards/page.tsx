import { Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';

export default function RewardsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Rewards</h1>
                <p className="text-gray-600 mt-2">
                    Manage rewards and points system
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Rewards Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">
                        This page will contain rewards management functionality including:
                    </p>
                    <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
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