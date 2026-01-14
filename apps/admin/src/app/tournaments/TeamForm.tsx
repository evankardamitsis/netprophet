'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Team, TeamFormData } from '@/types';
import { fetchActivePlayers } from '@netprophet/lib';
import { Search } from 'lucide-react';

interface TeamFormProps {
    team?: Team | null;
    tournamentId: string;
    onSubmit: (data: TeamFormData) => void;
    onCancel: () => void;
}

export function TeamForm({ team, tournamentId, onSubmit, onCancel }: TeamFormProps) {
    const [formData, setFormData] = useState<TeamFormData>({
        name: '',
        captain_id: null,
        captain_name: null,
        member_ids: []
    });
    const [captainMode, setCaptainMode] = useState<'database' | 'manual'>('database');
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPlayers = async () => {
            try {
                setLoading(true);
                const fetchedPlayers = await fetchActivePlayers();
                setPlayers(fetchedPlayers);
            } catch (error) {
                console.error('Error loading players:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPlayers();
    }, []);

    useEffect(() => {
        if (team) {
            const hasCaptainId = team.captain_id !== null;
            setFormData({
                name: team.name,
                captain_id: team.captain_id || null,
                captain_name: team.captain_name || null,
                member_ids: team.members?.map(m => m.player_id) || []
            });
            setCaptainMode(hasCaptainId ? 'database' : 'manual');
        }
    }, [team]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert('Team name is required');
            return;
        }

        if (captainMode === 'database' && !formData.captain_id) {
            alert('Please select a team captain from the database');
            return;
        }

        if (captainMode === 'manual' && !formData.captain_name?.trim()) {
            alert('Please enter the team captain name');
            return;
        }

        // Clear the unused captain field
        const submitData: TeamFormData = {
            name: formData.name,
            captain_id: captainMode === 'database' ? formData.captain_id : null,
            captain_name: captainMode === 'manual' ? formData.captain_name : null,
            member_ids: formData.member_ids || [],
        };

        onSubmit(submitData);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleMemberToggle = (playerId: string) => {
        setFormData(prev => {
            const memberIds = prev.member_ids.includes(playerId)
                ? prev.member_ids.filter(id => id !== playerId)
                : [...prev.member_ids, playerId];

            return { ...prev, member_ids: memberIds };
        });
    };

    const selectedPlayers = players.filter(p => formData.member_ids.includes(p.id));
    const availablePlayers = useMemo(() => {
        const filtered = players.filter(p => !formData.member_ids.includes(p.id));
        if (!memberSearchTerm.trim()) return filtered;

        const searchLower = memberSearchTerm.toLowerCase();
        return filtered.filter(p =>
            p.firstName.toLowerCase().includes(searchLower) ||
            p.lastName.toLowerCase().includes(searchLower) ||
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchLower)
        );
    }, [players, formData.member_ids, memberSearchTerm]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6 border rounded-lg p-6 bg-white dark:bg-gray-900">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold">Team Name *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter team name"
                    className="h-12 text-base"
                    required
                />
            </div>

            <div className="space-y-3">
                <Label className="text-base font-semibold">Team Captain *</Label>

                {/* Captain Mode Toggle */}
                <div className="flex gap-2 mb-2">
                    <Button
                        type="button"
                        variant={captainMode === 'database' ? 'default' : 'outline'}
                        onClick={() => {
                            setCaptainMode('database');
                            setFormData(prev => ({ ...prev, captain_name: null }));
                        }}
                        className="flex-1"
                    >
                        Select from Database
                    </Button>
                    <Button
                        type="button"
                        variant={captainMode === 'manual' ? 'default' : 'outline'}
                        onClick={() => {
                            setCaptainMode('manual');
                            setFormData(prev => ({ ...prev, captain_id: null }));
                        }}
                        className="flex-1"
                    >
                        Enter Name Manually
                    </Button>
                </div>

                {/* Captain Selection */}
                {captainMode === 'database' ? (
                    loading ? (
                        <div className="h-12 flex items-center justify-center text-gray-500">
                            Loading players...
                        </div>
                    ) : (
                        <SearchableSelect
                            value={formData.captain_id || ''}
                            onValueChange={(value) => handleInputChange('captain_id', value)}
                            placeholder="Search and select team captain"
                            items={players.map(p => ({
                                value: p.id,
                                label: `${p.firstName} ${p.lastName} (NTRP ${p.ntrpRating.toFixed(1)})`
                            }))}
                            loading={loading}
                        />
                    )
                ) : (
                    <Input
                        value={formData.captain_name || ''}
                        onChange={(e) => handleInputChange('captain_name', e.target.value)}
                        placeholder="Enter captain name"
                        className="h-12 text-base"
                        required
                    />
                )}
                <p className="text-sm text-gray-500">
                    {captainMode === 'database'
                        ? 'Select a captain from the players database. The captain can be a team member or an outsider.'
                        : 'Enter the captain name if they are not in the players database.'}
                </p>
            </div>

            <div className="space-y-4">
                <Label className="text-base font-semibold">Team Members</Label>

                {/* Selected Members */}
                {selectedPlayers.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected Members ({selectedPlayers.length})</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                            {selectedPlayers.map((player) => (
                                <div
                                    key={player.id}
                                    className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
                                >
                                    <span className="text-sm">
                                        {player.firstName} {player.lastName}
                                        {formData.captain_id === player.id && (
                                            <span className="ml-2 text-xs font-bold text-blue-600 dark:text-blue-400">(Captain)</span>
                                        )}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleMemberToggle(player.id)}
                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    >
                                        ×
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Available Players */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Players</p>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="Search players by name..."
                            value={memberSearchTerm}
                            onChange={(e) => setMemberSearchTerm(e.target.value)}
                            className="pl-10 h-10"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                        {loading ? (
                            <div className="col-span-2 text-center py-4 text-gray-500">Loading players...</div>
                        ) : availablePlayers.length === 0 ? (
                            <div className="col-span-2 text-center py-4 text-gray-500">
                                {memberSearchTerm ? 'No players found matching your search' : 'All players are already in the team'}
                            </div>
                        ) : (
                            availablePlayers.map((player) => (
                                <button
                                    key={player.id}
                                    type="button"
                                    onClick={() => handleMemberToggle(player.id)}
                                    className="text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 transition-colors"
                                >
                                    <div className="text-sm font-medium">
                                        {player.firstName} {player.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        NTRP {player.ntrpRating.toFixed(1)} • {player.age} years
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel} className="h-12 px-6 text-base w-full sm:w-auto">
                    Cancel
                </Button>
                <Button type="submit" className="h-12 px-6 text-base w-full sm:w-auto">
                    {team ? 'Update Team' : 'Create Team'}
                </Button>
            </div>
        </form>
    );
}
