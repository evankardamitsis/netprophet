'use client';

import { useState, useEffect } from 'react';
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
    const { dict, prepForUppercaseDisplay } = useDictionary();

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

                {/* REAL MONEY SECTION */}
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-base font-bold text-white">{dict.rewards.coinTopUpPacks || 'Αγορά Νομισμάτων'}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/25 text-[#38BDF8] text-[10px] font-bold">€ ΑΓΟΡΑ</span>
                    </div>
                    <p className="text-[13px] text-[#94A3B8] mb-4">
                        Τα νομίσματα είναι εικονικά και χρησιμοποιούνται αποκλειστικά εντός της πλατφόρμας.
                    </p>
                    <CoinTopUpSection />
                </div>

                {/* DIVIDER */}
                <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-[11px] font-bold text-[#4B5975] tracking-widest">Ή ΞΟΔΕΨΕ ΝΟΜΙΣΜΑΤΑ</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {/* VIRTUAL COINS SECTION */}
                <div>
                    <h2 className="text-base font-bold text-white mb-4">{dict.rewards.powerUps || 'Ενισχύσεις'}</h2>
                    <PowerUps onPurchase={handlePowerUpPurchase} sidebarOpen={sidebarOpen} />
                </div>
            </div>

            {/* Info Modal */}
            {showInfoModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowInfoModal(false)}
                >
                    <div
                        className="bg-[#161F35] border border-white/[0.08] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-black text-white">
                                {dict.rewards.howItWorks}
                            </h3>
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1E2A45] border border-white/[0.08] text-[#4B5975] hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {[
                                { icon: <CoinIcon size={16} />, title: dict.rewards.earnCoins, desc: dict.rewards.earnCoinsDescription },
                                { icon: '🎯', title: dict.rewards.redeemCoins, desc: dict.rewards.redeemCoinsDescription },
                                { icon: '⭐', title: dict.rewards.raritySystem, desc: dict.rewards.raritySystemDescription },
                                { icon: '🔥', title: dict.rewards.limitedTime, desc: dict.rewards.limitedTimeDescription },
                            ].map((item, i) => (
                                <div key={i} className="bg-[#1E2A45] border border-white/[0.06] p-4 rounded-xl">
                                    <h4 className="font-bold text-white mb-1.5 flex items-center gap-2">
                                        <span>{item.icon}</span>
                                        {item.title}
                                    </h4>
                                    <p className="text-[#94A3B8] text-[12px] leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 flex justify-end">
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="px-5 py-2.5 rounded-xl bg-[#FFD60A] text-[#080C18] font-black text-sm hover:bg-[#FFE033] transition-colors"
                            >
                                {dict.rewards.gotIt}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
} 