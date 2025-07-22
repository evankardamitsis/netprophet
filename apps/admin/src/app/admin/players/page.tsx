'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WarningModal } from '@/components/ui/warning-modal';
import Papa, { ParseError, ParseResult } from 'papaparse';
import { Player } from '@netprophet/lib/types/player';
import { bulkInsertPlayers, fetchPlayers, deletePlayer } from '@netprophet/lib/supabase/players';
import { supabase } from '@netprophet/lib';

export default function PlayersPage() {
    supabase.auth.getUser().then((user) => {
        console.log('Current Supabase user ID:', user.data?.user?.id);
    });
    const router = useRouter();
    const [players, setPlayers] = useState<Player[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);

    // Bulk upload state
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importedPlayers, setImportedPlayers] = useState<Player[]>([]);
    const [importError, setImportError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch players from Supabase on mount
    useEffect(() => {
        setLoading(true);
        // Log the current user
        supabase.auth.getUser().then((user) => {
            console.log('Current Supabase user:', user);
        });
        fetchPlayers()
            .then((players) => {
                console.log('Fetched players:', players);
                setPlayers(players);
            })
            .catch((err) => {
                console.error('Error fetching players:', err);
                setFetchError('Σφάλμα κατά τη φόρτωση των παικτών: ' + (err?.message || err));
            })
            .finally(() => setLoading(false));
    }, []);

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        setImportError(null);
        const file = e.target.files?.[0];
        if (!file) return;
        Papa.parse<File>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: ParseResult<any>) => {
                const rows = results.data as any[];
                try {
                    const parsed: Player[] = rows.map((row) => ({
                        id: row.id || '',
                        firstName: row.firstName || '',
                        lastName: row.lastName || '',
                        ntrpRating: parseFloat(row.ntrpRating) || 0,
                        wins: parseInt(row.wins) || 0,
                        losses: parseInt(row.losses) || 0,
                        last5: (row.last5 || '').split(',').map((v: string) => v.trim()),
                        currentStreak: parseInt(row.currentStreak) || 0,
                        streakType: row.streakType === 'W' ? 'W' : 'L',
                        surfacePreference: row.surfacePreference || 'Hard Court',
                        surfaceWinRates: {
                            hardCourt: parseFloat(row.hardCourtWinRate) || 0,
                            clayCourt: parseFloat(row.clayCourtWinRate) || 0,
                            grassCourt: parseFloat(row.grassCourtWinRate) || 0,
                            indoor: parseFloat(row.indoorWinRate) || 0,
                        },
                        aggressiveness: parseInt(row.aggressiveness) || 5,
                        stamina: parseInt(row.stamina) || 5,
                        consistency: parseInt(row.consistency) || 5,
                        age: parseInt(row.age) || 25,
                        hand: row.hand === 'left' ? 'left' : 'right',
                        notes: row.notes || '',
                        lastMatchDate: row.lastMatchDate || '',
                        fatigueLevel: row.fatigueLevel ? parseInt(row.fatigueLevel) : undefined,
                        injuryStatus: row.injuryStatus || 'healthy',
                        seasonalForm: undefined, // auto-calculated
                    }));
                    setImportedPlayers(parsed);
                } catch (err) {
                    setImportError('Error parsing CSV. Please check your file format.');
                }
            },
            error: (error: Error, file: File) => setImportError(error.message),
        });
    }

    async function handleImportConfirm() {
        try {
            await bulkInsertPlayers(importedPlayers);
            setImportModalOpen(false);
            setImportedPlayers([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            // Refetch players from Supabase
            const freshPlayers = await fetchPlayers();
            setPlayers(freshPlayers);
        } catch (err: any) {
            setImportError(err.message || 'Import failed');
        }
    }

    const handleEdit = (player: Player) => {
        console.log('Edit button clicked for player:', player.id);
        router.push(`/admin/players/${player.id}`);
    };

    const handleDelete = (player: Player) => {
        setDeletingPlayer(player);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (deletingPlayer) {
            await deletePlayer(deletingPlayer.id);
            const freshPlayers = await fetchPlayers();
            setPlayers(freshPlayers);
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Φόρτωση...</p>
                </div>
            </div>
        );
    }
    if (fetchError) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 font-bold">{fetchError}</p>
                </div>
            </div>
        );
    }

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

            {/* Bulk Upload Button and Modal */}
            <button
                className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => setImportModalOpen(true)}
            >
                Bulk Upload Players
            </button>
            {importModalOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg w-full max-w-3xl relative">
                        {/* Close button */}
                        <button
                            className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-gray-700"
                            onClick={() => setImportModalOpen(false)}
                            aria-label="Close"
                        >
                            &times;
                        </button>
                        <h2 className="text-xl font-bold mb-2">Import Players from CSV</h2>
                        <a
                            href="/players_bulk_template.csv"
                            download
                            className="text-blue-600 underline text-sm mb-4 inline-block"
                        >
                            Download CSV Template
                        </a>
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="mb-4 block"
                        />
                        {importError && (
                            <div className="text-red-600 mb-2 font-semibold">{importError}</div>
                        )}
                        {importedPlayers.length > 0 && (
                            <>
                                <div className="max-h-64 overflow-x-auto border mb-4 rounded">
                                    <table className="min-w-full text-xs">
                                        <thead>
                                            <tr>
                                                <th>First Name</th>
                                                <th>Last Name</th>
                                                <th>NTRP</th>
                                                <th>Wins</th>
                                                <th>Losses</th>
                                                <th>Surface</th>
                                                <th>Streak</th>
                                                <th>Age</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importedPlayers.map((p, i) => (
                                                <tr key={i}>
                                                    <td>{p.firstName}</td>
                                                    <td>{p.lastName}</td>
                                                    <td>{p.ntrpRating}</td>
                                                    <td>{p.wins}</td>
                                                    <td>{p.losses}</td>
                                                    <td>{p.surfacePreference}</td>
                                                    <td>{p.currentStreak} {p.streakType}</td>
                                                    <td>{p.age}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button
                                    className="px-4 py-2 bg-green-600 text-white rounded mr-2 disabled:opacity-60"
                                    onClick={handleImportConfirm}
                                    disabled={importedPlayers.length === 0}
                                >
                                    Import {importedPlayers.length} Players
                                </button>
                                <button
                                    className="px-4 py-2 bg-gray-300 rounded"
                                    onClick={() => setImportModalOpen(false)}
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                        {!importedPlayers.length && (
                            <p className="text-gray-500">Upload a CSV file using the template.</p>
                        )}
                    </div>
                </div>
            )}

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