'use client';

import { motion } from 'framer-motion';
import { useDictionary } from '@/context/DictionaryContext';
import { gradients, shadows, borders, typography, cx } from '@/styles/design-system';
import { displayName } from './utils';
import type { MatchDetails, PredictionOptions } from './types';

interface MatchWinnerSectionProps {
    formPredictions: PredictionOptions;
    details: MatchDetails;
    isDoubles: boolean;
    locked?: boolean;
    onWinnerChange: (winner: string) => void;
    onInteraction: () => void;
}

export function MatchWinnerSection({
    formPredictions,
    details,
    isDoubles,
    locked,
    onWinnerChange,
    onInteraction
}: MatchWinnerSectionProps) {
    const { dict } = useDictionary();

    return (
        <motion.div
            className={cx(
                'bg-slate-800/50 backdrop-blur-sm p-2.5 sm:p-3 border',
                borders.rounded.sm,
                !formPredictions.winner ? 'border-yellow-400/60 border-2 animate-pulse' : 'border-slate-700/50'
            )}
        >
            <div className="flex items-center space-x-2 mb-2">
                <h3 className={cx(typography.body.md, 'font-bold text-white')}>
                    🏆 {dict?.matches?.matchWinner || 'Match Winner'}
                </h3>
                <span className={cx('text-xs font-bold px-2 py-1 rounded-full', 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30')}>
                    {dict?.matches?.required || 'Required'}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <motion.button
                    onClick={() => {
                        onInteraction();
                        onWinnerChange(formPredictions.winner === details.player1.name ? '' : details.player1.name);
                    }}
                    disabled={locked}
                    className={cx(
                        'p-2.5 sm:p-2 border min-h-[60px] sm:min-h-0',
                        borders.rounded.sm,
                        locked
                            ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                            : formPredictions.winner === details.player1.name
                                ? cx(gradients.purple, 'border-purple-400 text-white', shadows.glow.purple)
                                : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50 hover:border-slate-500/50'
                    )}
                    whileHover={!locked ? { scale: 1.05 } : {}}
                    whileTap={!locked ? { scale: 0.95 } : {}}
                >
                    <div className="flex flex-col items-start sm:items-center text-left sm:text-center">
                        <div className="text-sm font-semibold break-words w-full">
                            {displayName(details.player1.name, isDoubles)}
                            {details.player1.ntrpRating && (
                                <span className="text-xs text-gray-200 ml-1">({details.player1.ntrpRating.toFixed(1)})</span>
                            )}
                        </div>
                        {details.player1.teamName && (
                            <span className="text-orange-400 text-[10px] sm:text-xs leading-tight break-words mt-0.5 w-full">{details.player1.teamName}</span>
                        )}
                    </div>
                    <div className="text-xs text-yellow-400 font-bold">{details.player1.odds.toFixed(2)}x</div>
                </motion.button>
                <motion.button
                    onClick={() => {
                        onInteraction();
                        onWinnerChange(formPredictions.winner === details.player2.name ? '' : details.player2.name);
                    }}
                    disabled={locked}
                    className={cx(
                        'p-2.5 sm:p-2 border min-h-[60px] sm:min-h-0',
                        borders.rounded.sm,
                        locked
                            ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                            : formPredictions.winner === details.player2.name
                                ? cx(gradients.purple, 'border-purple-400 text-white', shadows.glow.purple)
                                : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50 hover:border-slate-500/50'
                    )}
                    whileHover={!locked ? { scale: 1.05 } : {}}
                    whileTap={!locked ? { scale: 0.95 } : {}}
                >
                    <div className="flex flex-col items-start sm:items-center text-left sm:text-center">
                        <div className="text-sm font-semibold break-words w-full">
                            {displayName(details.player2.name, isDoubles)}
                            {details.player2.ntrpRating && (
                                <span className="text-xs text-gray-200 ml-1">({details.player2.ntrpRating.toFixed(1)})</span>
                            )}
                        </div>
                        {details.player2.teamName && (
                            <span className="text-orange-400 text-[10px] sm:text-xs leading-tight break-words mt-0.5 w-full">{details.player2.teamName}</span>
                        )}
                    </div>
                    <div className="text-xs text-yellow-400 font-bold">{details.player2.odds.toFixed(2)}x</div>
                </motion.button>
            </div>
        </motion.div>
    );
}
