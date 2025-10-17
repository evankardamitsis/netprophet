'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge, Clock, Edit, MoreHorizontal, Plus, Trash2, Trophy, Users } from 'lucide-react';
import { Match } from '@/types';
import { TournamentMatchesTable } from './TournamentMatchesTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@radix-ui/react-dropdown-menu';

interface TournamentMatchesProps {
    matches: Match[];
    onAddMatch: () => void;
    onEditMatch: (match: Match) => void;
    onDeleteMatch: (id: string) => void;
    onCalculateOdds: (matchIds: string[]) => void;
    onSyncToWeb: (matchIds: string[]) => void;
    onRemoveFromWeb: (matchIds: string[]) => void;
    onUpdateMatchStatus: (matchId: string, status: string) => void;
    getStatusColor: (status: string) => string;
    formatTime: (timeString: string | null) => string;
}

export function TournamentMatches({
    matches,
    onAddMatch,
    onEditMatch,
    onDeleteMatch,
    onCalculateOdds,
    onSyncToWeb,
    onRemoveFromWeb,
    onUpdateMatchStatus,
    getStatusColor,
    formatTime
}: TournamentMatchesProps) {
    const [selectedMatches, setSelectedMatches] = useState<string[]>([]);

    return (
        <div className="space-y-6">
            {/* Mobile-Optimized Header */}
            <div className="text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Tournament Matches</h2>
                <p className="text-gray-600 text-sm sm:text-base">Manage all matches for this tournament</p>
            </div>

            {matches.length > 0 ? (
                <TournamentMatchesTable
                    matches={matches}
                    onEditMatch={onEditMatch}
                    onDeleteMatch={onDeleteMatch}
                    onCalculateOdds={onCalculateOdds}
                    onSyncToWeb={onSyncToWeb}
                    onRemoveFromWeb={onRemoveFromWeb}
                    onUpdateMatchStatus={onUpdateMatchStatus}
                    getStatusColor={getStatusColor}
                    formatTime={formatTime}
                    selectedMatches={selectedMatches}
                    onSelectionChange={setSelectedMatches}
                />
            ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-full p-8 mb-6">
                        <Trophy className="h-16 w-16 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">No matches found</h3>
                    <p className="text-gray-600 mb-6 text-center max-w-md text-base">
                        Add matches to this tournament to get started. Each match will be associated with this tournament.
                    </p>
                    <Button
                        onClick={onAddMatch}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Add First Match
                    </Button>
                </div>
            )}
        </div>
    );
} 