"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription } from "@netprophet/ui";
import { Loader2, User, CheckCircle, AlertCircle, Plus, Users } from "lucide-react";
import { useDictionary } from "@/context/DictionaryContext";
import { ProfileSelectionList, PlayerMatch } from "./ProfileSelectionList";

interface ProfileClaimResultProps {
    playerMatch: PlayerMatch | null;
    playerMatches?: PlayerMatch[];
    userFirstName: string;
    userLastName: string;
    onClaimProfile: (playerId: string) => Promise<void>;
    onCreateProfile: () => Promise<void>;
    onSkip: () => void;
    onBack?: () => void;
    onEdit?: () => void;
    loading?: boolean;
}

export function ProfileClaimResult({
    playerMatch,
    playerMatches = [],
    userFirstName,
    userLastName,
    onClaimProfile,
    onCreateProfile,
    onSkip,
    onBack,
    onEdit,
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

    // Handle multiple matches - show selection list
    if (!playerMatch && playerMatches.length > 1) {
        return (
            <Card className="w-full max-w-md mx-auto sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">
                        {dict.profileSetup?.multipleMatches?.title || "Multiple Players Found"}
                    </CardTitle>
                    <CardDescription>
                        {dict.profileSetup?.multipleMatches?.description ||
                            "We found multiple players with matching information. Please select your profile."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ProfileSelectionList
                        players={playerMatches}
                        onSelectPlayer={handleClaimProfile}
                        loading={actionLoading || loading}
                    />

                    <div className="pt-4 border-t space-y-3">
                        <Button
                            variant="outline"
                            onClick={onCreateProfile}
                            disabled={actionLoading || loading}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {dict.profileSetup?.multipleMatches?.createInstead || "None of these are me - Create New Profile"}
                        </Button>

                        {onBack && (
                            <Button
                                variant="ghost"
                                onClick={onBack}
                                disabled={actionLoading || loading}
                                className="w-full"
                            >
                                {dict.profileSetup?.result?.backButton || "Back"}
                            </Button>
                        )}

                        {onSkip && (
                            <Button
                                variant="ghost"
                                onClick={onSkip}
                                disabled={actionLoading || loading}
                                className="w-full text-gray-500"
                            >
                                {dict.profileSetup?.result?.skipButton || "Skip for now"}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (playerMatch) {
        // Player found - show claim option
        return (
            <Card className="w-full max-w-md mx-auto sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
        <Card className="w-full max-w-md mx-auto sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <User className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-blue-800">{dict.profileSetup.result.yourName}:</span>
                        </div>
                        {onEdit && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onEdit}
                                className="text-blue-600 border-blue-300 hover:bg-blue-100"
                            >
                                {(dict as any)?.profileSetup?.result?.editButton || "Edit"}
                            </Button>
                        )}
                    </div>
                    <p className="text-blue-700">
                        <strong>{userFirstName} {userLastName}</strong>
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                        {dict.profileSetup.result.nameUsageDescription}
                    </p>
                    <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-700">
                                <p className="font-medium">{(dict as any)?.profileSetup?.result?.importantNotice || "Important:"}</p>
                                <p>{(dict as any)?.profileSetup?.result?.credentialsNotice || "Please use your real name and surname as they appear in official documents. This ensures accurate matching in tournaments and competitions."}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-800">{(dict as any)?.profileSetup?.result?.skipTitle || "Skip Player Setup"}</span>
                    </div>
                    <p className="text-yellow-700 text-sm">
                        {(dict as any)?.profileSetup?.result?.skipDescription || "You can skip this step and continue as a regular user. You can always set up your player profile later from your profile page."}
                    </p>
                </div>

                <div className="flex space-x-3">
                    {onBack && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onBack}
                            className="flex-1"
                            disabled={loading || actionLoading}
                        >
                            Back
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onSkip}
                        className="flex-1 border-yellow-300 text-white"
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
