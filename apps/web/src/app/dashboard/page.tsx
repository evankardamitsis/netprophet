'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@netprophet/lib';

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkAuth = async () => {
            console.log('🔍 Checking authentication status...');

            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('❌ Auth error:', error);
                router.push('/auth/signin');
                return;
            }

            if (!session) {
                console.log('❌ No session found, redirecting to signin');
                router.push('/auth/signin');
                return;
            }

            console.log('✅ Authenticated user:', session.user.email);
            setUser(session.user);
            setLoading(false);
        };

        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔄 Auth state changed:', event);

                if (event === 'SIGNED_OUT') {
                    console.log('👋 User signed out, redirecting to signin');
                    router.push('/auth/signin');
                } else if (event === 'SIGNED_IN' && session) {
                    console.log('✅ User signed in:', session.user.email);
                    setUser(session.user);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
                        <div className="text-center">
                            <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                Welcome to NetProphet Dashboard
                            </h1>
                            <p className="text-lg text-gray-600 mb-6">
                                Hello, {user?.email}! You're successfully authenticated.
                            </p>
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-lg shadow">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                                        Your Tennis Prediction Platform
                                    </h2>
                                    <p className="text-gray-600">
                                        This is where you'll manage your tennis predictions, view match analytics, and track your performance.
                                    </p>
                                </div>
                                <button
                                    onClick={async () => {
                                        await supabase.auth.signOut();
                                    }}
                                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 