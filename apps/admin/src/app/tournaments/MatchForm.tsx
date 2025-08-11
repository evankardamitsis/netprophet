'use client';

import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Match {
    id: string;
    player_a: string;
    player_b: string;
    tournament_id: string | null;
    category_id: string | null;
    round: string | null;
    court_number: number | null;
    status: string;
    start_time: string | null;
    lock_time: string | null;
    points_value: number;
    odds_a: number | null;
    odds_b: number | null;
}

interface Tournament {
    id: string;
    name: string;
    tournament_categories?: Array<{
        id: string;
        name: string;
    }>;
}

interface MatchFormProps {
    match?: Match | null;
    tournaments: Tournament[];
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export function MatchForm({ match, tournaments, onSubmit, onCancel }: MatchFormProps) {
    const [formData, setFormData] = useState({
        player_a: '',
        player_b: '',
        tournament_id: '',
        category_id: '',
        round: '',
        court_number: '',
        status: 'upcoming',
        start_time: '',
        lock_time: '',
        points_value: '100'
    });

    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

    useEffect(() => {
        if (match) {
            setFormData({
                player_a: match.player_a,
                player_b: match.player_b,
                tournament_id: match.tournament_id || 'none',
                category_id: match.category_id || 'none',
                round: match.round || '',
                court_number: match.court_number?.toString() || '',
                status: match.status,
                start_time: match.start_time ? new Date(match.start_time).toISOString().slice(0, 16) : '',
                lock_time: match.lock_time ? new Date(match.lock_time).toISOString().slice(0, 16) : '',
                points_value: match.points_value.toString()
            });

            if (match.tournament_id) {
                const tournament = tournaments.find(t => t.id === match.tournament_id);
                setSelectedTournament(tournament || null);
            }
        }
    }, [match, tournaments]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = {
            ...formData,
            tournament_id: formData.tournament_id === 'none' ? null : formData.tournament_id,
            category_id: formData.category_id === 'none' ? null : formData.category_id,
            round: formData.round || null,
            court_number: formData.court_number ? parseInt(formData.court_number) : null,
            points_value: parseInt(formData.points_value),
            odds_a: null, // Will be calculated automatically
            odds_b: null  // Will be calculated automatically
        };

        onSubmit(submitData);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        if (field === 'tournament_id') {
            const tournament = tournaments.find(t => t.id === value);
            setSelectedTournament(tournament || null);
            // Reset category when tournament changes
            setFormData(prev => ({ ...prev, category_id: 'none' }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="player_a">Player A *</Label>
                    <Input
                        id="player_a"
                        value={formData.player_a}
                        onChange={(e) => handleInputChange('player_a', e.target.value)}
                        placeholder="Enter player A name"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="player_b">Player B *</Label>
                    <Input
                        id="player_b"
                        value={formData.player_b}
                        onChange={(e) => handleInputChange('player_b', e.target.value)}
                        placeholder="Enter player B name"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tournament_id">Tournament</Label>
                    <Select value={formData.tournament_id} onValueChange={(value) => handleInputChange('tournament_id', value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a tournament (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No Tournament</SelectItem>
                            {tournaments.map((tournament) => (
                                <SelectItem key={tournament.id} value={tournament.id}>
                                    {tournament.name}
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
                        disabled={!selectedTournament}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={selectedTournament ? "Select a category" : "Select tournament first"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No Category</SelectItem>
                            {selectedTournament?.tournament_categories?.map((category) => (
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
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                            <SelectItem value="finished">Finished</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="round">Round</Label>
                    <Input
                        id="round"
                        value={formData.round}
                        onChange={(e) => handleInputChange('round', e.target.value)}
                        placeholder="e.g., Final, Semi-Final, Quarter-Final"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                        id="start_time"
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => handleInputChange('start_time', e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lock_time">Lock Time</Label>
                    <Input
                        id="lock_time"
                        type="datetime-local"
                        value={formData.lock_time}
                        onChange={(e) => handleInputChange('lock_time', e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="court_number">Court Number</Label>
                    <Input
                        id="court_number"
                        type="number"
                        value={formData.court_number}
                        onChange={(e) => handleInputChange('court_number', e.target.value)}
                        placeholder="Court number"
                        min="1"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="points_value">Points Value</Label>
                    <Input
                        id="points_value"
                        type="number"
                        value={formData.points_value}
                        onChange={(e) => handleInputChange('points_value', e.target.value)}
                        placeholder="100"
                        min="1"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">
                    {match ? 'Update Match' : 'Create Match'}
                </Button>
            </div>
        </form>
    );
} 