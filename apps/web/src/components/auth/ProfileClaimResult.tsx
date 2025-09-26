"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription } from "@netprophet/ui";
import { Loader2, User, CheckCircle, AlertCircle, Plus } from "lucide-react";
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

interface ProfileClaimResultProps {
    playerMatch: PlayerMatch | null;
    userFirstName: string;
    userLastName: string;
    onClaimProfile: (playerId: string) => Promise<void>;
    onCreateProfile: () => Promise<void>;
    onSkip: () => void;
    loading?: boolean;
}

export function ProfileClaimResult({
    playerMatch,
    userFirstName,
    userLastName,
    onClaimProfile,
    onCreateProfile,
    onSkip,
    loading = false,
}: ProfileClaimResultProps) {
    const [actionLoading, setActionLoading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const { dict } = useDictionary();

    const handleClaimProfile = async () => {
        if (!playerMatch) return;
        setActionLoading(true);
        try {
            await onClaimProfile(playerMatch.id);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateProfile = async () => {
        setActionLoading(true);
        try {
            await onCreateProfile();
        } finally {
            setActionLoading(false);
        }
    };

    if (playerMatch) {
        // Player found - show claim option
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl">{dict.profileSetup.result.playerFound}</CardTitle>
                    <CardDescription>
                        {dict.profileSetup.result.playerFoundDescription}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <User className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-green-800">{dict.profileSetup.result.playerName}:</span>
                        </div>
                        <p className="text-green-700">
                            <strong>{playerMatch.first_name} {playerMatch.last_name}</strong>
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-700">
                                {dict.profileSetup.result.claimDescription}
                            </p>
                        </div>

                        <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="text-sm">
                                <span className="text-gray-300">
                                    {dict.profileSetup.result.termsLabel}
                                </span>
                            </div>
                        </label>
                    </div>

                    <div className="flex space-x-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onSkip}
                            className="flex-1 hover:bg-gray-50"
                            disabled={loading || actionLoading}
                        >
                            {dict.profileSetup.skip}
                        </Button>
                        <Button
                            onClick={handleClaimProfile}
                            className="flex-1"
                            disabled={loading || actionLoading || !termsAccepted}
                        >
                            {actionLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {dict.profileSetup.processing}
                                </>
                            ) : (
                                dict.profileSetup.result.claimProfile
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // No player found - show create option
    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">{dict.profileSetup.result.noPlayerFound}</CardTitle>
                <CardDescription>
                    {dict.profileSetup.result.noPlayerFoundDescription}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                        <User className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-800">{dict.profileSetup.result.yourName}:</span>
                    </div>
                    <p className="text-blue-700">
                        <strong>{userFirstName} {userLastName}</strong>
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                        {dict.profileSetup.result.nameUsageDescription}
                    </p>
                </div>

                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {dict.profileSetup.result.createDescription}
                    </AlertDescription>
                </Alert>

                <div className="flex space-x-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onSkip}
                        className="flex-1 hover:bg-gray-50"
                        disabled={loading || actionLoading}
                    >
                        {dict.profileSetup.skip}
                    </Button>
                    <Button
                        onClick={handleCreateProfile}
                        className="flex-1"
                        disabled={loading || actionLoading}
                    >
                        {actionLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {dict.profileSetup.processing}
                            </>
                        ) : (
                            dict.profileSetup.result.createProfile
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
