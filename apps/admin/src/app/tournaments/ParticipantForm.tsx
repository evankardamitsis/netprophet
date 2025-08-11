'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category, Player, Participant } from '@/types';

interface ParticipantFormProps {
    participant?: Participant | null;
    categories: Category[];
    availablePlayers: Player[];
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export function ParticipantForm({
    participant,
    categories,
    availablePlayers,
    onSubmit,
    onCancel
}: ParticipantFormProps) {
    const [formData, setFormData] = useState({
        player_id: '',
        category_id: '',
        status: 'registered',
        seed_position: '',
        final_position: '',
        points_earned: '0'
    });

    useEffect(() => {
        if (participant) {
            setFormData({
                player_id: participant.player_id,
                category_id: participant.category_id || 'none',
                status: participant.status,
                seed_position: participant.seed_position?.toString() || '',
                final_position: participant.final_position?.toString() || '',
                points_earned: participant.points_earned.toString()
            });
        }
    }, [participant]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = {
            ...formData,
            category_id: formData.category_id === 'none' ? null : formData.category_id,
            seed_position: formData.seed_position ? parseInt(formData.seed_position) : null,
            final_position: formData.final_position ? parseInt(formData.final_position) : null,
            points_earned: parseInt(formData.points_earned)
        };

        onSubmit(submitData);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const getPlayerName = (playerId: string) => {
        const player = availablePlayers.find(p => p.id === playerId);
        return player ? `${player.first_name} ${player.last_name}` : '';
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>
                    {participant ? 'Edit Participant' : 'Add New Participant'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="player_id">Player *</Label>
                            <Select
                                value={formData.player_id}
                                onValueChange={(value) => handleInputChange('player_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a player" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availablePlayers.map((player) => (
                                        <SelectItem key={player.id} value={player.id}>
                                            {player.first_name} {player.last_name} (NTRP: {player.ntrp_rating}, Age: {player.age})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category_id">Category</Label>
                            <Select
                                value={formData.category_id}
                                onValueChange={(value) => handleInputChange('category_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Category</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="registered">Registered</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                    <SelectItem value="disqualified">Disqualified</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="seed_position">Seed Position</Label>
                            <Input
                                id="seed_position"
                                type="number"
                                value={formData.seed_position}
                                onChange={(e) => handleInputChange('seed_position', e.target.value)}
                                placeholder="Unseeded"
                                min="1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="final_position">Final Position</Label>
                            <Input
                                id="final_position"
                                type="number"
                                value={formData.final_position}
                                onChange={(e) => handleInputChange('final_position', e.target.value)}
                                placeholder="Not finished"
                                min="1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="points_earned">Points Earned</Label>
                            <Input
                                id="points_earned"
                                type="number"
                                value={formData.points_earned}
                                onChange={(e) => handleInputChange('points_earned', e.target.value)}
                                placeholder="0"
                                min="0"
                            />
                        </div>
                    </div>

                    {formData.player_id && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Selected Player</h4>
                            <p className="text-sm text-gray-600">
                                {getPlayerName(formData.player_id)}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!formData.player_id}>
                            {participant ? 'Update Participant' : 'Add Participant'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
} 