'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { useStripePayment } from '@/hooks/useStripePayment';
import { useAuth } from '@/hooks/useAuth';
import { useCoinPacks } from '@/hooks/useCoinPacks';
import { useDictionary } from '@/context/DictionaryContext';
import { toast } from 'sonner';
import CoinIcon from '@/components/CoinIcon';

const isNotificationDismissed = () => {
    if (typeof window === 'undefined') return false;
    const dismissed = localStorage.getItem('lowBalanceNotificationDismissed');
    if (!dismissed) return false;
    const dismissedTime = parseInt(dismissed);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    return (now - dismissedTime) < oneDay;
};

const dismissNotification = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('lowBalanceNotificationDismissed', Date.now().toString());
};

interface LowBalanceNotificationProps {
    lang?: 'en' | 'el';
}

export function LowBalanceNotification({ lang: propLang }: LowBalanceNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [hasShown, setHasShown] = useState(false);
    const { wallet } = useWallet();
    const { processPayment, isProcessing } = useStripePayment();
    const { user } = useAuth();
    const { coinPacks, loading: coinPacksLoading } = useCoinPacks();
    const { lang: dictLang } = useDictionary();
    const lang = dictLang || propLang || 'en';

    const isLowBalance = wallet.balance <= 200;
    const isVeryLowBalance = wallet.balance < 100;
    const isCriticalBalance = wallet.balance < 50;

    useEffect(() => {
        if (hasShown || !isLowBalance || isNotificationDismissed()) return;
        const isNewUser = user?.created_at && (Date.now() - new Date(user.created_at).getTime()) < 5 * 60 * 1000;
        if (isNewUser) return;
        const timer = setTimeout(() => {
            setIsVisible(true);
            setHasShown(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, [isLowBalance, hasShown, user?.created_at]);

    useEffect(() => {
        const handleShowNotification = () => {
            if (isLowBalance) {
                const isNewUser = user?.created_at && (Date.now() - new Date(user.created_at).getTime()) < 5 * 60 * 1000;
                if (isNewUser) return;
                setIsVisible(true);
                setHasShown(true);
            }
        };
        window.addEventListener('showLowBalanceNotification', handleShowNotification);
        return () => window.removeEventListener('showLowBalanceNotification', handleShowNotification);
    }, [isLowBalance, user?.created_at]);

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
        window.dispatchEvent(new CustomEvent('notificationDismissed'));
    };

    const getNotificationContent = () => {
        if (isCriticalBalance) {
            return {
                title: lang === 'el' ? 'Κρίσιμα χαμηλό υπόλοιπο!' : 'Critical low balance!',
                message: lang === 'el'
                    ? 'Δεν μπορείτε να κάνετε στοιχήματα. Ώρα για να ανανεώσετε!'
                    : 'You cannot place bets. Top up now!',
                accent: 'from-red-500 via-rose-600 to-red-700'
            };
        } else if (isVeryLowBalance) {
            return {
                title: lang === 'el' ? 'Πολύ χαμηλό υπόλοιπο' : 'Very low balance',
                message: lang === 'el'
                    ? 'Ανανεώστε για να συνεχίσετε να παίζετε άφοβα!'
                    : 'Top up to continue playing!',
                accent: 'from-amber-500 via-orange-600 to-amber-700'
            };
        } else {
            return {
                title: lang === 'el' ? 'Χαμηλό υπόλοιπο' : 'Low balance',
                message: lang === 'el'
                    ? 'Σκεφτείτε να ανανεώσετε για καλύτερες ευκαιρίες!'
                    : 'Consider topping up for better opportunities!',
                accent: 'from-emerald-500 via-green-600 to-emerald-700'
            };
        }
    };

    const content = getNotificationContent();

    if (!isVisible || !isLowBalance) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-none"
                >
                    <motion.div
                        layout
                        className={`
                            relative overflow-hidden pointer-events-auto w-full max-w-lg sm:max-w-xl
                            bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
                            border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/50
                            ring-1 ring-white/10 backdrop-blur-xl
                        `}
                    >
                        {/* Gradient accent bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 sm:h-2 bg-gradient-to-r ${content.accent}`} />

                        <div className="p-4 sm:p-6 lg:p-8">
                            <button
                                onClick={handleDismiss}
                                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/50 hover:text-white text-2xl sm:text-3xl leading-none p-2 rounded-full hover:bg-white/10 transition-all duration-200 z-10 min-w-[40px] min-h-[40px] flex items-center justify-center"
                                aria-label={lang === 'el' ? 'Κλείσιμο' : 'Close'}
                            >
                                ×
                            </button>

                            <div className="flex gap-4 sm:gap-6 pr-12 sm:pr-14">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold text-lg sm:text-xl lg:text-2xl mb-1 sm:mb-2">
                                        {content.title}
                                    </h3>
                                    <p className="text-white/80 text-sm sm:text-base mb-4 sm:mb-6 leading-relaxed">
                                        {content.message}
                                    </p>
                                    <p className="text-white/70 text-xs sm:text-sm mb-3 sm:mb-4 font-medium">
                                        {lang === 'el' ? 'Επιλέξτε πακέτο:' : 'Choose a pack:'}
                                    </p>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {coinPacksLoading ? (
                                            [...Array(3)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="h-16 sm:h-20 w-20 sm:w-24 rounded-xl bg-white/10 animate-pulse"
                                                />
                                            ))
                                        ) : (
                                            coinPacks.slice(0, 3).map((pack, index) => {
                                                const styles = [
                                                    'from-emerald-500 via-green-600 to-emerald-700 hover:from-emerald-600 hover:via-green-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/25',
                                                    'from-blue-500 via-indigo-600 to-blue-700 hover:from-blue-600 hover:via-indigo-700 hover:to-blue-800 shadow-lg shadow-blue-500/25',
                                                    'from-amber-500 via-orange-600 to-amber-700 hover:from-amber-600 hover:via-orange-700 hover:to-amber-800 shadow-lg shadow-amber-500/25'
                                                ];
                                                return (
                                                    <Button
                                                        key={pack.id}
                                                        onClick={() => handleTopUp(pack.id)}
                                                        disabled={isProcessing}
                                                        className={`
                                                            flex-1 min-w-[90px] sm:min-w-[110px] h-16 sm:h-20
                                                            bg-gradient-to-br ${styles[index]}
                                                            text-white font-bold text-base sm:text-lg
                                                            rounded-xl sm:rounded-2xl
                                                            transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]
                                                            border-0 shadow-lg
                                                        `}
                                                    >
                                                        {isProcessing ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                <span className="text-sm">...</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className="flex items-center gap-1 font-bold">
                                                                    {pack.base_coins + pack.bonus_coins}
                                                                    <CoinIcon size={18} />
                                                                </span>
                                                                <span className="text-white/95 text-sm sm:text-base font-semibold">
                                                                    €{pack.price_euro.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </Button>
                                                );
                                            })
                                        )}
                                    </div>
                                    <a
                                        href={`/${lang}/rewards`}
                                        className="inline-block mt-4 sm:mt-5 text-sm sm:text-base text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                                    >
                                        {lang === 'el' ? 'Όλες οι επιλογές →' : 'View all options →'}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
