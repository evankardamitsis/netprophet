'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@netprophet/ui';

interface RewardItem {
    id: number;
    title: string;
    description: string;
    image: string;
    points: number;
    category: 'merchandise' | 'experience' | 'badge' | 'premium' | 'boost' | 'exclusive';
    available: boolean;
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
    discount?: number;
    featured?: boolean;
}

const mockRewards: RewardItem[] = [
    // Premium Features
    {
        id: 1,
        title: 'Pro Predictor Pass',
        description: 'Unlock advanced analytics, detailed stats, and premium prediction tools for 30 days',
        image: '🔮',
        points: 2000,
        category: 'premium',
        available: true,
        rarity: 'epic',
        featured: true
    },
    {
        id: 2,
        title: 'VIP Tournament Access',
        description: 'Exclusive access to private tournaments with higher stakes and better rewards',
        image: '👑',
        points: 3500,
        category: 'premium',
        available: true,
        rarity: 'legendary',
        featured: true
    },
    {
        id: 3,
        title: 'Double Points Boost',
        description: 'Earn 2x points on all predictions for the next 7 days',
        image: '⚡',
        points: 800,
        category: 'boost',
        available: true,
        rarity: 'rare'
    },
    {
        id: 4,
        title: 'Streak Protector',
        description: 'Protect your prediction streak from one wrong pick',
        image: '🛡️',
        points: 600,
        category: 'boost',
        available: true,
        rarity: 'rare'
    },
    {
        id: 5,
        title: 'Early Access Pass',
        description: 'Get early access to new features and tournaments before everyone else',
        image: '🚀',
        points: 1200,
        category: 'exclusive',
        available: true,
        rarity: 'epic'
    },
    // Merchandise
    {
        id: 6,
        title: 'NetProphet Cap',
        description: 'Exclusive branded cap with embroidered logo. Perfect for showing off your prediction skills!',
        image: '🎾',
        points: 500,
        category: 'merchandise',
        available: true,
        rarity: 'common',
        discount: 20
    },
    {
        id: 7,
        title: 'Prediction Master T-Shirt',
        description: 'Premium cotton t-shirt with unique NetProphet design. Limited edition!',
        image: '👕',
        points: 750,
        category: 'merchandise',
        available: true,
        rarity: 'rare'
    },
    {
        id: 8,
        title: 'Tennis Court Hoodie',
        description: 'Comfortable hoodie perfect for watching matches and making predictions',
        image: '🧥',
        points: 1200,
        category: 'merchandise',
        available: true,
        rarity: 'epic'
    },
    // Experiences
    {
        id: 9,
        title: 'Tournament Entry',
        description: 'Free entry to the next major tournament prediction contest. Compete with the best!',
        image: '🏆',
        points: 1000,
        category: 'experience',
        available: true,
        rarity: 'rare'
    },
    {
        id: 10,
        title: 'Meet & Greet Pass',
        description: 'Exclusive meet & greet with tennis pros at upcoming tournaments',
        image: '🤝',
        points: 2500,
        category: 'experience',
        available: true,
        rarity: 'legendary'
    },
    {
        id: 11,
        title: 'Prediction Workshop',
        description: 'Join our expert prediction workshop to improve your skills',
        image: '📚',
        points: 800,
        category: 'experience',
        available: true,
        rarity: 'rare'
    },
    // Badges
    {
        id: 12,
        title: 'Gold Badge',
        description: 'Prestigious gold badge for your profile. Unlock exclusive features and recognition.',
        image: '⭐',
        points: 750,
        category: 'badge',
        available: true,
        rarity: 'epic'
    },
    {
        id: 13,
        title: 'Diamond Badge',
        description: 'Ultra-rare diamond badge. Only the elite predictors earn this honor.',
        image: '💎',
        points: 1500,
        category: 'badge',
        available: true,
        rarity: 'legendary'
    },
    {
        id: 14,
        title: 'Prediction Master',
        description: 'Special badge for achieving 90%+ accuracy in a tournament',
        image: '🎯',
        points: 2000,
        category: 'badge',
        available: true,
        rarity: 'legendary'
    },
    // Exclusive Items
    {
        id: 15,
        title: 'Custom Profile Theme',
        description: 'Unlock a custom profile theme with animated elements and special effects',
        image: '🎨',
        points: 900,
        category: 'exclusive',
        available: true,
        rarity: 'epic'
    },
    {
        id: 16,
        title: 'Prediction History Export',
        description: 'Download your complete prediction history with detailed analytics',
        image: '📊',
        points: 400,
        category: 'exclusive',
        available: true,
        rarity: 'common'
    }
];

interface RewardShopProps {
    userPoints?: number;
    onRedeem?: (reward: RewardItem) => void;
}

export function RewardShop({ userPoints = 1250, onRedeem }: RewardShopProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'points' | 'rarity' | 'name'>('points');

    const handleRedeem = (reward: RewardItem) => {
        if (userPoints >= reward.points) {
            onRedeem?.(reward);
            console.log(`Redeemed: ${reward.title}`);
        } else {
            console.log('Not enough points!');
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'merchandise':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'experience':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'badge':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'premium':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'boost':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'exclusive':
                return 'bg-pink-100 text-pink-800 border-pink-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
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
            case 'premium':
                return 'Premium';
            case 'boost':
                return 'Boost';
            case 'exclusive':
                return 'Exclusive';
            default:
                return 'Other';
        }
    };

    const getRarityColor = (rarity?: string) => {
        switch (rarity) {
            case 'common':
                return 'border-gray-300 bg-gray-50';
            case 'rare':
                return 'border-blue-300 bg-blue-50';
            case 'epic':
                return 'border-purple-300 bg-purple-50';
            case 'legendary':
                return 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50';
            default:
                return 'border-gray-300 bg-gray-50';
        }
    };

    const getRarityLabel = (rarity?: string) => {
        switch (rarity) {
            case 'common':
                return 'Common';
            case 'rare':
                return 'Rare';
            case 'epic':
                return 'Epic';
            case 'legendary':
                return 'Legendary';
            default:
                return 'Common';
        }
    };

    const filteredRewards = mockRewards
        .filter(reward => selectedCategory === 'all' || reward.category === selectedCategory)
        .sort((a, b) => {
            if (sortBy === 'points') return a.points - b.points;
            if (sortBy === 'rarity') {
                const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
                return (rarityOrder[a.rarity || 'common'] || 0) - (rarityOrder[b.rarity || 'common'] || 0);
            }
            return a.title.localeCompare(b.title);
        });

    const categories = [
        { id: 'all', label: 'All Items', count: mockRewards.length },
        { id: 'premium', label: 'Premium', count: mockRewards.filter(r => r.category === 'premium').length },
        { id: 'boost', label: 'Boosts', count: mockRewards.filter(r => r.category === 'boost').length },
        { id: 'merchandise', label: 'Merchandise', count: mockRewards.filter(r => r.category === 'merchandise').length },
        { id: 'experience', label: 'Experiences', count: mockRewards.filter(r => r.category === 'experience').length },
        { id: 'badge', label: 'Badges', count: mockRewards.filter(r => r.category === 'badge').length },
        { id: 'exclusive', label: 'Exclusive', count: mockRewards.filter(r => r.category === 'exclusive').length },
    ];

    return (
        <div className="space-y-8">
            {/* Header with Points Display */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold mb-2">🎁 Reward Shop</h2>
                            <p className="text-blue-100">Redeem your points for exclusive rewards and premium features</p>
                        </div>
                        <div className="text-right">
                            <div className="text-blue-100 text-sm">Your Balance</div>
                            <div className="text-4xl font-bold flex items-center gap-2">
                                <span className="text-yellow-300">💰</span>
                                {userPoints.toLocaleString()} π
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === category.id
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {category.label}
                            <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                {category.count}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="points">Points (Low to High)</option>
                        <option value="rarity">Rarity</option>
                        <option value="name">Name</option>
                    </select>
                </div>
            </div>

            {/* Featured Items */}
            {selectedCategory === 'all' && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-2xl">⭐</span>
                        Featured Items
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {mockRewards.filter(r => r.featured).map((reward) => {
                            const canAfford = userPoints >= reward.points;
                            return (
                                <Card key={reward.id} className={`group relative overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${getRarityColor(reward.rarity)} ${reward.featured ? 'border-yellow-400 shadow-xl' : ''}`}>
                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-orange-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                                        FEATURED
                                    </div>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="text-5xl">{reward.image}</div>
                                                <div className="flex-1">
                                                    <CardTitle className="text-xl">{reward.title}</CardTitle>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Badge className={`text-xs ${getCategoryColor(reward.category)}`}>
                                                            {getCategoryLabel(reward.category)}
                                                        </Badge>
                                                        <Badge className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                                                            {getRarityLabel(reward.rarity)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="text-gray-600 text-sm mb-4">
                                            {reward.description.replace(/'/g, "&#39;")}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-500">Cost:</span>
                                                <span className={`font-bold text-lg ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                                                    {reward.points} π
                                                </span>
                                            </div>
                                            <Button
                                                onClick={() => handleRedeem(reward)}
                                                disabled={!canAfford}
                                                className={`font-bold ${canAfford
                                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    }`}
                                            >
                                                {canAfford ? '🎯 Redeem Now' : '❌ Not Enough Points'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* All Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredRewards.map((reward) => {
                    const canAfford = userPoints >= reward.points;
                    const discountedPoints = reward.discount ? Math.floor(reward.points * (1 - reward.discount / 100)) : reward.points;

                    return (
                        <Card key={reward.id} className={`group relative overflow-hidden border-2 transition-all duration-300 hover:scale-105 hover:shadow-accent/30 cursor-pointer`}>
                            {reward.discount && (
                                <div className="absolute top-0 right-0 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded-bl-lg z-10">
                                    -{reward.discount}%
                                </div>
                            )}
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="text-4xl">{reward.image}</div>
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{reward.title}</CardTitle>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge className={`text-xs ${getCategoryColor(reward.category)}`}>
                                                    {getCategoryLabel(reward.category)}
                                                </Badge>
                                                <Badge className={`text-xs ${reward.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0' : 'bg-gray-100 text-gray-700'}`}>
                                                    {getRarityLabel(reward.rarity)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                    {reward.description.replace(/'/g, "&#39;")}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-500">Cost:</span>
                                        <div className="flex items-center gap-1">
                                            {reward.discount && (
                                                <span className="text-sm text-gray-400 line-through">
                                                    {reward.points} π
                                                </span>
                                            )}
                                            <span className={`font-bold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                                                {discountedPoints} π
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleRedeem(reward)}
                                        disabled={!canAfford || !reward.available}
                                        className={`font-medium ${canAfford
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {canAfford ? 'Redeem' : 'Need Points'}
                                    </Button>
                                </div>

                                {!canAfford && (
                                    <div className="mt-2 text-xs text-red-600">
                                        Need {discountedPoints - userPoints} more points
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredRewards.length === 0 && (
                <div className="text-center py-16">
                    <div className="text-8xl mb-6">🎁</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">No Rewards Found</h3>
                    <p className="text-gray-600 mb-6">Try adjusting your filters or check back later for new rewards!</p>
                    <Button onClick={() => setSelectedCategory('all')} className="bg-blue-600 hover:bg-blue-700">
                        View All Items
                    </Button>
                </div>
            )}

            {/* Info Section */}
            <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
                <div className="flex items-start space-x-4">
                    <div className="text-blue-600 text-2xl">ℹ️</div>
                    <div className="flex-1">
                        <h4 className="font-bold text-blue-900 mb-2 text-lg">How the Reward Shop Works</h4>
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                            <div>
                                <h5 className="font-semibold mb-1">💰 Earn Points</h5>
                                <p>Make accurate predictions to earn points. The more correct picks, the more points you get!</p>
                            </div>
                            <div>
                                <h5 className="font-semibold mb-1">🎯 Redeem Rewards</h5>
                                <p>Use your points to unlock premium features, exclusive merchandise, and special experiences.</p>
                            </div>
                            <div>
                                <h5 className="font-semibold mb-1">⭐ Rarity System</h5>
                                <p>Items come in different rarities: Common, Rare, Epic, and Legendary. Rarer items offer better value!</p>
                            </div>
                            <div>
                                <h5 className="font-semibold mb-1">🔥 Limited Time</h5>
                                <p>Some items are featured or discounted for a limited time. Don&apos;t miss out on great deals!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 