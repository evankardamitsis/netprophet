'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { NotificationsService } from '@netprophet/lib';
import { useDictionary } from '@/context/DictionaryContext';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: {
        bet_id?: string;
        match_id?: string;
        winnings?: number;
        type?: string;
        match_details?: {
            player_a?: string;
            player_b?: string;
        };
    };
    read_at: string | null;
    created_at: string;
}

export function Notifications() {
    const { dict } = useDictionary();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) return; // Don't load notifications if user is not authenticated

        loadNotifications();
        loadUnreadCount();

        // Subscribe to real-time notifications
        const subscription = NotificationsService.subscribeToNotifications((payload) => {
            if (payload.eventType === 'INSERT') {
                // Reload notifications when a new one is created
                loadNotifications();
                loadUnreadCount();
            }
        });

        // Also refresh every 30 seconds to catch any missed notifications
        const interval = setInterval(() => {
            loadNotifications();
            loadUnreadCount();
        }, 30000);

        return () => {
            if (subscription) {
                subscription.then(sub => sub?.unsubscribe());
            }
            clearInterval(interval);
        };
    }, [user]);

    useEffect(() => {
        if (!isOpen) return;
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await NotificationsService.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUnreadCount = async () => {
        try {
            const count = await NotificationsService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            await NotificationsService.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            toast.success(dict?.notifications?.markedAsRead || 'Notification marked as read');
        } catch (error) {
            console.error('Error marking notification as read:', error);
            toast.error(dict?.notifications?.failedToMarkAsRead || 'Failed to mark notification as read');
        }
    };

    const markAllAsRead = async () => {
        try {
            await NotificationsService.markAllAsRead();
            setNotifications(prev =>
                prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
            setUnreadCount(0);
            toast.success(dict?.notifications?.allMarkedAsRead || 'All notifications marked as read');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            toast.error(dict?.notifications?.failedToMarkAllAsRead || 'Failed to mark all notifications as read');
        }
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            await NotificationsService.deleteNotification(notificationId);

            // Check if the deleted notification was unread before removing it from state
            const deletedNotification = notifications.find(n => n.id === notificationId);
            const wasUnread = deletedNotification && !deletedNotification.read_at;

            setNotifications(prev => prev.filter(n => n.id !== notificationId));

            // Update unread count if the deleted notification was unread
            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }

            toast.success(dict?.notifications?.notificationDeleted || 'Notification deleted');
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error(dict?.notifications?.failedToDelete || 'Failed to delete notification');
        }
    };

    const clearAllNotifications = async () => {
        try {
            await NotificationsService.deleteAllNotifications();
            setNotifications([]);
            setUnreadCount(0);
            toast.success(dict?.notifications?.allNotificationsDeleted || 'All notifications deleted');
        } catch (error) {
            console.error('Error clearing all notifications:', error);
            toast.error(dict?.notifications?.failedToDeleteAll || 'Failed to delete all notifications');
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'bet_won':
                return '🎉';
            case 'bet_lost':
                return '❌';
            case 'bet_resolved':
                return '📊';
            case 'match_result':
                return '🎾';
            default:
                return '📢';
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return dict?.notifications?.justNow || 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}${dict?.notifications?.minutesAgo || 'm ago'}`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}${dict?.notifications?.hoursAgo || 'h ago'}`;
        return `${Math.floor(diffInMinutes / 1440)}${dict?.notifications?.daysAgo || 'd ago'}`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notification Bell */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-white hover:text-accent transition-colors focus:outline-none"
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notifications Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden rounded-lg shadow-lg z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50">
                    <div className="p-4 border-b border-slate-700/50">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{dict?.notifications?.title || 'Notifications'}</h3>
                            <div className="flex gap-2">
                                {notifications.length > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={clearAllNotifications}
                                        className="text-xs px-3 py-2"
                                    >
                                        {dict?.notifications?.clearAll || 'Clear all'}
                                    </Button>
                                )}
                                {unreadCount > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={markAllAsRead}
                                        className="text-xs px-3 py-2"
                                    >
                                        {dict?.notifications?.markAllRead || 'Mark all read'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="text-center py-4 text-gray-400">{dict?.notifications?.loading || 'Loading notifications...'}</div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>{dict?.notifications?.noNotifications || 'No notifications yet'}</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`transition-colors p-3 border-b border-slate-700/50 last:border-b-0 ${!notification.read_at ? 'bg-slate-800/50' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-2 flex-1">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm text-white">
                                                    {notification.title}
                                                </h4>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {notification.message}
                                                </p>
                                                {notification.data?.winnings && (
                                                    <p className="text-xs text-green-400 font-medium mt-1">
                                                        {dict?.notifications?.winnings || 'Winnings'}: {notification.data.winnings} 🌕
                                                    </p>
                                                )}
                                                {notification.data?.match_details && (
                                                    <p className="text-xs text-blue-400 font-medium mt-1">
                                                        {notification.data.match_details.player_a} vs {notification.data.match_details.player_b}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {formatTime(notification.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                            {!notification.read_at && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="h-6 w-6 p-0"
                                                >
                                                    <Check className="h-3 w-3" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                onClick={() => deleteNotification(notification.id)}
                                                className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
