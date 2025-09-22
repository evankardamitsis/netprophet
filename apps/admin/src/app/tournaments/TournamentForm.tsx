'use client';

import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tournament, TournamentFormData } from '@/types';

interface TournamentFormProps {
    tournament?: Tournament | null;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export function TournamentForm({ tournament, onSubmit, onCancel }: TournamentFormProps) {
    const [formData, setFormData] = useState<TournamentFormData>({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'upcoming',
        surface: tournament?.surface || '',
        location: '',
        prize_pool: '',
        entry_fee: '0',
        buy_in_fee: '0',
        max_participants: '',
        tournament_type: 'singles',
        format: 'knockout',
        matches_type: tournament?.matches_type || 'best-of-3'
    });

    useEffect(() => {
        if (tournament) {
            setFormData({
                name: tournament.name,
                description: tournament.description || '',
                start_date: tournament.start_date,
                end_date: tournament.end_date,
                status: tournament.status,
                surface: tournament.surface || '',
                location: tournament.location || '',
                prize_pool: tournament.prize_pool?.toString() || '',
                entry_fee: tournament.entry_fee?.toString() || '',
                buy_in_fee: tournament.buy_in_fee?.toString() || '0',
                max_participants: tournament.max_participants?.toString() || '',
                tournament_type: tournament.tournament_type,
                format: tournament.format,
                matches_type: tournament.matches_type || 'best-of-3'
            });
        }
    }, [tournament]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate and convert numeric fields
        const buyInFee = formData.buy_in_fee === '' ? 0 : parseInt(formData.buy_in_fee, 10);
        const entryFee = formData.entry_fee === '' ? 0 : parseFloat(formData.entry_fee);
        const prizePool = formData.prize_pool === '' ? null : parseFloat(formData.prize_pool);
        const maxParticipants = formData.max_participants === '' ? null : parseInt(formData.max_participants, 10);

        // Validate that buy_in_fee is a valid non-negative integer
        if (isNaN(buyInFee) || buyInFee < 0 || !Number.isInteger(buyInFee)) {
            alert('Buy-in fee must be a valid non-negative integer');
            return;
        }

        // Validate matches_type
        const validMatchesTypes = ['best-of-3', 'best-of-5', 'best-of-3-super-tiebreak'];
        if (!formData.matches_type || !validMatchesTypes.includes(formData.matches_type)) {
            alert('Please select a valid matches type');
            return;
        }

        const submitData = {
            ...formData,
            prize_pool: prizePool,
            entry_fee: entryFee,
            buy_in_fee: buyInFee,
            max_participants: maxParticipants
        };


        onSubmit(submitData);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-base font-semibold">Tournament Name *</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter tournament name"
                        className="h-12 text-base"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status" className="text-base font-semibold">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="upcoming" className="text-base py-3">Upcoming</SelectItem>
                            <SelectItem value="active" className="text-base py-3">Active</SelectItem>
                            <SelectItem value="finished" className="text-base py-3">Finished</SelectItem>
                            <SelectItem value="cancelled" className="text-base py-3">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-base font-semibold">Start Date *</Label>
                    <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                        className="h-12 text-base"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="end_date" className="text-base font-semibold">End Date *</Label>
                    <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange('end_date', e.target.value)}
                        className="h-12 text-base"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="surface" className="text-base font-semibold">Surface</Label>
                    <Select
                        value={formData.surface || ''}
                        onValueChange={(value) => handleInputChange('surface', value)}
                    >
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Select surface" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Hard Court" className="text-base py-3">Hard Court</SelectItem>
                            <SelectItem value="Clay Court" className="text-base py-3">Clay Court</SelectItem>
                            <SelectItem value="Grass Court" className="text-base py-3">Grass Court</SelectItem>
                            <SelectItem value="Indoor" className="text-base py-3">Indoor</SelectItem>
                        </SelectContent>
                    </Select>

                </div>

                <div className="space-y-2">
                    <Label htmlFor="location" className="text-base font-semibold">Location</Label>
                    <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="Enter location"
                        className="h-12 text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tournament_type" className="text-base font-semibold">Tournament Type</Label>
                    <Select value={formData.tournament_type} onValueChange={(value) => handleInputChange('tournament_type', value)}>
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="singles" className="text-base py-3">Singles</SelectItem>
                            <SelectItem value="doubles" className="text-base py-3">Doubles</SelectItem>
                            <SelectItem value="mixed" className="text-base py-3">Mixed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="format" className="text-base font-semibold">Format</Label>
                    <Select value={formData.format} onValueChange={(value) => handleInputChange('format', value)}>
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="knockout" className="text-base py-3">Knockout</SelectItem>
                            <SelectItem value="round_robin" className="text-base py-3">Round Robin</SelectItem>
                            <SelectItem value="group_stage" className="text-base py-3">Group Stage</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="matches_type" className="text-base font-semibold">Matches Type</Label>
                    <Select
                        key={`matches-type-${tournament?.id || 'new'}-${formData.matches_type}`}
                        value={formData.matches_type || tournament?.matches_type || 'best-of-3'}
                        onValueChange={(value) => handleInputChange('matches_type', value)}
                    >
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Select matches type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="best-of-3" className="text-base py-3">Best of 3</SelectItem>
                            <SelectItem value="best-of-5" className="text-base py-3">Best of 5</SelectItem>
                            <SelectItem value="best-of-3-super-tiebreak" className="text-base py-3">Best of 3 with Super Tiebreak</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="prize_pool" className="text-base font-semibold">Prize Pool ($)</Label>
                    <Input
                        id="prize_pool"
                        type="number"
                        value={formData.prize_pool}
                        onChange={(e) => handleInputChange('prize_pool', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="h-12 text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="entry_fee" className="text-base font-semibold">Entry Fee ($)</Label>
                    <Input
                        id="entry_fee"
                        type="number"
                        value={formData.entry_fee}
                        onChange={(e) => handleInputChange('entry_fee', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="h-12 text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="buy_in_fee" className="text-base font-semibold">Buy-in Fee (Coins)</Label>
                    <Input
                        id="buy_in_fee"
                        type="number"
                        value={formData.buy_in_fee}
                        onChange={(e) => handleInputChange('buy_in_fee', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="1"
                        className="h-12 text-base"
                        required
                    />
                    <p className="text-sm text-gray-500">Coins required to place predictions on tournament matches. Set to 0 for free tournament.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="max_participants" className="text-base font-semibold">Max Participants</Label>
                    <Input
                        id="max_participants"
                        type="number"
                        value={formData.max_participants}
                        onChange={(e) => handleInputChange('max_participants', e.target.value)}
                        placeholder="Unlimited"
                        min="1"
                        className="h-12 text-base"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter tournament description"
                    rows={4}
                    className="text-base resize-none"
                />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
                <Button type="button" variant="outline" onClick={onCancel} className="h-12 px-6 sm:px-8 text-base w-full sm:w-auto">
                    Cancel
                </Button>
                <Button type="submit" className="h-12 px-6 sm:px-8 text-base w-full sm:w-auto">
                    {tournament ? 'Update Tournament' : 'Create Tournament'}
                </Button>
            </div>
        </form>
    );
} 