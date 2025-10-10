"use client";

import { useState } from "react";
import { Button } from "@netprophet/ui";
import { User, Users, CheckCircle, Plus, ArrowLeft, UserPlus } from "lucide-react";
import { useDictionary } from "@/context/DictionaryContext";
import { PlayerMatch } from "./types";

interface ProfileClaimResultNewProps {
    playerMatch: PlayerMatch | null;
    playerMatches?: PlayerMatch[];
    userFirstName: string;
    userLastName: string;
    onClaimProfile: (playerId: string) => Promise<void>;
    onCreateProfile: () => void;
    onSkip: () => void;
    onBack?: () => void;
    loading?: boolean;
}

export function ProfileClaimResultNew({
    playerMatch,
    playerMatches = [],
    userFirstName,
    userLastName,
    onClaimProfile,
    onCreateProfile,
    onSkip,
    onBack,
    loading = false,
}: ProfileClaimResultNewProps) {
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const { dict } = useDictionary();

    const handleClaimProfile = async (playerId?: string) => {
        const idToClaim = playerId || playerMatch?.id;
        if (!idToClaim) return;

        setActionLoading(true);
        try {
            await onClaimProfile(idToClaim);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateProfile = () => {
        onCreateProfile();
    };

    // Multiple matches - show selection list
    if (!playerMatch && playerMatches.length > 1) {
        return (
            <div className="w-full max-w-2xl mx-auto">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-8 py-4 sm:py-6">
                        <div className="flex items-center justify-center mb-2 sm:mb-3">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 sm:ring-4 ring-white/30">
                                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white text-center">
                            {dict.profileSetup?.multipleMatches?.title || "Multiple Players Found"}
                        </h2>
                        <p className="text-blue-100 text-center mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg">
                            {dict.profileSetup?.multipleMatches?.description ||
                                "We found multiple players with matching information. Please select your profile."}
                        </p>
                    </div>

                    {/* Player List - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-3 sm:space-y-4">
                        {/* Info Banner */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                            <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
                                {dict.profileSetup?.result?.multipleMatchesBanner || "Select your player profile to participate in matches as yourself, or create a new one if you're not listed."}
                            </p>
                        </div>

                        {playerMatches.map((player) => (
                            <button
                                key={player.id}
                                onClick={() => setSelectedPlayerId(player.id)}
                                className={`
                                    w-full p-3 sm:p-4 lg:p-5 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-left
                                    ${selectedPlayerId === player.id
                                        ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/20'
                                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 hover:shadow-md'
                                    }
                                `}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                                        <div className={`
                                            w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base lg:text-lg
                                            ${selectedPlayerId === player.id
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-200 text-gray-600'
                                            }
                                        `}>
                                            {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg">
                                                {player.first_name} {player.last_name}
                                            </div>
                                            {player.match_score !== undefined && (
                                                <div className="text-xs sm:text-sm text-gray-500">
                                                    {dict.profileSetup?.result?.matchScore || "Match Score"}: {player.match_score}%
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {selectedPlayerId === player.id && (
                                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="border-t border-gray-200 p-3 sm:p-4 lg:p-6 space-y-2 sm:space-y-3 bg-gray-50">
                        <Button
                            onClick={() => selectedPlayerId && handleClaimProfile(selectedPlayerId)}
                            disabled={!selectedPlayerId || actionLoading || loading}
                            className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                        >
                            {actionLoading || loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span className="hidden sm:inline">{dict.profileSetup?.result?.claiming || "Claiming..."}</span>
                                </span>
                            ) : (
                                dict.profileSetup?.result?.selectProfile || "Claim Selected Profile"
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleCreateProfile}
                            disabled={actionLoading || loading}
                            className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all text-sm sm:text-base"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">{dict.profileSetup?.multipleMatches?.createInstead || "None of these - Create New"}</span>
                            <span className="sm:hidden">Create New</span>
                        </Button>

                        <div className="pt-2 sm:pt-4 border-t border-gray-200 space-y-2 sm:space-y-3">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg sm:rounded-xl p-2 sm:p-3">
                                <p className="text-xs text-purple-800 text-center font-medium">
                                    💡 {dict.profileSetup?.result?.skipTooltip || "Skip to continue as a NetProphet user"}
                                </p>
                            </div>
                            <div className="flex gap-2 sm:gap-3">
                                {onBack && (
                                    <Button
                                        variant="ghost"
                                        onClick={onBack}
                                        disabled={actionLoading || loading}
                                        className="flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-gray-600 hover:bg-gray-100 text-sm sm:text-base"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                                        <span className="hidden sm:inline">{dict.profileSetup?.result?.backButton || "Back"}</span>
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={onSkip}
                                    disabled={actionLoading || loading}
                                    className="flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200 text-sm sm:text-base"
                                >
                                    {dict.profileSetup?.result?.skipButton || "Skip for now"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Single match found - show claim option
    if (playerMatch) {
        return (
            <div className="w-full max-w-2xl mx-auto">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 sm:px-8 py-4 sm:py-6">
                        <div className="flex items-center justify-center mb-2 sm:mb-3">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 sm:ring-4 ring-white/30">
                                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white text-center">
                            {dict.profileSetup.result.playerFound}
                        </h2>
                        <p className="text-green-100 text-center mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg">
                            {dict.profileSetup.result.playerFoundDescription}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                        {/* Info Banner */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                            <p className="text-xs sm:text-sm text-blue-800 leading-relaxed text-center">
                                <strong className="font-bold">{dict.profileSetup?.result?.singleMatchBannerBold || "Great news!"}</strong> {dict.profileSetup?.result?.singleMatchBanner || "We found a matching player profile. Claim it to participate in matches as yourself, or skip to continue as a regular NetProphet user."}
                            </p>
                        </div>

                        {/* Player Info Card */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-full flex items-center justify-center font-black text-white text-lg sm:text-2xl">
                                    {playerMatch.first_name.charAt(0)}{playerMatch.last_name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                        <span className="font-bold text-green-800 text-xs sm:text-sm uppercase tracking-wide">
                                            {dict.profileSetup.result.playerName}
                                        </span>
                                    </div>
                                    <p className="text-lg sm:text-xl lg:text-2xl font-black text-green-900">
                                        {playerMatch.first_name} {playerMatch.last_name}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 sm:space-y-3">
                            <Button
                                onClick={() => handleClaimProfile()}
                                disabled={actionLoading || loading}
                                className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all transform hover:scale-[1.02] text-sm sm:text-base"
                            >
                                {actionLoading || loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span className="hidden sm:inline">{dict.profileSetup?.result?.claiming || "Claiming..."}</span>
                                    </span>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 inline" />
                                        {dict.profileSetup.result.claimProfile || "Claim This Profile"}
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleCreateProfile}
                                disabled={actionLoading || loading}
                                className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all text-xs sm:text-sm"
                            >
                                <UserPlus className="w-4 h-4 mr-1 sm:mr-2" />
                                {dict.profileSetup?.result?.notYouButton || "Not you? Create new"}
                            </Button>

                            <div className="pt-2 sm:pt-4 border-t border-gray-200 space-y-2 sm:space-y-3">
                                <div className="bg-purple-50 border border-purple-200 rounded-lg sm:rounded-xl p-2 sm:p-3">
                                    <p className="text-xs text-purple-800 text-center font-medium">
                                        💡 {dict.profileSetup?.result?.skipTooltip || "Skip to continue as a NetProphet user"}
                                    </p>
                                </div>
                                <div className="flex gap-2 sm:gap-3">
                                    {onBack && (
                                        <Button
                                            variant="ghost"
                                            onClick={onBack}
                                            disabled={actionLoading || loading}
                                            className="flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-gray-600 hover:bg-gray-100 text-sm sm:text-base"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                                            <span className="hidden sm:inline">{dict.profileSetup?.result?.backButton || "Back"}</span>
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={onSkip}
                                        disabled={actionLoading || loading}
                                        className="flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200 text-sm sm:text-base"
                                    >
                                        {dict.profileSetup?.result?.skipButton || "Skip for now"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // No match found - show create profile option
    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-600 to-yellow-600 px-4 sm:px-8 py-4 sm:py-6">
                    <div className="flex items-center justify-center mb-2 sm:mb-3">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 sm:ring-4 ring-white/30">
                            <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white text-center">
                        {dict.profileSetup.result.noPlayerFound}
                    </h2>
                    <p className="text-orange-100 text-center mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg">
                        {dict.profileSetup.result.noPlayerFoundDescription}
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                    {/* Info Banner */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-blue-800 leading-relaxed text-center">
                            {dict.profileSetup?.result?.noMatchBanner || "No existing player profile found. You can request a new player profile to compete in matches, or skip to continue as a NetProphet user."}
                        </p>
                    </div>

                    {/* User Info Card */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-600 rounded-full flex items-center justify-center font-black text-white text-lg sm:text-2xl">
                                {userFirstName.charAt(0)}{userLastName.charAt(0)}
                            </div>
                            <div>
                                <div className="text-xs sm:text-sm font-bold text-orange-800 uppercase tracking-wide mb-1">
                                    {dict.profileSetup?.result?.yourInformation || "Your Information"}
                                </div>
                                <p className="text-lg sm:text-xl lg:text-2xl font-black text-orange-900">
                                    {userFirstName} {userLastName}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 sm:space-y-3">
                        <Button
                            onClick={handleCreateProfile}
                            disabled={actionLoading || loading}
                            className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all transform hover:scale-[1.02] text-sm sm:text-base"
                        >
                            {actionLoading || loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span className="hidden sm:inline">{dict.profileSetup?.result?.requesting || "Requesting..."}</span>
                                </span>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-2 inline" />
                                    {dict.profileSetup?.result?.createButton || "Request New Profile"}
                                </>
                            )}
                        </Button>

                        <div className="pt-2 sm:pt-4 border-t border-gray-200 space-y-2 sm:space-y-3">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg sm:rounded-xl p-2 sm:p-3">
                                <p className="text-xs text-purple-800 text-center font-medium">
                                    💡 {dict.profileSetup?.result?.skipTooltip || "Skip to continue as a NetProphet user"}
                                </p>
                            </div>
                            <div className="flex gap-2 sm:gap-3">
                                {onBack && (
                                    <Button
                                        variant="ghost"
                                        onClick={onBack}
                                        disabled={actionLoading || loading}
                                        className="flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-gray-600 hover:bg-gray-100 text-sm sm:text-base"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                                        <span className="hidden sm:inline">{dict.profileSetup?.result?.backButton || "Back"}</span>
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={onSkip}
                                    disabled={actionLoading || loading}
                                    className="flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200 text-sm sm:text-base"
                                >
                                    {dict.profileSetup?.result?.skipButton || "Skip for now"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

