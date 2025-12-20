'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Player } from '@netprophet/lib/types/player';
import { insertPlayer, updatePlayer, fetchPlayerById, fetchPlayers } from '@netprophet/lib/supabase/players';
import { uploadAthletePhoto, deleteAthletePhoto } from '@netprophet/lib';
import { toast } from 'sonner';

// Mock data for demo
const mockPlayer: Player = {
    id: '1',
    firstName: 'Γιώργος',
    lastName: 'Παπαδόπουλος',
    ntrpRating: 4.5,
    wins: 15,
    losses: 8,
    last5: ['W', 'W', 'L', 'W', 'L'],
    currentStreak: 2,
    streakType: 'W',
    surfacePreference: 'Hard Court',
    surfaceWinRates: {
        hardCourt: 0.75,
        clayCourt: 0.45,
        grassCourt: 0.60
    },
    aggressiveness: 7,
    stamina: 8,
    consistency: 6,
    age: 28,
    hand: 'right',
    notes: 'Strong baseline player',
    lastMatchDate: '2024-01-15',
    injuryStatus: 'healthy',
    seasonalForm: 0.68
};

export default function PlayerEditPage() {
    const router = useRouter();
    const params = useParams();
    const playerId = (params as any).id as string;
    const isNew = playerId === 'new';

    const [player, setPlayer] = useState<Player>(mockPlayer);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!isNew);
    const [notifying, setNotifying] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!isNew) {
            // Fetch specific player data from Supabase
            fetchPlayerById(playerId).then((fetchedPlayer: Player) => {
                // Ensure last5 always has exactly 5 elements
                const last5 = fetchedPlayer.last5 || [];
                const normalizedLast5 = [...last5];

                // Pad with 'L' if less than 5 elements
                while (normalizedLast5.length < 5) {
                    normalizedLast5.push('L');
                }

                // Trim if more than 5 elements
                if (normalizedLast5.length > 5) {
                    normalizedLast5.splice(5);
                }

                setPlayer({
                    ...fetchedPlayer,
                    last5: normalizedLast5 as ('W' | 'L')[]
                });
                // Set photo preview if photo exists
                if (fetchedPlayer.photoUrl) {
                    setPhotoPreview(fetchedPlayer.photoUrl);
                }
                setInitialLoading(false);
            }).catch((error) => {
                console.error('Error fetching player:', error);
                toast.error('Failed to load player data');
                setInitialLoading(false);
            });
        } else {
            // Initialize new player with defaults
            setPlayer({
                id: '',
                firstName: '',
                lastName: '',
                ntrpRating: 3.0,
                wins: 0,
                losses: 0,
                last5: ['L', 'L', 'L', 'L', 'L'],
                currentStreak: 0,
                streakType: 'L',
                surfacePreference: 'Hard Court',
                surfaceWinRates: {
                    hardCourt: 0.5,
                    clayCourt: 0.5,
                    grassCourt: 0.5,
                },
                aggressiveness: 5,
                stamina: 5,
                consistency: 5,
                age: 25,
                hand: 'right',
                notes: '',
                lastMatchDate: '',
                injuryStatus: 'healthy',
                seasonalForm: 0.5
            });
        }
    }, [isNew, playerId]);

    const handleSave = async () => {
        console.log('Save clicked', player);
        setLoading(true);
        try {
            if (isNew) {
                const result = await insertPlayer(player);
                console.log('Player created successfully:', result);
                toast.success('Player created! Redirecting to players list...');
                // Redirect to players list only when creating new player
                router.push('/players');
            } else {
                console.log('Updating player with ID:', player.id);
                const result = await updatePlayer(player.id, player);
                console.log('Player updated successfully:', result);
                toast.success('Player updated successfully!');
                // Stay on the page when editing - no redirect
            }
        } catch (error) {
            console.error('Error saving player:', error);
            toast.error('Failed to save player: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleNotifyUser = async () => {
        if (!player || !player.id) return;

        if (!player.claimedByUserId) {
            toast.error('This player is not linked to a user account');
            return;
        }

        if (!player.isActive) {
            toast.error('Please activate the player profile before notifying the user');
            return;
        }

        setNotifying(true);
        try {
            const response = await fetch(`/api/players/${player.id}/notify-activation`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send notification');
            }

            toast.success('✅ User notified! Profile activation email sent successfully.');
        } catch (error) {
            console.error('Error notifying user:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to send notification');
        } finally {
            setNotifying(false);
        }
    };

    const updatePlayerField = (field: keyof Player, value: any) => {
        setPlayer(prev => ({ ...prev, [field]: value }));
    };

    const updateSurfaceWinRate = (surface: 'hardCourt' | 'clayCourt' | 'grassCourt', value: number) => {
        setPlayer(prev => ({
            ...prev,
            surfaceWinRates: {
                ...prev.surfaceWinRates,
                [surface]: value
            }
        }));
    };

    const updateLast5 = (index: number, result: 'W' | 'L') => {
        const newLast5 = [...player.last5];
        newLast5[index] = result;

        // Auto-calculate streak and streak type based on last 5
        const { currentStreak, streakType } = calculateStreakFromLast5(newLast5);

        setPlayer(prev => ({
            ...prev,
            last5: newLast5,
            currentStreak,
            streakType
        }));
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Μη έγκυρος τύπος αρχείου. Επιτρέπονται: JPEG, PNG, WEBP');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Το αρχείο υπερβαίνει το όριο 5MB');
            return;
        }

        // For new players, we need to save first to get an ID
        if (isNew || !player.id) {
            toast.error('Παρακαλώ αποθηκεύστε πρώτα τον παίκτη πριν ανεβάσετε φωτογραφία');
            return;
        }

        setUploadingPhoto(true);

        try {
            // Create preview
            const previewUrl = URL.createObjectURL(file);
            setPhotoPreview(previewUrl);

            // Upload to storage
            const result = await uploadAthletePhoto(file, player.id);

            if (result.success && result.publicUrl) {
                // Update player with new photo URL
                await updatePlayer(player.id, { photoUrl: result.publicUrl });
                setPlayer(prev => ({ ...prev, photoUrl: result.publicUrl }));
                toast.success('Η φωτογραφία ανέβηκε επιτυχώς!');
            } else {
                setPhotoPreview(player.photoUrl || null);
                toast.error(result.error || 'Αποτυχία ανέβασματος φωτογραφίας');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            setPhotoPreview(player.photoUrl || null);
            toast.error('Σφάλμα κατά το ανέβασμα της φωτογραφίας');
        } finally {
            setUploadingPhoto(false);
            // Reset input
            event.target.value = '';
        }
    };

    const handlePhotoDelete = async () => {
        if (!player.photoUrl || !player.id) return;

        if (confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε τη φωτογραφία;')) {
            try {
                // Extract file path from URL
                const urlParts = player.photoUrl.split('/athlete-photos/');
                if (urlParts.length > 1) {
                    const filePath = urlParts[1];
                    await deleteAthletePhoto(filePath);
                }

                // Update player to remove photo URL
                await updatePlayer(player.id, { photoUrl: null });
                setPlayer(prev => ({ ...prev, photoUrl: null }));
                setPhotoPreview(null);
                toast.success('Η φωτογραφία διαγράφηκε επιτυχώς');
            } catch (error) {
                console.error('Error deleting photo:', error);
                toast.error('Σφάλμα κατά τη διαγραφή της φωτογραφίας');
            }
        }
    };

    const calculateStreakFromLast5 = (last5: string[]): { currentStreak: number; streakType: 'W' | 'L' } => {
        if (last5.length === 0) return { currentStreak: 0, streakType: 'L' };

        // Start from the most recent match (end of array) and count consecutive same results
        let streak = 1;
        const mostRecent = last5[last5.length - 1];

        // Count backwards from second-to-last
        for (let i = last5.length - 2; i >= 0; i--) {
            if (last5[i] === mostRecent) {
                streak++;
            } else {
                break;
            }
        }

        return {
            currentStreak: streak,
            streakType: mostRecent as 'W' | 'L'
        };
    };

    const getWinRate = (wins: number, losses: number) => {
        const total = wins + losses;
        return total > 0 ? Math.round((wins / total) * 100) : 0;
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading player data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isNew ? 'Προσθήκη Παίκτη' : 'Επεξεργασία Παίκτη'}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {isNew ? 'Δημιούργησε έναν νέο παίκτη' : 'Επεξεργάσου τις πληροφορίες του παίκτη'}
                    </p>
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/players')}
                    >
                        Ακύρωση
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'Αποθήκευση...' : 'Αποθήκευση'}
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Βασικές Πληροφορίες</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="firstName">Όνομα</Label>
                                <Input
                                    id="firstName"
                                    value={player.firstName}
                                    onChange={(e) => updatePlayerField('firstName', e.target.value)}
                                    placeholder="Όνομα"
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName">Επώνυμο</Label>
                                <Input
                                    id="lastName"
                                    value={player.lastName}
                                    onChange={(e) => updatePlayerField('lastName', e.target.value)}
                                    placeholder="Επώνυμο"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="claimedByUserId">User ID (Optional - για profile creation requests)</Label>
                            <Input
                                id="claimedByUserId"
                                value={player.claimedByUserId || ''}
                                onChange={(e) => updatePlayerField('claimedByUserId', e.target.value || undefined)}
                                placeholder="Paste User ID from creation request email"
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                💡 Αν συνδέεις προφίλ με user request, κάνε paste το User ID από το email
                            </p>
                        </div>

                        {/* Photo Upload Section */}
                        <div>
                            <Label>Φωτογραφία Αθλητή</Label>
                            <div className="mt-2 space-y-3">
                                {photoPreview && (
                                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-300">
                                        <img
                                            src={photoPreview}
                                            alt={`${player.firstName} ${player.lastName}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <label
                                        htmlFor="photo-upload"
                                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploadingPhoto ? 'Ανέβασμα...' : photoPreview ? 'Αλλαγή Φωτογραφίας' : 'Ανέβασμα Φωτογραφίας'}
                                    </label>
                                    <input
                                        id="photo-upload"
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        onChange={handlePhotoUpload}
                                        disabled={uploadingPhoto || isNew}
                                        className="hidden"
                                    />
                                    {photoPreview && !isNew && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handlePhotoDelete}
                                            disabled={uploadingPhoto}
                                        >
                                            Διαγραφή
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    Μέγιστο μέγεθος: 5MB. Επιτρέπονται: JPEG, PNG, WEBP
                                    {isNew && ' (Αποθηκεύστε πρώτα τον παίκτη)'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="age">Ηλικία</Label>
                                <Input
                                    id="age"
                                    type="number"
                                    min="16"
                                    max="80"
                                    value={player.age}
                                    onChange={(e) => updatePlayerField('age', parseInt(e.target.value) || 25)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="hand">Χέρι</Label>
                                <Select
                                    value={player.hand}
                                    onValueChange={(value: 'left' | 'right') => updatePlayerField('hand', value)}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem value="right">Δεξί</SelectItem>
                                        <SelectItem value="left">Αριστερό</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="notes">Σημειώσεις</Label>
                            <Textarea
                                id="notes"
                                value={player.notes || ''}
                                onChange={(e) => updatePlayerField('notes', e.target.value)}
                                placeholder="Σημειώσεις για τον παίκτη"
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Tennis Statistics */}
                <Card>
                    <CardHeader>
                        <CardTitle>Στατιστικά Τένις</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="ntrpRating">NTRP Rating</Label>
                                <Input
                                    id="ntrpRating"
                                    type="number"
                                    step="0.5"
                                    min="1.0"
                                    max="7.0"
                                    value={player.ntrpRating}
                                    onChange={(e) => updatePlayerField('ntrpRating', parseFloat(e.target.value) || 3.0)}
                                />
                            </div>
                            <div>
                                <Label>Εποχική Φόρμα (%)</Label>
                                <div className="bg-gray-100 rounded px-3 py-2 text-gray-700 font-semibold">
                                    {getWinRate(player.wins, player.losses)}%
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="wins">Νίκες</Label>
                                <Input
                                    id="wins"
                                    type="number"
                                    min="0"
                                    value={player.wins}
                                    onChange={(e) => updatePlayerField('wins', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="losses">Ήττες</Label>
                                <Input
                                    id="losses"
                                    type="number"
                                    min="0"
                                    value={player.losses}
                                    onChange={(e) => updatePlayerField('losses', parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-sm font-semibold text-blue-800 mb-2">Win Rate</div>
                            <div className="text-2xl font-bold text-blue-600">
                                {getWinRate(player.wins, player.losses)}%
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Πρόσφατη Φόρμα</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        <div>
                            <Label>Τελευταία 5 Αγώνες</Label>
                            <p className="text-xs text-gray-500 mb-2">
                                Κλικ για να αλλάξεις • Το streak υπολογίζεται αυτόματα
                            </p>
                            <div className="flex space-x-2">
                                {player.last5.map((result, index) => (
                                    <Button
                                        key={index}
                                        variant={result === 'W' ? 'default' : 'secondary'}
                                        size="sm"
                                        onClick={() => updateLast5(index, result === 'W' ? 'L' : 'W')}
                                        className={`w-12 h-12 font-bold ${result === 'W'
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-red-600 hover:bg-red-700 text-white'
                                            }`}
                                        title={`Match ${index + 1}: ${result === 'W' ? 'Win' : 'Loss'} - Click to toggle`}
                                    >
                                        {result}
                                    </Button>
                                ))}
                            </div>
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <div className="text-sm">
                                    <span className="font-semibold text-blue-900">Current Streak: </span>
                                    <span className="text-blue-700">{player.currentStreak} {player.streakType}</span>
                                    <span className="text-xs text-gray-500 ml-2">(Auto-calculated)</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="lastMatchDate">Ημερομηνία Τελευταίου Αγώνα</Label>
                            <Input
                                id="lastMatchDate"
                                type="date"
                                value={player.lastMatchDate || ''}
                                onChange={(e) => updatePlayerField('lastMatchDate', e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Physical Attributes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Φυσικά Χαρακτηριστικά</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="aggressiveness">Επιθετικότητα (1-10)</Label>
                            <Input
                                id="aggressiveness"
                                type="number"
                                min="1"
                                max="10"
                                value={player.aggressiveness}
                                onChange={(e) => updatePlayerField('aggressiveness', parseInt(e.target.value) || 5)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="stamina">Αντοχή (1-10)</Label>
                            <Input
                                id="stamina"
                                type="number"
                                min="1"
                                max="10"
                                value={player.stamina}
                                onChange={(e) => updatePlayerField('stamina', parseInt(e.target.value) || 5)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="consistency">Συνέπεια (1-10)</Label>
                            <Input
                                id="consistency"
                                type="number"
                                min="1"
                                max="10"
                                value={player.consistency}
                                onChange={(e) => updatePlayerField('consistency', parseInt(e.target.value) || 5)}
                            />
                        </div>


                        <div>
                            <Label htmlFor="injuryStatus">Κατάσταση Τραυματισμού</Label>
                            <Select
                                value={player.injuryStatus || 'healthy'}
                                onValueChange={(value: 'healthy' | 'minor' | 'major') => updatePlayerField('injuryStatus', value)}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="healthy">Υγιής</SelectItem>
                                    <SelectItem value="minor">Μικρός Τραυματισμός</SelectItem>
                                    <SelectItem value="major">Σοβαρός Τραυματισμός</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Surface Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle>Προτιμήσεις Επιφανειών</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="surfacePreference">Προτιμώμενη Επιφάνεια</Label>
                            <Select
                                value={player.surfacePreference}
                                onValueChange={(value: "Hard Court" | "Clay Court" | "Grass Court") =>
                                    updatePlayerField('surfacePreference', value)
                                }
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="Hard Court">Hard Court</SelectItem>
                                    <SelectItem value="Clay Court">Clay Court</SelectItem>
                                    <SelectItem value="Grass Court">Grass Court</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="hardCourtWinRate">Hard Court Win Rate (%)</Label>
                                <Input
                                    id="hardCourtWinRate"
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    placeholder="50"
                                    value={player.surfaceWinRates?.hardCourt ? Math.round(player.surfaceWinRates.hardCourt * 100) : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '') {
                                            // Allow empty field
                                            return;
                                        }
                                        const percentage = parseFloat(value);
                                        if (!isNaN(percentage)) {
                                            const decimal = Math.max(0, Math.min(100, percentage)) / 100;
                                            updateSurfaceWinRate('hardCourt', decimal);
                                        }
                                    }}
                                />
                            </div>

                            <div>
                                <Label htmlFor="clayCourtWinRate">Clay Court Win Rate (%)</Label>
                                <Input
                                    id="clayCourtWinRate"
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    placeholder="50"
                                    value={player.surfaceWinRates?.clayCourt ? Math.round(player.surfaceWinRates.clayCourt * 100) : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '') {
                                            // Allow empty field
                                            return;
                                        }
                                        const percentage = parseFloat(value);
                                        if (!isNaN(percentage)) {
                                            const decimal = Math.max(0, Math.min(100, percentage)) / 100;
                                            updateSurfaceWinRate('clayCourt', decimal);
                                        }
                                    }}
                                />
                            </div>

                            <div>
                                <Label htmlFor="grassCourtWinRate">Grass Court Win Rate (%)</Label>
                                <Input
                                    id="grassCourtWinRate"
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    placeholder="50"
                                    value={player.surfaceWinRates?.grassCourt ? Math.round(player.surfaceWinRates.grassCourt * 100) : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '') {
                                            // Allow empty field
                                            return;
                                        }
                                        const percentage = parseFloat(value);
                                        if (!isNaN(percentage)) {
                                            const decimal = Math.max(0, Math.min(100, percentage)) / 100;
                                            updateSurfaceWinRate('grassCourt', decimal);
                                        }
                                    }}
                                />
                            </div>

                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 