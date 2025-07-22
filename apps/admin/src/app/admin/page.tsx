import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users,
    UserCheck,
    Trophy,
    Gamepad2,
    TrendingUp,
    Activity
} from 'lucide-react';

export default function AdminDashboardPage() {
    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-2">
                    Welcome to the NetProphet Admin Panel
                </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,234</div>
                        <p className="text-xs text-muted-foreground">
                            +12% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Players</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">567</div>
                        <p className="text-xs text-muted-foreground">
                            +8% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tournaments</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">23</div>
                        <p className="text-xs text-muted-foreground">
                            5 active tournaments
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Live Matches</CardTitle>
                        <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-muted-foreground">
                            3 matches starting soon
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€45,231</div>
                        <p className="text-xs text-muted-foreground">
                            +20.1% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">89</div>
                        <p className="text-xs text-muted-foreground">
                            +5% from last hour
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">New user registered</p>
                                <p className="text-xs text-muted-foreground">2 minutes ago</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">Tournament created</p>
                                <p className="text-xs text-muted-foreground">15 minutes ago</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">Match result updated</p>
                                <p className="text-xs text-muted-foreground">1 hour ago</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 