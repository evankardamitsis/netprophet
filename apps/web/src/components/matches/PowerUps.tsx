'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { fetchPowerUps, purchasePowerUp, type PowerUp as DBPowerUp } from '@netprophet/lib';

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
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch power-ups from database
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
                toast.error('Failed to load power-ups', {
                    duration: 4000,
                    position: 'bottom-right'
                });
            } finally {
                setLoading(false);
            }
        };

        loadPowerUps();
    }, []);

    const handlePurchase = async (powerUp: PowerUp) => {
        if (!user) {
            toast.error('Please sign in to purchase power-ups', {
                duration: 4000,
                position: 'bottom-right'
            });
            return;
        }

        if (!wallet) {
            toast.error('Wallet not available', {
                duration: 4000,
                position: 'bottom-right'
            });
            return;
        }

        if (wallet.balance < powerUp.cost) {
            toast.error(`Not enough coins! You need ${powerUp.cost} coins.`, {
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
            toast.error('Purchase failed. Please try again.', {
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

    // Convert Tailwind gradient classes to CSS gradient colors
    const getGradientColors = (gradientClass: string): string => {
        const gradientMap: { [key: string]: string } = {
            'from-blue-500 to-purple-600': '#3b82f6, #9333ea',
            'from-green-500 to-emerald-600': '#10b981, #059669',
            'from-orange-500 to-red-600': '#f97316, #dc2626',
            'from-purple-500 to-pink-600': '#8b5cf6, #db2777'
        };
        return gradientMap[gradientClass] || '#3b82f6, #9333ea'; // Default fallback
    };

    if (loading) {
        return (
            <div className={`space-y-8 ${!sidebarOpen ? 'w-full' : ''}`}>
                <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-3">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Power Ups
                        </h2>
                    </div>
                    <p className="text-gray-400 text-md">Boost your prediction performance with powerful upgrades</p>
                </div>
                <div className="text-center py-8">
                    <div className="text-white/60">Loading power-ups...</div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={`space-y-8 ${!sidebarOpen ? 'w-full' : ''}`}>
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-3">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Power Ups
                        </h2>
                        <button
                            onClick={() => setShowInfoModal(true)}
                            className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-slate-700/50"
                            title="How Power Ups Work"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-gray-400 text-md">Boost your prediction performance with powerful upgrades</p>
                </div>

                {/* Power Ups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {powerUps.map((powerUp) => {
                        const affordable = canAfford(powerUp.cost);
                        const isPurchasing = purchasing === powerUp.id;

                        return (
                            <Card
                                key={powerUp.id}
                                className={`
                                    relative overflow-hidden bg-slate-900/50 border-slate-700/50 
                                    hover:bg-slate-800/80 transition-all duration-300 
                                    hover:scale-105 hover:shadow-2xl ${powerUp.glowColor}
                                    backdrop-blur-sm group flex flex-col h-full
                                `}
                            >
                                {/* Gradient Background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${powerUp.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />

                                {/* Glow Effect */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${powerUp.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300`} />

                                <CardHeader className="pb-4 relative z-10">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="text-3xl animate-pulse">{powerUp.icon}</div>
                                                <CardTitle className="text-white text-xl font-bold">
                                                    {powerUp.name}
                                                </CardTitle>
                                            </div>
                                            <span className="inline-block text-xs bg-slate-700/80 text-slate-300 px-3 py-1 rounded-full border border-slate-600/50">
                                                {powerUp.usageType}
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0 relative z-10 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                                            {powerUp.description}
                                        </p>

                                        <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 p-4 rounded-lg mb-4 border border-slate-600/30">
                                            <p className="text-green-400 text-sm font-semibold flex items-center gap-2">
                                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                                {powerUp.effect}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">🌕</span>
                                                <span className="font-bold text-xl text-yellow-400">{powerUp.cost}</span>
                                            </div>

                                            {!affordable && (
                                                <div className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
                                                    Need {powerUp.cost - (wallet?.balance || 0)} more
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handlePurchase(powerUp)}
                                        disabled={!affordable || isPurchasing || !user}
                                        style={affordable && user ? {
                                            background: `linear-gradient(to right, ${getGradientColors(powerUp.gradient)})`,
                                            color: 'white',
                                            border: 'none'
                                        } : {}}
                                        className={`
                                            w-full h-12 font-semibold text-lg transition-all duration-300 mt-auto
                                            ${affordable && user
                                                ? 'hover:scale-105 hover:shadow-lg'
                                                : 'bg-slate-700/50 text-slate-400 cursor-not-allowed border border-slate-600/50'
                                            }
                                        `}
                                    >
                                        {!user ? (
                                            <span>Sign In to Buy</span>
                                        ) : isPurchasing ? (
                                            <div className="flex items-center gap-3">
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                                <span>Purchasing...</span>
                                            </div>
                                        ) : affordable ? (
                                            <span>Purchase</span>
                                        ) : (
                                            <span>Not Enough Coins</span>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
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
                                How Power Ups Work
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
                                    <span>🛡</span>
                                    Safe Slips
                                </h4>
                                <p className="text-gray-300">Protect your predictions from one wrong pick. Perfect for risky parlays or uncertain matches.</p>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span>🔥</span>
                                    Streak Multiplier
                                </h4>
                                <p className="text-gray-300">Boost your streak points by 50% for 3 days. Great for climbing the leaderboard faster.</p>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span>🎯</span>
                                    Double XP Match
                                </h4>
                                <p className="text-gray-300">Double your points from a specific match. Use strategically on high-stakes matches.</p>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span>💡</span>
                                    Pro Tips
                                </h4>
                                <p className="text-gray-300">Power ups are consumed when used. Choose wisely and save them for important moments!</p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button
                                onClick={() => setShowInfoModal(false)}
                                style={{
                                    background: 'linear-gradient(to right, #9333ea, #db2777)',
                                    color: 'white'
                                }}
                                className="p-2 hover:scale-105 transition-transform"
                            >
                                Got it!
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
