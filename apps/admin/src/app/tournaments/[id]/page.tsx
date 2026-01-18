'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
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
    getTournament,
    getTournamentWithDetails,
    updateTournament,
    deleteTournament,
    getTournamentCategories,
    createTournamentCategory,
    updateTournamentCategory,
    deleteTournamentCategory,
    getTournamentParticipants,
    getTournamentTeams,
    createTournamentTeam,
    updateTournamentTeam,
    deleteTournamentTeam
} from '@netprophet/lib/supabase/tournaments';
import { getMatchesByTournament, createMatch, updateMatch, deleteMatch, getMatches, calculateMatchOddsSecure, syncMatchesToWeb, removeMatchesFromWeb } from '@netprophet/lib/supabase/matches';
import { supabase } from '@netprophet/lib';
import { ArrowLeft, Settings, Plus, Trophy, Clock, Tag, BarChart3, Edit, Trash2, Users } from 'lucide-react';
import { MatchModal } from '../MatchModal';
import { TournamentModal } from '../TournamentModal';
import { CategoryModal } from '../CategoryModal';
import { WarningModal } from '@/components/ui/warning-modal';
import { TournamentOverview } from './components/TournamentOverview';
import { TournamentMatches } from './components/TournamentMatches';
import { TournamentCategories } from './components/TournamentCategories';
import { TournamentTeams } from './components/TournamentTeams';
import { ParticipantsTable } from './components/ParticipantsTable';
import { getStatusColor, getSurfaceColor, getGenderColor, formatTime } from './utils/tournamentHelpers';
import { Tournament, Match, Category, TournamentParticipant, Team } from '@/types';
import { CategoryForm } from '../CategoryForm';
import { TeamModal } from '../TeamModal';
import { PlayerOddsData, MatchContext, calculateOdds } from '@netprophet/lib';

export default function TournamentPage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMatchForm, setShowMatchForm] = useState(false);
    const [showTournamentForm, setShowTournamentForm] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [showDeleteWarning, setShowDeleteWarning] = useState(false);
    const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [activeTab, setActiveTab] = useState<string>('overview');
    const [creatingMatch, setCreatingMatch] = useState(false);



    const loadTournamentData = useCallback(async () => {
        try {
            setLoading(true);

            // Load tournament with details (including categories), matches, and participants in parallel
            const [tournamentData, matchesData, participantsData] = await Promise.all([
                getTournamentWithDetails(tournamentId),
                getMatchesByTournament(tournamentId),
                getTournamentParticipants(tournamentId)
            ]);

            // Ensure boolean conversion - handle various truthy values
            const tournamentWithBoolean = {
                ...tournamentData,
                is_team_tournament: tournamentData.is_team_tournament === true || tournamentData.is_team_tournament === 'true' || tournamentData.is_team_tournament === 1
            };
            setTournament(tournamentWithBoolean as Tournament);
            setMatches(matchesData as any);
            setParticipants(participantsData as any);

            // Set categories from the tournament data if available
            if (tournamentData.tournament_categories) {
                setCategories(tournamentData.tournament_categories as any);
            }

            // Load teams if this is a team tournament
            if (tournamentData.is_team_tournament) {
                try {
                    const teamsData = await getTournamentTeams(tournamentId);
                    // Map team_members to members for consistency with TypeScript interface
                    const mappedTeams = teamsData?.map((team: any) => ({
                        ...team,
                        members: team.team_members || []
                    })) || [];
                    setTeams(mappedTeams as any);
                } catch (error) {
                    console.error('Error loading teams:', error);
                    // Don't show error toast, teams might not exist yet
                }
            }
        } catch (error) {
            console.error('Error loading tournament data:', error);
            toast.error('Failed to load tournament data');
        } finally {
            setLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        if (tournamentId) {
            loadTournamentData();
        }
    }, [tournamentId]); // Removed loadTournamentData from dependencies

    // Initialize active tab from localStorage or URL params
    useEffect(() => {
        const savedTab = localStorage.getItem(`tournament-${tournamentId}-tab`);
        if (savedTab && ['overview', 'matches', 'categories', 'participants'].includes(savedTab)) {
            setActiveTab(savedTab);
        }
    }, [tournamentId]);

    // Save active tab to localStorage whenever it changes
    useEffect(() => {
        if (tournamentId && activeTab) {
            localStorage.setItem(`tournament-${tournamentId}-tab`, activeTab);
        }
    }, [activeTab, tournamentId]);

    const handleUpdateTournament = async (tournamentData: any) => {
        if (!tournament) return;
        try {
            await updateTournament(tournament.id, tournamentData);
            setShowTournamentForm(false);
            setEditingTournament(null);
            loadTournamentData();
            toast.success('Tournament updated successfully!');
        } catch (error) {
            console.error('Error updating tournament:', error);
            toast.error('Failed to update tournament');
        }
    };

    const handleDeleteTournament = async () => {
        if (!tournament || !confirm('Are you sure you want to delete this tournament?')) return;
        try {
            await deleteTournament(tournament.id);
            toast.success('Tournament deleted successfully!');
            router.push('/tournaments');
        } catch (error) {
            console.error('Error deleting tournament:', error);
            toast.error('Failed to delete tournament');
        }
    };

    const handleCreateMatch = async (matchData: any) => {
        try {
            setCreatingMatch(true);

            // Ensure the match is associated with this tournament
            const matchWithTournament = {
                ...matchData,
                tournament_id: tournamentId
            };
            const createdMatch = await createMatch(matchWithTournament);
            setShowMatchForm(false);

            // Automatically calculate odds for the new match
            try {
                await calculateMatchOddsSecure([createdMatch.id]);
                toast.success('Match created successfully with automatic odds calculation!');
            } catch (oddsError) {
                console.error('Failed to calculate odds automatically:', oddsError);
                toast.success('Match created successfully! (Odds calculation failed - you can calculate odds manually later)');
            }

            loadTournamentData();
        } catch (error) {
            console.error('Error creating match:', error);
            toast.error('Failed to create match');
        } finally {
            setCreatingMatch(false);
        }
    };

    const handleUpdateMatch = async (matchData: any) => {
        if (!editingMatch) return;
        try {
            await updateMatch(editingMatch.id, matchData);
            setShowMatchForm(false);
            setEditingMatch(null);
            loadTournamentData();
            toast.success('Match updated successfully!');
        } catch (error) {
            console.error('Error updating match:', error);
            toast.error('Failed to update match');
        }
    };

    const handleDeleteMatch = async (id: string) => {
        setMatchToDelete(id);
        setShowDeleteWarning(true);
    };

    const confirmDeleteMatch = async () => {
        if (!matchToDelete) return;
        try {
            await deleteMatch(matchToDelete);
            loadTournamentData();
            toast.success('Match deleted successfully!');
        } catch (error) {
            console.error('Error deleting match:', error);
            toast.error('Failed to delete match');
        } finally {
            setShowDeleteWarning(false);
            setMatchToDelete(null);
        }
    };

    const handleBulkDeleteMatches = async (matchIds: string[]) => {
        const results = await Promise.allSettled(
            matchIds.map(id => deleteMatch(id))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        // Log failed deletions for debugging
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Failed to delete match ${matchIds[index]}:`, result.reason);
            }
        });

        loadTournamentData();

        if (failed === 0) {
            toast.success(`${successful} match${successful !== 1 ? 'es' : ''} deleted successfully!`);
        } else if (successful > 0) {
            toast.warning(`${successful} match${successful !== 1 ? 'es' : ''} deleted, ${failed} failed`);
        } else {
            toast.error(`Failed to delete matches. They may have already been deleted.`);
        }
    };

    const handleCreateCategory = async (categoryData: any) => {
        try {
            await createTournamentCategory({
                ...categoryData,
                tournament_id: tournamentId
            });
            setShowCategoryForm(false);
            loadTournamentData();
            toast.success('Category created successfully!');
        } catch (error) {
            console.error('Error creating category:', error);
            toast.error('Failed to create category');
        }
    };

    const handleUpdateCategory = async (categoryData: any) => {
        if (!editingCategory) return;
        try {
            await updateTournamentCategory(editingCategory.id, categoryData);
            setShowCategoryForm(false);
            setEditingCategory(null);
            loadTournamentData();
            toast.success('Category updated successfully!');
        } catch (error) {
            console.error('Error updating category:', error);
            toast.error('Failed to update category');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
            await deleteTournamentCategory(id);
            loadTournamentData();
            toast.success('Category deleted successfully!');
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error('Failed to delete category');
        }
    };

    const handleCreateTeam = async (teamData: any) => {
        try {
            await createTournamentTeam({
                ...teamData,
                tournament_id: tournamentId
            });
            setShowTeamForm(false);
            loadTournamentData();
            toast.success('Team created successfully!');
        } catch (error) {
            console.error('Error creating team:', error);
            toast.error('Failed to create team');
        }
    };

    const handleUpdateTeam = async (teamData: any) => {
        if (!editingTeam) return;
        try {
            await updateTournamentTeam(editingTeam.id, teamData);
            setShowTeamForm(false);
            setEditingTeam(null);
            loadTournamentData();
            toast.success('Team updated successfully!');
        } catch (error) {
            console.error('Error updating team:', error);
            toast.error('Failed to update team');
        }
    };

    const handleDeleteTeam = async (id: string) => {
        if (!confirm('Are you sure you want to delete this team?')) return;
        try {
            await deleteTournamentTeam(id);
            loadTournamentData();
            toast.success('Team deleted successfully!');
        } catch (error) {
            console.error('Error deleting team:', error);
            toast.error('Failed to delete team');
        }
    };

    const handleCalculateOdds = async (matchIds: string[]) => {
        try {
            // Call the secure API to calculate odds
            const result = await calculateMatchOddsSecure(matchIds);

            // Reload tournament data to show updated odds
            loadTournamentData();

            // Show success message with results
            const successCount = result.results.filter((r: any) => r.success).length;
            const errorCount = result.results.filter((r: any) => !r.success).length;

            if (successCount > 0) {
                toast.success(`Odds calculated for ${successCount} match(es)!`);
            }

            if (errorCount > 0) {
                toast.error(`${errorCount} match(es) failed to calculate odds`);
            }
        } catch (error) {
            console.error('Error calculating odds:', error);
            toast.error('Failed to calculate odds: ' + (error as Error).message);
        }
    };

    const handleSyncToWeb = async (matchIds: string[]) => {
        try {
            // Call the sync API to push selected matches to web app
            const result = await syncMatchesToWeb(matchIds);

            // Reload tournament data to show updated sync status
            loadTournamentData();

            // Show success message
            toast.success(`Successfully synced ${result.matchesCount} matches to web app!`);
        } catch (error) {
            console.error('Error syncing matches:', error);
            toast.error('Failed to sync matches: ' + (error as Error).message);
        }
    };

    const handleRemoveFromWeb = async (matchIds: string[]) => {
        try {
            // Call the remove API to remove selected matches from web app
            const result = await removeMatchesFromWeb(matchIds);

            // Reload tournament data to show updated sync status
            loadTournamentData();

            // Show success message
            toast.success(`Successfully removed ${result.matchesCount} matches from web app!`);
        } catch (error) {
            console.error('Error removing matches from web:', error);
            toast.error('Failed to remove matches from web: ' + (error as Error).message);
        }
    };

    const handleRunMatchAutomation = async () => {
        try {
            // Call the database automation function directly
            const { error } = await (supabase.rpc as any)('process_match_automation');

            if (error) {
                console.error('Error running match automation:', error);
                toast.error('Failed to run match automation: ' + error.message);
                return;
            }

            // Reload tournament data to show updated status
            loadTournamentData();

            toast.success('Match automation completed successfully!');
        } catch (error) {
            console.error('Error running match automation:', error);
            toast.error('Failed to run match automation: ' + (error as Error).message);
        }
    };



    const handleUpdateMatchStatus = async (matchId: string, status: string) => {
        try {
            // Find the match to get its current data
            const match = matches.find(m => m.id === matchId);
            if (!match) {
                toast.error('Match not found');
                return;
            }

            // Update only the status field
            await updateMatch(matchId, { status });

            // Reload tournament data to show updated status
            loadTournamentData();

            toast.success(`Match status updated to ${status}!`);
        } catch (error) {
            console.error('Error updating match status:', error);
            toast.error('Failed to update match status');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" onClick={() => router.push('/tournaments')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Tournaments
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" onClick={() => router.push('/tournaments')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Tournaments
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
                    <Card>
                        <CardContent className="p-6 sm:p-12 text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Tournament not found</h3>
                            <p className="text-gray-600 mb-4">
                                The tournament you&apos;re looking for doesn&apos;t exist
                            </p>
                            <Button onClick={() => router.push('/tournaments')}>
                                Back to Tournaments
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Mobile-Optimized Header Section */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    {/* Mobile-First Back Button */}
                    <div className="mb-6">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/tournaments')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="font-medium">Back to Tournaments</span>
                        </Button>
                    </div>

                    {/* Tournament Title Section */}
                    <div className="space-y-6">
                        <div className="text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                                    {tournament?.name}
                                </h1>
                                <Badge className={`${getSurfaceColor(tournament?.surface || '')} text-sm font-semibold px-4 py-2 w-fit mx-auto sm:mx-0`}>
                                    {tournament?.surface}
                                </Badge>
                            </div>
                            <p className="text-gray-600 text-sm sm:text-base">Tournament Management</p>
                        </div>

                        {/* Mobile-Optimized Action Buttons */}
                        <div className="space-y-3">
                            {/* Primary Actions */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={() => setShowMatchForm(true)}
                                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-3 px-6 text-base font-semibold w-full sm:w-auto"
                                >
                                    <Plus className="h-5 w-5" />
                                    Add Match
                                </Button>
                                <Button
                                    onClick={handleRunMatchAutomation}
                                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-3 px-6 text-base font-semibold w-full sm:w-auto"
                                >
                                    <Clock className="h-5 w-5" />
                                    Run Automation
                                </Button>
                            </div>

                            {/* Settings Dropdown */}
                            <div className="flex justify-center sm:justify-start">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="border-gray-300 hover:bg-gray-50 px-6 py-3 text-base font-semibold"
                                        >
                                            <Settings className="h-5 w-5 mr-2" />
                                            Settings
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 shadow-xl border-0">
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setEditingTournament(tournament);
                                                setShowTournamentForm(true);
                                            }}
                                            className="py-3 px-4 text-base"
                                        >
                                            <Edit className="h-4 w-4 mr-3" />
                                            Edit Tournament
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setShowMatchForm(true)}
                                            className="py-3 px-4 text-base"
                                        >
                                            <Plus className="h-4 w-4 mr-3" />
                                            Add Match
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setEditingCategory(null);
                                                setShowCategoryForm(true);
                                            }}
                                            className="py-3 px-4 text-base"
                                        >
                                            <Tag className="h-4 w-4 mr-3" />
                                            Add Category
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={handleDeleteTournament}
                                            className="text-red-600 focus:text-red-600 py-3 px-4 text-base"
                                        >
                                            <Trash2 className="h-4 w-4 mr-3" />
                                            Delete Tournament
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Mobile-Optimized Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    {/* Mobile Tabs - Horizontal Scroll */}
                    <div className="lg:hidden mb-6">
                        <div className="flex overflow-x-auto scrollbar-hide pb-2">
                            <TabsList className="flex gap-2 min-w-max px-1 bg-transparent border-0 p-0">
                                <TabsTrigger
                                    value="overview"
                                    className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl transition-all duration-200 bg-white border border-gray-200 shadow-sm data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 hover:bg-gray-50"
                                >
                                    <BarChart3 className="h-4 w-4 flex-shrink-0" />
                                    <span>Overview</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="matches"
                                    className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl transition-all duration-200 bg-white border border-gray-200 shadow-sm data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 hover:bg-gray-50"
                                >
                                    <Trophy className="h-4 w-4 flex-shrink-0" />
                                    <span>Matches</span>
                                    {matches.length > 0 && (
                                        <Badge variant="secondary" className="ml-1 text-xs flex-shrink-0 bg-blue-100 text-blue-700 px-2 py-0.5">
                                            {matches.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="categories"
                                    className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl transition-all duration-200 bg-white border border-gray-200 shadow-sm data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 hover:bg-gray-50"
                                >
                                    <Tag className="h-4 w-4 flex-shrink-0" />
                                    <span>Categories</span>
                                    {categories.length > 0 && (
                                        <Badge variant="secondary" className="ml-1 text-xs flex-shrink-0 bg-blue-100 text-blue-700 px-2 py-0.5">
                                            {categories.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="participants"
                                    className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl transition-all duration-200 bg-white border border-gray-200 shadow-sm data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 hover:bg-gray-50"
                                >
                                    <Users className="h-4 w-4 flex-shrink-0" />
                                    <span>Participants</span>
                                    {participants.length > 0 && (
                                        <Badge variant="secondary" className="ml-1 text-xs flex-shrink-0 bg-blue-100 text-blue-700 px-2 py-0.5">
                                            {participants.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    {/* Desktop Tabs - Grid Layout */}
                    <div className="hidden lg:block">
                        <TabsList className="grid w-full grid-cols-4 bg-gray-50 border border-gray-200 shadow-sm p-1 rounded-xl mb-6">
                            <TabsTrigger
                                value="overview"
                                className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm"
                            >
                                <BarChart3 className="h-4 w-4 flex-shrink-0" />
                                <span>Overview</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="matches"
                                className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm"
                            >
                                <Trophy className="h-4 w-4 flex-shrink-0" />
                                <span>Matches</span>
                                {matches.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 text-xs flex-shrink-0 bg-blue-100 text-blue-700 px-2 py-0.5">
                                        {matches.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            {tournament?.is_team_tournament ? (
                                <TabsTrigger
                                    value="teams"
                                    className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm"
                                >
                                    <Users className="h-4 w-4 flex-shrink-0" />
                                    <span>Teams</span>
                                    {teams.length > 0 && (
                                        <Badge variant="secondary" className="ml-1 text-xs flex-shrink-0 bg-blue-100 text-blue-700 px-2 py-0.5">
                                            {teams.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            ) : (
                                <TabsTrigger
                                    value="categories"
                                    className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm"
                                >
                                    <Tag className="h-4 w-4 flex-shrink-0" />
                                    <span>Categories</span>
                                    {categories.length > 0 && (
                                        <Badge variant="secondary" className="ml-1 text-xs flex-shrink-0 bg-blue-100 text-blue-700 px-2 py-0.5">
                                            {categories.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            )}
                            <TabsTrigger
                                value="participants"
                                className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm"
                            >
                                <Users className="h-4 w-4 flex-shrink-0" />
                                <span>Participants</span>
                                {participants.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 text-xs flex-shrink-0 bg-blue-100 text-blue-700 px-2 py-0.5">
                                        {participants.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="overview" className="mt-0">
                        {tournament && (
                            <TournamentOverview
                                tournament={tournament}
                                matches={matches}
                                participants={participants}
                                teams={teams}
                                onAddMatch={() => setShowMatchForm(true)}
                                onViewAllMatches={() => { }}
                                getStatusColor={getStatusColor}
                                getSurfaceColor={getSurfaceColor}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="matches" className="mt-0">
                        <TournamentMatches
                            matches={matches}
                            onAddMatch={() => setShowMatchForm(true)}
                            onEditMatch={(match) => {
                                setEditingMatch(match);
                                setShowMatchForm(true);
                            }}
                            onDeleteMatch={handleDeleteMatch}
                            onBulkDeleteMatches={handleBulkDeleteMatches}
                            onCalculateOdds={handleCalculateOdds}
                            onSyncToWeb={handleSyncToWeb}
                            onRemoveFromWeb={handleRemoveFromWeb}
                            onUpdateMatchStatus={handleUpdateMatchStatus}
                            getStatusColor={getStatusColor}
                            formatTime={formatTime}
                            onAddResult={(match) => {
                                // Navigate to match-results page with the match ID
                                router.push(`/match-results?matchId=${match.id}`);
                            }}
                        />
                    </TabsContent>

                    {tournament?.is_team_tournament ? (
                        <TabsContent value="teams" className="mt-0">
                            <TournamentTeams
                                teams={teams}
                                onAddTeam={() => {
                                    setEditingTeam(null);
                                    setShowTeamForm(true);
                                }}
                                onEditTeam={(team) => {
                                    setEditingTeam(team);
                                    setShowTeamForm(true);
                                }}
                                onDeleteTeam={handleDeleteTeam}
                            />
                        </TabsContent>
                    ) : (
                        <TabsContent value="categories" className="mt-0">
                            <TournamentCategories
                                categories={categories}
                                onAddCategory={() => {
                                    setEditingCategory(null);
                                    setShowCategoryForm(true);
                                }}
                                onEditCategory={(category) => {
                                    setEditingCategory(category);
                                    setShowCategoryForm(true);
                                }}
                                onDeleteCategory={handleDeleteCategory}
                                getGenderColor={getGenderColor}
                            />
                        </TabsContent>
                    )}

                    <TabsContent value="participants" className="mt-0">
                        {tournament ? (
                            <ParticipantsTable
                                participants={participants}
                                tournamentName={tournament.name}
                                matches={matches}
                                isTeamTournament={tournament.is_team_tournament === true}
                                teams={teams}
                            />
                        ) : (
                            <div className="text-center py-8">Loading tournament data...</div>
                        )}
                    </TabsContent>


                </Tabs>

                {/* Mobile-Optimized Modals */}
                {tournament && (
                    <MatchModal
                        isOpen={showMatchForm}
                        onClose={() => {
                            setShowMatchForm(false);
                            setEditingMatch(null);
                        }}
                        match={editingMatch}
                        tournaments={[tournament]}
                        currentTournament={tournament}
                        categories={categories}
                        onSubmit={editingMatch ? handleUpdateMatch : handleCreateMatch}
                        isSubmitting={creatingMatch}
                    />
                )}

                <TournamentModal
                    isOpen={showTournamentForm}
                    onClose={() => {
                        setShowTournamentForm(false);
                        setEditingTournament(null);
                    }}
                    tournament={editingTournament}
                    onSubmit={handleUpdateTournament}
                />

                <CategoryModal
                    isOpen={showCategoryForm}
                    onClose={() => {
                        setShowCategoryForm(false);
                        setEditingCategory(null);
                    }}
                    category={editingCategory}
                    onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
                />

                {tournament && (
                    <TeamModal
                        isOpen={showTeamForm}
                        onClose={() => {
                            setShowTeamForm(false);
                            setEditingTeam(null);
                        }}
                        tournamentId={tournamentId}
                        team={editingTeam}
                        onSubmit={editingTeam ? handleUpdateTeam : handleCreateTeam}
                    />
                )}

                <WarningModal
                    isOpen={showDeleteWarning}
                    onClose={() => {
                        setShowDeleteWarning(false);
                        setMatchToDelete(null);
                    }}
                    onConfirm={confirmDeleteMatch}
                    title="Delete Match"
                    description="Are you sure you want to delete this match? This action cannot be undone."
                    confirmText="Delete Match"
                    cancelText="Cancel"
                    variant="destructive"
                />
            </div>
        </div>
    );
}