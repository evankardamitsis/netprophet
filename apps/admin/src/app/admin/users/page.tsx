import { Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';

export default function UsersPage() {
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
                    <p className="text-gray-600">
                        This page will contain user management functionality including:
                    </p>
                    <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
                        <li>User list with search and filtering</li>
                        <li>User details and profile management</li>
                        <li>Role and permission management</li>
                        <li>Account status (active/suspended)</li>
                        <li>User activity logs</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
} 