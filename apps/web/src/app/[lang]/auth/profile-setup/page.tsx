"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfileClaim } from "@/hooks/useProfileClaim";
import { ProfileClaimFlowNew } from "@/components/profile-claim-flow/ProfileClaimFlowNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription } from "@netprophet/ui";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@netprophet/ui";

export default function ProfileSetupPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { needsProfileSetup, loading: profileLoading, error, refreshStatus } = useProfileClaim(user?.id || null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
            return;
        }

        if (!profileLoading && !needsProfileSetup && user) {
            // User has completed profile setup, redirect to main app
            router.push("/");
        }
    }, [user, authLoading, profileLoading, needsProfileSetup, router]);

    const handleComplete = async () => {
        // Add a small delay to allow database updates to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.push("/");
    };

    const handleSkip = () => {
        router.push("/");
    };

    const handleBack = () => {
        router.back();
    };

    if (authLoading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md mx-auto">
                    <CardContent className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p>Loading...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md mx-auto">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl text-red-600">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        <div className="mt-4 flex space-x-3">
                            <Button onClick={handleBack} variant="outline" className="flex-1">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Go Back
                            </Button>
                            <Button onClick={() => window.location.reload()} className="flex-1">
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!needsProfileSetup) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-800 to-purple-700 py-12 px-4">
            <div className="w-full max-w-4xl">
                <div className="mb-6">
                    <Button
                        onClick={handleBack}
                        variant="outline"
                        className="mb-4 bg-white/10 hover:bg-white/20 text-white border-white/30"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </div>

                <ProfileClaimFlowNew
                    userId={user.id}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    onRefresh={async () => {
                        // Refresh profile status to prevent loop
                        await refreshStatus();
                    }}
                />
            </div>
        </div>
    );
}
