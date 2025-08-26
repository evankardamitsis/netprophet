'use client';

import { motion } from 'framer-motion';
import { useDictionary } from '@/context/DictionaryContext';

interface FloatingPredictionButtonProps {
    predictions: any[]; // Changed from PredictionItem[] to any[]
    onClick: () => void;
}

export function FloatingPredictionButton({ predictions, onClick }: FloatingPredictionButtonProps) {
    const { dict, lang } = useDictionary();

    return (
        <motion.button
            onClick={onClick}
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-4 rounded-full shadow-2xl transform transition-all duration-200 hover:scale-110 active:scale-95 flex items-center space-x-2"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
        >
            <BettingSlipIcon className="h-5 w-5" />
            <div className="text-sm font-semibold">
                {predictions.length} {predictions.length !== 1 ? (dict?.matches?.picks || 'picks') : (dict?.matches?.pick || 'pick')}
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
