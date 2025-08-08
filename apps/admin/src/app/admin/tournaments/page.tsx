'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    getTournaments,
    createTournament,
    updateTournament,
    deleteTournament,
    getTournamentWithDetails,
    getMatches,
    createMatch,
    updateMatch,
    deleteMatch
} from '@netprophet/lib';
import { Plus, Edit, Trash2, Eye, Calendar, MapPin, Trophy, Users, Clock, MoreHorizontal } from 'lucide-react';
import { TournamentModal } from './TournamentModal';
import { TournamentDetails } from './TournamentDetails';
import { MatchModal } from './MatchModal';
import { MatchForm } from './MatchForm';
import { TournamentForm } from './TournamentForm';

interface Tournament {
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    status: string;
    surface: string;
    location: string | null;
    prize_pool: number | null;
    entry_fee: number;
    max_participants: number | null;
    current_participants: number;
    tournament_type: string;
    format: string;
}

interface Match {
    id: string;
    player_a: string;
    player_b: string;
    tournament_id: string | null;
    category_id: string | null;
    round: string | null;
    court_number: number | null;
    status: string;
    start_time: string | null;
    lock_time: string | null;
    points_value: number;
    odds_a: number | null;
    odds_b: number | null;
    winner_id: string | null;
    tournaments?: {
        id: string;
        name: string;
        surface: string;
        location: string | null;
    };
    tournament_categories?: {
        id: string;
        name: string;
    };
}

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('tournaments');
    const [showTournamentForm, setShowTournamentForm] = useState(false);
    const [showMatchForm, setShowMatchForm] = useState(false);
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [tournamentsData, matchesData] = await Promise.all([
                getTournaments(),
                getMatches()
            ]);
            setTournaments(tournamentsData);
            setMatches(matchesData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTournament = async (tournamentData: any) => {
        try {
            await createTournament(tournamentData);
            setShowTournamentForm(false);
            loadData();
            toast.success('Tournament created successfully!');
        } catch (error) {
            console.error('Error creating tournament:', error);
            toast.error('Failed to create tournament');
        }
    };

    const handleUpdateTournament = async (tournamentData: any) => {
        if (!editingTournament) return;
        try {
            await updateTournament(editingTournament.id, tournamentData);
            setShowTournamentForm(false);
            setEditingTournament(null);
            loadData();
            toast.success('Tournament updated successfully!');
        } catch (error) {
            console.error('Error updating tournament:', error);
            toast.error('Failed to update tournament');
        }
    };

    const handleDeleteTournament = async (id: string) => {
        if (!confirm('Are you sure you want to delete this tournament?')) return;
        try {
            await deleteTournament(id);
            loadData();
            toast.success('Tournament deleted successfully!');
        } catch (error) {
            console.error('Error deleting tournament:', error);
            toast.error('Failed to delete tournament');
        }
    };

    const handleCreateMatch = async (matchData: any) => {
        try {
            await createMatch(matchData);
            setShowMatchForm(false);
            loadData();
            toast.success('Match created successfully!');
        } catch (error) {
            console.error('Error creating match:', error);
            toast.error('Failed to create match');
        }
    };

    const handleUpdateMatch = async (matchData: any) => {
        if (!editingMatch) return;
        try {
            await updateMatch(editingMatch.id, matchData);
            setShowMatchForm(false);
            setEditingMatch(null);
            loadData();
            toast.success('Match updated successfully!');
        } catch (error) {
            console.error('Error updating match:', error);
            toast.error('Failed to update match');
        }
    };

    const handleDeleteMatch = async (id: string) => {
        if (!confirm('Are you sure you want to delete this match?')) return;
        try {
            await deleteMatch(id);
            loadData();
            toast.success('Match deleted successfully!');
        } catch (error) {
            console.error('Error deleting match:', error);
            toast.error('Failed to delete match');
        }
    };

    const handleViewDetails = async (tournament: Tournament) => {
        try {
            const details = await getTournamentWithDetails(tournament.id);
            setSelectedTournament(details as any);
            setShowDetails(true);
        } catch (error) {
            console.error('Error loading tournament details:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'upcoming': return 'bg-blue-100 text-blue-800';
            case 'finished': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'live': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getSurfaceColor = (surface: string) => {
        switch (surface) {
            case 'Clay Court': return 'bg-orange-100 text-orange-800';
            case 'Grass Court': return 'bg-green-100 text-green-800';
            case 'Hard Court': return 'bg-blue-100 text-blue-800';
            case 'Indoor': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatTime = (timeString: string | null) => {
        if (!timeString) return 'TBD';
        const date = new Date(timeString);
        return date.toISOString().slice(0, 16).replace('T', ' ');
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">Tournament Management</h1>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Tournament Management</h1>
                    <p className="text-gray-600 mt-2">
                        Create tournaments, manage categories, and schedule matches
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowTournamentForm(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Create Tournament
                    </Button>
                    <Button
                        onClick={() => setShowMatchForm(true)}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Match
                    </Button>
                </div>
            </div>

            <TournamentModal
                isOpen={showTournamentForm}
                onClose={() => {
                    setShowTournamentForm(false);
                    setEditingTournament(null);
                }}
                tournament={editingTournament}
                onSubmit={editingTournament ? handleUpdateTournament : handleCreateTournament}
            />

            <MatchModal
                isOpen={showMatchForm}
                onClose={() => {
                    setShowMatchForm(false);
                    setEditingMatch(null);
                }}
                match={editingMatch}
                tournaments={tournaments}
                onSubmit={editingMatch ? handleUpdateMatch : handleCreateMatch}
            />

            {showDetails && selectedTournament && (
                <TournamentDetails
                    tournament={selectedTournament}
                    onClose={() => {
                        setShowDetails(false);
                        setSelectedTournament(null);
                    }}
                />
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger
                        value="tournaments"
                        className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                    >
                        <Trophy className="h-4 w-4 mr-2" />
                        Tournaments
                    </TabsTrigger>
                    <TabsTrigger
                        value="matches"
                        className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                    >
                        <Clock className="h-4 w-4 mr-2" />
                        All Matches
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="tournaments" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {tournaments.map((tournament) => (
                            <Card key={tournament.id} className="group hover:shadow-xl transition-all duration-200 border-0 shadow-md">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                                {tournament.name}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Badge className={`${getStatusColor(tournament.status)} text-xs font-medium px-2 py-1`}>
                                                    {tournament.status}
                                                </Badge>
                                                <Badge className={`${getSurfaceColor(tournament.surface)} text-xs font-medium px-2 py-1`}>
                                                    {tournament.surface}
                                                </Badge>
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
                                                <DropdownMenuItem onClick={() => handleViewDetails(tournament)}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    setEditingTournament(tournament);
                                                    setShowTournamentForm(true);
                                                }}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit Tournament
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteTournament(tournament.id)}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete Tournament
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-4">
                                        {tournament.description && (
                                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                                {tournament.description}
                                            </p>
                                        )}

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                                <Calendar className="h-4 w-4 text-gray-500" />
                                                <span className="font-medium">
                                                    {tournament.start_date} - {tournament.end_date}
                                                </span>
                                            </div>

                                            {tournament.location && (
                                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                                    <MapPin className="h-4 w-4 text-gray-500" />
                                                    <span className="font-medium">{tournament.location}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                                <Users className="h-4 w-4 text-gray-500" />
                                                <span className="font-medium">
                                                    {tournament.current_participants}
                                                    {tournament.max_participants && `/${tournament.max_participants}`} participants
                                                </span>
                                            </div>
                                        </div>

                                        {tournament.prize_pool && (
                                            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-green-800">Prize Pool</span>
                                                    <span className="text-lg font-bold text-green-600">
                                                        ${tournament.prize_pool.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {tournaments.length === 0 && (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No tournaments yet</h3>
                                <p className="text-gray-600 mb-4">
                                    Create your first tournament to get started
                                </p>
                                <Button onClick={() => setShowTournamentForm(true)}>
                                    Create Tournament
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="matches" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {matches.map((match) => (
                            <Card key={match.id} className="group hover:shadow-xl transition-all duration-200 border-0 shadow-md">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                                {match.player_a} vs {match.player_b}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Badge className={`${getStatusColor(match.status)} text-xs font-medium px-2 py-1`}>
                                                    {match.status}
                                                </Badge>
                                                {match.tournaments && (
                                                    <Badge variant="outline" className="text-xs font-medium px-2 py-1">
                                                        {match.tournaments.name}
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
                                                <DropdownMenuItem onClick={() => {
                                                    setEditingMatch(match);
                                                    setShowMatchForm(true);
                                                }}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit Match
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteMatch(match.id)}
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
                                        {match.tournaments && (
                                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                                <Trophy className="h-4 w-4 text-gray-500" />
                                                <span className="font-medium">{match.tournaments.name}</span>
                                                {match.tournaments.location && (
                                                    <span className="text-gray-500">• {match.tournaments.location}</span>
                                                )}
                                            </div>
                                        )}

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

                    {matches.length === 0 && (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
                                <p className="text-gray-600 mb-4">
                                    Create tournaments first, then add matches to them
                                </p>
                                <Button onClick={() => setActiveTab('tournaments')}>
                                    View Tournaments
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
} 