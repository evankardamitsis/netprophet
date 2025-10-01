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
import { bulkInsertPlayers, fetchPlayers, fetchPlayersPaginated, deletePlayer, updatePlayerStatus } from '@netprophet/lib/supabase/players';
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
import { normalizeText } from '@/lib/utils';

export default function PlayersPage() {
    const router = useRouter();
    const [players, setPlayers] = useState<Player[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [deactivatingPlayer, setDeactivatingPlayer] = useState<Player | null>(null);

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

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Fetch players from Supabase with pagination
    const fetchPlayersData = useCallback(async (page: number = 1, searchTerm?: string) => {
        setLoading(true);
        try {
            const currentSort = sorting.length > 0 ? sorting[0] : null;
            const sortBy = currentSort?.id === 'firstName' ? 'first_name' :
                currentSort?.id === 'lastName' ? 'last_name' :
                    currentSort?.id === 'ntrpRating' ? 'ntrp_rating' :
                        currentSort?.id === 'wins' ? 'wins' :
                            currentSort?.id === 'losses' ? 'losses' :
                                currentSort?.id === 'currentStreak' ? 'current_streak' :
                                    currentSort?.id === 'age' ? 'age' : 'last_name';

            const result = await fetchPlayersPaginated(
                page,
                pageSize,
                sortBy,
                currentSort?.desc ? 'desc' : 'asc',
                searchTerm || globalFilter
            );

            setPlayers(result.players);
            setTotalCount(result.totalCount);
            setTotalPages(result.totalPages);
            setCurrentPage(result.page);
        } catch (err) {
            console.error('Error fetching players:', err);
            toast.error('Failed to load players: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    }, [sorting, pageSize, globalFilter]);

    // Fetch players on mount and when dependencies change
    useEffect(() => {
        fetchPlayersData(1);
    }, [fetchPlayersData]);

    const handleEdit = useCallback((player: Player) => {
        router.push(`/players/${player.id}`);
    }, [router]);

    const handleDelete = useCallback((player: Player) => {
        setDeletingPlayer(player);
        setIsDeleteModalOpen(true);
    }, []);

    const handleToggleStatus = useCallback(async (player: Player) => {
        // If deactivating a claimed player, show confirmation modal
        if (player.isActive && player.claimedByUserId) {
            setDeactivatingPlayer(player);
            setIsDeactivateModalOpen(true);
            return;
        }

        // Otherwise, toggle status directly
        try {
            await updatePlayerStatus(player.id, !player.isActive);
            // Refetch players with pagination
            await fetchPlayersData(currentPage);

            if (!player.isActive) {
                toast.success(`Player activated successfully!`);
            } else {
                toast.success(`Player deactivated successfully!`);
            }
        } catch (error) {
            console.error('Error toggling player status:', error);
            toast.error('Failed to update player status');
        }
    }, [currentPage, fetchPlayersData]);

    const confirmDeactivate = useCallback(async () => {
        if (!deactivatingPlayer) return;

        try {
            await updatePlayerStatus(deactivatingPlayer.id, false);
            // Refetch players with pagination
            await fetchPlayersData(currentPage);
            toast.success(`Player deactivated and user unclaimed successfully!`);
            setIsDeactivateModalOpen(false);
            setDeactivatingPlayer(null);
        } catch (error) {
            console.error('Error deactivating player:', error);
            toast.error('Failed to deactivate player');
        }
    }, [deactivatingPlayer, currentPage, fetchPlayersData]);

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
                cell: info => parseFloat(info.getValue()).toFixed(1),
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
                accessorKey: 'isActive',
                header: 'Κατάσταση',
                cell: ({ row }) => {
                    const isActive = row.original.isActive;
                    return (
                        <div className="flex items-center space-x-2">
                            <Badge
                                variant={isActive ? "default" : "secondary"}
                                className={isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                            >
                                {isActive ? 'Ενεργός' : 'Ανενεργός'}
                            </Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleStatus(row.original);
                                }}
                                className="text-xs"
                            >
                                {isActive ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
                            </Button>
                        </div>
                    );
                },
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
        [handleEdit, handleDelete, handleToggleStatus]
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
        onSortingChange: (updater) => {
            setSorting(updater);
            // Refetch data when sorting changes
            setTimeout(() => fetchPlayersData(1), 0);
        },
        onGlobalFilterChange: (value) => {
            setGlobalFilter(value);
            // Refetch data when search changes
            setTimeout(() => fetchPlayersData(1, value), 0);
        },
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        // Remove client-side pagination since we're using server-side
        manualPagination: true,
        pageCount: totalPages,
        globalFilterFn: (row, columnId, filterValue) => {
            const value = row.getValue<string>('firstName') + ' ' + row.getValue<string>('lastName');
            const normalizedValue = normalizeText(value);
            const normalizedFilter = normalizeText(filterValue);
            return normalizedValue.includes(normalizedFilter);
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
                        id: '', // Let the database generate UUID
                        firstName: row.firstName || '',
                        lastName: row.lastName || '',
                        ntrpRating: parseFloat(row.ntrpRating) || 0,
                        wins: parseInt(row.wins) || 0,
                        losses: parseInt(row.losses) || 0,
                        last5: (row.last5 || '').split(',').map((v: string) => v.trim()),
                        currentStreak: parseInt(row.currentStreak) || 0,
                        streakType: row.streakType === 'W' ? 'W' : 'L',
                        surfacePreference: row.surfacePreference || 'Hard Court',
                        // Surface match counts (historical data)
                        hardMatches: parseInt(row.hardMatches) || 0,
                        clayMatches: parseInt(row.clayMatches) || 0,
                        grassMatches: parseInt(row.grassMatches) || 0,
                        // Win rates will be auto-calculated from match counts
                        surfaceWinRates: {
                            hardCourt: 0, // Will be calculated
                            clayCourt: 0,
                            grassCourt: 0,
                        },
                        aggressiveness: parseInt(row.aggressiveness) || 5,
                        stamina: parseInt(row.stamina) || 5,
                        consistency: parseInt(row.consistency) || 5,
                        age: parseInt(row.age) || 25,
                        hand: row.hand === 'left' ? 'left' : 'right',
                        notes: row.notes || '',
                        lastMatchDate: row.lastMatchDate || '',
                        injuryStatus: row.injuryStatus || 'healthy',
                        seasonalForm: undefined, // auto-calculated
                        // Historical players are hidden and inactive until claimed
                        isHidden: true,
                        isActive: false,
                        isDemoPlayer: false,
                        claimedByUserId: undefined,
                        claimedAt: undefined,
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
            const result = await bulkInsertPlayers(importedPlayers);
            const imported = result.length;
            const skipped = importedPlayers.length - imported;

            setImportModalOpen(false);
            setImportedPlayers([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            // Refetch players with pagination
            await fetchPlayersData(1);

            if (skipped > 0) {
                toast.success(`Successfully imported ${imported} players! ${skipped} duplicates skipped.`);
            } else {
                toast.success(`Successfully imported ${imported} players!`);
            }
        } catch (err: any) {
            console.error('Import error:', err);
            toast.error(err.message || 'Import failed');
        }
    }

    const confirmDelete = async () => {
        if (deletingPlayer) {
            try {
                await deletePlayer(deletingPlayer.id);
                // Refetch players with pagination
                await fetchPlayersData(currentPage);
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
                                                <th className="px-2">First Name</th>
                                                <th className="px-2">Last Name</th>
                                                <th className="px-2">NTRP</th>
                                                <th className="px-2">Wins</th>
                                                <th className="px-2">Losses</th>
                                                <th className="px-2">Surface</th>
                                                <th className="px-2">Hard</th>
                                                <th className="px-2">Clay</th>
                                                <th className="px-2">Grass</th>
                                                <th className="px-2">Streak</th>
                                                <th className="px-2">Age</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importedPlayers.map((p, i) => (
                                                <tr key={i}>
                                                    <td className="px-2">{p.firstName}</td>
                                                    <td className="px-2">{p.lastName}</td>
                                                    <td className="px-2">{p.ntrpRating.toFixed(1)}</td>
                                                    <td className="px-2">{p.wins}</td>
                                                    <td className="px-2">{p.losses}</td>
                                                    <td className="px-2">{p.surfacePreference}</td>
                                                    <td className="px-2">{p.hardMatches || 0}</td>
                                                    <td className="px-2">{p.clayMatches || 0}</td>
                                                    <td className="px-2">{p.grassMatches || 0}</td>
                                                    <td className="px-2">{p.currentStreak} {p.streakType}</td>
                                                    <td className="px-2">{p.age}</td>
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
                            {totalCount}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 space-y-4">
                        {/* Search and Page Size - Mobile First */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Input
                                placeholder="Search by name..."
                                value={globalFilter}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
                                className="w-full sm:max-w-xs"
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Page size:</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        const newPageSize = parseInt(e.target.value);
                                        setPageSize(newPageSize);
                                        fetchPlayersData(1);
                                    }}
                                    className="border rounded px-2 py-1 text-sm"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>

                        {/* Pagination Info and Controls */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="text-sm text-gray-600">
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} players
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fetchPlayersData(1)}
                                    disabled={currentPage === 1}
                                    className="hidden sm:flex"
                                >
                                    {'<<'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fetchPlayersData(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    {'<'}
                                </Button>
                                <span className="px-2 text-sm flex items-center whitespace-nowrap">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fetchPlayersData(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                >
                                    {'>'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fetchPlayersData(totalPages)}
                                    disabled={currentPage >= totalPages}
                                    className="hidden sm:flex"
                                >
                                    {'>>'}
                                </Button>
                            </div>
                        </div>
                    </div>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
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

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-3">
                        {table.getRowModel().rows.map(row => {
                            const player = row.original;
                            const winRate = player.wins + player.losses > 0 ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(1) : '0.0';

                            return (
                                <div
                                    key={row.id}
                                    className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={e => {
                                        // Prevent navigation if clicking on a button or input
                                        if ((e.target as HTMLElement).closest('button,input')) return;
                                        router.push(`/players/${player.id}`);
                                    }}
                                >
                                    {/* Player Name and NTRP */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-lg text-gray-900">
                                                {player.firstName} {player.lastName}
                                            </h3>
                                            <div className="text-sm text-gray-600">
                                                NTRP: {player.ntrpRating.toFixed(1)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-gray-900">
                                                {winRate}% Win Rate
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {player.wins}W - {player.losses}L
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Surface:</span>
                                            <span className="font-medium">{player.surfacePreference}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Age:</span>
                                            <span className="font-medium">{player.age}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Streak:</span>
                                            <span className="font-medium">
                                                {player.currentStreak} {player.streakType}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Last 5:</span>
                                            <span className="font-medium">
                                                {player.last5.slice(0, 3).join(', ')}
                                                {player.last5.length > 3 && '...'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Status:</span>
                                            <div className="flex items-center space-x-2">
                                                <Badge
                                                    variant={player.isActive ? "default" : "secondary"}
                                                    className={player.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                                                >
                                                    {player.isActive ? 'Ενεργός' : 'Ανενεργός'}
                                                </Badge>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleStatus(player);
                                                    }}
                                                    className="text-xs"
                                                >
                                                    {player.isActive ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex space-x-2 pt-2 border-t border-gray-100">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(player);
                                            }}
                                            className="flex-1 text-xs"
                                        >
                                            ✏️ Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(player);
                                            }}
                                            className="flex-1 text-xs text-red-600 hover:text-red-700"
                                        >
                                            🗑️ Delete
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
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
            <WarningModal
                isOpen={isDeactivateModalOpen}
                onClose={() => {
                    setIsDeactivateModalOpen(false);
                    setDeactivatingPlayer(null);
                }}
                onConfirm={confirmDeactivate}
                title="Deactivate Claimed Player"
                description={deactivatingPlayer ? `This player (${deactivatingPlayer.firstName} ${deactivatingPlayer.lastName}) is currently claimed by a user.\n\nDeactivating will unclaim the user and allow them to claim a profile again.\n\nDo you want to continue?` : ''}
                confirmText="Deactivate"
                cancelText="Cancel"
                variant="destructive"
            />
        </div>
    );
} 