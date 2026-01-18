'use client';

import { Button, Badge } from '@netprophet/ui';
import { useDictionary } from '@/context/DictionaryContext';
import { useMemo, useEffect, useRef, useState } from 'react';
import { calculateMultiplier, getPredictionCount } from '@/lib/predictionHelpers';
import { SESSION_KEYS, loadFromSessionStorage, removeFromSessionStorage, saveToSessionStorage } from '@/lib/sessionStorage';
import { motion } from 'framer-motion';
import { gradients, shadows, borders, transitions, animations, typography, cx } from '@/styles/design-system';

interface PredictionOptions {
    winner: string;
    matchResult: string;
    set1Score: string;
    set2Score: string;
    set3Score: string;
    set4Score: string;
    set5Score: string;
    set1Winner: string;
    set2Winner: string;
    set3Winner: string;
    set4Winner: string;
    set5Winner: string;
    tieBreak: string;
    totalGames: string;
    acesLeader: string;
    doubleFaults: string;
    breakPoints: string;
    // New fields for tiebreak predictions
    set1TieBreak: string; // "yes" or "no"
    set2TieBreak: string; // "yes" or "no"
    set1TieBreakScore: string; // e.g., "7-5", "7-6"
    set2TieBreakScore: string; // e.g., "7-5", "7-6"
    superTieBreak: string; // "yes" or "no" - for amateur format
    superTieBreakScore: string; // e.g., "10-8", "10-6"
    superTieBreakWinner: string; // player name
}

interface MatchDetails {
    player1: { name: string; odds: number; wins: number; losses: number; ntrpRating?: number; teamName?: string | null };
    player2: { name: string; odds: number; wins: number; losses: number; ntrpRating?: number; teamName?: string | null };
    round: string;
    surface: string;
    format: string; // Add format field
}

interface PredictionFormProps {
    matchId: string;
    formPredictions: PredictionOptions;
    onPredictionChange: (type: keyof PredictionOptions, value: string) => void;
    details: MatchDetails;
    isDoubles?: boolean;
    isBestOf5: boolean;
    isAmateurFormat: boolean;
    setsToShowFromResult: number;
    setWinnersFromResult: string[];
    renderSetScoreDropdown: (setNumber: number, value: string, onChange: (value: string) => void) => JSX.Element;
    getSetScore: (setNumber: number) => string;
    setSetScore: (setNumber: number, value: string) => void;
    getSetWinner: (setNumber: number) => string;
    setSetWinner: (setNumber: number, value: string) => void;
    locked?: boolean;
}

export function PredictionForm({
    matchId,
    formPredictions,
    onPredictionChange,
    details,
    isDoubles = false,
    isBestOf5,
    isAmateurFormat,
    setsToShowFromResult,
    setWinnersFromResult,
    renderSetScoreDropdown,
    getSetScore,
    setSetScore,
    getSetWinner,
    setSetWinner,
    locked
}: PredictionFormProps) {

    const { dict, lang } = useDictionary();

    // Refs for smooth scrolling to sections
    const matchResultRef = useRef<HTMLDivElement>(null);
    const setWinnersRef = useRef<HTMLDivElement>(null);
    const setScoresRef = useRef<HTMLDivElement>(null);
    const setTiebreaksRef = useRef<HTMLDivElement>(null);
    const superTiebreakRef = useRef<HTMLDivElement>(null);

    // Helper to display names (format compactly: last name + first initial)
    const displayName = (name: string) => {
        if (isDoubles) {
            // For doubles, format each player name: "LASTNAME F. & LASTNAME F."
            const formatPlayerName = (fullName: string) => {
                const parts = fullName.trim().split(' ');
                if (parts.length >= 2) {
                    const lastName = parts[parts.length - 1];
                    const firstName = parts[0];
                    const firstInitial = firstName.charAt(0).toUpperCase();
                    return `${lastName} ${firstInitial}.`;
                }
                return fullName;
            };

            // Split by " & " to get individual player names
            if (name.includes(' & ')) {
                const [player1, player2] = name.split(' & ');
                return `${formatPlayerName(player1)} & ${formatPlayerName(player2)}`;
            }
            return name;
        }
        // For singles, show last name + first initial
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            const lastName = parts[parts.length - 1];
            const firstName = parts[0];
            const firstInitial = firstName.charAt(0).toUpperCase();
            return `${lastName} ${firstInitial}.`;
        }
        return name;
    };

    // Validate super tiebreak score
    const validateSuperTiebreakScore = (score: string, player1Wins: boolean): boolean => {
        if (!score || score.trim() === '') return true; // Empty is valid (optional)

        // Match pattern: number-number (e.g., "10-8", "17-15")
        const pattern = /^\d+-\d+$/;
        if (!pattern.test(score.trim())) return false;

        const [score1, score2] = score.trim().split('-').map(Number);

        // Both scores must be valid numbers
        if (isNaN(score1) || isNaN(score2)) return false;

        // Winner must have at least 10 points
        const winnerScore = Math.max(score1, score2);
        if (winnerScore < 10) return false;

        // Winner must win by at least 2 points
        const diff = Math.abs(score1 - score2);
        if (diff < 2) return false;

        // Validate that the winner matches the predicted winner
        if (player1Wins && score1 <= score2) return false;
        if (!player1Wins && score2 <= score1) return false;

        return true;
    };

    // Save form predictions to session storage whenever they change
    useEffect(() => {
        const storageKey = `${SESSION_KEYS.FORM_PREDICTIONS}_${matchId}`;
        saveToSessionStorage(storageKey, formPredictions);
    }, [formPredictions, matchId]);

    // Track previous state to detect when new sections are unlocked
    const prevState = useRef({
        winner: '',
        matchResult: '',
        setWinnersSelected: false,
        setScoresSelected: false,
        tiebreaksSelected: false,
        superTiebreakSelected: false
    });

    // State for visual indicators
    const [showMatchResultPulse, setShowMatchResultPulse] = useState(false);
    const [showSetWinnersPulse, setShowSetWinnersPulse] = useState(false);
    const [showSetScoresPulse, setShowSetScoresPulse] = useState(false);
    const [showTiebreaksPulse, setShowTiebreaksPulse] = useState(false);
    const [showSuperTiebreakPulse, setShowSuperTiebreakPulse] = useState(false);



    // Effect to automatically stop pulsing after a fixed duration
    useEffect(() => {
        const pulseDuration = 3000; // 3 seconds of pulsing

        const timeouts: NodeJS.Timeout[] = [];

        if (showMatchResultPulse) {
            const timeout = setTimeout(() => setShowMatchResultPulse(false), pulseDuration);
            timeouts.push(timeout);
        }

        if (showSetWinnersPulse) {
            const timeout = setTimeout(() => setShowSetWinnersPulse(false), pulseDuration);
            timeouts.push(timeout);
        }

        if (showSetScoresPulse) {
            const timeout = setTimeout(() => setShowSetScoresPulse(false), pulseDuration);
            timeouts.push(timeout);
        }

        if (showTiebreaksPulse) {
            const timeout = setTimeout(() => setShowTiebreaksPulse(false), pulseDuration);
            timeouts.push(timeout);
        }

        if (showSuperTiebreakPulse) {
            const timeout = setTimeout(() => setShowSuperTiebreakPulse(false), pulseDuration);
            timeouts.push(timeout);
        }

        return () => {
            timeouts.forEach(timeout => clearTimeout(timeout));
        };
    }, [showMatchResultPulse, showSetWinnersPulse, showSetScoresPulse, showTiebreaksPulse, showSuperTiebreakPulse]);

    // Effect to detect when new sections are unlocked and show subtle visual indicators
    useEffect(() => {
        const currentState = {
            winner: formPredictions.winner,
            matchResult: formPredictions.matchResult,
            setWinnersSelected: Boolean(formPredictions.matchResult && (
                ['3-0', '0-3', '2-0', '0-2'].includes(formPredictions.matchResult) ||
                Array.from({ length: setsToShowFromResult }, (_, i) => getSetWinner(i + 1)).some(winner => Boolean(winner))
            )),
            setScoresSelected: Boolean(['2-1', '1-2'].includes(formPredictions.matchResult) &&
                Array.from({ length: 2 }, (_, i) => getSetWinner(i + 1)).some(winner => Boolean(winner))),
            tiebreaksSelected: (() => {
                const set1Score = getSetScore(1);
                const set2Score = getSetScore(2);
                const set3Score = getSetScore(3);
                const set4Score = getSetScore(4);
                const set5Score = getSetScore(5);
                return set1Score === '7-6' || set1Score === '6-7' ||
                    set2Score === '7-6' || set2Score === '6-7' ||
                    set3Score === '7-6' || set3Score === '6-7' ||
                    set4Score === '7-6' || set4Score === '6-7' ||
                    set5Score === '7-6' || set5Score === '6-7';
            })(),
            superTiebreakSelected: isAmateurFormat && ['2-1', '1-2'].includes(formPredictions.matchResult)
        };

        // When winner is selected (first selection), pulse the match result section
        if (!prevState.current.winner && currentState.winner) {
            console.log('Winner selected, pulsing match result section...');
            setShowMatchResultPulse(true);
        }

        // When match result is selected, pulse the match result section itself
        if (!prevState.current.matchResult && currentState.matchResult) {
            console.log('Match result selected, pulsing match result section...');
            setShowMatchResultPulse(true);
        }

        // When match result is selected, also pulse the next available section
        if (!prevState.current.matchResult && currentState.matchResult) {
            console.log('Match result selected, pulsing next section...');

            // Determine which section should pulse next based on the match result
            if (['3-0', '0-3', '2-0', '0-2'].includes(formPredictions.matchResult)) {
                // For straight sets, pulse the set scores section
                setShowSetScoresPulse(true);
            } else {
                // For 2-1/1-2, pulse the set winners section
                setShowSetWinnersPulse(true);
            }
        }

        // When set winners are selected (for 2-1/1-2), pulse set scores section
        if (!prevState.current.setWinnersSelected && currentState.setWinnersSelected) {
            console.log('Set winners selected, pulsing set scores...');
            setShowSetScoresPulse(true);
        }

        // When set scores are selected and include tiebreaks, pulse tiebreak section
        if (!prevState.current.tiebreaksSelected && currentState.tiebreaksSelected) {
            console.log('Tiebreak scores detected, pulsing tiebreak section...');
            setShowTiebreaksPulse(true);
        }

        // When super tiebreak becomes available (amateur format 2-1/1-2), pulse super tiebreak section
        if (!prevState.current.superTiebreakSelected && currentState.superTiebreakSelected) {
            console.log('Super tiebreak available, pulsing super tiebreak section...');
            setShowSuperTiebreakPulse(true);
        }

        // Update previous state
        prevState.current = currentState;
    }, [formPredictions, setsToShowFromResult, getSetWinner, getSetScore, isAmateurFormat]);

    // Calculate dynamic multiplier and bonus by adding up each section's multipliers
    const currentMultiplier = useMemo(() => {
        if (!formPredictions.winner) return 0;

        const baseOdds = formPredictions.winner === details.player1.name ? details.player1.odds : details.player2.odds;
        let totalBonus = 0;

        // Match Result bonus: +0.2x if selected
        if (formPredictions.matchResult) {
            totalBonus += 0.2;
        }

        // Set Winners bonus
        if (['2-1', '1-2'].includes(formPredictions.matchResult)) {
            // For 2-1/1-2: +0.2x if any set winner is selected
            const setWinnersCount = Array.from({ length: 2 }, (_, i) => {
                const setWinner = i === 0 ? formPredictions.set1Winner : formPredictions.set2Winner;
                return setWinner;
            }).filter(winner => winner).length;
            if (setWinnersCount > 0) totalBonus += 0.2;
        } else if (!['3-0', '0-3', '2-0', '0-2'].includes(formPredictions.matchResult)) {
            // For other non-straight-set results: +0.2x per set winner
            const setWinnersCount = Array.from({ length: 5 }, (_, i) => {
                const setWinner = i === 0 ? formPredictions.set1Winner :
                    i === 1 ? formPredictions.set2Winner :
                        i === 2 ? formPredictions.set3Winner :
                            i === 3 ? formPredictions.set4Winner :
                                formPredictions.set5Winner;
                return setWinner;
            }).filter(winner => winner).length;
            totalBonus += setWinnersCount * 0.2;
        }

        // Set Scores bonus (for straight sets and 2-1/1-2)
        if (['3-0', '0-3', '2-0', '0-2'].includes(formPredictions.matchResult)) {
            // For straight sets: +0.2x per set score
            const setScoresCount = Array.from({ length: 5 }, (_, i) => {
                const setScore = i === 0 ? formPredictions.set1Score :
                    i === 1 ? formPredictions.set2Score :
                        i === 2 ? formPredictions.set3Score :
                            i === 3 ? formPredictions.set4Score :
                                formPredictions.set5Score;
                return setScore;
            }).filter(score => score).length;
            totalBonus += setScoresCount * 0.2;
        } else if (['2-1', '1-2'].includes(formPredictions.matchResult)) {
            // For 2-1/1-2: +0.2x per set score
            const setScoresCount = Array.from({ length: 2 }, (_, i) => {
                const setScore = i === 0 ? formPredictions.set1Score : formPredictions.set2Score;
                return setScore;
            }).filter(score => score).length;
            totalBonus += setScoresCount * 0.2;
        }

        // Set Tiebreaks bonus: +0.2x per tiebreak score
        const tiebreakScoresCount = [formPredictions.set1TieBreakScore, formPredictions.set2TieBreakScore]
            .filter(score => score).length;
        totalBonus += tiebreakScoresCount * 0.2;

        // Super Tiebreak bonus: +0.2x only for super tiebreak score (winner is pre-selected)
        if (formPredictions.superTieBreakScore) {
            totalBonus += 0.2;
        }

        return baseOdds + totalBonus;
    }, [formPredictions, details]);

    const baseOdds = useMemo(() => {
        if (!formPredictions.winner) return 0;
        return formPredictions.winner === details.player1.name ? details.player1.odds : details.player2.odds;
    }, [formPredictions.winner, details]);

    const bonusMultiplier = currentMultiplier - baseOdds;

    // Helper function to get bonus for specific prediction count (cumulative)
    const getBonusForCount = (count: number) => {
        if (count >= 8) return 0.8;
        if (count >= 6) return 0.6;
        if (count >= 4) return 0.4;
        if (count >= 2) return 0.2;
        return 0;
    };

    // Helper function to get individual bonus (each selection adds +0.2x)
    const getIndividualBonus = (count: number) => {
        return count * 0.2;
    };

    // Helper function to get tiebreak bonus (each tiebreak prediction adds +0.2x)
    const getTiebreakBonus = (count: number) => {
        return count * 0.2;
    };

    // Helper function to get maximum potential bonus for set winners
    const getMaxSetWinnersBonus = () => {
        if (!formPredictions.matchResult) return 0;

        // For straight-set results, set winners are automatically pre-selected
        // No bonus for set winner selections in straight sets
        if (['3-0', '0-3', '2-0', '0-2'].includes(formPredictions.matchResult)) {
            return 0;
        }

        // For 2-1/1-2 results, only 1 set winner selection worth 0.2x
        if (['2-1', '1-2'].includes(formPredictions.matchResult)) {
            return 0.2;
        }

        // For other formats, calculate based on total sets
        const [sets1, sets2] = formPredictions.matchResult.split('-').map(Number);
        const totalSets = sets1 + sets2;
        return totalSets * 0.2;
    };

    // Helper function to get maximum potential bonus for set scores (straight sets only)
    const getMaxSetScoresBonus = () => {
        if (!formPredictions.matchResult) return 0;

        // Only for straight-set results
        if (['3-0', '0-3', '2-0', '0-2'].includes(formPredictions.matchResult)) {
            const [sets1, sets2] = formPredictions.matchResult.split('-').map(Number);
            const totalSets = sets1 + sets2;
            return totalSets * 0.2;
        }

        return 0;
    };

    // Helper function to get maximum potential bonus for set tiebreaks
    const getMaxSetTiebreaksBonus = () => {
        // Maximum 2 tiebreak predictions (Set 1 and Set 2)
        return 0.4; // 2 * 0.2x
    };

    // Helper function to get maximum potential bonus for super tiebreak
    const getMaxSuperTiebreakBonus = () => {
        // Maximum 2 super tiebreak predictions (winner and score)
        return 0.4; // 2 * 0.2x
    };

    // Determine if this is amateur format (best-of-3 with super tiebreak)


    // Helper function to automatically set set winners for straight-set results and 2-1/1-2 results
    const handleMatchResultChange = (newMatchResult: string) => {
        onPredictionChange('matchResult', newMatchResult);

        // For straight-set results, automatically set all set winners
        if (['3-0', '0-3', '2-0', '0-2'].includes(newMatchResult)) {
            const winner = formPredictions.winner;
            const [sets1, sets2] = newMatchResult.split('-').map(Number);
            const totalSets = sets1 + sets2;

            // Set all set winners to the match winner
            for (let i = 1; i <= totalSets; i++) {
                setSetWinner(i, winner);
            }
        }

        // For 2-1/1-2 results in amateur format, pre-select super tiebreak winner
        if (isAmateurFormat && ['2-1', '1-2'].includes(newMatchResult)) {
            onPredictionChange('superTieBreakWinner', formPredictions.winner);
        }


    };

    // Custom handler for set winner selection that handles 2-1/1-2 auto-selection
    const handleSetWinnerSelection = (setNumber: number, selectedPlayer: string) => {
        // For 2-1/1-2 results, when user selects one set winner, automatically select the other
        if (['2-1', '1-2'].includes(formPredictions.matchResult)) {
            const otherSetNumber = setNumber === 1 ? 2 : 1;
            const otherPlayer = selectedPlayer === details.player1.name ? details.player2.name : details.player1.name;

            // If deselecting (selectedPlayer is empty), clear both sets
            if (!selectedPlayer) {
                setSetWinner(setNumber, '');
                setSetWinner(otherSetNumber, '');
            } else {
                // Set the selected set winner
                setSetWinner(setNumber, selectedPlayer);
                // Automatically set the other set winner
                setSetWinner(otherSetNumber, otherPlayer);
            }
        } else {
            // For other match results, just set the selected set winner
            setSetWinner(setNumber, selectedPlayer);
        }
    };

    const handleClearAll = () => {
        // Clear all prediction fields
        onPredictionChange('winner', '');
        onPredictionChange('matchResult', '');
        onPredictionChange('set1Score', '');
        onPredictionChange('set2Score', '');
        onPredictionChange('set3Score', '');
        onPredictionChange('set4Score', '');
        onPredictionChange('set5Score', '');
        onPredictionChange('set1Winner', '');
        onPredictionChange('set2Winner', '');
        onPredictionChange('set3Winner', '');
        onPredictionChange('set4Winner', '');
        onPredictionChange('set5Winner', '');
        onPredictionChange('tieBreak', '');
        onPredictionChange('totalGames', '');
        onPredictionChange('acesLeader', '');
        onPredictionChange('doubleFaults', '');
        onPredictionChange('breakPoints', '');
        // Clear new tiebreak fields
        onPredictionChange('set1TieBreak', '');
        onPredictionChange('set2TieBreak', '');
        onPredictionChange('set1TieBreakScore', '');
        onPredictionChange('set2TieBreakScore', '');
        onPredictionChange('superTieBreak', '');
        onPredictionChange('superTieBreakScore', '');
        onPredictionChange('superTieBreakWinner', '');

        // Clear session storage for this match (both individual key and from main record)
        const storageKey = `${SESSION_KEYS.FORM_PREDICTIONS}_${matchId}`;
        removeFromSessionStorage(storageKey);

        // Also clear from main form predictions record
        const stored = loadFromSessionStorage<Record<string, PredictionOptions>>(SESSION_KEYS.FORM_PREDICTIONS, {});
        if (stored[matchId]) {
            delete stored[matchId];
            saveToSessionStorage(SESSION_KEYS.FORM_PREDICTIONS, stored);
        }
    };

    return (
        <div className="space-y-3 pb-4 h-full flex flex-col relative px-2 sm:px-0">
            {/* Clear All Button */}
            <motion.button
                onClick={handleClearAll}
                className={cx(
                    "absolute top-0 right-0 text-xs text-gray-400 hover:text-white px-2 py-1 border border-slate-600 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-700/50 z-20",
                    borders.rounded.sm,
                    transitions.default
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={dict?.matches?.clearAllSelections || "Clear all selections"}
            >
                {dict?.matches?.clearAll || 'Clear All'}
            </motion.button>

            {/* Multiplier Bonus Display */}
            {bonusMultiplier > 0 && (
                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-sm rounded-lg p-2 border border-green-500/30 mb-2 z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-xs sm:text-sm font-semibold text-green-300">
                                {dict?.matches?.multiplierBonus || 'Multiplier Bonus'}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-green-400">
                                {dict?.matches?.baseOdds || 'Base'}: {baseOdds.toFixed(2)}x
                            </span>
                            <span className="text-sm sm:text-lg font-bold text-green-300">
                                +{bonusMultiplier.toFixed(2)}x
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-green-200">
                                = {currentMultiplier.toFixed(2)}x
                            </span>
                        </div>
                    </div>

                </div>
            )}
            {/* Match Winner */}
            <motion.div
                className={cx(
                    "bg-slate-800/50 backdrop-blur-sm p-3 border",
                    borders.rounded.sm,
                    !formPredictions.winner ? "border-yellow-400/60 border-2 animate-pulse" : "border-slate-700/50"
                )}
            >
                <div className="flex items-center space-x-2 mb-2">
                    <h3 className={cx(typography.body.md, "font-bold text-white")}>
                        🏆 {dict?.matches?.matchWinner || 'Match Winner'}
                    </h3>
                    <span className={cx(
                        "text-xs font-bold px-2 py-1 rounded-full",
                        "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30"
                    )}>
                        {dict?.matches?.required || 'Required'}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <motion.button
                        onClick={() => onPredictionChange('winner', formPredictions.winner === details.player1.name ? '' : details.player1.name)}
                        disabled={locked}
                        className={cx(
                            "p-2 border",
                            borders.rounded.sm,
                            locked
                                ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                : (formPredictions.winner === details.player1.name
                                    ? cx(gradients.purple, 'border-purple-400 text-white', shadows.glow.purple)
                                    : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50 hover:border-slate-500/50')
                        )}
                        whileHover={!locked ? { scale: 1.05 } : {}}
                        whileTap={!locked ? { scale: 0.95 } : {}}
                    >
                        <div className="flex flex-col items-start sm:items-center text-left sm:text-center">
                            <div className="text-sm font-semibold break-words w-full">
                                {displayName(details.player1.name)}
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
                        onClick={() => onPredictionChange('winner', formPredictions.winner === details.player2.name ? '' : details.player2.name)}
                        disabled={locked}
                        className={cx(
                            "p-2 border",
                            borders.rounded.sm,
                            locked
                                ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                : (formPredictions.winner === details.player2.name
                                    ? cx(gradients.purple, 'border-purple-400 text-white', shadows.glow.purple)
                                    : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50 hover:border-slate-500/50')
                        )}
                        whileHover={!locked ? { scale: 1.05 } : {}}
                        whileTap={!locked ? { scale: 0.95 } : {}}
                    >
                        <div className="flex flex-col items-start sm:items-center text-left sm:text-center">
                            <div className="text-sm font-semibold break-words w-full">
                                {displayName(details.player2.name)}
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

            {/* Optional Predictions Notice */}
            {formPredictions.winner && (
                <div className="flex items-center justify-center">
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-600/10 border border-blue-500/20">
                        <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-blue-300">
                            {dict?.matches?.optional || 'Optional'}
                        </span>
                    </div>
                </div>
            )}

            {/* Match Result */}
            {
                formPredictions.winner && (
                    <motion.div
                        ref={matchResultRef}
                        className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border ${showMatchResultPulse ? 'border-yellow-400 border-2' : 'border-slate-700/50'}`}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-bold text-white">{dict?.matches?.matchResult || 'Match Result'}</h3>
                                <div
                                    className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center space-x-1 transition-all duration-300 ${formPredictions.matchResult
                                        ? 'bg-green-600/20 text-green-300 border-green-500/30'
                                        : 'bg-slate-700/20 text-slate-400 border-slate-600/30'
                                        }`}
                                >
                                    <span>+0.2x</span>
                                </div>
                            </div>
                            <div className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/30">
                                {isBestOf5 ? dict?.matches?.bestOf5 || 'Best of 5' : isAmateurFormat ? dict?.matches?.bestOf3SuperTB || 'Best of 3 (Super TB)' : dict?.matches?.bestOf3 || 'Best of 3'}
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">{dict?.matches?.howWillWin?.replace('{player}', displayName(formPredictions.winner)) || `How will ${displayName(formPredictions.winner)} win the match?`}</p>
                        <div className="grid grid-cols-2 gap-2">
                            {isBestOf5 ? (
                                <>
                                    {formPredictions.winner === details.player1.name ? (
                                        <>
                                            <button
                                                onClick={() => handleMatchResultChange(formPredictions.matchResult === '3-0' ? '' : '3-0')}
                                                disabled={locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (formPredictions.matchResult === '3-0'
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50')
                                                    }`}
                                            >
                                                <div className="text-base font-semibold">3-0</div>
                                                <div className="text-xs text-gray-400">{dict?.matches?.straightSets || 'Straight sets'}</div>
                                            </button>
                                            <button
                                                onClick={() => handleMatchResultChange(formPredictions.matchResult === '3-1' ? '' : '3-1')}
                                                disabled={locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (formPredictions.matchResult === '3-1'
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50')
                                                    }`}
                                            >
                                                <div className="text-base font-semibold">3-1</div>
                                                <div className="text-xs text-gray-400">{dict?.matches?.fourSets || 'Four sets'}</div>
                                            </button>
                                            <button
                                                onClick={() => handleMatchResultChange(formPredictions.matchResult === '3-2' ? '' : '3-2')}
                                                disabled={locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (formPredictions.matchResult === '3-2'
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50')
                                                    }`}
                                            >
                                                <div className="text-base font-semibold">3-2</div>
                                                <div className="text-xs text-gray-400">{dict?.matches?.fiveSets || 'Five sets'}</div>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleMatchResultChange(formPredictions.matchResult === '0-3' ? '' : '0-3')}
                                                disabled={locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (formPredictions.matchResult === '0-3'
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50')
                                                    }`}
                                            >
                                                <div className="text-base font-semibold">0-3</div>
                                                <div className="text-xs text-gray-400">{dict?.matches?.straightSets || 'Straight sets'}</div>
                                            </button>
                                            <button
                                                onClick={() => handleMatchResultChange(formPredictions.matchResult === '1-3' ? '' : '1-3')}
                                                disabled={locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (formPredictions.matchResult === '1-3'
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50')
                                                    }`}
                                            >
                                                <div className="text-base font-semibold">1-3</div>
                                                <div className="text-xs text-gray-400">{dict?.matches?.fourSets || 'Four sets'}</div>
                                            </button>
                                            <button
                                                onClick={() => handleMatchResultChange(formPredictions.matchResult === '2-3' ? '' : '2-3')}
                                                disabled={locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (formPredictions.matchResult === '2-3'
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50')
                                                    }`}
                                            >
                                                <div className="text-base font-semibold">2-3</div>
                                                <div className="text-xs text-gray-400">{dict?.matches?.fiveSets || 'Five sets'}</div>
                                            </button>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    {formPredictions.winner === details.player1.name ? (
                                        <>
                                            <button
                                                onClick={() => handleMatchResultChange(formPredictions.matchResult === '2-0' ? '' : '2-0')}
                                                disabled={locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (formPredictions.matchResult === '2-0'
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50')
                                                    }`}
                                            >
                                                <div className="text-base font-semibold">2-0</div>
                                                <div className="text-xs text-gray-400">{dict?.matches?.straightSets || 'Straight sets'}</div>
                                            </button>
                                            <button
                                                onClick={() => handleMatchResultChange(formPredictions.matchResult === '2-1' ? '' : '2-1')}
                                                disabled={locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (formPredictions.matchResult === '2-1'
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50')
                                                    }`}
                                            >
                                                <div className="text-base font-semibold">2-1</div>
                                                <div className="text-xs text-gray-400">{isAmateurFormat ? dict?.matches?.superTiebreak || 'Super tiebreak' : dict?.matches?.threeSets || 'Three sets'}</div>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleMatchResultChange(formPredictions.matchResult === '0-2' ? '' : '0-2')}
                                                disabled={locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (formPredictions.matchResult === '0-2'
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50')
                                                    }`}
                                            >
                                                <div className="text-base font-semibold">0-2</div>
                                                <div className="text-xs text-gray-400">{dict?.matches?.straightSets || 'Straight sets'}</div>
                                            </button>
                                            <button
                                                onClick={() => handleMatchResultChange(formPredictions.matchResult === '1-2' ? '' : '1-2')}
                                                disabled={locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (formPredictions.matchResult === '1-2'
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50')
                                                    }`}
                                            >
                                                <div className="text-base font-semibold">1-2</div>
                                                <div className="text-xs text-gray-400">{isAmateurFormat ? dict?.matches?.superTiebreak || 'Super tiebreak' : dict?.matches?.threeSets || 'Three sets'}</div>
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )
            }

            {/* Set Winners - 3rd Step */}
            {
                formPredictions.matchResult && (
                    // For straight-set results, show set scores directly
                    ['3-0', '0-3', '2-0', '0-2'].includes(formPredictions.matchResult) ? (
                        <div ref={setScoresRef} className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <h3 className="text-base font-bold text-white">{dict?.matches?.setScores || 'Set Scores'}</h3>
                                    {(() => {
                                        // Count how many set scores are selected
                                        const setScoresCount = Array.from({
                                            length: (() => {
                                                const [sets1, sets2] = formPredictions.matchResult.split('-').map(Number);
                                                return sets1 + sets2;
                                            })()
                                        }, (_, i) => getSetScore(i + 1)).filter(score => score).length;
                                        const maxBonus = getMaxSetScoresBonus();
                                        const currentBonus = getIndividualBonus(setScoresCount);
                                        const displayBonus = setScoresCount > 0 ? currentBonus : maxBonus;

                                        return (
                                            <div
                                                className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center space-x-1 transition-all duration-300 ${setScoresCount > 0
                                                    ? 'bg-green-600/20 text-green-300 border-green-500/30'
                                                    : 'bg-slate-700/20 text-slate-400 border-slate-600/30'
                                                    }`}
                                            >
                                                <span>+{displayBonus.toFixed(1)}x</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/30">
                                    {isBestOf5 ? dict?.matches?.bestOf5 || 'Best of 5' : isAmateurFormat ? dict?.matches?.bestOf3SuperTB || 'Best of 3 (Super TB)' : dict?.matches?.bestOf3 || 'Best of 3'}
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">
                                {dict?.matches?.predictExactScore?.replace('{player}', displayName(formPredictions.winner)) || `Predict the exact score for each set. ${displayName(formPredictions.winner)} wins all sets.`}
                            </p>
                            {Array.from({
                                length: (() => {
                                    // Determine how many sets to show for detailed scores
                                    const getSetsToShowForScores = () => {
                                        if (isAmateurFormat && ['2-1', '1-2'].includes(formPredictions.matchResult)) {
                                            return 2; // Only 2 sets for amateur format with 2-1/1-2
                                        }
                                        // For other formats, show the actual number of sets played
                                        const [sets1, sets2] = formPredictions.matchResult.split('-').map(Number);
                                        return sets1 + sets2;
                                    };

                                    return getSetsToShowForScores();
                                })()
                            }, (_, i) => {
                                const setWinner = formPredictions.winner;

                                return (
                                    <div key={i} className="space-y-1.5 mb-2">
                                        <h4 className="font-semibold text-white text-xs">Set {i + 1} Score - {displayName(setWinner)} {dict?.matches?.wins || 'wins'}</h4>
                                        {renderSetScoreDropdown(i + 1, getSetScore(i + 1), (value) => setSetScore(i + 1, value))}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // For non-straight-set results, show set winners with inline scores
                        <motion.div
                            ref={setWinnersRef}
                            className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border ${showSetWinnersPulse ? 'border-yellow-400 border-2' : 'border-slate-700/50'}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <h3 className="text-base font-bold text-white">{dict?.matches?.setWinners || 'Set Winners'}</h3>
                                    {(() => {
                                        const setWinnersCount = Array.from({ length: setsToShowFromResult }, (_, i) => getSetWinner(i + 1)).filter(winner => winner).length;
                                        const maxBonus = getMaxSetWinnersBonus();

                                        // For 2-1/1-2 results, cap the bonus at 0.2x (only one user selection)
                                        let currentBonus;
                                        if (['2-1', '1-2'].includes(formPredictions.matchResult)) {
                                            currentBonus = setWinnersCount > 0 ? 0.2 : 0;
                                        } else {
                                            currentBonus = getIndividualBonus(setWinnersCount);
                                        }

                                        const displayBonus = setWinnersCount > 0 ? currentBonus : maxBonus;

                                        return (
                                            <div
                                                className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center space-x-1 transition-all duration-300 ${setWinnersCount > 0
                                                    ? 'bg-green-600/20 text-green-300 border-green-500/30'
                                                    : 'bg-slate-700/20 text-slate-400 border-slate-600/30'
                                                    }`}
                                            >
                                                <span>+{displayBonus.toFixed(1)}x</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">
                                {dict?.matches?.whoWinsEachSet?.replace('{result}', formPredictions.matchResult) || `Who wins each set based on your ${formPredictions.matchResult} prediction?`}
                                {['2-1', '1-2'].includes(formPredictions.matchResult) ?
                                    ` ${dict?.matches?.selectOneSetWinner || 'Select one set winner. The other will be automatically selected.'}` :
                                    formPredictions.winner === details.player1.name ?
                                        ` ${dict?.matches?.winsSetsDescription?.replace('{player1}', displayName(details.player1.name)).replace('{sets1}', formPredictions.matchResult.split('-')[0]).replace('{player2}', displayName(details.player2.name)).replace('{sets2}', formPredictions.matchResult.split('-')[1]) || `${displayName(details.player1.name)} wins ${formPredictions.matchResult.split('-')[0]} sets, ${displayName(details.player2.name)} wins ${formPredictions.matchResult.split('-')[1]} sets`}` :
                                        ` ${dict?.matches?.winsSetsDescription?.replace('{player1}', displayName(details.player2.name)).replace('{sets1}', formPredictions.matchResult.split('-')[1]).replace('{player2}', displayName(details.player1.name)).replace('{sets2}', formPredictions.matchResult.split('-')[0]) || `${displayName(details.player2.name)} wins ${formPredictions.matchResult.split('-')[1]} sets, ${displayName(details.player1.name)} wins ${formPredictions.matchResult.split('-')[0]} sets`}`
                                }
                            </p>
                            {Array.from({ length: setsToShowFromResult }, (_, i) => {
                                const currentWinner = getSetWinner(i + 1);

                                // Get expected wins based on Match Winner and Match Result
                                const [winnerSets, loserSets] = formPredictions.matchResult.split('-').map(Number);
                                const expectedWinnerWins = formPredictions.winner === details.player1.name ? winnerSets : loserSets;
                                const expectedLoserWins = formPredictions.winner === details.player1.name ? loserSets : winnerSets;

                                // Count how many sets each player has already won (excluding current set)
                                const player1Wins = Array.from({ length: setsToShowFromResult }, (_, j) => getSetWinner(j + 1)).filter((winner, index) => winner === details.player1.name && index !== i).length;
                                const player2Wins = Array.from({ length: setsToShowFromResult }, (_, j) => getSetWinner(j + 1)).filter((winner, index) => winner === details.player2.name && index !== i).length;

                                // Check if players can win this set based on Match Winner constraints
                                const isPlayer1Winner = formPredictions.winner === details.player1.name;
                                const isPlayer2Winner = formPredictions.winner === details.player2.name;

                                let canPlayer1Win = false;
                                let canPlayer2Win = false;

                                if (isPlayer1Winner) {
                                    // Player 1 is the match winner - they can win up to expectedWinnerWins sets
                                    canPlayer1Win = player1Wins < expectedWinnerWins || currentWinner === details.player1.name;
                                    // Player 2 is the loser - they can win up to expectedLoserWins sets
                                    canPlayer2Win = player2Wins < expectedLoserWins || currentWinner === details.player2.name;
                                } else if (isPlayer2Winner) {
                                    // Player 2 is the match winner - they can win up to expectedWinnerWins sets
                                    canPlayer2Win = player2Wins < expectedWinnerWins || currentWinner === details.player2.name;
                                    // Player 1 is the loser - they can win up to expectedLoserWins sets
                                    canPlayer1Win = player1Wins < expectedLoserWins || currentWinner === details.player1.name;
                                }

                                // Special logic for 2-1/1-2 results (both amateur and regular format)
                                if (['2-1', '1-2'].includes(formPredictions.matchResult)) {
                                    // For 2-1/1-2, user can select either set initially
                                    // When they select one, the other is automatically selected
                                    canPlayer1Win = true;
                                    canPlayer2Win = true;
                                }

                                return (
                                    <div key={i} className="space-y-2 mb-3">
                                        <h4 className="font-semibold text-white text-xs">{dict?.matches?.setWinner?.replace('{setNumber}', (i + 1).toString()) || `Set ${i + 1} Winner`}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => handleSetWinnerSelection(i + 1, currentWinner === details.player1.name ? '' : details.player1.name)}
                                                disabled={!canPlayer1Win || locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (currentWinner === details.player1.name
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : canPlayer1Win
                                                            ? 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50'
                                                            : 'bg-slate-800/50 border-slate-700/50 text-gray-600 cursor-not-allowed')
                                                    }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="break-words text-left">{displayName(details.player1.name)}</span>
                                                    {details.player1.teamName && <span className="text-orange-400 text-[10px] sm:text-xs leading-tight break-words text-left mt-0.5">{details.player1.teamName}</span>}
                                                </div>
                                                {!canPlayer1Win && <span className="text-xs block text-gray-500">{dict?.matches?.maxReached || '(max reached)'}</span>}
                                            </button>
                                            <button
                                                onClick={() => handleSetWinnerSelection(i + 1, currentWinner === details.player2.name ? '' : details.player2.name)}
                                                disabled={!canPlayer2Win || locked}
                                                className={`p-2 rounded-lg border ${locked
                                                    ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                    : (currentWinner === details.player2.name
                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                        : canPlayer2Win
                                                            ? 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50'
                                                            : 'bg-slate-800/50 border-slate-700/50 text-gray-600 cursor-not-allowed')
                                                    }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="break-words text-left">{displayName(details.player2.name)}</span>
                                                    {details.player2.teamName && <span className="text-orange-400 text-[10px] sm:text-xs leading-tight break-words text-left mt-0.5">{details.player2.teamName}</span>}
                                                </div>
                                                {!canPlayer2Win && <span className="text-xs block text-gray-500">{dict?.matches?.maxReached || '(max reached)'}</span>}
                                            </button>
                                        </div>


                                    </div>
                                );
                            })}
                        </motion.div>
                    )
                )
            }

            {/* Set Scores for 2-1/1-2 Results - Show only when set winners are selected */}
            {
                formPredictions.matchResult && ['2-1', '1-2'].includes(formPredictions.matchResult) &&
                Array.from({ length: 2 }, (_, i) => getSetWinner(i + 1)).some(winner => winner) && (
                    <motion.div
                        ref={setScoresRef}
                        className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border ${showSetScoresPulse ? 'border-yellow-400 border-2' : 'border-slate-700/50'}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-base font-bold text-white">{dict?.matches?.setScores || 'Set Scores'}</h3>
                                {(() => {
                                    // Count how many set scores are selected
                                    const setScoresCount = Array.from({ length: 2 }, (_, i) => getSetScore(i + 1)).filter(score => score).length;
                                    const maxBonus = 0.4; // 2 sets * 0.2x each
                                    const currentBonus = getIndividualBonus(setScoresCount); // 0.2x per set score
                                    const displayBonus = setScoresCount > 0 ? currentBonus : maxBonus;

                                    return (
                                        <div
                                            className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center space-x-1 transition-all duration-300 ${setScoresCount > 0
                                                ? 'bg-green-600/20 text-green-300 border-green-500/30'
                                                : 'bg-slate-700/20 text-slate-400 border-slate-600/30'
                                                }`}
                                        >
                                            <span>+{displayBonus.toFixed(1)}x</span>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/30">
                                {isAmateurFormat ? dict?.matches?.bestOf3SuperTB || 'Best of 3 (Super TB)' : dict?.matches?.bestOf3 || 'Best of 3'}
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                            {dict?.matches?.predictExactScoreForEachSet || 'Predict the exact score for each set.'} (+0.2x each)
                        </p>
                        {Array.from({ length: 2 }, (_, i) => {
                            const setWinner = getSetWinner(i + 1);

                            return (
                                <div key={i} className="space-y-1.5 mb-2">
                                    <h4 className="font-semibold text-white text-xs">Set {i + 1} Score - {displayName(setWinner)} {dict?.matches?.wins || 'wins'}</h4>
                                    {renderSetScoreDropdown(i + 1, getSetScore(i + 1), (value) => setSetScore(i + 1, value))}
                                </div>
                            );
                        })}
                    </motion.div>
                )
            }

            {/* Set Tiebreaks - Show only when tiebreak scores are selected */}
            {
                formPredictions.matchResult && (() => {
                    // Check if any set has a tiebreak score (7-6 or 6-7)
                    const hasTiebreakScore = () => {
                        const set1Score = getSetScore(1);
                        const set2Score = getSetScore(2);
                        const set3Score = getSetScore(3);
                        const set4Score = getSetScore(4);
                        const set5Score = getSetScore(5);

                        return set1Score === '7-6' || set1Score === '6-7' ||
                            set2Score === '7-6' || set2Score === '6-7' ||
                            set3Score === '7-6' || set3Score === '6-7' ||
                            set4Score === '7-6' || set4Score === '6-7' ||
                            set5Score === '7-6' || set5Score === '6-7';
                    };

                    return hasTiebreakScore();
                })() && (
                    <motion.div
                        ref={setTiebreaksRef}
                        className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border ${showTiebreaksPulse ? 'border-yellow-400 border-2' : 'border-slate-700/50'}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-base font-bold text-white">{dict?.matches?.setTiebreaks || 'Set Tiebreaks'}</h3>
                                {(() => {
                                    const tiebreakPredictionsCount = [
                                        formPredictions.set1TieBreakScore,
                                        formPredictions.set2TieBreakScore
                                    ].filter(score => score).length;
                                    const maxBonus = getMaxSetTiebreaksBonus();
                                    const currentBonus = getTiebreakBonus(tiebreakPredictionsCount);
                                    const displayBonus = tiebreakPredictionsCount > 0 ? currentBonus : maxBonus;

                                    return (
                                        <div
                                            className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center space-x-1 transition-all duration-300 ${tiebreakPredictionsCount > 0
                                                ? 'bg-green-600/20 text-green-300 border-green-500/30'
                                                : 'bg-slate-700/20 text-slate-400 border-slate-600/30'
                                                }`}
                                        >
                                            <span>+{displayBonus.toFixed(1)}x</span>
                                        </div>
                                    );
                                })()}
                            </div>

                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                            {dict?.matches?.tiebreakScoresSelected || "You've selected tiebreak scores for some sets. Here you can predict the detailed tiebreak scores within those sets."}
                        </p>

                        {/* Set 1 Tiebreak */}
                        {(() => {
                            // Show Set 1 tiebreak only if Set 1 has a tiebreak score
                            const set1Score = getSetScore(1);
                            return set1Score === '7-6' || set1Score === '6-7';
                        })() && (
                                <div className="space-y-2 mb-3">
                                    <h4 className="font-semibold text-white text-xs">{dict?.matches?.setTiebreakDetails?.replace('{setNumber}', '1') || 'Set 1 Tiebreak Details'}</h4>
                                    <p className="text-xs text-gray-400 mb-1.5">
                                        {dict?.matches?.setEndedInTiebreak?.replace('{setNumber}', '1') || 'Set 1 ended in a tiebreak. Predict the detailed tiebreak score:'}
                                    </p>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-gray-400">{dict?.matches?.tiebreakScore || 'Tiebreak Score'}</label>
                                        <select
                                            value={formPredictions.set1TieBreakScore}
                                            onChange={(e) => onPredictionChange('set1TieBreakScore', e.target.value)}
                                            disabled={locked}
                                            className={`w-full p-2 border rounded-lg text-sm ${locked
                                                ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                : 'bg-slate-700/50 border-slate-600/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                                                }`}
                                        >
                                            <option value="">{dict?.matches?.selectTiebreakScore || 'Select tiebreak score'}</option>
                                            {(() => {
                                                const set1Winner = getSetWinner(1);
                                                const set1Score = getSetScore(1);

                                                // Determine which player won the tiebreak based on set score
                                                const tiebreakWinner = set1Score === '7-6' ? details.player1.name : details.player2.name;

                                                if (tiebreakWinner === details.player1.name) {
                                                    // Player 1 won the tiebreak - show scores where first number > second number
                                                    return (
                                                        <>
                                                            <option value="7-0">7-0</option>
                                                            <option value="7-1">7-1</option>
                                                            <option value="7-2">7-2</option>
                                                            <option value="7-3">7-3</option>
                                                            <option value="7-4">7-4</option>
                                                            <option value="7-5">7-5</option>
                                                        </>
                                                    );
                                                } else {
                                                    // Player 2 won the tiebreak - show scores where second number > first number
                                                    return (
                                                        <>
                                                            <option value="0-7">0-7</option>
                                                            <option value="1-7">1-7</option>
                                                            <option value="2-7">2-7</option>
                                                            <option value="3-7">3-7</option>
                                                            <option value="4-7">4-7</option>
                                                            <option value="5-7">5-7</option>
                                                        </>
                                                    );
                                                }
                                            })()}
                                        </select>
                                    </div>
                                </div>
                            )}

                        {/* Set 2 Tiebreak */}
                        {(() => {
                            // Show Set 2 tiebreak only if Set 2 has a tiebreak score
                            const set2Score = getSetScore(2);
                            return set2Score === '7-6' || set2Score === '6-7';
                        })() && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-white text-xs">{dict?.matches?.setTiebreakDetails?.replace('{setNumber}', '2') || 'Set 2 Tiebreak Details'}</h4>
                                    <p className="text-xs text-gray-400 mb-1.5">
                                        {dict?.matches?.setEndedInTiebreak?.replace('{setNumber}', '2') || 'Set 2 ended in a tiebreak. Predict the detailed tiebreak score:'}
                                    </p>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-gray-400">{dict?.matches?.tiebreakScore || 'Tiebreak Score'}</label>
                                        <select
                                            value={formPredictions.set2TieBreakScore}
                                            onChange={(e) => onPredictionChange('set2TieBreakScore', e.target.value)}
                                            disabled={locked}
                                            className={`w-full p-2 border rounded-lg text-sm ${locked
                                                ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                                : 'bg-slate-700/50 border-slate-600/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                                                }`}
                                        >
                                            <option value="">{dict?.matches?.selectTiebreakScore || 'Select tiebreak score'}</option>
                                            {(() => {
                                                const set2Winner = getSetWinner(2);
                                                const set2Score = getSetScore(2);

                                                // Determine which player won the tiebreak based on set score
                                                const tiebreakWinner = set2Score === '7-6' ? details.player1.name : details.player2.name;

                                                if (tiebreakWinner === details.player1.name) {
                                                    // Player 1 won the tiebreak - show scores where first number > second number
                                                    return (
                                                        <>
                                                            <option value="7-0">7-0</option>
                                                            <option value="7-1">7-1</option>
                                                            <option value="7-2">7-2</option>
                                                            <option value="7-3">7-3</option>
                                                            <option value="7-4">7-4</option>
                                                            <option value="7-5">7-5</option>
                                                        </>
                                                    );
                                                } else {
                                                    // Player 2 won the tiebreak - show scores where second number > first number
                                                    return (
                                                        <>
                                                            <option value="0-7">0-7</option>
                                                            <option value="1-7">1-7</option>
                                                            <option value="2-7">2-7</option>
                                                            <option value="3-7">3-7</option>
                                                            <option value="4-7">4-7</option>
                                                            <option value="5-7">5-7</option>
                                                        </>
                                                    );
                                                }
                                            })()}
                                        </select>
                                    </div>
                                </div>
                            )}
                    </motion.div>
                )
            }

            {/* Super Tiebreak - Only for amateur format when 2-1/1-2 is selected */}
            {
                isAmateurFormat && formPredictions.matchResult && ['2-1', '1-2'].includes(formPredictions.matchResult) && (
                    <motion.div
                        ref={superTiebreakRef}
                        className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border ${showSuperTiebreakPulse ? 'border-yellow-400 border-2' : 'border-slate-700/50'}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-base font-bold text-white">{dict?.matches?.superTiebreak || 'Super Tiebreak'}</h3>
                                {(() => {
                                    // Only count super tiebreak score for multiplier (winner is pre-selected)
                                    const superTiebreakScoreCount = formPredictions.superTieBreakScore ? 1 : 0;
                                    const maxBonus = 0.2; // Only 1 super tiebreak score worth 0.2x
                                    const currentBonus = superTiebreakScoreCount * 0.2;
                                    const displayBonus = superTiebreakScoreCount > 0 ? currentBonus : maxBonus;

                                    return (
                                        <div
                                            className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center space-x-1 transition-all duration-300 ${superTiebreakScoreCount > 0
                                                ? 'bg-green-600/20 text-green-300 border-green-500/30'
                                                : 'bg-slate-700/20 text-slate-400 border-slate-600/30'
                                                }`}
                                        >
                                            <span>+{displayBonus.toFixed(1)}x</span>
                                        </div>
                                    );
                                })()}
                            </div>

                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                            {dict?.matches?.superTiebreakDescription || 'Since this is a 2-1 match in amateur format, there will be a 10-point super tiebreak instead of a 3rd set.'}
                        </p>

                        {/* Super Tiebreak Winner - Pre-selected */}
                        <div className="space-y-2 mb-3">
                            <h4 className="font-semibold text-white text-xs">{dict?.matches?.superTiebreakWinner || 'Super Tiebreak Winner'}</h4>
                            <p className="text-xs text-gray-400 mb-2">
                                {dict?.matches?.superTiebreakWinnerDescription?.replace('{player}', displayName(formPredictions.winner)) || `The super tiebreak winner must be ${displayName(formPredictions.winner)} to match your overall prediction.`}
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="p-2 rounded-lg border bg-purple-600/20 border-purple-500/30 text-purple-300">
                                    <div className="text-sm font-semibold">{displayName(formPredictions.winner)}</div>
                                    <div className="text-xs text-purple-400">{dict?.matches?.winsSuperTiebreak || 'Wins super tiebreak (pre-selected)'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Super Tiebreak Score */}
                        {formPredictions.superTieBreakWinner && (
                            <div className="space-y-1.5">
                                <h4 className="font-semibold text-white text-xs">{dict?.matches?.superTiebreakScore?.replace('{player}', displayName(formPredictions.winner)) || `Super Tiebreak Score - ${displayName(formPredictions.winner)} ${dict?.matches?.wins || 'wins'}`}</h4>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-400">
                                        {dict?.matches?.superTiebreakScoreLabel || 'Super Tiebreak Score'}
                                        <span className="block text-xs text-gray-500 mt-1">
                                            {dict?.matches?.superTiebreakScoreHelper || 'Format: 10-8, 17-15, etc. (Winner must win by 2 points, minimum 10 points to win)'}
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formPredictions.superTieBreakScore || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Allow empty or valid format
                                            if (value === '' || validateSuperTiebreakScore(value, formPredictions.winner === details.player1.name)) {
                                                onPredictionChange('superTieBreakScore', value);
                                            }
                                        }}
                                        placeholder={dict?.matches?.superTiebreakScorePlaceholder || 'e.g., 10-8, 17-15'}
                                        disabled={locked}
                                        className={`w-full p-3 border rounded-lg text-sm ${locked
                                            ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                                            : 'bg-slate-700/50 border-slate-600/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                                            }`}
                                    />
                                    {formPredictions.superTieBreakScore && !validateSuperTiebreakScore(formPredictions.superTieBreakScore, formPredictions.winner === details.player1.name) && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {dict?.matches?.superTiebreakScoreError || 'Invalid score. Winner must have at least 10 points and win by 2 points (e.g., 10-8, 17-15).'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )
            }

            {/* Most Aces - COMMENTED OUT FOR FUTURE CHANGES */}
            {/* <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <h3 className="text-base font-bold text-white mb-3">Most Aces</h3>
                <p className="text-xs text-gray-400 mb-3">
                    Who leads in aces during the match?
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => onPredictionChange('acesLeader', formPredictions.acesLeader === details.player1.name ? '' : details.player1.name)}
                        className={`p-3 rounded-lg border ${formPredictions.acesLeader === details.player1.name
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                            }`}
                    >
                                                {displayName(details.player1.name)}
                    </button>
                    <button
                        onClick={() => onPredictionChange('acesLeader', formPredictions.acesLeader === details.player2.name ? '' : details.player2.name)}
                        className={`p-3 rounded-lg border ${formPredictions.acesLeader === details.player2.name
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                            }`}
                    >
                                                {displayName(details.player2.name)}
                    </button>
                </div>
            </div> */}

            {/* Total Double Faults - COMMENTED OUT FOR FUTURE CHANGES */}
            {/* <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <h3 className="text-base font-bold text-white mb-3">Total Double Faults</h3>
                <p className="text-xs text-gray-400 mb-3">
                    What is the total number of double faults in the match?
                </p>
                <select
                    value={formPredictions.doubleFaults}
                    onChange={(e) => onPredictionChange('doubleFaults', e.target.value)}
                    className="w-full p-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                >
                    <option value="">Select double faults</option>
                    <option value="Under 5">Under 5</option>
                    <option value="5-10">5-10</option>
                    <option value="11-15">11-15</option>
                    <option value="Over 15">Over 15</option>
                </select>
            </div> */}

            {/* Total Break Points - COMMENTED OUT FOR FUTURE CHANGES */}
            {/* <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <h3 className="text-base font-bold text-white mb-3">Total Break Points</h3>
                <p className="text-xs text-gray-400 mb-3">
                    What is the total number of break points faced in the match?
                </p>
                <select
                    value={formPredictions.breakPoints}
                    onChange={(e) => onPredictionChange('breakPoints', e.target.value)}
                    className="w-full p-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                >
                    <option value="">Select break points</option>
                    <option value="Under 8">Under 8</option>
                    <option value="8-12">8-12</option>
                    <option value="13-17">13-17</option>
                    <option value="Over 17">Over 17</option>
                </select>
            </div> */}
        </div >
    );
} 