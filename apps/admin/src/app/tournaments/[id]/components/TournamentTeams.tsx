'use client';

import { Team } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit, Users } from 'lucide-react';

interface TournamentTeamsProps {
    teams: Team[];
    onAddTeam: () => void;
    onEditTeam: (team: Team) => void;
    onDeleteTeam: (id: string) => void;
}

export function TournamentTeams({
    teams,
    onAddTeam,
    onEditTeam,
    onDeleteTeam
}: TournamentTeamsProps) {
    if (teams.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-semibold">Tournament Teams</h3>
                    <Button
                        onClick={onAddTeam}
                        className="flex items-center gap-2 w-full sm:w-auto"
                    >
                        <Users className="h-4 w-4" />
                        <span>Add Team</span>
                    </Button>
                </div>
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500 mb-4">No teams have been created yet.</p>
                        <Button onClick={onAddTeam} variant="outline">
                            Create First Team
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-base sm:text-lg font-semibold">
                    Tournament Teams ({teams.length})
                </h3>
                <Button
                    onClick={onAddTeam}
                    className="flex items-center gap-2 w-full sm:w-auto"
                >
                    <Users className="h-4 w-4" />
                    <span>Add Team</span>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                    <Card key={team.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <CardTitle className="text-lg font-semibold">
                                    {team.name}
                                </CardTitle>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEditTeam(team)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDeleteTeam(team.id)}
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {team.captain && (
                                <div className="text-sm">
                                    <span className="font-medium text-gray-600 dark:text-gray-400">Captain:</span>
                                    <span className="ml-2 font-semibold">
                                        {team.captain.first_name} {team.captain.last_name}
                                    </span>
                                    {team.captain.ntrp_rating && (
                                        <span className="ml-2 text-gray-500">
                                            (NTRP {team.captain.ntrp_rating.toFixed(1)})
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="text-sm">
                                <span className="font-medium text-gray-600 dark:text-gray-400">Members:</span>
                                <span className="ml-2 font-semibold">
                                    {team.members?.length || 0} {team.members?.length === 1 ? 'player' : 'players'}
                                </span>
                            </div>
                            {team.members && team.members.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        Team Roster:
                                    </div>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {team.members.map((member) => (
                                            <div
                                                key={member.id}
                                                className="text-xs p-1.5 bg-gray-50 dark:bg-gray-800 rounded"
                                            >
                                                {member.player?.first_name} {member.player?.last_name}
                                                {member.player?.ntrp_rating && (
                                                    <span className="text-gray-500 ml-1">
                                                        (NTRP {member.player.ntrp_rating.toFixed(1)})
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
