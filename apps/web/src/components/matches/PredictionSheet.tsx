'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Match } from '@/types/dashboard';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { usePredictionSlipCollapse } from '@/app/ClientLayout';
import { useDictionary } from '@/context/DictionaryContext';
import { useWallet, COIN_CONSTANTS } from '@/context/WalletContext';
import { PredictionForm } from './PredictionForm';
import { MatchHeader } from './MatchHeader';
import {
    PredictionOptions,
    createEmptyPredictions,
    getSetsToShowFromResult,
    getSetWinnersFromResult,
    buildPredictionText,
    getPredictionCount,
    hasPredictions,
    calculateMultiplier,
} from '@/lib/predictionHelpers';
import { clearFormPredictionsForMatch } from '@/lib/sessionStorage';

interface PredictionSheetProps {
    match: Match | null;
    preselectedPlayer: 'player1' | 'player2' | null;
    onClose: () => void;
    onViewDetail: (match: Match) => void;
}

function buildDetails(match: Match) {
    const isDoubles = match.match_type === 'doubles';
    const player1Name = isDoubles ? (match.team1?.name || match.player1.name) : match.player1.name;
    const player2Name = isDoubles ? (match.team2?.name || match.player2.name) : match.player2.name;
    return {
        tournament: match.tournament,
        player1: {
            name: player1Name,
            odds: isDoubles ? (match.team1?.odds ?? match.player1.odds) : match.player1.odds,
            wins: match.player_a?.wins || 0,
            losses: match.player_a?.losses || 0,
            ntrpRating: match.player_a?.ntrp_rating,
            teamName: match.player1.teamName,
        },
        player2: {
            name: player2Name,
            odds: isDoubles ? (match.team2?.odds ?? match.player2.odds) : match.player2.odds,
            wins: match.player_b?.wins || 0,
            losses: match.player_b?.losses || 0,
            ntrpRating: match.player_b?.ntrp_rating,
            teamName: match.player2.teamName,
        },
        round: match.round || '',
        surface: match.tournaments?.surface || 'Unknown',
        format: match.tournaments?.matches_type || 'best-of-3',
        matchType: match.match_type || 'singles',
    };
}

export function PredictionSheet({ match, preselectedPlayer, onClose, onViewDetail }: PredictionSheetProps) {
    const { addPrediction, hasPrediction } = usePredictionSlip();
    const { setIsPredictionSlipCollapsed } = usePredictionSlipCollapse();
    const { dict, prepForUppercaseDisplay } = useDictionary();
    const { wallet } = useWallet();

    const [formPredictions, setFormPredictions] = useState<PredictionOptions>(createEmptyPredictions());
    const [hasFormChanged, setHasFormChanged] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    // Close stats drawer when the sheet closes
    useEffect(() => { if (!match) setStatsOpen(false); }, [match]);

    const details = useMemo(() => match ? buildDetails(match) : null, [match]);

    // Pre-select winner when sheet opens
    useEffect(() => {
        if (!match || !details || !preselectedPlayer) return;
        const winnerName = preselectedPlayer === 'player1' ? details.player1.name : details.player2.name;
        setFormPredictions({ ...createEmptyPredictions(), winner: winnerName });
        setHasFormChanged(true);
    }, [match?.id, preselectedPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePredictionChange = (type: keyof PredictionOptions, value: string) => {
        setFormPredictions(prev => {
            const next = { ...prev, [type]: value };
            if (type === 'winner') {
                next.matchResult = '';
                next.set1Score = next.set2Score = next.set3Score = next.set4Score = next.set5Score = '';
                next.set1Winner = next.set2Winner = next.set3Winner = next.set4Winner = next.set5Winner = '';
            }
            if (type === 'matchResult') {
                next.set1Score = next.set2Score = next.set3Score = next.set4Score = next.set5Score = '';
                next.set1Winner = next.set2Winner = next.set3Winner = next.set4Winner = next.set5Winner = '';
            }
            return next;
        });
        setHasFormChanged(true);
    };

    const predictionCount = useMemo(() => getPredictionCount(formPredictions), [formPredictions]);
    const hasAnyPredictions = useMemo(() => hasPredictions(formPredictions), [formPredictions]);

    const selectedMultiplier = useMemo(() => {
        if (!formPredictions.winner || !details) return 1.0;
        return calculateMultiplier(formPredictions.winner, details.player1, details.player2, predictionCount);
    }, [formPredictions.winner, predictionCount, details]);

    const isBestOf5 = details?.format === 'best-of-5';
    const isAmateurFormat = details?.format === 'best-of-3-super-tiebreak';
    const isDoubles = match?.match_type === 'doubles';
    const setsToShowFromResult = getSetsToShowFromResult(formPredictions.matchResult, isAmateurFormat);
    const setWinnersFromResult = details
        ? getSetWinnersFromResult(formPredictions.matchResult, formPredictions.winner, details.player1.name, details.player2.name)
        : [];

    const getSetScore = (n: number) => [, formPredictions.set1Score, formPredictions.set2Score, formPredictions.set3Score, formPredictions.set4Score, formPredictions.set5Score][n] ?? '';
    const setSetScore = (n: number, v: string) => {
        const keys: (keyof PredictionOptions)[] = ['set1Score', 'set2Score', 'set3Score', 'set4Score', 'set5Score'];
        if (n >= 1 && n <= 5) handlePredictionChange(keys[n - 1], v);
    };
    const getSetWinner = (n: number) => [, formPredictions.set1Winner, formPredictions.set2Winner, formPredictions.set3Winner, formPredictions.set4Winner, formPredictions.set5Winner][n] ?? '';
    const setSetWinner = (n: number, v: string) => {
        const keys: (keyof PredictionOptions)[] = ['set1Winner', 'set2Winner', 'set3Winner', 'set4Winner', 'set5Winner'];
        if (n >= 1 && n <= 5) handlePredictionChange(keys[n - 1], v);
    };

    const renderSetScoreDropdown = (setNumber: number, value: string, onChange: (v: string) => void) => {
        const setWinner = getSetWinner(setNumber);
        const allScores = ['6-0','6-1','6-2','6-3','6-4','7-5','7-6','6-7','5-7','4-6','3-6','2-6','1-6','0-6'];
        const available = !setWinner ? allScores : allScores.filter(s => {
            const [a, b] = s.split('-').map(Number);
            return setWinner === details?.player1.name ? a > b : b > a;
        });
        return (
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-3 py-3 bg-[#0F1628] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-[#FFD60A]/50 focus:ring-1 focus:ring-[#FFD60A]/30 transition-all min-h-[48px]"
            >
                <option value="">{dict?.matches?.selectSetScore?.replace('{setNumber}', String(setNumber)) || `Set ${setNumber} score`}</option>
                {available.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        );
    };

    const handleSubmit = async () => {
        if (!match || !hasAnyPredictions || !hasFormChanged) return;
        const predictionText = buildPredictionText(formPredictions);
        if (!predictionText) return;

        await addPrediction({
            matchId: match.id,
            match,
            prediction: formPredictions,
            points: match.points,
            betAmount: 0,
            multiplier: selectedMultiplier,
            potentialWinnings: 0,
        });

        setIsPredictionSlipCollapsed(false);
        clearFormPredictionsForMatch(match.id);
        onClose();
    };

    const isLocked = match?.locked || false;
    const canSubmit = hasAnyPredictions && hasFormChanged && !isLocked;

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {match && details && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        className="fixed inset-0 bg-black/60 z-[70]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        key="sheet"
                        className="fixed bottom-0 left-0 right-0 z-[80] flex flex-col bg-[#0F1628] rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.8)]"
                        style={{ maxHeight: '92dvh' }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                            <div className="w-10 h-1 rounded-full bg-white/[0.15]" />
                        </div>

                        {/* Header */}
                        <div className="px-4 pb-3 flex items-start justify-between gap-3 flex-shrink-0 border-b border-white/[0.06]">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-[#4B5975] uppercase tracking-wider truncate">
                                    {prepForUppercaseDisplay(details.tournament)}
                                </p>
                                <h3 className="text-base font-black text-white leading-tight mt-0.5">
                                    {isDoubles
                                        ? `${match.player1.name} vs ${match.player2.name}`
                                        : `${details.player1.name.split(' ').pop()} vs ${details.player2.name.split(' ').pop()}`
                                    }
                                </h3>
                                <button
                                    onClick={() => setStatsOpen(true)}
                                    className="text-[11px] text-[#38BDF8] font-semibold mt-0.5 hover:underline"
                                >
                                    Στατιστικά & H2H →
                                </button>
                            </div>
                            <button
                                onClick={onClose}
                                className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1E2A45] flex items-center justify-center text-[#4B5975] hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Scrollable form */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">
                            <div className="p-4">
                                <PredictionForm
                                    matchId={match.id}
                                    formPredictions={formPredictions}
                                    onPredictionChange={handlePredictionChange}
                                    details={details}
                                    isDoubles={isDoubles}
                                    isBestOf5={isBestOf5}
                                    isAmateurFormat={isAmateurFormat}
                                    setsToShowFromResult={setsToShowFromResult}
                                    setWinnersFromResult={setWinnersFromResult}
                                    renderSetScoreDropdown={renderSetScoreDropdown}
                                    getSetScore={getSetScore}
                                    setSetScore={setSetScore}
                                    getSetWinner={getSetWinner}
                                    setSetWinner={setSetWinner}
                                    locked={isLocked}
                                    hasAnyPredictions={hasAnyPredictions}
                                    hasFormChanged={hasFormChanged}
                                    onSubmitButton={null}
                                    disableFullScreen={true}
                                />
                            </div>
                        </div>

                        {/* Sticky CTA — always visible */}
                        <div className="flex-shrink-0 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-white/[0.06] bg-[#0F1628]">
                            {hasAnyPredictions && selectedMultiplier > 1 && (
                                <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-[#00E676]/08 border border-[#00E676]/20">
                                    <span className="text-xs text-[#00E676]/70">Απόδοση:</span>
                                    <span className="text-sm font-black tabular-nums text-[#00E676]">{selectedMultiplier.toFixed(2)}×</span>
                                </div>
                            )}
                            <motion.button
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                className={[
                                    'w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all duration-150',
                                    canSubmit
                                        ? 'bg-[#FFD60A] text-[#080C18] shadow-[0_4px_24px_rgba(255,214,10,0.35)] active:scale-[0.98]'
                                        : 'bg-[#1E2A45] text-[#4B5975] cursor-not-allowed',
                                ].join(' ')}
                                whileTap={canSubmit ? { scale: 0.98 } : {}}
                            >
                                {isLocked
                                    ? '🔒 Κλειδωμένο'
                                    : hasAnyPredictions
                                        ? (hasPrediction(match.id) ? 'Ενημέρωση Πρόβλεψης' : 'Προσθήκη Πρόβλεψης')
                                        : 'Επέλεξε τουλάχιστον μία πρόβλεψη'}
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Stats drawer — slides up over the prediction sheet */}
                    <AnimatePresence>
                        {statsOpen && (
                            <>
                                <motion.div
                                    key="stats-backdrop"
                                    className="fixed inset-0 bg-black/40 z-[85]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setStatsOpen(false)}
                                />
                                <motion.div
                                    key="stats-drawer"
                                    className="fixed bottom-0 left-0 right-0 z-[90] bg-[#0F1628] rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.8)] flex flex-col"
                                    style={{ maxHeight: '85dvh' }}
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                >
                                    {/* Handle */}
                                    <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                                        <div className="w-10 h-1 rounded-full bg-white/[0.15]" />
                                    </div>
                                    {/* Header */}
                                    <div className="px-4 pb-3 flex items-center justify-between border-b border-white/[0.06] flex-shrink-0">
                                        <div>
                                            <h3 className="text-sm font-black text-white">Στατιστικά Αγώνα</h3>
                                            <p className="text-[10px] text-[#4B5975] mt-0.5">
                                                {isDoubles
                                                    ? `${match.player1.name} vs ${match.player2.name}`
                                                    : `${details.player1.name.split(' ').pop()} vs ${details.player2.name.split(' ').pop()}`
                                                }
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setStatsOpen(false)}
                                            className="w-8 h-8 rounded-full bg-[#1E2A45] flex items-center justify-center text-[#4B5975] hover:text-white transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    {/* Stats content */}
                                    <div className="flex-1 overflow-y-auto overscroll-contain pb-[max(24px,env(safe-area-inset-bottom))]">
                                        <MatchHeader
                                            match={{ id: match.id, status: match.status || '' }}
                                            details={{
                                                ...details,
                                                headToHead: `${details.player1.name} vs ${details.player2.name}`,
                                                headToHeadData: null,
                                            }}
                                            player1Id={match.player_a_id}
                                            player2Id={match.player_b_id}
                                            defaultExpanded={true}
                                        />
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
