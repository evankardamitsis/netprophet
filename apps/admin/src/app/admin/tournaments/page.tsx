import { Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';

export default function TournamentsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Tournaments</h1>
                <p className="text-gray-600 mt-2">
                    Manage tennis tournaments and events
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tournaments Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">
                        This page will contain tournament management functionality including:
                    </p>
                    <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
                        <li>Tournament creation and scheduling</li>
                        <li>Participant management</li>
                        <li>Bracket generation</li>
                        <li>Results tracking</li>
                        <li>Tournament statistics</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
} 