'use client';

import { Button } from '@/components/ui/button';
import { Badge, Clock, Edit, MoreHorizontal, Plus, Trash2, Users } from 'lucide-react';
import { Match } from '@/types';
import { TournamentMatchesTable } from './TournamentMatchesTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@radix-ui/react-dropdown-menu';

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
                <TournamentMatchesTable
                    matches={matches}
                    onEditMatch={onEditMatch}
                    onDeleteMatch={onDeleteMatch}
                    getStatusColor={getStatusColor}
                    formatTime={formatTime}
                />
            ) : (
                <div className="text-center py-12">
                    <div className="h-16 w-16 text-gray-400 mx-auto mb-6 flex items-center justify-center">
                        <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
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
                </div>
            )}
        </div>
    );
} 