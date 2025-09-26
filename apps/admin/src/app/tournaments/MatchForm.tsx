'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDownIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Match, Tournament, Player } from '@/types';
import { fetchActivePlayers } from '@netprophet/lib/supabase/players';

// Zod schema for form validation
const matchFormSchema = z.object({
    player_a_id: z.string().min(1, 'Player A is required'),
    player_b_id: z.string().min(1, 'Player B is required'),
    tournament_id: z.string().optional(),
    category_id: z.string().optional(),
    round: z.enum(['Round of 64', 'Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals']).optional(),
    status: z.enum(['upcoming', 'live', 'finished', 'cancelled']),
    start_time: z.string().min(1, 'Start time is required'),
    lock_time: z.string().optional(),
});

type MatchFormData = z.infer<typeof matchFormSchema>;

interface MatchFormProps {
    match?: Match | null;
    tournaments: Tournament[];
    currentTournament?: Tournament | null;
    categories?: Array<{ id: string; name: string }>;
    onSubmit: (data: any) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function MatchForm({ match, tournaments, currentTournament, categories, onSubmit, onCancel, isSubmitting }: MatchFormProps) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(false);
    const [playersError, setPlayersError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [startTime, setStartTime] = useState(() => {
        if (match?.start_time) {
            const startDateTime = new Date(match.start_time);
            return startDateTime.toTimeString().slice(0, 5);
        }
        return '21:00';
    });
    const [lockDate, setLockDate] = useState<Date | undefined>(undefined);
    const [lockTime, setLockTime] = useState(() => {
        if (match?.lock_time) {
            const lockDateTime = new Date(match.lock_time);
            return lockDateTime.toTimeString().slice(0, 5);
        }
        return '20:40';
    });

    // Prepare default values based on match or currentTournament
    const getDefaultValues = (): MatchFormData => {
        if (match) {
            // Edit mode - use match data
            const startDateTime = match.start_time ? new Date(match.start_time) : undefined;
            const lockDateTime = match.lock_time ? new Date(match.lock_time) : undefined;

            return {
                player_a_id: match.player_a_id || match.player_a?.id || '',
                player_b_id: match.player_b_id || match.player_b?.id || '',
                tournament_id: match.tournament_id || '',
                category_id: match.category_id || '',
                round: match.round || undefined,
                status: match.status as 'upcoming' | 'live' | 'finished' | 'cancelled',
                start_time: match.start_time ? new Date(match.start_time).toISOString().slice(0, 16) : '',
                lock_time: match.lock_time ? new Date(match.lock_time).toISOString().slice(0, 16) : '',
            };
        } else if (currentTournament) {
            // Create mode - use current tournament
            return {
                player_a_id: '',
                player_b_id: '',
                tournament_id: currentTournament.id,
                category_id: '',
                round: undefined,
                status: 'upcoming',
                start_time: '',
                lock_time: '',
            };
        } else {
            // Default empty form
            return {
                player_a_id: '',
                player_b_id: '',
                tournament_id: '',
                category_id: '',
                round: undefined,
                status: 'upcoming',
                start_time: '',
                lock_time: '',
            };
        }
    };

    // React Hook Form setup with dynamic default values
    const form = useForm<MatchFormData>({
        resolver: zodResolver(matchFormSchema),
        defaultValues: getDefaultValues(),
    });

    const { watch, setValue, formState: { errors } } = form;
    const watchedValues = watch();

    // Fetch players once on mount
    useEffect(() => {
        const loadPlayers = async () => {
            try {
                setLoading(true);
                setPlayersError(null);
                const playersData = await fetchActivePlayers();
                setPlayers(playersData);
            } catch (error) {
                console.error('Error loading players:', error);
                setPlayersError('Failed to load players. Please check your Supabase configuration.');
            } finally {
                setLoading(false);
            }
        };
        loadPlayers();
    }, []);


    // Initialize date/time states when match changes
    useEffect(() => {
        if (match?.start_time) {
            const startDateTime = new Date(match.start_time);
            setStartDate(startDateTime);
            setStartTime(startDateTime.toTimeString().slice(0, 5));
        }

        if (match?.lock_time) {
            const lockDateTime = new Date(match.lock_time);
            setLockDate(lockDateTime);
            setLockTime(lockDateTime.toTimeString().slice(0, 5));
        }
    }, [match?.id]);

    // Handle tournament selection
    const handleTournamentChange = (tournamentId: string) => {
        setValue('tournament_id', tournamentId);
        setValue('category_id', ''); // Reset category when tournament changes
    };

    // Time picker handlers
    const handleStartDateChange = (date: Date | undefined) => {
        setStartDate(date);
        if (date && startTime && startTime !== '00:00') {
            const [hours, minutes] = startTime.split(':');
            const startDateTime = new Date(date);
            startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Calculate lock time (20 minutes before)
            const lockDateTime = new Date(startDateTime.getTime() - 20 * 60 * 1000);

            // Update form data
            setValue('start_time', startDateTime.toISOString().slice(0, 16));
            setValue('lock_time', lockDateTime.toISOString().slice(0, 16));

            // Update lock date and time state
            setLockDate(lockDateTime);
            setLockTime(lockDateTime.toTimeString().slice(0, 5));
        }
    };

    const handleStartTimeChange = (time: string) => {
        setStartTime(time);
        if (startDate && time && time !== '00:00') {
            const [hours, minutes] = time.split(':');
            const startDateTime = new Date(startDate);
            startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Calculate lock time (20 minutes before)
            const lockDateTime = new Date(startDateTime.getTime() - 20 * 60 * 1000);

            // Update form data
            setValue('start_time', startDateTime.toISOString().slice(0, 16));
            setValue('lock_time', lockDateTime.toISOString().slice(0, 16));

            // Update lock date and time state
            setLockDate(lockDateTime);
            setLockTime(lockDateTime.toTimeString().slice(0, 5));
        }
    };

    // Handle form submission
    const handleSubmit = form.handleSubmit((data) => {
        // Convert empty strings to null for UUID fields
        const submitData = {
            ...data,
            player_a_id: data.player_a_id || null,
            player_b_id: data.player_b_id || null,
            tournament_id: data.tournament_id === 'none' || !data.tournament_id ? null : data.tournament_id,
            category_id: data.category_id === 'none' || !data.category_id ? null : data.category_id,
            round: data.round || null,
            // Preserve existing odds when editing, only set to null for new matches
            odds_a: match?.odds_a || null,
            odds_b: match?.odds_b || null
        };

        onSubmit(submitData);
    });

    // Transform players to searchable select items
    const playerItems = players.map((player) => ({
        value: player.id,
        label: `${player.firstName} ${player.lastName} (NTRP: ${player.ntrpRating})`
    }));

    return (
        <form onSubmit={handleSubmit} className="space-y-8 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SearchableSelect
                    value={watchedValues.player_a_id || ''}
                    onValueChange={(value) => setValue('player_a_id', value)}
                    placeholder="Select player A"
                    label="Player A *"
                    disabled={loading}
                    error={errors.player_a_id?.message as string | null}
                    items={playerItems}
                    loading={loading}
                    loadingText="Loading players..."
                    errorText={playersError}
                />

                <SearchableSelect
                    value={watchedValues.player_b_id || ''}
                    onValueChange={(value) => setValue('player_b_id', value)}
                    placeholder="Select player B"
                    label="Player B *"
                    disabled={loading}
                    error={errors.player_b_id?.message as string | null}
                    items={playerItems}
                    loading={loading}
                    loadingText="Loading players..."
                    errorText={playersError}
                />

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
                        <Select
                            value={watchedValues.tournament_id || 'none'}
                            onValueChange={handleTournamentChange}
                        >
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
                        value={watchedValues.category_id || 'none'}
                        onValueChange={(value) => setValue('category_id', value)}
                        disabled={!watchedValues.tournament_id}
                    >
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder={watchedValues.tournament_id ? "Select a category" : "Select tournament first"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" className="text-base py-3">No Category</SelectItem>
                            {categories?.map((category) => (
                                <SelectItem key={category.id} value={category.id} className="text-base py-3">
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="status" className="text-base font-semibold">Status</Label>
                    <Select
                        value={watchedValues.status}
                        onValueChange={(value) => setValue('status', value as any)}
                    >
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
                    <Select
                        value={form.watch('round') || ''}
                        onValueChange={(value) => form.setValue('round', value as 'Round of 64' | 'Round of 32' | 'Round of 16' | 'Quarterfinals' | 'Semifinals' | 'Finals')}
                    >
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Select round" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Round of 64">Round of 64</SelectItem>
                            <SelectItem value="Round of 32">Round of 32</SelectItem>
                            <SelectItem value="Round of 16">Round of 16</SelectItem>
                            <SelectItem value="Quarterfinals">Quarterfinals</SelectItem>
                            <SelectItem value="Semifinals">Semifinals</SelectItem>
                            <SelectItem value="Finals">Finals</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="start_time" className="text-base font-semibold">Start Time *</Label>
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
                                <Select
                                    value={startTime && startTime !== '00:00' ? startTime.split(':')[0] : '21'}
                                    onValueChange={(hour) => {
                                        const [_, minute] = startTime && startTime !== '00:00' ? startTime.split(':') : ['21', '00'];
                                        handleStartTimeChange(`${hour.padStart(2, '0')}:${minute || '00'}`);
                                    }}
                                >
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
                                <Select
                                    value={startTime && startTime !== '00:00' ? startTime.split(':')[1] : '00'}
                                    onValueChange={(minute) => {
                                        const [hour] = startTime && startTime !== '00:00' ? startTime.split(':') : ['21'];
                                        handleStartTimeChange(`${hour || '21'}:${minute.padStart(2, '0')}`);
                                    }}
                                >
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
                    {errors.start_time && (
                        <div className="text-xs text-red-500 mt-1">{errors.start_time.message}</div>
                    )}
                </div>

                <div className="space-y-3">
                    <Label htmlFor="lock_time" className="text-base font-semibold">Lock Time (Auto-calculated)</Label>
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-3">
                            <Label className="text-sm text-gray-600">Date</Label>
                            <Input
                                value={lockDate ? lockDate.toLocaleDateString() : "Not set"}
                                disabled
                                className="h-12 text-base bg-gray-50"
                            />
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label className="text-sm text-gray-600">Time</Label>
                            <Input
                                value={lockTime || "Not set"}
                                disabled
                                className="h-12 text-base bg-gray-50"
                            />
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Lock time is automatically set to 20 minutes before the start time
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-6">
                <Button type="button" variant="outline" onClick={onCancel} className="h-12 px-8 text-base" disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" className="h-12 px-8 text-base" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating Match...' : (match ? 'Update Match' : 'Create Match')}
                </Button>
            </div>
            {!match && (
                <div className="text-xs text-gray-500 mt-2 text-center">
                    Odds will be calculated automatically after match creation
                </div>
            )}
        </form>
    );
} 