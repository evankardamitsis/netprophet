'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Player type definition
interface Player {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    age: number;
    hand: 'left' | 'right';
    club: string;
    ntrpRating: number;
    wins: number;
    losses: number;
    last5: string[];
    currentStreak: number;
    streakType: 'W' | 'L';
    surfacePreference: string;
    aggressiveness: number;
    stamina: number;
    consistency: number;
    notes: string;
}

// Mock data for all players (matching the list page)
const mockPlayers: Player[] = [
    {
        id: '1',
        firstName: 'Γιώργος',
        lastName: 'Παπαδόπουλος',
        username: 'george_pap',
        age: 28,
        hand: 'right',
        club: 'Ολυμπιακός',
        ntrpRating: 4.5,
        wins: 15,
        losses: 8,
        last5: ['W', 'W', 'L', 'W', 'L'],
        currentStreak: 3,
        streakType: 'W',
        surfacePreference: 'Hard Court',
        aggressiveness: 7,
        stamina: 8,
        consistency: 6,
        notes: 'Strong baseline player with good serve. Needs work on volleying and net play. Shows good mental toughness in pressure situations.'
    },
    {
        id: '2',
        firstName: 'Μαρία',
        lastName: 'Κωνσταντίνου',
        username: 'maria_kon',
        age: 25,
        hand: 'right',
        club: 'Παναθηναϊκός',
        ntrpRating: 3.5,
        wins: 12,
        losses: 10,
        last5: ['L', 'W', 'W', 'L', 'W'],
        currentStreak: 1,
        streakType: 'W',
        surfacePreference: 'Clay Court',
        aggressiveness: 5,
        stamina: 7,
        consistency: 8,
        notes: 'Consistent player with good defensive skills. Excels on clay courts. Needs to work on serve power.'
    },
    {
        id: '3',
        firstName: 'Νίκος',
        lastName: 'Αλεξίου',
        username: 'nikos_alex',
        age: 32,
        hand: 'left',
        club: 'ΑΕΚ',
        ntrpRating: 5.0,
        wins: 20,
        losses: 5,
        last5: ['W', 'W', 'W', 'W', 'W'],
        currentStreak: 5,
        streakType: 'W',
        surfacePreference: 'Hard Court',
        aggressiveness: 9,
        stamina: 9,
        consistency: 8,
        notes: 'Top player with excellent all-around game. Strong serve and aggressive baseline play. Left-handed advantage.'
    },
    {
        id: '4',
        firstName: 'Ελένη',
        lastName: 'Δημητρίου',
        username: 'eleni_dem',
        age: 22,
        hand: 'right',
        club: 'ΠΑΟΚ',
        ntrpRating: 4.0,
        wins: 8,
        losses: 12,
        last5: ['L', 'L', 'W', 'L', 'L'],
        currentStreak: 2,
        streakType: 'L',
        surfacePreference: 'Indoor',
        aggressiveness: 6,
        stamina: 6,
        consistency: 5,
        notes: 'Young player with potential. Good technique but needs more match experience. Struggles under pressure.'
    }
];

export default function PlayerProfilePage() {
    const router = useRouter();
    const params = useParams();
    const [player, setPlayer] = useState<Player | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        // Find the player based on the ID from the URL
        const playerId = params.id as string;
        console.log('Loading player with ID:', playerId);

        const foundPlayer = mockPlayers.find(p => p.id === playerId);
        if (foundPlayer) {
            setPlayer(foundPlayer);
        } else {
            console.error('Player not found with ID:', playerId);
            // Redirect back to players list if player not found
            router.push('/admin/players');
        }
    }, [params.id, router]);

    const handleSave = () => {
        // In the future, save to database
        console.log('Saving player data:', player);
        setIsEditing(false);
    };

    const handleCancel = () => {
        // Reset to original data by finding the player again
        const playerId = params.id as string;
        const originalPlayer = mockPlayers.find(p => p.id === playerId);
        if (originalPlayer) {
            setPlayer(originalPlayer);
        }
        setIsEditing(false);
    };

    // Show loading state if player is not loaded yet
    if (!player) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Φόρτωση παίκτη...</p>
                </div>
            </div>
        );
    }

    const getWinRate = () => {
        const total = player.wins + player.losses;
        return total > 0 ? Math.round((player.wins / total) * 100) : 0;
    };

    const getLast5Display = () => {
        return player.last5.map((result, index) => (
            <span
                key={index}
                className={`w-8 h-8 rounded-full text-xs font-bold inline-flex items-center justify-center mr-2 transition-all duration-200 hover:scale-110 hover:shadow-md ${result === 'W'
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                title={`Match ${index + 1}: ${result === 'W' ? 'Win' : 'Loss'}`}
            >
                {result}
            </span>
        ));
    };

    const getStreakDisplay = () => {
        const emoji = player.streakType === 'W' ? '🔥' : '💧';
        return `${emoji} ${player.streakType}${player.currentStreak}`;
    };

    const renderTraitScore = (value: number, label: string) => (
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${(value / 10) * 100}%` }}
                    />
                </div>
                <span className="text-sm font-bold text-gray-900 w-6">{value}</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/admin/players')}
                        className="transition-all duration-200 hover:scale-105 hover:shadow-md"
                    >
                        ← Πίσω
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Προφίλ Παίκτη</h1>
                        <p className="text-gray-600 mt-1">
                            {player.firstName} {player.lastName} ({player.username})
                        </p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    {isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleCancel}
                                className="transition-all duration-200 hover:scale-105 hover:bg-gray-100"
                            >
                                Ακύρωση
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
                            >
                                Αποθήκευση
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={() => setIsEditing(true)}
                            className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
                        >
                            ✏️ Επεξεργασία
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Player Info Card */}
                <Card className="transition-all duration-200 hover:shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            📇 Πληροφορίες Παίκτη
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="firstName">Όνομα</Label>
                                <Input
                                    id="firstName"
                                    value={player.firstName}
                                    onChange={(e) => setPlayer({ ...player, firstName: e.target.value })}
                                    disabled={!isEditing}
                                    className="transition-all duration-200"
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName">Επώνυμο</Label>
                                <Input
                                    id="lastName"
                                    value={player.lastName}
                                    onChange={(e) => setPlayer({ ...player, lastName: e.target.value })}
                                    disabled={!isEditing}
                                    className="transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={player.username}
                                    onChange={(e) => setPlayer({ ...player, username: e.target.value })}
                                    disabled={!isEditing}
                                    className="transition-all duration-200"
                                />
                            </div>
                            <div>
                                <Label htmlFor="age">Ηλικία</Label>
                                <Input
                                    id="age"
                                    type="number"
                                    value={player.age}
                                    onChange={(e) => setPlayer({ ...player, age: parseInt(e.target.value) || 0 })}
                                    disabled={!isEditing}
                                    className="transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="hand">Χέρι</Label>
                                <Select
                                    value={player.hand}
                                    onValueChange={(value: 'left' | 'right') => setPlayer({ ...player, hand: value })}
                                    disabled={!isEditing}
                                >
                                    <SelectTrigger className="transition-all duration-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="right">Δεξί</SelectItem>
                                        <SelectItem value="left">Αριστερό</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="ntrpRating">NTRP Rating</Label>
                                <Input
                                    id="ntrpRating"
                                    type="number"
                                    step="0.5"
                                    min="1.0"
                                    max="7.0"
                                    value={player.ntrpRating}
                                    onChange={(e) => setPlayer({ ...player, ntrpRating: parseFloat(e.target.value) || 0 })}
                                    disabled={!isEditing}
                                    className="transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="club">Σύλλογος</Label>
                            <Input
                                id="club"
                                value={player.club}
                                onChange={(e) => setPlayer({ ...player, club: e.target.value })}
                                disabled={!isEditing}
                                className="transition-all duration-200"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Performance Card */}
                <Card className="transition-all duration-200 hover:shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            📊 Επιδόσεις
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{player.wins}</div>
                                <div className="text-sm text-gray-600">Νίκες</div>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">{player.losses}</div>
                                <div className="text-sm text-gray-600">Ήττες</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{player.wins + player.losses}</div>
                                <div className="text-sm text-gray-600">Συνολικά</div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                <div className="text-2xl font-bold text-purple-600">{getWinRate()}%</div>
                                <div className="text-sm text-gray-600">Win Rate</div>
                            </div>
                        </div>

                        <div>
                            <Label>Τελευταία 5 Αγώνες</Label>
                            <div className="flex mt-2">
                                {getLast5Display()}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Τρέχουσα Σειρά</Label>
                                <div className="mt-1">
                                    <Badge variant="outline" className="text-lg font-bold">
                                        {getStreakDisplay()}
                                    </Badge>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="surfacePreference">Επιφάνεια</Label>
                                <Select
                                    value={player.surfacePreference}
                                    onValueChange={(value) => setPlayer({ ...player, surfacePreference: value })}
                                    disabled={!isEditing}
                                >
                                    <SelectTrigger className="transition-all duration-200">
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
                        </div>
                    </CardContent>
                </Card>

                {/* Traits Card */}
                <Card className="transition-all duration-200 hover:shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            🧬 Χαρακτηριστικά
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {renderTraitScore(player.aggressiveness, 'Επιθετικότητα')}
                        {renderTraitScore(player.stamina, 'Αντοχή')}
                        {renderTraitScore(player.consistency, 'Συνέπεια')}

                        {isEditing && (
                            <div className="space-y-3 pt-4 border-t">
                                <div>
                                    <Label htmlFor="aggressiveness">Επιθετικότητα (1-10)</Label>
                                    <input
                                        id="aggressiveness"
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={player.aggressiveness}
                                        onChange={(e) => setPlayer({ ...player, aggressiveness: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="stamina">Αντοχή (1-10)</Label>
                                    <input
                                        id="stamina"
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={player.stamina}
                                        onChange={(e) => setPlayer({ ...player, stamina: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="consistency">Συνέπεια (1-10)</Label>
                                    <input
                                        id="consistency"
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={player.consistency}
                                        onChange={(e) => setPlayer({ ...player, consistency: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notes Card */}
                <Card className="transition-all duration-200 hover:shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            📝 Σημειώσεις
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={player.notes}
                            onChange={(e) => setPlayer({ ...player, notes: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Σημειώσεις για τον παίκτη..."
                            className="min-h-[120px] transition-all duration-200"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Future CTA */}
            <Card className="transition-all duration-200 hover:shadow-lg">
                <CardContent className="pt-6">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            🎯 Επόμενα Βήματα
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Χρησιμοποίησε αυτές τις πληροφορίες για να δημιουργήσεις προβλέψεις και odds
                        </p>
                        <Button
                            variant="outline"
                            className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
                            disabled
                        >
                            🔮 Generate Odds Preview (Coming Soon)
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 