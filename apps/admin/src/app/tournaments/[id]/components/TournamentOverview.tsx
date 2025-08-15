'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Users, Clock } from 'lucide-react';
import { Tournament, Match } from '@/types';

interface TournamentOverviewProps {
    tournament: Tournament;
    matches: Match[];
    onAddMatch: () => void;
    onViewAllMatches: () => void;
    getStatusColor: (status: string) => string;
    getSurfaceColor: (surface: string) => string;
}

export function TournamentOverview({
    tournament,
    matches,
    onAddMatch,
    onViewAllMatches,
    getStatusColor,
    getSurfaceColor
}: TournamentOverviewProps) {
    const getPlayerName = (player: any) => {
        if (player?.first_name && player?.last_name) {
            return `${player.first_name} ${player.last_name}`;
        }
        return 'TBD';
    };
    return (
        <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Tournament Details Card */}
                <div className="lg:col-span-2">
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Trophy className="h-6 w-6 text-blue-600" />
                                </div>
                                Tournament Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex flex-wrap items-center gap-3">
                                <Badge className={`${getStatusColor(tournament.status)} text-sm font-medium px-3 py-1`}>
                                    {tournament.status}
                                </Badge>
                                <Badge className={`${getSurfaceColor(tournament.surface)} text-sm font-medium px-3 py-1`}>
                                    {tournament.surface}
                                </Badge>
                            </div>

                            {tournament.description && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-gray-700 leading-relaxed">
                                        {tournament.description}
                                    </p>
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Calendar className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">Date Range</div>
                                        <div className="text-sm text-gray-600">
                                            {tournament.start_date} - {tournament.end_date}
                                        </div>
                                    </div>
                                </div>

                                {tournament.location && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <MapPin className="h-5 w-5 text-gray-500" />
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">Location</div>
                                            <div className="text-sm text-gray-600">{tournament.location}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Users className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">Participants</div>
                                        <div className="text-sm text-gray-600">
                                            {tournament.current_participants}
                                            {tournament.max_participants && `/${tournament.max_participants}`}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Trophy className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">Entry Fee</div>
                                        <div className="text-sm text-gray-600">${tournament.entry_fee}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Trophy className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">Tournament Type</div>
                                        <div className="text-sm text-gray-600 capitalize">{tournament.tournament_type}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Trophy className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">Format</div>
                                        <div className="text-sm text-gray-600 capitalize">{tournament.format.replace('_', ' ')}</div>
                                    </div>
                                </div>
                            </div>

                            {tournament.prize_pool && (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-green-800">Prize Pool</div>
                                            <div className="text-xs text-green-600">Total prize money</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-green-600">
                                                ${tournament.prize_pool.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}


                        </CardContent>
                    </Card>
                </div>

                {/* Recent Matches Card */}
                <div className="lg:col-span-1">
                    <Card className="border-0 shadow-lg h-fit">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-100">
                            <CardTitle className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    <Clock className="h-5 w-5 text-gray-600" />
                                </div>
                                Recent Matches
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {matches.length > 0 ? (
                                <div className="space-y-3">
                                    {matches.slice(0, 5).map((match) => (
                                        <div key={match.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-900 truncate">
                                                    {getPlayerName(match.player_a)} vs {getPlayerName(match.player_b)}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                                    {match.round && <span>{match.round}</span>}
                                                    {match.round && <span>•</span>}
                                                    <span>{match.status}</span>
                                                </div>
                                            </div>
                                            <Badge className={`${getStatusColor(match.status)} text-xs ml-2 flex-shrink-0`}>
                                                {match.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {matches.length > 5 && (
                                        <Button
                                            variant="outline"
                                            className="w-full mt-4"
                                            onClick={onViewAllMatches}
                                        >
                                            View All Matches ({matches.length})
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No matches yet</h3>
                                    <p className="text-gray-600 mb-4 text-sm">
                                        Add matches to this tournament to get started
                                    </p>
                                    <Button
                                        onClick={onAddMatch}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        Add First Match
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
} 