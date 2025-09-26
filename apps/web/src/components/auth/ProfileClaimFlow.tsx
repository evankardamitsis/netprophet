"use client";

import { useState, useEffect } from "react";
import { ProfileClaimForm } from "./ProfileClaimForm";
import { ProfileClaimResult } from "./ProfileClaimResult";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription } from "@netprophet/ui";
import { CheckCircle, Loader2 } from "lucide-react";
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
}

interface ProfileClaimFlowProps {
    userId: string;
    onComplete: () => void;
    onSkip: () => void;
    onRefresh?: () => void;
}

type FlowStep = "form" | "result" | "processing" | "completed";

export function ProfileClaimFlow({ userId, onComplete, onSkip, onRefresh }: ProfileClaimFlowProps) {
    const [currentStep, setCurrentStep] = useState<FlowStep>("form");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playerMatch, setPlayerMatch] = useState<PlayerMatch | null>(null);
    const [userData, setUserData] = useState<{
        firstName: string;
        lastName: string;
    } | null>(null);
    const { dict } = useDictionary();

    // Check if user already has names and search for matches
    useEffect(() => {
        const checkExistingProfile = async () => {
            try {
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("first_name, last_name, profile_claim_status")
                    .eq("id", userId)
                    .single();

                if (profileError) {
                    console.error("Error fetching profile:", profileError);
                    return;
                }

                // If user has names and profile is pending, search for matches
                if (profile.first_name && profile.last_name && profile.profile_claim_status === "pending") {
                    setUserData({
                        firstName: profile.first_name,
                        lastName: profile.last_name
                    });

                    // Search for matching players
                    const { data: matches, error: searchError } = await supabase
                        .rpc("find_matching_players", {
                            search_name: profile.first_name,
                            search_surname: profile.last_name,
                        });

                    if (searchError) {
                        console.error("Error searching for players:", searchError);
                        return;
                    }

                    setPlayerMatch(matches && matches.length > 0 ? matches[0] : null);
                    setCurrentStep("result");
                }
            } catch (err) {
                console.error("Error checking existing profile:", err);
            }
        };

        if (userId) {
            checkExistingProfile();
        }
    }, [userId]);

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
                })
                .eq("id", userId);

            if (updateError) {
                throw new Error(`Failed to update profile: ${updateError.message}`);
            }

            // Search for matching players
            const { data: matches, error: searchError } = await supabase
                .rpc("find_matching_players", {
                    search_name: data.firstName,
                    search_surname: data.lastName,
                });

            if (searchError) {
                throw new Error(`Failed to search for players: ${searchError.message}`);
            }

            setCurrentStep("result");
            setPlayerMatch(matches && matches.length > 0 ? matches[0] : null);
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

    const handleSkip = () => {
        onSkip();
    };

    const handleComplete = () => {
        onComplete();
    };

    if (currentStep === "completed") {
        return (
            <Card className="w-full max-w-md mx-auto">
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
                    <div className="mt-4">
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

    if (error) {
        return (
            <Card className="w-full max-w-md mx-auto">
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

    if (currentStep === "form") {
        return (
            <ProfileClaimForm
                onComplete={handleFormSubmit}
                onCancel={onSkip}
                loading={loading}
            />
        );
    }

    if (currentStep === "result" && userData) {
        return (
            <ProfileClaimResult
                playerMatch={playerMatch}
                userFirstName={userData.firstName}
                userLastName={userData.lastName}
                onClaimProfile={handleClaimProfile}
                onCreateProfile={handleCreateProfile}
                onSkip={handleSkip}
                loading={loading}
            />
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardContent className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Processing...</p>
            </CardContent>
        </Card>
    );
}
