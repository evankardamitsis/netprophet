import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MatchesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Matches</h1>
                <p className="text-gray-600 mt-2">
                    Manage tennis matches and results
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Matches Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">
                        This page will contain match management functionality including:
                    </p>
                    <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
                        <li>Match scheduling and creation</li>
                        <li>Live match monitoring</li>
                        <li>Score tracking and updates</li>
                        <li>Match results and statistics</li>
                        <li>Match history and analytics</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
} 