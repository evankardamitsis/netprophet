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
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[500px] max-h-[85vh]">
                {/* Header with Animation */}
                <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 xl:py-12 relative overflow-hidden flex-shrink-0">
                    {/* Animated background circles */}
                    <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>

                    <div className="relative z-10 w-full">
                        <div className="flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                            <div className="relative">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
                                    <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 text-green-500" />
                                </div>
                                <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 lg:-top-2 lg:-right-2">
                                    <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-yellow-300 animate-pulse" />
                                </div>
                            </div>
                        </div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-black text-white text-center mb-1 sm:mb-2">
                            {isClaimed
                                ? (dict.profileSetup.success.claimedTitle || dict.profileSetup.success.title)
                                : (dict.profileSetup.success.requestedTitle || dict.profileSetup.success.title)
                            }
                        </h2>
                        <p className="text-purple-100 text-center text-xs sm:text-sm lg:text-base xl:text-lg">
                            {isClaimed
                                ? (dict.profileSetup.success.claimedDescription || dict.profileSetup.success.description)
                                : (dict.profileSetup.success.requestedDescription || dict.profileSetup.success.description)
                            }
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8 space-y-3 sm:space-y-4 lg:space-y-6">
                    {/* Success Message Card */}
                    <div className={`
                        rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border-2
                        ${isClaimed
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                        }
                    `}>
                        <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4">
                            <div className={`
                                w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center flex-shrink-0
                                ${isClaimed ? 'bg-green-500' : 'bg-blue-500'}
                            `}>
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`
                                    text-[10px] sm:text-xs lg:text-sm leading-relaxed
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
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                        <h3 className="font-bold text-purple-900 text-sm sm:text-base lg:text-lg mb-2.5 sm:mb-3 lg:mb-4 flex items-center gap-1.5 sm:gap-2">
                            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                            {dict.profileSetup?.success?.whatsNext || "What's Next?"}
                        </h3>
                        <ul className="space-y-1.5 sm:space-y-2 lg:space-y-3">
                            <li className="flex items-start gap-1.5 sm:gap-2 lg:gap-3 text-[9px] sm:text-xs lg:text-sm text-purple-800">
                                <span className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-900 text-[8px] sm:text-xs lg:text-sm">1</span>
                                <span className="leading-relaxed">
                                    {isClaimed
                                        ? (dict.profileSetup?.success?.step1Claimed || "Explore your player statistics and match history")
                                        : (dict.profileSetup?.success?.step1Requested || "Wait for admin approval (you'll receive an email notification)")
                                    }
                                </span>
                            </li>
                            <li className="flex items-start gap-1.5 sm:gap-2 lg:gap-3 text-[9px] sm:text-xs lg:text-sm text-purple-800">
                                <span className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-900 text-[8px] sm:text-xs lg:text-sm">2</span>
                                <span className="leading-relaxed">{dict.profileSetup?.success?.step2 || "Make predictions on upcoming matches"}</span>
                            </li>
                            <li className="flex items-start gap-1.5 sm:gap-2 lg:gap-3 text-[9px] sm:text-xs lg:text-sm text-purple-800">
                                <span className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-900 text-[8px] sm:text-xs lg:text-sm">3</span>
                                <span className="leading-relaxed">{dict.profileSetup?.success?.step3 || "Earn coins and climb the leaderboard!"}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 sm:space-y-2.5 lg:space-y-3 pt-2 sm:pt-3 lg:pt-4">
                        {isClaimed && claimedPlayerId && (
                            <Link
                                href={`/${lang}/players/${claimedPlayerId}`}
                                className="block"
                                onClick={onComplete}
                            >
                                <Button className="w-full py-2.5 sm:py-3 lg:py-4 rounded-lg sm:rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all transform hover:scale-[1.02] text-[10px] sm:text-xs lg:text-sm">
                                    <User className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2" />
                                    {dict.profileSetup.success.viewPlayerProfile || "View My Player Profile"}
                                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ml-1.5 sm:ml-2" />
                                </Button>
                            </Link>
                        )}
                        <Button
                            onClick={onComplete}
                            variant={isClaimed && claimedPlayerId ? "outline" : "default"}
                            className={`
                                w-full py-2.5 sm:py-3 lg:py-4 rounded-lg sm:rounded-xl font-bold transition-all transform hover:scale-[1.02] text-[10px] sm:text-xs lg:text-sm
                                ${isClaimed && claimedPlayerId
                                    ? 'border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40'
                                }
                            `}
                        >
                            {dict.profileSetup.success.continueButton}
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ml-1.5 sm:ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

