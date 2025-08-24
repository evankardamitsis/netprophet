'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calculator, TrendingUp, AlertTriangle, DollarSign, Coins, Users, Target, Gift } from 'lucide-react';

interface TopUpTier {
    id: string;
    name: string;
    price: number;
    coins: number;
    distribution: number; // Percentage of purchases (0-100)
}

interface EconomyInputs {
    monthlyActiveUsers: number;
    payingUsersPercent: number;
    averagePurchasesPerUser: number;
    topUpTiers: TopUpTier[];
    dailyLoginReward: number;
    maxLoginDays: number;
    registerBonus: number;
    streakBonusDays: number;
    streakBonusAmount: number;
    // Prediction behavior
    averagePredictionsPerUser: number;
    averageBetSize: number;
    winRate: number;
    averageWinningOdds: number;
}

interface EconomyResults {
    totalRevenue: number;
    totalCoinsInjected: number;
    coinsFromPurchases: number;
    coinsFromBonuses: number;
    coinsFromWinnings: number;
    averageCoinsPerUser: number;
    averageEuroPerCoin: number;
    suggestedBurnTarget: number;
    inflationRisk: 'low' | 'medium' | 'high';
    burnRatio: number;
    payingUsers: number;
    totalBonusesGiven: number;
    totalWinningsGiven: number;
}

const defaultTopUpTiers: TopUpTier[] = [
    { id: '1', name: 'Starter Pack', price: 1.99, coins: 350, distribution: 25 },
    { id: '2', name: 'Basic Pack', price: 4.99, coins: 900, distribution: 35 },
    { id: '3', name: 'Pro Pack', price: 9.99, coins: 1800, distribution: 25 },
    { id: '4', name: 'Champion Pack', price: 19.99, coins: 3600, distribution: 10 },
    { id: '5', name: 'Legend Pack', price: 39.99, coins: 7000, distribution: 5 },
];

export default function EconomyCalculatorPage() {
    const [inputs, setInputs] = useState<EconomyInputs>({
        monthlyActiveUsers: 2000,
        payingUsersPercent: 15,
        averagePurchasesPerUser: 2.5,
        topUpTiers: defaultTopUpTiers,
        dailyLoginReward: 30,
        maxLoginDays: 20,
        registerBonus: 100,
        streakBonusDays: 7,
        streakBonusAmount: 100,
        // Prediction behavior defaults
        averagePredictionsPerUser: 20,
        averageBetSize: 100,
        winRate: 45,
        averageWinningOdds: 2.5,
    });

    const [results, setResults] = useState<EconomyResults | null>(null);

    const updateTopUpTier = (id: string, field: keyof TopUpTier, value: string | number) => {
        setInputs(prev => ({
            ...prev,
            topUpTiers: prev.topUpTiers.map(tier =>
                tier.id === id ? { ...tier, [field]: value } : tier
            )
        }));
    };

    const addTopUpTier = () => {
        const newId = (inputs.topUpTiers.length + 1).toString();
        setInputs(prev => {
            const newTiers = [...prev.topUpTiers, {
                id: newId,
                name: `New Tier ${newId}`,
                price: 0,
                coins: 0,
                distribution: 0
            }];

            // Auto-balance distribution
            const equalShare = 100 / newTiers.length;
            newTiers.forEach(tier => {
                tier.distribution = equalShare;
            });

            return {
                ...prev,
                topUpTiers: newTiers
            };
        });
    };

    const removeTopUpTier = (id: string) => {
        if (inputs.topUpTiers.length > 1) {
            setInputs(prev => {
                const newTiers = prev.topUpTiers.filter(tier => tier.id !== id);

                // Auto-balance distribution
                const equalShare = 100 / newTiers.length;
                newTiers.forEach(tier => {
                    tier.distribution = equalShare;
                });

                return {
                    ...prev,
                    topUpTiers: newTiers
                };
            });
        }
    };

    const calculateEconomy = () => {
        const payingUsers = Math.round(inputs.monthlyActiveUsers * (inputs.payingUsersPercent / 100));
        const totalPurchases = payingUsers * inputs.averagePurchasesPerUser;

        // Calculate revenue and coins from purchases
        let totalRevenue = 0;
        let coinsFromPurchases = 0;

        // Use distribution percentages for realistic modeling
        inputs.topUpTiers.forEach(tier => {
            const tierPurchases = totalPurchases * (tier.distribution / 100);
            totalRevenue += tier.price * tierPurchases;
            coinsFromPurchases += tier.coins * tierPurchases;
        });

        // Calculate bonuses
        const totalBonusesGiven = inputs.monthlyActiveUsers * (
            inputs.registerBonus + // Register bonus for all users
            (inputs.dailyLoginReward * inputs.maxLoginDays) + // Daily login rewards
            (inputs.streakBonusAmount * Math.floor(inputs.maxLoginDays / inputs.streakBonusDays)) // Streak bonuses
        );

        // Calculate prediction winnings
        const totalPredictions = inputs.monthlyActiveUsers * inputs.averagePredictionsPerUser;
        const winningPredictions = totalPredictions * (inputs.winRate / 100);
        const totalWinningsGiven = winningPredictions * inputs.averageBetSize * (inputs.averageWinningOdds - 1); // Net winnings (odds - 1)
        const coinsFromWinnings = totalWinningsGiven;

        const totalCoinsInjected = coinsFromPurchases + totalBonusesGiven + coinsFromWinnings;
        const averageCoinsPerUser = totalCoinsInjected / inputs.monthlyActiveUsers;
        const averageEuroPerCoin = totalRevenue / totalCoinsInjected;
        const suggestedBurnTarget = totalCoinsInjected * 0.85; // 85% burn target
        const burnRatio = (suggestedBurnTarget / totalCoinsInjected) * 100;

        // Determine inflation risk
        let inflationRisk: 'low' | 'medium' | 'high' = 'low';
        if (burnRatio < 70) {
            inflationRisk = 'high';
        } else if (burnRatio < 80) {
            inflationRisk = 'medium';
        }

        setResults({
            totalRevenue,
            totalCoinsInjected,
            coinsFromPurchases,
            coinsFromBonuses: totalBonusesGiven,
            coinsFromWinnings,
            averageCoinsPerUser,
            averageEuroPerCoin,
            suggestedBurnTarget,
            inflationRisk,
            burnRatio,
            payingUsers,
            totalBonusesGiven,
            totalWinningsGiven,
        });
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    };

    const formatCurrency = (num: number) => {
        return '€' + num.toFixed(2);
    };

    const chartData = results ? [
        { name: 'Purchases', value: results.coinsFromPurchases, color: '#10b981' },
        { name: 'Bonuses', value: results.coinsFromBonuses, color: '#f59e0b' },
        { name: 'Winnings', value: results.coinsFromWinnings, color: '#8b5cf6' },
    ] : [];

    const userBreakdownData = results ? [
        { name: 'Paying Users', value: results.payingUsers, color: '#3b82f6' },
        { name: 'Non-Paying Users', value: inputs.monthlyActiveUsers - results.payingUsers, color: '#6b7280' },
    ] : [];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Economy Calculator</h1>
                <p className="text-gray-600 mt-2">
                    Simulate your coin economy to test pricing, bonus structure and coin burn targets.
                </p>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 font-medium">
                        The calculator essentially answers: &quot;If I set these prices and bonuses, what will my revenue be and is my economy sustainable?&quot; 🚀
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Input Form - Left Column */}
                <div className="xl:col-span-2 space-y-6">
                    {/* User Metrics & Prediction Behavior */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                User Behavior
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* User Metrics */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">User Metrics</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="mau">Monthly Active Users</Label>
                                        <Input
                                            id="mau"
                                            type="number"
                                            value={inputs.monthlyActiveUsers}
                                            onChange={(e) => setInputs(prev => ({ ...prev, monthlyActiveUsers: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="paying">Paying Users %</Label>
                                        <Input
                                            id="paying"
                                            type="number"
                                            value={inputs.payingUsersPercent}
                                            onChange={(e) => setInputs(prev => ({ ...prev, payingUsersPercent: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="purchases">Avg. Purchases per User</Label>
                                        <Input
                                            id="purchases"
                                            type="number"
                                            step="0.1"
                                            value={inputs.averagePurchasesPerUser}
                                            onChange={(e) => setInputs(prev => ({ ...prev, averagePurchasesPerUser: Number(e.target.value) }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Prediction Behavior */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">Prediction Behavior</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="predictions">Avg. Predictions per User</Label>
                                        <Input
                                            id="predictions"
                                            type="number"
                                            value={inputs.averagePredictionsPerUser}
                                            onChange={(e) => setInputs(prev => ({ ...prev, averagePredictionsPerUser: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="betSize">Average Bet Size (coins)</Label>
                                        <Input
                                            id="betSize"
                                            type="number"
                                            value={inputs.averageBetSize}
                                            onChange={(e) => setInputs(prev => ({ ...prev, averageBetSize: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="winRate">Win Rate (%)</Label>
                                        <Input
                                            id="winRate"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={inputs.winRate}
                                            onChange={(e) => setInputs(prev => ({ ...prev, winRate: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="odds">Average Winning Odds</Label>
                                        <Input
                                            id="odds"
                                            type="number"
                                            step="0.1"
                                            min="1"
                                            value={inputs.averageWinningOdds}
                                            onChange={(e) => setInputs(prev => ({ ...prev, averageWinningOdds: Number(e.target.value) }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top-Up Tiers */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Top-Up Tiers
                                </CardTitle>
                                <Button onClick={addTopUpTier} size="sm">
                                    Add Tier
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                {inputs.topUpTiers.map((tier) => (
                                    <div key={tier.id} className="grid grid-cols-5 gap-3 items-end">
                                        <div>
                                            <Label>Tier Name</Label>
                                            <Input
                                                value={tier.name}
                                                onChange={(e) => updateTopUpTier(tier.id, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Price (€)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={tier.price}
                                                onChange={(e) => updateTopUpTier(tier.id, 'price', Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <Label>Coins</Label>
                                            <Input
                                                type="number"
                                                value={tier.coins}
                                                onChange={(e) => updateTopUpTier(tier.id, 'coins', Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <Label>Distribution (%)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={tier.distribution}
                                                onChange={(e) => updateTopUpTier(tier.id, 'distribution', Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeTopUpTier(tier.id)}
                                                disabled={inputs.topUpTiers.length === 1}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Distribution Validation */}
                            {(() => {
                                const totalDistribution = inputs.topUpTiers.reduce((sum, tier) => sum + tier.distribution, 0);
                                return (
                                    <div className={`text-sm p-2 rounded ${totalDistribution === 100 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        Total Distribution: {totalDistribution.toFixed(1)}% {totalDistribution === 100 ? '✅' : '❌ (Should equal 100%)'}
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>

                    {/* Coin Bonuses */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gift className="h-5 w-5" />
                                Coin Bonuses
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="daily">Daily Login Reward</Label>
                                    <Input
                                        id="daily"
                                        type="number"
                                        value={inputs.dailyLoginReward}
                                        onChange={(e) => setInputs(prev => ({ ...prev, dailyLoginReward: Number(e.target.value) }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="maxDays">Max Login Days</Label>
                                    <Input
                                        id="maxDays"
                                        type="number"
                                        value={inputs.maxLoginDays}
                                        onChange={(e) => setInputs(prev => ({ ...prev, maxLoginDays: Number(e.target.value) }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="register">Register Bonus</Label>
                                    <Input
                                        id="register"
                                        type="number"
                                        value={inputs.registerBonus}
                                        onChange={(e) => setInputs(prev => ({ ...prev, registerBonus: Number(e.target.value) }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="streakDays">Streak Bonus Every X Days</Label>
                                    <Input
                                        id="streakDays"
                                        type="number"
                                        value={inputs.streakBonusDays}
                                        onChange={(e) => setInputs(prev => ({ ...prev, streakBonusDays: Number(e.target.value) }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="streakAmount">Streak Bonus Amount</Label>
                                    <Input
                                        id="streakAmount"
                                        type="number"
                                        value={inputs.streakBonusAmount}
                                        onChange={(e) => setInputs(prev => ({ ...prev, streakBonusAmount: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button onClick={calculateEconomy} className="w-full cursor-pointer">
                        Calculate Economy
                    </Button>
                </div>

                {/* Results Section - Right Column */}
                <div className="space-y-6">
                    {results && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(results.totalRevenue)}</div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-600">Total Coins Injected</CardTitle>
                                        <Coins className="h-4 w-4 text-blue-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-gray-900">{formatNumber(results.totalCoinsInjected)}</div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-600">Coins from Winnings</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-purple-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-gray-900">{formatNumber(results.coinsFromWinnings)}</div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-600">Avg. Coins/User</CardTitle>
                                        <Users className="h-4 w-4 text-purple-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-gray-900">{formatNumber(results.averageCoinsPerUser)}</div>
                                    </CardContent>
                                </Card>


                            </div>

                            {/* Burn Target & Risk */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Target className="h-5 w-5" />
                                        Burn Analysis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Suggested Burn Target:</span>
                                        <span className="font-semibold">{formatNumber(results.suggestedBurnTarget)} coins</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Burn Ratio:</span>
                                        <Badge
                                            variant={results.inflationRisk === 'high' ? 'destructive' : results.inflationRisk === 'medium' ? 'secondary' : 'default'}
                                        >
                                            {results.burnRatio.toFixed(1)}%
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Inflation Risk:</span>
                                        <Badge
                                            variant={results.inflationRisk === 'high' ? 'destructive' : results.inflationRisk === 'medium' ? 'secondary' : 'default'}
                                        >
                                            {results.inflationRisk.toUpperCase()}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Charts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-semibold">Coins Distribution</CardTitle>
                                        <p className="text-xs text-gray-600">How coins enter the economy</p>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={chartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={60}
                                                    dataKey="value"
                                                    label={false}
                                                >
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: any) => [formatNumber(value), '']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Legend */}
                                        <div className="mt-4 space-y-2">
                                            {chartData.map((entry, index) => (
                                                <div key={index} className="flex items-center space-x-2 text-sm">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: entry.color }}
                                                    />
                                                    <span className="text-gray-700">{entry.name}</span>
                                                    <span className="text-gray-500 ml-auto">
                                                        {formatNumber(entry.value)} coins
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-semibold">User Monetization</CardTitle>
                                        <p className="text-xs text-gray-600">User payment behavior breakdown</p>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={userBreakdownData}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={60}
                                                    dataKey="value"
                                                    label={false}
                                                >
                                                    {userBreakdownData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: any) => [formatNumber(value), '']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Legend */}
                                        <div className="mt-4 space-y-2">
                                            {userBreakdownData.map((entry, index) => (
                                                <div key={index} className="flex items-center space-x-2 text-sm">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: entry.color }}
                                                    />
                                                    <span className="text-gray-700">{entry.name}</span>
                                                    <span className="text-gray-500 ml-auto">
                                                        {formatNumber(entry.value)} users
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Warning Alert */}
                            {results.burnRatio < 80 && (
                                <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-red-700">
                                        <strong>Warning:</strong> Your burn ratio is below 80% ({results.burnRatio.toFixed(1)}%).
                                        Consider increasing coin burn mechanisms to prevent inflation.
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div >
    );
}
