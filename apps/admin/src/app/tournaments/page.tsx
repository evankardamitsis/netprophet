'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    getTournamentWithDetails
} from '@netprophet/lib';
import { Plus, Edit, Trash2, Eye, Calendar, MapPin, Trophy, Users, MoreHorizontal } from 'lucide-react';
import { TournamentModal } from './TournamentModal';
import { TournamentDetails } from './TournamentDetails';
import { TournamentForm } from './TournamentForm';
import { useRouter } from 'next/navigation';
import { Tournament } from '@/types';

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTournamentForm, setShowTournamentForm] = useState(false);
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const router = useRouter();

    useEffect(() => {
        loadTournaments();
    }, []);

    const loadTournaments = async () => {
        try {
            setLoading(true);
            const tournamentsData = await getTournaments();
            setTournaments(tournamentsData);
        } catch (error) {
            console.error('Error loading tournaments:', error);
            toast.error('Failed to load tournaments');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTournament = async (tournamentData: any) => {
        try {
            await createTournament(tournamentData);
            setShowTournamentForm(false);
            loadTournaments();
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
            loadTournaments();
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
            loadTournaments();
            toast.success('Tournament deleted successfully!');
        } catch (error) {
            console.error('Error deleting tournament:', error);
            toast.error('Failed to delete tournament');
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

    const handleManageTournament = (tournamentId: string) => {
        router.push(`/tournaments/${tournamentId}`);
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
                        Create and manage tournaments
                    </p>
                </div>
                <Button
                    onClick={() => setShowTournamentForm(true)}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Create Tournament
                </Button>
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

            {showDetails && selectedTournament && (
                <TournamentDetails
                    tournament={selectedTournament}
                    onClose={() => {
                        setShowDetails(false);
                        setSelectedTournament(null);
                    }}
                />
            )}

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
                                        <DropdownMenuItem onClick={() => handleManageTournament(tournament.id)}>
                                            <Trophy className="h-4 w-4 mr-2" />
                                            Manage Tournament
                                        </DropdownMenuItem>
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

                                <Button
                                    onClick={() => handleManageTournament(tournament.id)}
                                    className="w-full mt-4"
                                    variant="outline"
                                >
                                    <Trophy className="h-4 w-4 mr-2" />
                                    Manage Tournament
                                </Button>
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
        </div>
    );
} 