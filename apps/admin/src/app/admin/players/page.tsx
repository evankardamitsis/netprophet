'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WarningModal } from '@/components/ui/warning-modal';
import { Player } from '@/types/player';

// Mock data with complete player information
const initialPlayers: Player[] = [
    {
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
            grassCourt: 0.60,
            indoor: 0.70
        },
        aggressiveness: 7,
        stamina: 8,
        consistency: 6,
        age: 28,
        hand: 'right',
        club: 'Ολυμπιακός',
        notes: 'Strong baseline player',
        lastMatchDate: '2024-01-15',
        fatigueLevel: 2,
        injuryStatus: 'healthy',
        seasonalForm: 0.68
    },
    {
        id: '2',
        firstName: 'Μαρία',
        lastName: 'Κωνσταντίνου',
        ntrpRating: 3.5,
        wins: 12,
        losses: 10,
        last5: ['L', 'W', 'W', 'L', 'W'],
        currentStreak: 1,
        streakType: 'W',
        surfacePreference: 'Clay Court',
        surfaceWinRates: {
            hardCourt: 0.40,
            clayCourt: 0.80,
            grassCourt: 0.35,
            indoor: 0.45
        },
        aggressiveness: 5,
        stamina: 7,
        consistency: 8,
        age: 25,
        hand: 'right',
        club: 'Παναθηναϊκός',
        notes: 'Consistent player',
        lastMatchDate: '2024-01-12',
        fatigueLevel: 4,
        injuryStatus: 'healthy',
        seasonalForm: 0.55
    },
    {
        id: '3',
        firstName: 'Νίκος',
        lastName: 'Αλεξίου',
        ntrpRating: 5.0,
        wins: 20,
        losses: 5,
        last5: ['W', 'W', 'W', 'W', 'W'],
        currentStreak: 5,
        streakType: 'W',
        surfacePreference: 'Grass Court',
        surfaceWinRates: {
            hardCourt: 0.85,
            clayCourt: 0.70,
            grassCourt: 0.90,
            indoor: 0.80
        },
        aggressiveness: 9,
        stamina: 9,
        consistency: 7,
        age: 30,
        hand: 'left',
        club: 'ΑΕΚ',
        notes: 'Top player',
        lastMatchDate: '2024-01-14',
        fatigueLevel: 1,
        injuryStatus: 'healthy',
        seasonalForm: 0.82
    },
    {
        id: '4',
        firstName: 'Ελένη',
        lastName: 'Δημητρίου',
        ntrpRating: 4.0,
        wins: 8,
        losses: 12,
        last5: ['L', 'L', 'W', 'L', 'L'],
        currentStreak: 1,
        streakType: 'L',
        surfacePreference: 'Hard Court',
        surfaceWinRates: {
            hardCourt: 0.55,
            clayCourt: 0.30,
            grassCourt: 0.40,
            indoor: 0.50
        },
        aggressiveness: 6,
        stamina: 5,
        consistency: 7,
        age: 22,
        hand: 'right',
        club: 'ΠΑΟΚ',
        notes: 'Developing player',
        lastMatchDate: '2024-01-10',
        fatigueLevel: 6,
        injuryStatus: 'minor',
        seasonalForm: 0.40
    }
];

export default function PlayersPage() {
    const router = useRouter();
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);



    const handleEdit = (player: Player) => {
        console.log('Edit button clicked for player:', player.id);
        router.push(`/admin/players/${player.id}`);
    };

    const handleDelete = (player: Player) => {
        setDeletingPlayer(player);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (deletingPlayer) {
            setPlayers(prev => prev.filter(player => player.id !== deletingPlayer.id));
            setDeletingPlayer(null);
        }
        setIsDeleteModalOpen(false);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeletingPlayer(null);
    };



    const getWinRate = (wins: number, losses: number) => {
        const total = wins + losses;
        return total > 0 ? Math.round((wins / total) * 100) : 0;
    };

    const getLast5Display = (last5: string[]) => {
        return last5.map((result, index) => (
            <span
                key={index}
                className={`w-6 h-6 rounded-full text-xs font-bold inline-flex items-center justify-center mr-1 transition-all duration-200 hover:scale-110 hover:shadow-md ${result === 'W'
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                title={`Match ${index + 1}: ${result === 'W' ? 'Win' : 'Loss'}`}
            >
                {result}
            </span>
        ));
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Διαχείριση Παικτών</h1>
                    <p className="text-gray-600 mt-2">
                        Διαχειρίσου τους παίκτες του συστήματος
                    </p>
                </div>
                <Button
                    onClick={() => router.push('/admin/players/new')}
                    className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
                >
                    + Προσθήκη Παίκτη
                </Button>
            </div>

            {/* Players Table */}
            <Card className="transition-all duration-200 hover:shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Λίστα Παικτών
                        <Badge variant="outline" className="text-sm">
                            {players.length}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ονοματεπώνυμο</TableHead>
                                <TableHead>NTRP</TableHead>
                                <TableHead>Νίκες</TableHead>
                                <TableHead>Ήττες</TableHead>
                                <TableHead>Win Rate</TableHead>
                                <TableHead>Τελευταία 5</TableHead>
                                <TableHead>Streak</TableHead>
                                <TableHead>Ηλικία</TableHead>
                                <TableHead className="text-right">Ενέργειες</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {players.map((player) => (
                                <TableRow
                                    key={player.id}
                                    className="transition-all duration-200 hover:bg-gray-50 hover:shadow-sm"
                                >
                                    <TableCell className="font-medium">
                                        <Button
                                            variant="link"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/admin/players/${player.id}`);
                                            }}
                                            className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer"
                                        >
                                            {player.firstName} {player.lastName}
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="transition-all duration-200 hover:scale-105 hover:shadow-sm">
                                            {player.ntrpRating}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-green-600 font-semibold">
                                        {player.wins}
                                    </TableCell>
                                    <TableCell className="text-red-600 font-semibold">
                                        {player.losses}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={getWinRate(player.wins, player.losses) >= 50 ? "default" : "secondary"}
                                            className="transition-all duration-200 hover:scale-105 hover:shadow-sm"
                                            title={`${player.wins} wins, ${player.losses} losses`}
                                        >
                                            {getWinRate(player.wins, player.losses)}%
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {getLast5Display(player.last5)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={player.streakType === 'W' ? "default" : "secondary"}
                                            className="transition-all duration-200 hover:scale-105 hover:shadow-sm"
                                        >
                                            {player.currentStreak} {player.streakType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{player.age}</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(player);
                                                }}
                                                className="transition-all duration-200 hover:scale-110 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 cursor-pointer"
                                                title="Edit player"
                                            >
                                                ✏️
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(player);
                                                }}
                                                className="transition-all duration-200 hover:scale-110 hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer"
                                                title="Delete player"
                                            >
                                                🗑️
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <WarningModal
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                title="Επιβεβαίωση Διαγραφής"
                description={deletingPlayer ? `Είστε σίγουροι ότι θέλετε να διαγράψετε τον παίκτη ${deletingPlayer.firstName} ${deletingPlayer.lastName}; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.` : ''}
                confirmText="Διαγραφή"
                cancelText="Ακύρωση"
                variant="destructive"
            />
        </div>
    );
} 