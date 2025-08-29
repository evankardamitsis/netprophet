'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Button } from '@netprophet/ui';
import { useWallet } from '@/context/WalletContext';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { Dictionary } from '@/types/dictionary';
import { useStripePayment } from '@/hooks/useStripePayment';
import { useAuth } from '@/hooks/useAuth';
import { useCoinPacks } from '@/hooks/useCoinPacks';
import { toast } from 'sonner';

// Icon components
function ChevronUpIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
}

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
}

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
}

function HistoryIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
}

function TrendingUpIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
}

function TrendingDownIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
    </svg>
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
}

function MinusIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
}

function WarningIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
}

function CoinsIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
}

interface WalletProps {
    dict?: Dictionary;
    lang?: 'en' | 'el';
}

export function Wallet({ dict, lang = 'en' }: WalletProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { wallet } = useWallet();
    const { predictions } = usePredictionSlip();
    const { processPayment, isProcessing } = useStripePayment();
    const { user } = useAuth();
    const { coinPacks, loading: coinPacksLoading } = useCoinPacks();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Calculate pending bets from prediction slip
    const pendingBetAmount = predictions.reduce((total, item) => total + (item.betAmount || 0), 0);
    const availableBalance = wallet.balance - pendingBetAmount;

    // Low balance thresholds
    const isLowBalance = availableBalance <= 200;
    const isVeryLowBalance = availableBalance < 100;
    const isCriticalBalance = availableBalance < 50;

    useEffect(() => {
        if (!isOpen) return;
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const formatCurrency = (amount: number) => {
        return `${amount >= 0 ? '+' : ''}${amount} 🌕`;
    };

    const formatPercentage = (value: number) => {
        return `${value}%`;
    };

    const getTransactionIcon = (type: 'bet' | 'win' | 'loss' | 'welcome_bonus' | 'daily_login' | 'referral' | 'leaderboard' | 'purchase' | 'tournament_entry' | 'insight_unlock') => {
        switch (type) {
            case 'win':
                return <TrendingUpIcon className="text-green-500 h-4 w-4" />;
            case 'loss':
                return <TrendingDownIcon className="text-red-500 h-4 w-4" />;
            case 'bet':
                return <PlusIcon className="text-blue-500 h-4 w-4" />;
            case 'welcome_bonus':
            case 'daily_login':
            case 'referral':
            case 'leaderboard':
                return <TrendingUpIcon className="text-yellow-500 h-4 w-4" />;
            case 'purchase':
            case 'tournament_entry':
            case 'insight_unlock':
                return <PlusIcon className="text-purple-500 h-4 w-4" />;
            default:
                return <PlusIcon className="text-gray-500 h-4 w-4" />;
        }
    };

    const getTransactionColor = (type: 'bet' | 'win' | 'loss' | 'welcome_bonus' | 'daily_login' | 'referral' | 'leaderboard' | 'purchase' | 'tournament_entry' | 'insight_unlock') => {
        switch (type) {
            case 'win':
            case 'welcome_bonus':
            case 'daily_login':
            case 'referral':
            case 'leaderboard':
                return 'text-green-600';
            case 'loss':
                return 'text-red-600';
            case 'bet':
                return 'text-blue-600';
            case 'purchase':
            case 'tournament_entry':
            case 'insight_unlock':
                return 'text-purple-600';
            default:
                return 'text-gray-600';
        }
    };

    const formatTimeAgo = (timestamp: Date) => {
        // Safety check for invalid timestamps
        if (!timestamp || !(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
            return 'Unknown time';
        }

        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    };

    const handleTopUp = async (packId: string) => {
        if (!user) {
            toast.error('Please sign in to purchase coins');
            return;
        }

        try {
            await processPayment(packId);
        } catch (error) {
            console.error('Top-up error:', error);
        }
    };

    const getLowBalanceMessage = () => {
        if (isCriticalBalance) {
            return {
                message: lang === 'el' ? 'Κρίσιμα χαμηλό υπόλοιπο!' : 'Critical low balance!',
                color: 'text-red-400',
                bgColor: 'bg-red-900/20',
                borderColor: 'border-red-800'
            };
        } else if (isVeryLowBalance) {
            return {
                message: lang === 'el' ? 'Πολύ χαμηλό υπόλοιπο' : 'Very low balance',
                color: 'text-orange-400',
                bgColor: 'bg-orange-900/20',
                borderColor: 'border-orange-800'
            };
        } else if (isLowBalance) {
            return {
                message: lang === 'el' ? 'Χαμηλό υπόλοιπο' : 'Low balance',
                color: 'text-yellow-400',
                bgColor: 'bg-yellow-900/20',
                borderColor: 'border-yellow-800'
            };
        }
        return null;
    };

    const lowBalanceInfo = getLowBalanceMessage();

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex items-center gap-1 px-2 py-1 rounded-lg transition shadow-lg hover:shadow-xl bg-transparent hover:bg-slate-800/50 ${isOpen ? 'pointer-events-none' : ''}`}
                aria-label={isOpen ? undefined : "Wallet"}
                title={isOpen ? undefined : "Wallet"}
            >
                {/* Coin Icon with Balance Overlay */}
                <div className="relative">
                    <span className="text-lg">🌕</span>
                    {/* Balance Badge on top right */}
                    <div className="absolute -top-1.5 -right-4 bg-slate-800 border border-slate-600 rounded-full px-1.5 min-w-[16px] h-4 flex items-center justify-center">
                        <span className={`font-bold text-xs ${isLowBalance ? 'text-red-400' : 'text-yellow-300'}`}>
                            {availableBalance}
                        </span>
                    </div>
                    {/* Pending Bet Badge */}
                    {pendingBetAmount > 0 && (
                        <div className="absolute -bottom-1 -left-1 bg-blue-900 border border-blue-700 rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                            <span className="text-xs text-blue-300">
                                -{pendingBetAmount}
                            </span>
                        </div>
                    )}
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed sm:absolute left-1/2 sm:right-0 sm:left-auto top-16 sm:top-auto sm:mt-2 transform -translate-x-1/2 sm:translate-x-0 w-72 sm:w-80 z-50" onMouseEnter={(e) => e.stopPropagation()}>
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="rounded-lg shadow-lg overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50"
                            onMouseEnter={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-white">{dict?.wallet?.balance || 'My Wallet'}</h3>
                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white">
                                        {dict?.wallet?.active || 'Active'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className={`text-lg font-bold ${isLowBalance ? 'text-red-300' : 'text-yellow-300'}`}>
                                        {availableBalance} 🌕
                                    </div>
                                    {wallet.dailyLoginStreak > 0 && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-blue-500">🔥</span>
                                            <span className="text-xs text-gray-400">
                                                {wallet.dailyLoginStreak}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {dict?.wallet?.availableCoins || 'Available Coins'}
                                </div>

                                {/* Low Balance Warning */}
                                {lowBalanceInfo && (
                                    <div className={`mt-2 p-2 rounded-lg ${lowBalanceInfo.bgColor} border ${lowBalanceInfo.borderColor}`}>
                                        <div className="flex items-center gap-2">
                                            <WarningIcon className={`${lowBalanceInfo.color} h-4 w-4`} />
                                            <div className="flex-1">
                                                <div className={`text-sm font-medium ${lowBalanceInfo.color}`}>
                                                    {lowBalanceInfo.message}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {lang === 'el' ? 'Ήρθε η ώρα για να ανανεώσετε!' : 'It\'s time to top up!'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Pending Bets Indicator */}
                                {pendingBetAmount > 0 && (
                                    <div className="mt-2 p-2 rounded-lg bg-blue-900/20 border border-blue-800">
                                        <div className="flex items-center gap-2">
                                            <ClockIcon className="text-blue-500 h-4 w-4" />
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-blue-300">
                                                    {dict?.wallet?.pendingBets || 'Pending Bets'}: {pendingBetAmount} 🌕
                                                </div>
                                                <div className="text-xs text-blue-400">
                                                    {predictions.length} {dict?.wallet?.matchesInSlip || 'matches in slip'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick Top-up Section */}
                            {isLowBalance && (
                                <div className="p-4 border-b border-gray-700">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                            <CoinsIcon className="h-4 w-4 text-yellow-400" />
                                            {lang === 'el' ? 'Γρήγορη Ανανέωση' : 'Quick Top-up'}
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {coinPacksLoading ? (
                                            <>
                                                <Button disabled className="text-xs py-1.5 bg-gray-600 text-white">
                                                    Loading...
                                                </Button>
                                                <Button disabled className="text-xs py-1.5 bg-gray-600 text-white">
                                                    Loading...
                                                </Button>
                                            </>
                                        ) : (
                                            coinPacks.slice(0, 2).map((pack, index) => (
                                                <Button
                                                    key={pack.id}
                                                    onClick={() => handleTopUp(pack.id)}
                                                    disabled={isProcessing}
                                                    className={`text-xs py-1.5 text-white ${index === 0
                                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                                                        }`}
                                                >
                                                    {isProcessing ? '...' : (
                                                        <div className="flex flex-col items-center">
                                                            <span>{pack.base_coins + pack.bonus_coins} 🌕</span>
                                                            <span className="text-xs opacity-80">€{pack.price_euro.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </Button>
                                            ))
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 text-center">
                                        {lang === 'el' ? 'Κάντε κλικ για να αγοράσετε' : 'Click to purchase'}
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}
                            <div className="p-4 border-b border-gray-700">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-green-600">
                                            {formatCurrency(wallet.totalWinnings)}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {dict?.wallet?.totalWinnings || 'Total Winnings'}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-blue-400">
                                            {formatPercentage(wallet.winRate)}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {dict?.wallet?.winRate || 'Win Rate'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Transactions */}
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold text-white">{dict?.wallet?.recentActivity || 'Recent Activity'}</h4>
                                    <Button
                                        className="p-0 h-6 bg-transparent hover:bg-gray-700"
                                        onClick={() => router.push(`/${lang}/matches/my-picks`)}
                                    >
                                        <HistoryIcon className="h-3 w-3 text-white" />
                                    </Button>
                                </div>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {wallet.recentTransactions.length === 0 ? (
                                        <div className="text-center py-2 text-xs text-gray-400">
                                            {dict?.wallet?.noTransactions || 'No transactions yet'}
                                        </div>
                                    ) : (
                                        wallet.recentTransactions.slice(0, 3).map((transaction) => (
                                            <div
                                                key={transaction.id}
                                                className="flex items-center justify-between p-1 rounded-lg hover:bg-[#2A2D38]"
                                            >
                                                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                                    {getTransactionIcon(transaction.type)}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-medium text-white break-words">
                                                            {transaction.description}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            {formatTimeAgo(transaction.timestamp)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`text-xs font-semibold ${getTransactionColor(transaction.type)}`}>
                                                    {formatCurrency(transaction.amount)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
} 