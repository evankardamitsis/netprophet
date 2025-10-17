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
    getTournamentWithDetails,
    TournamentPurchaseService
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
    const [purchaseCounts, setPurchaseCounts] = useState<Record<string, number>>({});
    const router = useRouter();

    useEffect(() => {
        loadTournaments();
    }, []);

    const loadTournaments = async () => {
        try {
            setLoading(true);
            const tournamentsData = await getTournaments();
            setTournaments(tournamentsData);

            // Load purchase counts for each tournament
            await loadPurchaseCounts(tournamentsData);
        } catch (error) {
            console.error('Error loading tournaments:', error);
            toast.error('Failed to load tournaments');
        } finally {
            setLoading(false);
        }
    };

    const loadPurchaseCounts = async (tournamentsData: Tournament[]) => {
        try {
            const counts: Record<string, number> = {};

            // Load purchase counts for all tournaments in parallel
            await Promise.all(
                tournamentsData.map(async (tournament) => {
                    const result = await TournamentPurchaseService.getTournamentPurchaseCount(tournament.id);
                    counts[tournament.id] = result.count;
                })
            );

            setPurchaseCounts(counts);
        } catch (error) {
            console.error('Error loading purchase counts:', error);
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
        <div className="min-h-screen bg-gray-50/50">
            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Mobile-First Header */}
                <div className="space-y-4">
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                            Tournament Management
                        </h1>
                        <p className="text-sm sm:text-base text-gray-600 mt-2">
                            Create and manage tournaments
                        </p>
                    </div>

                    {/* Mobile-Optimized Create Button */}
                    <div className="flex justify-center sm:justify-start">
                        <Button
                            onClick={() => setShowTournamentForm(true)}
                            className="flex items-center gap-2 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-3 px-6 text-base font-semibold"
                        >
                            <Plus className="h-5 w-5" />
                            Create Tournament
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

                {showDetails && selectedTournament && (
                    <TournamentDetails
                        tournament={selectedTournament}
                        onClose={() => {
                            setShowDetails(false);
                            setSelectedTournament(null);
                        }}
                    />
                )}

                {/* Mobile-Optimized Tournament Grid */}
                <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                    {tournaments.map((tournament) => (
                        <Card
                            key={tournament.id}
                            className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg cursor-pointer bg-white hover:bg-gray-50/50"
                            onClick={() => handleManageTournament(tournament.id)}
                        >
                            <CardHeader className="pb-3 sm:pb-4">
                                <div className="space-y-3">
                                    {/* Title and Badges */}
                                    <div className="space-y-3">
                                        <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors break-words leading-tight">
                                            {tournament.name}
                                        </CardTitle>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge className={`${getStatusColor(tournament.status)} text-xs font-medium px-3 py-1.5`}>
                                                {tournament.status}
                                            </Badge>
                                            <Badge className={`${getSurfaceColor(tournament.surface)} text-xs font-medium px-3 py-1.5`}>
                                                {tournament.surface}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Mobile-Optimized Actions */}
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleManageTournament(tournament.id);
                                                }}
                                                className="text-xs sm:text-sm h-8 px-3 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                            >
                                                <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                Manage
                                            </Button>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
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
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-4">
                                {/* Description */}
                                {tournament.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                        {tournament.description}
                                    </p>
                                )}

                                {/* Mobile-Optimized Info Grid */}
                                <div className="grid grid-cols-1 gap-3">
                                    {/* Date */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <span className="font-medium text-gray-700 break-words">
                                                {tournament.start_date} - {tournament.end_date}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    {tournament.location && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <span className="font-medium text-gray-700 break-words">
                                                    {tournament.location}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Participants */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <span className="font-medium text-gray-700">
                                                {tournament.current_participants}
                                                {tournament.max_participants && `/${tournament.max_participants}`} participants
                                            </span>
                                        </div>
                                    </div>

                                    {/* Buy-in */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <Trophy className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <span className="font-medium text-gray-700">
                                                Buy-in: {tournament.buy_in_fee || 0} 🌕
                                            </span>
                                        </div>
                                    </div>

                                    {/* Purchases */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <span className="font-medium text-gray-700">
                                                {purchaseCounts[tournament.id] || 0} users purchased access
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Prize Pool */}
                                {tournament.prize_pool && (
                                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-green-800">Prize Pool</span>
                                            <span className="text-lg font-bold text-green-600">
                                                ${tournament.prize_pool.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Empty State */}
                {tournaments.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-full p-6 mb-6">
                            <Trophy className="h-12 w-12 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No tournaments yet</h3>
                        <p className="text-gray-600 mb-6 text-center max-w-md">
                            Create your first tournament to get started with organizing matches and managing participants.
                        </p>
                        <Button
                            onClick={() => setShowTournamentForm(true)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Create Tournament
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
} 