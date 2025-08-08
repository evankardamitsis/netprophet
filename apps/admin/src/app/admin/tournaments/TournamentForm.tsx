'use client';

import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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

interface TournamentFormProps {
    tournament?: Tournament | null;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export function TournamentForm({ tournament, onSubmit, onCancel }: TournamentFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'upcoming',
        surface: 'Hard Court',
        location: '',
        prize_pool: '',
        entry_fee: '0',
        max_participants: '',
        tournament_type: 'singles',
        format: 'knockout'
    });

    useEffect(() => {
        if (tournament) {
            setFormData({
                name: tournament.name,
                description: tournament.description || '',
                start_date: tournament.start_date,
                end_date: tournament.end_date,
                status: tournament.status,
                surface: tournament.surface,
                location: tournament.location || '',
                prize_pool: tournament.prize_pool?.toString() || '',
                entry_fee: tournament.entry_fee.toString(),
                max_participants: tournament.max_participants?.toString() || '',
                tournament_type: tournament.tournament_type,
                format: tournament.format
            });
        }
    }, [tournament]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = {
            ...formData,
            prize_pool: formData.prize_pool ? parseFloat(formData.prize_pool) : null,
            entry_fee: parseFloat(formData.entry_fee),
            max_participants: formData.max_participants ? parseInt(formData.max_participants) : null
        };

        onSubmit(submitData);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Tournament Name *</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter tournament name"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="finished">Finished</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange('end_date', e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="surface">Surface</Label>
                    <Select value={formData.surface} onValueChange={(value) => handleInputChange('surface', value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Hard Court">Hard Court</SelectItem>
                            <SelectItem value="Clay Court">Clay Court</SelectItem>
                            <SelectItem value="Grass Court">Grass Court</SelectItem>
                            <SelectItem value="Indoor">Indoor</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="Enter location"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tournament_type">Tournament Type</Label>
                    <Select value={formData.tournament_type} onValueChange={(value) => handleInputChange('tournament_type', value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="singles">Singles</SelectItem>
                            <SelectItem value="doubles">Doubles</SelectItem>
                            <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="format">Format</Label>
                    <Select value={formData.format} onValueChange={(value) => handleInputChange('format', value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="knockout">Knockout</SelectItem>
                            <SelectItem value="round_robin">Round Robin</SelectItem>
                            <SelectItem value="group_stage">Group Stage</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="prize_pool">Prize Pool ($)</Label>
                    <Input
                        id="prize_pool"
                        type="number"
                        value={formData.prize_pool}
                        onChange={(e) => handleInputChange('prize_pool', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="entry_fee">Entry Fee ($)</Label>
                    <Input
                        id="entry_fee"
                        type="number"
                        value={formData.entry_fee}
                        onChange={(e) => handleInputChange('entry_fee', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="max_participants">Max Participants</Label>
                    <Input
                        id="max_participants"
                        type="number"
                        value={formData.max_participants}
                        onChange={(e) => handleInputChange('max_participants', e.target.value)}
                        placeholder="Unlimited"
                        min="1"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter tournament description"
                    rows={3}
                />
            </div>

            <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">
                    {tournament ? 'Update Tournament' : 'Create Tournament'}
                </Button>
            </div>
        </form>
    );
} 