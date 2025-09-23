'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Trophy, Calendar } from 'lucide-react';
import { TournamentParticipant } from '@/types';
import { getStatusColor } from '../utils/tournamentHelpers';

interface ParticipantsTableProps {
    participants: TournamentParticipant[];
    tournamentName: string;
    matches: any[]; // Add matches to calculate matches played
}

export function ParticipantsTable({ participants, tournamentName, matches }: ParticipantsTableProps) {

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const getPlayerName = (participant: TournamentParticipant) => {
        if (participant.players?.first_name && participant.players?.last_name) {
            return `${participant.players.first_name} ${participant.players.last_name}`;
        }
        return 'Unknown Player';
    };

    const getMatchesPlayed = (playerId: string) => {
        return matches.filter(match =>
            match.player_a_id === playerId || match.player_b_id === playerId
        ).length;
    };

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
                <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    Tournament Participants
                    <Badge variant="secondary" className="ml-2">
                        {participants.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                {participants.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-semibold">Player</TableHead>
                                    <TableHead className="font-semibold">NTRP Rating</TableHead>
                                    <TableHead className="font-semibold">Age</TableHead>
                                    <TableHead className="font-semibold">Registration Date</TableHead>
                                    <TableHead className="font-semibold">Matches Played</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {participants.map((participant) => (
                                    <TableRow key={participant.id} className="hover:bg-gray-50">
                                        <TableCell className="font-medium">
                                            <div className="font-semibold text-gray-900">
                                                {getPlayerName(participant)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {participant.players?.ntrp_rating || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {participant.players?.age || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(participant.registration_date)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono">
                                                {getMatchesPlayed(participant.player_id)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No participants yet</h3>
                        <p className="text-gray-600 mb-4 text-sm">
                            Participants will be automatically added when matches are created
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
