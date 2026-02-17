'use client';

import { motion } from 'framer-motion';
import { useDictionary } from '@/context/DictionaryContext';
import { displayName } from './utils';
import type { MatchDetails, PredictionOptions } from './types';

interface MatchResultSectionProps {
    formPredictions: PredictionOptions;
    details: MatchDetails;
    isBestOf5: boolean;
    isAmateurFormat: boolean;
    isDoubles: boolean;
    locked?: boolean;
    showPulse: boolean;
    onMatchResultChange: (value: string) => void;
}

export function MatchResultSection({
    formPredictions,
    details,
    isBestOf5,
    isAmateurFormat,
    isDoubles,
    locked,
    showPulse,
    onMatchResultChange
}: MatchResultSectionProps) {
    const { dict } = useDictionary();
    const winner = formPredictions.winner;
    if (!winner) return null;

    const formatLabel = isBestOf5
        ? dict?.matches?.bestOf5 || 'Best of 5'
        : isAmateurFormat
            ? dict?.matches?.bestOf3SuperTB || 'Best of 3 (Super TB)'
            : dict?.matches?.bestOf3 || 'Best of 3';

    const renderButton = (value: string, label: string, subLabel: string) => (
        <button
            key={value}
            onClick={() => onMatchResultChange(formPredictions.matchResult === value ? '' : value)}
            disabled={locked}
            className={`p-2 rounded-lg border ${locked
                ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                : formPredictions.matchResult === value
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50'
                }`}
        >
            <div className="text-base font-semibold">{label}</div>
            <div className="text-xs text-gray-400">{subLabel}</div>
        </button>
    );

    const straightSetsLabel = dict?.matches?.straightSets || 'Straight sets';
    const fourSetsLabel = dict?.matches?.fourSets || 'Four sets';
    const fiveSetsLabel = dict?.matches?.fiveSets || 'Five sets';
    const threeSetsLabel = dict?.matches?.threeSets || 'Three sets';
    const superTiebreakLabel = dict?.matches?.superTiebreak || 'Super tiebreak';

    return (
        <motion.div
            className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 border ${showPulse ? 'border-yellow-400 border-2' : 'border-slate-700/50'}`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white">{dict?.matches?.matchResult || 'Match Result'}</h3>
                    <div
                        className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center space-x-1 transition-all duration-300 ${formPredictions.matchResult ? 'bg-green-600/20 text-green-300 border-green-500/30' : 'bg-slate-700/20 text-slate-400 border-slate-600/30'}`}
                    >
                        <span>+0.2x</span>
                    </div>
                </div>
                <div className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/30">
                    {formatLabel}
                </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">
                {dict?.matches?.howWillWin?.replace('{player}', displayName(winner, isDoubles)) || `How will ${displayName(winner, isDoubles)} win the match?`}
            </p>
            <div className="grid grid-cols-2 gap-2">
                {isBestOf5 ? (
                    winner === details.player1.name ? (
                        <>
                            {renderButton('3-0', '3-0', straightSetsLabel)}
                            {renderButton('3-1', '3-1', fourSetsLabel)}
                            {renderButton('3-2', '3-2', fiveSetsLabel)}
                        </>
                    ) : (
                        <>
                            {renderButton('0-3', '0-3', straightSetsLabel)}
                            {renderButton('1-3', '1-3', fourSetsLabel)}
                            {renderButton('2-3', '2-3', fiveSetsLabel)}
                        </>
                    )
                ) : (
                    winner === details.player1.name ? (
                        <>
                            {renderButton('2-0', '2-0', straightSetsLabel)}
                            {renderButton('2-1', '2-1', isAmateurFormat ? superTiebreakLabel : threeSetsLabel)}
                        </>
                    ) : (
                        <>
                            {renderButton('0-2', '0-2', straightSetsLabel)}
                            {renderButton('1-2', '1-2', isAmateurFormat ? superTiebreakLabel : threeSetsLabel)}
                        </>
                    )
                )}
            </div>
        </motion.div>
    );
}
