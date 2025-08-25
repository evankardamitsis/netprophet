'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Medal, Calendar, Users } from 'lucide-react';

export default function LeaderboardRewardsPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Leaderboard Rewards</h1>
                <p className="text-gray-600 mt-2">
                    Configure weekly and monthly leaderboard prizes and competitions.
                </p>
            </div>

            {/* Coming Soon Card */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Target className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl text-green-900">Coming Soon</CardTitle>
                            <p className="text-green-700">Leaderboard rewards system is under development</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-green-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Medal className="h-5 w-5 text-green-600" />
                                <h3 className="font-medium text-green-900">Weekly Prizes</h3>
                            </div>
                            <p className="text-sm text-green-700">Configure weekly leaderboard rewards</p>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-green-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Calendar className="h-5 w-5 text-green-600" />
                                <h3 className="font-medium text-green-900">Monthly Prizes</h3>
                            </div>
                            <p className="text-sm text-green-700">Set up monthly competition rewards</p>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-green-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Users className="h-5 w-5 text-green-600" />
                                <h3 className="font-medium text-green-900">Competitions</h3>
                            </div>
                            <p className="text-sm text-green-700">Manage special competitions</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
