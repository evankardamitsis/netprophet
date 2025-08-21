'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Match, FormData } from '../types';

interface MatchResultFormProps {
    formData: FormData;
    setFormData: (data: FormData) => void;
    match: Match | null;
    onSubmit: () => void;
    submitLabel: string;
}

export function MatchResultForm({ formData, setFormData, match, onSubmit, submitLabel }: MatchResultFormProps) {
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

    const getSetScoreOptions = () => {
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
    };

    return (
        <div className="space-y-6">
            {/* Match Winner */}
            <div className="space-y-2">
                <Label>Match Winner *</Label>
                <Select value={formData.winner_id} onValueChange={handleMatchWinnerChange}>
                    <SelectTrigger>
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

            {/* Match Result */}
            <div className="space-y-2">
                <Label>Match Result *</Label>
                <Select value={formData.match_result} onValueChange={handleMatchResultChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select match result" />
                    </SelectTrigger>
                    <SelectContent>
                        {isBestOf5 ? (
                            <>
                                <SelectItem value="3-0">3-0 (Straight sets)</SelectItem>
                                <SelectItem value="3-1">3-1 (Four sets)</SelectItem>
                                <SelectItem value="3-2">3-2 (Five sets)</SelectItem>
                                <SelectItem value="0-3">0-3 (Straight sets)</SelectItem>
                                <SelectItem value="1-3">1-3 (Four sets)</SelectItem>
                                <SelectItem value="2-3">2-3 (Five sets)</SelectItem>
                            </>
                        ) : isAmateurFormat ? (
                            <>
                                <SelectItem value="2-0">2-0 (Straight sets)</SelectItem>
                                <SelectItem value="2-1">2-1 (Three sets)</SelectItem>
                                <SelectItem value="0-2">0-2 (Straight sets)</SelectItem>
                                <SelectItem value="1-2">1-2 (Three sets)</SelectItem>
                            </>
                        ) : (
                            <>
                                <SelectItem value="2-0">2-0 (Straight sets)</SelectItem>
                                <SelectItem value="2-1">2-1 (Three sets)</SelectItem>
                                <SelectItem value="0-2">0-2 (Straight sets)</SelectItem>
                                <SelectItem value="1-2">1-2 (Three sets)</SelectItem>
                            </>
                        )}
                    </SelectContent>
                </Select>
            </div>

            {/* Set Scores */}
            <div className="space-y-4">
                <Label>Set Scores</Label>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((setNum) => {
                        if (isAmateurFormat && setNum === 3) return null;
                        if (!isBestOf5 && setNum > 3) return null;

                        return (
                            <div key={setNum} className="border rounded-lg p-4 space-y-3">
                                <Label className="text-sm font-medium">Set {setNum}</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Score</Label>
                                        <Select
                                            value={formData[`set${setNum}_score`]}
                                            onValueChange={(value) => setFormData({ ...formData, [`set${setNum}_score`]: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select score" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getSetScoreOptions().map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Winner</Label>
                                        <Select
                                            value={formData[`set${setNum}_winner_id`]}
                                            onValueChange={(value) => setFormData({ ...formData, [`set${setNum}_winner_id`]: value })}
                                        >
                                            <SelectTrigger>
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
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tiebreak Scores */}
            <div className="space-y-4">
                <Label>Tiebreak Scores</Label>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((setNum) => {
                        if (isAmateurFormat && setNum === 3) return null;
                        if (!isBestOf5 && setNum > 3) return null;

                        return (
                            <div key={setNum} className="border rounded-lg p-4 space-y-3">
                                <Label className="text-sm font-medium">Set {setNum} Tiebreak</Label>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Tiebreak Score</Label>
                                    <Select
                                        value={formData[`set${setNum}_tiebreak_score`]}
                                        onValueChange={(value) => setFormData({ ...formData, [`set${setNum}_tiebreak_score`]: value })}
                                    >
                                        <SelectTrigger>
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

            {/* Super Tiebreak (for amateur format) */}
            {isAmateurFormat && (
                <div className="space-y-4">
                    <Label>Super Tiebreak</Label>
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Super Tiebreak Score</Label>
                        <Select
                            value={formData.super_tiebreak_score}
                            onValueChange={(value) => setFormData({ ...formData, super_tiebreak_score: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select super tiebreak score" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No super tiebreak</SelectItem>
                                <SelectItem value="10-0">10-0</SelectItem>
                                <SelectItem value="10-1">10-1</SelectItem>
                                <SelectItem value="10-2">10-2</SelectItem>
                                <SelectItem value="10-3">10-3</SelectItem>
                                <SelectItem value="10-4">10-4</SelectItem>
                                <SelectItem value="10-5">10-5</SelectItem>
                                <SelectItem value="10-6">10-6</SelectItem>
                                <SelectItem value="10-7">10-7</SelectItem>
                                <SelectItem value="10-8">10-8</SelectItem>
                                <SelectItem value="10-9">10-9</SelectItem>
                                <SelectItem value="0-10">0-10</SelectItem>
                                <SelectItem value="1-10">1-10</SelectItem>
                                <SelectItem value="2-10">2-10</SelectItem>
                                <SelectItem value="3-10">3-10</SelectItem>
                                <SelectItem value="4-10">4-10</SelectItem>
                                <SelectItem value="5-10">5-10</SelectItem>
                                <SelectItem value="6-10">6-10</SelectItem>
                                <SelectItem value="7-10">7-10</SelectItem>
                                <SelectItem value="8-10">8-10</SelectItem>
                                <SelectItem value="9-10">9-10</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="text-xs text-muted-foreground">
                            Winner: {formData.winner_id === match.player_a.id ?
                                `${match.player_a.first_name} ${match.player_a.last_name}` :
                                `${match.player_b.first_name} ${match.player_b.last_name}`}
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                    Cancel
                </Button>
                <Button onClick={onSubmit}>
                    {submitLabel}
                </Button>
            </div>
        </div>
    );
}
