'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@netprophet/ui';
import { Input } from '@/components/ui/input';
import { supabase } from '@netprophet/lib';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';

interface Profile {
    id: string;
    email: string;
    username?: string | null;
    avatar_url?: string | null;
    is_admin: boolean;
    suspended?: boolean;
    created_at: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editUser, setEditUser] = useState<Profile | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editSuccess, setEditSuccess] = useState(false);

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
                    {loading ? (
                        <div className="text-gray-500">Loading users...</div>
                    ) : error ? (
                        <div className="text-red-600 font-semibold">{error}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-2 border-b text-left">Email</th>
                                        <th className="px-4 py-2 border-b text-left">Username</th>
                                        <th className="px-4 py-2 border-b text-center">Admin</th>
                                        <th className="px-4 py-2 border-b text-left">Created At</th>
                                        <th className="px-4 py-2 border-b text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b hover:bg-gray-50 align-middle">
                                            <td className="px-4 py-2 align-middle text-left">{user.email}</td>
                                            <td className="px-4 py-2 align-middle text-left">{user.username || '-'}</td>
                                            <td className="px-4 py-2 align-middle text-center">{user.is_admin ? '✅' : ''}</td>
                                            <td className="px-4 py-2 align-middle text-left">{new Date(user.created_at).toLocaleString()}</td>
                                            <td className="px-4 py-2 align-middle text-center">
                                                <Button size="sm" variant="outline" onClick={() => handleEditClick(user)}>
                                                    Edit
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
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
                                    checked={editUser.is_admin}
                                    onCheckedChange={(checked: boolean) => handleEditChange('is_admin', checked)}
                                />
                                <span>{editUser.is_admin ? 'Yes' : 'No'}</span>
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