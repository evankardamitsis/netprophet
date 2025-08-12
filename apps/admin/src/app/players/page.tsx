'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WarningModal } from '@/components/ui/warning-modal';
import Papa, { ParseError, ParseResult } from 'papaparse';
import { Player } from '@netprophet/lib/types/player';
import { bulkInsertPlayers, fetchPlayers, deletePlayer } from '@netprophet/lib/supabase/players';
import { supabase } from '@netprophet/lib';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    ColumnFiltersState,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export default function PlayersPage() {
    const router = useRouter();
    const [players, setPlayers] = useState<Player[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);

    // Bulk upload state
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importedPlayers, setImportedPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([
        { id: 'lastName', desc: false }
    ]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [rowSelection, setRowSelection] = useState({});

    // Fetch players from Supabase on mount
    useEffect(() => {
        setLoading(true);
        fetchPlayers()
            .then((players) => {
                setPlayers(players);
            })
            .catch((err) => {
                console.error('Error fetching players:', err);
                toast.error('Failed to load players: ' + (err?.message || err));
            })
            .finally(() => setLoading(false));
    }, []);

    const handleEdit = useCallback((player: Player) => {
        router.push(`/players/${player.id}`);
    }, [router]);

    const handleDelete = useCallback((player: Player) => {
        setDeletingPlayer(player);
        setIsDeleteModalOpen(true);
    }, []);

    const columns = useMemo<ColumnDef<Player, any>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected()
                                ? true
                                : table.getIsSomePageRowsSelected()
                                    ? "indeterminate"
                                    : false
                        }
                        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={
                            row.getIsSelected()
                                ? true
                                : row.getIsSomeSelected()
                                    ? "indeterminate"
                                    : false
                        }
                        onCheckedChange={value => row.toggleSelected(!!value)}
                        aria-label="Select row"
                    />
                ),
                enableSorting: false,
                enableColumnFilter: false,
                size: 32,
            },
            {
                accessorKey: 'firstName',
                header: 'Όνομα',
                cell: info => info.getValue(),
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'lastName',
                header: 'Επώνυμο',
                cell: info => info.getValue(),
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'ntrpRating',
                header: 'NTRP',
                cell: info => info.getValue(),
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'wins',
                header: 'Νίκες',
                cell: info => info.getValue(),
                enableSorting: true,
            },
            {
                accessorKey: 'losses',
                header: 'Ήττες',
                cell: info => info.getValue(),
                enableSorting: true,
            },
            {
                id: 'winRate',
                header: 'Win Rate',
                cell: ({ row }) => {
                    const wins = row.original.wins;
                    const losses = row.original.losses;
                    const total = wins + losses;
                    return total > 0 ? Math.round((wins / total) * 100) + '%' : '0%';
                },
                enableSorting: false,
            },
            {
                id: 'last5',
                header: 'Τελευταία 5',
                cell: ({ row }) => (
                    <div className="flex">{row.original.last5.map((result, idx) => (
                        <span
                            key={idx}
                            className={`w-6 h-6 rounded-full text-xs font-bold inline-flex items-center justify-center mr-1 transition-all duration-200 hover:scale-110 hover:shadow-md ${result === 'W'
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                                }`}
                            title={`Match ${idx + 1}: ${result === 'W' ? 'Win' : 'Loss'}`}
                        >
                            {result}
                        </span>
                    ))}</div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'currentStreak',
                header: 'Streak',
                cell: ({ row }) => `${row.original.currentStreak} ${row.original.streakType}`,
                enableSorting: true,
            },
            {
                accessorKey: 'age',
                header: 'Ηλικία',
                cell: info => info.getValue(),
                enableSorting: true,
            },
            {
                id: 'actions',
                header: 'Ενέργειες',
                cell: ({ row }) => (
                    <div className="flex justify-end space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(row.original)}
                            className="transition-all duration-200 hover:scale-110 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 cursor-pointer"
                            title="Edit player"
                        >
                            ✏️
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(row.original)}
                            className="transition-all duration-200 hover:scale-110 hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer"
                            title="Delete player"
                        >
                            🗑️
                        </Button>
                    </div>
                ),
                enableSorting: false,
            },
        ],
        [handleEdit, handleDelete]
    );

    const table = useReactTable({
        data: players,
        columns,
        state: {
            sorting,
            globalFilter,
            columnFilters,
            rowSelection,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: (row, columnId, filterValue) => {
            const value = row.getValue<string>('firstName') + ' ' + row.getValue<string>('lastName');
            return value.toLowerCase().includes(filterValue.toLowerCase());
        },
        enableRowSelection: true,
    });

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
                    toast.error('Error parsing CSV. Please check your file format.');
                }
            },
            error: (error: Error, file: File) => toast.error(error.message),
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
            toast.success(`Successfully imported ${importedPlayers.length} players!`);
        } catch (err: any) {
            console.error('Import error:', err);
            toast.error(err.message || 'Import failed');
        }
    }

    const confirmDelete = async () => {
        if (deletingPlayer) {
            try {
                await deletePlayer(deletingPlayer.id);
                const freshPlayers = await fetchPlayers();
                setPlayers(freshPlayers);
                setDeletingPlayer(null);
                toast.success('Player deleted successfully!');
            } catch (error) {
                console.error('Error deleting player:', error);
                toast.error('Failed to delete player');
            }
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
                    onClick={() => router.push('/players/new')}
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

            {/* Players Table (TanStack Table) */}
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
                    <div className="mb-4 flex items-center gap-4">
                        <Input
                            placeholder="Search by name..."
                            value={globalFilter}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
                            className="max-w-xs"
                        />
                        <div className="ml-auto flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                {'<<'}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                {'<'}
                            </Button>
                            <span className="px-2 text-sm">
                                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                {'>'}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                {'>>'}
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border">
                            <thead>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th
                                                key={header.id}
                                                className={
                                                    'px-4 py-2 border-b ' +
                                                    (header.column.getCanSort() ? 'cursor-pointer select-none ' : '') +
                                                    (header.column.columnDef.header === 'Win Rate' || header.column.columnDef.header === 'Τελευταία 5' || header.column.columnDef.header === 'Streak' || header.column.columnDef.header === 'Ενέργειες'
                                                        ? 'text-center'
                                                        : 'text-left')
                                                }
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getIsSorted() === 'asc' && ' ▲'}
                                                {header.column.getIsSorted() === 'desc' && ' ▼'}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.map(row => (
                                    <tr
                                        key={row.id}
                                        className="border-b hover:bg-gray-50 align-middle cursor-pointer"
                                        onClick={e => {
                                            // Prevent navigation if clicking on a button or input
                                            if ((e.target as HTMLElement).closest('button,input')) return;
                                            router.push(`/players/${row.original.id}`);
                                        }}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <td
                                                key={cell.id}
                                                className={
                                                    'px-4 py-2 align-middle ' +
                                                    (cell.column.columnDef.header === 'Win Rate' || cell.column.columnDef.header === 'Τελευταία 5' || cell.column.columnDef.header === 'Streak' || cell.column.columnDef.header === 'Ενέργειες'
                                                        ? 'text-center'
                                                        : 'text-left')
                                                }
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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