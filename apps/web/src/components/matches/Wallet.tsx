'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, Button } from '@netprophet/ui';
import { useWallet } from '@/context/WalletContext';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { Dictionary } from '@/types/dictionary';

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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

interface WalletProps {
    dict?: Dictionary;
    lang?: 'en' | 'el';
}

export function Wallet({ dict, lang = 'en' }: WalletProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { wallet } = useWallet();
    const { predictions } = usePredictionSlip();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Calculate pending bets from prediction slip
    const pendingBetAmount = predictions.reduce((total, item) => total + (item.betAmount || 0), 0);
    const availableBalance = wallet.balance - pendingBetAmount;

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
                return <TrendingUpIcon className="text-green-500 h-6 w-6" />;
            case 'loss':
                return <TrendingDownIcon className="text-red-500 h-6 w-6" />;
            case 'bet':
                return <PlusIcon className="text-blue-500 h-12 w-12" />;
            case 'welcome_bonus':
            case 'daily_login':
            case 'referral':
            case 'leaderboard':
                return <TrendingUpIcon className="text-yellow-500 h-6 w-6" />;
            case 'purchase':
            case 'tournament_entry':
            case 'insight_unlock':
                return <PlusIcon className="text-purple-500 h-12 w-12" />;
            default:
                return <PlusIcon className="text-gray-500 h-12 w-12" />;
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

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-full transition shadow-lg hover:shadow-xl bg-[#23262F] hover:bg-[#2A2D38] shadow-gray-900/50"
                aria-label="Wallet"
            >
                <span className="font-bold text-yellow-300">
                    {availableBalance} 🌕
                </span>
                {pendingBetAmount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-900 text-blue-300">
                        -{pendingBetAmount}
                    </span>
                )}
                {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg z-[9999] bg-[#23262F] border border-[#2A2D38]" style={{
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1) inset',
                    transform: 'translateZ(0)',
                    filter: 'drop-shadow(0 10px 8px rgb(0 0 0 / 0.4))'
                }}>
                    {/* Header */}
                    <div className="p-4 border-b border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-white">{dict?.wallet?.balance || 'My Wallet'}</h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white">
                                {dict?.wallet?.active || 'Active'}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-300">
                            {availableBalance} 🌕
                        </div>
                        <div className="text-sm text-gray-400">
                            {dict?.wallet?.availableCoins || 'Available Coins'}
                        </div>

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

                        {/* Daily Login Streak */}
                        {wallet.dailyLoginStreak > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-blue-500">🔥</span>
                                <span className="text-xs text-gray-400">
                                    {wallet.dailyLoginStreak} {dict?.wallet?.dayStreak || 'day streak'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="p-4 border-b border-gray-700">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <div className={`text-lg font-bold ${wallet.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(wallet.netProfit)}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {dict?.wallet?.netProfit || 'Net Profit'}
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
                            <div className="text-center">
                                <div className="text-lg font-bold text-green-600">
                                    {formatCurrency(wallet.totalWinnings)}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {dict?.wallet?.totalWinnings || 'Total Winnings'}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-red-600">
                                    {formatCurrency(-wallet.totalLosses)}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {dict?.wallet?.totalLosses || 'Total Losses'}
                                </div>
                            </div>
                        </div>

                        {/* Additional Coin Stats */}
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="text-center">
                                    <div className="font-semibold text-green-400">
                                        {formatCurrency(wallet.totalCoinsEarned)}
                                    </div>
                                    <div className="text-gray-400">
                                        {dict?.wallet?.totalEarned || 'Total Earned'}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="font-semibold text-red-400">
                                        {formatCurrency(-wallet.totalCoinsSpent)}
                                    </div>
                                    <div className="text-gray-400">
                                        {dict?.wallet?.totalSpent || 'Total Spent'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-white">{dict?.wallet?.recentActivity || 'Recent Activity'}</h4>
                            <Button className="text-xs border border-gray-600 bg-transparent hover:bg-gray-700">
                                <HistoryIcon className="mr-1" />
                                {dict?.wallet?.viewAll || 'View All'}
                            </Button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {wallet.recentTransactions.length === 0 ? (
                                <div className="text-center py-4 text-sm text-gray-400">
                                    {dict?.wallet?.noTransactions || 'No transactions yet'}
                                </div>
                            ) : (
                                wallet.recentTransactions.slice(0, 4).map((transaction) => (
                                    <div
                                        key={transaction.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-[#2A2D38]"
                                    >
                                        <div className="flex items-center gap-2">
                                            {getTransactionIcon(transaction.type)}
                                            <div>
                                                <div className="text-sm font-medium text-white">
                                                    {transaction.description}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {formatTimeAgo(transaction.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                                            {formatCurrency(transaction.amount)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 