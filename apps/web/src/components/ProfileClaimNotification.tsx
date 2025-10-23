"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileSetupModal } from "@/context/ProfileSetupModalContext";
import { useDictionary } from "@/context/DictionaryContext";
import { useWallet } from "@/context/WalletContext";
import { supabase } from "@netprophet/lib";
import { X, User, Trophy } from "lucide-react";

export function ProfileClaimNotification() {
    const { user } = useAuth();
    const { setShowProfileSetup } = useProfileSetupModal();
    const { dict } = useDictionary();
    const { wallet } = useWallet();
    const [showNotification, setShowNotification] = useState(false);
    const [hasShownBefore, setHasShownBefore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isReminder, setIsReminder] = useState(false);
    const hasCheckedRef = useRef(false);

    useEffect(() => {
        if (!user) return;

        const checkProfileStatus = async () => {
            try {

                // Check both profile data and welcome bonus status directly from database
                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("first_name, last_name, profile_claim_status, claimed_player_id, has_received_welcome_bonus")
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
                // AND user has already claimed their welcome bonus (check both wallet and database)
                const hasReceivedWelcomeBonus = wallet.hasReceivedWelcomeBonus || profile.has_received_welcome_bonus;

                if (profile.first_name && profile.last_name && !profile.claimed_player_id && hasReceivedWelcomeBonus) {
                    // Check if we've shown this notification before
                    const notificationShown = localStorage.getItem(`profile-claim-notification-${user.id}`);
                    const processStarted = localStorage.getItem(`profile-claim-started-${user.id}`);
                    const processStartedTime = processStarted ? parseInt(processStarted) : null;
                    const now = Date.now();

                    // If user started the process but didn't complete it, show reminder after 1 hour
                    if (processStartedTime && (now - processStartedTime) > 60 * 60 * 1000) { // 1 hour
                        setIsReminder(true);
                        setShowNotification(true);
                    } else if (!notificationShown && !processStartedTime) {
                        setIsReminder(false);
                        setShowNotification(true);
                    }
                }

                setLoading(false);
            } catch (error) {
                console.error("Error checking profile status:", error);
                setLoading(false);
            }
        };

        // Use a shorter delay and run when welcome bonus status changes
        const timer = setTimeout(checkProfileStatus, 100); // Reduced delay
        return () => clearTimeout(timer);
    }, [user, wallet.hasReceivedWelcomeBonus]); // Include all dependencies

    const handleStartProfileClaim = () => {
        setShowProfileSetup(true);
        setShowNotification(false);
        // Track that user started the process
        if (user) {
            localStorage.setItem(`profile-claim-started-${user.id}`, Date.now().toString());
        }
    };

    const handleDismiss = () => {
        setShowNotification(false);
        // Mark as dismissed for this user (permanent dismissal)
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
                            {isReminder
                                ? (dict?.profileClaimNotification?.reminderTitle || "Complete Your Athlete Profile")
                                : (dict?.profileClaimNotification?.title || "Claim Your Athlete Profile")
                            }
                        </h3>
                        <p className="text-xs text-blue-100 mb-3">
                            {isReminder
                                ? (dict?.profileClaimNotification?.reminderMessage || "You started setting up your athlete profile but didn't finish. Complete it now to compete in matches!")
                                : (dict?.profileClaimNotification?.message || "Connect your account with your athlete profile to compete in matches and track your career!")
                            }
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleStartProfileClaim}
                                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
                            >
                                {dict?.profileClaimNotification?.getStarted || "Get Started"}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-3 py-1.5 text-blue-100 hover:text-white text-xs transition-colors"
                            >
                                {dict?.profileClaimNotification?.maybeLater || "Maybe Later"}
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
