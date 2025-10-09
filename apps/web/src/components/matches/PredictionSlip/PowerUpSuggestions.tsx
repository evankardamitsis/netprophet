'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { purchasePowerUp } from '@netprophet/lib';
import CoinIcon from '@/components/CoinIcon';

interface PowerUpSuggestionsProps {
    predictionsCount: number;
    totalStake: number;
    isParlayMode: boolean;
    parlayOdds?: number;
    dict?: any;
    lang?: 'en' | 'el';
    onPowerUpPurchased?: (powerUpId: string) => void;
    hasSafeParlayPowerUp?: boolean;
    hasSafeSinglePowerUp?: boolean;
    hasDoublePointsMatchPowerUp?: boolean;
}

export function PowerUpSuggestions({
    predictionsCount,
    totalStake,
    isParlayMode,
    parlayOdds = 1,
    dict,
    lang = 'en',
    onPowerUpPurchased,
    hasSafeParlayPowerUp = false,
    hasSafeSinglePowerUp = false,
    hasDoublePointsMatchPowerUp = false
}: PowerUpSuggestionsProps) {
    const { wallet, syncWalletWithDatabase } = useWallet();
    const { user } = useAuth();

    // Smart suggestion logic
    const getSuggestions = () => {
        const suggestions = [];

        // High-stake bet suggestion (over 300 coins) - only if user doesn't have Safe Single
        if (totalStake > 300 && !hasSafeSinglePowerUp) {
            suggestions.push({
                id: 'safeSingle',
                name: dict?.matches?.powerUps?.safeSlip || 'Safe Slip',
                cost: 900,
                icon: '🛡️',
                reason: dict?.matches?.powerUps?.protectBet?.replace('{stake}', totalStake.toString()) || `Protect your ${totalStake} coin bet!`,
                gradient: 'from-green-500 to-emerald-600'
            });
        }

        // Long parlay suggestion (3+ predictions) - only if user doesn't have Safe Parlay
        if (isParlayMode && predictionsCount >= 3 && !hasSafeParlayPowerUp) {
            suggestions.push({
                id: 'safeParlay',
                name: dict?.matches?.powerUps?.safeParlay || 'Safe Parlay',
                cost: 900,
                icon: '🛡️',
                reason: dict?.matches?.powerUps?.protectParlay?.replace('{count}', predictionsCount.toString()) || `${predictionsCount} predictions - Protect your parlay!`,
                gradient: 'from-blue-500 to-purple-600'
            });
        }

        // High odds parlay suggestion (odds > 3.0) - only if user doesn't have Safe Parlay
        if (isParlayMode && parlayOdds > 3.0 && !hasSafeParlayPowerUp) {
            suggestions.push({
                id: 'safeParlay',
                name: dict?.matches?.powerUps?.safeParlay || 'Safe Parlay',
                cost: 900,
                icon: '🛡️',
                reason: dict?.matches?.powerUps?.highOddsProtect?.replace('{odds}', parlayOdds.toFixed(1)) || `High odds (${parlayOdds.toFixed(1)}x) - Protect your bet!`,
                gradient: 'from-orange-500 to-red-600'
            });
        }

        // Double XP for single high-confidence match - only if user doesn't have Double XP
        if (predictionsCount === 1 && totalStake > 200 && !hasDoublePointsMatchPowerUp) {
            suggestions.push({
                id: 'doubleXP',
                name: dict?.matches?.powerUps?.doubleXP || 'Double XP',
                cost: 550,
                icon: '🎯',
                reason: dict?.matches?.powerUps?.doublePointsForMatch || 'Double your points for this match!',
                gradient: 'from-purple-500 to-pink-600'
            });
        }

        return suggestions;
    };

    const suggestions = getSuggestions();

    const handlePurchase = async (powerUpId: string, cost: number) => {
        if (!user) {
            toast.error(dict?.matches?.powerUps?.pleaseSignIn || 'Please sign in to purchase power-ups');
            return;
        }

        if (wallet.balance < cost) {
            toast.error(dict?.matches?.powerUps?.notEnoughCoins?.replace('{cost}', cost.toString()) || `Not enough coins! You need ${cost} coins.`);
            return;
        }

        try {
            const result = await purchasePowerUp(user.id, powerUpId);

            if (result.success) {
                toast.success(result.message);
                await syncWalletWithDatabase();
                window.dispatchEvent(new CustomEvent('refreshPowerUps'));

                // Notify parent component about the purchase
                onPowerUpPurchased?.(powerUpId);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error('Purchase failed:', error);
            toast.error(dict?.matches?.powerUps?.purchaseFailed || 'Purchase failed. Please try again.');
        }
    };

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <motion.div
            className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg p-3 border border-indigo-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <span className="text-lg">💡</span>
                    <div className="text-white text-sm font-semibold">
                        {dict?.matches?.powerUps?.powerUpSuggestions || 'Power-up Suggestions'}
                    </div>
                </div>
                <span className="text-xs text-gray-400">
                    {dict?.matches?.powerUps?.smartSuggestions || 'Smart suggestions'}
                </span>
            </div>

            <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                    <motion.div
                        key={suggestion.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.1 }}
                    >
                        <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-r ${suggestion.gradient}`}>
                                <span className="text-white text-sm">{suggestion.icon}</span>
                            </div>
                            <div>
                                <div className="text-white text-sm font-medium">
                                    {suggestion.name}
                                </div>
                                <div className="text-gray-400 text-xs">
                                    {suggestion.reason}
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={() => handlePurchase(suggestion.id, suggestion.cost)}
                            className="text-xs py-1 px-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white flex items-center gap-1"
                        >
                            <span>{suggestion.cost}</span>
                            <CoinIcon size={12} />
                        </Button>
                    </motion.div>
                ))}
            </div>

            <div className="mt-2 text-xs text-gray-400 text-center">
                {dict?.matches?.powerUps?.improveChances || 'Improve your chances with power-ups!'}
            </div>
        </motion.div>
    );
}
