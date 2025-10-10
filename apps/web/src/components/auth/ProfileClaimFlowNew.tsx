"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@netprophet/lib";
import { useDictionary } from "@/context/DictionaryContext";
import { StepIndicator } from "./StepIndicator";
import { ProfileClaimFormNew } from "./ProfileClaimFormNew";
import { ProfileClaimResultNew } from "./ProfileClaimResultNew";
import { ProfileClaimSuccessNew } from "./ProfileClaimSuccessNew";
import { ProfileCreationReview } from "./ProfileCreationReview";
import { PlayerMatch } from "./types";
import { findMatchingPlayers, getUserName } from "@/lib/playerLookup";

interface ProfileClaimFlowNewProps {
    userId: string;
    onComplete: () => void;
    onSkip: () => void;
    onRefresh?: () => void;
    forceRefresh?: number;
}

type FlowStep = "checking" | "form" | "result" | "reviewCreation" | "success";

export function ProfileClaimFlowNew({ userId, onComplete, onSkip, onRefresh, forceRefresh }: ProfileClaimFlowNewProps) {
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

    // Automatic lookup on mount - Step 1
    useEffect(() => {
        const performAutoLookup = async () => {
            setLoading(true);
            setCurrentStep("checking");
            setCurrentStepNumber(1);

            try {
                // Get profile data
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("profile_claim_status, claimed_player_id")
                    .eq("id", userId)
                    .single();

                if (profileError) {
                    console.error("Error fetching profile:", profileError);
                    setCurrentStep("form");
                    setCurrentStepNumber(1);
                    setLoading(false);
                    return;
                }

                // If already completed, show success
                if (profile.profile_claim_status === "claimed") {
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

                // Get user's name from profile or user_metadata
                const { firstName, lastName } = await getUserName(userId);

                // If user has names (from either source), perform automatic lookup
                if (firstName && lastName) {
                    console.log("🔍 Auto lookup - User has name:", firstName, lastName);

                    setUserData({
                        firstName: firstName,
                        lastName: lastName
                    });

                    // Perform player lookup (checks both name orders)
                    try {
                        const lookupResult = await findMatchingPlayers(firstName, lastName);

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
                    } catch (error) {
                        console.error("❌ Player lookup failed:", error);
                        // If lookup fails, ask for name again
                        setCurrentStep("form");
                        setCurrentStepNumber(1);
                    }
                } else {
                    console.log("📝 No name available - showing form");
                    // No name in profile - ask for it
                    setCurrentStep("form");
                    setCurrentStepNumber(1);
                }
            } catch (err) {
                console.error("Error during auto lookup:", err);
                setCurrentStep("form");
                setCurrentStepNumber(1);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            performAutoLookup();
        }
    }, [userId, forceRefresh]);

    const handleFormSubmit = async (data: {
        firstName: string;
        lastName: string;
        termsAccepted: boolean;
    }) => {
        setLoading(true);
        setError(null);
        setUserData({ firstName: data.firstName, lastName: data.lastName });

        try {
            // Update user profile
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    first_name: data.firstName,
                    last_name: data.lastName,
                    terms_accepted: true,
                    terms_accepted_at: new Date().toISOString(),
                    profile_claim_status: "pending",
                })
                .eq("id", userId);

            if (updateError) {
                throw new Error(`Failed to update profile: ${updateError.message}`);
            }

            // Search for matching players using helper (checks both name orders)
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
                }

                setCurrentStep("result");
                setCurrentStepNumber(2);
            } catch (err) {
                console.error("Error searching for players:", err);
                setError("Failed to search for matching players");
                return;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleClaimProfile = async (playerId: string) => {
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
    };

    const handleShowReviewCreation = () => {
        setCurrentStep("reviewCreation");
        setCurrentStepNumber(2);
        setError(null);
    };

    const handleCreateProfile = async (firstName: string, lastName: string) => {
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
    };

    const handleBackFromReview = () => {
        setCurrentStep("result");
        setCurrentStepNumber(2);
        setError(null);
    };

    const handleBackToForm = () => {
        setCurrentStep("form");
        setCurrentStepNumber(1);
        setError(null);
    };

    const handleSkip = async () => {
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
    };

    // Loading state
    if (currentStep === "checking" || (loading && !currentStep)) {
        return (
            <div className="w-full max-w-2xl mx-auto">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-8 py-4 sm:py-6">
                        <div className="flex items-center justify-center mb-2 sm:mb-3">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 sm:ring-4 ring-white/30">
                                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin" />
                            </div>
                        </div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white text-center mb-1 sm:mb-2">
                            {dict.profileSetup?.checking?.title || "Searching Player Database..."}
                        </h2>
                        <p className="text-indigo-100 text-center text-sm sm:text-base lg:text-lg">
                            {dict.profileSetup?.checking?.description || "We're checking if you already exist as a player in our database."}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                        {/* Explanation Cards */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-base sm:text-xl">🎾</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-blue-900 mb-0.5 sm:mb-1 text-sm sm:text-base">
                                        {dict.profileSetup?.checking?.playerProfileTitle || "Player Profile"}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
                                        {dict.profileSetup?.checking?.explanation || "This will match you with your existing player profile so you can participate in matches as yourself."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 border-2 border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-base sm:text-xl">🏆</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-green-900 mb-0.5 sm:mb-1 text-sm sm:text-base">
                                        {dict.profileSetup?.checking?.whyMatchTitle || "Why Match Your Profile?"}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-green-800 leading-relaxed">
                                        {dict.profileSetup?.checking?.benefit || "Claiming your player profile lets you compete in matches and track your tennis career!"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-base sm:text-xl">✨</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-purple-900 mb-0.5 sm:mb-1 text-sm sm:text-base">
                                        {dict.profileSetup?.checking?.completelyOptionalTitle || "Completely Optional"}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-purple-800 leading-relaxed">
                                        {dict.profileSetup?.checking?.optional || "This is optional - you can skip and continue playing as a NetProphet user."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Loading indicator */}
                        <div className="flex items-center justify-center gap-2 text-gray-500 pt-2 sm:pt-4">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="w-full max-w-2xl mx-auto">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-red-600 px-4 sm:px-8 py-4 sm:py-6">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white text-center">{dict?.common?.error || "Error"}</h2>
                    </div>
                    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                        <div className="bg-red-50 border-2 border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                            <p className="text-red-800 text-xs sm:text-sm leading-relaxed">{error}</p>
                        </div>
                        <div className="flex gap-2 sm:gap-3">
                            <button
                                onClick={() => {
                                    setError(null);
                                    setCurrentStep("form");
                                    setCurrentStepNumber(1);
                                }}
                                className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white transition-all text-sm sm:text-base"
                            >
                                {dict?.profileSetup?.tryAgain || "Try Again"}
                            </button>
                            <button
                                onClick={onSkip}
                                className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-all text-sm sm:text-base"
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
        <div className="w-full">
            {/* Step Indicator - Hide on success step */}
            {currentStep !== "success" && (
                <StepIndicator currentStep={currentStepNumber} />
            )}

            {/* Current Step Content */}
            <div className="mt-2 sm:mt-3">
                {currentStep === "form" && (
                    <ProfileClaimFormNew
                        onComplete={handleFormSubmit}
                        onCancel={handleSkip}
                        loading={loading}
                        initialValues={userData ? {
                            firstName: userData.firstName,
                            lastName: userData.lastName
                        } : undefined}
                    />
                )}

                {currentStep === "result" && userData && (
                    <ProfileClaimResultNew
                        playerMatch={playerMatch}
                        playerMatches={playerMatches}
                        userFirstName={userData.firstName}
                        userLastName={userData.lastName}
                        onClaimProfile={handleClaimProfile}
                        onCreateProfile={handleShowReviewCreation}
                        onSkip={handleSkip}
                        onBack={cameFromForm ? handleBackToForm : undefined}
                        loading={loading}
                    />
                )}

                {currentStep === "reviewCreation" && userData && (
                    <ProfileCreationReview
                        initialFirstName={userData.firstName}
                        initialLastName={userData.lastName}
                        onConfirm={handleCreateProfile}
                        onBack={handleBackFromReview}
                        loading={loading}
                    />
                )}

                {currentStep === "success" && (
                    <ProfileClaimSuccessNew
                        isClaimed={isClaimSuccess}
                        claimedPlayerId={claimedPlayerId}
                        onComplete={onComplete}
                    />
                )}
            </div>
        </div>
    );
}

