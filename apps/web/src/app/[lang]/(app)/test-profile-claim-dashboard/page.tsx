"use client";

import { ProfileClaimFlowTestDashboard } from "@/components/profile-claim-flow/ProfileClaimFlowTestDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@netprophet/lib";

export default function TestProfileClaimDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang;
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminCheckLoading, setAdminCheckLoading] = useState(true);

    // Check if user is admin
    const checkAdminStatus = useCallback(async () => {
        if (!user?.id) {
            setIsAdmin(false);
            setAdminCheckLoading(false);
            return;
        }

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            setIsAdmin(profile?.is_admin || false);
        } catch (err) {
            console.error('Failed to check admin status:', err);
            setIsAdmin(false);
        } finally {
            setAdminCheckLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        checkAdminStatus();
    }, [checkAdminStatus]);

    // Redirect to sign in if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push(`/${lang}/auth/signin`);
        }
    }, [authLoading, user, router, lang]);

    // Show loading state while checking admin status
    if (authLoading || adminCheckLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p>Checking access permissions...</p>
                </div>
            </div>
        );
    }

    // Show access denied for non-admin users
    if (!user || !isAdmin) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="mb-6">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                        <p className="text-gray-300 mb-4">
                            This page is only accessible to administrators.
                        </p>
                        {!user ? (
                            <p className="text-sm text-gray-400">
                                Please sign in to continue.
                            </p>
                        ) : (
                            <p className="text-sm text-gray-400">
                                You don&apos;t have administrator privileges.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return <ProfileClaimFlowTestDashboard />;
}
