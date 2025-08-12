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
    getTournamentWithDetails,
    updateTournament,
    deleteTournament,
    getTournamentCategories,
    createTournamentCategory,
    updateTournamentCategory,
    deleteTournamentCategory
} from '@netprophet/lib/supabase/tournaments';
import { getMatchesByTournament, createMatch, updateMatch, deleteMatch, getMatches } from '@netprophet/lib/supabase/matches';
import { ArrowLeft, Settings, Plus, Trophy, Clock, Tag, BarChart3, Edit, Trash2 } from 'lucide-react';
import { MatchModal } from '../MatchModal';
import { TournamentModal } from '../TournamentModal';
import { CategoryForm } from '../CategoryForm';
import { TournamentOverview } from './components/TournamentOverview';
import { TournamentMatches } from './components/TournamentMatches';
import { TournamentCategories } from './components/TournamentCategories';
import { TournamentSettings } from './components/TournamentSettings';
import { getStatusColor, getSurfaceColor, getGenderColor, formatTime } from './utils/tournamentHelpers';
import { Tournament, Match, Category } from '@/types';
import router from 'next/router';

export default function TournamentPage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMatchForm, setShowMatchForm] = useState(false);
    const [showTournamentForm, setShowTournamentForm] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const loadTournamentData = useCallback(async () => {
        try {
            setLoading(true);
            const [tournamentData, matchesData, categoriesData] = await Promise.all([
                getTournamentWithDetails(tournamentId),
                getMatchesByTournament(tournamentId),
                getTournamentCategories(tournamentId)
            ]);

            setTournament(tournamentData as Tournament);
            setMatches(matchesData);
            setCategories(categoriesData);
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
    }, [tournamentId, loadTournamentData]);

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
            // Ensure the match is associated with this tournament
            const matchWithTournament = {
                ...matchData,
                tournament_id: tournamentId
            };
            await createMatch(matchWithTournament);
            setShowMatchForm(false);
            loadTournamentData();
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
            loadTournamentData();
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
            loadTournamentData();
            toast.success('Match deleted successfully!');
        } catch (error) {
            console.error('Error deleting match:', error);
            toast.error('Failed to delete match');
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" onClick={() => router.push('/tournaments')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Tournaments
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" onClick={() => router.push('/tournaments')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Tournaments
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Card>
                        <CardContent className="p-12 text-center">
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
        <div className="min-h-screen bg-gray-50">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => router.push('/tournaments')}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Back to Tournaments</span>
                            </Button>
                            <div className="border-l border-gray-300 h-6 hidden sm:block"></div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{tournament.name}</h1>
                                <p className="text-sm text-gray-600 mt-1">Tournament Management</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setShowMatchForm(true)}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">Add Match</span>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="border-gray-300">
                                        <Settings className="h-4 w-4 mr-2" />
                                        <span className="hidden sm:inline">Settings</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => {
                                        setEditingTournament(tournament);
                                        setShowTournamentForm(true);
                                    }}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Tournament
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleDeleteTournament}
                                        className="text-red-600 focus:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Tournament
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <MatchModal
                    isOpen={showMatchForm}
                    onClose={() => {
                        setShowMatchForm(false);
                        setEditingMatch(null);
                    }}
                    match={editingMatch}
                    tournaments={[tournament]}
                    currentTournament={tournament}
                    onSubmit={editingMatch ? handleUpdateMatch : handleCreateMatch}
                />

                <TournamentModal
                    isOpen={showTournamentForm}
                    onClose={() => {
                        setShowTournamentForm(false);
                        setEditingTournament(null);
                    }}
                    tournament={editingTournament}
                    onSubmit={handleUpdateTournament}
                />

                {showCategoryForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <CategoryForm
                                category={editingCategory}
                                onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
                                onCancel={() => {
                                    setShowCategoryForm(false);
                                    setEditingCategory(null);
                                }}
                            />
                        </div>
                    </div>
                )}

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg mb-8">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            <span className="hidden sm:inline">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="matches" className="flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            <span className="hidden sm:inline">Matches</span>
                            {matches.length > 0 && (
                                <Badge variant="secondary" className="ml-1">
                                    {matches.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="categories" className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            <span className="hidden sm:inline">Categories</span>
                            {categories.length > 0 && (
                                <Badge variant="secondary" className="ml-1">
                                    {categories.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">Settings</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6">
                        <div className="text-sm text-gray-500 mb-4">Overview tab is active: overview</div>
                        <TournamentOverview
                            tournament={tournament}
                            matches={matches}
                            onAddMatch={() => setShowMatchForm(true)}
                            onViewAllMatches={() => { }}
                            getStatusColor={getStatusColor}
                            getSurfaceColor={getSurfaceColor}
                        />
                    </TabsContent>

                    <TabsContent value="matches" className="mt-6">
                        <div className="text-sm text-gray-500 mb-4">Matches tab is active: matches</div>
                        <TournamentMatches
                            matches={matches}
                            onAddMatch={() => setShowMatchForm(true)}
                            onEditMatch={(match) => {
                                setEditingMatch(match);
                                setShowMatchForm(true);
                            }}
                            onDeleteMatch={handleDeleteMatch}
                            getStatusColor={getStatusColor}
                            formatTime={formatTime}
                        />
                    </TabsContent>

                    <TabsContent value="categories" className="mt-6">
                        <div className="text-sm text-gray-500 mb-4">Categories tab is active: categories</div>
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

                    <TabsContent value="settings" className="mt-6">
                        <div className="text-sm text-gray-500 mb-4">Settings tab is active: settings</div>
                        <TournamentSettings
                            tournament={tournament}
                            onEditTournament={() => {
                                setEditingTournament(tournament);
                                setShowTournamentForm(true);
                            }}
                            onAddMatch={() => setShowMatchForm(true)}
                            onAddCategory={() => {
                                setEditingCategory(null);
                                setShowCategoryForm(true);
                            }}
                            onDeleteTournament={handleDeleteTournament}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
} 