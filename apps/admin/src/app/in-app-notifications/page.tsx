'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Bell,
    CheckCircle2,
    AlertCircle,
    Info,
    XCircle,
    CheckCheck,
    Trash2,
    RefreshCw,
    Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@netprophet/lib';

interface AdminNotification {
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    metadata: Record<string, any>;
    is_read: boolean;
    read_at: string | null;
    read_by: string | null;
    created_at: string;
    updated_at: string;
}

const severityConfig = {
    info: { color: 'bg-blue-100 text-blue-800', icon: Info },
    warning: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    error: { color: 'bg-red-100 text-red-800', icon: XCircle },
    success: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
};

const typeLabels: Record<string, string> = {
    user_registration: 'User Registration',
    profile_creation_request: 'Profile Creation Request',
    profile_activated: 'Profile Activated',
    large_bet: 'Large Bet',
    system_error: 'System Error',
    tournament_created: 'Tournament Created',
    tournament_updated: 'Tournament Updated',
    match_result_entered: 'Match Result Entered',
    payment_received: 'Payment Received',
    user_deleted: 'User Deleted',
    player_created: 'Player Created',
    player_updated: 'Player Updated',
    suspicious_activity: 'Suspicious Activity',
    wallet_issue: 'Wallet Issue',
    other: 'Other',
};

export default function InAppNotificationsPage() {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filterType, setFilterType] = useState<string>('all');
    const [filterSeverity, setFilterSeverity] = useState<string>('all');
    const [filterRead, setFilterRead] = useState<string>('unread');

    useEffect(() => {
        fetchNotifications();

        // Set up real-time subscription for new notifications
        const channel = supabase
            .channel('admin_notifications_channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'admin_in_app_notifications',
                },
                (payload: any) => {
                    // New notification inserted, refresh the list
                    fetchNotifications();
                    // Show toast for new notifications
                    if (payload.new) {
                        toast.info(payload.new.title, {
                            description: payload.new.message,
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'admin_in_app_notifications',
                },
                (payload: any) => {
                    // Notification updated (e.g., marked as read), refresh the list
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [filterType, filterSeverity, filterRead]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('No authentication token available');
            }

            const params = new URLSearchParams();
            if (filterType !== 'all') params.append('type', filterType);
            if (filterSeverity !== 'all') params.append('severity', filterSeverity);
            if (filterRead !== 'all') params.append('is_read', filterRead === 'read' ? 'true' : 'false');

            const response = await fetch(`/api/admin/in-app-notifications?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const data = await response.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch(`/api/admin/in-app-notifications/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to mark as read');
            }

            setNotifications(prev =>
                prev.map(n =>
                    n.id === id
                        ? { ...n, is_read: true, read_at: new Date().toISOString() }
                        : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            toast.success('Notification marked as read');
        } catch (error) {
            console.error('Error marking as read:', error);
            toast.error('Failed to mark as read');
        }
    };

    const markAllAsRead = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch('/api/admin/in-app-notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to mark all as read');
            }

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Error marking all as read:', error);
            toast.error('Failed to mark all as read');
        }
    };

    const deleteNotification = async (id: string) => {
        if (!confirm('Are you sure you want to delete this notification?')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/in-app-notifications/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete notification');
            }

            setNotifications(prev => prev.filter(n => n.id !== id));
            toast.success('Notification deleted');
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error('Failed to delete notification');
        }
    };

    const filteredNotifications = notifications;

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Bell className="h-8 w-8" />
                        In-App Notifications
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Track important system activities and events
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="text-lg px-3 py-1">
                            {unreadCount} unread
                        </Badge>
                    )}
                    <Button onClick={fetchNotifications} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    {unreadCount > 0 && (
                        <Button onClick={markAllAsRead} variant="outline" size="sm">
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Mark All Read
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Type</label>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {Object.entries(typeLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Severity</label>
                            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Severities</SelectItem>
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="error">Error</SelectItem>
                                    <SelectItem value="success">Success</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Status</label>
                            <Select value={filterRead} onValueChange={setFilterRead}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="unread">Unread</SelectItem>
                                    <SelectItem value="read">Read</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No notifications found</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredNotifications.map((notification) => {
                        const severityInfo = severityConfig[notification.severity];
                        const SeverityIcon = severityInfo.icon;

                        return (
                            <Card
                                key={notification.id}
                                className={`transition-all ${!notification.is_read
                                    ? 'border-l-4 border-l-blue-500 bg-blue-50/50'
                                    : ''
                                    }`}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <SeverityIcon
                                                    className={`h-5 w-5 ${severityInfo.color.replace('bg-', 'text-').replace('-100', '-600')}`}
                                                />
                                                <Badge className={severityInfo.color}>
                                                    {notification.severity}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {typeLabels[notification.type] || notification.type}
                                                </Badge>
                                                {!notification.is_read && (
                                                    <Badge variant="default" className="bg-blue-500">
                                                        New
                                                    </Badge>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-semibold mb-1">
                                                {notification.title}
                                            </h3>
                                            <p className="text-gray-600 mb-3">{notification.message}</p>
                                            {Object.keys(notification.metadata).length > 0 && (
                                                <div className="bg-gray-50 p-3 rounded-md text-sm mb-3">
                                                    <pre className="text-xs overflow-x-auto">
                                                        {JSON.stringify(notification.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span>
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </span>
                                                {notification.is_read && notification.read_at && (
                                                    <span>
                                                        Read: {new Date(notification.read_at).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            {!notification.is_read && (
                                                <Button
                                                    onClick={() => markAsRead(notification.id)}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Mark Read
                                                </Button>
                                            )}
                                            <Button
                                                onClick={() => deleteNotification(notification.id)}
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
