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
        <div className="space-y-6">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* Mobile-Optimized Tournament Details Card */}
                <div className="lg:col-span-2">
                    <Card className="border-0 shadow-xl bg-white">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 p-6">
                            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-3">
                                    <Trophy className="h-6 w-6 text-white" />
                                </div>
                                <span className="truncate">Tournament Details</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Mobile-Optimized Status Badges */}
                            <div className="flex flex-wrap items-center gap-3">
                                <Badge className={`${getStatusColor(tournament.status)} text-sm font-semibold px-4 py-2`}>
                                    {tournament.status}
                                </Badge>
                                <Badge className={`${getSurfaceColor(tournament.surface)} text-sm font-semibold px-4 py-2`}>
                                    {tournament.surface}
                                </Badge>
                            </div>

                            {/* Description */}
                            {tournament.description && (
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        {tournament.description}
                                    </p>
                                </div>
                            )}

                            {/* Mobile-Optimized Info Grid */}
                            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                    <div className="bg-blue-500 rounded-lg p-3">
                                        <Calendar className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-gray-900">Date Range</div>
                                        <div className="text-sm text-gray-600 truncate">
                                            {tournament.start_date} - {tournament.end_date}
                                        </div>
                                    </div>
                                </div>

                                {tournament.location && (
                                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                        <div className="bg-green-500 rounded-lg p-3">
                                            <MapPin className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-semibold text-gray-900">Location</div>
                                            <div className="text-sm text-gray-600 truncate">{tournament.location}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                                    <div className="bg-purple-500 rounded-lg p-3">
                                        <Users className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-gray-900">Participants</div>
                                        <div className="text-sm text-gray-600">
                                            {tournament.current_participants}
                                            {tournament.max_participants && `/${tournament.max_participants}`}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                                    <div className="bg-yellow-500 rounded-lg p-3">
                                        <Trophy className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-gray-900">Entry Fee</div>
                                        <div className="text-sm text-gray-600">${tournament.entry_fee}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
                                    <div className="bg-indigo-500 rounded-lg p-3">
                                        <Trophy className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-gray-900">Tournament Type</div>
                                        <div className="text-sm text-gray-600 capitalize">{tournament.tournament_type}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
                                    <div className="bg-red-500 rounded-lg p-3">
                                        <Trophy className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-gray-900">Format</div>
                                        <div className="text-sm text-gray-600 capitalize">{tournament.format.replace('_', ' ')}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Prize Pool */}
                            {tournament.prize_pool && (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <div className="text-lg font-bold text-green-800">Prize Pool</div>
                                            <div className="text-sm text-green-600">Total prize money</div>
                                        </div>
                                        <div className="text-3xl font-black text-green-600">
                                            ${tournament.prize_pool.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}


                        </CardContent>
                    </Card>
                </div>

                {/* Mobile-Optimized Recent Matches Card */}
                <div className="lg:col-span-1">
                    <Card className="border-0 shadow-xl h-fit bg-white">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-100 p-6">
                            <CardTitle className="flex items-center gap-3 text-lg font-bold text-gray-900">
                                <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl p-3">
                                    <Clock className="h-6 w-6 text-white" />
                                </div>
                                <span className="truncate">Recent Matches</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {matches.length > 0 ? (
                                <div className="space-y-4">
                                    {matches.slice(0, 5).map((match) => (
                                        <div key={match.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200">
                                            <div className="flex-1 min-w-0 pr-3">
                                                <div className="font-semibold text-sm text-gray-900 truncate">
                                                    {getPlayerName(match.player_a)} vs {getPlayerName(match.player_b)}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                    {match.round && (
                                                        <>
                                                            <span className="truncate">{match.round}</span>
                                                            <span>•</span>
                                                        </>
                                                    )}
                                                    <span className="truncate">{match.status}</span>
                                                </div>
                                            </div>
                                            <Badge className={`${getStatusColor(match.status)} text-xs px-3 py-1 font-semibold flex-shrink-0`}>
                                                {match.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {matches.length > 5 && (
                                        <Button
                                            variant="outline"
                                            className="w-full mt-4 text-sm font-semibold h-11 border-blue-200 text-blue-700 hover:bg-blue-50"
                                            onClick={onViewAllMatches}
                                        >
                                            View All Matches ({matches.length})
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full p-6 w-fit mx-auto mb-4">
                                        <Clock className="h-12 w-12 text-gray-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">No matches yet</h3>
                                    <p className="text-gray-600 mb-4 text-sm">
                                        Add matches to this tournament to get started
                                    </p>
                                    <Button
                                        onClick={onAddMatch}
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2"
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