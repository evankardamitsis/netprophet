"use client";

import { useState } from "react";
import { Button } from "@netprophet/ui";
import { User, Shield } from "lucide-react";
import { useDictionary } from "@/context/DictionaryContext";

interface ProfileClaimFormNewProps {
    onComplete: (data: {
        firstName: string;
        lastName: string;
        termsAccepted: boolean;
    }) => void;
    onCancel: () => void;
    loading?: boolean;
    initialValues?: {
        firstName: string;
        lastName: string;
    };
}

export function ProfileClaimFormNew({ onComplete, onCancel, loading = false, initialValues }: ProfileClaimFormNewProps) {
    const [firstName, setFirstName] = useState(initialValues?.firstName || "");
    const [lastName, setLastName] = useState(initialValues?.lastName || "");
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { dict } = useDictionary();

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!firstName.trim()) {
            newErrors.firstName = dict.profileSetup.form.errors.firstNameRequired;
        }

        if (!lastName.trim()) {
            newErrors.lastName = dict.profileSetup.form.errors.lastNameRequired;
        }

        if (!termsAccepted) {
            newErrors.terms = dict.profileSetup.form.errors.termsRequired;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            onComplete({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                termsAccepted,
            });
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header with Icon */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-center mb-2">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30">
                            <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                    </div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white text-center">
                        {dict.profileSetup.form.title}
                    </h2>
                    <p className="text-purple-100 text-center mt-1 text-xs sm:text-sm">
                        {dict.profileSetup.form.description}
                    </p>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
                    {/* Info Banner */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-2.5 sm:p-3">
                        <div className="flex items-start gap-2">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-sm sm:text-base">ℹ️</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-purple-900 mb-0.5 text-xs sm:text-sm">
                                    {dict.profileSetup.form.aboutPlayerProfiles || "About Player Profiles"}
                                </h3>
                                <p className="text-[11px] sm:text-xs text-purple-800 leading-relaxed mb-1">
                                    {dict.profileSetup.form.aboutPlayerProfilesDescription || "We'll search our player database to match you with your existing profile. This allows you to participate in matches as yourself."}
                                </p>
                                <p className="text-[10px] sm:text-xs text-purple-700 font-medium">
                                    {dict.profileSetup.form.aboutPlayerProfilesOptional || "✨ You can skip this and continue as a NetProphet user anytime!"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* First Name */}
                    <div className="space-y-1.5">
                        <label htmlFor="firstName" className="block text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide">
                            {dict.profileSetup.form.firstName}
                        </label>
                        <input
                            id="firstName"
                            type="text"
                            value={firstName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setFirstName(e.target.value);
                                if (errors.firstName) {
                                    setErrors({ ...errors, firstName: '' });
                                }
                            }}
                            placeholder={dict.profileSetup.form.firstNamePlaceholder}
                            className={`
                                w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-sm sm:text-base
                                text-gray-900 placeholder-gray-400 bg-white
                                focus:outline-none focus:ring-2 sm:focus:ring-4
                                ${errors.firstName
                                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                    : "border-gray-200 focus:border-purple-500 focus:ring-purple-100"
                                }
                            `}
                        />
                        {errors.firstName && (
                            <p className="text-xs sm:text-sm text-red-600 font-medium flex items-center gap-1">
                                <span className="text-red-500">⚠</span> {errors.firstName}
                            </p>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-1.5">
                        <label htmlFor="lastName" className="block text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide">
                            {dict.profileSetup.form.lastName}
                        </label>
                        <input
                            id="lastName"
                            type="text"
                            value={lastName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setLastName(e.target.value);
                                if (errors.lastName) {
                                    setErrors({ ...errors, lastName: '' });
                                }
                            }}
                            placeholder={dict.profileSetup.form.lastNamePlaceholder}
                            className={`
                                w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-sm sm:text-base
                                text-gray-900 placeholder-gray-400 bg-white
                                focus:outline-none focus:ring-2 sm:focus:ring-4
                                ${errors.lastName
                                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                    : "border-gray-200 focus:border-purple-500 focus:ring-purple-100"
                                }
                            `}
                        />
                        {errors.lastName && (
                            <p className="text-xs sm:text-sm text-red-600 font-medium flex items-center gap-1">
                                <span className="text-red-500">⚠</span> {errors.lastName}
                            </p>
                        )}
                    </div>

                    {/* Terms Info Box */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-2.5 sm:p-3">
                        <div className="flex items-start gap-2">
                            <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] sm:text-xs text-blue-800 leading-relaxed">
                                {dict.profileSetup.form.termsDescription}
                            </p>
                        </div>
                    </div>

                    {/* Terms Checkbox */}
                    <div className="space-y-1.5">
                        <label className="flex items-start gap-2.5 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input
                                    id="terms"
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setTermsAccepted(e.target.checked);
                                        if (errors.terms) {
                                            setErrors({ ...errors, terms: '' });
                                        }
                                    }}
                                    className={`
                                        w-4 h-4 sm:w-5 sm:h-5 rounded border-2 transition-all duration-200
                                        ${errors.terms
                                            ? "border-red-300 text-red-600"
                                            : "border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-100"
                                        }
                                    `}
                                />
                            </div>
                            <span className="text-xs sm:text-sm text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                                {dict.profileSetup.form.termsLabel}
                            </span>
                        </label>
                        {errors.terms && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1 ml-7">
                                <span className="text-red-500">⚠</span> {errors.terms}
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all text-sm sm:text-base"
                            disabled={loading}
                        >
                            {(dict as any)?.profileSetup?.skipForNow || "Skip for Now"}
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all transform hover:scale-[1.02] text-sm sm:text-base"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {(dict as any)?.profileSetup?.processing || "Processing..."}
                                </span>
                            ) : (
                                (dict as any)?.profileSetup?.continue || "Continue"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

