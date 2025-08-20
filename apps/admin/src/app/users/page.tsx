'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@netprophet/lib';
import { toast } from 'sonner';
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
import { Profile } from '@/types';

export default function UsersPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editUser, setEditUser] = useState<Profile | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editSuccess, setEditSuccess] = useState(false);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.from('profiles').select('*');
                if (error) {
                    setError(error.message);
                } else {
                    setUsers(data || []);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const columns = useMemo<ColumnDef<Profile, any>[]>(
        () => [
            {
                accessorKey: 'email',
                header: 'Email',
                cell: info => info.getValue(),
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'username',
                header: 'Username',
                cell: info => info.getValue() || '-',
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'is_admin',
                header: 'Admin',
                cell: info => info.getValue() ? '✅' : '',
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'suspended',
                header: 'Suspended',
                cell: info => info.getValue() ? '🚫' : '',
                enableSorting: true,
                enableColumnFilter: true,
            },
            {
                accessorKey: 'created_at',
                header: 'Created At',
                cell: info => new Date(info.getValue()).toLocaleString(),
                enableSorting: true,
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <Button size="sm" variant="outline" onClick={() => handleEditClick(row.original)}>
                        Edit
                    </Button>
                ),
                enableSorting: false,
                enableColumnFilter: false,
            },
        ],
        []
    );

    const table = useReactTable({
        data: users,
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
            // Filter by email or username
            const value = row.getValue<string>('email') + ' ' + (row.getValue<string>('username') || '');
            return value.toLowerCase().includes(filterValue.toLowerCase());
        },
    });

    const handleEditClick = (user: Profile) => {
        setEditUser(user);
        setEditError(null);
        setEditSuccess(false);
    };

    const handleEditChange = (field: keyof Profile, value: any) => {
        if (!editUser) return;
        setEditUser({ ...editUser, [field]: value });
    };

    const handleEditSave = async () => {
        if (!editUser) return;
        setEditLoading(true);
        setEditError(null);
        setEditSuccess(false);
        const { id, username, is_admin, suspended } = editUser;
        const { error } = await supabase
            .from('profiles')
            .update({ username: username ?? '', is_admin, suspended })
            .eq('id', id);
        if (error) {
            setEditError(error.message);
            toast.error('Failed to update user: ' + error.message);
        } else {
            setEditSuccess(true);
            setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, username, is_admin, suspended } : u)));
            toast.success('User updated!');
            setTimeout(() => setEditUser(null), 1000);
        }
        setEditLoading(false);
    };

    const handleDelete = async () => {
        if (!editUser) return;
        setEditLoading(true);
        setEditError(null);
        const { id } = editUser;
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) {
            setEditError(error.message);
            toast.error('Failed to delete user: ' + error.message);
        } else {
            setUsers((prev) => prev.filter((u) => u.id !== id));
            setEditUser(null);
            toast.success('User deleted!');
        }
        setEditLoading(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Users</h1>
                <p className="text-gray-600 mt-2">
                    Manage user accounts and permissions
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Users Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex items-center gap-4">
                        <Input
                            placeholder="Search by email or username..."
                            value={globalFilter}
                            onChange={e => setGlobalFilter(e.target.value)}
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
                                                    (header.column.columnDef.header === 'Admin' || header.column.columnDef.header === 'Suspended' || header.column.columnDef.header === 'Actions'
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
                                    <tr key={row.id} className="border-b hover:bg-gray-50 align-middle">
                                        {row.getVisibleCells().map(cell => (
                                            <td
                                                key={cell.id}
                                                className={
                                                    'px-4 py-2 align-middle ' +
                                                    (cell.column.columnDef.header === 'Admin' || cell.column.columnDef.header === 'Suspended' || cell.column.columnDef.header === 'Actions'
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

            {/* Edit User Modal */}
            {editUser && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg w-full max-w-md relative">
                        <button
                            className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-gray-700"
                            onClick={() => setEditUser(null)}
                            aria-label="Close"
                        >
                            &times;
                        </button>
                        <h2 className="text-xl font-bold mb-4">Edit User</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">Email</label>
                                <Input value={editUser.email} disabled className="w-full" />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">Username</label>
                                <Input
                                    value={editUser.username || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEditChange('username', e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="block text-gray-700 font-medium">Admin</label>
                                <Switch
                                    checked={editUser.is_admin || false}
                                    onCheckedChange={(checked: boolean) => handleEditChange('is_admin', checked)}
                                />
                                <span>{(editUser.is_admin || false) ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="block text-gray-700 font-medium">Suspended</label>
                                <Switch
                                    checked={!!editUser.suspended}
                                    onCheckedChange={(checked: boolean) => handleEditChange('suspended', checked)}
                                />
                                <span>{editUser.suspended ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                        {editError && <div className="text-red-600 mt-2 font-semibold">{editError}</div>}
                        {editSuccess && <div className="text-green-600 mt-2 font-semibold">Saved!</div>}
                        <div className="mt-6 flex justify-between gap-2">
                            <Button variant="destructive" onClick={handleDelete} disabled={editLoading}>
                                Delete
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setEditUser(null)} disabled={editLoading}>
                                    Cancel
                                </Button>
                                <Button onClick={handleEditSave} disabled={editLoading}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 