'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Calendar, Clock, Users } from 'lucide-react';

export default function DailyRewardsPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Daily Rewards</h1>
                <p className="text-gray-600 mt-2">
                    Configure login streaks, daily bonuses, and user retention incentives.
                </p>
            </div>

            {/* Coming Soon Card */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Gift className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl text-blue-900">Coming Soon</CardTitle>
                            <p className="text-blue-700">Daily rewards system is under development</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                <h3 className="font-medium text-blue-900">Login Streaks</h3>
                            </div>
                            <p className="text-sm text-blue-700">Configure consecutive login bonuses</p>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Clock className="h-5 w-5 text-blue-600" />
                                <h3 className="font-medium text-blue-900">Daily Bonuses</h3>
                            </div>
                            <p className="text-sm text-blue-700">Set up daily coin rewards</p>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                <h3 className="font-medium text-blue-900">Retention</h3>
                            </div>
                            <p className="text-sm text-blue-700">User engagement tracking</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
