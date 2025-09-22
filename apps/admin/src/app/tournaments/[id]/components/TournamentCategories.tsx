'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
} from '@tanstack/react-table';
import { Plus, Edit, Trash2, Tag, MoreHorizontal, Search, ChevronDown } from 'lucide-react';
import { Category } from '@/types';

interface TournamentCategoriesProps {
    categories: Category[];
    onAddCategory: () => void;
    onEditCategory: (category: Category) => void;
    onDeleteCategory: (id: string) => void;
    getGenderColor: (gender: string | null) => string;
}

export function TournamentCategories({
    categories,
    onAddCategory,
    onEditCategory,
    onDeleteCategory,
    getGenderColor
}: TournamentCategoriesProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        entry_fee: false,
        prize_pool: false,
    });

    const columns = useMemo<ColumnDef<Category, any>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Category Name',
                cell: ({ row }) => (
                    <div className="font-medium">{row.getValue('name')}</div>
                ),
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'gender',
                header: 'Gender',
                cell: ({ row }) => {
                    const gender = row.getValue('gender') as string;
                    return (
                        <Badge className={`${getGenderColor(gender)} text-xs font-medium px-2 py-1`}>
                            {gender || 'Mixed'}
                        </Badge>
                    );
                },
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'skill_level_min',
                header: 'Skill Level',
                cell: ({ row }) => {
                    const min = row.original.skill_level_min;
                    const max = row.original.skill_level_max;
                    return (
                        <Badge variant="outline" className="text-xs font-medium px-2 py-1">
                            {min || 'N/A'} - {max || 'N/A'}
                        </Badge>
                    );
                },
                enableSorting: true,
            },
            {
                accessorKey: 'age_min',
                header: 'Age Range',
                cell: ({ row }) => {
                    const min = row.original.age_min;
                    const max = row.original.age_max;
                    return (
                        <span className="text-sm text-gray-700">
                            {min || 'N/A'} - {max || 'N/A'}
                        </span>
                    );
                },
                enableSorting: true,
            },
            {
                accessorKey: 'entry_fee',
                header: 'Entry Fee',
                cell: ({ row }) => {
                    const fee = row.getValue('entry_fee') as number;
                    return (
                        <span className="text-sm font-medium text-green-600">
                            ${fee}
                        </span>
                    );
                },
                enableSorting: true,
                enableHiding: true,
            },
            {
                accessorKey: 'prize_pool',
                header: 'Prize Pool',
                cell: ({ row }) => {
                    const prize = row.getValue('prize_pool') as number;
                    return (
                        <span className="text-sm font-medium text-blue-600">
                            ${prize || 'N/A'}
                        </span>
                    );
                },
                enableSorting: true,
                enableHiding: true,
            },
            {
                accessorKey: 'current_participants',
                header: 'Participants',
                cell: ({ row }) => {
                    const current = row.original.current_participants;
                    const max = row.original.max_participants;
                    return (
                        <span className="text-sm text-gray-700">
                            {current} / {max || '∞'}
                        </span>
                    );
                },
                enableSorting: true,
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const category = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEditCategory(category)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Category
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => onDeleteCategory(category.id)}
                                    className="text-red-600 focus:text-red-600"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Category
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
                enableSorting: false,
                enableColumnFilter: false,
            },
        ],
        [getGenderColor, onEditCategory, onDeleteCategory]
    );

    const table = useReactTable({
        data: categories,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            globalFilter,
            columnVisibility,
        },
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Tournament Categories</h2>
                <p className="text-gray-600 text-sm sm:text-base">Manage categories for this tournament</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-start sm:items-center">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Search categories..."
                            value={globalFilter ?? ''}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="pl-10 text-sm"
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto text-sm">
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
                                            onCheckedChange={(value: boolean) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id === 'entry_fee' ? 'Entry Fee' :
                                                column.id === 'prize_pool' ? 'Prize Pool' :
                                                    column.id}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <Button
                    onClick={onAddCategory}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm"
                >
                    <Plus className="h-4 w-4" />
                    Add Category
                </Button>
            </div>

            {categories.length > 0 ? (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block">
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            {table.getHeaderGroups().map((headerGroup) => (
                                                <TableRow key={headerGroup.id}>
                                                    {headerGroup.headers.map((header) => (
                                                        <TableHead key={header.id} className="whitespace-nowrap">
                                                            {header.isPlaceholder
                                                                ? null
                                                                : flexRender(
                                                                    header.column.columnDef.header,
                                                                    header.getContext()
                                                                )}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableHeader>
                                        <TableBody>
                                            {table.getRowModel().rows?.length ? (
                                                table.getRowModel().rows.map((row) => (
                                                    <TableRow
                                                        key={row.id}
                                                        data-state={row.getIsSelected() && "selected"}
                                                        className="hover:bg-gray-50"
                                                    >
                                                        {row.getVisibleCells().map((cell) => (
                                                            <TableCell key={cell.id} className="whitespace-nowrap">
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
                                                        No categories found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination */}
                                <div className="flex items-center justify-between px-4 py-3 border-t">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span>
                                            Page {table.getState().pagination.pageIndex + 1} of{' '}
                                            {table.getPageCount()}
                                        </span>
                                        <span>•</span>
                                        <span>
                                            {table.getFilteredRowModel().rows.length} categories
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
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
                            </CardContent>
                        </Card>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-3">
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => {
                                const category = row.original;
                                return (
                                    <Card key={category.id} className="p-4">
                                        <div className="space-y-3">
                                            {/* Header */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-gray-900 truncate">{category.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge className={`${getGenderColor(category.gender)} text-xs font-medium px-2 py-1`}>
                                                            {category.gender || 'Mixed'}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs font-medium px-2 py-1">
                                                            {category.skill_level_min || 'N/A'} - {category.skill_level_max || 'N/A'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => onEditCategory(category)}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit Category
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => onDeleteCategory(category.id)}
                                                            className="text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete Category
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* Details */}
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Age Range:</span>
                                                    <div className="font-medium">
                                                        {category.age_min || 'N/A'} - {category.age_max || 'N/A'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Participants:</span>
                                                    <div className="font-medium">
                                                        {category.current_participants} / {category.max_participants || '∞'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Entry Fee:</span>
                                                    <div className="font-medium text-green-600">
                                                        ${category.entry_fee}
                                                    </div>
                                                </div>
                                                {category.prize_pool && (
                                                    <div>
                                                        <span className="text-gray-500">Prize Pool:</span>
                                                        <div className="font-medium text-blue-600">
                                                            ${category.prize_pool}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })
                        ) : (
                            <Card className="p-8 text-center">
                                <div className="text-gray-500">No categories found.</div>
                            </Card>
                        )}

                        {/* Mobile Pagination */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} • {table.getFilteredRowModel().rows.length} categories
                            </div>
                            <div className="flex items-center gap-2">
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
                    </div>
                </>
            ) : (
                <Card className="border-0 shadow-lg">
                    <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
                        <Tag className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4 sm:mb-6" />
                        <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2 sm:mb-3">No categories found</h3>
                        <p className="text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">
                            Add categories to this tournament to get started. Categories help organize matches by skill level and gender.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 