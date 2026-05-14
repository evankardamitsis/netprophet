'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@netprophet/ui';
import { formatWinnings } from '@netprophet/lib';
import { COIN_CONSTANTS } from '@/context/WalletContext';
import CoinIcon from '@/components/CoinIcon';
import { useDictionary } from '@/context/DictionaryContext';

interface PredictionCardProps {
    item: any;
    index: number;
    isParlayMode: boolean;
    walletBalance: number;
    onRemovePrediction: (matchId: string) => void;
    onUpdateBetAmount: (matchId: string, amount: number) => void;
    formatPredictionDisplay: (prediction: any, match?: any) => string;
    dict?: any;
    hasDoublePointsMatchPowerUp?: boolean;
    isUsingDoublePointsMatch?: boolean;
    onToggleDoublePointsMatch?: (matchId: string) => void;
    isExpanded?: boolean;
    onToggleExpand?: (matchId: string) => void;
}

export function PredictionCard({
    item,
    index,
    isParlayMode,
    walletBalance,
    onRemovePrediction,
    onUpdateBetAmount,
    formatPredictionDisplay,
    dict,
    hasDoublePointsMatchPowerUp = false,
    isUsingDoublePointsMatch = false,
    onToggleDoublePointsMatch,
    isExpanded = true,
    onToggleExpand
}: PredictionCardProps) {
    const { prepForUppercaseDisplay } = useDictionary();

    // If collapsed, show minimal info
    if (!isExpanded) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.1 }}
            >
                <div
                    className="relative overflow-hidden rounded-xl bg-[#161F35] border border-white/[0.08] hover:border-white/[0.16] transition-colors cursor-pointer active:scale-[0.99]"
                    onClick={() => onToggleExpand?.(item.matchId)}
                >
                    <div className="p-2 sm:p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">
                                    {item.match.match_type === 'doubles'
                                        ? `${item.match.player1.name} vs ${item.match.player2.name}`
                                        : `${item.match.player1.name.split(' ').pop()} vs ${item.match.player2.name.split(' ').pop()}`
                                    }
                                </h4>
                                <p className="text-[10px] text-[#4B5975] truncate mt-0.5">
                                    {formatPredictionDisplay(item.prediction, item.match)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="text-right">
                                    <div className="text-xs font-bold text-[#94A3B8]">
                                        {(item.multiplier || 1).toFixed(2)}×
                                    </div>
                                    {(item.betAmount || 0) > 0 && (
                                        <div className="text-xs font-black text-[#00E676] tabular-nums">
                                            {formatWinnings((item.betAmount || 0) * (item.multiplier || 1))} 🪙
                                        </div>
                                    )}
                                </div>
                                <svg className="h-3.5 w-3.5 text-[#4B5975]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    const QUICK_AMOUNTS = [10, 50, 100, 250];
    const isMax = item.betAmount >= walletBalance && walletBalance > 0;

    // Expanded view
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ delay: index * 0.07, duration: 0.2 }}
        >
            <div className={[
                "relative overflow-hidden rounded-2xl border",
                isUsingDoublePointsMatch
                    ? "bg-[#1a1a0a] border-[#FF6B2B]/40"
                    : "bg-[#161F35] border-white/[0.08]",
            ].join(" ")}>
                {/* Shine line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

                <div className="p-3 space-y-3">
                    {/* Header row */}
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-[#4B5975] uppercase tracking-wider truncate mb-0.5">
                                {prepForUppercaseDisplay(item.match.tournament || 'Tournament')}
                            </div>
                            <h4 className="text-sm font-bold text-white leading-tight">
                                {item.match.match_type === 'doubles'
                                    ? `${item.match.player1.name} vs ${item.match.player2.name}`
                                    : `${item.match.player1.name.split(' ').pop()} vs ${item.match.player2.name.split(' ').pop()}`
                                }
                            </h4>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                            {onToggleExpand && (
                                <button
                                    onClick={() => onToggleExpand(item.matchId)}
                                    className="p-1.5 rounded-lg bg-[#1E2A45] text-[#4B5975] hover:text-white transition-colors"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>
                            )}
                            <button
                                onClick={() => onRemovePrediction(item.matchId)}
                                className="p-1.5 rounded-lg bg-[#1E2A45] text-[#4B5975] hover:text-[#FF4545] transition-colors"
                            >
                                <XIcon />
                            </button>
                        </div>
                    </div>

                    {/* Prediction pill */}
                    <div className="px-2.5 py-2 rounded-xl bg-[#0F1628] border border-white/[0.06]">
                        <div className="flex items-start gap-1.5">
                            <span className="text-[10px] text-[#4B5975] font-semibold mt-0.5 uppercase tracking-wide flex-shrink-0">
                                {prepForUppercaseDisplay(dict?.matches?.pick || 'Pick')}
                            </span>
                            <span className="text-xs font-semibold text-[#94A3B8] leading-relaxed">
                                {formatPredictionDisplay(item.prediction)}
                            </span>
                        </div>
                    </div>

                    {/* Double Points Match power-up */}
                    {hasDoublePointsMatchPowerUp && onToggleDoublePointsMatch && (
                        <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-[#FF6B2B]/08 border border-[#FF6B2B]/25">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">🎯</span>
                                <div>
                                    <div className="text-white font-bold text-xs">
                                        {dict?.matches?.powerUps?.doublePointsMatch || 'Double Points Match'}
                                    </div>
                                    <div className="text-[#FF6B2B] text-[10px]">
                                        {isUsingDoublePointsMatch ? '2× Ενεργό' : 'Ενεργοποίηση 2×'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => onToggleDoublePointsMatch(item.matchId)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 ${isUsingDoublePointsMatch ? 'bg-[#FF6B2B]' : 'bg-[#1E2A45]'}`}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform duration-200 ${isUsingDoublePointsMatch ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    )}

                    {/* Stake section */}
                    <div className="space-y-2">
                        {/* Label row: stake label + balance + odds */}
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[#4B5975] font-semibold uppercase tracking-wide">
                                {prepForUppercaseDisplay(dict?.matches?.stake || 'Νομίσματα')}
                            </span>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-[#4B5975]">
                                    Υπόλοιπο: <span className="text-[#94A3B8] font-bold tabular-nums">{walletBalance.toLocaleString('el-GR')} 🌕</span>
                                </span>
                                <span className="text-[#263354]">·</span>
                                <span className="text-[#94A3B8]">{(item.multiplier || 1).toFixed(2)}×</span>
                            </div>
                        </div>

                        {/* Quick-amount chip row */}
                        <div className="flex gap-1.5">
                            {QUICK_AMOUNTS.map((amt) => {
                                const isActive = item.betAmount === amt;
                                const canAfford = walletBalance >= amt;
                                return (
                                    <button
                                        key={amt}
                                        onClick={() => canAfford && onUpdateBetAmount(item.matchId, amt)}
                                        disabled={!canAfford}
                                        className={[
                                            "flex-1 py-2 rounded-xl text-xs font-black transition-all duration-100 active:scale-95",
                                            isActive
                                                ? "bg-[#FFD60A] text-[#080C18]"
                                                : canAfford
                                                ? "bg-[#1E2A45] text-[#94A3B8] hover:bg-[#263354] hover:text-white border border-white/[0.06]"
                                                : "bg-[#1E2A45]/50 text-[#4B5975] cursor-not-allowed border border-white/[0.04]",
                                        ].join(" ")}
                                    >
                                        {amt}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => walletBalance > 0 && onUpdateBetAmount(item.matchId, walletBalance)}
                                className={[
                                    "flex-1 py-2 rounded-xl text-xs font-black transition-all duration-100 active:scale-95 border",
                                    isMax
                                        ? "bg-[#FFD60A] text-[#080C18] border-[#FFD60A]"
                                        : "bg-[#1E2A45] text-[#94A3B8] hover:bg-[#263354] hover:text-white border-white/[0.06]",
                                ].join(" ")}
                            >
                                Max
                            </button>
                        </div>

                        {/* Custom amount input */}
                        <input
                            type="number"
                            min={COIN_CONSTANTS.MIN_BET}
                            max={walletBalance}
                            value={item.betAmount || ''}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') { onUpdateBetAmount(item.matchId, 0); return; }
                                const n = Number(raw);
                                onUpdateBetAmount(item.matchId, Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);
                            }}
                            placeholder={`Ή πληκτρολόγησε νομίσματα (min ${COIN_CONSTANTS.MIN_BET})`}
                            className="w-full px-3 py-2 rounded-xl bg-[#0F1628] border border-white/[0.08] text-white text-sm font-bold placeholder:text-[#4B5975] placeholder:font-normal focus:outline-none focus:border-[#FFD60A]/50 focus:ring-1 focus:ring-[#FFD60A]/30 transition-all tabular-nums"
                        />

                        {/* Live winnings preview bar */}
                        {(item.betAmount || 0) > 0 && (() => {
                            const mult = item.multiplier || 1;
                            const coins = (item.betAmount || 0) * mult;
                            const pts = 10 + (mult >= 2.0 ? Math.floor(mult * 5) : 0);
                            return (
                                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#00E676]/08 border border-[#00E676]/20">
                                    <span className="text-xs text-[#00E676]/70">Αν κερδίσεις:</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black tabular-nums text-[#00E676]">
                                            +{formatWinnings(coins)} 🪙
                                        </span>
                                        <span className="text-[#263354]">·</span>
                                        <span className="text-xs font-black tabular-nums text-[#FFD60A]">
                                            +{pts} 🏆
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function XIcon() {
    return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}
