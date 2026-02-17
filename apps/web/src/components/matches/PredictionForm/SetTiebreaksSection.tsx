'use client';

import { motion } from 'framer-motion';
import { useDictionary } from '@/context/DictionaryContext';
import { getTiebreakBonus, getMaxSetTiebreaksBonus } from './utils';
import type { MatchDetails, PredictionOptions } from './types';

interface SetTiebreaksSectionProps {
    formPredictions: PredictionOptions;
    details: MatchDetails;
    locked?: boolean;
    showPulse: boolean;
    getSetScore: (setNumber: number) => string;
    getSetWinner: (setNumber: number) => string;
    onPredictionChange: (type: keyof PredictionOptions, value: string) => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export function SetTiebreaksSection({
    formPredictions,
    details,
    locked,
    showPulse,
    getSetScore,
    getSetWinner,
    onPredictionChange,
    onInputFocus
}: SetTiebreaksSectionProps) {
    const { dict } = useDictionary();
    const tiebreakPredictionsCount = [formPredictions.set1TieBreakScore, formPredictions.set2TieBreakScore].filter(s => s).length;
    const maxBonus = getMaxSetTiebreaksBonus();
    const currentBonus = getTiebreakBonus(tiebreakPredictionsCount);
    const displayBonus = tiebreakPredictionsCount > 0 ? currentBonus : maxBonus;

    const tiebreakOptions = (tiebreakWinnerIsPlayer1: boolean) =>
        tiebreakWinnerIsPlayer1
            ? ['7-0', '7-1', '7-2', '7-3', '7-4', '7-5'].map(v => <option key={v} value={v}>{v}</option>)
            : ['0-7', '1-7', '2-7', '3-7', '4-7', '5-7'].map(v => <option key={v} value={v}>{v}</option>);

    return (
        <motion.div
            className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 border ${showPulse ? 'border-yellow-400 border-2' : 'border-slate-700/50'}`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">{dict?.matches?.setTiebreaks || 'Set Tiebreaks'}</h3>
                    <div className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center space-x-1 transition-all duration-300 ${tiebreakPredictionsCount > 0 ? 'bg-green-600/20 text-green-300 border-green-500/30' : 'bg-slate-700/20 text-slate-400 border-slate-600/30'}`}>
                        <span>+{displayBonus.toFixed(1)}x</span>
                    </div>
                </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">
                {dict?.matches?.tiebreakScoresSelected || "You've selected tiebreak scores for some sets. Here you can predict the detailed tiebreak scores within those sets."}
            </p>

            {['7-6', '6-7'].includes(getSetScore(1)) && (
                <div className="space-y-2 mb-3">
                    <h4 className="font-semibold text-white text-xs">{dict?.matches?.setTiebreakDetails?.replace('{setNumber}', '1') || 'Set 1 Tiebreak Details'}</h4>
                    <p className="text-xs text-gray-400 mb-1.5">{dict?.matches?.setEndedInTiebreak?.replace('{setNumber}', '1') || 'Set 1 ended in a tiebreak. Predict the detailed tiebreak score:'}</p>
                    <div className="space-y-1.5">
                        <label className="text-xs text-gray-400">{dict?.matches?.tiebreakScore || 'Tiebreak Score'}</label>
                        <select
                            value={formPredictions.set1TieBreakScore}
                            onChange={(e) => onPredictionChange('set1TieBreakScore', e.target.value)}
                            onFocus={onInputFocus}
                            disabled={locked}
                            className={`w-full p-3 sm:p-2.5 border rounded-lg text-base sm:text-sm min-h-[48px] sm:min-h-0 ${locked ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed' : 'bg-slate-700/50 border-slate-600/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent'}`}
                        >
                            <option value="">{dict?.matches?.selectTiebreakScore || 'Select tiebreak score'}</option>
                            {tiebreakOptions(getSetScore(1) === '7-6')}
                        </select>
                    </div>
                </div>
            )}

            {['7-6', '6-7'].includes(getSetScore(2)) && (
                <div className="space-y-2">
                    <h4 className="font-semibold text-white text-xs">{dict?.matches?.setTiebreakDetails?.replace('{setNumber}', '2') || 'Set 2 Tiebreak Details'}</h4>
                    <p className="text-xs text-gray-400 mb-1.5">{dict?.matches?.setEndedInTiebreak?.replace('{setNumber}', '2') || 'Set 2 ended in a tiebreak. Predict the detailed tiebreak score:'}</p>
                    <div className="space-y-1.5">
                        <label className="text-xs text-gray-400">{dict?.matches?.tiebreakScore || 'Tiebreak Score'}</label>
                        <select
                            value={formPredictions.set2TieBreakScore}
                            onChange={(e) => onPredictionChange('set2TieBreakScore', e.target.value)}
                            onFocus={onInputFocus}
                            disabled={locked}
                            className={`w-full p-3 sm:p-2.5 border rounded-lg text-base sm:text-sm min-h-[48px] sm:min-h-0 ${locked ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed' : 'bg-slate-700/50 border-slate-600/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent'}`}
                        >
                            <option value="">{dict?.matches?.selectTiebreakScore || 'Select tiebreak score'}</option>
                            {tiebreakOptions(getSetScore(2) === '7-6')}
                        </select>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
