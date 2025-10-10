"use client";

import { CheckCircle, Sparkles, User, ArrowRight } from "lucide-react";
import { Button } from "@netprophet/ui";
import Link from "next/link";
import { useDictionary } from "@/context/DictionaryContext";
import { useParams } from "next/navigation";

interface ProfileClaimSuccessNewProps {
    isClaimed: boolean; // true if claimed, false if creation requested
    claimedPlayerId?: string | null;
    onComplete: () => void;
}

export function ProfileClaimSuccessNew({ isClaimed, claimedPlayerId, onComplete }: ProfileClaimSuccessNewProps) {
    const { dict } = useDictionary();
    const params = useParams();
    const lang = params?.lang || 'en';

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header with Animation */}
                <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 px-4 sm:px-8 py-6 sm:py-8 lg:py-12 relative overflow-hidden">
                    {/* Animated background circles */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-center mb-3 sm:mb-4">
                            <div className="relative">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
                                    <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-green-500" />
                                </div>
                                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2">
                                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300 animate-pulse" />
                                </div>
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white text-center mb-1 sm:mb-2">
                            {isClaimed
                                ? (dict.profileSetup.success.claimedTitle || dict.profileSetup.success.title)
                                : (dict.profileSetup.success.requestedTitle || dict.profileSetup.success.title)
                            }
                        </h2>
                        <p className="text-purple-100 text-center text-sm sm:text-base lg:text-lg">
                            {isClaimed
                                ? (dict.profileSetup.success.claimedDescription || dict.profileSetup.success.description)
                                : (dict.profileSetup.success.requestedDescription || dict.profileSetup.success.description)
                            }
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                    {/* Success Message Card */}
                    <div className={`
                        rounded-lg sm:rounded-xl p-4 sm:p-6 border-2
                        ${isClaimed
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                        }
                    `}>
                        <div className="flex items-start gap-3 sm:gap-4">
                            <div className={`
                                w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0
                                ${isClaimed ? 'bg-green-500' : 'bg-blue-500'}
                            `}>
                                <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className={`
                                    text-xs sm:text-sm leading-relaxed
                                    ${isClaimed ? 'text-green-800' : 'text-blue-800'}
                                `}>
                                    {isClaimed
                                        ? (dict.profileSetup.success.claimedMessage || "Your player profile has been successfully linked to your account. You can now view your statistics and match history!")
                                        : (dict.profileSetup.success.requestedMessage || "Your profile creation request has been submitted to our admin team. You'll receive a notification once it's been reviewed and approved.")
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* What's Next Card */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
                        <h3 className="font-bold text-purple-900 text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                            {dict.profileSetup?.success?.whatsNext || "What's Next?"}
                        </h3>
                        <ul className="space-y-2 sm:space-y-3">
                            <li className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-purple-800">
                                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-900 text-xs sm:text-sm">1</span>
                                <span className="leading-relaxed">
                                    {isClaimed
                                        ? (dict.profileSetup?.success?.step1Claimed || "Explore your player statistics and match history")
                                        : (dict.profileSetup?.success?.step1Requested || "Wait for admin approval (you'll receive an email notification)")
                                    }
                                </span>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-purple-800">
                                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-900 text-xs sm:text-sm">2</span>
                                <span className="leading-relaxed">{dict.profileSetup?.success?.step2 || "Make predictions on upcoming matches"}</span>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-purple-800">
                                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-900 text-xs sm:text-sm">3</span>
                                <span className="leading-relaxed">{dict.profileSetup?.success?.step3 || "Earn coins and climb the leaderboard!"}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-4">
                        {isClaimed && claimedPlayerId && (
                            <Link
                                href={`/${lang}/players/${claimedPlayerId}`}
                                className="block"
                                onClick={onComplete}
                            >
                                <Button className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all transform hover:scale-[1.02] text-sm sm:text-base">
                                    <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                    {dict.profileSetup.success.viewPlayerProfile || "View My Player Profile"}
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                                </Button>
                            </Link>
                        )}
                        <Button
                            onClick={onComplete}
                            variant={isClaimed && claimedPlayerId ? "outline" : "default"}
                            className={`
                                w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold transition-all transform hover:scale-[1.02] text-sm sm:text-base
                                ${isClaimed && claimedPlayerId
                                    ? 'border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40'
                                }
                            `}
                        >
                            {dict.profileSetup.success.continueButton}
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

