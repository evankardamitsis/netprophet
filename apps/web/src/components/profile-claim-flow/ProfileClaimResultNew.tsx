"use client";

import { useState } from "react";
import { Button } from "@netprophet/ui";
import { User, Users, CheckCircle, Plus, ArrowLeft, UserPlus, X } from "lucide-react";
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
    onClose?: () => void;
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
    onClose,
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
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[500px] max-h-[85vh]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 flex-shrink-0 relative">
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
                                <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-white text-center">
                            {dict.profileSetup?.multipleMatches?.title || "Multiple Athletes Found"}
                        </h2>
                        <p className="text-blue-100 text-center mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base xl:text-lg">
                            {dict.profileSetup?.result?.multipleMatchesBanner ||
                                "We found multiple athletes with matching information. Please select your profile."}
                        </p>
                    </div>

                    {/* Player List - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8 space-y-2.5 sm:space-y-3 lg:space-y-4">

                        {playerMatches.map((player) => (
                            <button
                                key={player.id}
                                onClick={() => setSelectedPlayerId(player.id)}
                                className={`
                                    w-full p-2.5 sm:p-3 lg:p-4 xl:p-5 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-left
                                    ${selectedPlayerId === player.id
                                        ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/20'
                                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 hover:shadow-md'
                                    }
                                `}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 xl:gap-4">
                                        <div className={`
                                            w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm lg:text-base xl:text-lg
                                            ${selectedPlayerId === player.id
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-200 text-gray-600'
                                            }
                                        `}>
                                            {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-gray-900 text-xs sm:text-sm lg:text-base xl:text-lg truncate">
                                                {player.first_name} {player.last_name}
                                            </div>
                                            {player.match_score !== undefined && (
                                                <div className="text-[9px] sm:text-xs lg:text-sm text-gray-500">
                                                    {dict.profileSetup?.result?.matchScore || "Match Score"}: {player.match_score}%
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {selectedPlayerId === player.id && (
                                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 flex-shrink-0" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="border-t border-gray-200 p-2.5 sm:p-3 lg:p-4 xl:p-6 space-y-2 sm:space-y-2.5 lg:space-y-3 bg-gray-50 flex-shrink-0">
                        <Button
                            onClick={() => selectedPlayerId && handleClaimProfile(selectedPlayerId)}
                            disabled={!selectedPlayerId || actionLoading || loading}
                            className="w-full py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-xs lg:text-sm"
                        >
                            {actionLoading || loading ? (
                                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                            className="w-full py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all text-[10px] sm:text-xs lg:text-sm"
                        >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                            <span className="hidden sm:inline">{dict.profileSetup?.multipleMatches?.createInstead || "None of these - Create New"}</span>
                            <span className="sm:hidden">Create New</span>
                        </Button>

                        <div className="pt-2 sm:pt-3 lg:pt-4 border-t border-gray-200 space-y-2 sm:space-y-2.5 lg:space-y-3">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                {onBack && (
                                    <Button
                                        variant="ghost"
                                        onClick={onBack}
                                        disabled={actionLoading || loading}
                                        className="flex-1 py-1.5 sm:py-2 lg:py-3 rounded-lg sm:rounded-xl font-bold text-gray-600 hover:bg-gray-100 text-[9px] sm:text-xs lg:text-sm"
                                    >
                                        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                        <span className="hidden sm:inline">{dict.profileSetup?.result?.backButton || "Back"}</span>
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={onSkip}
                                    disabled={actionLoading || loading}
                                    className="flex-1 py-1.5 sm:py-2 lg:py-3 rounded-lg sm:rounded-xl font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200 text-[9px] sm:text-xs lg:text-sm"
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
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[500px] max-h-[85vh]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 flex-shrink-0 relative">
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
                                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-white text-center">
                            {dict.profileSetup.result.playerFound}
                        </h2>
                        <p className="text-green-100 text-center mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base xl:text-lg">
                            {dict.profileSetup.result.playerFoundDescription}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8 space-y-3 sm:space-y-4 lg:space-y-6">

                        {/* Player Info Card */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                            <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-green-600 rounded-full flex items-center justify-center font-black text-white text-sm sm:text-lg lg:text-2xl">
                                    {playerMatch.first_name.charAt(0)}{playerMatch.last_name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                        <User className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-green-600" />
                                        <span className="font-bold text-green-800 text-[10px] sm:text-xs lg:text-sm uppercase tracking-wide">
                                            {dict.profileSetup.result.playerName}
                                        </span>
                                    </div>
                                    <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black text-green-900 truncate">
                                        {playerMatch.first_name} {playerMatch.last_name}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 sm:space-y-2.5 lg:space-y-3">
                            <Button
                                onClick={() => handleClaimProfile()}
                                disabled={actionLoading || loading}
                                className="w-full py-2.5 sm:py-3 lg:py-4 rounded-lg sm:rounded-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all transform hover:scale-[1.02] text-[10px] sm:text-xs lg:text-sm"
                            >
                                {actionLoading || loading ? (
                                    <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span className="hidden sm:inline">{dict.profileSetup?.result?.claiming || "Claiming..."}</span>
                                    </span>
                                ) : (
                                    <>
                                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2 inline" />
                                        {dict.profileSetup.result.claimProfile || "Claim This Profile"}
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleCreateProfile}
                                disabled={actionLoading || loading}
                                className="w-full py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all text-[9px] sm:text-xs lg:text-sm"
                            >
                                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                {dict.profileSetup?.result?.notYouButton || "Not you? Create new"}
                            </Button>

                            <div className="pt-2 sm:pt-3 lg:pt-4 border-t border-gray-200 space-y-2 sm:space-y-2.5 lg:space-y-3">
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                    {onBack && (
                                        <Button
                                            variant="ghost"
                                            onClick={onBack}
                                            disabled={actionLoading || loading}
                                            className="flex-1 py-1.5 sm:py-2 lg:py-3 rounded-lg sm:rounded-xl font-bold text-gray-600 hover:bg-gray-100 text-[9px] sm:text-xs lg:text-sm"
                                        >
                                            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                            <span className="hidden sm:inline">{dict.profileSetup?.result?.backButton || "Back"}</span>
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={onSkip}
                                        disabled={actionLoading || loading}
                                        className="flex-1 py-1.5 sm:py-2 lg:py-3 rounded-lg sm:rounded-xl font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200 text-[9px] sm:text-xs lg:text-sm"
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
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden min-h-[500px] max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-600 to-yellow-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 flex-shrink-0 relative">
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
                            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                        </div>
                    </div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-white text-center">
                        {dict.profileSetup.result.noPlayerFound}
                    </h2>
                    <p className="text-orange-100 text-center mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base xl:text-lg">
                        {dict.profileSetup?.result?.noPlayerFoundDescription || "No existing player found"}
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8 space-y-3 sm:space-y-4 lg:space-y-6">

                    {/* User Info Card */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                        <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-orange-600 rounded-full flex items-center justify-center font-black text-white text-sm sm:text-lg lg:text-2xl">
                                {userFirstName.charAt(0)}{userLastName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] sm:text-xs lg:text-sm font-bold text-orange-800 uppercase tracking-wide mb-1">
                                    {dict.profileSetup?.result?.yourInformation || "Your Information"}
                                </div>
                                <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black text-orange-900 truncate">
                                    {userFirstName} {userLastName}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 sm:space-y-2.5 lg:space-y-3">
                        <Button
                            onClick={handleCreateProfile}
                            disabled={actionLoading || loading}
                            className="w-full py-2.5 sm:py-3 lg:py-4 rounded-lg sm:rounded-xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all transform hover:scale-[1.02] text-[10px] sm:text-xs lg:text-sm"
                        >
                            {actionLoading || loading ? (
                                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span className="hidden sm:inline">{dict.profileSetup?.result?.requesting || "Requesting..."}</span>
                                </span>
                            ) : (
                                <>
                                    <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2 inline" />
                                    {dict.profileSetup?.result?.createButton || "Request New Profile"}
                                </>
                            )}
                        </Button>

                        <div className="pt-2 sm:pt-3 lg:pt-4 border-t border-gray-200 space-y-2 sm:space-y-2.5 lg:space-y-3">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                {onBack && (
                                    <Button
                                        variant="ghost"
                                        onClick={onBack}
                                        disabled={actionLoading || loading}
                                        className="flex-1 py-1.5 sm:py-2 lg:py-3 rounded-lg sm:rounded-xl font-bold text-gray-600 hover:bg-gray-100 text-[9px] sm:text-xs lg:text-sm"
                                    >
                                        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                        <span className="hidden sm:inline">{dict.profileSetup?.result?.backButton || "Back"}</span>
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={onSkip}
                                    disabled={actionLoading || loading}
                                    className="flex-1 py-1.5 sm:py-2 lg:py-3 rounded-lg sm:rounded-xl font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200 text-[9px] sm:text-xs lg:text-sm"
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

