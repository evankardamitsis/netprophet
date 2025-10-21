"use client";

import { useState } from "react";
import { AlertCircle, Edit2, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@netprophet/ui";
import { useDictionary } from "@/context/DictionaryContext";

interface ProfileCreationReviewProps {
    initialFirstName: string;
    initialLastName: string;
    onConfirm: (firstName: string, lastName: string) => void;
    onBack: () => void;
    loading: boolean;
}

export function ProfileCreationReview({
    initialFirstName,
    initialLastName,
    onConfirm,
    onBack,
    loading
}: ProfileCreationReviewProps) {
    const { dict } = useDictionary();
    const [firstName, setFirstName] = useState(initialFirstName);
    const [lastName, setLastName] = useState(initialLastName);
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({});

    const handleConfirm = () => {
        // Validate
        const newErrors: { firstName?: string; lastName?: string } = {};
        if (!firstName.trim()) {
            newErrors.firstName = dict.profileSetup?.form?.errors?.firstNameRequired || "First name is required";
        }
        if (!lastName.trim()) {
            newErrors.lastName = dict.profileSetup?.form?.errors?.lastNameRequired || "Last name is required";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onConfirm(firstName.trim(), lastName.trim());
    };

    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[500px] max-h-[85vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 flex-shrink-0">
                    <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-white text-center mb-1">
                        {dict.profileSetup?.review?.title || "Review Profile Information"}
                    </h2>
                    <p className="text-orange-100 text-center text-xs sm:text-sm lg:text-base">
                        {dict.profileSetup?.review?.description || "Confirm your details before submitting"}
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8 space-y-3 sm:space-y-4 lg:space-y-6">

                    {/* Name Review/Edit Section */}
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg">
                                {dict.profileSetup?.review?.yourInformation || "Your Information"}
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(!isEditing)}
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 text-[9px] sm:text-xs lg:text-sm"
                            >
                                <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 mr-1" />
                                {isEditing ? (dict.profileSetup?.review?.doneEditing || "Done") : (dict.profileSetup?.review?.edit || "Edit")}
                            </Button>
                        </div>

                        {isEditing ? (
                            <div className="space-y-2.5 sm:space-y-3 lg:space-y-4">
                                <div>
                                    <label className="block text-[10px] sm:text-xs lg:text-sm font-bold text-gray-700 mb-1 sm:mb-2">
                                        {dict.profileSetup?.form?.firstName || "First Name"}
                                    </label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => {
                                            setFirstName(e.target.value);
                                            setErrors({ ...errors, firstName: undefined });
                                        }}
                                        className={`w-full px-2.5 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 rounded-lg border-2 text-xs sm:text-sm lg:text-base text-gray-900 ${errors.firstName
                                            ? 'border-red-300 focus:border-red-500'
                                            : 'border-gray-300 focus:border-purple-500'
                                            } focus:outline-none transition-colors`}
                                        placeholder={dict.profileSetup?.form?.firstName || "First Name"}
                                    />
                                    {errors.firstName && (
                                        <p className="text-red-600 text-[9px] sm:text-xs lg:text-sm mt-1">{errors.firstName}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] sm:text-xs lg:text-sm font-bold text-gray-700 mb-1 sm:mb-2">
                                        {dict.profileSetup?.form?.lastName || "Last Name"}
                                    </label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => {
                                            setLastName(e.target.value);
                                            setErrors({ ...errors, lastName: undefined });
                                        }}
                                        className={`w-full px-2.5 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 rounded-lg border-2 text-xs sm:text-sm lg:text-base text-gray-900 ${errors.lastName
                                            ? 'border-red-300 focus:border-red-500'
                                            : 'border-gray-300 focus:border-purple-500'
                                            } focus:outline-none transition-colors`}
                                        placeholder={dict.profileSetup?.form?.lastName || "Last Name"}
                                    />
                                    {errors.lastName && (
                                        <p className="text-red-600 text-[9px] sm:text-xs lg:text-sm mt-1">{errors.lastName}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 sm:space-y-2.5 lg:space-y-3">
                                <div className="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-gray-200">
                                    <p className="text-[9px] sm:text-xs lg:text-sm text-gray-500 mb-1">
                                        {dict.profileSetup?.form?.firstName || "First Name"}
                                    </p>
                                    <p className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">{firstName}</p>
                                </div>
                                <div className="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-gray-200">
                                    <p className="text-[9px] sm:text-xs lg:text-sm text-gray-500 mb-1">
                                        {dict.profileSetup?.form?.lastName || "Last Name"}
                                    </p>
                                    <p className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">{lastName}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* What Happens Next */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3 lg:p-4">
                        <h3 className="font-bold text-blue-900 mb-2 text-xs sm:text-sm lg:text-base">
                            {dict.profileSetup?.review?.whatHappensNext || "What Happens Next?"}
                        </h3>
                        <ul className="space-y-1 sm:space-y-1.5 lg:space-y-2 text-[9px] sm:text-xs lg:text-sm text-blue-800">
                            <li className="flex items-start gap-1.5 sm:gap-2">
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" />
                                <span>{dict.profileSetup?.review?.step1 || "Your profile creation request will be sent to our admin team"}</span>
                            </li>
                            <li className="flex items-start gap-1.5 sm:gap-2">
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" />
                                <span>{dict.profileSetup?.review?.step2 || "Admins will verify and add your tennis information"}</span>
                            </li>
                            <li className="flex items-start gap-1.5 sm:gap-2">
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" />
                                <span>{dict.profileSetup?.review?.step3 || "You'll receive an email notification when your profile is ready"}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 sm:space-y-2.5 lg:space-y-3 pt-2 sm:pt-3 lg:pt-4">
                        <Button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="w-full py-2.5 sm:py-3 lg:py-4 rounded-lg sm:rounded-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all transform hover:scale-[1.02] text-[10px] sm:text-xs lg:text-sm"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span className="hidden sm:inline">{dict.profileSetup?.review?.submitting || "Submitting..."}</span>
                                </span>
                            ) : (
                                <>
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2 inline" />
                                    {dict.profileSetup?.review?.confirmButton || "Confirm & Submit Request"}
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={onBack}
                            disabled={loading}
                            className="w-full py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl font-bold border-2 border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all text-[9px] sm:text-xs lg:text-sm"
                        >
                            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                            {dict.profileSetup?.result?.backButton || "Back"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

