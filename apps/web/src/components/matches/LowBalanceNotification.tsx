'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { useStripePayment } from '@/hooks/useStripePayment';
import { useAuth } from '@/hooks/useAuth';
import { useCoinPacks } from '@/hooks/useCoinPacks';
import { toast } from 'sonner';
import CoinIcon from '@/components/CoinIcon';

// Helper function to check if notification was dismissed
const isNotificationDismissed = () => {
    if (typeof window === 'undefined') return false;
    const dismissed = localStorage.getItem('lowBalanceNotificationDismissed');
    if (!dismissed) return false;

    const dismissedTime = parseInt(dismissed);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    return (now - dismissedTime) < oneDay;
};

// Helper function to dismiss notification
const dismissNotification = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('lowBalanceNotificationDismissed', Date.now().toString());
};

interface LowBalanceNotificationProps {
    lang?: 'en' | 'el';
}

export function LowBalanceNotification({
    lang = 'en'
}: LowBalanceNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [hasShown, setHasShown] = useState(false);
    const { wallet } = useWallet();
    const { processPayment, isProcessing } = useStripePayment();
    const { user } = useAuth();
    const { coinPacks, loading: coinPacksLoading } = useCoinPacks();

    // Low balance thresholds (matching Wallet component)
    const isLowBalance = wallet.balance <= 200;
    const isVeryLowBalance = wallet.balance < 100;
    const isCriticalBalance = wallet.balance < 50;

    useEffect(() => {
        if (hasShown || !isLowBalance || isNotificationDismissed()) return;

        // Show notification after 3 seconds on page load
        const timer = setTimeout(() => {
            setIsVisible(true);
            setHasShown(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, [isLowBalance, hasShown]);

    // Listen for show notification events
    useEffect(() => {
        const handleShowNotification = () => {
            if (isLowBalance) {
                setIsVisible(true);
                setHasShown(true);
            }
        };

        window.addEventListener('showLowBalanceNotification', handleShowNotification);
        return () => {
            window.removeEventListener('showLowBalanceNotification', handleShowNotification);
        };
    }, [isLowBalance]);

    const handleTopUp = async (packId: string) => {
        if (!user) {
            toast.error(lang === 'el' ? 'Παρακαλώ συνδεθείτε για να αγοράσετε νομίσματα' : 'Please sign in to purchase coins');
            return;
        }

        try {
            await processPayment(packId);
            setIsVisible(false);
        } catch (error) {
            console.error('Top-up error:', error);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        dismissNotification();
        // Dispatch event to notify TopNavigation
        window.dispatchEvent(new CustomEvent('notificationDismissed'));
    };

    const getNotificationContent = () => {
        if (isCriticalBalance) {
            return {
                title: lang === 'el' ? 'Κρίσιμα χαμηλό υπόλοιπο!' : 'Critical low balance!',
                message: lang === 'el'
                    ? 'Δεν μπορείτε να κάνετε στοιχήματα. Ώρα για να ανανεώσετε!'
                    : 'You cannot place bets. Top up now!',
                bgGradient: 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800',
                icon: '🚨'
            };
        } else if (isVeryLowBalance) {
            return {
                title: lang === 'el' ? 'Πολύ χαμηλό υπόλοιπο' : 'Very low balance',
                message: lang === 'el'
                    ? 'Ανανεώστε για να συνεχίσετε να παίζετε άφοβα!'
                    : 'Top up to continue playing!',
                bgGradient: 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800',
                icon: '⚠️'
            };
        } else {
            return {
                title: lang === 'el' ? 'Χαμηλό υπόλοιπο' : 'Low balance',
                message: lang === 'el'
                    ? 'Σκεφτείτε να ανανεώσετε για καλύτερες ευκαιρίες!'
                    : 'Consider topping up for better opportunities!',
                bgGradient: 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800',
                icon: '💡'
            };
        }
    };

    const content = getNotificationContent();

    if (!isVisible || !isLowBalance) {
        return null;
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        y: [0, -5, 0]
                    }}
                    exit={{ opacity: 0, y: -50, scale: 0.9 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        y: {
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }
                    }}
                    className="fixed top-4 right-4 z-50 max-w-sm"
                >
                    <div className={`${content.bgGradient} rounded-lg p-4 shadow-2xl border border-white/20 relative`}>
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 text-white/70 hover:text-white text-lg leading-none p-1 rounded-full hover:bg-white/10 transition-colors"
                        >
                            ×
                        </button>
                        <div className="flex items-start space-x-3 pr-8">
                            <div className="text-2xl">{content.icon}</div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-sm mb-1">
                                    {content.title}
                                </h3>
                                <p className="text-white/90 text-xs mb-3">
                                    {content.message}
                                </p>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex space-x-3">
                                        {coinPacksLoading ? (
                                            <>
                                                <Button disabled className="text-xs py-2 px-4 bg-white/10 text-white/70 border border-white/20 rounded-lg">
                                                    Loading...
                                                </Button>
                                                <Button disabled className="text-xs py-2 px-4 bg-white/10 text-white/70 border border-white/20 rounded-lg">
                                                    Loading...
                                                </Button>
                                                <Button disabled className="text-xs py-2 px-4 bg-white/10 text-white/70 border border-white/20 rounded-lg">
                                                    Loading...
                                                </Button>
                                            </>
                                        ) : (
                                            coinPacks.slice(0, 3).map((pack, index) => (
                                                <Button
                                                    key={pack.id}
                                                    onClick={() => handleTopUp(pack.id)}
                                                    disabled={isProcessing}
                                                    className={`text-xs py-2 px-4 font-semibold border-0 shadow-lg rounded-lg transition-all duration-200 ${index === 0
                                                        ? 'bg-gradient-to-br from-green-500 via-emerald-600 to-green-700 hover:from-green-600 hover:via-emerald-700 hover:to-green-800 text-white'
                                                        : index === 1
                                                            ? 'bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 hover:from-blue-600 hover:via-purple-700 hover:to-blue-800 text-white'
                                                            : 'bg-gradient-to-br from-orange-500 via-red-600 to-orange-700 hover:from-orange-600 hover:via-red-700 hover:to-orange-800 text-white'
                                                        }`}
                                                >
                                                    {isProcessing ? '...' : (
                                                        <div className="flex flex-col items-center whitespace-nowrap">
                                                            <span className="font-bold flex items-center gap-1">{pack.base_coins + pack.bonus_coins} <CoinIcon size={14} /></span>
                                                            <span className="text-xs text-gray-100/80">€{pack.price_euro.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </Button>
                                            ))
                                        )}
                                    </div>
                                    <a
                                        href={`/${lang}/rewards`}
                                        className="text-xs text-white/80 hover:text-white underline transition-colors ml-4"
                                    >
                                        {lang === 'el' ? 'Όλες οι επιλογές' : 'View all options'}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
