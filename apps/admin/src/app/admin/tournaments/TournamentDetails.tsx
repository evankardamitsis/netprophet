'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Calendar,
    MapPin,
    Trophy,
    Users,
    DollarSign,
    X,
    Plus,
    Edit,
    Trash2
} from 'lucide-react';
import {
    getTournamentCategories,
    createTournamentCategory,
    updateTournamentCategory,
    deleteTournamentCategory,
    getTournamentParticipants,
    addTournamentParticipant,
    updateTournamentParticipant,
    removeTournamentParticipant,
    getAvailablePlayers
} from '@netprophet/lib';
import { CategoryForm } from './CategoryForm';
import { ParticipantForm } from './ParticipantForm';

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
    tournament_categories?: any[];
    tournament_participants?: any[];
}

interface TournamentDetailsProps {
    tournament: Tournament;
    onClose: () => void;
}

export function TournamentDetails({ tournament, onClose }: TournamentDetailsProps) {
    const [categories, setCategories] = useState<any[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [showParticipantForm, setShowParticipantForm] = useState(false);
    const [editingParticipant, setEditingParticipant] = useState<any>(null);

    useEffect(() => {
        loadTournamentData();
    }, [tournament.id]);

    const loadTournamentData = async () => {
        try {
            setLoading(true);
            const [categoriesData, participantsData, availablePlayersData] = await Promise.all([
                getTournamentCategories(tournament.id),
                getTournamentParticipants(tournament.id),
                getAvailablePlayers(tournament.id)
            ]);

            setCategories(categoriesData);
            setParticipants(participantsData);
            setAvailablePlayers(availablePlayersData);
        } catch (error) {
            console.error('Error loading tournament data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCategory = async (categoryData: any) => {
        try {
            await createTournamentCategory({
                ...categoryData,
                tournament_id: tournament.id
            });
            setShowCategoryForm(false);
            loadTournamentData();
        } catch (error) {
            console.error('Error creating category:', error);
        }
    };

    const handleUpdateCategory = async (categoryData: any) => {
        if (!editingCategory) return;
        try {
            await updateTournamentCategory(editingCategory.id, categoryData);
            setShowCategoryForm(false);
            setEditingCategory(null);
            loadTournamentData();
        } catch (error) {
            console.error('Error updating category:', error);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
            await deleteTournamentCategory(id);
            loadTournamentData();
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    const handleAddParticipant = async (participantData: any) => {
        try {
            await addTournamentParticipant({
                ...participantData,
                tournament_id: tournament.id
            });
            setShowParticipantForm(false);
            loadTournamentData();
        } catch (error) {
            console.error('Error adding participant:', error);
        }
    };

    const handleUpdateParticipant = async (participantData: any) => {
        if (!editingParticipant) return;
        try {
            await updateTournamentParticipant(editingParticipant.id, participantData);
            setShowParticipantForm(false);
            setEditingParticipant(null);
            loadTournamentData();
        } catch (error) {
            console.error('Error updating participant:', error);
        }
    };

    const handleRemoveParticipant = async (id: string) => {
        if (!confirm('Are you sure you want to remove this participant?')) return;
        try {
            await removeTournamentParticipant(id);
            loadTournamentData();
        } catch (error) {
            console.error('Error removing participant:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'upcoming': return 'bg-blue-100 text-blue-800';
            case 'finished': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{tournament.name}</h2>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge className={getStatusColor(tournament.status)}>
                                    {tournament.status}
                                </Badge>
                                <Badge className={getSurfaceColor(tournament.surface)}>
                                    {tournament.surface}
                                </Badge>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-gray-600 mb-2">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-sm font-medium">Dates</span>
                                </div>
                                <p className="text-sm">
                                    {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                                </p>
                            </CardContent>
                        </Card>

                        {tournament.location && (
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                                        <MapPin className="h-4 w-4" />
                                        <span className="text-sm font-medium">Location</span>
                                    </div>
                                    <p className="text-sm">{tournament.location}</p>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-gray-600 mb-2">
                                    <Users className="h-4 w-4" />
                                    <span className="text-sm font-medium">Participants</span>
                                </div>
                                <p className="text-sm">
                                    {tournament.current_participants}
                                    {tournament.max_participants && `/${tournament.max_participants}`}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {tournament.description && (
                        <Card className="mb-6">
                            <CardContent className="p-4">
                                <p className="text-gray-700">{tournament.description}</p>
                            </CardContent>
                        </Card>
                    )}

                    <Tabs defaultValue="categories" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="categories">Categories</TabsTrigger>
                            <TabsTrigger value="participants">Participants</TabsTrigger>
                        </TabsList>

                        <TabsContent value="categories" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Tournament Categories</h3>
                                <Button
                                    onClick={() => setShowCategoryForm(true)}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Category
                                </Button>
                            </div>

                            {showCategoryForm && (
                                <CategoryForm
                                    category={editingCategory}
                                    onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
                                    onCancel={() => {
                                        setShowCategoryForm(false);
                                        setEditingCategory(null);
                                    }}
                                />
                            )}

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {categories.map((category) => (
                                    <Card key={category.id}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <CardTitle className="text-base">{category.name}</CardTitle>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingCategory(category);
                                                            setShowCategoryForm(true);
                                                        }}
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteCategory(category.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="space-y-2 text-sm">
                                                {category.description && (
                                                    <p className="text-gray-600">{category.description}</p>
                                                )}
                                                <div className="flex justify-between">
                                                    <span>Participants: {category.current_participants}</span>
                                                    <span className="text-green-600">
                                                        ${category.entry_fee} entry
                                                    </span>
                                                </div>
                                                {category.prize_pool && (
                                                    <div className="text-green-600 font-medium">
                                                        ${category.prize_pool} prize pool
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {categories.length === 0 && (
                                <Card>
                                    <CardContent className="p-8 text-center">
                                        <p className="text-gray-500">No categories created yet</p>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="participants" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Tournament Participants</h3>
                                <Button
                                    onClick={() => setShowParticipantForm(true)}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Participant
                                </Button>
                            </div>

                            {showParticipantForm && (
                                <ParticipantForm
                                    participant={editingParticipant}
                                    categories={categories}
                                    availablePlayers={availablePlayers}
                                    onSubmit={editingParticipant ? handleUpdateParticipant : handleAddParticipant}
                                    onCancel={() => {
                                        setShowParticipantForm(false);
                                        setEditingParticipant(null);
                                    }}
                                />
                            )}

                            <div className="space-y-2">
                                {participants.map((participant) => (
                                    <Card key={participant.id}>
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <p className="font-medium">
                                                            {participant.players?.first_name} {participant.players?.last_name}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            NTRP: {participant.players?.ntrp_rating} | Age: {participant.players?.age}
                                                        </p>
                                                    </div>
                                                    {participant.tournament_categories && (
                                                        <Badge variant="outline">
                                                            {participant.tournament_categories.name}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={getStatusColor(participant.status)}>
                                                        {participant.status}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingParticipant(participant);
                                                            setShowParticipantForm(true);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveParticipant(participant.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {participants.length === 0 && (
                                <Card>
                                    <CardContent className="p-8 text-center">
                                        <p className="text-gray-500">No participants registered yet</p>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
} 