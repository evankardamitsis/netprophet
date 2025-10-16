'use client';

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, MoreHorizontal, Edit, Trash2, Globe, Globe2, Lock } from "lucide-react";
import { MATCH_STATUSES, MATCH_STATUS_OPTIONS, type MatchStatus } from "@netprophet/lib";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Match } from "@/types";

interface TournamentMatchesTableProps {
    matches: Match[];
    onEditMatch: (match: Match) => void;
    onDeleteMatch: (id: string) => void;
    onCalculateOdds: (matchIds: string[]) => void;
    onSyncToWeb: (matchIds: string[]) => void;
    onRemoveFromWeb: (matchIds: string[]) => void;
    onUpdateMatchStatus: (matchId: string, status: string) => void;
    getStatusColor: (status: string) => string;
    formatTime: (timeString: string | null) => string;
    selectedMatches: string[];
    onSelectionChange: (matchIds: string[]) => void;
}

export function TournamentMatchesTable({
    matches,
    onEditMatch,
    onDeleteMatch,
    onCalculateOdds,
    onSyncToWeb,
    onRemoveFromWeb,
    onUpdateMatchStatus,
    getStatusColor,
    formatTime,
    selectedMatches,
    onSelectionChange
}: TournamentMatchesTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([
        {
            id: "created_at",
            desc: true
        }
    ]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [webSyncFilter, setWebSyncFilter] = React.useState<string>("all");

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = React.useState(false);
    const [pendingStatusChange, setPendingStatusChange] = React.useState<{
        matchId: string;
        newStatus: MatchStatus;
        currentStatus: string;
        matchName: string;
    } | null>(null);

    const getPlayerName = (player: any) => {
        if (player?.first_name && player?.last_name) {
            const ntrp = player?.ntrp_rating ? ` (${parseFloat(player.ntrp_rating).toFixed(1)})` : '';
            return `${player.first_name} ${player.last_name}${ntrp}`;
        }
        return 'TBD';
    };

    // Handle status change confirmation
    const handleConfirmStatusChange = () => {
        if (pendingStatusChange) {
            onUpdateMatchStatus(pendingStatusChange.matchId, pendingStatusChange.newStatus);
        }
        setShowConfirmModal(false);
        setPendingStatusChange(null);
    };

    // Handle status change cancellation
    const handleCancelStatusChange = () => {
        setShowConfirmModal(false);
        setPendingStatusChange(null);
    };

    // Get status warning message based on the status change
    const getStatusWarning = (current: string, newStatus: string) => {
        const warnings = {
            finished: "This will mark the match as completed and may trigger result calculations.",
            live: "This will mark the match as live and make it available for betting.",
            upcoming: "This will open the edit modal to set the scheduled date and time.",
            cancelled: "This will mark the match as cancelled and may affect betting."
        };
        return warnings[newStatus as keyof typeof warnings] || "This will update the match status.";
    };

    const columns: ColumnDef<Match>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "player_a",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Player A
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const player = row.getValue("player_a") as any;
                return <div className="font-medium">{getPlayerName(player)}</div>;
            },
        },
        {
            accessorKey: "player_b",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Player B
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const player = row.getValue("player_b") as any;
                return <div className="font-medium">{getPlayerName(player)}</div>;
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => {
                return (
                    <div className="flex flex-col">
                        <span>Status</span>
                        <span className="text-xs text-gray-500 font-normal">(Select to change)</span>
                    </div>
                );
            },
            cell: ({ row }) => {
                const match = row.original;
                const status = row.getValue("status") as string;

                const statusOptions = MATCH_STATUS_OPTIONS;

                const handleStatusChange = (newStatus: MatchStatus) => {
                    if (newStatus === status) return; // No change needed

                    // Special handling for scheduled status - open edit modal
                    if (newStatus === 'upcoming') {
                        // Open edit match modal for scheduling
                        onEditMatch(match);
                        return;
                    }

                    // Get match name for display
                    const playerAName = getPlayerName(match.player_a);
                    const playerBName = getPlayerName(match.player_b);
                    const matchName = `${playerAName} vs ${playerBName}`;

                    // Show confirmation modal for other status changes
                    setPendingStatusChange({
                        matchId: match.id,
                        newStatus,
                        currentStatus: status,
                        matchName
                    });
                    setShowConfirmModal(true);
                };

                // Find the current status option to display the proper label
                const currentStatusOption = statusOptions.find(option => option.value === status);
                const displayValue = currentStatusOption ? currentStatusOption.label : status;

                // Define colors for each status
                const getStatusColors = (statusValue: string) => {
                    switch (statusValue) {
                        case 'upcoming':
                            return 'bg-blue-50 border-blue-200 text-blue-800';
                        case 'live':
                            return 'bg-green-50 border-green-200 text-green-800';
                        case 'finished':
                            return 'bg-gray-50 border-gray-200 text-gray-800';
                        case 'cancelled':
                            return 'bg-red-50 border-red-200 text-red-800';
                        default:
                            return 'bg-gray-50 border-gray-200 text-gray-800';
                    }
                };

                const triggerColors = getStatusColors(status);

                return (
                    <Select value={status} onValueChange={handleStatusChange}>
                        <SelectTrigger className={`w-28 h-7 ${triggerColors} border`}>
                            <SelectValue>{displayValue}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(option => {
                                const itemColors = getStatusColors(option.value);
                                const isScheduled = option.value === 'upcoming';
                                return (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        className={`${itemColors} border-l-4 my-1`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="capitalize font-medium">{option.label}</span>
                                            {isScheduled && (
                                                <span className="text-xs text-blue-600 ml-2">
                                                    (opens edit modal)
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                );
            },
        },
        {
            accessorKey: "odds",
            header: "Odds",
            cell: ({ row }) => {
                const match = row.original;
                if (!match.odds_a || !match.odds_b) {
                    return (
                        <div className="text-red-500 text-sm font-medium">
                            Not calculated
                        </div>
                    );
                }

                return (
                    <div className="text-sm space-y-1">
                        <div className="flex justify-between gap-2">
                            <span className="font-medium">A:</span>
                            <span className="text-green-600">{match.odds_a.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="font-medium">B:</span>
                            <span className="text-green-600">{match.odds_b.toFixed(2)}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "locked",
            header: "Lock Status",
            cell: ({ row }) => {
                const match = row.original;
                const isLocked = match.locked;
                const lockTime = match.lock_time;

                if (!lockTime) {
                    return <div className="text-gray-400 text-sm">No lock time</div>;
                }

                if (isLocked) {
                    return (
                        <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-red-500" />
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                                Locked
                            </Badge>
                        </div>
                    );
                }

                // Check if lock time has passed
                const now = new Date();
                const lockDateTime = new Date(lockTime);
                const isPastLockTime = now >= lockDateTime;

                if (isPastLockTime) {
                    return (
                        <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-orange-500" />
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                Should Lock
                            </Badge>
                        </div>
                    );
                }

                return (
                    <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-green-500" />
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            Open
                        </Badge>
                    </div>
                );
            },
        },
        {
            accessorKey: "round",
            header: "Round",
            cell: ({ row }) => {
                const round = row.getValue("round") as string;
                return round ? <div className="text-sm">{round}</div> : <div className="text-gray-400">-</div>;
            },
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Created
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const createdAt = row.getValue("created_at") as string;
                if (!createdAt) return <div className="text-gray-400">-</div>;

                try {
                    const date = new Date(createdAt);
                    if (isNaN(date.getTime())) return <div className="text-gray-400">-</div>;

                    return (
                        <div className="text-sm">
                            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </div>
                    );
                } catch {
                    return <div className="text-gray-400">-</div>;
                }
            },
        },
        {
            accessorKey: "start_time",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Start Time
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const startTime = row.getValue("start_time") as string;
                if (!startTime) return <div className="text-gray-400">-</div>;

                try {
                    const date = new Date(startTime);
                    if (isNaN(date.getTime())) return <div className="text-gray-400">-</div>;

                    return (
                        <div className="text-sm">
                            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </div>
                    );
                } catch {
                    return <div className="text-gray-400">-</div>;
                }
            },
        },
        {
            accessorKey: "web_synced",
            header: "Web Status",
            cell: ({ row }) => {
                const match = row.original;
                return (
                    <div className="flex items-center gap-2">
                        {match.web_synced ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                                <Globe className="h-3 w-3 mr-1" />
                                Synced
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="text-gray-600">
                                <Globe2 className="h-3 w-3 mr-1" />
                                Not Synced
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const match = row.original;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditMatch(match)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Match
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onDeleteMatch(match.id)}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Match
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    // Filter matches based on web sync status
    const filteredMatches = React.useMemo(() => {
        if (webSyncFilter === "all") return matches;
        if (webSyncFilter === "synced") return matches.filter(match => match.web_synced);
        if (webSyncFilter === "not-synced") return matches.filter(match => !match.web_synced);
        return matches;
    }, [matches, webSyncFilter]);

    const table = useReactTable({
        data: filteredMatches,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: (updater) => {
            const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
            setRowSelection(newSelection);
            const selectedIds = Object.keys(newSelection).map(index => filteredMatches[parseInt(index)].id);
            onSelectionChange(selectedIds);
        },
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
        initialState: {
            pagination: {
                pageIndex: 0,
                pageSize: 10,
            },
        },
    });

    return (
        <div className="w-full">
            <div className="space-y-3 sm:space-y-4">
                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <Input
                        placeholder="Filter by player name..."
                        value={(table.getColumn("player_a")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("player_a")?.setFilterValue(event.target.value)
                        }
                        className="w-full sm:max-w-sm text-sm"
                    />
                    <Select value={webSyncFilter} onValueChange={setWebSyncFilter}>
                        <SelectTrigger className="w-full sm:w-[180px] text-sm">
                            <SelectValue placeholder="Filter by sync status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Matches</SelectItem>
                            <SelectItem value="synced">Synced to Web</SelectItem>
                            <SelectItem value="not-synced">Not Synced</SelectItem>
                        </SelectContent>
                    </Select>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto sm:ml-auto text-sm">
                                Columns <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Actions Row - Only show when matches are selected */}
                {selectedMatches.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 flex-wrap">
                        <div className="text-xs sm:text-sm text-muted-foreground mr-2 flex-1 min-w-0">
                            {selectedMatches.length} match{selectedMatches.length !== 1 ? 'es' : ''} selected:
                            {(() => {
                                const selectedMatchObjects = filteredMatches.filter(match =>
                                    selectedMatches.includes(match.id)
                                );
                                const matchesWithoutOdds = selectedMatchObjects.filter(match =>
                                    !match.odds_a || !match.odds_b
                                );

                                if (matchesWithoutOdds.length > 0) {
                                    return (
                                        <span className="text-red-600 ml-2">
                                            ({matchesWithoutOdds.length} without odds)
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={() => onCalculateOdds(selectedMatches)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                            >
                                Calculate Odds
                            </Button>
                            <Button
                                onClick={() => {
                                    if (confirm(`Are you sure you want to delete ${selectedMatches.length} match(es)? This action cannot be undone.`)) {
                                        selectedMatches.forEach(matchId => onDeleteMatch(matchId));
                                    }
                                }}
                                size="sm"
                                variant="outline"
                                className="border-red-600 text-red-600 hover:bg-red-50 text-xs sm:text-sm"
                            >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Delete Selected</span>
                                <span className="sm:hidden">Delete</span>
                            </Button>
                            <Button
                                onClick={() => {
                                    // Check if selected matches have odds calculated
                                    const selectedMatchObjects = filteredMatches.filter(match =>
                                        selectedMatches.includes(match.id)
                                    );
                                    const matchesWithoutOdds = selectedMatchObjects.filter(match =>
                                        !match.odds_a || !match.odds_b
                                    );

                                    if (matchesWithoutOdds.length > 0) {
                                        const matchNames = matchesWithoutOdds.map(match => {
                                            const playerA = getPlayerName(match.player_a);
                                            const playerB = getPlayerName(match.player_b);
                                            return `${playerA} vs ${playerB}`;
                                        }).join(', ');

                                        alert(`Cannot sync matches without calculated odds. Please calculate odds for: ${matchNames}`);
                                        return;
                                    }

                                    onSyncToWeb(selectedMatches);
                                }}
                                size="sm"
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50 text-xs sm:text-sm"
                            >
                                <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="hidden sm:inline">Sync to Web</span>
                                <span className="sm:hidden">Sync</span>
                            </Button>
                            <Button
                                onClick={() => onRemoveFromWeb(selectedMatches)}
                                size="sm"
                                variant="outline"
                                className="border-red-600 text-red-600 hover:bg-red-50 text-xs sm:text-sm"
                            >
                                <Globe2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Remove from Web</span>
                                <span className="sm:hidden">Remove</span>
                            </Button>
                            <Button
                                onClick={() => {
                                    // Update all selected matches to finished status
                                    const selectedMatchObjects = filteredMatches.filter(match =>
                                        selectedMatches.includes(match.id)
                                    );
                                    selectedMatchObjects.forEach(match => {
                                        onEditMatch({ ...match, status: MATCH_STATUSES.FINISHED });
                                    });
                                }}
                                size="sm"
                                variant="outline"
                                className="border-blue-600 text-blue-600 hover:bg-blue-50 text-xs sm:text-sm"
                            >
                                <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="hidden sm:inline">Set to Finished</span>
                                <span className="sm:hidden">Finished</span>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className={`
                                            ${row.original.web_synced ? "bg-green-50 border-l-4 border-l-green-500" : "bg-red-50 border-l-4 border-l-red-500"}
                                            ${row.original.locked ? "bg-red-100 border-l-4 border-l-red-600" : ""}
                                            ${row.original.status === 'live' ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}
                                        `}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        No matches found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
                {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => {
                        const match = row.original;
                        const isSelected = selectedMatches.includes(match.id);

                        return (
                            <div
                                key={match.id}
                                className={`border rounded-lg p-4 space-y-3 ${isSelected ? 'bg-blue-50 border-blue-200' : match.web_synced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                    } ${match.web_synced ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"
                                    } ${match.locked ? "border-l-4 border-l-red-600 bg-red-100" : ""
                                    } ${match.status === 'live' ? "border-l-4 border-l-blue-500" : ""
                                    }`}
                            >
                                {/* Header with checkbox and actions */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    onSelectionChange([...selectedMatches, match.id]);
                                                } else {
                                                    onSelectionChange(selectedMatches.filter(id => id !== match.id));
                                                }
                                            }}
                                            className="flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-gray-900 truncate">
                                                {getPlayerName(match.player_a)}
                                            </div>
                                            <div className="text-xs text-gray-500 text-center">vs</div>
                                            <div className="font-medium text-sm text-gray-900 truncate">
                                                {getPlayerName(match.player_b)}
                                            </div>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEditMatch(match)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Match
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onDeleteMatch(match.id)}
                                                className="text-red-600 focus:text-red-600"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Match
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Status and Round */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Status:</span>
                                        <Select value={match.status} onValueChange={(newStatus) => {
                                            if (newStatus === 'upcoming') {
                                                onEditMatch(match);
                                                return;
                                            }
                                            const playerAName = getPlayerName(match.player_a);
                                            const playerBName = getPlayerName(match.player_b);
                                            const matchName = `${playerAName} vs ${playerBName}`;
                                            setPendingStatusChange({
                                                matchId: match.id,
                                                newStatus: newStatus as MatchStatus,
                                                currentStatus: match.status,
                                                matchName
                                            });
                                            setShowConfirmModal(true);
                                        }}>
                                            <SelectTrigger className="w-24 h-7 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MATCH_STATUS_OPTIONS.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {match.round && (
                                        <div className="text-xs text-gray-500">
                                            Round: <span className="font-medium">{match.round}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Created Time */}
                                {match.created_at && (
                                    <div className="text-xs text-gray-500">
                                        <span className="font-medium">Created:</span> {formatTime(match.created_at)}
                                    </div>
                                )}

                                {/* Start Time */}
                                {match.start_time && (
                                    <div className="text-xs text-gray-500">
                                        <span className="font-medium">Start Time:</span> {formatTime(match.start_time)}
                                    </div>
                                )}

                                {/* Lock Status */}
                                {match.lock_time && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Lock Status:</span>
                                        {match.locked ? (
                                            <div className="flex items-center gap-1">
                                                <Lock className="h-3 w-3 text-red-500" />
                                                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                                                    Locked
                                                </Badge>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <Lock className="h-3 w-3 text-green-500" />
                                                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                                    Open
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Odds */}
                                {match.odds_a && match.odds_b ? (
                                    <div className="bg-gray-50 rounded-lg p-2">
                                        <div className="text-xs text-gray-500 mb-1">Odds</div>
                                        <div className="flex justify-between text-sm">
                                            <span>A: <span className="font-medium text-green-600">{match.odds_a.toFixed(2)}</span></span>
                                            <span>B: <span className="font-medium text-green-600">{match.odds_b.toFixed(2)}</span></span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 rounded-lg p-2">
                                        <div className="text-xs text-red-600 font-medium">Odds not calculated</div>
                                    </div>
                                )}

                                {/* Web Sync Status */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Web Status:</span>
                                    {match.web_synced ? (
                                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                            <Globe className="h-3 w-3 mr-1" />
                                            Synced
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-gray-600 text-xs">
                                            <Globe2 className="h-3 w-3 mr-1" />
                                            Not Synced
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No matches found.
                    </div>
                )}
            </div>
            {/* Pagination - Desktop */}
            <div className="hidden lg:flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 sm:gap-0 py-3 sm:py-4">
                <div className="flex-1 text-xs sm:text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="text-xs sm:text-sm"
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="text-xs sm:text-sm"
                    >
                        Next
                    </Button>
                </div>
            </div>

            {/* Pagination - Mobile */}
            <div className="lg:hidden flex flex-col items-center justify-center gap-3 py-4">
                <div className="text-xs text-muted-foreground text-center">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="text-xs"
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="text-xs"
                    >
                        Next
                    </Button>
                </div>
            </div>

            {/* Status Change Confirmation Modal */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Status Change</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to change the status of this match?
                        </DialogDescription>
                    </DialogHeader>
                    {pendingStatusChange && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-3 rounded-md border">
                                <p className="font-medium text-sm text-blue-900">
                                    {pendingStatusChange.matchName}
                                </p>
                                <p className="text-xs text-blue-700 mt-1">
                                    Status change: <span className="capitalize font-medium">{pendingStatusChange.currentStatus}</span> → <span className="capitalize font-medium">{pendingStatusChange.newStatus}</span>
                                </p>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                                <p className="text-sm text-amber-800">
                                    <strong>Warning:</strong> {getStatusWarning(pendingStatusChange.currentStatus, pendingStatusChange.newStatus)}
                                </p>
                                <p className="text-xs text-amber-700 mt-2">
                                    This action will affect match visibility in the web app and may trigger automated processes.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="sm:justify-start">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelStatusChange}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmStatusChange}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Confirm Change
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 