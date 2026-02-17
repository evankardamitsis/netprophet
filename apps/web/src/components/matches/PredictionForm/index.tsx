'use client';

import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDictionary } from '@/context/DictionaryContext';
import { SESSION_KEYS, loadFromSessionStorage, removeFromSessionStorage, saveToSessionStorage } from '@/lib/sessionStorage';
import { borders, transitions, cx } from '@/styles/design-system';
import type { PredictionOptions, PredictionFormProps } from './types';

export type { PredictionOptions, MatchDetails } from './types';
import { MultiplierBonusDisplay } from './MultiplierBonusDisplay';
import { MatchWinnerSection } from './MatchWinnerSection';
import { MatchResultSection } from './MatchResultSection';
import { SetWinnersSection } from './SetWinnersSection';
import { SetScoresSection } from './SetScoresSection';
import { SetTiebreaksSection } from './SetTiebreaksSection';
import { SuperTiebreakSection } from './SuperTiebreakSection';
import { FullScreenModal } from './FullScreenModal';

const STRAIGHT_SET_RESULTS = ['3-0', '0-3', '2-0', '0-2'];

export function PredictionForm({
    matchId,
    formPredictions,
    onPredictionChange,
    details,
    isDoubles = false,
    isBestOf5,
    isAmateurFormat,
    setsToShowFromResult,
    setWinnersFromResult: _setWinnersFromResult,
    renderSetScoreDropdown,
    getSetScore,
    setSetScore,
    getSetWinner,
    setSetWinner,
    locked,
    onSubmitButton,
    onSubmitSuccess
}: PredictionFormProps) {
    const { dict } = useDictionary();
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [hasBlurredSuperTiebreak, setHasBlurredSuperTiebreak] = useState(false);
    const formContentRef = useRef<HTMLDivElement>(null);

    const [showMatchResultPulse, setShowMatchResultPulse] = useState(false);
    const [showSetWinnersPulse, setShowSetWinnersPulse] = useState(false);
    const [showSetScoresPulse, setShowSetScoresPulse] = useState(false);
    const [showTiebreaksPulse, setShowTiebreaksPulse] = useState(false);
    const [showSuperTiebreakPulse, setShowSuperTiebreakPulse] = useState(false);

    const prevState = useRef({
        winner: '',
        matchResult: '',
        setWinnersSelected: false,
        setScoresSelected: false,
        tiebreaksSelected: false,
        superTiebreakSelected: false
    });

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
    useEffect(() => {
        saveToSessionStorage(`${SESSION_KEYS.FORM_PREDICTIONS}_${matchId}`, formPredictions);
    }, [formPredictions, matchId]);

    useEffect(() => {
        const pulseDuration = 3000;
        const timeouts: ReturnType<typeof setTimeout>[] = [];
        [showMatchResultPulse, showSetWinnersPulse, showSetScoresPulse, showTiebreaksPulse, showSuperTiebreakPulse].forEach((show, i) => {
            if (show) {
                const setters = [setShowMatchResultPulse, setShowSetWinnersPulse, setShowSetScoresPulse, setShowTiebreaksPulse, setShowSuperTiebreakPulse];
                timeouts.push(setTimeout(() => setters[i](false), pulseDuration));
            }
        });
        return () => timeouts.forEach(t => clearTimeout(t));
    }, [showMatchResultPulse, showSetWinnersPulse, showSetScoresPulse, showTiebreaksPulse, showSuperTiebreakPulse]);

    useEffect(() => {
        const set1 = getSetScore(1), set2 = getSetScore(2), set3 = getSetScore(3), set4 = getSetScore(4), set5 = getSetScore(5);
        const hasTiebreak = (s: string) => s === '7-6' || s === '6-7';
        const tiebreaksSelected = hasTiebreak(set1) || hasTiebreak(set2) || hasTiebreak(set3) || hasTiebreak(set4) || hasTiebreak(set5);

        const currentState = {
            winner: formPredictions.winner,
            matchResult: formPredictions.matchResult,
            setWinnersSelected: Boolean(formPredictions.matchResult && (
                STRAIGHT_SET_RESULTS.includes(formPredictions.matchResult) ||
                Array.from({ length: setsToShowFromResult }, (_, i) => getSetWinner(i + 1)).some(w => Boolean(w))
            )),
            setScoresSelected: Boolean(['2-1', '1-2'].includes(formPredictions.matchResult) &&
                Array.from({ length: 2 }, (_, i) => getSetWinner(i + 1)).some(w => Boolean(w))),
            tiebreaksSelected,
            superTiebreakSelected: isAmateurFormat && ['2-1', '1-2'].includes(formPredictions.matchResult)
        };

        if (!prevState.current.winner && currentState.winner) setShowMatchResultPulse(true);
        if (!prevState.current.matchResult && currentState.matchResult) {
            setShowMatchResultPulse(true);
            if (STRAIGHT_SET_RESULTS.includes(formPredictions.matchResult)) setShowSetScoresPulse(true);
            else setShowSetWinnersPulse(true);
        }
        if (!prevState.current.setWinnersSelected && currentState.setWinnersSelected) setShowSetScoresPulse(true);
        if (!prevState.current.tiebreaksSelected && currentState.tiebreaksSelected) setShowTiebreaksPulse(true);
        if (!prevState.current.superTiebreakSelected && currentState.superTiebreakSelected) setShowSuperTiebreakPulse(true);
        prevState.current = currentState;
    }, [formPredictions, setsToShowFromResult, getSetWinner, getSetScore, isAmateurFormat]);

    const currentMultiplier = useMemo(() => {
        if (!formPredictions.winner) return 0;
        const baseOdds = formPredictions.winner === details.player1.name ? details.player1.odds : details.player2.odds;
        if (!baseOdds || baseOdds <= 0) return 0;
        let totalBonus = 0;
        if (formPredictions.matchResult) totalBonus += 0.2;
        if (['2-1', '1-2'].includes(formPredictions.matchResult)) {
            const c = [formPredictions.set1Winner, formPredictions.set2Winner].filter(w => w).length;
            if (c > 0) totalBonus += 0.2;
        } else if (!STRAIGHT_SET_RESULTS.includes(formPredictions.matchResult)) {
            const arr = [formPredictions.set1Winner, formPredictions.set2Winner, formPredictions.set3Winner, formPredictions.set4Winner, formPredictions.set5Winner];
            totalBonus += arr.filter(w => w).length * 0.2;
        }
        if (STRAIGHT_SET_RESULTS.includes(formPredictions.matchResult)) {
            const arr = [formPredictions.set1Score, formPredictions.set2Score, formPredictions.set3Score, formPredictions.set4Score, formPredictions.set5Score];
            totalBonus += arr.filter(s => s).length * 0.2;
        } else if (['2-1', '1-2'].includes(formPredictions.matchResult)) {
            totalBonus += [formPredictions.set1Score, formPredictions.set2Score].filter(s => s).length * 0.2;
        }
        totalBonus += [formPredictions.set1TieBreakScore, formPredictions.set2TieBreakScore].filter(s => s).length * 0.2;
        if (formPredictions.superTieBreakScore) totalBonus += 0.2;
        return baseOdds + totalBonus;
    }, [formPredictions, details]);

    const baseOdds = useMemo(() => {
        if (!formPredictions.winner) return 0;
        return formPredictions.winner === details.player1.name ? details.player1.odds : details.player2.odds;
    }, [formPredictions.winner, details]);
    const bonusMultiplier = currentMultiplier - baseOdds;

    const handleInputInteraction = useCallback(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768 && !isFullScreen) {
            setIsFullScreen(true);
            document.body.style.overflow = 'hidden';
        }
    }, [isFullScreen]);

    const handleInputFocus = useCallback(() => handleInputInteraction(), [handleInputInteraction]);
    const handleButtonClick = useCallback(() => handleInputInteraction(), [handleInputInteraction]);

    const handleMatchResultChange = useCallback((newMatchResult: string) => {
        handleButtonClick();
        onPredictionChange('matchResult', newMatchResult);
        if (STRAIGHT_SET_RESULTS.includes(newMatchResult)) {
            const winner = formPredictions.winner;
            const [sets1, sets2] = newMatchResult.split('-').map(Number);
            for (let i = 1; i <= sets1 + sets2; i++) setSetWinner(i, winner);
        }
        if (isAmateurFormat && ['2-1', '1-2'].includes(newMatchResult)) {
            onPredictionChange('superTieBreakWinner', formPredictions.winner);
        }
    }, [formPredictions.winner, onPredictionChange, setSetWinner, isAmateurFormat, handleButtonClick]);

    const handleSetWinnerSelection = useCallback((setNumber: number, selectedPlayer: string) => {
        handleButtonClick();
        if (['2-1', '1-2'].includes(formPredictions.matchResult)) {
            const otherSetNumber = setNumber === 1 ? 2 : 1;
            const otherPlayer = selectedPlayer === details.player1.name ? details.player2.name : details.player1.name;
            if (!selectedPlayer) {
                setSetWinner(setNumber, '');
                setSetWinner(otherSetNumber, '');
            } else {
                setSetWinner(setNumber, selectedPlayer);
                setSetWinner(otherSetNumber, otherPlayer);
            }
        } else {
            setSetWinner(setNumber, selectedPlayer);
        }
    }, [formPredictions.matchResult, details, setSetWinner, handleButtonClick]);

    const handleClearAll = useCallback(() => {
        const keys: (keyof PredictionOptions)[] = ['winner', 'matchResult', 'set1Score', 'set2Score', 'set3Score', 'set4Score', 'set5Score', 'set1Winner', 'set2Winner', 'set3Winner', 'set4Winner', 'set5Winner', 'tieBreak', 'totalGames', 'acesLeader', 'doubleFaults', 'breakPoints', 'set1TieBreak', 'set2TieBreak', 'set1TieBreakScore', 'set2TieBreakScore', 'superTieBreak', 'superTieBreakScore', 'superTieBreakWinner'];
        keys.forEach(k => onPredictionChange(k, ''));
        const storageKey = `${SESSION_KEYS.FORM_PREDICTIONS}_${matchId}`;
        removeFromSessionStorage(storageKey);
        const stored = loadFromSessionStorage<Record<string, PredictionOptions>>(SESSION_KEYS.FORM_PREDICTIONS, {});
        if (stored[matchId]) { delete stored[matchId]; saveToSessionStorage(SESSION_KEYS.FORM_PREDICTIONS, stored); }
    }, [matchId, onPredictionChange]);

    useEffect(() => {
        const handleResize = () => {
            if (typeof window !== 'undefined' && window.innerWidth >= 768 && isFullScreen) {
                setIsFullScreen(false);
                document.body.style.overflow = '';
            }
        };
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); };
    }, [isFullScreen]);
    useEffect(() => () => { document.body.style.overflow = ''; }, []);

    const handleCloseFullScreen = useCallback(() => {
        setIsFullScreen(false);
        document.body.style.overflow = '';
    }, []);

    const renderFormContent = () => (
        <div ref={formContentRef} className="space-y-2 sm:space-y-3 pb-4 h-full flex flex-col relative px-1 sm:px-0">
            <motion.button
                onClick={handleClearAll}
                className={cx('absolute top-0 right-0 sm:right-2 text-xs text-gray-400 hover:text-white px-2 py-1 border border-slate-600 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-700/50 z-20', borders.rounded.sm, transitions.default)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={dict?.matches?.clearAllSelections || 'Clear all selections'}
            >
                {dict?.matches?.clearAll || 'Clear All'}
            </motion.button>

            <MultiplierBonusDisplay baseOdds={baseOdds} bonusMultiplier={bonusMultiplier} currentMultiplier={currentMultiplier} />

            <MatchWinnerSection
                formPredictions={formPredictions}
                details={details}
                isDoubles={isDoubles}
                locked={locked}
                onWinnerChange={(w) => onPredictionChange('winner', w)}
                onInteraction={handleButtonClick}
            />

            {formPredictions.winner && (
                <div className="flex items-center justify-center">
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-600/10 border border-blue-500/20">
                        <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-blue-300">{dict?.matches?.optional || 'Optional'}</span>
                    </div>
                </div>
            )}

            {formPredictions.winner && (
                <MatchResultSection
                    formPredictions={formPredictions}
                    details={details}
                    isBestOf5={isBestOf5}
                    isAmateurFormat={isAmateurFormat}
                    isDoubles={isDoubles}
                    locked={locked}
                    showPulse={showMatchResultPulse}
                    onMatchResultChange={handleMatchResultChange}
                />
            )}

            {formPredictions.matchResult && (
                STRAIGHT_SET_RESULTS.includes(formPredictions.matchResult) ? (
                    <SetScoresSection
                        formPredictions={formPredictions}
                        details={details}
                        isBestOf5={isBestOf5}
                        isAmateurFormat={isAmateurFormat}
                        isDoubles={isDoubles}
                        locked={locked}
                        showPulse={showSetScoresPulse}
                        setsCount={(() => { const [a, b] = formPredictions.matchResult.split('-').map(Number); return a + b; })()}
                        getSetScore={getSetScore}
                        getSetWinner={getSetWinner}
                        renderSetScoreDropdown={renderSetScoreDropdown}
                        setSetScore={setSetScore}
                        onInteraction={handleButtonClick}
                    />
                ) : (
                    <SetWinnersSection
                        formPredictions={formPredictions}
                        details={details}
                        setsToShowFromResult={setsToShowFromResult}
                        isBestOf5={isBestOf5}
                        isAmateurFormat={isAmateurFormat}
                        locked={locked}
                        showPulse={showSetWinnersPulse}
                        getSetWinner={getSetWinner}
                        onSetWinnerSelection={handleSetWinnerSelection}
                    />
                )
            )}

            {formPredictions.matchResult && ['2-1', '1-2'].includes(formPredictions.matchResult) &&
                Array.from({ length: 2 }, (_, i) => getSetWinner(i + 1)).some(w => w) && (
                <SetScoresSection
                    formPredictions={formPredictions}
                    details={details}
                    isBestOf5={isBestOf5}
                    isAmateurFormat={isAmateurFormat}
                    isDoubles={isDoubles}
                    locked={locked}
                    showPulse={showSetScoresPulse}
                    setsCount={2}
                    getSetScore={getSetScore}
                    getSetWinner={getSetWinner}
                    renderSetScoreDropdown={renderSetScoreDropdown}
                    setSetScore={setSetScore}
                    onInteraction={() => {}}
                />
            )}

            {formPredictions.matchResult && (() => {
                const s1 = getSetScore(1), s2 = getSetScore(2), s3 = getSetScore(3), s4 = getSetScore(4), s5 = getSetScore(5);
                const tb = (s: string) => s === '7-6' || s === '6-7';
                return tb(s1) || tb(s2) || tb(s3) || tb(s4) || tb(s5);
            })() && (
                <SetTiebreaksSection
                    formPredictions={formPredictions}
                    details={details}
                    locked={locked}
                    showPulse={showTiebreaksPulse}
                    getSetScore={getSetScore}
                    getSetWinner={getSetWinner}
                    onPredictionChange={onPredictionChange}
                    onInputFocus={handleInputFocus}
                />
            )}

            {isAmateurFormat && formPredictions.matchResult && ['2-1', '1-2'].includes(formPredictions.matchResult) && (
                <SuperTiebreakSection
                    formPredictions={formPredictions}
                    details={details}
                    isDoubles={isDoubles}
                    locked={locked}
                    showPulse={showSuperTiebreakPulse}
                    hasBlurredSuperTiebreak={hasBlurredSuperTiebreak}
                    onPredictionChange={onPredictionChange}
                    onInputInteraction={handleInputInteraction}
                    onBlurSuperTiebreak={() => setHasBlurredSuperTiebreak(true)}
                />
            )}
        </div>
    );

    return (
        <>
            <FullScreenModal
                isOpen={isFullScreen}
                mounted={mounted}
                onClose={handleCloseFullScreen}
                onBackdropClick={handleCloseFullScreen}
                onSubmitButton={onSubmitButton}
                onSubmitSuccess={onSubmitSuccess || handleCloseFullScreen}
            >
                {renderFormContent()}
            </FullScreenModal>
            <div className={isFullScreen ? 'hidden md:block' : ''}>
                {renderFormContent()}
            </div>
        </>
    );
}
