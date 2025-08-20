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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Edit, Trash2, Globe, Globe2 } from "lucide-react";
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
import { Match } from "@/types";

interface TournamentMatchesTableProps {
    matches: Match[];
    onEditMatch: (match: Match) => void;
    onDeleteMatch: (id: string) => void;
    onCalculateOdds: (matchIds: string[]) => void;
    onSyncToWeb: (matchIds: string[]) => void;
    onRemoveFromWeb: (matchIds: string[]) => void;
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
    getStatusColor,
    formatTime,
    selectedMatches,
    onSelectionChange
}: TournamentMatchesTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [webSyncFilter, setWebSyncFilter] = React.useState<string>("all");
    const [editingStatus, setEditingStatus] = React.useState<string | null>(null);
    const [editValue, setEditValue] = React.useState<string>("");

    const getPlayerName = (player: any) => {
        if (player?.first_name && player?.last_name) {
            const ntrp = player?.ntrp_rating ? ` (${player.ntrp_rating})` : '';
            return `${player.first_name} ${player.last_name}${ntrp}`;
        }
        return 'TBD';
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
                        <span className="text-xs text-gray-500 font-normal">(Click to edit)</span>
                    </div>
                );
            },
            cell: ({ row }) => {
                const match = row.original;
                const status = row.getValue("status") as string;
                const isEditing = editingStatus === match.id;

                const statusOptions = MATCH_STATUS_OPTIONS;

                const handleStatusChange = async (newStatus: MatchStatus) => {
                    setEditValue(newStatus);
                    setEditingStatus(null);
                    // Update the match status immediately
                    onEditMatch({ ...match, status: newStatus });
                };

                const handleStartEditing = () => {
                    setEditingStatus(match.id);
                    setEditValue(status);
                };

                if (isEditing) {
                    return (
                        <Select value={editValue} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-28 h-7">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <span className="capitalize">{option.label}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    );
                }

                return (
                    <Badge
                        className={`${getStatusColor(status)} text-xs font-medium px-2 py-1 cursor-pointer hover:opacity-80`}
                        onClick={handleStartEditing}
                        title="Click to edit status"
                    >
                        {status}
                    </Badge>
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
            accessorKey: "odds",
            header: "Odds",
            cell: ({ row }) => {
                const match = row.original;
                if (!match.odds_a || !match.odds_b) {
                    return <div className="text-gray-400 text-sm">Not calculated</div>;
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
    });

    return (
        <div className="w-full">
            <div className="space-y-4">
                {/* Filters Row */}
                <div className="flex items-center gap-4">
                    <Input
                        placeholder="Filter by player name..."
                        value={(table.getColumn("player_a")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("player_a")?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm"
                    />
                    <Select value={webSyncFilter} onValueChange={setWebSyncFilter}>
                        <SelectTrigger className="w-[180px]">
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
                            <Button variant="outline" className="ml-auto">
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
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm text-muted-foreground mr-2">
                            {selectedMatches.length} match{selectedMatches.length !== 1 ? 'es' : ''} selected:
                        </div>
                        <Button
                            onClick={() => onCalculateOdds(selectedMatches)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Calculate Odds
                        </Button>
                        <Button
                            onClick={() => onSyncToWeb(selectedMatches)}
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Sync to Web
                        </Button>
                        <Button
                            onClick={() => onRemoveFromWeb(selectedMatches)}
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-600 hover:bg-red-50"
                        >
                            <Globe2 className="h-4 w-4 mr-2" />
                            Remove from Web
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
                            className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Set to Finished
                        </Button>
                    </div>
                )}
            </div>
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
                                    className={row.original.web_synced ? "bg-green-50 border-l-4 border-l-green-500" : ""}
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
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
} 