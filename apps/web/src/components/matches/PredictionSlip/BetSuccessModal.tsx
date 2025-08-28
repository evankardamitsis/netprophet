'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@netprophet/ui';
import { useRouter } from 'next/navigation';
import { useDictionary } from '@/context/DictionaryContext';
import { useEffect, useState } from 'react';

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
        router.push(`/${lang}/matches/my-picks`);
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
                        className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-slate-700/50 shadow-2xl"
                    >
                        {/* Success Icon */}
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/50">
                                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {dict?.matches?.betSuccessTitle || '🎯 Prediction Placed!'}
                            </h2>
                            <p className="text-gray-300 text-sm">
                                {dict?.matches?.betSuccessMessage || 'Your prediction has been successfully placed and is now active.'}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <Button
                                onClick={handleBackToMatches}
                                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                {dict?.matches?.backToMatches || '← Back to Matches'}
                            </Button>

                            <Button
                                onClick={handleViewMyPicks}
                                variant="outline"
                                className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-600/20 hover:text-purple-200 font-semibold py-3 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                {dict?.matches?.viewMyPicks || 'View My Picks'}
                            </Button>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
