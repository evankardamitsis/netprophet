'use client';

import { motion } from 'framer-motion';
import { useDictionary } from '@/context/DictionaryContext';
import { useState } from 'react';

interface FloatingPredictionButtonProps {
    predictions: any[];
    onClick: () => void;
}

export function FloatingPredictionButton({ predictions, onClick }: FloatingPredictionButtonProps) {
    const { dict, lang } = useDictionary();
    const [isHovered, setIsHovered] = useState(false);

    // Calculate total potential winnings
    const totalWinnings = predictions.reduce((sum, pred) => {
        return sum + (pred.potentialWinnings || (pred.betAmount || 0) * (pred.multiplier || 1));
    }, 0);

    return (
        <motion.button
            onClick={onClick}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="fixed bottom-6 right-6 z-50 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            {/* Glow effect */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 rounded-2xl blur-xl opacity-60"
                animate={{
                    opacity: isHovered ? 0.8 : 0.4,
                    scale: isHovered ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
            />

            {/* Main button */}
            <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-2 border-purple-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-sm">
                {/* Animated border gradient */}
                <motion.div
                    className="absolute inset-0 rounded-2xl opacity-50"
                    style={{
                        background: 'linear-gradient(45deg, transparent, rgba(147, 51, 234, 0.5), transparent)',
                        backgroundSize: '200% 200%',
                    }}
                    animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                />

                {/* Content */}
                <div className="relative flex items-center space-x-3">
                    {/* Icon with pulse animation */}
                    <motion.div
                        className="relative"
                        animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        <div className="absolute inset-0 bg-purple-500 rounded-full blur-md opacity-50" />
                        <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 p-2.5 rounded-xl">
                            <BettingSlipIcon className="h-6 w-6 text-white" />
                        </div>
                    </motion.div>

                    {/* Text content */}
                    <div className="flex flex-col items-start">
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                                {dict?.matches?.bettingSlip || 'Betting Slip'}
                            </span>
                            <motion.div
                                className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                                animate={{
                                    scale: [1, 1.1, 1],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                }}
                            >
                                {predictions.length}
                            </motion.div>
                        </div>
                        {totalWinnings > 0 && (
                            <motion.div
                                className="text-xs font-bold text-green-400 flex items-center space-x-1"
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <span>💰</span>
                                <span>{totalWinnings.toLocaleString()}</span>
                            </motion.div>
                        )}
                    </div>

                    {/* Arrow indicator */}
                    <motion.div
                        animate={{
                            x: [0, 5, 0],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                        }}
                    >
                        <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </motion.div>
                </div>

                {/* Hover effect overlay */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl"
                    animate={{
                        opacity: isHovered ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                />
            </div>
        </motion.button>
    );
}

function BettingSlipIcon({ className = "h-8 w-8 text-green-500" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
    );
}
