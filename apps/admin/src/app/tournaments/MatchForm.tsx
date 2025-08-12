'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Match, Tournament, MatchFormData, Player } from '@/types';
import { fetchPlayers } from '@netprophet/lib/supabase/players';

interface MatchFormProps {
    match?: Match | null;
    tournaments: Tournament[];
    currentTournament?: Tournament | null; // For read-only tournament display
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export function MatchForm({ match, tournaments, currentTournament, onSubmit, onCancel }: MatchFormProps) {
    const [formData, setFormData] = useState<MatchFormData>({
        player_a_id: '',
        player_b_id: '',
        tournament_id: '',
        category_id: '',
        round: '',
        status: 'upcoming',
        start_time: '',
        lock_time: ''
    });

    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [startTime, setStartTime] = useState('10:00');
    const [lockDate, setLockDate] = useState<Date | undefined>(undefined);
    const [lockTime, setLockTime] = useState('09:40');

    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

    // Fetch players on component mount
    useEffect(() => {
        const loadPlayers = async () => {
            try {
                setLoading(true);
                const playersData = await fetchPlayers();
                setPlayers(playersData);
            } catch (error) {
                console.error('Error loading players:', error);
            } finally {
                setLoading(false);
            }
        };
        loadPlayers();
    }, []);

    useEffect(() => {
        if (match) {
            setFormData({
                player_a_id: match.player_a_id || '',
                player_b_id: match.player_b_id || '',
                tournament_id: match.tournament_id || '',
                category_id: match.category_id || 'none',
                round: match.round || '',
                status: match.status,
                start_time: match.start_time ? new Date(match.start_time).toISOString().slice(0, 16) : '',
                lock_time: match.lock_time ? new Date(match.lock_time).toISOString().slice(0, 16) : ''
            });

            if (match.start_time) {
                const startDateTime = new Date(match.start_time);
                setStartDate(startDateTime);
                setStartTime(startDateTime.toTimeString().slice(0, 5));
            }

            if (match.lock_time) {
                const lockDateTime = new Date(match.lock_time);
                setLockDate(lockDateTime);
                setLockTime(lockDateTime.toTimeString().slice(0, 5));
            }

            if (match.tournament_id) {
                const tournament = tournaments.find(t => t.id === match.tournament_id);
                setSelectedTournament(tournament || null);
            }
        } else if (currentTournament) {
            // Set the current tournament when creating a new match
            setFormData(prev => ({ ...prev, tournament_id: currentTournament.id }));
            setSelectedTournament(currentTournament);
        }
    }, [match, tournaments, currentTournament]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = {
            ...formData,
            tournament_id: formData.tournament_id === 'none' ? null : formData.tournament_id,
            category_id: formData.category_id === 'none' ? null : formData.category_id,
            round: formData.round || null,
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

    const handleStartDateChange = (date: Date | undefined) => {
        setStartDate(date);
        updateDateTimeFields();
    };

    const handleStartTimeChange = (time: string) => {
        setStartTime(time);
        updateDateTimeFields();
    };

    const updateDateTimeFields = () => {
        if (startDate && startTime) {
            const [hours, minutes] = startTime.split(':');
            const startDateTime = new Date(startDate);
            startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Calculate lock time (20 minutes before)
            const lockDateTime = new Date(startDateTime.getTime() - 20 * 60 * 1000);

            // Update form data
            setFormData(prev => ({
                ...prev,
                start_time: startDateTime.toISOString().slice(0, 16),
                lock_time: lockDateTime.toISOString().slice(0, 16)
            }));

            // Update lock date and time state
            setLockDate(lockDateTime);
            setLockTime(lockDateTime.toTimeString().slice(0, 5));
        }
    };

    // Update when startDate or startTime changes
    useEffect(() => {
        updateDateTimeFields();
    }, [startDate, startTime]);

    const getPlayerName = (playerId: string) => {
        const player = players.find(p => p.id === playerId);
        return player ? `${player.firstName} ${player.lastName}` : '';
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label htmlFor="player_a_id" className="text-base font-semibold">Player A *</Label>
                    <Select
                        value={formData.player_a_id}
                        onValueChange={(value) => handleInputChange('player_a_id', value)}
                        disabled={loading}
                    >
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder={loading ? "Loading players..." : "Select player A"} />
                        </SelectTrigger>
                        <SelectContent>
                            {players.map((player) => (
                                <SelectItem key={player.id} value={player.id} className="text-base py-3">
                                    {player.firstName} {player.lastName} (NTRP: {player.ntrpRating})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="player_b_id" className="text-base font-semibold">Player B *</Label>
                    <Select
                        value={formData.player_b_id}
                        onValueChange={(value) => handleInputChange('player_b_id', value)}
                        disabled={loading}
                    >
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder={loading ? "Loading players..." : "Select player B"} />
                        </SelectTrigger>
                        <SelectContent>
                            {players.map((player) => (
                                <SelectItem key={player.id} value={player.id} className="text-base py-3">
                                    {player.firstName} {player.lastName} (NTRP: {player.ntrpRating})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {currentTournament ? (
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Tournament</Label>
                        <Input
                            value={currentTournament.name}
                            disabled
                            className="h-12 text-base bg-gray-50"
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <Label htmlFor="tournament_id" className="text-base font-semibold">Tournament</Label>
                        <Select value={formData.tournament_id} onValueChange={(value) => handleInputChange('tournament_id', value)}>
                            <SelectTrigger className="h-12 text-base">
                                <SelectValue placeholder="Select a tournament (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none" className="text-base py-3">No Tournament</SelectItem>
                                {tournaments.map((tournament) => (
                                    <SelectItem key={tournament.id} value={tournament.id} className="text-base py-3">
                                        {tournament.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-3">
                    <Label htmlFor="category_id" className="text-base font-semibold">Category</Label>
                    <Select
                        value={formData.category_id}
                        onValueChange={(value) => handleInputChange('category_id', value)}
                        disabled={!selectedTournament}
                    >
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder={selectedTournament ? "Select a category" : "Select tournament first"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" className="text-base py-3">No Category</SelectItem>
                            {selectedTournament?.tournament_categories?.map((category) => (
                                <SelectItem key={category.id} value={category.id} className="text-base py-3">
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="status" className="text-base font-semibold">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="upcoming" className="text-base py-3">Upcoming</SelectItem>
                            <SelectItem value="live" className="text-base py-3">Live</SelectItem>
                            <SelectItem value="finished" className="text-base py-3">Finished</SelectItem>
                            <SelectItem value="cancelled" className="text-base py-3">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="round" className="text-base font-semibold">Round</Label>
                    <Input
                        id="round"
                        value={formData.round}
                        onChange={(e) => handleInputChange('round', e.target.value)}
                        placeholder="e.g., Final, Semi-Final, Quarter-Final"
                        className="h-12 text-base"
                    />
                </div>

                <div className="space-y-3">
                    <Label htmlFor="start_time" className="text-base font-semibold">Start Time</Label>
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-3">
                            <Label className="text-sm text-gray-600">Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-32 justify-between font-normal h-12 text-base"
                                    >
                                        {startDate ? startDate.toLocaleDateString() : "Select date"}
                                        <ChevronDownIcon className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        captionLayout="dropdown"
                                        onSelect={handleStartDateChange}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label className="text-sm text-gray-600">Time</Label>
                            <div className="flex items-center gap-2 h-12 px-3 border border-input rounded-md bg-background">
                                <Select value={startTime.split(':')[0]} onValueChange={(hour) => {
                                    const [_, minute] = startTime.split(':');
                                    handleStartTimeChange(`${hour.padStart(2, '0')}:${minute}`);
                                }}>
                                    <SelectTrigger className="w-16 h-8 border-0 p-0 bg-transparent">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                                {i.toString().padStart(2, '0')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-lg font-medium">:</span>
                                <Select value={startTime.split(':')[1]} onValueChange={(minute) => {
                                    const [hour] = startTime.split(':');
                                    handleStartTimeChange(`${hour}:${minute.padStart(2, '0')}`);
                                }}>
                                    <SelectTrigger className="w-16 h-8 border-0 p-0 bg-transparent">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <SelectItem key={i} value={(i * 5).toString().padStart(2, '0')}>
                                                {(i * 5).toString().padStart(2, '0')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="lock_time" className="text-base font-semibold">Lock Time</Label>
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-3">
                            <Label className="text-sm text-gray-600">Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-32 justify-between font-normal h-12 text-base"
                                    >
                                        {lockDate ? lockDate.toLocaleDateString() : "Select date"}
                                        <ChevronDownIcon className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={lockDate}
                                        captionLayout="dropdown"
                                        onSelect={(date) => {
                                            setLockDate(date);
                                            if (date && lockTime) {
                                                const [hours, minutes] = lockTime.split(':');
                                                const lockDateTime = new Date(date);
                                                lockDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    lock_time: lockDateTime.toISOString().slice(0, 16)
                                                }));
                                            }
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label className="text-sm text-gray-600">Time</Label>
                            <div className="flex items-center gap-2 h-12 px-3 border border-input rounded-md bg-background">
                                <Select value={lockTime.split(':')[0]} onValueChange={(hour) => {
                                    const [_, minute] = lockTime.split(':');
                                    const newTime = `${hour.padStart(2, '0')}:${minute}`;
                                    setLockTime(newTime);
                                    if (lockDate && newTime) {
                                        const [hours, minutes] = newTime.split(':');
                                        const lockDateTime = new Date(lockDate);
                                        lockDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                        setFormData(prev => ({
                                            ...prev,
                                            lock_time: lockDateTime.toISOString().slice(0, 16)
                                        }));
                                    }
                                }}>
                                    <SelectTrigger className="w-16 h-8 border-0 p-0 bg-transparent">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                                {i.toString().padStart(2, '0')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-lg font-medium">:</span>
                                <Select value={lockTime.split(':')[1]} onValueChange={(minute) => {
                                    const [hour] = lockTime.split(':');
                                    const newTime = `${hour}:${minute.padStart(2, '0')}`;
                                    setLockTime(newTime);
                                    if (lockDate && newTime) {
                                        const [hours, minutes] = newTime.split(':');
                                        const lockDateTime = new Date(lockDate);
                                        lockDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                        setFormData(prev => ({
                                            ...prev,
                                            lock_time: lockDateTime.toISOString().slice(0, 16)
                                        }));
                                    }
                                }}>
                                    <SelectTrigger className="w-16 h-8 border-0 p-0 bg-transparent">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <SelectItem key={i} value={(i * 5).toString().padStart(2, '0')}>
                                                {(i * 5).toString().padStart(2, '0')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-6">
                <Button type="button" variant="outline" onClick={onCancel} className="h-12 px-8 text-base">
                    Cancel
                </Button>
                <Button type="submit" className="h-12 px-8 text-base">
                    {match ? 'Update Match' : 'Create Match'}
                </Button>
            </div>
        </form>
    );
} 