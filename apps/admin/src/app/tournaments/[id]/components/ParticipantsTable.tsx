'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Trophy, Calendar } from 'lucide-react';
import { TournamentParticipant, Team } from '@/types';
import { getStatusColor } from '../utils/tournamentHelpers';

interface ParticipantsTableProps {
    participants: TournamentParticipant[];
    tournamentName: string;
    matches: any[]; // Add matches to calculate matches played
    isTeamTournament?: boolean;
    teams?: Team[];
}

export function ParticipantsTable({ participants, tournamentName, matches, isTeamTournament = false, teams = [] }: ParticipantsTableProps) {
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

    // For team tournaments, show teams with their members
    if (isTeamTournament) {
        return (
            <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
                    <CardTitle className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        Tournament Teams & Members
                        <Badge variant="secondary" className="ml-2">
                            {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {teams.length > 0 ? (
                        <div className="space-y-4">
                            {teams.map((team) => (
                                <Card key={team.id} className="border border-gray-200">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg font-semibold">
                                                {team.name}
                                            </CardTitle>
                                            <Badge variant="outline">
                                                {team.members?.length || 0} {team.members?.length === 1 ? 'member' : 'members'}
                                            </Badge>
                                        </div>
                                        {team.captain && (
                                            <div className="text-sm text-gray-600 mt-1">
                                                <span className="font-medium">Captain: </span>
                                                {team.captain.first_name} {team.captain.last_name}
                                                {team.captain.ntrp_rating && (
                                                    <span className="ml-2 text-gray-500">
                                                        (NTRP {team.captain.ntrp_rating.toFixed(1)})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {team.captain_name && (
                                            <div className="text-sm text-gray-600 mt-1">
                                                <span className="font-medium">Captain: </span>
                                                {team.captain_name}
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        {team.members && team.members.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="font-semibold">Member</TableHead>
                                                            <TableHead className="font-semibold">NTRP Rating</TableHead>
                                                            <TableHead className="font-semibold">Age</TableHead>
                                                            <TableHead className="font-semibold">Surface Preference</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {team.members.map((member) => (
                                                            <TableRow key={member.id} className="hover:bg-gray-50">
                                                                <TableCell className="font-medium">
                                                                    <div className="font-semibold text-gray-900">
                                                                        {member.player?.first_name} {member.player?.last_name}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {member.player?.ntrp_rating ? member.player.ntrp_rating.toFixed(1) : 'N/A'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {member.player?.age || 'N/A'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">
                                                                        {member.player?.surface_preference || 'N/A'}
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-gray-500 text-sm">
                                                No members added to this team yet
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No teams created yet</h3>
                            <p className="text-gray-600 mb-4 text-sm">
                                Create teams in the Teams tab to see team members here
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

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
