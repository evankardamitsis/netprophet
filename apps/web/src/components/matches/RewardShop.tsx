'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useDictionary } from '@/context/DictionaryContext';
import CoinIcon from '@/components/CoinIcon';
import {
    RewardShopHeader,
    CoinTopUpSection,
    type RewardItem,
    type CoinPack,
    RewardFilters
} from './reward-shop';
import { PowerUps, type PowerUp } from './PowerUps';

interface RewardShopProps {
    userPoints?: number;
    onRedeem?: (reward: RewardItem) => void;
    sidebarOpen?: boolean;
}

export function RewardShop({ userPoints, onRedeem, sidebarOpen = true }: RewardShopProps) {
    const { wallet, syncWalletWithDatabase } = useWallet();
    const searchParams = useSearchParams();
    const [showInfoModal, setShowInfoModal] = useState(false);
    const { dict } = useDictionary();

    // Handle payment success/cancel
    useEffect(() => {
        const success = searchParams.get('success');
        const canceled = searchParams.get('canceled');
        const sessionId = searchParams.get('session_id');

        if (success === 'true' && sessionId) {
            toast.success(dict.rewards.paymentSuccessful);
            syncWalletWithDatabase(); // Refresh wallet to show updated balance
        } else if (canceled === 'true') {
            toast.error(dict.rewards.paymentCanceled);
        }
    }, [searchParams, syncWalletWithDatabase, dict.rewards.paymentSuccessful, dict.rewards.paymentCanceled]);

    // Use actual wallet balance if available, otherwise fall back to userPoints prop or 0
    const actualBalance = wallet?.balance ?? userPoints ?? 0;

    const handleRedeem = (reward: RewardItem) => {
        if (actualBalance >= reward.points) {
            onRedeem?.(reward);
            console.log(`${dict.rewards.redeemed}: ${reward.title}`);
        } else {
            console.log(dict.rewards.notEnoughPoints);
        }
    };

    const handlePowerUpPurchase = (powerUp: PowerUp) => {
        console.log(`Power-up purchased: ${powerUp.name}`);
        // Power-up purchase logic is handled in the PowerUps component
        // This function is called after successful purchase to refresh wallet
        syncWalletWithDatabase();
    };

    return (
        <>
            <div className={`space-y-8 ${!sidebarOpen ? 'w-full' : ''}`}>
                <RewardShopHeader userPoints={userPoints} onInfoClick={() => setShowInfoModal(true)} />

                <CoinTopUpSection />

                {/* Power Ups Section */}
                <PowerUps onPurchase={handlePowerUpPurchase} sidebarOpen={sidebarOpen} />
            </div>

            {/* Info Modal */}
            {showInfoModal && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowInfoModal(false)}
                >
                    <div
                        className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 border border-slate-700/50 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                {dict.rewards.howItWorks}
                            </h3>
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-slate-700/50"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <CoinIcon size={20} />
                                    {dict.rewards.earnCoins}
                                </h4>
                                <p className="text-gray-300">{dict.rewards.earnCoinsDescription}</p>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span>🎯</span>
                                    {dict.rewards.redeemCoins}
                                </h4>
                                <p className="text-gray-300">{dict.rewards.redeemCoinsDescription}</p>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span>⭐</span>
                                    {dict.rewards.raritySystem}
                                </h4>
                                <p className="text-gray-300">{dict.rewards.raritySystemDescription}</p>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span>🔥</span>
                                    {dict.rewards.limitedTime}
                                </h4>
                                <p className="text-gray-300">{dict.rewards.limitedTimeDescription}</p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button
                                onClick={() => setShowInfoModal(false)}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                            >
                                {dict.rewards.gotIt}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
} 