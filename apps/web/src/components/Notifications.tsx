'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, Trash2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { NotificationsService, WelcomeBonusNotificationService } from '@netprophet/lib';
import { useDictionary } from '@/context/DictionaryContext';
import { useWallet } from '@/context/WalletContext';
import CoinIcon from '@/components/CoinIcon';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    data?: {
        bet_id?: string;
        match_id?: string;
        winnings?: number;
        type?: string;
    };
    read_at: string | null;
    created_at: string;
}

export function Notifications() {
    const { user } = useAuth();
    const { dict } = useDictionary();
    const { claimWelcomeBonus, syncWalletWithDatabase } = useWallet();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [claimingWelcomeBonus, setClaimingWelcomeBonus] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const data = await NotificationsService.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadUnreadCount = useCallback(async () => {
        try {
            const count = await NotificationsService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    }, []);

    useEffect(() => {
        if (!user) return; // Don't load notifications if user is not authenticated

        loadNotifications();
        loadUnreadCount();

        // Subscribe to real-time notifications with better error handling
        const subscription = NotificationsService.subscribeToNotifications((payload) => {
            console.log('Real-time notification received:', payload);
            if (payload.eventType === 'INSERT') {
                // Reload notifications when a new one is created
                loadNotifications();
                loadUnreadCount();
            }
        }).catch((error) => {
            console.error('Failed to subscribe to real-time notifications:', error);
            // Fallback to polling if real-time subscription fails
        });

        // Also refresh every 5 minutes to catch any missed notifications (minimal frequency)
        const interval = setInterval(() => {
            loadNotifications();
            loadUnreadCount();
        }, 300000); // 5 minutes - minimal polling

        return () => {
            if (subscription) {
                subscription.then(sub => sub?.unsubscribe());
            }
            clearInterval(interval);
        };
    }, [user, loadNotifications, loadUnreadCount]);

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

    // Refresh notifications function that can be called externally
    const refreshNotifications = useCallback(() => {
        if (user) {
            loadNotifications();
            loadUnreadCount();
        }
    }, [user, loadNotifications, loadUnreadCount]);

    // Expose refresh function globally so WelcomeBonus can call it
    useEffect(() => {
        (window as any).refreshNotifications = refreshNotifications;
        return () => {
            delete (window as any).refreshNotifications;
        };
    }, [refreshNotifications]);

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
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            setUnreadCount(prev => Math.max(0, prev - 1));
            toast.success(dict?.notifications?.notificationDeleted || 'Notification deleted');
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error(dict?.notifications?.failedToDelete || 'Failed to delete notification');
        }
    };

    const handleWelcomeBonusClaim = async (notificationId: string) => {
        try {
            setClaimingWelcomeBonus(true);
            const bonusAmount = await claimWelcomeBonus();

            // Always delete the notification after attempting to claim
            // This handles both successful claims and cases where user already claimed
            await deleteNotification(notificationId);

            if (bonusAmount > 0) {
                toast.success((dict?.toast?.welcomeBonusClaimed || '🎉 Welcome bonus claimed! +{amount} 🌕').replace('{amount}', bonusAmount.toString()) + ' and tournament pass!');
            } else {
                // User already claimed the bonus, but we still remove the notification
                toast.success(dict?.toast?.welcomeBonusClaimed || 'Welcome bonus already claimed!');
            }
        } catch (error) {
            console.error('Error claiming welcome bonus:', error);
            toast.error(dict?.toast?.failedToClaimWelcomeBonus || 'Failed to claim welcome bonus');
        } finally {
            setClaimingWelcomeBonus(false);
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

    const formatTimeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return dict?.notifications?.justNow || 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}${dict?.notifications?.minutesAgo || 'm ago'}`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}${dict?.notifications?.hoursAgo || 'h ago'}`;
        return `${Math.floor(diffInMinutes / 1440)}${dict?.notifications?.daysAgo || 'd ago'}`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notifications Button */}
            <Button
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-white hover:bg-white/10 border-transparent"
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </Button>

            {/* Notifications Dropdown */}
            {isOpen && (
                <div className="fixed left-1/2 -translate-x-1/2 sm:absolute sm:left-auto sm:right-0 sm:translate-x-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm sm:max-w-none rounded-lg shadow-lg z-50 max-h-[70vh] sm:max-h-96 overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50">
                    <div className="p-3 sm:p-4 border-b border-slate-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base sm:text-lg font-semibold">{dict?.notifications?.title || 'Notifications'}</h3>
                            <div className="flex gap-1 sm:gap-2">
                                {notifications.length > 0 && unreadCount === 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={clearAllNotifications}
                                        className="text-xs px-2 py-1 text-red-400 hover:text-red-300 text-[10px] sm:text-xs"
                                    >
                                        {dict?.notifications?.clearAll || 'Clear all'}
                                    </Button>
                                )}
                                {unreadCount > 0 && (
                                    <div className="relative group">
                                        <Button
                                            variant="outline"
                                            onClick={markAllAsRead}
                                            className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-blue-400 hover:text-blue-300"
                                            title=""
                                        >
                                            <Check className="h-3 w-3" />
                                        </Button>
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 overflow-visible">
                                            {dict?.notifications?.markAllRead || 'Mark all read'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-3 sm:p-4">
                        {loading ? (
                            <div className="text-center py-4 text-gray-400">{dict?.notifications?.loading || 'Loading notifications...'}</div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-4 text-gray-400">
                                <p>{dict?.notifications?.noNotifications || 'No notifications yet'}</p>
                            </div>
                        ) : (
                            <div className="space-y-2 sm:space-y-3">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-2 sm:p-3 rounded-lg border ${notification.read_at ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-700 border-slate-500'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    {notification.type === 'welcome_bonus' && <Gift className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />}
                                                    <h4 className="font-medium text-white text-sm sm:text-base">{notification.title}</h4>
                                                </div>
                                                <p className="text-xs sm:text-sm text-gray-300 mt-1">{notification.message}</p>
                                                {notification.data?.winnings && (
                                                    <p className="text-xs sm:text-sm text-green-400 mt-1 flex items-center gap-1">
                                                        {dict?.notifications?.winnings || 'Winnings'}: {notification.data.winnings} <CoinIcon size={12} />
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1 sm:mt-2">{formatTimeAgo(notification.created_at)}</p>

                                                {/* Welcome Bonus Action Button */}
                                                {notification.type === 'welcome_bonus' && !notification.read_at && (
                                                    <div className="mt-2 sm:mt-3">
                                                        <Button
                                                            onClick={() => handleWelcomeBonusClaim(notification.id)}
                                                            disabled={claimingWelcomeBonus}
                                                            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs sm:text-sm py-1.5 sm:py-2"
                                                        >
                                                            {claimingWelcomeBonus ? 'Claiming...' : 'Claim Welcome Bonus'}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1 ml-2">
                                                {!notification.read_at && notification.type !== 'welcome_bonus' && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => markAsRead(notification.id)}
                                                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-green-400 hover:text-green-300"
                                                    >
                                                        <Check className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    onClick={() => deleteNotification(notification.id)}
                                                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
}
