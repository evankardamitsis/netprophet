"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProfileClaimForm } from "./ProfileClaimForm";
import { ProfileClaimResult } from "./ProfileClaimResult";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription, Button } from "@netprophet/ui";
import { AlertCircle, CheckCircle, Clock, Loader2, User } from "lucide-react";
import { supabase } from "@netprophet/lib";
import { useDictionary } from "@/context/DictionaryContext";

interface PlayerMatch {
    id: string;
    first_name: string;
    last_name: string;
    is_hidden: boolean;
    is_active: boolean;
    claimed_by_user_id: string | null;
    is_demo_player: boolean;
    match_score?: number;
}

interface ProfileClaimFlowProps {
    userId: string;
    onComplete: () => void;
    onSkip: () => void;
    onRefresh?: () => void;
    forceRefresh?: number; // Increment this to force re-check
}

type FlowStep = "checking" | "form" | "result" | "processing" | "completed" | "waiting";

export function ProfileClaimFlow({ userId, onComplete, onSkip, onRefresh, forceRefresh }: ProfileClaimFlowProps) {
    const params = useParams();
    const lang = params?.lang || 'en';
    const [currentStep, setCurrentStep] = useState<FlowStep>("checking");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playerMatch, setPlayerMatch] = useState<PlayerMatch | null>(null);
    const [playerMatches, setPlayerMatches] = useState<PlayerMatch[]>([]); // Store ALL matches
    const [userData, setUserData] = useState<{
        firstName: string;
        lastName: string;
    } | null>(null);
    const [cameFromForm, setCameFromForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [claimedPlayerId, setClaimedPlayerId] = useState<string | null>(null);
    const { dict } = useDictionary();

    // Step 1: Check if user already has names and search for matches
    useEffect(() => {
        const checkExistingProfile = async () => {
            setLoading(true);
            try {
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("first_name, last_name, profile_claim_status, claimed_player_id")
                    .eq("id", userId)
                    .single();

                if (profileError) {
                    console.error("Error fetching profile:", profileError);
                    setCurrentStep("form");
                    setLoading(false);
                    return;
                }

                // If user has names, search for matches automatically
                if (profile.first_name && profile.last_name) {
                    setUserData({
                        firstName: profile.first_name,
                        lastName: profile.last_name
                    });

                    // Check if user already completed the process
                    if (profile.profile_claim_status === "claimed") {
                        // User has successfully claimed a player profile
                        // Set a dummy playerMatch to indicate this was a claim (not a creation request)
                        setPlayerMatch({
                            id: profile.claimed_player_id || '',
                            first_name: profile.first_name,
                            last_name: profile.last_name,
                            is_hidden: false,
                            is_active: true,
                            claimed_by_user_id: userId,
                            is_demo_player: false
                        });
                        setClaimedPlayerId(profile.claimed_player_id);
                        setCurrentStep("completed");
                        setLoading(false);
                        return;
                    }

                    // If user requested profile creation, they're still waiting for admin approval
                    if (profile.profile_claim_status === "creation_requested") {
                        // Check if this was set by automatic lookup (not by user action)
                        // If so, reset it to allow the user to go through the flow
                        const { data: profileData } = await supabase
                            .from("profiles")
                            .select("created_at, updated_at")
                            .eq("id", userId)
                            .single();

                        // If the profile was just created and updated at the same time,
                        // it was likely set by automatic lookup, so reset it
                        if (profileData && profileData.created_at === profileData.updated_at) {
                            await supabase
                                .from("profiles")
                                .update({
                                    profile_claim_status: null,
                                    updated_at: new Date().toISOString(),
                                })
                                .eq("id", userId);
                            // Continue with the flow instead of showing waiting
                        } else {
                            setCurrentStep("waiting");
                            setLoading(false);
                            return;
                        }
                    }

                    // If user has pending status, it means automatic lookup found matches
                    // This should always show the results, even if user previously skipped
                    if (profile.profile_claim_status === "pending") {
                        // Search for matching players to show the results
                        const { data: matches, error: searchError } = await supabase
                            .rpc("find_matching_players", {
                                search_name: profile.first_name,
                                search_surname: profile.last_name,
                            });

                        if (searchError) {
                            console.error("Error searching for players:", searchError);
                            setCurrentStep("form");
                            setLoading(false);
                            return;
                        }

                        if (matches && matches.length > 0) {
                            // Found matching players - store all matches
                            setPlayerMatches(matches);
                            // If only one match, set it directly
                            if (matches.length === 1) {
                                setPlayerMatch(matches[0]);
                            } else {
                                // Multiple matches - user needs to select
                                setPlayerMatch(null);
                            }
                            setCurrentStep("result");
                        } else {
                            // No matches found - show create profile option
                            setPlayerMatch(null);
                            setPlayerMatches([]);
                            setCurrentStep("result");
                        }
                        setLoading(false);
                        return;
                    }

                    // Search for matching players automatically
                    const { data: matches, error: searchError } = await supabase
                        .rpc("find_matching_players", {
                            search_name: profile.first_name,
                            search_surname: profile.last_name,
                        });

                    if (searchError) {
                        console.error("Error searching for players:", searchError);
                        setCurrentStep("form");
                        setLoading(false);
                        return;
                    }

                    if (matches && matches.length > 0) {
                        // Found matching players - store all matches
                        setPlayerMatches(matches);
                        // If only one match, set it directly
                        if (matches.length === 1) {
                            setPlayerMatch(matches[0]);
                        } else {
                            // Multiple matches - user needs to select
                            setPlayerMatch(null);
                        }
                        setCurrentStep("result");
                    } else {
                        // No matches found - show create profile option
                        setPlayerMatch(null);
                        setPlayerMatches([]);
                        setCurrentStep("result");
                    }
                } else {
                    // User doesn't have names, show form
                    setCurrentStep("form");
                }
            } catch (err) {
                console.error("Error checking existing profile:", err);
                setCurrentStep("form");
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            checkExistingProfile();
        }
    }, [userId, forceRefresh]); // Add forceRefresh as dependency

    const handleFormSubmit = async (data: {
        firstName: string;
        lastName: string;
        termsAccepted: boolean;
    }) => {
        setLoading(true);
        setError(null);
        setUserData({ firstName: data.firstName, lastName: data.lastName });

        try {
            // Update user profile with name and terms acceptance
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

            // Search for matching players after updating profile
            const { data: matches, error: searchError } = await supabase
                .rpc("find_matching_players", {
                    search_name: data.firstName,
                    search_surname: data.lastName,
                });

            if (searchError) {
                console.error("Error searching for players:", searchError);
                setError("Failed to search for matching players");
                return;
            }

            setCameFromForm(true); // User came from form step

            if (matches && matches.length > 0) {
                // Found matching players - store all matches
                setPlayerMatches(matches);
                // If only one match, set it directly
                if (matches.length === 1) {
                    setPlayerMatch(matches[0]);
                } else {
                    // Multiple matches - user needs to select
                    setPlayerMatch(null);
                }
                setCurrentStep("result");
            } else {
                // No matches found - show create profile option
                setPlayerMatch(null);
                setPlayerMatches([]);
                setCurrentStep("result");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
            setIsEditing(false);
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

            // Store the claimed player ID for the success screen
            setClaimedPlayerId(playerId);
            setCurrentStep("completed");
            // Refresh profile status after successful claim with a small delay
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

    const handleCreateProfile = async () => {
        setLoading(true);
        setError(null);

        try {
            if (!userData) {
                throw new Error("User data not available");
            }

            const { data, error } = await supabase.rpc("handle_profile_creation_request", {
                user_id: userId,
                user_first_name: userData.firstName,
                user_last_name: userData.lastName,
            });

            if (error) {
                throw new Error(`Failed to request profile creation: ${error.message}`);
            }

            if (!data?.success) {
                throw new Error(data?.message || "Failed to request profile creation");
            }

            setCurrentStep("completed");
            // Refresh profile status after successful request
            if (onRefresh) {
                onRefresh();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleBackToForm = () => {
        setCurrentStep("form");
        setError(null);
    };

    const handleEdit = () => {
        setIsEditing(true);
        setCurrentStep("form");
        setError(null);
    };


    const handleSkip = async () => {
        setLoading(true);
        try {
            // Update profile to mark as skipped
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
            onSkip(); // Still call onSkip even if there's an error
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = () => {
        onComplete();
    };

    if (currentStep === "completed") {
        return (
            <Card className="w-full max-w-md mx-auto sm:max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl">{dict.profileSetup.success.title}</CardTitle>
                    <CardDescription>
                        {dict.profileSetup.success.description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                            {playerMatch
                                ? dict.profileSetup.success.claimedMessage
                                : dict.profileSetup.success.requestedMessage}
                        </AlertDescription>
                    </Alert>
                    <div className="mt-4 space-y-3">
                        {playerMatch && claimedPlayerId && (
                            <Link
                                href={`/${lang}/players/${claimedPlayerId}`}
                                className="w-full inline-flex items-center justify-center bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
                                onClick={handleComplete}
                            >
                                <User className="h-4 w-4 mr-2" />
                                {dict.profileSetup.success.viewPlayerProfile || "View My Player Profile"}
                            </Link>
                        )}
                        <button
                            onClick={handleComplete}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            {dict.profileSetup.success.continueButton}
                        </button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (currentStep === "waiting") {
        return (
            <Card className="w-full max-w-md mx-auto sm:max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                        <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <CardTitle className="text-2xl text-yellow-800">Profile Creation Requested</CardTitle>
                    <CardDescription>
                        Your player profile creation request has been submitted and is waiting for admin approval.
                        You&apos;ll be notified once it&apos;s been reviewed.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                            <span className="font-semibold text-yellow-800">What happens next?</span>
                        </div>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• Admin will review your request</li>
                            <li>• You&apos;ll receive an email notification</li>
                            <li>• You can continue using the app as a regular user</li>
                        </ul>
                    </div>
                    <div className="flex space-x-3">
                        <Button
                            onClick={handleComplete}
                            className="flex-1"
                        >
                            Continue to App
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-full max-w-md mx-auto sm:max-w-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-red-600">Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <div className="mt-4 flex space-x-3">
                        <button
                            onClick={() => setCurrentStep("form")}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            {(dict as any)?.profileSetup?.tryAgain || "Try Again"}
                        </button>
                        <button
                            onClick={onSkip}
                            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                        >
                            {(dict as any)?.profileSetup?.skip || "Skip"}
                        </button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (currentStep === "checking") {
        return (
            <Card className="w-full max-w-md mx-auto sm:max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    </div>
                    <CardTitle className="text-2xl">Checking Profile...</CardTitle>
                    <CardDescription>
                        We&apos;re looking for existing player profiles that match your information.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (currentStep === "form") {
        return (
            <ProfileClaimForm
                onComplete={handleFormSubmit}
                onCancel={onSkip}
                loading={loading}
                initialValues={isEditing && userData ? {
                    firstName: userData.firstName,
                    lastName: userData.lastName
                } : undefined}
            />
        );
    }

    if (currentStep === "result" && userData) {
        return (
            <ProfileClaimResult
                playerMatch={playerMatch}
                playerMatches={playerMatches}
                userFirstName={userData.firstName}
                userLastName={userData.lastName}
                onClaimProfile={handleClaimProfile}
                onCreateProfile={handleCreateProfile}
                onSkip={handleSkip}
                onBack={cameFromForm ? handleBackToForm : undefined}
                onEdit={!playerMatch && playerMatches.length === 0 ? handleEdit : undefined}
                loading={loading}
            />
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto sm:max-w-lg">
            <CardContent className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Processing...</p>
            </CardContent>
        </Card>
    );
}
