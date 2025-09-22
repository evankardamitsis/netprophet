'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Users, Clock } from 'lucide-react';
import { Tournament, Match, TournamentParticipant } from '@/types';
import { ParticipantsTable } from './ParticipantsTable';

interface TournamentOverviewProps {
    tournament: Tournament;
    matches: Match[];
    participants: TournamentParticipant[];
    onAddMatch: () => void;
    onViewAllMatches: () => void;
    getStatusColor: (status: string) => string;
    getSurfaceColor: (surface: string) => string;
}

export function TournamentOverview({
    tournament,
    matches,
    participants,
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
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-3">
                {/* Tournament Details Card */}
                <div className="lg:col-span-2">
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                            <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                                </div>
                                <span className="truncate">Tournament Details</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:gap-3">
                                <Badge className={`${getStatusColor(tournament.status)} text-xs sm:text-sm font-medium px-2 sm:px-3 py-1`}>
                                    {tournament.status}
                                </Badge>
                                <Badge className={`${getSurfaceColor(tournament.surface)} text-xs sm:text-sm font-medium px-2 sm:px-3 py-1`}>
                                    {tournament.surface}
                                </Badge>
                            </div>

                            {tournament.description && (
                                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                                    <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                                        {tournament.description}
                                    </p>
                                </div>
                            )}

                            <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2">
                                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-3 bg-gray-50 rounded-lg">
                                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-gray-500 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs sm:text-sm font-medium text-gray-900">Date Range</div>
                                        <div className="text-xs sm:text-sm text-gray-600 truncate">
                                            {tournament.start_date} - {tournament.end_date}
                                        </div>
                                    </div>
                                </div>

                                {tournament.location && (
                                    <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-3 bg-gray-50 rounded-lg">
                                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-gray-500 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs sm:text-sm font-medium text-gray-900">Location</div>
                                            <div className="text-xs sm:text-sm text-gray-600 truncate">{tournament.location}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-3 bg-gray-50 rounded-lg">
                                    <Users className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-gray-500 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs sm:text-sm font-medium text-gray-900">Participants</div>
                                        <div className="text-xs sm:text-sm text-gray-600">
                                            {tournament.current_participants}
                                            {tournament.max_participants && `/${tournament.max_participants}`}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-3 bg-gray-50 rounded-lg">
                                    <Trophy className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-gray-500 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs sm:text-sm font-medium text-gray-900">Entry Fee</div>
                                        <div className="text-xs sm:text-sm text-gray-600">${tournament.entry_fee}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-3 bg-gray-50 rounded-lg">
                                    <Trophy className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-gray-500 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs sm:text-sm font-medium text-gray-900">Tournament Type</div>
                                        <div className="text-xs sm:text-sm text-gray-600 capitalize">{tournament.tournament_type}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-3 bg-gray-50 rounded-lg">
                                    <Trophy className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-gray-500 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs sm:text-sm font-medium text-gray-900">Format</div>
                                        <div className="text-xs sm:text-sm text-gray-600 capitalize">{tournament.format.replace('_', ' ')}</div>
                                    </div>
                                </div>
                            </div>

                            {tournament.prize_pool && (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-2 sm:p-3 lg:p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-0">
                                        <div>
                                            <div className="text-xs sm:text-sm font-medium text-green-800">Prize Pool</div>
                                            <div className="text-xs text-green-600">Total prize money</div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <div className="text-base sm:text-lg lg:text-2xl font-bold text-green-600">
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
                            <CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base lg:text-lg">
                                <div className="p-1.5 sm:p-2 bg-gray-100 rounded-lg">
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-gray-600" />
                                </div>
                                <span className="truncate">Recent Matches</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-3 lg:p-4">
                            {matches.length > 0 ? (
                                <div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
                                    {matches.slice(0, 5).map((match) => (
                                        <div key={match.id} className="flex items-center justify-between p-1.5 sm:p-2 lg:p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                                                    {getPlayerName(match.player_a)} vs {getPlayerName(match.player_b)}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1 truncate">
                                                    {match.round && <span className="truncate">{match.round}</span>}
                                                    {match.round && <span>•</span>}
                                                    <span className="truncate">{match.status}</span>
                                                </div>
                                            </div>
                                            <Badge className={`${getStatusColor(match.status)} text-xs flex-shrink-0`}>
                                                {match.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {matches.length > 5 && (
                                        <Button
                                            variant="outline"
                                            className="w-full mt-3 sm:mt-4 text-xs sm:text-sm"
                                            onClick={onViewAllMatches}
                                        >
                                            View All Matches ({matches.length})
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4 sm:py-6 lg:py-8">
                                    <Clock className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-2 sm:mb-3 lg:mb-4" />
                                    <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 mb-1 sm:mb-2">No matches yet</h3>
                                    <p className="text-gray-600 mb-2 sm:mb-3 lg:mb-4 text-xs sm:text-sm">
                                        Add matches to this tournament to get started
                                    </p>
                                    <Button
                                        onClick={onAddMatch}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
                                    >
                                        Add First Match
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Participants Table */}
            <ParticipantsTable
                participants={participants}
                tournamentName={tournament.name}
                matches={matches}
            />
        </div>
    );
} 