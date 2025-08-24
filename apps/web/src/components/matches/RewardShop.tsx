'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    RewardShopHeader,
    CoinTopUpSection,
    RewardFilters,
    RewardCard,
    RewardInfoSection,
    mockRewards,
    type RewardItem,
    type CoinPack
} from './reward-shop';

interface RewardShopProps {
    userPoints?: number;
    onRedeem?: (reward: RewardItem) => void;
    sidebarOpen?: boolean;
}

export function RewardShop({ userPoints = 1250, onRedeem, sidebarOpen = true }: RewardShopProps) {
    const { wallet, syncWalletWithDatabase } = useWallet();
    const searchParams = useSearchParams();
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'points' | 'rarity' | 'name'>('points');

    // Handle payment success/cancel
    useEffect(() => {
        const success = searchParams.get('success');
        const canceled = searchParams.get('canceled');
        const sessionId = searchParams.get('session_id');

        if (success === 'true' && sessionId) {
            toast.success('Payment successful! Your coins have been added to your account.');
            syncWalletWithDatabase(); // Refresh wallet to show updated balance
        } else if (canceled === 'true') {
            toast.error('Payment was canceled.');
        }
    }, [searchParams, syncWalletWithDatabase]);

    // Use actual wallet balance if available, otherwise fall back to userPoints prop
    const actualBalance = wallet?.balance ?? userPoints;

    const handleRedeem = (reward: RewardItem) => {
        if (actualBalance >= reward.points) {
            onRedeem?.(reward);
            console.log(`Redeemed: ${reward.title}`);
        } else {
            console.log('Not enough points!');
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
        <div className={`space-y-8 ${!sidebarOpen ? 'w-full' : ''}`}>
            <RewardShopHeader userPoints={userPoints} />

            <CoinTopUpSection />

            <RewardFilters
                categories={categories}
                selectedCategory={selectedCategory}
                sortBy={sortBy}
                onCategoryChange={setSelectedCategory}
                onSortChange={setSortBy}
            />

            {/* Featured Items */}
            {selectedCategory === 'all' && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">⭐</span>
                        Featured Items
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {mockRewards.filter(r => r.featured).map((reward) => {
                            const canAfford = actualBalance >= reward.points;
                            return (
                                <RewardCard
                                    key={reward.id}
                                    reward={reward}
                                    canAfford={canAfford}
                                    onRedeem={handleRedeem}
                                    isFeatured={true}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* All Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredRewards.map((reward) => {
                    const canAfford = actualBalance >= reward.points;
                    return (
                        <RewardCard
                            key={reward.id}
                            reward={reward}
                            canAfford={canAfford}
                            onRedeem={handleRedeem}
                        />
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredRewards.length === 0 && (
                <div className="text-center py-16">
                    <div className="text-8xl mb-6">🎁</div>
                    <h3 className="text-2xl font-bold text-white mb-4">No Rewards Found</h3>
                    <p className="text-gray-400 mb-6">Try adjusting your filters or check back later for new rewards!</p>
                    <Button onClick={() => setSelectedCategory('all')} className="bg-purple-600 hover:bg-purple-700">
                        View All Items
                    </Button>
                </div>
            )}

            <RewardInfoSection onViewAll={() => setSelectedCategory('all')} />
        </div>
    );
} 