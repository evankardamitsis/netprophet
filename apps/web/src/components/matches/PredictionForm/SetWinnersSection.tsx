'use client';

import { motion } from 'framer-motion';
import { useDictionary } from '@/context/DictionaryContext';
import { displayName } from './utils';
import { getIndividualBonus, getMaxSetWinnersBonus } from './utils';
import type { MatchDetails, PredictionOptions } from './types';

interface SetWinnersSectionProps {
    formPredictions: PredictionOptions;
    details: MatchDetails;
    setsToShowFromResult: number;
    isBestOf5: boolean;
    isAmateurFormat: boolean;
    locked?: boolean;
    showPulse: boolean;
    getSetWinner: (setNumber: number) => string;
    onSetWinnerSelection: (setNumber: number, player: string) => void;
}

export function SetWinnersSection({
    formPredictions,
    details,
    setsToShowFromResult,
    isBestOf5,
    isAmateurFormat,
    locked,
    showPulse,
    getSetWinner,
    onSetWinnerSelection
}: SetWinnersSectionProps) {
    const { dict } = useDictionary();
    const formatLabel = isBestOf5 ? dict?.matches?.bestOf5 || 'Best of 5' : isAmateurFormat ? dict?.matches?.bestOf3SuperTB || 'Best of 3 (Super TB)' : dict?.matches?.bestOf3 || 'Best of 3';

    const setWinnersCount = Array.from({ length: setsToShowFromResult }, (_, i) => getSetWinner(i + 1)).filter(w => w).length;
    const maxBonus = getMaxSetWinnersBonus(formPredictions);
    const currentBonus = ['2-1', '1-2'].includes(formPredictions.matchResult) ? (setWinnersCount > 0 ? 0.2 : 0) : getIndividualBonus(setWinnersCount);
    const displayBonus = setWinnersCount > 0 ? currentBonus : maxBonus;

    const winsSetsDesc = formPredictions.winner === details.player1.name
        ? (dict?.matches?.winsSetsDescription?.replace('{player1}', displayName(details.player1.name, false)).replace('{sets1}', formPredictions.matchResult.split('-')[0]).replace('{player2}', displayName(details.player2.name, false)).replace('{sets2}', formPredictions.matchResult.split('-')[1]) || `${displayName(details.player1.name, false)} wins ${formPredictions.matchResult.split('-')[0]} sets, ${displayName(details.player2.name, false)} wins ${formPredictions.matchResult.split('-')[1]} sets`)
        : (dict?.matches?.winsSetsDescription?.replace('{player1}', displayName(details.player2.name, false)).replace('{sets1}', formPredictions.matchResult.split('-')[1]).replace('{player2}', displayName(details.player1.name, false)).replace('{sets2}', formPredictions.matchResult.split('-')[0]) || `${displayName(details.player2.name, false)} wins ${formPredictions.matchResult.split('-')[1]} sets, ${displayName(details.player1.name, false)} wins ${formPredictions.matchResult.split('-')[0]} sets`);

    return (
        <motion.div
            className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border ${showPulse ? 'border-yellow-400 border-2' : 'border-slate-700/50'}`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">{dict?.matches?.setWinners || 'Set Winners'}</h3>
                    <div className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center space-x-1 transition-all duration-300 ${setWinnersCount > 0 ? 'bg-green-600/20 text-green-300 border-green-500/30' : 'bg-slate-700/20 text-slate-400 border-slate-600/30'}`}>
                        <span>+{displayBonus.toFixed(1)}x</span>
                    </div>
                </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">
                {dict?.matches?.whoWinsEachSet?.replace('{result}', formPredictions.matchResult) || `Who wins each set based on your ${formPredictions.matchResult} prediction?`}
                {['2-1', '1-2'].includes(formPredictions.matchResult)
                    ? ` ${dict?.matches?.selectOneSetWinner || 'Select one set winner. The other will be automatically selected.'}`
                    : ` ${winsSetsDesc}`}
            </p>
            {Array.from({ length: setsToShowFromResult }, (_, i) => {
                const currentWinner = getSetWinner(i + 1);
                const [winnerSets, loserSets] = formPredictions.matchResult.split('-').map(Number);
                const expectedWinnerWins = formPredictions.winner === details.player1.name ? winnerSets : loserSets;
                const expectedLoserWins = formPredictions.winner === details.player1.name ? loserSets : winnerSets;
                const player1Wins = Array.from({ length: setsToShowFromResult }, (_, j) => getSetWinner(j + 1)).filter((w, idx) => w === details.player1.name && idx !== i).length;
                const player2Wins = Array.from({ length: setsToShowFromResult }, (_, j) => getSetWinner(j + 1)).filter((w, idx) => w === details.player2.name && idx !== i).length;
                const isP1Winner = formPredictions.winner === details.player1.name;
                let canPlayer1Win = isP1Winner ? (player1Wins < expectedWinnerWins || currentWinner === details.player1.name) : (player2Wins < expectedLoserWins || currentWinner === details.player1.name);
                let canPlayer2Win = isP1Winner ? (player2Wins < expectedLoserWins || currentWinner === details.player2.name) : (player1Wins < expectedWinnerWins || currentWinner === details.player2.name);
                if (['2-1', '1-2'].includes(formPredictions.matchResult)) {
                    canPlayer1Win = true;
                    canPlayer2Win = true;
                }

                return (
                    <div key={i} className="space-y-2 mb-3">
                        <h4 className="font-semibold text-white text-xs">{dict?.matches?.setWinner?.replace('{setNumber}', String(i + 1)) || `Set ${i + 1} Winner`}</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => onSetWinnerSelection(i + 1, currentWinner === details.player1.name ? '' : details.player1.name)}
                                disabled={!canPlayer1Win || locked}
                                className={`p-2 rounded-lg border ${locked ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed' : currentWinner === details.player1.name ? 'bg-purple-600 border-purple-600 text-white' : canPlayer1Win ? 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50' : 'bg-slate-800/50 border-slate-700/50 text-gray-600 cursor-not-allowed'}`}
                            >
                                <div className="flex flex-col">
                                    <span className="break-words text-left">{displayName(details.player1.name, false)}</span>
                                    {details.player1.teamName && <span className="text-orange-400 text-[10px] sm:text-xs leading-tight break-words text-left mt-0.5">{details.player1.teamName}</span>}
                                </div>
                                {!canPlayer1Win && <span className="text-xs block text-gray-500">{dict?.matches?.maxReached || '(max reached)'}</span>}
                            </button>
                            <button
                                onClick={() => onSetWinnerSelection(i + 1, currentWinner === details.player2.name ? '' : details.player2.name)}
                                disabled={!canPlayer2Win || locked}
                                className={`p-2 rounded-lg border ${locked ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed' : currentWinner === details.player2.name ? 'bg-purple-600 border-purple-600 text-white' : canPlayer2Win ? 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50' : 'bg-slate-800/50 border-slate-700/50 text-gray-600 cursor-not-allowed'}`}
                            >
                                <div className="flex flex-col">
                                    <span className="break-words text-left">{displayName(details.player2.name, false)}</span>
                                    {details.player2.teamName && <span className="text-orange-400 text-[10px] sm:text-xs leading-tight break-words text-left mt-0.5">{details.player2.teamName}</span>}
                                </div>
                                {!canPlayer2Win && <span className="text-xs block text-gray-500">{dict?.matches?.maxReached || '(max reached)'}</span>}
                            </button>
                        </div>
                    </div>
                );
            })}
        </motion.div>
    );
}
