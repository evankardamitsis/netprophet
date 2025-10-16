'use client';

import { Label } from '@/components/ui/label';
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

    const isAmateurFormat = match.tournaments?.matches_type === 'best-of-3-super-tiebreak';
    const isBestOf5 = match.tournaments?.matches_type === 'best-of-5';

    // Smart form logic functions
    const handleMatchWinnerChange = (winnerId: string) => {
        const newFormData = { ...formData, winner_id: winnerId };

        // Auto-populate set winners based on match result
        if (formData.match_result) {
            const updatedData = autoPopulateSetWinners(newFormData, winnerId, formData.match_result);
            // Auto-set super tiebreak winner to match winner
            updatedData.super_tiebreak_winner_id = winnerId;
            setFormData(updatedData);
        } else {
            // Auto-set super tiebreak winner to match winner
            newFormData.super_tiebreak_winner_id = winnerId;
            setFormData(newFormData);
        }
    };

    const handleMatchResultChange = (matchResult: string) => {
        const newFormData = { ...formData, match_result: matchResult };

        // Auto-populate set winners based on match winner
        if (formData.winner_id) {
            const updatedData = autoPopulateSetWinners(newFormData, formData.winner_id, matchResult);
            const finalData = autoPopulateSetScores(updatedData, matchResult);
            setFormData(finalData);
        } else {
            const finalData = autoPopulateSetScores(newFormData, matchResult);
            setFormData(finalData);
        }
    };

    const autoPopulateSetWinners = (data: any, winnerId: string, matchResult: string) => {
        const [winnerSets, loserSets] = matchResult.split('-').map(Number);
        const loserId = winnerId === match.player_a.id ? match.player_b.id : match.player_a.id;

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

    const autoPopulateSetScores = (data: any, matchResult: string) => {
        const [winnerSets, loserSets] = matchResult.split('-').map(Number);
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

            if (data[`set${i}_winner_id`] === data.winner_id) {
                data[`set${i}_score`] = '6-4';
            } else {
                data[`set${i}_score`] = '4-6';
            }
        }

        return data;
    };

    const getSetScoreOptions = (setWinnerId: string) => {
        if (!setWinnerId) {
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

        const isPlayerAWinner = setWinnerId === match.player_a.id;

        if (isPlayerAWinner) {
            // Player A wins - show scores where first number > second number
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
            // Player B wins - show scores where second number > first number
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
        if (!formData.winner_id) return [];

        const isPlayerAWinner = formData.winner_id === match.player_a.id;

        if (isBestOf5) {
            return isPlayerAWinner ? [
                { value: '3-0', label: '3-0 (Straight sets)' },
                { value: '3-1', label: '3-1 (Four sets)' },
                { value: '3-2', label: '3-2 (Five sets)' }
            ] : [
                { value: '0-3', label: '0-3 (Straight sets)' },
                { value: '1-3', label: '1-3 (Four sets)' },
                { value: '2-3', label: '2-3 (Five sets)' }
            ];
        } else {
            return isPlayerAWinner ? [
                { value: '2-0', label: '2-0 (Straight sets)' },
                { value: '2-1', label: isAmateurFormat ? '2-1 (Super tiebreak)' : '2-1 (Three sets)' }
            ] : [
                { value: '0-2', label: '0-2 (Straight sets)' },
                { value: '1-2', label: isAmateurFormat ? '1-2 (Super tiebreak)' : '1-2 (Three sets)' }
            ];
        }
    };

    const getSetsToShow = () => {
        if (!formData.match_result) return 0;

        if (isAmateurFormat && ['2-1', '1-2'].includes(formData.match_result)) {
            return 2; // Only 2 sets for amateur format with super tiebreak
        }

        const [sets1, sets2] = formData.match_result.split('-').map(Number);
        return sets1 + sets2;
    };


    const shouldShowTiebreaks = () => {
        return [formData.set1_score, formData.set2_score, formData.set3_score, formData.set4_score, formData.set5_score]
            .some(score => score === '7-6' || score === '6-7');
    };

    const shouldShowSuperTiebreak = () => {
        return isAmateurFormat && ['2-1', '1-2'].includes(formData.match_result);
    };

    const getSuperTiebreakScoreOptions = () => {
        if (!formData.winner_id) {
            return [
                { value: '10-0', label: '10-0' },
                { value: '10-1', label: '10-1' },
                { value: '10-2', label: '10-2' },
                { value: '10-3', label: '10-3' },
                { value: '10-4', label: '10-4' },
                { value: '10-5', label: '10-5' },
                { value: '10-6', label: '10-6' },
                { value: '10-7', label: '10-7' },
                { value: '10-8', label: '10-8' },
                { value: '10-9', label: '10-9' },
                { value: '0-10', label: '0-10' },
                { value: '1-10', label: '1-10' },
                { value: '2-10', label: '2-10' },
                { value: '3-10', label: '3-10' },
                { value: '4-10', label: '4-10' },
                { value: '5-10', label: '5-10' },
                { value: '6-10', label: '6-10' },
                { value: '7-10', label: '7-10' },
                { value: '8-10', label: '8-10' },
                { value: '9-10', label: '9-10' }
            ];
        }

        const isPlayerAWinner = formData.winner_id === match.player_a.id;

        if (isPlayerAWinner) {
            // Player A wins - show scores where first number > second number
            return [
                { value: '10-0', label: '10-0' },
                { value: '10-1', label: '10-1' },
                { value: '10-2', label: '10-2' },
                { value: '10-3', label: '10-3' },
                { value: '10-4', label: '10-4' },
                { value: '10-5', label: '10-5' },
                { value: '10-6', label: '10-6' },
                { value: '10-7', label: '10-7' },
                { value: '10-8', label: '10-8' },
                { value: '10-9', label: '10-9' }
            ];
        } else {
            // Player B wins - show scores where second number > first number
            return [
                { value: '0-10', label: '0-10' },
                { value: '1-10', label: '1-10' },
                { value: '2-10', label: '2-10' },
                { value: '3-10', label: '3-10' },
                { value: '4-10', label: '4-10' },
                { value: '5-10', label: '5-10' },
                { value: '6-10', label: '6-10' },
                { value: '7-10', label: '7-10' },
                { value: '8-10', label: '8-10' },
                { value: '9-10', label: '9-10' }
            ];
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Match Winner */}
            <div className="p-4 border rounded-lg">
                <div className="mb-3">
                    <h3 className="text-lg font-bold text-gray-900">🏆 Match Winner</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleMatchWinnerChange(formData.winner_id === match.player_a.id ? '' : match.player_a.id)}
                        className={`p-3 border rounded-lg transition-colors ${formData.winner_id === match.player_a.id
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <div className="text-sm font-semibold">
                            {match.player_a.first_name} {match.player_a.last_name}
                        </div>
                    </button>
                    <button
                        onClick={() => handleMatchWinnerChange(formData.winner_id === match.player_b.id ? '' : match.player_b.id)}
                        className={`p-3 border rounded-lg transition-colors ${formData.winner_id === match.player_b.id
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <div className="text-sm font-semibold">
                            {match.player_b.first_name} {match.player_b.last_name}
                        </div>
                    </button>
                </div>
            </div>

            {/* Match Result - Only show if winner is selected */}
            {formData.winner_id && (
                <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-900">Match Result</h3>
                        <span className="text-xs text-gray-400">
                            {isBestOf5 ? 'Best of 5' : isAmateurFormat ? 'Best of 3 (Super TB)' : 'Best of 3'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                        How will {formData.winner_id === match.player_a.id ? match.player_a.first_name : match.player_b.first_name} win the match?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {getMatchResultOptions().map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleMatchResultChange(formData.match_result === option.value ? '' : option.value)}
                                className={`p-3 border rounded-lg transition-colors ${formData.match_result === option.value
                                    ? 'bg-purple-600 border-purple-600 text-white'
                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="text-base font-semibold">{option.value}</div>
                                <div className="text-xs text-gray-400">{option.label.split('(')[1]?.replace(')', '')}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Set Details - Show for all match results */}
            {formData.match_result && (
                <div className="p-4 border rounded-lg">
                    <div className="mb-3">
                        <h3 className="text-lg font-bold text-gray-900">Set Details</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                        {['3-0', '0-3', '2-0', '0-2'].includes(formData.match_result)
                            ? 'Predict the exact score for each set.'
                            : 'Who wins each set and predict the exact scores.'
                        }
                    </p>
                    <div className="space-y-3">
                        {Array.from({ length: getSetsToShow() }, (_, i) => {
                            const setNum = i + 1;
                            const setWinner = formData[`set${setNum}_winner_id`];
                            const winnerName = setWinner === match.player_a.id
                                ? `${match.player_a.first_name} ${match.player_a.last_name}`
                                : `${match.player_b.first_name} ${match.player_b.last_name}`;

                            return (
                                <div key={setNum} className="border rounded-lg p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-gray-900 text-sm">Set {setNum}</h4>
                                        {setWinner && (
                                            <span className="text-xs text-gray-400">
                                                {winnerName} wins
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-gray-400">Winner</Label>
                                            <Select
                                                value={formData[`set${setNum}_winner_id`]}
                                                onValueChange={(value) => {
                                                    // Clear the score when winner changes
                                                    const newFormData = { ...formData, [`set${setNum}_winner_id`]: value, [`set${setNum}_score`]: '' };
                                                    setFormData(newFormData);
                                                }}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Select winner" />
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
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-gray-400">Score</Label>
                                            <Select
                                                value={formData[`set${setNum}_score`]}
                                                onValueChange={(value) => setFormData({ ...formData, [`set${setNum}_score`]: value })}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Select score" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {getSetScoreOptions(formData[`set${setNum}_winner_id`]).map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                <div className="p-4 border rounded-lg">
                    <div className="mb-3">
                        <h3 className="text-lg font-bold text-gray-900">Tiebreak Scores</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                        You&apos;ve selected tiebreak scores for some sets. Here you can predict the detailed tiebreak scores within those sets.
                    </p>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((setNum) => {
                            const setScore = formData[`set${setNum}_score`];
                            if (setScore !== '7-6' && setScore !== '6-7') return null;

                            return (
                                <div key={setNum} className="border rounded-lg p-3 space-y-3">
                                    <h4 className="font-semibold text-gray-900 text-sm">Set {setNum} Tiebreak</h4>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-400">Tiebreak Score</Label>
                                        <Select
                                            value={formData[`set${setNum}_tiebreak_score`]}
                                            onValueChange={(value) => setFormData({ ...formData, [`set${setNum}_tiebreak_score`]: value })}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select tiebreak score" />
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
                <div className="p-4 border rounded-lg">
                    <div className="mb-3">
                        <h3 className="text-lg font-bold text-gray-900">Super Tiebreak</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                        Since this is a {formData.match_result} match in amateur format, there will be a 10-point super tiebreak instead of a 3rd set.
                    </p>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label className="text-xs text-gray-400">Super Tiebreak Score</Label>
                            <Select
                                value={formData.super_tiebreak_score}
                                onValueChange={(value) => setFormData({ ...formData, super_tiebreak_score: value })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select super tiebreak score" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No super tiebreak</SelectItem>
                                    {getSuperTiebreakScoreOptions().map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-xs text-gray-400">
                            Winner: {formData.winner_id === match.player_a.id ?
                                `${match.player_a.first_name} ${match.player_a.last_name}` :
                                `${match.player_b.first_name} ${match.player_b.last_name}`}
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
                <Button type="button" variant="outline" onClick={() => window.history.back()} className="w-full sm:w-auto">
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
                    className="w-full sm:w-auto"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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