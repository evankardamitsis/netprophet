'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Calendar, Coins, Star } from 'lucide-react';
import { DAILY_REWARDS_CONSTANTS } from '@netprophet/lib';

export default function DailyRewardsPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Daily Rewards System</h1>
                <p className="text-gray-600 mt-2">
                    Configure and monitor the daily rewards system for user engagement.
                </p>
            </div>

            {/* Current System Overview */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Gift className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl text-blue-900">Current Reward Structure</CardTitle>
                            <p className="text-blue-700">Active daily rewards system</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Coins className="h-5 w-5 text-blue-600" />
                                <h3 className="font-medium text-blue-900">Daily Login Reward</h3>
                            </div>
                            <p className="text-sm text-blue-700 mb-2">{DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD} coins every day</p>
                            <Badge variant="default" className="text-xs">Active</Badge>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Star className="h-5 w-5 text-blue-600" />
                                <h3 className="font-medium text-blue-900">Welcome Bonus</h3>
                            </div>
                            <p className="text-sm text-blue-700 mb-2">{DAILY_REWARDS_CONSTANTS.WELCOME_BONUS} coins (first time only)</p>
                            <Badge variant="default" className="text-xs">Active</Badge>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                <h3 className="font-medium text-blue-900">7-Day Streak Bonus</h3>
                            </div>
                            <p className="text-sm text-blue-700 mb-2">{DAILY_REWARDS_CONSTANTS.SEVEN_DAY_STREAK_BONUS} coins every {DAILY_REWARDS_CONSTANTS.STREAK_MILESTONE_INTERVAL} days</p>
                            <Badge variant="default" className="text-xs">Active</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* System Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900">How It Works</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-green-600 text-xs font-bold">1</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">Daily Login Reward</h4>
                                    <p className="text-sm text-gray-600">Users get {DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD} coins every day they log in, regardless of streak.</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-blue-600 text-xs font-bold">2</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">Welcome Bonus</h4>
                                    <p className="text-sm text-gray-600">New users get a one-time {DAILY_REWARDS_CONSTANTS.WELCOME_BONUS} coin welcome bonus on their first login.</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-purple-600 text-xs font-bold">3</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">7-Day Streak Bonus</h4>
                                    <p className="text-sm text-gray-600">Every {DAILY_REWARDS_CONSTANTS.STREAK_MILESTONE_INTERVAL}th consecutive day, users get an additional {DAILY_REWARDS_CONSTANTS.SEVEN_DAY_STREAK_BONUS} coin bonus.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900">Example Rewards</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-900">Day 1 (First Login)</h4>
                                <p className="text-sm text-gray-600">{DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD} coins (daily) + {DAILY_REWARDS_CONSTANTS.WELCOME_BONUS} coins (welcome) = <strong>{DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD + DAILY_REWARDS_CONSTANTS.WELCOME_BONUS} coins</strong></p>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-900">Day 7 (7-Day Streak)</h4>
                                <p className="text-sm text-gray-600">{DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD} coins (daily) + {DAILY_REWARDS_CONSTANTS.SEVEN_DAY_STREAK_BONUS} coins (streak) = <strong>{DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD + DAILY_REWARDS_CONSTANTS.SEVEN_DAY_STREAK_BONUS} coins</strong></p>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-900">Regular Day</h4>
                                <p className="text-sm text-gray-600">{DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD} coins (daily) = <strong>{DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD} coins</strong></p>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-900">Day 14 (14-Day Streak)</h4>
                                <p className="text-sm text-gray-600">{DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD} coins (daily) + {DAILY_REWARDS_CONSTANTS.SEVEN_DAY_STREAK_BONUS} coins (streak) = <strong>{DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD + DAILY_REWARDS_CONSTANTS.SEVEN_DAY_STREAK_BONUS} coins</strong></p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Configuration Note */}
            <Card className="bg-yellow-50 border-yellow-200">
                <CardHeader>
                    <CardTitle className="text-yellow-900">Configuration Note</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-yellow-800 text-sm">
                        The daily rewards system is configured through database functions and Edge Functions.
                        Changes to reward amounts require updating the database functions in the migrations.
                        Constants are defined in <code className="bg-yellow-100 px-1 rounded">@netprophet/lib</code> for reference.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
