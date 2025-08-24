'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/sonner';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading, signOut } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Check if we're on an auth page
    const isAuthPage = pathname?.startsWith('/auth');

    useEffect(() => {
        if (!loading && !user && !isAuthPage) {
            router.push('/auth/signin');
        }
    }, [user, loading, router, isAuthPage]);

    const handleSignOut = async () => {
        try {
            console.log('AdminLayout: Starting signOut...');
            await signOut();
            console.log('AdminLayout: SignOut completed, redirecting...');

            // Force a hard redirect to clear any cached state
            window.location.href = '/auth/signin';
        } catch (error) {
            console.error('AdminLayout: SignOut exception:', error);
            // Still redirect even if there's an exception
            window.location.href = '/auth/signin';
        }
    };

    // For auth pages, just render the children without admin layout
    if (isAuthPage) {
        return <>{children}</>;
    }

    // For all other pages, apply the admin layout
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-gray-600">Redirecting to sign in...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex h-screen">
                {/* Sidebar */}
                <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                {/* Main content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top bar */}
                    <TopBar
                        userEmail={user?.email || 'Unknown User'}
                        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                        onSignOut={handleSignOut}
                    />

                    {/* Page content */}
                    <main className="flex-1 overflow-y-auto p-6">
                        {children}
                    </main>
                </div>
            </div>
            <Toaster />
        </div>
    );
} 