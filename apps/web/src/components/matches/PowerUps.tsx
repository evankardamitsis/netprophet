'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/hooks/useAuth';
import { useDictionary } from '@/context/DictionaryContext';
import { toast } from 'sonner';
import { fetchPowerUps, purchasePowerUp, type PowerUp as DBPowerUp } from '@netprophet/lib';
import CoinIcon from '@/components/CoinIcon';

export interface PowerUp {
    id: string;
    name: string;
    cost: number;
    effect: string;
    usageType: string;
    icon: string;
    description: string;
    gradient: string;
    glowColor: string;
}

interface PowerUpsProps {
    onPurchase?: (powerUp: PowerUp) => void;
    sidebarOpen?: boolean;
}

export function PowerUps({ onPurchase, sidebarOpen = true }: PowerUpsProps) {
    const { wallet, syncWalletWithDatabase } = useWallet();
    const { user } = useAuth();
    const { dict } = useDictionary();
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch power-ups from database with caching
    useEffect(() => {
        const loadPowerUps = async () => {
            try {
                const dbPowerUps = await fetchPowerUps();
                const transformedPowerUps: PowerUp[] = dbPowerUps.map((powerUp: DBPowerUp) => ({
                    id: powerUp.power_up_id,
                    name: powerUp.name,
                    cost: powerUp.cost,
                    effect: powerUp.effect,
                    usageType: powerUp.usage_type,
                    icon: powerUp.icon,
                    description: powerUp.description,
                    gradient: powerUp.gradient,
                    glowColor: powerUp.glow_color
                }));
                setPowerUps(transformedPowerUps);
            } catch (error) {
                console.error('Error loading power-ups:', error);
                toast.error(dict.rewards.failedToLoadPowerUps, {
                    duration: 4000,
                    position: 'bottom-right'
                });
            } finally {
                setLoading(false);
            }
        };

        loadPowerUps();
    }, [dict.rewards.failedToLoadPowerUps]);

    const handlePurchase = async (powerUp: PowerUp) => {
        if (!user) {
            toast.error(dict.rewards.pleaseSignIn, {
                duration: 4000,
                position: 'bottom-right'
            });
            return;
        }

        if (!wallet) {
            toast.error(dict.rewards.walletNotAvailable, {
                duration: 4000,
                position: 'bottom-right'
            });
            return;
        }

        if (wallet.balance < powerUp.cost) {
            toast.error(dict.rewards.notEnoughCoinsMessage.replace('{cost}', powerUp.cost.toString()), {
                duration: 4000,
                position: 'bottom-right'
            });
            return;
        }

        setPurchasing(powerUp.id);

        try {
            const result = await purchasePowerUp(user.id, powerUp.id);

            if (result.success) {
                toast.success(result.message, {
                    duration: 4000,
                    position: 'bottom-right'
                });
                onPurchase?.(powerUp);
                // Refresh wallet balance
                await syncWalletWithDatabase();
                // Trigger manual refresh of power-ups
                window.dispatchEvent(new CustomEvent('refreshPowerUps'));
            } else {
                toast.error(result.message, {
                    duration: 4000,
                    position: 'bottom-right'
                });
            }

        } catch (error) {
            console.error('Purchase failed:', error);
            toast.error(dict.rewards.purchaseFailed, {
                duration: 4000,
                position: 'bottom-right'
            });
        } finally {
            setPurchasing(null);
        }
    };

    const canAfford = (cost: number) => {
        return wallet?.balance ? wallet.balance >= cost : false;
    };

    // Function to get translated power-up name
    const getTranslatedName = (name: string) => {
        const nameMap: { [key: string]: string } = {
            'Safe Slip': 'safeSlips',
            'Safe Parlay Slip': 'safeParlaySlip',
            'Double Points Match': 'doubleXPMatch',
            'Streak Multiplier': 'streakMultiplier',
            'Pro Tips': 'proTips'
        };
        const key = nameMap[name] || name.toLowerCase().replace(' ', '');
        return dict.rewards[key as keyof typeof dict.rewards] || name;
    };

    // Function to get translated description
    const getTranslatedDescription = (name: string) => {
        const nameMap: { [key: string]: string } = {
            'Safe Slip': 'safeSlipsDescription',
            'Safe Parlay Slip': 'safeParlaySlipDescription',
            'Double Points Match': 'doubleXPMatchDescription',
            'Streak Multiplier': 'streakMultiplierDescription',
            'Pro Tips': 'proTipsDescription'
        };
        const key = nameMap[name] || name.toLowerCase().replace(' ', '') + 'Description';
        return dict.rewards[key as keyof typeof dict.rewards] || '';
    };

    // Function to get translated effect
    const getTranslatedEffect = (name: string) => {
        const nameMap: { [key: string]: string } = {
            'Safe Slip': 'safeSlipsEffect',
            'Safe Parlay Slip': 'safeParlaySlipEffect',
            'Double Points Match': 'doubleXPMatchEffect',
            'Streak Multiplier': 'streakMultiplierEffect',
            'Pro Tips': 'proTipsEffect'
        };
        const key = nameMap[name] || name.toLowerCase().replace(' ', '') + 'Effect';
        return dict.rewards[key as keyof typeof dict.rewards] || '';
    };

    const USAGE_LABELS: Record<string, string> = {
        'once per slip': 'Μία φορά ανά λίστα',
        'time-based': 'Χρονικά',
        'permanent': 'Μόνιμο',
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-48 rounded-xl bg-[#161F35] border border-white/[0.06] animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {powerUps.map((powerUp) => {
                    const affordable = canAfford(powerUp.cost);
                    const isPurchasing = purchasing === powerUp.id;
                    const usageLabel = USAGE_LABELS[powerUp.usageType.toLowerCase()] ?? powerUp.usageType;

                    return (
                        <div
                            key={powerUp.id}
                            className="relative overflow-hidden rounded-xl bg-[#161F35] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 flex flex-col"
                        >
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

                            <div className="p-4 flex-1 flex flex-col">
                                {/* Icon + name */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{powerUp.icon}</span>
                                        <div>
                                            <p className="text-sm font-bold text-white leading-tight">
                                                {getTranslatedName(powerUp.name)}
                                            </p>
                                            <span className="inline-block text-[10px] font-semibold text-[#94A3B8] bg-[#1E2A45] border border-white/[0.08] px-2 py-0.5 rounded-full mt-0.5">
                                                {usageLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-3 flex-1">
                                    {getTranslatedDescription(powerUp.name) || powerUp.description}
                                </p>

                                {/* Effect */}
                                <div className="bg-[#00E676]/05 border border-[#00E676]/15 rounded-lg px-3 py-2 mb-3">
                                    <p className="text-[11px] font-semibold text-[#00E676]">
                                        {getTranslatedEffect(powerUp.name) || powerUp.effect}
                                    </p>
                                </div>

                                {/* Cost + shortfall */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <CoinIcon size={16} />
                                        <span className="font-black text-base text-[#FFD60A] tabular-nums">{powerUp.cost}</span>
                                    </div>
                                    {!affordable && wallet && (
                                        <span className="text-[10px] text-[#FF4545] font-semibold">
                                            -{(powerUp.cost - wallet.balance).toLocaleString('el-GR')} 🪙
                                        </span>
                                    )}
                                </div>

                                {/* CTA */}
                                <button
                                    onClick={() => handlePurchase(powerUp)}
                                    disabled={!affordable || isPurchasing || !user}
                                    className={`w-full py-2.5 rounded-xl text-sm font-black transition-all duration-150 ${
                                        !user
                                            ? 'bg-[#1E2A45] text-[#4B5975] cursor-not-allowed'
                                            : !affordable
                                            ? 'bg-[#1E2A45] text-[#4B5975] cursor-not-allowed'
                                            : isPurchasing
                                            ? 'bg-[#FFD60A]/60 text-[#080C18] cursor-wait'
                                            : 'bg-[#FFD60A] text-[#080C18] hover:bg-[#FFE033] active:scale-95 shadow-[0_4px_12px_rgba(255,214,10,0.25)]'
                                    }`}
                                >
                                    {!user ? (
                                        dict.rewards.signInToBuy
                                    ) : isPurchasing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-[#080C18]/40 border-t-[#080C18] rounded-full" />
                                            {dict.rewards.purchasing}
                                        </span>
                                    ) : affordable ? (
                                        'Εξαργύρωση'
                                    ) : (
                                        dict.rewards.notEnoughCoins
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
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
                                {dict.rewards.howPowerUpsWork}
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
                                { icon: '🛡', title: dict.rewards.safeSlips, desc: dict.rewards.safeSlipsDescription },
                                { icon: '🔥', title: dict.rewards.streakMultiplier, desc: dict.rewards.streakMultiplierDescription },
                                { icon: '🎯', title: dict.rewards.doubleXPMatch, desc: dict.rewards.doubleXPMatchDescription },
                                { icon: '💡', title: dict.rewards.proTips, desc: dict.rewards.proTipsDescription },
                            ].map((item) => (
                                <div key={item.title} className="bg-[#1E2A45] border border-white/[0.06] p-4 rounded-xl">
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
