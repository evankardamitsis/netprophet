'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, Clock, Users, MoreHorizontal } from 'lucide-react';
import { Match } from '@/types';

interface TournamentMatchesProps {
    matches: Match[];
    onAddMatch: () => void;
    onEditMatch: (match: Match) => void;
    onDeleteMatch: (id: string) => void;
    getStatusColor: (status: string) => string;
    formatTime: (timeString: string | null) => string;
}

export function TournamentMatches({
    matches,
    onAddMatch,
    onEditMatch,
    onDeleteMatch,
    getStatusColor,
    formatTime
}: TournamentMatchesProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Tournament Matches</h2>
                    <p className="text-gray-600 mt-1">Manage all matches for this tournament</p>
                </div>
                <Button
                    onClick={onAddMatch}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    Add Match
                </Button>
            </div>

            {matches.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {matches.map((match) => (
                        <Card key={match.id} className="group hover:shadow-xl transition-all duration-200 border-0 shadow-md">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors truncate">
                                            {match.player_a} vs {match.player_b}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge className={`${getStatusColor(match.status)} text-xs font-medium px-2 py-1`}>
                                                {match.status}
                                            </Badge>
                                            {match.round && (
                                                <Badge variant="outline" className="text-xs font-medium px-2 py-1">
                                                    {match.round}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEditMatch(match)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit Match
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onDeleteMatch(match.id)}
                                                className="text-red-600 focus:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Match
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-4">
                                    {match.round && (
                                        <div className="text-sm text-gray-700 font-medium">
                                            Round: {match.round}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 text-sm text-gray-700">
                                        <Clock className="h-4 w-4 text-gray-500" />
                                        <span className="font-medium">Start: {formatTime(match.start_time)}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-sm text-gray-700">
                                            <Users className="h-4 w-4 text-gray-500" />
                                            <span className="font-medium">{match.points_value} points</span>
                                        </div>
                                        {match.odds_a && match.odds_b && (
                                            <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                                                <div className="text-center">
                                                    <div className="text-xs text-blue-600 font-medium mb-1">Odds</div>
                                                    <div className="text-lg font-bold text-blue-700">
                                                        {match.odds_a.toFixed(2)} / {match.odds_b.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-0 shadow-lg">
                    <CardContent className="p-12 text-center">
                        <Clock className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                        <h3 className="text-xl font-medium text-gray-900 mb-3">No matches found</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Add matches to this tournament to get started. Each match will be associated with this tournament.
                        </p>
                        <Button
                            onClick={onAddMatch}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Add First Match
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 