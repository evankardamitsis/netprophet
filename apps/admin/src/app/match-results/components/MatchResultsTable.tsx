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

        // Helper function to format score as inputted (no reordering)
        const formatScore = (score: string) => {
            if (!score) return null;
            return score;
        };

        // Helper function to format tiebreak score as inputted
        const formatTiebreakScore = (score: string) => {
            if (!score) return null;
            return score;
        };

        // Add set scores (only if no tiebreak for that set)
        if (result.set1_score) {
            if (result.set1_tiebreak_score && result.set1_tiebreak_score !== 'none') {
                // If there's a tiebreak, show tiebreak notation instead of set score
                const tiebreakScore = formatTiebreakScore(result.set1_tiebreak_score);
                if (tiebreakScore) scores.push(tiebreakScore);
            } else {
                // No tiebreak, show regular set score
                const formattedScore = formatScore(result.set1_score);
                if (formattedScore) scores.push(formattedScore);
            }
        }
        if (result.set2_score) {
            if (result.set2_tiebreak_score && result.set2_tiebreak_score !== 'none') {
                const tiebreakScore = formatTiebreakScore(result.set2_tiebreak_score);
                if (tiebreakScore) scores.push(tiebreakScore);
            } else {
                const formattedScore = formatScore(result.set2_score);
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
                const tiebreakScore = formatTiebreakScore(result.set3_tiebreak_score);
                if (tiebreakScore) scores.push(tiebreakScore);
            } else {
                const formattedScore = formatScore(result.set3_score);
                if (formattedScore) scores.push(formattedScore);
            }
        }
        if (result.set4_score) {
            if (result.set4_tiebreak_score && result.set4_tiebreak_score !== 'none') {
                const tiebreakScore = formatTiebreakScore(result.set4_tiebreak_score);
                if (tiebreakScore) scores.push(tiebreakScore);
            } else {
                const formattedScore = formatScore(result.set4_score);
                if (formattedScore) scores.push(formattedScore);
            }
        }
        if (result.set5_score) {
            if (result.set5_tiebreak_score && result.set5_tiebreak_score !== 'none') {
                const tiebreakScore = formatTiebreakScore(result.set5_tiebreak_score);
                if (tiebreakScore) scores.push(tiebreakScore);
            } else {
                const formattedScore = formatScore(result.set5_score);
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
        <div className="space-y-4 sm:space-y-6">
            {groupedMatches.map(([date, dateMatches]) => (
                <Card key={date}>
                    <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-base sm:text-lg">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                                {date === 'No Date' ? 'No Date Set' : new Date(date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                            <Badge variant="secondary" className="w-fit">{dateMatches.length} match{dateMatches.length !== 1 ? 'es' : ''}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6">
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[200px]">Players</TableHead>
                                        <TableHead className="min-w-[150px]">Tournament</TableHead>
                                        <TableHead className="min-w-[100px]">Status</TableHead>
                                        <TableHead className="min-w-[150px]">Results</TableHead>
                                        <TableHead className="min-w-[120px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dateMatches.map((match) => {
                                        const result = getResult(match.id);
                                        const hasExistingResult = hasResult(match.id);

                                        return (
                                            <TableRow key={match.id}>
                                                <TableCell className="min-w-[200px]">
                                                    {match.match_type === 'doubles' ? (
                                                        <>
                                                            <div className="font-medium text-sm sm:text-base break-words">
                                                                {match.player_a1?.first_name || ''} {match.player_a1?.last_name || ''} & {match.player_a2?.first_name || ''} {match.player_a2?.last_name || ''}
                                                            </div>
                                                            <div className="text-xs sm:text-sm text-muted-foreground">vs</div>
                                                            <div className="font-medium text-sm sm:text-base break-words">
                                                                {match.player_b1?.first_name || ''} {match.player_b1?.last_name || ''} & {match.player_b2?.first_name || ''} {match.player_b2?.last_name || ''}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="font-medium text-sm sm:text-base break-words">
                                                                {match.player_a?.first_name || ''} {match.player_a?.last_name || ''}
                                                            </div>
                                                            <div className="text-xs sm:text-sm text-muted-foreground">vs</div>
                                                            <div className="font-medium text-sm sm:text-base break-words">
                                                                {match.player_b?.first_name || ''} {match.player_b?.last_name || ''}
                                                            </div>
                                                        </>
                                                    )}
                                                    {/* Show tournament on mobile */}
                                                    <div className="sm:hidden mt-2">
                                                        <div className="text-xs text-muted-foreground">Tournament:</div>
                                                        <div className="text-sm font-medium">{match.tournaments?.name || 'N/A'}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">
                                                    <div className="font-medium">{match.tournaments?.name || 'N/A'}</div>
                                                </TableCell>
                                                <TableCell className="min-w-[100px]">
                                                    <Badge className={`text-xs ${getStatusColor(match.status)}`}>
                                                        {match.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="min-w-[150px]">
                                                    {hasExistingResult ? (
                                                        <div className="space-y-1">
                                                            <div className="text-xs sm:text-sm font-medium">
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
                                                        <span className="text-xs sm:text-sm text-muted-foreground">No results</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="min-w-[120px]">
                                                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                                        {hasExistingResult ? (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => onEditResult(result!)}
                                                                    className="text-xs sm:text-sm"
                                                                >
                                                                    Edit
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => onAddResult(match)}
                                                                disabled={match.status !== 'finished'}
                                                                title={match.status !== 'finished' ? `Match status is "${match.status}" - change to "finished" to add results` : 'Add match results'}
                                                                className="text-xs sm:text-sm"
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
                        </div>

                        {/* Mobile-Optimized Card View */}
                        <div className="lg:hidden space-y-4 p-4">
                            {dateMatches.map((match) => {
                                const result = getResult(match.id);
                                const hasExistingResult = hasResult(match.id);

                                return (
                                    <div key={match.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                        {/* Players Section */}
                                        <div className="text-center space-y-2">
                                            {match.match_type === 'doubles' ? (
                                                <>
                                                    <div className="font-semibold text-sm sm:text-base text-gray-900 break-words px-2">
                                                        {(match.player_a1?.first_name || '')} {(match.player_a1?.last_name || '')} & {(match.player_a2?.first_name || '')} {(match.player_a2?.last_name || '')}
                                                    </div>
                                                    <div className="text-sm text-gray-500 font-medium">VS</div>
                                                    <div className="font-semibold text-sm sm:text-base text-gray-900 break-words px-2">
                                                        {(match.player_b1?.first_name || '')} {(match.player_b1?.last_name || '')} & {(match.player_b2?.first_name || '')} {(match.player_b2?.last_name || '')}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="font-semibold text-sm sm:text-base text-gray-900 break-words px-2">
                                                        {(match.player_a?.first_name || 'TBD')} {(match.player_a?.last_name || '')}
                                                    </div>
                                                    <div className="text-sm text-gray-500 font-medium">VS</div>
                                                    <div className="font-semibold text-sm sm:text-base text-gray-900 break-words px-2">
                                                        {(match.player_b?.first_name || 'TBD')} {(match.player_b?.last_name || '')}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Tournament Info */}
                                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tournament</span>
                                                <span className="text-sm font-medium text-gray-900">{match.tournaments?.name || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Format</span>
                                                <Badge variant="outline" className="text-xs px-2 py-1">
                                                    {match.tournaments?.matches_type || 'N/A'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</span>
                                                <Badge className={`text-xs px-2 py-1 ${getStatusColor(match.status)}`}>
                                                    {match.status}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Results Section */}
                                        {hasExistingResult ? (
                                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">Match Result</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="text-sm font-bold text-green-900">
                                                        Winner: {result?.winner?.first_name} {result?.winner?.last_name}
                                                    </div>
                                                    <div className="text-sm font-medium text-green-700">
                                                        Result: {result?.match_result}
                                                    </div>
                                                    <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                                        {result && getDetailedScore(result)}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                                                <div className="text-sm text-gray-500">No results recorded yet</div>
                                                {match.status !== 'finished' && (
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        Change status to &quot;finished&quot; to add results
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        <div className="pt-2">
                                            {hasExistingResult ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onEditResult(result!)}
                                                    className="w-full text-sm font-semibold h-10 border-blue-200 text-blue-700 hover:bg-blue-50"
                                                >
                                                    Edit Result
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => onAddResult(match)}
                                                    disabled={match.status !== 'finished'}
                                                    className="w-full text-sm font-semibold h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50"
                                                >
                                                    {match.status === 'finished' ? 'Add Results' : 'Match Not Finished'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
