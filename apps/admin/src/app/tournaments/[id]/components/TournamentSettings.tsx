'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Edit, Trash2, Plus, Tag } from 'lucide-react';
import { Tournament } from '@/types';

interface TournamentSettingsProps {
    tournament: Tournament;
    onEditTournament: () => void;
    onAddMatch: () => void;
    onAddCategory: () => void;
    onDeleteTournament: () => void;
}

export function TournamentSettings({
    tournament,
    onEditTournament,
    onAddMatch,
    onAddCategory,
    onDeleteTournament
}: TournamentSettingsProps) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tournament Settings</h2>
                <p className="text-gray-600">Manage tournament configuration and settings</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-100">
                        <CardTitle className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <Settings className="h-5 w-5 text-gray-600" />
                            </div>
                            Tournament Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Type</div>
                                    <div className="text-sm text-gray-900">{tournament.tournament_type}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Format</div>
                                    <div className="text-sm text-gray-900">{tournament.format}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Entry Fee</div>
                                    <div className="text-sm text-gray-900">${tournament.entry_fee}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Max Participants</div>
                                    <div className="text-sm text-gray-900">{tournament.max_participants || 'Unlimited'}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                        <CardTitle className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Settings className="h-5 w-5 text-blue-600" />
                            </div>
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-3">
                            <Button
                                variant="outline"
                                className="w-full justify-start h-12"
                                onClick={onEditTournament}
                            >
                                <Edit className="h-4 w-4 mr-3" />
                                Edit Tournament
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start h-12"
                                onClick={onAddMatch}
                            >
                                <Plus className="h-4 w-4 mr-3" />
                                Add Match
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start h-12"
                                onClick={onAddCategory}
                            >
                                <Tag className="h-4 w-4 mr-3" />
                                Add Category
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start h-12 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                onClick={onDeleteTournament}
                            >
                                <Trash2 className="h-4 w-4 mr-3" />
                                Delete Tournament
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 