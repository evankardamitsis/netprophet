'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, User, Bell } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@netprophet/lib';
import Logo from '@/components/Logo';

interface TopBarProps {
    userEmail?: string;
    onMenuClick: () => void;
    onSignOut: () => void;
}

interface Notification {
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export function TopBar({ userEmail, onMenuClick, onSignOut }: TopBarProps) {
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                // Fetch unread count
                const countResponse = await fetch('/api/admin/in-app-notifications?limit=1');
                if (countResponse.ok) {
                    const countData = await countResponse.json();
                    setUnreadCount(countData.unreadCount || 0);
                }

                // Fetch recent notifications (prioritize unread, but show recent ones too)
                const response = await fetch('/api/admin/in-app-notifications?limit=5');
                if (response.ok) {
                    const data = await response.json();
                    // Sort: unread first, then by date
                    const sorted = (data.notifications || []).sort((a: Notification, b: Notification) => {
                        if (a.is_read !== b.is_read) {
                            return a.is_read ? 1 : -1;
                        }
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    });
                    setRecentNotifications(sorted.slice(0, 5));
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchNotifications();

        // Set up real-time subscription for new notifications
        const channel = supabase
            .channel('admin_notifications_topbar_channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'admin_in_app_notifications',
                },
                (payload: any) => {
                    // New notification inserted, refresh
                    fetchNotifications();
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
                    // Notification updated, refresh
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen]);

    const handleViewAll = () => {
        setIsOpen(false);
        router.push('/in-app-notifications');
    };

    return (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Left side - Menu button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMenuClick}
                    className="lg:hidden"
                >
                    <Menu className="h-5 w-5" />
                </Button>

                {/* Center - Logo and Page title (mobile only) */}
                <div className="flex-1 lg:flex-none flex items-center justify-center lg:justify-start">
                    <Link
                        href="/"
                        className="lg:hidden flex items-center hover:opacity-80 transition-opacity cursor-pointer no-underline"
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        <Logo size="sm" showText={false} />
                        <span className="text-lg font-semibold text-gray-900 ml-2 pointer-events-none">
                            Admin Panel
                        </span>
                    </Link>
                </div>

                {/* Right side - Notifications, User info and sign out */}
                <div className="flex items-center space-x-4">
                    {/* Notification Bell */}
                    <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative"
                                title="Notifications"
                            >
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center"
                                    >
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="end">
                            <div className="p-4 border-b">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <Badge variant="destructive" className="text-xs">
                                            {unreadCount} unread
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {recentNotifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No new notifications</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {recentNotifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-blue-50/50' : ''
                                                    }`}
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    router.push('/in-app-notifications');
                                                }}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className={`text-sm font-semibold truncate ${!notification.is_read ? 'text-blue-900' : 'text-gray-900'
                                                                }`}>
                                                                {notification.title}
                                                            </p>
                                                            {!notification.is_read && (
                                                                <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-600 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {new Date(notification.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-3 border-t">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleViewAll}
                                >
                                    View All Notifications
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{userEmail}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSignOut}
                        title="Sign out"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
} 