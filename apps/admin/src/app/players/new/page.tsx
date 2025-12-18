'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Player } from '@netprophet/lib/types/player';
import { insertPlayer } from '@netprophet/lib/supabase/players';
import { toast } from 'sonner';

export default function NewPlayerPage() {
    const router = useRouter();
    const [player, setPlayer] = useState<Player>({
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
            grassCourt: 0.5
        },
        aggressiveness: 5,
        stamina: 5,
        consistency: 5,
        // IMPORTANT: Do not assume a default age.
        // Admins should set this explicitly using the athlete's date of birth from the request email.
        age: 0,
        hand: 'right',
        notes: '',
        lastMatchDate: '',
        injuryStatus: 'healthy',
        seasonalForm: 0.5,
        claimedByUserId: undefined,
        isActive: true,
        isHidden: false,
    });
    const [loading, setLoading] = useState(false);
    const [notifying, setNotifying] = useState(false);
    const [autoFillLoading, setAutoFillLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await insertPlayer(player);
            toast.success('Player created successfully!');
            router.push('/players');
        } catch (error) {
            console.error('Error saving player:', error);
            toast.error('Failed to create player');
        } finally {
            setLoading(false);
        }
    };

    const handleNotifyUser = async () => {
        if (!player || !player.id) {
            toast.error('Please save the player first before notifying');
            return;
        }

        if (!player.claimedByUserId) {
            toast.error('This player is not linked to a user account. Please add the User ID.');
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

    const updatePlayer = (field: keyof Player, value: any) => {
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
        setPlayer(prev => ({ ...prev, last5: newLast5 }));
    };

    // Auto-fill age and hand from user's registration data when claimedByUserId is set
    useEffect(() => {
        const fetchAthleteMetadata = async () => {
            if (!player.claimedByUserId) return;

            setAutoFillLoading(true);
            try {
                const res = await fetch(
                    `/api/admin/user-athlete-metadata?userId=${encodeURIComponent(
                        player.claimedByUserId
                    )}`
                );
                const data = await res.json();

                if (!res.ok || !data.success) {
                    console.error('Failed to fetch athlete metadata:', data.error);
                    toast.error(
                        data.error || 'Failed to fetch athlete registration details'
                    );
                    return;
                }

                setPlayer(prev => ({
                    ...prev,
                    age: typeof data.age === 'number' && data.age > 0 ? data.age : prev.age,
                    hand: data.hand === 'left' || data.hand === 'right' ? data.hand : prev.hand,
                }));

                toast.success('Prefilled age and dominant hand from athlete request');
            } catch (error) {
                console.error('Error fetching athlete metadata:', error);
                toast.error('Failed to fetch athlete registration details');
            } finally {
                setAutoFillLoading(false);
            }
        };

        fetchAthleteMetadata();
        // Only re-run when claimedByUserId changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [player.claimedByUserId]);

    const getWinRate = (wins: number, losses: number) => {
        const total = wins + losses;
        return total > 0 ? Math.round((wins / total) * 100) : 0;
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Προσθήκη Παίκτη
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Δημιούργησε έναν νέο παίκτη
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

            {player.claimedByUserId && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-900 mb-1">🔗 Player Linked to User</h3>
                                <p className="text-sm text-blue-700">
                                    User ID: <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">{player.claimedByUserId}</code>
                                </p>
                                <p className="text-xs text-blue-600 mt-2">
                                    💡 After saving and activating this profile, click the button below to notify the user
                                </p>
                            </div>
                            {player.id && player.isActive && (
                                <Button
                                    variant="secondary"
                                    onClick={handleNotifyUser}
                                    disabled={notifying || loading}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {notifying ? '📧 Sending...' : '📧 Notify User'}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

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
                                    onChange={(e) => updatePlayer('firstName', e.target.value)}
                                    placeholder="Όνομα"
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName">Επώνυμο</Label>
                                <Input
                                    id="lastName"
                                    value={player.lastName}
                                    onChange={(e) => updatePlayer('lastName', e.target.value)}
                                    placeholder="Επώνυμο"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="claimedByUserId">User ID (Optional - για profile creation requests)</Label>
                            <Input
                                id="claimedByUserId"
                                value={player.claimedByUserId || ''}
                                onChange={(e) => updatePlayer('claimedByUserId', e.target.value || undefined)}
                                placeholder="Paste User ID from creation request email"
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                💡 Αν δημιουργείς προφίλ για user request, κάνε paste το User ID από το email
                            </p>
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
                                    onChange={(e) => updatePlayer('age', parseInt(e.target.value) || 25)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="hand">Χέρι</Label>
                                <Select
                                    value={player.hand}
                                    onValueChange={(value: 'left' | 'right') => updatePlayer('hand', value)}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
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
                                onChange={(e) => updatePlayer('notes', e.target.value)}
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
                                    onChange={(e) => updatePlayer('ntrpRating', parseFloat(e.target.value) || 3.0)}
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
                                    onChange={(e) => updatePlayer('wins', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="losses">Ήττες</Label>
                                <Input
                                    id="losses"
                                    type="number"
                                    min="0"
                                    value={player.losses}
                                    onChange={(e) => updatePlayer('losses', parseInt(e.target.value) || 0)}
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="currentStreak">Τρέχον Streak</Label>
                                <Input
                                    id="currentStreak"
                                    type="number"
                                    min="0"
                                    value={player.currentStreak}
                                    onChange={(e) => updatePlayer('currentStreak', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="streakType">Τύπος Streak</Label>
                                <Select
                                    value={player.streakType}
                                    onValueChange={(value: 'W' | 'L') => updatePlayer('streakType', value)}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="W">Νίκες</SelectItem>
                                        <SelectItem value="L">Ήττες</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>Τελευταία 5 Αγώνες</Label>
                            <div className="flex space-x-2 mt-2">
                                {player.last5.map((result, index) => (
                                    <Button
                                        key={index}
                                        variant={result === 'W' ? 'default' : 'secondary'}
                                        size="sm"
                                        onClick={() => updateLast5(index, result === 'W' ? 'L' : 'W')}
                                        className="w-10 h-10"
                                    >
                                        {result}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="lastMatchDate">Ημερομηνία Τελευταίου Αγώνα</Label>
                            <Input
                                id="lastMatchDate"
                                type="date"
                                value={player.lastMatchDate || ''}
                                onChange={(e) => updatePlayer('lastMatchDate', e.target.value)}
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
                                onChange={(e) => updatePlayer('aggressiveness', parseInt(e.target.value) || 5)}
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
                                onChange={(e) => updatePlayer('stamina', parseInt(e.target.value) || 5)}
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
                                onChange={(e) => updatePlayer('consistency', parseInt(e.target.value) || 5)}
                            />
                        </div>


                        <div>
                            <Label htmlFor="injuryStatus">Κατάσταση Τραυματισμού</Label>
                            <Select
                                value={player.injuryStatus || 'healthy'}
                                onValueChange={(value: 'healthy' | 'minor' | 'major') => updatePlayer('injuryStatus', value)}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
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
                                onValueChange={(value: any) => updatePlayer('surfacePreference', value)}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
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