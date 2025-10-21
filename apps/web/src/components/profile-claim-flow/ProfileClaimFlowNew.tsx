"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2, X } from "lucide-react";
import { supabase } from "@netprophet/lib";
import { useDictionary } from "@/context/DictionaryContext";
import { StepIndicator } from "./StepIndicator";
import { ProfileClaimFormNew } from "./ProfileClaimFormNew";
import { ProfileClaimResultNew } from "./ProfileClaimResultNew";
import { ProfileClaimSuccessNew } from "./ProfileClaimSuccessNew";
import { ProfileCreationReview } from "./ProfileCreationReview";
import { PlayerMatch } from "./types";
import { findMatchingPlayers, getUserName } from "@/lib/playerLookup";
import { debugPlayerLookup } from "@/lib/debugPlayerLookup";
// Removed cache imports - using direct function calls

interface ProfileClaimFlowNewProps {
    userId: string;
    onComplete: () => void;
    onSkip: () => void;
    onClose?: () => void;
    onRefresh?: () => void;
    forceRefresh?: number;
    testMode?: 'normal' | 'match' | 'multiple';
}

type FlowStep = "checking" | "form" | "result" | "reviewCreation" | "success";

export function ProfileClaimFlowNew({ userId, onComplete, onSkip, onClose, onRefresh, forceRefresh, testMode = 'normal' }: ProfileClaimFlowNewProps) {
    const [currentStep, setCurrentStep] = useState<FlowStep>("checking");
    const [currentStepNumber, setCurrentStepNumber] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playerMatch, setPlayerMatch] = useState<PlayerMatch | null>(null);
    const [playerMatches, setPlayerMatches] = useState<PlayerMatch[]>([]);
    const [userData, setUserData] = useState<{
        firstName: string;
        lastName: string;
    } | null>(null);
    const [cameFromForm, setCameFromForm] = useState(false);
    const [claimedPlayerId, setClaimedPlayerId] = useState<string | null>(null);
    const [isClaimSuccess, setIsClaimSuccess] = useState(true); // true if claimed, false if created
    const { dict } = useDictionary();

    // Automatic lookup on mount - Step 1 (optimized with caching)
    useEffect(() => {
        const performAutoLookup = async () => {
            setLoading(true);
            setCurrentStep("checking");
            setCurrentStepNumber(1);

            try {
                // Get profile data - no caching
                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("profile_claim_status, claimed_player_id")
                    .eq("id", userId)
                    .single();

                if (error) throw error;

                // Profile data is now cached and error-free

                // If already completed, show success
                if (profile.profile_claim_status === "claimed") {
                    console.log("✅ User already has claimed player - showing success");
                    const { firstName, lastName } = await getUserName(userId);
                    setPlayerMatch({
                        id: profile.claimed_player_id || '',
                        first_name: firstName || '',
                        last_name: lastName || '',
                        is_hidden: false,
                        is_active: true,
                        claimed_by_user_id: userId,
                        is_demo_player: false
                    });
                    setClaimedPlayerId(profile.claimed_player_id);
                    setIsClaimSuccess(true);
                    setCurrentStep("success");
                    setCurrentStepNumber(3);
                    setLoading(false);
                    return;
                }

                if (profile.profile_claim_status === "creation_requested") {
                    setIsClaimSuccess(false);
                    setCurrentStep("success");
                    setCurrentStepNumber(3);
                    setLoading(false);
                    return;
                }

                // Get user's name from profile or user_metadata (with auto-sync for Gmail users)
                const { firstName, lastName } = await getUserName(userId);
                console.log("🔍 Debug - getUserName result:", { firstName, lastName, userId });

                // Always perform lookup, even if user doesn't have a name yet
                // This ensures consistent experience for all users
                if (firstName && lastName) {
                    console.log("🔍 Auto lookup - User has name:", firstName, lastName);
                    console.log("🔍 Skipping form, going directly to lookup");

                    setUserData({
                        firstName: firstName,
                        lastName: lastName
                    });

                    // Perform player lookup (checks both name orders)
                    try {
                        let lookupResult;

                        if (testMode === 'match') {
                            // Test mode: simulate single match found
                            console.log("🧪 Test Mode: Simulating single match found");
                            const mockMatch: PlayerMatch = {
                                id: 'test-player-1',
                                first_name: firstName,
                                last_name: lastName,
                                is_hidden: false,
                                is_active: true,
                                claimed_by_user_id: null,
                                is_demo_player: false
                            };
                            lookupResult = { matches: [mockMatch] };
                        } else if (testMode === 'multiple') {
                            // Test mode: simulate multiple matches found
                            console.log("🧪 Test Mode: Simulating multiple matches found");
                            const mockMatches: PlayerMatch[] = [
                                {
                                    id: 'test-player-1',
                                    first_name: firstName,
                                    last_name: lastName,
                                    is_hidden: false,
                                    is_active: true,
                                    claimed_by_user_id: null,
                                    is_demo_player: false
                                },
                                {
                                    id: 'test-player-2',
                                    first_name: firstName,
                                    last_name: lastName + ' Jr.',
                                    is_hidden: false,
                                    is_active: true,
                                    claimed_by_user_id: null,
                                    is_demo_player: false
                                }
                            ];
                            lookupResult = { matches: mockMatches };
                        } else {
                            // Normal mode: perform actual lookup (cached)
                            console.log("🔍 Performing debug lookup for:", firstName, lastName);
                            await debugPlayerLookup(firstName, lastName);
                            lookupResult = await findMatchingPlayers(firstName, lastName);
                        }

                        // Show results (match found or not found)
                        if (lookupResult.matches.length > 0) {
                            setPlayerMatches(lookupResult.matches);
                            if (lookupResult.matches.length === 1) {
                                setPlayerMatch(lookupResult.matches[0]);
                            }
                        } else {
                            setPlayerMatch(null);
                            setPlayerMatches([]);
                        }

                        setCurrentStep("result");
                        setCurrentStepNumber(2);
                        setLoading(false);
                        console.log("🔧 Loading state reset to false after successful lookup");
                    } catch (error) {
                        console.error("❌ Player lookup failed:", error);
                        // If lookup fails, ask for name again
                        setCurrentStep("form");
                        setCurrentStepNumber(1);
                    }
                } else {
                    console.log("📝 No name available - showing form after checking step");
                    console.log("🔍 This means getUserName returned null/empty names");
                    // No name in profile - show form after the checking step
                    // Add a small delay to show the checking step with explanations
                    setTimeout(() => {
                        setCurrentStep("form");
                        setCurrentStepNumber(1);
                        setLoading(false);
                    }, 2000); // 2 second delay to show the checking step
                    return; // Don't set loading to false here, let setTimeout handle it
                }
            } catch (err) {
                console.error("Error during auto lookup:", err);
                setCurrentStep("form");
                setCurrentStepNumber(1);
                setLoading(false);
            }
        };

        if (userId) {
            performAutoLookup();
        }
    }, [userId, forceRefresh, testMode]);

    const handleFormSubmit = useCallback(async (data: {
        firstName: string;
        lastName: string;
        termsAccepted: boolean;
    }) => {
        setLoading(true);
        setError(null);
        setUserData({ firstName: data.firstName, lastName: data.lastName });

        try {
            // Update user profile - don't set to pending immediately for Gmail users
            // Let the lookup process determine the appropriate status
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    first_name: data.firstName,
                    last_name: data.lastName,
                    terms_accepted: true,
                    terms_accepted_at: new Date().toISOString(),
                    // Don't set profile_claim_status to "pending" here
                    // Let the lookup result determine the status
                })
                .eq("id", userId);

            if (updateError) {
                throw new Error(`Failed to update profile: ${updateError.message}`);
            }

            // Search for matching players using helper (checks both name orders) - cached
            try {
                const lookupResult = await findMatchingPlayers(data.firstName, data.lastName);

                setCameFromForm(true);

                if (lookupResult.matches.length > 0) {
                    setPlayerMatches(lookupResult.matches);
                    if (lookupResult.matches.length === 1) {
                        setPlayerMatch(lookupResult.matches[0]);
                    } else {
                        setPlayerMatch(null);
                    }
                } else {
                    setPlayerMatch(null);
                    setPlayerMatches([]);
                    // Only set to pending when no matches found and user needs to take action
                    await supabase
                        .from("profiles")
                        .update({
                            profile_claim_status: "pending",
                            updated_at: new Date().toISOString()
                        })
                        .eq("id", userId);
                }

                setCurrentStep("result");
                setCurrentStepNumber(2);
            } catch (err) {
                console.error("Error searching for players:", err);
                setError("Failed to search for matching players");
                setLoading(false);
                return;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const handleClaimProfile = useCallback(async (playerId: string) => {
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.rpc("handle_player_claim", {
                user_id: userId,
                player_id: playerId,
            });

            if (error) {
                throw new Error(`Failed to claim profile: ${error.message}`);
            }

            if (!data?.success) {
                throw new Error(data?.message || "Failed to claim profile");
            }

            setClaimedPlayerId(playerId);
            setIsClaimSuccess(true);
            setCurrentStep("success");
            setCurrentStepNumber(3);
            if (onRefresh) {
                setTimeout(() => {
                    onRefresh();
                }, 500);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }, [userId, onRefresh]);

    const handleShowReviewCreation = useCallback(() => {
        setCurrentStep("reviewCreation");
        setCurrentStepNumber(2);
        setError(null);
        setLoading(false); // Ensure loading state is reset when showing review
    }, []);

    const handleCreateProfile = useCallback(async (firstName: string, lastName: string) => {
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.rpc("handle_profile_creation_request", {
                user_id: userId,
                user_first_name: firstName,
                user_last_name: lastName,
            });

            if (error) {
                throw new Error(`Failed to request profile creation: ${error.message}`);
            }

            if (!data?.success) {
                throw new Error(data?.message || "Failed to request profile creation");
            }

            setIsClaimSuccess(false);
            setCurrentStep("success");
            setCurrentStepNumber(3);
            if (onRefresh) {
                onRefresh();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }, [userId, onRefresh]);

    const handleBackFromReview = useCallback(() => {
        setCurrentStep("result");
        setCurrentStepNumber(2);
        setError(null);
    }, []);

    const handleBackToForm = useCallback(() => {
        setCurrentStep("form");
        setCurrentStepNumber(1);
        setError(null);
    }, []);

    const handleSkip = useCallback(async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    profile_claim_status: "skipped",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", userId);

            if (error) {
                console.error("Error updating profile skip status:", error);
            }

            onSkip();
        } catch (err) {
            console.error("Error skipping profile claim:", err);
            onSkip();
        } finally {
            setLoading(false);
        }
    }, [userId, onSkip]);

    // Memoized step content to prevent unnecessary re-renders
    const stepContent = useMemo(() => {
        if (currentStep === "form") {
            return (
                <ProfileClaimFormNew
                    onComplete={handleFormSubmit}
                    onCancel={handleSkip}
                    onClose={onClose}
                    loading={loading}
                    initialValues={userData ? {
                        firstName: userData.firstName,
                        lastName: userData.lastName
                    } : undefined}
                />
            );
        }

        if (currentStep === "result" && userData) {
            return (
                <ProfileClaimResultNew
                    playerMatch={playerMatch}
                    playerMatches={playerMatches}
                    userFirstName={userData.firstName}
                    userLastName={userData.lastName}
                    onClaimProfile={handleClaimProfile}
                    onCreateProfile={handleShowReviewCreation}
                    onSkip={handleSkip}
                    onBack={cameFromForm ? handleBackToForm : undefined}
                    onClose={onClose}
                    loading={loading}
                />
            );
        }

        if (currentStep === "reviewCreation" && userData) {
            return (
                <ProfileCreationReview
                    initialFirstName={userData.firstName}
                    initialLastName={userData.lastName}
                    onConfirm={handleCreateProfile}
                    onBack={handleBackFromReview}
                    loading={loading}
                />
            );
        }

        if (currentStep === "success") {
            return (
                <ProfileClaimSuccessNew
                    isClaimed={isClaimSuccess}
                    claimedPlayerId={claimedPlayerId}
                    onComplete={onComplete}
                />
            );
        }

        return null;
    }, [
        currentStep,
        userData,
        playerMatch,
        playerMatches,
        cameFromForm,
        loading,
        isClaimSuccess,
        claimedPlayerId,
        handleFormSubmit,
        handleSkip,
        handleClaimProfile,
        handleShowReviewCreation,
        handleCreateProfile,
        handleBackToForm,
        handleBackFromReview,
        onComplete
    ]);

    // Loading state
    if (currentStep === "checking" || (loading && !currentStep)) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[500px] max-h-[85vh]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 flex-shrink-0 relative">
                        {/* Close Button */}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors p-1"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        <div className="flex items-center justify-center mb-2 sm:mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 sm:ring-3 lg:ring-4 ring-white/30">
                                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white animate-spin" />
                            </div>
                        </div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-white text-center mb-1 sm:mb-2">
                            {dict.profileSetup?.checking?.title || "Searching Player Database..."}
                        </h2>
                        <p className="text-indigo-100 text-center text-xs sm:text-sm lg:text-base xl:text-lg">
                            {dict.profileSetup?.checking?.description || "We're checking if you already exist as a player in our database."}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8 space-y-3 sm:space-y-4 lg:space-y-6">
                        {/* Explanation Cards */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3 lg:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-sm sm:text-base lg:text-xl">🎾</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-blue-900 mb-0.5 sm:mb-1 text-xs sm:text-sm lg:text-base">
                                        {dict.profileSetup?.checking?.playerProfileTitle || "Player Profile"}
                                    </h3>
                                    <p className="text-[10px] sm:text-xs lg:text-sm text-blue-800 leading-relaxed">
                                        {dict.profileSetup?.checking?.explanation || "This will match you with your existing player profile so you can participate in matches as yourself."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 border-2 border-green-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3 lg:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-sm sm:text-base lg:text-xl">🏆</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-green-900 mb-0.5 sm:mb-1 text-xs sm:text-sm lg:text-base">
                                        {dict.profileSetup?.checking?.whyMatchTitle || "Why Match Your Profile?"}
                                    </h3>
                                    <p className="text-[10px] sm:text-xs lg:text-sm text-green-800 leading-relaxed">
                                        {dict.profileSetup?.checking?.benefit || "Claiming your player profile lets you compete in matches and track your tennis career!"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3 lg:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-sm sm:text-base lg:text-xl">✨</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-purple-900 mb-0.5 sm:mb-1 text-xs sm:text-sm lg:text-base">
                                        {dict.profileSetup?.checking?.completelyOptionalTitle || "Completely Optional"}
                                    </h3>
                                    <p className="text-[10px] sm:text-xs lg:text-sm text-purple-800 leading-relaxed">
                                        {dict.profileSetup?.checking?.optional || "This is optional - you can skip and continue playing as a NetProphet user."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Loading indicator */}
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-gray-500 pt-2 sm:pt-3 lg:pt-4">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5 bg-purple-500 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden min-h-[400px] max-h-[85vh] flex flex-col">
                    <div className="bg-red-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 flex-shrink-0">
                        <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-white text-center">{dict?.common?.error || "Error"}</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8 space-y-3 sm:space-y-4 lg:space-y-6">
                        <div className="bg-red-50 border-2 border-red-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3 lg:p-4">
                            <p className="text-red-800 text-[10px] sm:text-xs lg:text-sm leading-relaxed">{error}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <button
                                onClick={() => {
                                    setError(null);
                                    setCurrentStep("form");
                                    setCurrentStepNumber(1);
                                }}
                                className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white transition-all text-xs sm:text-sm lg:text-base"
                            >
                                {dict?.profileSetup?.tryAgain || "Try Again"}
                            </button>
                            <button
                                onClick={onSkip}
                                className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-all text-xs sm:text-sm lg:text-base"
                            >
                                {dict?.profileSetup?.skip || "Skip"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            {/* Step Indicator - Hide on success step */}
            {currentStep !== "success" && (
                <div className="flex-shrink-0 mb-2 sm:mb-3">
                    <StepIndicator currentStep={currentStepNumber} />
                </div>
            )}

            {/* Current Step Content */}
            <div className="flex-1 flex items-center justify-center">
                {stepContent}
            </div>
        </div>
    );
}

