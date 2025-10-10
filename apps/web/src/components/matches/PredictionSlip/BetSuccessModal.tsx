'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@netprophet/ui';
import { useRouter } from 'next/navigation';
import { useDictionary } from '@/context/DictionaryContext';
import { useEffect, useState } from 'react';
import { cx, borders, shadows, typography, gradients, transitions, animations } from '@/styles/design-system';

interface BetSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    lang: string;
}

export function BetSuccessModal({ isOpen, onClose, lang }: BetSuccessModalProps) {
    const router = useRouter();
    const { dict } = useDictionary();

    const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; color: string; rotation: number; delay: number }>>([]);

    // Generate confetti when modal opens
    useEffect(() => {
        if (isOpen) {
            const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: -10 - Math.random() * 20,
                color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][Math.floor(Math.random() * 8)],
                rotation: Math.random() * 360,
                delay: Math.random() * 0.5
            }));
            setConfetti(confettiPieces);
        } else {
            setConfetti([]);
        }
    }, [isOpen]);

    const handleBackToMatches = () => {
        onClose();
        router.push(`/${lang}/matches`);
    };

    const handleViewMyPicks = () => {
        onClose();
        router.push(`/${lang}/my-picks`);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
                    {/* Confetti */}
                    {confetti.map((piece) => (
                        <motion.div
                            key={piece.id}
                            className="absolute w-2 h-2 rounded-sm pointer-events-none"
                            style={{
                                left: `${piece.x}%`,
                                backgroundColor: piece.color,
                                zIndex: 40
                            }}
                            initial={{
                                y: piece.y,
                                x: piece.x,
                                rotate: piece.rotation,
                                opacity: 1
                            }}
                            animate={{
                                y: '100vh',
                                x: piece.x + (Math.random() - 0.5) * 20,
                                rotate: piece.rotation + 360,
                                opacity: [1, 1, 0]
                            }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                delay: piece.delay,
                                ease: "easeOut"
                            }}
                        />
                    ))}

                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={cx(
                            "relative p-8 max-w-md w-full mx-4 border border-slate-700/50",
                            "bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95",
                            "backdrop-blur-md",
                            borders.rounded.lg,
                            shadows.cardHover
                        )}
                    >
                        {/* Success Icon */}
                        <div className="text-center mb-6">
                            <motion.div
                                className={cx(
                                    "w-20 h-20 bg-green-500/20 flex items-center justify-center mx-auto mb-4 border-2 border-green-500/50",
                                    borders.rounded.full,
                                    shadows.glow.green
                                )}
                                animate={{
                                    scale: [1, 1.1, 1],
                                    rotate: [0, 5, -5, 0]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </motion.div>
                            <h2 className={cx(typography.heading.lg, "text-white mb-2")}>
                                {dict?.matches?.betSuccessTitle || '🎯 Prediction Placed!'}
                            </h2>
                            <p className={cx(typography.body.md, "text-gray-300")}>
                                {dict?.matches?.betSuccessMessage || 'Your prediction has been successfully placed and is now active.'}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    onClick={handleBackToMatches}
                                    className={cx(
                                        "w-full text-white font-semibold py-3",
                                        gradients.purple,
                                        borders.rounded.sm,
                                        transitions.default,
                                        shadows.glow.purple
                                    )}
                                >
                                    {dict?.matches?.backToMatches || '← Back to Matches'}
                                </Button>
                            </motion.div>

                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    onClick={handleViewMyPicks}
                                    variant="outline"
                                    className={cx(
                                        "w-full border-purple-500/50 text-purple-300 font-semibold py-3",
                                        "hover:bg-purple-600/30 hover:text-purple-200",
                                        borders.rounded.sm,
                                        transitions.default
                                    )}
                                >
                                    {dict?.matches?.viewMyPicks || 'View My Picks'}
                                </Button>
                            </motion.div>
                        </div>

                        {/* Close button */}
                        <motion.button
                            onClick={onClose}
                            className={cx(
                                "absolute top-4 right-4 text-gray-400 hover:text-white",
                                transitions.default
                            )}
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </motion.button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
