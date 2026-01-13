'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Team, TeamFormData } from '@/types';
import { fetchActivePlayers } from '@netprophet/lib';

interface TeamFormProps {
    team?: Team | null;
    tournamentId: string;
    onSubmit: (data: TeamFormData) => void;
    onCancel: () => void;
}

export function TeamForm({ team, tournamentId, onSubmit, onCancel }: TeamFormProps) {
    const [formData, setFormData] = useState<TeamFormData>({
        name: '',
        captain_id: '',
        member_ids: []
    });
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
            setFormData({
                name: team.name,
                captain_id: team.captain_id || '',
                member_ids: team.members?.map(m => m.player_id) || []
            });
        }
    }, [team]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert('Team name is required');
            return;
        }

        if (!formData.captain_id) {
            alert('Please select a team captain');
            return;
        }

        // Ensure captain is in member list
        const memberIds = formData.member_ids.includes(formData.captain_id)
            ? formData.member_ids
            : [...formData.member_ids, formData.captain_id];

        onSubmit({
            ...formData,
            member_ids: memberIds
        });
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
    const availablePlayers = players.filter(p => !formData.member_ids.includes(p.id));

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

            <div className="space-y-2">
                <Label htmlFor="captain_id" className="text-base font-semibold">Team Captain *</Label>
                <Select
                    value={formData.captain_id}
                    onValueChange={(value) => handleInputChange('captain_id', value)}
                >
                    <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Select team captain" />
                    </SelectTrigger>
                    <SelectContent>
                        {players.map((player) => (
                            <SelectItem
                                key={player.id}
                                value={player.id}
                                className="text-base py-3"
                            >
                                {player.firstName} {player.lastName} (NTRP {player.ntrpRating.toFixed(1)})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">The captain must be a team member</p>
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
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Players</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                        {loading ? (
                            <div className="col-span-2 text-center py-4 text-gray-500">Loading players...</div>
                        ) : availablePlayers.length === 0 ? (
                            <div className="col-span-2 text-center py-4 text-gray-500">All players are already in the team</div>
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
