'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@netprophet/ui';

interface RewardItem {
    id: number;
    title: string;
    description: string;
    image: string;
    points: number;
    category: 'merchandise' | 'experience' | 'badge';
    available: boolean;
}

const mockRewards: RewardItem[] = [
    {
        id: 1,
        title: 'NetProphet Cap',
        description: 'Exclusive branded cap with embroidered logo. Perfect for showing off your prediction skills!',
        image: '🎾',
        points: 500,
        category: 'merchandise',
        available: true
    },
    {
        id: 2,
        title: 'Tournament Entry',
        description: 'Free entry to the next major tournament prediction contest. Compete with the best!',
        image: '🏆',
        points: 1000,
        category: 'experience',
        available: true
    },
    {
        id: 3,
        title: 'Gold Badge',
        description: 'Prestigious gold badge for your profile. Unlock exclusive features and recognition.',
        image: '⭐',
        points: 750,
        category: 'badge',
        available: true
    }
];

interface RewardShopProps {
    userPoints?: number;
    onRedeem?: (reward: RewardItem) => void;
}

export function RewardShop({ userPoints = 1250, onRedeem }: RewardShopProps) {
    const handleRedeem = (reward: RewardItem) => {
        if (userPoints >= reward.points) {
            onRedeem?.(reward);
            // You can add a success notification here
            console.log(`Redeemed: ${reward.title}`);
        } else {
            // You can add an error notification here
            console.log('Not enough points!');
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'merchandise':
                return 'bg-blue-100 text-blue-800';
            case 'experience':
                return 'bg-green-100 text-green-800';
            case 'badge':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'merchandise':
                return 'Merchandise';
            case 'experience':
                return 'Experience';
            case 'badge':
                return 'Badge';
            default:
                return 'Other';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Reward Shop</h2>
                    <p className="text-gray-600 mt-1">Redeem your points for exclusive rewards</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Your Points</div>
                    <div className="text-2xl font-bold text-blue-600">{userPoints} π</div>
                </div>
            </div>

            {/* Rewards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockRewards.map((reward) => {
                    const canAfford = userPoints >= reward.points;

                    return (
                        <Card key={reward.id} className="hover:shadow-lg transition-shadow duration-200">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="text-4xl">{reward.image}</div>
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{reward.title}</CardTitle>
                                            <Badge
                                                className={`text-xs mt-1 ${getCategoryColor(reward.category)}`}
                                            >
                                                {getCategoryLabel(reward.category)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                    {reward.description}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-500">Cost:</span>
                                        <span className={`font-bold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                                            {reward.points} π
                                        </span>
                                    </div>

                                    <Button
                                        size="sm"
                                        onClick={() => handleRedeem(reward)}
                                        disabled={!canAfford || !reward.available}
                                        className={canAfford
                                            ? 'bg-blue-600 hover:bg-blue-700'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }
                                    >
                                        {canAfford ? 'Redeem' : 'Not Enough Points'}
                                    </Button>
                                </div>

                                {!canAfford && (
                                    <div className="mt-2 text-xs text-red-600">
                                        Need {reward.points - userPoints} more points
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Empty State */}
            {mockRewards.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎁</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Rewards Available</h3>
                    <p className="text-gray-600">Check back later for new rewards!</p>
                </div>
            )}

            {/* Info Section */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                    <div className="text-blue-600 text-xl">ℹ️</div>
                    <div>
                        <h4 className="font-semibold text-blue-900 mb-1">How it works</h4>
                        <p className="text-sm text-blue-800">
                            Earn points by making accurate predictions. The more correct picks you make,
                            the more points you accumulate. Use your points to redeem exclusive rewards
                            and show off your prediction skills!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
} 