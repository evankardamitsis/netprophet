'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTournament, getTournamentTeams } from '@netprophet/lib';
import { supabase } from '@netprophet/lib';
import { Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import { Trophy, Calendar, MapPin, Users, ChevronLeft, TrendingUp, Award, User, Crown, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useDictionary } from '@/context/DictionaryContext';

export const dynamic = 'force-dynamic';

interface Team {
    id: string;
    name: string;
    captain_id: string | null;
    captain_name: string | null;
    captain?: {
        id: string;
        first_name: string;
        last_name: string;
        ntrp_rating: number;
    };
    team_members?: Array<{
        id: string;
        player_id: string;
        player?: {
            id: string;
            first_name: string;
            last_name: string;
            ntrp_rating: number;
            age: number | null;
        };
    }>;
}

interface TeamStanding extends Team {
    wins: number;
    losses: number;
    winPercentage: number;
    matchesPlayed: number;
}

interface MatchResult {
    id: string;
    player_a_id?: string;
    player_b_id?: string;
    player_a1_id?: string;
    player_a2_id?: string;
    player_b1_id?: string;
    player_b2_id?: string;
    player_a_name?: string;
    player_b_name?: string;
    winner_id?: string;
    winner_name?: string;
    match_result?: string;
    round: string | null;
    start_time: string;
    status: string;
    match_type?: string;
}

export default function TournamentPage() {
    const params = useParams();
    const router = useRouter();
    const { dict } = useDictionary();
    const tournamentId = params.id as string;
    const lang = params?.lang;

    const [tournament, setTournament] = useState<any>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamStandings, setTeamStandings] = useState<TeamStanding[]>([]);
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'standings' | 'results'>('overview');

    const loadTournamentData = useCallback(async () => {
        try {
            setLoading(true);

            // Load tournament, teams, and matches in parallel
            const [tournamentData, teamsData, matchesData] = await Promise.all([
                getTournament(tournamentId),
                getTournamentTeams(tournamentId).catch(() => []),
                fetchTournamentMatches(tournamentId)
            ]);

            setTournament(tournamentData);
            setTeams(teamsData || []);
            setMatches(matchesData || []);

            // Calculate team standings if this is a team tournament
            if (tournamentData?.is_team_tournament && teamsData?.length > 0) {
                const standings = await calculateTeamStandings(teamsData, matchesData || []);
                setTeamStandings(standings);
            }
        } catch (error) {
            console.error('Error loading tournament data:', error);
        } finally {
            setLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        if (tournamentId) {
            loadTournamentData();
        }
    }, [tournamentId, loadTournamentData]);

    const fetchTournamentMatches = async (tournamentId: string): Promise<any[]> => {
        const { data, error } = await supabase
            .from('matches')
            .select(`
                id,
                player_a_id,
                player_b_id,
                player_a1_id,
                player_a2_id,
                player_b1_id,
                player_b2_id,
                winner_id,
                round,
                start_time,
                status,
                match_type,
                player_a:players!matches_player_a_id_fkey (
                    id,
                    first_name,
                    last_name
                ),
                player_b:players!matches_player_b_id_fkey (
                    id,
                    first_name,
                    last_name
                ),
                player_a1:players!matches_player_a1_id_fkey (
                    id,
                    first_name,
                    last_name
                ),
                player_a2:players!matches_player_a2_id_fkey (
                    id,
                    first_name,
                    last_name
                ),
                player_b1:players!matches_player_b1_id_fkey (
                    id,
                    first_name,
                    last_name
                ),
                player_b2:players!matches_player_b2_id_fkey (
                    id,
                    first_name,
                    last_name
                ),
                winner:players!matches_winner_id_fkey (
                    id,
                    first_name,
                    last_name
                ),
                match_results (
                    match_result,
                    winner_id
                )
            `)
            .eq('tournament_id', tournamentId)
            .eq('web_synced', true)
            .order('start_time', { ascending: false });

        if (error) throw error;

        // Transform the data to include player names
        return (data || []).map((match: any) => {
            const getPlayerName = (player: any) => {
                if (!player) return 'TBD';
                if (match.match_type === 'doubles') {
                    if (match.player_a1 && match.player_a2 && player.id === match.player_a1.id) {
                        return `${match.player_a1.first_name} ${match.player_a1.last_name} & ${match.player_a2.first_name} ${match.player_a2.last_name}`;
                    }
                    if (match.player_b1 && match.player_b2 && player.id === match.player_b1.id) {
                        return `${match.player_b1.first_name} ${match.player_b1.last_name} & ${match.player_b2.first_name} ${match.player_b2.last_name}`;
                    }
                }
                return `${player.first_name} ${player.last_name}`;
            };

            const playerAName = match.match_type === 'doubles' && match.player_a1 && match.player_a2
                ? `${match.player_a1.first_name} ${match.player_a1.last_name} & ${match.player_a2.first_name} ${match.player_a2.last_name}`
                : match.player_a
                    ? `${match.player_a.first_name} ${match.player_a.last_name}`
                    : 'TBD';

            const playerBName = match.match_type === 'doubles' && match.player_b1 && match.player_b2
                ? `${match.player_b1.first_name} ${match.player_b1.last_name} & ${match.player_b2.first_name} ${match.player_b2.last_name}`
                : match.player_b
                    ? `${match.player_b.first_name} ${match.player_b.last_name}`
                    : 'TBD';

            const winnerName = match.winner
                ? `${match.winner.first_name} ${match.winner.last_name}`
                : null;

            const matchResult = Array.isArray(match.match_results) && match.match_results.length > 0
                ? match.match_results[0].match_result
                : null;

            return {
                ...match,
                player_a_name: playerAName,
                player_b_name: playerBName,
                winner_name: winnerName,
                match_result: matchResult
            };
        });
    };

    const calculateTeamStandings = async (
        teams: Team[],
        matches: any[]
    ): Promise<TeamStanding[]> => {
        // Build a map of player ID to team ID
        const playerToTeamMap = new Map<string, string>();

        for (const team of teams) {
            // Add captain if exists
            if (team.captain_id) {
                playerToTeamMap.set(team.captain_id, team.id);
            }

            // Add all team members
            if (team.team_members) {
                team.team_members.forEach(member => {
                    if (member.player_id) {
                        playerToTeamMap.set(member.player_id, team.id);
                    }
                });
            }
        }

        // Initialize standings
        const standingsMap = new Map<string, { wins: number; losses: number }>();
        teams.forEach(team => {
            standingsMap.set(team.id, { wins: 0, losses: 0 });
        });

        // Calculate wins/losses for each team
        matches.forEach(match => {
            if (!match.winner_id || match.status !== 'finished') return;

            // Get all player IDs involved in this match
            const playerIds: string[] = [];
            if (match.match_type === 'doubles') {
                if (match.player_a1_id) playerIds.push(match.player_a1_id);
                if (match.player_a2_id) playerIds.push(match.player_a2_id);
                if (match.player_b1_id) playerIds.push(match.player_b1_id);
                if (match.player_b2_id) playerIds.push(match.player_b2_id);
            } else {
                if (match.player_a_id) playerIds.push(match.player_a_id);
                if (match.player_b_id) playerIds.push(match.player_b_id);
            }

            // Find which teams are involved
            const teamsInMatch = new Set<string>();
            playerIds.forEach(playerId => {
                const teamId = playerToTeamMap.get(playerId);
                if (teamId) {
                    teamsInMatch.add(teamId);
                }
            });

            // If exactly 2 teams are involved, determine winner/loser
            if (teamsInMatch.size === 2) {
                const teamArray = Array.from(teamsInMatch);
                const teamA = teamArray[0];
                const teamB = teamArray[1];

                // Check if winner belongs to teamA or teamB
                const winnerTeamId = playerToTeamMap.get(match.winner_id);
                if (winnerTeamId === teamA) {
                    const statsA = standingsMap.get(teamA)!;
                    const statsB = standingsMap.get(teamB)!;
                    statsA.wins++;
                    statsB.losses++;
                } else if (winnerTeamId === teamB) {
                    const statsA = standingsMap.get(teamA)!;
                    const statsB = standingsMap.get(teamB)!;
                    statsB.wins++;
                    statsA.losses++;
                }
            }
        });

        // Build final standings
        const standings: TeamStanding[] = teams.map(team => {
            const stats = standingsMap.get(team.id) || { wins: 0, losses: 0 };
            const matchesPlayed = stats.wins + stats.losses;
            const winPercentage = matchesPlayed > 0 ? (stats.wins / matchesPlayed) * 100 : 0;

            return {
                ...team,
                wins: stats.wins,
                losses: stats.losses,
                winPercentage,
                matchesPlayed
            };
        });

        // Sort by win percentage, then wins, then fewer losses
        return standings.sort((a, b) => {
            if (b.winPercentage !== a.winPercentage) {
                return b.winPercentage - a.winPercentage;
            }
            if (b.wins !== a.wins) {
                return b.wins - a.wins;
            }
            return a.losses - b.losses;
        });
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'TBD';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">{dict?.tournaments?.loadingTournament || 'Loading tournament...'}</div>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">{dict?.tournaments?.tournamentNotFound || 'Tournament not found'}</div>
            </div>
        );
    }

    const isTeamTournament = tournament.is_team_tournament === true ||
        tournament.is_team_tournament === 'true' ||
        tournament.is_team_tournament === 1;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push(`/${lang}/tournaments`)}
                        className="flex items-center text-white/80 hover:text-white mb-4 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        {dict?.tournaments?.backToTournaments || 'Back to Tournaments'}
                    </button>

                    <div className="flex items-center gap-2 sm:gap-3 mb-4">
                        <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400 flex-shrink-0" />
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white break-words">{tournament.name}</h1>
                    </div>

                    <div className="flex flex-wrap gap-6 text-white/80 text-sm">
                        {tournament.start_date && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(tournament.start_date)}</span>
                                {tournament.end_date && (
                                    <span> - {formatDate(tournament.end_date)}</span>
                                )}
                            </div>
                        )}
                        {tournament.location && (
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{tournament.location}</span>
                            </div>
                        )}
                        {tournament.surface && (
                            <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold">
                                {tournament.surface}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-white/10 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex gap-2 min-w-max">
                        {[
                            { id: 'overview', label: dict?.tournaments?.overview || 'Overview' },
                            { id: 'teams', label: `${dict?.tournaments?.teams || 'Teams'} (${teams.length})`, show: isTeamTournament },
                            { id: 'standings', label: dict?.tournaments?.standings || 'Standings', show: isTeamTournament && teamStandings.length > 0 },
                            { id: 'results', label: `${dict?.tournaments?.results || 'Results'} (${matches.length})` }
                        ].filter(tab => tab.show !== false).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'text-white border-b-2 border-yellow-400'
                                    : 'text-white/60 hover:text-white/80 active:text-white/90'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Description */}
                        {tournament.description && (
                            <Card className="bg-white/5 border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white">{dict?.tournaments?.about || 'About'}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className="text-white/80 [&_h1]:text-white [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1:first-child]:mt-0 [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-5 [&_h3]:text-white [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:text-white/80 [&_p]:mb-4 [&_p]:leading-relaxed [&_a]:text-yellow-400 [&_a:hover]:text-yellow-300 [&_a]:underline [&_strong]:text-white [&_strong]:font-bold [&_ul]:text-white/80 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:text-white/80 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_li]:text-white/80 [&_li]:mb-1"
                                        dangerouslySetInnerHTML={{ __html: tournament.description }}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-white/5 border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        {dict?.tournaments?.teams || 'Teams'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-white">{teams.length}</div>
                                    <p className="text-white/60 text-sm mt-1">{dict?.tournaments?.totalTeams || 'Total teams'}</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/5 border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Trophy className="h-5 w-5" />
                                        {dict?.tournaments?.results || 'Matches'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-white">{matches.length}</div>
                                    <p className="text-white/60 text-sm mt-1">{dict?.tournaments?.totalMatches || 'Total matches'}</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/5 border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5" />
                                        {dict?.tournaments?.status || 'Status'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-lg font-bold text-white">
                                        {matches.filter(m => m.status === 'finished').length} {dict?.tournaments?.completed || 'Completed'}
                                    </div>
                                    <p className="text-white/60 text-sm mt-1">
                                        {matches.filter(m => m.status === 'live').length} {dict?.tournaments?.live || 'Live'}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'teams' && isTeamTournament && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map((team, teamIndex) => (
                            <Card
                                key={team.id}
                                className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-yellow-400/30 hover:shadow-lg hover:shadow-yellow-400/10 transition-all duration-300 group"
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-white text-xl font-bold group-hover:text-yellow-400 transition-colors">
                                            {team.name}
                                        </CardTitle>
                                        {teamIndex === 0 && (
                                            <Trophy className="h-5 w-5 text-yellow-400" />
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {(team.captain || team.captain_name) && (
                                        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Crown className="h-4 w-4 text-yellow-400" />
                                                <p className="text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                                                    {dict?.tournaments?.captain || 'Captain'}
                                                </p>
                                            </div>
                                            {team.captain?.id ? (
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                                                    <Link
                                                        href={`/${lang}/players/${team.captain.id}`}
                                                        className="group/player flex items-center gap-2 hover:text-yellow-400 transition-colors flex-1 min-w-0"
                                                    >
                                                        <User className="h-4 w-4 text-white/60 group-hover/player:text-yellow-400 transition-colors flex-shrink-0" />
                                                        <span className="text-white font-semibold group-hover/player:text-yellow-400 transition-colors truncate">
                                                            {team.captain.first_name} {team.captain.last_name}
                                                        </span>
                                                        <ExternalLink className="h-3 w-3 text-white/40 group-hover/player:text-yellow-400 opacity-0 group-hover/player:opacity-100 transition-all flex-shrink-0" />
                                                    </Link>
                                                    {team.captain.ntrp_rating && (
                                                        <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-300 rounded-full text-xs font-semibold border border-yellow-400/30 w-fit sm:ml-auto">
                                                            NTRP {team.captain.ntrp_rating.toFixed(1)}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-white/60" />
                                                    <span className="text-white font-semibold">
                                                        {team.captain_name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {team.team_members && team.team_members.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Users className="h-4 w-4 text-white/60" />
                                                <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                                                    {dict?.tournaments?.members || 'Members'}
                                                    <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                                                        {team.team_members.length}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                                {team.team_members.map((member) => (
                                                    member.player?.id ? (
                                                        <Link
                                                            key={member.id}
                                                            href={`/${lang}/players/${member.player.id}`}
                                                            className="group/member flex items-center gap-2 bg-white/5 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 border border-white/10 hover:border-yellow-400/30 rounded-lg p-3 transition-all duration-200"
                                                        >
                                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 flex items-center justify-center">
                                                                <User className="h-4 w-4 text-yellow-400" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-white group-hover/member:text-yellow-400 transition-colors truncate">
                                                                    {member.player.first_name} {member.player.last_name}
                                                                </p>
                                                                {member.player.ntrp_rating && (
                                                                    <p className="text-xs text-white/50 mt-0.5">
                                                                        NTRP {member.player.ntrp_rating.toFixed(1)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <ExternalLink className="h-3.5 w-3.5 text-white/30 group-hover/member:text-yellow-400 opacity-0 group-hover/member:opacity-100 transition-all flex-shrink-0" />
                                                        </Link>
                                                    ) : (
                                                        <div
                                                            key={member.id}
                                                            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3 opacity-60"
                                                        >
                                                            <User className="h-4 w-4 text-white/40" />
                                                            <span className="text-sm text-white/60">
                                                                {dict?.athletes?.playerNotFound || 'Unknown Player'}
                                                            </span>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(!team.team_members || team.team_members.length === 0) && !team.captain && !team.captain_name && (
                                        <div className="text-center py-6 text-white/40 text-sm">
                                            {dict?.tournaments?.noTeamsYet || 'No members yet'}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === 'standings' && isTeamTournament && teamStandings.length > 0 && (
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Award className="h-5 w-5" />
                                {dict?.tournaments?.standings || 'Team Standings'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-2 px-2 sm:px-3 text-white/80 font-semibold text-xs sm:text-sm w-12 sm:w-auto">#</th>
                                            <th className="text-left py-2 px-2 sm:px-3 text-white/80 font-semibold text-xs sm:text-sm">Team</th>
                                            <th className="text-center py-2 px-1 sm:px-2 text-white/80 font-semibold text-xs sm:text-sm w-10 sm:w-auto">W</th>
                                            <th className="text-center py-2 px-1 sm:px-2 text-white/80 font-semibold text-xs sm:text-sm w-10 sm:w-auto">L</th>
                                            <th className="text-center py-2 px-1 sm:px-2 text-white/80 font-semibold text-xs sm:text-sm w-14 sm:w-auto">%</th>
                                            <th className="text-center py-2 px-1 sm:px-2 text-white/80 font-semibold text-xs sm:text-sm w-12 sm:w-auto">M</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamStandings.map((team, index) => (
                                            <tr
                                                key={team.id}
                                                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                            >
                                                <td className="py-2 px-2 sm:px-3 text-white font-bold text-xs sm:text-sm">
                                                    {index === 0 && <Trophy className="inline h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 mr-0.5 sm:mr-1" />}
                                                    {index + 1}
                                                </td>
                                                <td className="py-2 px-2 sm:px-3 text-white font-semibold text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{team.name}</td>
                                                <td className="py-2 px-1 sm:px-2 text-center text-white text-xs sm:text-sm">{team.wins}</td>
                                                <td className="py-2 px-1 sm:px-2 text-center text-white text-xs sm:text-sm">{team.losses}</td>
                                                <td className="py-2 px-1 sm:px-2 text-center text-white text-xs sm:text-sm">{team.winPercentage.toFixed(1)}%</td>
                                                <td className="py-2 px-1 sm:px-2 text-center text-white/80 text-xs sm:text-sm">{team.matchesPlayed}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'results' && (
                    <div className="space-y-4">
                        {matches.length === 0 ? (
                            <Card className="bg-white/5 border-white/10">
                                <CardContent className="py-12 text-center">
                                    <p className="text-white/60">{dict?.tournaments?.noMatchesFound || 'No matches found for this tournament.'}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            matches.map(match => (
                                <Card key={match.id} className="bg-white/5 border-white/10">
                                    <CardContent className="py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <span className="text-white/60 text-sm">{match.round || dict?.tournaments?.round || 'Round'}</span>
                                                    {match.status === 'finished' && (
                                                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
                                                            {dict?.tournaments?.completed || dict?.results?.finished || 'Finished'}
                                                        </span>
                                                    )}
                                                    {match.status === 'live' && (
                                                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold animate-pulse">
                                                            {dict?.tournaments?.live || 'Live'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-white">
                                                    <div className={`${match.winner_name === match.player_a_name ? 'font-bold' : ''}`}>
                                                        {match.player_a_name}
                                                    </div>
                                                    <div className={`${match.winner_name === match.player_b_name ? 'font-bold' : ''}`}>
                                                        {match.player_b_name}
                                                    </div>
                                                </div>
                                            </div>
                                            {match.match_result && (
                                                <div className="text-white/80 text-sm text-right">
                                                    {match.match_result}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
