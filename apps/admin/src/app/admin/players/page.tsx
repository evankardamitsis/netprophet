import { Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';

export default function PlayersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Players</h1>
                <p className="text-gray-600 mt-2">
                    Manage tennis players and their profiles
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Players Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">
                        This page will contain player management functionality including:
                    </p>
                    <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
                        <li>Player profiles and statistics</li>
                        <li>Ranking management</li>
                        <li>Performance tracking</li>
                        <li>Player search and filtering</li>
                        <li>Match history</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
} 