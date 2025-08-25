'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Trophy, Award, Target } from 'lucide-react';

export default function AchievementsPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Achievements</h1>
                <p className="text-gray-600 mt-2">
                    Set up achievement systems and reward milestones for user engagement.
                </p>
            </div>

            {/* Coming Soon Card */}
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <Star className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl text-yellow-900">Coming Soon</CardTitle>
                            <p className="text-yellow-700">Achievement system is under development</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-yellow-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Trophy className="h-5 w-5 text-yellow-600" />
                                <h3 className="font-medium text-yellow-900">Milestones</h3>
                            </div>
                            <p className="text-sm text-yellow-700">Configure achievement milestones</p>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-yellow-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Award className="h-5 w-5 text-yellow-600" />
                                <h3 className="font-medium text-yellow-900">Rewards</h3>
                            </div>
                            <p className="text-sm text-yellow-700">Set up achievement rewards</p>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-yellow-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Target className="h-5 w-5 text-yellow-600" />
                                <h3 className="font-medium text-yellow-900">Progress</h3>
                            </div>
                            <p className="text-sm text-yellow-700">Track user progress</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
