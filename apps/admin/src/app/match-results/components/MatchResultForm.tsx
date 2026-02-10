'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Match, FormData } from '../types';
import { Loader2 } from 'lucide-react';

interface MatchResultFormProps {
    formData: FormData;
    setFormData: (data: FormData) => void;
    match: Match | null;
    onSubmit: () => void;
    submitLabel: string;
    isLoading?: boolean;
}

export function MatchResultForm({ formData, setFormData, match, onSubmit, submitLabel, isLoading = false }: MatchResultFormProps) {
    if (!match) return null;

    const isDoubles = match.match_type === 'doubles';
    const isAmateurFormat = match.tournaments?.matches_type === 'best-of-3-super-tiebreak';
    const isBestOf5 = match.tournaments?.matches_type === 'best-of-5';

    // Parse match result (e.g. "2-1", "2-0 ret") -> [winnerSets, loserSets]
    const parseMatchResult = (matchResult: string): [number, number] | null => {
        if (!matchResult?.trim()) return null;
        const normalized = matchResult.trim().replace(/\s+ret\s*$/i, '');
        const parts = normalized.split('-').map(Number);
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
        return [parts[0], parts[1]];
    };

    const isRetirement = (matchResult: string) => /ret\s*$/i.test(matchResult?.trim() ?? '');

    // Smart form logic functions
    const handleMatchWinnerChange = (winnerId: string, winnerTeam?: string) => {
        const newFormData: any = { ...formData };

        if (isDoubles && winnerTeam) {
            newFormData.match_winner_team = winnerTeam;
            // For doubles, we don't use winner_id, but keep it for compatibility
            newFormData.winner_id = '';
        } else {
            newFormData.winner_id = winnerId;
            newFormData.match_winner_team = '';
        }

        // Auto-populate set winners based on match result
        if (formData.match_result) {
            const updatedData = isDoubles
                ? autoPopulateSetWinnersDoubles(newFormData, winnerTeam || '', formData.match_result)
                : autoPopulateSetWinners(newFormData, winnerId, formData.match_result);
            // Auto-set super tiebreak winner
            if (isDoubles && winnerTeam) {
                updatedData.super_tiebreak_winner_team = winnerTeam;
            } else {
                updatedData.super_tiebreak_winner_id = winnerId;
            }
            setFormData(updatedData);
        } else {
            // Auto-set super tiebreak winner
            if (isDoubles && winnerTeam) {
                newFormData.super_tiebreak_winner_team = winnerTeam;
            } else {
                newFormData.super_tiebreak_winner_id = winnerId;
            }
            setFormData(newFormData);
        }
    };

    const handleMatchResultChange = (matchResult: string) => {
        const newFormData: any = { ...formData, match_result: matchResult };

        // Auto-populate set winners based on match winner
        if (isDoubles && formData.match_winner_team) {
            const updatedData = autoPopulateSetWinnersDoubles(newFormData, formData.match_winner_team, matchResult);
            const finalData = autoPopulateSetScores(updatedData, matchResult);
            setFormData(finalData);
        } else if (!isDoubles && formData.winner_id) {
            const updatedData = autoPopulateSetWinners(newFormData, formData.winner_id, matchResult);
            const finalData = autoPopulateSetScores(updatedData, matchResult);
            setFormData(finalData);
        } else {
            const finalData = autoPopulateSetScores(newFormData, matchResult);
            setFormData(finalData);
        }
    };

    const autoPopulateSetWinners = (data: any, winnerId: string, matchResult: string) => {
        const parsed = parseMatchResult(matchResult);
        if (!parsed) return data;
        const [winnerSets, loserSets] = parsed;

        // Only auto-populate for straight sets results (2-0, 0-2, 3-0, 0-3)
        const isStraightSets = loserSets === 0;

        if (isStraightSets) {
            // For straight sets, winner won all sets
            for (let i = 1; i <= winnerSets; i++) {
                data[`set${i}_winner_id`] = winnerId;
            }
        } else {
            // For non-straight sets, don't auto-populate - let user choose
            // Clear any existing set winners
            for (let i = 1; i <= winnerSets + loserSets; i++) {
                data[`set${i}_winner_id`] = '';
            }
        }

        return data;
    };

    const autoPopulateSetWinnersDoubles = (data: any, winnerTeam: string, matchResult: string) => {
        const parsed = parseMatchResult(matchResult);
        if (!parsed) return data;
        const [winnerSets, loserSets] = parsed;

        // Only auto-populate for straight sets results (2-0, 0-2, 3-0, 0-3)
        const isStraightSets = loserSets === 0;

        if (isStraightSets) {
            // For straight sets, winner team won all sets
            for (let i = 1; i <= winnerSets; i++) {
                data[`set${i}_winner_team`] = winnerTeam;
            }
        } else {
            // For non-straight sets, don't auto-populate - let user choose
            // Clear any existing set winners
            for (let i = 1; i <= winnerSets + loserSets; i++) {
                data[`set${i}_winner_team`] = '';
            }
        }

        return data;
    };

    const autoPopulateSetScores = (data: any, matchResult: string) => {
        // Retirement: do not auto-fill set scores; user enters manually (e.g. 4-2 for incomplete set)
        if (isRetirement(matchResult)) {
            for (let i = 1; i <= 5; i++) {
                data[`set${i}_score`] = '';
            }
            return data;
        }

        const parsed = parseMatchResult(matchResult);
        if (!parsed) return data;
        const [winnerSets, loserSets] = parsed;
        const totalSets = winnerSets + loserSets;

        // Set default scores for each set (winner gets 6-4, loser gets 4-6)
        for (let i = 1; i <= totalSets; i++) {
            // For amateur format, don't set a regular score for the third set
            // as it should only have a super tiebreak
            if (isAmateurFormat && i === 3) {
                // Clear any existing set score for the third set in amateur format
                data[`set${i}_score`] = '';
                continue;
            }

            if (isDoubles) {
                const setWinnerTeam = data[`set${i}_winner_team`];
                if (setWinnerTeam === data.match_winner_team) {
                    data[`set${i}_score`] = '6-4';
                } else {
                    data[`set${i}_score`] = '4-6';
                }
            } else {
                if (data[`set${i}_winner_id`] === data.winner_id) {
                    data[`set${i}_score`] = '6-4';
                } else {
                    data[`set${i}_score`] = '4-6';
                }
            }
        }

        return data;
    };

    const getSetScoreOptions = (setWinnerId?: string, setWinnerTeam?: string) => {
        if (!setWinnerId && !setWinnerTeam) {
            return [
                { value: '6-0', label: '6-0' },
                { value: '6-1', label: '6-1' },
                { value: '6-2', label: '6-2' },
                { value: '6-3', label: '6-3' },
                { value: '6-4', label: '6-4' },
                { value: '7-5', label: '7-5' },
                { value: '7-6', label: '7-6' },
                { value: '0-6', label: '0-6' },
                { value: '1-6', label: '1-6' },
                { value: '2-6', label: '2-6' },
                { value: '3-6', label: '3-6' },
                { value: '4-6', label: '4-6' },
                { value: '5-7', label: '5-7' },
                { value: '6-7', label: '6-7' }
            ];
        }

        const isTeamAWinner = isDoubles
            ? setWinnerTeam === 'team_a'
            : setWinnerId === match.player_a.id;

        if (isTeamAWinner) {
            // Team A wins - show scores where first number > second number
            return [
                { value: '6-0', label: '6-0' },
                { value: '6-1', label: '6-1' },
                { value: '6-2', label: '6-2' },
                { value: '6-3', label: '6-3' },
                { value: '6-4', label: '6-4' },
                { value: '7-5', label: '7-5' },
                { value: '7-6', label: '7-6' }
            ];
        } else {
            // Team B wins - show scores where second number > first number
            return [
                { value: '0-6', label: '0-6' },
                { value: '1-6', label: '1-6' },
                { value: '2-6', label: '2-6' },
                { value: '3-6', label: '3-6' },
                { value: '4-6', label: '4-6' },
                { value: '5-7', label: '5-7' },
                { value: '6-7', label: '6-7' }
            ];
        }
    };

    const getMatchResultOptions = () => {
        if (isDoubles && !formData.match_winner_team) return [];
        if (!isDoubles && !formData.winner_id) return [];

        const isTeamAWinner = isDoubles
            ? formData.match_winner_team === 'team_a'
            : formData.winner_id === match.player_a.id;

        if (isBestOf5) {
            const base = isTeamAWinner
                ? [
                    { value: '3-0', label: '3-0 (Straight sets)' },
                    { value: '3-1', label: '3-1 (Four sets)' },
                    { value: '3-2', label: '3-2 (Five sets)' }
                ]
                : [
                    { value: '0-3', label: '0-3 (Straight sets)' },
                    { value: '1-3', label: '1-3 (Four sets)' },
                    { value: '2-3', label: '2-3 (Five sets)' }
                ];
            const ret = base.map(({ value, label }) => ({
                value: `${value} ret`,
                label: `${value} (Retirement)`
            }));
            return [...base, ...ret];
        } else {
            const base = isTeamAWinner
                ? [
                    { value: '2-0', label: '2-0 (Straight sets)' },
                    { value: '2-1', label: isAmateurFormat ? '2-1 (Super tiebreak)' : '2-1 (Three sets)' }
                ]
                : [
                    { value: '0-2', label: '0-2 (Straight sets)' },
                    { value: '1-2', label: isAmateurFormat ? '1-2 (Super tiebreak)' : '1-2 (Three sets)' }
                ];
            const ret = base.map(({ value }) => ({
                value: `${value} ret`,
                label: `${value} (Retirement)`
            }));
            return [...base, ...ret];
        }
    };

    const getSetsToShow = () => {
        const parsed = parseMatchResult(formData.match_result);
        if (!parsed) return 0;
        const [sets1, sets2] = parsed;
        const total = sets1 + sets2;

        if (isAmateurFormat && total === 3) {
            return 2; // Only 2 sets for amateur format with super tiebreak
        }
        return total;
    };


    const shouldShowTiebreaks = () => {
        return [formData.set1_score, formData.set2_score, formData.set3_score, formData.set4_score, formData.set5_score]
            .some(score => score === '7-6' || score === '6-7');
    };

    const shouldShowSuperTiebreak = () => {
        const parsed = parseMatchResult(formData.match_result);
        if (!parsed || !isAmateurFormat) return false;
        const [a, b] = parsed;
        return a + b === 3; // 2-1 or 1-2 (with or without ret)
    };

    const validateSuperTiebreakScore = (score: string): boolean => {
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

        return true;
    };

    return (
        <div className="space-y-4 sm:space-y-6 overflow-hidden">
            {/* Mobile-Optimized Match Winner Selection */}
            <div className="p-3 sm:p-4 md:p-6 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-2">
                            <span className="text-white text-lg">🏆</span>
                        </div>
                        Match Winner {isDoubles && '(Team)'}
                    </h3>
                </div>
                {isDoubles ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleMatchWinnerChange('', formData.match_winner_team === 'team_a' ? '' : 'team_a')}
                            className={`p-3 sm:p-4 border-2 rounded-xl transition-all duration-200 ${formData.match_winner_team === 'team_a'
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-purple-600 text-white shadow-lg transform scale-105'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                        >
                            <div className="text-base sm:text-lg font-bold text-center">
                                Team A
                            </div>
                            <div className="text-xs sm:text-sm text-center mt-1 opacity-80 break-words px-2">
                                {match.player_a1?.first_name} {match.player_a1?.last_name} & {match.player_a2?.first_name} {match.player_a2?.last_name}
                            </div>
                        </button>
                        <button
                            onClick={() => handleMatchWinnerChange('', formData.match_winner_team === 'team_b' ? '' : 'team_b')}
                            className={`p-3 sm:p-4 border-2 rounded-xl transition-all duration-200 ${formData.match_winner_team === 'team_b'
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-purple-600 text-white shadow-lg transform scale-105'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                        >
                            <div className="text-base sm:text-lg font-bold text-center">
                                Team B
                            </div>
                            <div className="text-xs sm:text-sm text-center mt-1 opacity-80 break-words px-2">
                                {match.player_b1?.first_name} {match.player_b1?.last_name} & {match.player_b2?.first_name} {match.player_b2?.last_name}
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleMatchWinnerChange(formData.winner_id === match.player_a.id ? '' : match.player_a.id)}
                            className={`p-4 border-2 rounded-xl transition-all duration-200 ${formData.winner_id === match.player_a.id
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-purple-600 text-white shadow-lg transform scale-105'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                        >
                            <div className="text-base sm:text-lg font-bold text-center">
                                {match.player_a.first_name} {match.player_a.last_name}
                            </div>
                        </button>
                        <button
                            onClick={() => handleMatchWinnerChange(formData.winner_id === match.player_b.id ? '' : match.player_b.id)}
                            className={`p-4 border-2 rounded-xl transition-all duration-200 ${formData.winner_id === match.player_b.id
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-purple-600 text-white shadow-lg transform scale-105'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                        >
                            <div className="text-base sm:text-lg font-bold text-center">
                                {match.player_b.first_name} {match.player_b.last_name}
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile-Optimized Match Result Selection */}
            {(isDoubles ? formData.match_winner_team : formData.winner_id) && (
                <div className="p-4 sm:p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
                    <div className="mb-4">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-2">
                                <span className="text-white text-lg">📊</span>
                            </div>
                            Match Result
                        </h3>
                        <div className="mt-2">
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                                {isBestOf5 ? 'Best of 5' : isAmateurFormat ? 'Best of 3 (Super TB)' : 'Best of 3'}
                            </span>
                        </div>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 mb-4">
                        How will <span className="font-semibold text-gray-900">
                            {isDoubles
                                ? (formData.match_winner_team === 'team_a' ? 'Team A' : 'Team B')
                                : (formData.winner_id === match.player_a.id ? match.player_a.first_name : match.player_b.first_name)
                            }
                        </span> win the match?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {getMatchResultOptions().map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleMatchResultChange(formData.match_result === option.value ? '' : option.value)}
                                className={`p-4 border-2 rounded-xl transition-all duration-200 ${formData.match_result === option.value
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-purple-600 text-white shadow-lg transform scale-105'
                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                    }`}
                            >
                                <div className="text-xl font-bold text-center mb-1">{option.value}</div>
                                <div className="text-xs text-center opacity-80">{option.label.split('(')[1]?.replace(')', '')}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Set Details - Show for all match results */}
            {formData.match_result && (
                <div className="p-3 sm:p-4 border rounded-lg overflow-hidden">
                    <div className="mb-2 sm:mb-3">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Set Details</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">
                        {isRetirement(formData.match_result)
                            ? 'Enter the score at the time of retirement for each set (e.g. 4-2 if the set was incomplete).'
                            : ['3-0', '0-3', '2-0', '0-2'].includes(formData.match_result.replace(/\s+ret\s*$/i, ''))
                                ? 'Predict the exact score for each set.'
                                : 'Who wins each set and predict the exact scores.'
                        }
                    </p>
                    <div className="space-y-2 sm:space-y-3">
                        {Array.from({ length: getSetsToShow() }, (_, i) => {
                            const setNum = i + 1;
                            const setWinnerId = formData[`set${setNum}_winner_id`];
                            const setWinnerTeam = formData[`set${setNum}_winner_team`];

                            let winnerName = '';
                            if (isDoubles) {
                                if (setWinnerTeam === 'team_a') {
                                    const teamANames = `${match.player_a1?.first_name || ''} ${match.player_a1?.last_name || ''} & ${match.player_a2?.first_name || ''} ${match.player_a2?.last_name || ''}`.trim();
                                    winnerName = teamANames ? `Team A (${teamANames})` : 'Team A';
                                } else if (setWinnerTeam === 'team_b') {
                                    const teamBNames = `${match.player_b1?.first_name || ''} ${match.player_b1?.last_name || ''} & ${match.player_b2?.first_name || ''} ${match.player_b2?.last_name || ''}`.trim();
                                    winnerName = teamBNames ? `Team B (${teamBNames})` : 'Team B';
                                }
                            } else {
                                winnerName = setWinnerId === match.player_a.id
                                    ? `${match.player_a.first_name} ${match.player_a.last_name}`
                                    : `${match.player_b.first_name} ${match.player_b.last_name}`;
                            }

                            return (
                                <div key={setNum} className="border rounded-lg p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 overflow-hidden">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                                        <h4 className="font-semibold text-gray-900 text-xs sm:text-sm">Set {setNum}</h4>
                                        {(setWinnerId || setWinnerTeam) && (
                                            <span className="text-xs text-gray-400 break-words sm:text-right sm:flex-shrink-0 sm:max-w-[50%]">
                                                {winnerName} wins
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                        <div className="space-y-1.5 sm:space-y-2 min-w-0">
                                            <Label className="text-xs text-gray-400">Winner</Label>
                                            {isDoubles ? (
                                                <Select
                                                    value={setWinnerTeam || ''}
                                                    onValueChange={(value) => {
                                                        // Clear the score when winner changes
                                                        const newFormData: any = { ...formData, [`set${setNum}_winner_team`]: value, [`set${setNum}_score`]: '' };
                                                        setFormData(newFormData);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm min-w-0 w-full">
                                                        <SelectValue placeholder="Select winner" className="truncate" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-w-[90vw] sm:max-w-md">
                                                        <SelectItem value="team_a" className="break-words">
                                                            <span className="block break-words">
                                                                Team A ({match.player_a1?.first_name} {match.player_a1?.last_name} & {match.player_a2?.first_name} {match.player_a2?.last_name})
                                                            </span>
                                                        </SelectItem>
                                                        <SelectItem value="team_b" className="break-words">
                                                            <span className="block break-words">
                                                                Team B ({match.player_b1?.first_name} {match.player_b1?.last_name} & {match.player_b2?.first_name} {match.player_b2?.last_name})
                                                            </span>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Select
                                                    value={setWinnerId}
                                                    onValueChange={(value) => {
                                                        // Clear the score when winner changes
                                                        const newFormData = { ...formData, [`set${setNum}_winner_id`]: value, [`set${setNum}_score`]: '' };
                                                        setFormData(newFormData);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm min-w-0 w-full">
                                                        <SelectValue placeholder="Select winner" className="truncate" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={match.player_a.id}>
                                                            {match.player_a.first_name} {match.player_a.last_name}
                                                        </SelectItem>
                                                        <SelectItem value={match.player_b.id}>
                                                            {match.player_b.first_name} {match.player_b.last_name}
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                        <div className="space-y-1.5 sm:space-y-2 min-w-0">
                                            <Label className="text-xs text-gray-400">Score</Label>
                                            {isRetirement(formData.match_result) ? (
                                                <Input
                                                    type="text"
                                                    value={formData[`set${setNum}_score`] || ''}
                                                    onChange={(e) => setFormData({ ...formData, [`set${setNum}_score`]: e.target.value.trim() })}
                                                    placeholder="e.g. 4-2, 6-4"
                                                    className="h-8 sm:h-9 text-xs sm:text-sm"
                                                />
                                            ) : (
                                                <Select
                                                    value={formData[`set${setNum}_score`]}
                                                    onValueChange={(value) => setFormData({ ...formData, [`set${setNum}_score`]: value })}
                                                >
                                                    <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm min-w-0 w-full">
                                                        <SelectValue placeholder="Select score" className="truncate" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {getSetScoreOptions(setWinnerId, setWinnerTeam).map((option) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tiebreak Scores - Show only when tiebreak scores are selected */}
            {shouldShowTiebreaks() && (
                <div className="p-3 sm:p-4 border rounded-lg overflow-hidden">
                    <div className="mb-2 sm:mb-3">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Tiebreak Scores</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">
                        You&apos;ve selected tiebreak scores for some sets. Here you can predict the detailed tiebreak scores within those sets.
                    </p>
                    <div className="space-y-2 sm:space-y-3">
                        {[1, 2, 3, 4, 5].map((setNum) => {
                            const setScore = formData[`set${setNum}_score`];
                            if (setScore !== '7-6' && setScore !== '6-7') return null;

                            return (
                                <div key={setNum} className="border rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3 overflow-hidden">
                                    <h4 className="font-semibold text-gray-900 text-xs sm:text-sm">Set {setNum} Tiebreak</h4>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <Label className="text-xs text-gray-400">Tiebreak Score</Label>
                                        <Select
                                            value={formData[`set${setNum}_tiebreak_score`]}
                                            onValueChange={(value) => setFormData({ ...formData, [`set${setNum}_tiebreak_score`]: value })}
                                        >
                                            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm min-w-0 w-full">
                                                <SelectValue placeholder="Select tiebreak score" className="truncate" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No tiebreak</SelectItem>
                                                <SelectItem value="7-0">7-0</SelectItem>
                                                <SelectItem value="7-1">7-1</SelectItem>
                                                <SelectItem value="7-2">7-2</SelectItem>
                                                <SelectItem value="7-3">7-3</SelectItem>
                                                <SelectItem value="7-4">7-4</SelectItem>
                                                <SelectItem value="7-5">7-5</SelectItem>
                                                <SelectItem value="7-6">7-6</SelectItem>
                                                <SelectItem value="0-7">0-7</SelectItem>
                                                <SelectItem value="1-7">1-7</SelectItem>
                                                <SelectItem value="2-7">2-7</SelectItem>
                                                <SelectItem value="3-7">3-7</SelectItem>
                                                <SelectItem value="4-7">4-7</SelectItem>
                                                <SelectItem value="5-7">5-7</SelectItem>
                                                <SelectItem value="6-7">6-7</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Super Tiebreak - Only for amateur format when 2-1/1-2 is selected */}
            {shouldShowSuperTiebreak() && (
                <div className="p-3 sm:p-4 border rounded-lg overflow-hidden">
                    <div className="mb-2 sm:mb-3">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Super Tiebreak</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">
                        Since this is a {formData.match_result} match in amateur format, there will be a 10-point super tiebreak instead of a 3rd set.
                    </p>
                    <div className="space-y-2 sm:space-y-3">
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs text-gray-400">
                                Super Tiebreak Score
                                <span className="block text-xs text-gray-500 mt-1">
                                    Format: 10-8, 17-15, etc. (Winner must win by 2 points, minimum 10 points to win)
                                </span>
                            </Label>
                            <Input
                                type="text"
                                value={formData.super_tiebreak_score || ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow any input while typing - validation happens on blur/error display
                                    setFormData({ ...formData, super_tiebreak_score: value });
                                }}
                                placeholder="e.g., 10-8, 17-15"
                                className="h-8 sm:h-9 text-xs sm:text-sm"
                            />
                            {formData.super_tiebreak_score && !validateSuperTiebreakScore(formData.super_tiebreak_score) && (
                                <p className="text-xs text-red-500 mt-1">
                                    Invalid score. Winner must have at least 10 points and win by 2 points (e.g., 10-8, 17-15).
                                </p>
                            )}
                        </div>
                        <div className="text-xs text-gray-400 break-words">
                            Winner: {isDoubles
                                ? (formData.match_winner_team === 'team_a'
                                    ? `Team A (${match.player_a1?.first_name || ''} ${match.player_a1?.last_name || ''} & ${match.player_a2?.first_name || ''} ${match.player_a2?.last_name || ''})`
                                    : `Team B (${match.player_b1?.first_name || ''} ${match.player_b1?.last_name || ''} & ${match.player_b2?.first_name || ''} ${match.player_b2?.last_name || ''})`)
                                : (formData.winner_id === match.player_a.id
                                    ? `${match.player_a.first_name} ${match.player_a.last_name}`
                                    : `${match.player_b.first_name} ${match.player_b.last_name}`)
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile-Optimized Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="w-full sm:w-auto h-12 text-base font-semibold border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => {
                        if (isLoading) return; // Prevent multiple clicks
                        console.log('Submit button clicked');
                        console.log('Form data:', formData);
                        console.log('Match:', match);
                        onSubmit();
                    }}
                    disabled={isLoading}
                    className="w-full sm:w-auto h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        submitLabel
                    )}
                </Button>
            </div>
        </div>
    );
}