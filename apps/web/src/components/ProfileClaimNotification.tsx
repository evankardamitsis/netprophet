"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileSetupModal } from "@/context/ProfileSetupModalContext";
import { supabase } from "@netprophet/lib";
import { X, User, Trophy } from "lucide-react";

export function ProfileClaimNotification() {
    const { user } = useAuth();
    const { setShowProfileSetup } = useProfileSetupModal();
    const [showNotification, setShowNotification] = useState(false);
    const [hasShownBefore, setHasShownBefore] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const checkProfileStatus = async () => {
            try {
                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("first_name, last_name, profile_claim_status, claimed_player_id")
                    .eq("id", user.id)
                    .single();

                if (error) {
                    console.error("Error checking profile status:", error);
                    setLoading(false);
                    return;
                }

                // Check if user has already claimed a player
                if (profile.claimed_player_id) {
                    setLoading(false);
                    return;
                }

                // Check if user has names but hasn't claimed a player yet
                if (profile.first_name && profile.last_name && !profile.claimed_player_id) {
                    // Check if we've shown this notification before
                    const notificationShown = localStorage.getItem(`profile-claim-notification-${user.id}`);

                    if (!notificationShown) {
                        setShowNotification(true);
                    }
                }

                setLoading(false);
            } catch (error) {
                console.error("Error checking profile status:", error);
                setLoading(false);
            }
        };

        checkProfileStatus();
    }, [user, setShowProfileSetup]);

    const handleStartProfileClaim = () => {
        setShowProfileSetup(true);
        setShowNotification(false);
        // Mark as shown for this user
        if (user) {
            localStorage.setItem(`profile-claim-notification-${user.id}`, 'true');
        }
    };

    const handleDismiss = () => {
        setShowNotification(false);
        // Mark as shown for this user
        if (user) {
            localStorage.setItem(`profile-claim-notification-${user.id}`, 'true');
        }
    };

    if (loading || !showNotification) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <Trophy className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1">
                            Claim Your Player Profile
                        </h3>
                        <p className="text-xs text-blue-100 mb-3">
                            Connect your account with your tennis player profile to compete in matches and track your career!
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleStartProfileClaim}
                                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
                            >
                                Get Started
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-3 py-1.5 text-blue-100 hover:text-white text-xs transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 text-blue-200 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
