'use client';

import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@netprophet/lib';
import { Profile } from '@/types';
import { toast } from 'sonner';
import { normalizeText } from '@/lib/utils';

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
                accessorKey: 'balance',
                header: 'Balance',
                cell: info => {
                    const balance = info.getValue();
                    return balance !== null && balance !== undefined ? `${balance} 🌕` : '0 🌕';
                },
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
            // Filter by email, username, or balance
            const email = row.getValue<string>('email') || '';
            const username = row.getValue<string>('username') || '';
            const balance = row.getValue<number>('balance') || 0;
            const value = `${email} ${username} ${balance}`;
            const normalizedValue = normalizeText(value);
            const normalizedFilter = normalizeText(filterValue);
            return normalizedValue.includes(normalizedFilter);
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

    const handleResetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://netprophetapp.com'}/el/auth/reset-password`,
            });

            if (error) {
                toast.error(`Failed to send reset email: ${error.message}`);
            } else {
                toast.success(`Password reset email sent to ${email}`);
            }
        } catch (error) {
            console.error('Error sending password reset:', error);
            toast.error('Failed to send password reset email');
        }
    };

    const handleEditSave = async () => {
        if (!editUser) return;
        setEditLoading(true);
        setEditError(null);
        setEditSuccess(false);
        const { id, username, is_admin, balance } = editUser;

        try {
            // Get the current session token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch('/api/admin/update-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ id, username, is_admin, balance }),
            });

            const result = await response.json();

            if (!result.success) {
                console.error('Update error:', result.error);
                setEditError(result.error);
                toast.error('Failed to update user: ' + result.error);
            } else {
                setEditSuccess(true);
                setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, username, is_admin, balance } : u)));
                toast.success('User updated!');
                setTimeout(() => setEditUser(null), 1000);
            }
        } catch (error) {
            console.error('API call error:', error);
            setEditError('Failed to connect to server');
            toast.error('Failed to update user: Network error');
        }

        setEditLoading(false);
    };

    const handleDelete = async () => {
        if (!editUser) return;

        // Show confirmation dialog
        const confirmed = window.confirm(
            `Are you sure you want to delete user "${editUser.email}"?\n\nThis action will:\n• Delete the user from the database\n• Delete the user from authentication system\n• Remove all user data permanently\n\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        setEditLoading(true);
        setEditError(null);

        try {
            // Get the current session token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ id: editUser.id }),
            });

            const result = await response.json();

            if (!result.success) {
                setEditError(result.error);
                toast.error('Failed to delete user: ' + result.error);
            } else {
                setUsers((prev) => prev.filter((u) => u.id !== editUser.id));
                setEditUser(null);

                if (result.warning) {
                    toast.warning(result.warning);
                    toast.success(result.message);
                } else {
                    toast.success(result.message || 'User deleted successfully!');
                }
            }
        } catch (error) {
            console.error('Delete API call error:', error);
            setEditError('Failed to connect to server');
            toast.error('Failed to delete user: Network error');
        }

        setEditLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Users ({users.length})</h1>
                    <p className="text-gray-600 mt-2">
                        Manage user accounts and permissions
                    </p>
                </div>

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

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-3">
                        {table.getRowModel().rows.map(row => {
                            const user = row.original;

                            return (
                                <div
                                    key={row.id}
                                    className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
                                >
                                    {/* User Info */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-lg text-gray-900 truncate">
                                                {user.email}
                                            </h3>
                                            {user.username && (
                                                <div className="text-sm text-gray-600 truncate">
                                                    @{user.username}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2 ml-2">
                                            {user.is_admin && (
                                                <Badge variant="destructive" className="text-xs">
                                                    Admin
                                                </Badge>
                                            )}

                                        </div>
                                    </div>

                                    {/* User Stats */}
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Balance:</span>
                                            <span className="font-medium">{user.balance || 0} 🌕</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Created:</span>
                                            <span className="font-medium">
                                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex space-x-2 pt-2 border-t border-gray-100">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditUser(user)}
                                            className="flex-1 text-xs"
                                        >
                                            ✏️ Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setEditUser(user);
                                                handleDelete();
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

                    {/* Pagination Controls */}
                    <div className="mt-6 flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-600">
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                        </div>
                        <div className="flex gap-2">
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

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">Balance (🌕)</label>
                                <Input
                                    type="number"
                                    value={editUser.balance || 0}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEditChange('balance', parseInt(e.target.value) || 0)}
                                    className="w-full"
                                    min="0"
                                />
                            </div>
                            <div className="pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => handleResetPassword(editUser.email)}
                                    className="w-full text-blue-600 hover:text-blue-700"
                                >
                                    Send Password Reset Email
                                </Button>
                            </div>
                        </div>
                        {editError && <div className="text-red-600 mt-2 font-semibold">{editError}</div>}
                        {editSuccess && <div className="text-green-600 mt-2 font-semibold">Saved!</div>}
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-yellow-800 text-sm">
                                <strong>⚠️ Warning:</strong> Deleting a user will permanently remove them from both the database and authentication system. This action cannot be undone.
                            </p>
                        </div>
                        <div className="mt-6 flex justify-between gap-2">
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={editLoading}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {editLoading ? 'Deleting...' : 'Delete User'}
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setEditUser(null)} disabled={editLoading}>
                                    Cancel
                                </Button>
                                <Button onClick={handleEditSave} disabled={editLoading}>
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 