'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { purchasePowerUp } from '@netprophet/lib';

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
                name: lang === 'el' ? 'Ασφαλής Σταχυοροφόρα' : 'Safe Slip',
                cost: 900,
                icon: '🛡️',
                reason: lang === 'el'
                    ? `Προστατέψτε την στοίχημα των ${totalStake} νομισμάτων!`
                    : `Protect your ${totalStake} coin bet!`,
                gradient: 'from-green-500 to-emerald-600'
            });
        }

        // Long parlay suggestion (3+ predictions) - only if user doesn't have Safe Parlay
        if (isParlayMode && predictionsCount >= 3 && !hasSafeParlayPowerUp) {
            suggestions.push({
                id: 'safeParlay',
                name: lang === 'el' ? 'Ασφαλής Παράλληλη' : 'Safe Parlay',
                cost: 900,
                icon: '🛡️',
                reason: lang === 'el'
                    ? `${predictionsCount} προβλέψεις - Προστατέψτε την παράλληλη!`
                    : `${predictionsCount} predictions - Protect your parlay!`,
                gradient: 'from-blue-500 to-purple-600'
            });
        }

        // High odds parlay suggestion (odds > 3.0) - only if user doesn't have Safe Parlay
        if (isParlayMode && parlayOdds > 3.0 && !hasSafeParlayPowerUp) {
            suggestions.push({
                id: 'safeParlay',
                name: lang === 'el' ? 'Ασφαλής Παράλληλη' : 'Safe Parlay',
                cost: 900,
                icon: '🛡️',
                reason: lang === 'el'
                    ? `Υψηλές αποδόσεις (${parlayOdds.toFixed(1)}x) - Προστατέψτε!`
                    : `High odds (${parlayOdds.toFixed(1)}x) - Protect your bet!`,
                gradient: 'from-orange-500 to-red-600'
            });
        }

        // Double XP for single high-confidence match - only if user doesn't have Double XP
        if (predictionsCount === 1 && totalStake > 200 && !hasDoublePointsMatchPowerUp) {
            suggestions.push({
                id: 'doubleXP',
                name: lang === 'el' ? 'Διπλά Πόντοι' : 'Double XP',
                cost: 550,
                icon: '🎯',
                reason: lang === 'el'
                    ? 'Διπλάστε τους πόντους για αυτόν τον αγώνα!'
                    : 'Double your points for this match!',
                gradient: 'from-purple-500 to-pink-600'
            });
        }

        return suggestions;
    };

    const suggestions = getSuggestions();

    const handlePurchase = async (powerUpId: string, cost: number) => {
        if (!user) {
            toast.error(lang === 'el' ? 'Παρακαλώ συνδεθείτε για να αγοράσετε power-ups' : 'Please sign in to purchase power-ups');
            return;
        }

        if (wallet.balance < cost) {
            toast.error(lang === 'el'
                ? `Δεν έχετε αρκετά νομίσματα! Χρειάζεστε ${cost} νομίσματα.`
                : `Not enough coins! You need ${cost} coins.`
            );
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
            toast.error(lang === 'el' ? 'Η αγορά απέτυχε. Δοκιμάστε ξανά.' : 'Purchase failed. Please try again.');
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
                        {lang === 'el' ? 'Προτάσεις Power-ups' : 'Power-up Suggestions'}
                    </div>
                </div>
                <span className="text-xs text-gray-400">
                    {lang === 'el' ? 'Έξυπνες προτάσεις' : 'Smart suggestions'}
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
                            className="text-xs py-1 px-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                        >
                            {suggestion.cost} 🌕
                        </Button>
                    </motion.div>
                ))}
            </div>

            <div className="mt-2 text-xs text-gray-400 text-center">
                {lang === 'el'
                    ? 'Βελτιώστε τις πιθανότητες σας με power-ups!'
                    : 'Improve your chances with power-ups!'
                }
            </div>
        </motion.div>
    );
}
