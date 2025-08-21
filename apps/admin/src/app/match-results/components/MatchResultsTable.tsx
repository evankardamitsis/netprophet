'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from 'lucide-react';
import { MatchResultWithDetails } from '@/types';
import { Match } from '../types';

interface MatchResultsTableProps {
    groupedMatches: [string, Match[]][];
    matchResults: MatchResultWithDetails[];
    onAddResult: (match: Match) => void;
    onEditResult: (result: MatchResultWithDetails) => void;
}

export function MatchResultsTable({
    groupedMatches,
    matchResults,
    onAddResult,
    onEditResult
}: MatchResultsTableProps) {
    const hasResult = (matchId: string) => {
        return matchResults.some(result => result.match_id === matchId);
    };

    const getResult = (matchId: string) => {
        return matchResults.find(result => result.match_id === matchId);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'finished': return 'bg-green-100 text-green-800';
            case 'live': return 'bg-red-100 text-red-800';
            case 'upcoming': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getDetailedScore = (result: MatchResultWithDetails) => {
        const scores = [];

        // Helper function to format score with winner first
        const formatScore = (score: string, winnerId: string | null) => {
            if (!score) return null;

            const [score1, score2] = score.split('-').map(Number);
            const isWinnerFirst = winnerId === result.winner_id;

            if (isWinnerFirst) {
                return `${score1}-${score2}`;
            } else {
                return `${score2}-${score1}`;
            }
        };

        // Helper function to format tiebreak score in tennis notation
        const formatTiebreakScore = (score: string, winnerId: string | null) => {
            if (!score) return null;

            const [score1, score2] = score.split('-').map(Number);
            const isWinnerFirst = winnerId === result.winner_id;

            // In tennis, tiebreak is shown as 7-6(2) where (2) is the loser's points
            if (isWinnerFirst) {
                return `7-6(${score2})`;
            } else {
                return `6-7(${score1})`;
            }
        };

        // Add set scores (only if no tiebreak for that set)
        if (result.set1_score) {
            if (result.set1_tiebreak_score && result.set1_tiebreak_score !== 'none') {
                // If there's a tiebreak, show tiebreak notation instead of set score
                const tiebreakScore = formatTiebreakScore(result.set1_tiebreak_score, result.set1_winner_id);
                if (tiebreakScore) scores.push(tiebreakScore);
            } else {
                // No tiebreak, show regular set score
                const formattedScore = formatScore(result.set1_score, result.set1_winner_id);
                if (formattedScore) scores.push(formattedScore);
            }
        }
        if (result.set2_score) {
            if (result.set2_tiebreak_score && result.set2_tiebreak_score !== 'none') {
                const tiebreakScore = formatTiebreakScore(result.set2_tiebreak_score, result.set2_winner_id);
                if (tiebreakScore) scores.push(tiebreakScore);
            } else {
                const formattedScore = formatScore(result.set2_score, result.set2_winner_id);
                if (formattedScore) scores.push(formattedScore);
            }
        }
        if (result.set3_score) {
            // For amateur format, if there's a super tiebreak, don't show the regular set3 score
            // as the third set in amateur format should only show the super tiebreak
            if (result.super_tiebreak_score && result.super_tiebreak_score !== 'none') {
                // Skip showing set3_score for amateur format with super tiebreak
                // The super tiebreak will be shown separately at the end
            } else if (result.set3_tiebreak_score && result.set3_tiebreak_score !== 'none') {
                const tiebreakScore = formatTiebreakScore(result.set3_tiebreak_score, result.set3_winner_id);
                if (tiebreakScore) scores.push(tiebreakScore);
            } else {
                const formattedScore = formatScore(result.set3_score, result.set3_winner_id);
                if (formattedScore) scores.push(formattedScore);
            }
        }
        if (result.set4_score) {
            if (result.set4_tiebreak_score && result.set4_tiebreak_score !== 'none') {
                const tiebreakScore = formatTiebreakScore(result.set4_tiebreak_score, result.set4_winner_id);
                if (tiebreakScore) scores.push(tiebreakScore);
            } else {
                const formattedScore = formatScore(result.set4_score, result.set4_winner_id);
                if (formattedScore) scores.push(formattedScore);
            }
        }
        if (result.set5_score) {
            if (result.set5_tiebreak_score && result.set5_tiebreak_score !== 'none') {
                const tiebreakScore = formatTiebreakScore(result.set5_tiebreak_score, result.set5_winner_id);
                if (tiebreakScore) scores.push(tiebreakScore);
            } else {
                const formattedScore = formatScore(result.set5_score, result.set5_winner_id);
                if (formattedScore) scores.push(formattedScore);
            }
        }

        // Add super tiebreak if it exists
        if (result.super_tiebreak_score && result.super_tiebreak_score !== 'none') {
            // Super tiebreak is already in the correct format (e.g., 10-8)
            // Just add it as-is since it's a special scoring system
            scores.push(result.super_tiebreak_score);
        }

        return scores.join(' ');
    };

    if (groupedMatches.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
                    <p className="text-gray-600 mb-4">
                        No matches match your current filters. Try adjusting your search criteria.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {groupedMatches.map(([date, dateMatches]) => (
                <Card key={date}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            {date === 'No Date' ? 'No Date Set' : new Date(date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                            <Badge variant="secondary">{dateMatches.length} match{dateMatches.length !== 1 ? 'es' : ''}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Players</TableHead>
                                    <TableHead>Tournament</TableHead>
                                    <TableHead>Format</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Results</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dateMatches.map((match) => {
                                    const result = getResult(match.id);
                                    const hasExistingResult = hasResult(match.id);

                                    return (
                                        <TableRow key={match.id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {match.player_a.first_name} {match.player_a.last_name}
                                                </div>
                                                <div className="text-sm text-muted-foreground">vs</div>
                                                <div className="font-medium">
                                                    {match.player_b.first_name} {match.player_b.last_name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{match.tournaments?.name || 'N/A'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {match.tournaments?.matches_type || 'N/A'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`text-xs ${getStatusColor(match.status)}`}>
                                                    {match.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {hasExistingResult ? (
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-medium">
                                                            Winner: {result?.winner?.first_name} {result?.winner?.last_name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {result?.match_result}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {result && getDetailedScore(result)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">No results</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    {hasExistingResult ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => onEditResult(result!)}
                                                        >
                                                            Edit
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => onAddResult(match)}
                                                            disabled={match.status !== 'finished'}
                                                            title={match.status !== 'finished' ? `Match status is "${match.status}" - change to "finished" to add results` : 'Add match results'}
                                                        >
                                                            Add Results
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
