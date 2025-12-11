'use client';

import { useState, useMemo, useCallback } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { Match } from '@/types/dashboard';
import { useMatchSelect } from '@/context/MatchSelectContext';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { useDictionary } from '@/context/DictionaryContext';
import { gradients, shadows, borders, transitions, animations, cx, typography } from '@/styles/design-system';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface MatchesTableProps {
    matches?: Match[];
    onSelectMatch?: (match: Match) => void;
    sidebarOpen?: boolean;
    slipCollapsed?: boolean;
}

export function MatchesTable({ matches = [], sidebarOpen = true, slipCollapsed }: MatchesTableProps) {
    const onSelectMatch = useMatchSelect();
    const { slipCollapsed: contextSlipCollapsed } = usePredictionSlip();
    const { dict } = useDictionary();
    const isSlipCollapsed = slipCollapsed ?? contextSlipCollapsed;
    const [matchTypeFilter, setMatchTypeFilter] = useState<'all' | 'singles' | 'doubles'>('all');

    const getDisplayName = useCallback((match: Match, side: 'team1' | 'team2') => {
        const formatPlayerLine = (player: any) => {
            if (!player) return 'TBD (N/A)';
            const ntrp = player?.ntrp_rating ? player.ntrp_rating.toFixed(1) : 'N/A';
            return `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() + ` (${ntrp})`;
        };

        const renderDoublesLines = (players?: any[]) => {
            const [p1, p2] = players || [];
            return (
                <div className="flex flex-col text-xs text-white leading-tight space-y-0.5">
                    <span className="truncate">{formatPlayerLine(p1)}</span>
                    <span className="truncate">{formatPlayerLine(p2)}</span>
                </div>
            );
        };

        const isTeam1 = side === 'team1';
        if (match.match_type !== 'doubles') {
            const player = isTeam1 ? match.player1 : match.player2;
            const rating = isTeam1 ? match.player_a?.ntrp_rating : match.player_b?.ntrp_rating;
            const ratingText = rating ? rating.toFixed(1) : 'N/A';
            return `${player.name} (${ratingText})`;
        }
        const players = isTeam1 ? match.team1?.players : match.team2?.players;
        return renderDoublesLines(players);
    }, []);

    // Table state
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    // Format time for display
    const formatTime = (startTime: string | Date) => {
        const date = typeof startTime === 'string' ? new Date(startTime) : startTime;
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    // Format date for display
    const formatDate = (startTime: string | Date) => {
        const date = typeof startTime === 'string' ? new Date(startTime) : startTime;
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short'
        });
    };

    // Check if match has underdog odds
    const isUnderdog = useCallback((match: Match) => {
        return !match.locked && Math.abs(match.player1.odds - match.player2.odds) > 2.5;
    }, []);

    // Normalize text for filtering
    const normalizeText = (text: string) => {
        return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };

    const columns = useMemo<ColumnDef<Match, any>[]>(
        () => [
            {
                accessorKey: 'startTime',
                header: 'Time',
                cell: info => {
                    const startTime = info.getValue();
                    return (
                        <div className="text-sm text-gray-300">
                            <div className="font-medium">{formatTime(startTime)}</div>
                            <div className="text-xs text-gray-500">{formatDate(startTime)}</div>
                        </div>
                    );
                },
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'tournament',
                header: 'Tournament',
                cell: info => (
                    <div className="text-sm text-gray-300 font-medium truncate max-w-[120px]">
                        {info.getValue()}
                    </div>
                ),
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'tournament_categories.name',
                header: 'Category',
                cell: info => (
                    <div className="text-sm text-gray-300 font-medium truncate max-w-[100px]">
                        {info.getValue() || ''}
                    </div>
                ),
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'round',
                header: 'Round',
                cell: info => (
                    <div className="text-sm text-gray-300 font-medium truncate max-w-[100px]">
                        {info.getValue() || ''}
                    </div>
                ),
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                id: 'match',
                header: 'Match',
                cell: ({ row }) => {
                    const match = row.original;
                    const underdog = isUnderdog(match);
                    return (
                        <div className="text-sm">
                            <div className="flex items-center space-x-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <div className="text-white font-medium truncate">
                                            {getDisplayName(match, 'team1')}
                                        </div>
                                        <div className="text-2xl font-bold text-white ml-2">{match.player1.odds.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="text-gray-500 font-bold text-xs mx-2">VS</div>
                                <div className="flex-1 min-w-0 text-right">
                                    <div className="flex items-center justify-between">
                                        <div className="text-2xl font-bold text-white mr-2">{match.player2.odds.toFixed(2)}</div>
                                        <div className="text-white font-medium truncate">
                                            {getDisplayName(match, 'team2')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {underdog && (
                                <div className="mt-2 text-center">
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-bold text-orange-400 bg-orange-500/10 rounded-full">
                                        🔥 UNDERDOG ALERT
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                },
                enableSorting: false,
                enableColumnFilter: true,
            },
            {
                id: 'action',
                header: 'Action',
                cell: ({ row }) => {
                    const match = row.original;
                    return (
                        <div className="text-center">
                            {!match.locked ? (
                                <motion.button
                                    className={cx(
                                        "px-3 py-1.5 text-xs font-semibold text-white rounded",
                                        gradients.purple,
                                        borders.rounded.sm,
                                        transitions.default,
                                        shadows.glow.purple,
                                        "hover:scale-105 active:scale-95"
                                    )}
                                    onClick={() => onSelectMatch(match)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {dict?.sidebar?.makePrediction || 'Βάλε Προβλέψεις'}
                                </motion.button>
                            ) : (
                                <span className="text-xs text-gray-500">Locked</span>
                            )}
                        </div>
                    );
                },
                enableSorting: false,
                enableColumnFilter: false,
            },
        ],
        [onSelectMatch, dict, isUnderdog, getDisplayName]
    );

    const filteredMatches = useMemo(() => {
        if (matchTypeFilter === 'all') return matches;
        return matches.filter(match => match.match_type === matchTypeFilter);
    }, [matches, matchTypeFilter]);

    const table = useReactTable({
        data: filteredMatches,
        columns,
        state: {
            sorting,
            globalFilter,
            columnFilters,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: (row, columnId, filterValue) => {
            // Filter by tournament, players, category, round
            const tournament = row.getValue<string>('tournament') || '';
            const category = row.original.tournament_categories?.name || '';
            const round = row.getValue<string>('round') || '';
            const player1 = row.original.player1.name || '';
            const player2 = row.original.player2.name || '';
            const value = `${tournament} ${category} ${round} ${player1} ${player2}`;
            const normalizedValue = normalizeText(value);
            const normalizedFilter = normalizeText(filterValue);
            return normalizedValue.includes(normalizedFilter);
        },
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    return (
        <div className="w-full space-y-4">
            {/* Title */}
            <h2 className={cx(typography.heading.md, "text-white flex items-center text-sm xs:text-base sm:text-lg mt-6")}>
                <span className="w-1.5 xs:w-2 h-1.5 xs:h-2 rounded-full bg-purple-500 mr-1.5 xs:mr-2 sm:mr-3"></span>
                {dict?.sidebar?.upcoming || 'Upcoming Matches'}
                <span className={cx(typography.body.sm, "ml-2 text-gray-400 text-xs xs:text-sm")}>({table.getFilteredRowModel().rows.length})</span>
            </h2>

            {/* Filters and search */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-2xl px-2 py-1">
                        {[
                            { key: 'all', label: dict?.matches?.matchTypeAll || 'All' },
                            { key: 'singles', label: dict?.matches?.matchTypeSingles || 'Singles' },
                            { key: 'doubles', label: dict?.matches?.matchTypeDoubles || 'Doubles' },
                        ].map(option => (
                            <Button
                                key={option.key}
                                variant="outline"
                                onClick={() => setMatchTypeFilter(option.key as 'all' | 'singles' | 'doubles')}
                                className={cx(
                                    "px-3 py-1 text-xs font-semibold rounded-xl border-slate-600",
                                    matchTypeFilter === option.key
                                        ? "bg-purple-600/90 text-white border-purple-500"
                                        : "bg-transparent text-gray-200 hover:bg-slate-700"
                                )}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="w-full lg:flex-1 lg:max-w-md">
                    <input
                        type="text"
                        placeholder="Search matches by tournament, players, category..."
                        value={globalFilter}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-2xl text-white placeholder-gray-400 placeholder:text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                </div>
            </div>

            {/* Desktop Table View */}
            {filteredMatches.length > 0 && (
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full bg-slate-900/80 rounded-2xl border border-slate-700 overflow-hidden">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id} className="border-b border-slate-700">
                                    {headerGroup.headers.map(header => (
                                        <th
                                            key={header.id}
                                            className={
                                                'px-4 py-3 text-xs font-semibold text-gray-300 uppercase tracking-wider ' +
                                                (header.column.getCanSort() ? 'cursor-pointer select-none hover:text-white ' : '') +
                                                (header.column.columnDef.header === 'Action' ? 'text-center' : 'text-left')
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
                        <tbody className="divide-y divide-slate-700">
                            {table.getRowModel().rows.map((row, index) => {
                                const match = row.original;
                                const underdog = isUnderdog(match);
                                const isLastRow = index === table.getRowModel().rows.length - 1;

                                return (
                                    <tr
                                        key={row.id}
                                        className={`hover:bg-slate-800/50 transition-colors ${underdog ? 'bg-orange-500/5 border-l-4 border-orange-500' : ''}`}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <td
                                                key={cell.id}
                                                className={`px-4 py-3 align-middle ${cell.column.columnDef.header === 'Action' ? 'text-center' : 'text-left'
                                                    } ${isLastRow && cell.column.id === 'startTime' ? 'rounded-bl-2xl' : ''} ${isLastRow && cell.column.id === 'action' ? 'rounded-br-2xl' : ''
                                                    }`}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Mobile Table View */}
            <div className="lg:hidden">
                <div className="bg-slate-900/80 rounded-2xl border border-slate-700 overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left p-2 text-gray-300 font-semibold w-16">Time</th>
                                <th className="text-left p-2 text-gray-300 font-semibold">Match</th>
                                <th className="text-center p-2 text-gray-300 font-semibold w-28">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {table.getRowModel().rows.map((row, index) => {
                                const match = row.original;
                                const underdog = isUnderdog(match);
                                const isLastRow = index === table.getRowModel().rows.length - 1;

                                return (
                                    <tr
                                        key={row.id}
                                        className={`hover:bg-slate-800/50 transition-colors ${underdog ? 'bg-orange-500/5 border-l-4 border-l-orange-500' : ''}`}
                                    >
                                        {/* Time */}
                                        <td className={`p-2 text-gray-300 w-16 ${isLastRow ? 'rounded-bl-2xl' : ''}`}>
                                            <div className="font-medium text-xs">{formatTime(match.startTime)}</div>
                                            <div className="text-xs text-gray-500">{formatDate(match.startTime)}</div>
                                        </td>

                                        {/* Match - Compact */}
                                        <td className="p-2">
                                            <div className="space-y-1">
                                                {/* Tournament info */}
                                                <div className="text-xs text-gray-400 truncate">
                                                    {match.tournament} • {match.tournament_categories?.name || ''}
                                                </div>

                                                {/* Players and odds - Left aligned */}
                                                <div className="flex items-center justify-between">
                                                    <div className="min-w-0">
                                                        <div className="text-white font-medium text-xs truncate">
                                                            {getDisplayName(match, 'team1')}
                                                        </div>
                                                    </div>
                                                    <div className="text-lg font-bold text-white ml-2">{match.player1.odds.toFixed(2)}</div>
                                                </div>

                                                <div className="text-center text-gray-500 font-bold text-xs">VS</div>

                                                <div className="flex items-center justify-between">
                                                    <div className="min-w-0">
                                                        <div className="text-white font-medium text-xs truncate">
                                                            {getDisplayName(match, 'team2')}
                                                        </div>
                                                    </div>
                                                    <div className="text-lg font-bold text-white ml-2">{match.player2.odds.toFixed(2)}</div>
                                                </div>

                                                {underdog && (
                                                    <div className="text-center">
                                                        <span className="inline-flex items-center px-1 py-0.5 text-xs font-bold text-orange-400 bg-orange-500/10 rounded-full">
                                                            🔥
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Action - Compact button */}
                                        <td className={`p-2 text-center w-28 ${isLastRow ? 'rounded-br-2xl' : ''}`}>
                                            <div className="h-full flex items-center justify-center">
                                                {!match.locked ? (
                                                    <motion.button
                                                        className={cx(
                                                            "w-full px-1 py-2 text-xs font-semibold text-white rounded-lg",
                                                            gradients.purple,
                                                            borders.rounded.sm,
                                                            transitions.default,
                                                            shadows.glow.purple,
                                                            "hover:scale-105 active:scale-95"
                                                        )}
                                                        onClick={() => onSelectMatch(match)}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        {dict?.sidebar?.makePrediction || 'Βάλε Προβλέψεις'}
                                                    </motion.button>
                                                ) : (
                                                    <div className="w-full px-1 py-2 text-xs text-center text-gray-500 bg-slate-800/50 rounded-lg">
                                                        Locked
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {filteredMatches.length > 0 && (
                <div className="flex justify-end">
                    <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-2xl px-3 py-2">
                        <Button
                            variant="outline"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700 px-2 py-1 text-sm rounded-xl"
                        >
                            {'<<'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700 px-2 py-1 text-sm rounded-xl"
                        >
                            {'<'}
                        </Button>
                        <span className="px-2 text-sm text-gray-300">
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700 px-2 py-1 text-sm rounded-xl"
                        >
                            {'>'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                            className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700 px-2 py-1 text-sm rounded-xl"
                        >
                            {'>>'}
                        </Button>
                    </div>
                </div>
            )}

            {/* No matches state */}
            {filteredMatches.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎾</div>
                    <h2 className="text-2xl font-semibold mb-2 text-white">No Matches Available</h2>
                    <p className="text-gray-400">Check back later for upcoming matches</p>
                </div>
            )}
        </div>
    );
}