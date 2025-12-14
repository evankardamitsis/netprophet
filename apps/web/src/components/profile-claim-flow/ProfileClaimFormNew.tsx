"use client";

import { useState, useEffect } from "react";
import { Button } from "@netprophet/ui";
import { User, Shield, Info, CheckCircle, X } from "lucide-react";
import { useDictionary } from "@/context/DictionaryContext";
import {
    isValidGreekName,
    containsGreekCharacters,
    isGreeklish,
    suggestGreekNames,
    formatNameForDisplay
} from "@/lib/greeklishUtils";
import { calculateAgeFromDOB, formatDateToDDMMYYYY, formatDateToISO } from "@/lib/dateUtils";

interface ProfileClaimFormNewProps {
    onComplete: (data: {
        firstName: string;
        lastName: string;
        dateOfBirth: string; // YYYY-MM-DD format
        playingHand: 'left' | 'right';
        termsAccepted: boolean;
    }) => void;
    onCancel: () => void;
    onClose?: () => void;
    loading?: boolean;
    initialValues?: {
        firstName: string;
        lastName: string;
        dateOfBirth?: string;
        playingHand?: 'left' | 'right';
    };
}

export function ProfileClaimFormNew({ onComplete, onCancel, onClose, loading = false, initialValues }: ProfileClaimFormNewProps) {
    const [firstName, setFirstName] = useState(initialValues?.firstName || "");
    const [lastName, setLastName] = useState(initialValues?.lastName || "");
    // Keep date in DD/MM/YYYY format for display
    const [dateOfBirth, setDateOfBirth] = useState(initialValues?.dateOfBirth || "");
    const [playingHand, setPlayingHand] = useState<'left' | 'right'>(initialValues?.playingHand || 'right');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [suggestions, setSuggestions] = useState<{
        firstName: string[];
        lastName: string[];
    }>({ firstName: [], lastName: [] });
    const [showSuggestions, setShowSuggestions] = useState<{
        firstName: boolean;
        lastName: boolean;
    }>({ firstName: false, lastName: false });
    const { dict } = useDictionary();

    // Generate suggestions for Greeklish names
    useEffect(() => {
        if (firstName.trim() && isGreeklish(firstName)) {
            const firstNameSuggestions = suggestGreekNames(firstName);
            setSuggestions(prev => ({ ...prev, firstName: firstNameSuggestions }));
            setShowSuggestions(prev => ({ ...prev, firstName: firstNameSuggestions.length > 0 }));
        } else {
            setSuggestions(prev => ({ ...prev, firstName: [] }));
            setShowSuggestions(prev => ({ ...prev, firstName: false }));
        }
    }, [firstName]);

    useEffect(() => {
        if (lastName.trim() && isGreeklish(lastName)) {
            const lastNameSuggestions = suggestGreekNames(lastName);
            setSuggestions(prev => ({ ...prev, lastName: lastNameSuggestions }));
            setShowSuggestions(prev => ({ ...prev, lastName: lastNameSuggestions.length > 0 }));
        } else {
            setSuggestions(prev => ({ ...prev, lastName: [] }));
            setShowSuggestions(prev => ({ ...prev, lastName: false }));
        }
    }, [lastName]);

    const handleSuggestionClick = (field: 'firstName' | 'lastName', suggestion: string) => {
        if (field === 'firstName') {
            setFirstName(suggestion);
        } else {
            setLastName(suggestion);
        }
        setShowSuggestions(prev => ({ ...prev, [field]: false }));
    };

    const calculateAge = (dob: string): number => {
        return calculateAgeFromDOB(dob);
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!firstName.trim()) {
            newErrors.firstName = dict.profileSetup.form.errors.firstNameRequired;
        } else if (!isValidGreekName(firstName)) {
            newErrors.firstName = "Please enter a valid name (Greek or Greeklish)";
        }

        if (!lastName.trim()) {
            newErrors.lastName = dict.profileSetup.form.errors.lastNameRequired;
        } else if (!isValidGreekName(lastName)) {
            newErrors.lastName = "Please enter a valid surname (Greek or Greeklish)";
        }

        if (!dateOfBirth) {
            newErrors.dateOfBirth = dict.profileSetup.form.errors.dateOfBirthRequired || "Date of birth is required";
        } else {
            // Validate DD/MM/YYYY format
            if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth)) {
                newErrors.dateOfBirth = dict.profileSetup.form.errors.dateOfBirthInvalid || "Please enter date in DD/MM/YYYY format";
            } else {
                const age = calculateAge(dateOfBirth);
                if (age < 16) {
                    newErrors.dateOfBirth = dict.profileSetup.form.errors.ageTooYoung || "You must be at least 16 years old";
                } else if (age > 80) {
                    newErrors.dateOfBirth = dict.profileSetup.form.errors.dateOfBirthInvalid || "Please enter a valid date of birth";
                }
            }
        }

        if (!playingHand) {
            newErrors.playingHand = dict.profileSetup.form.errors.dominantHandRequired || "Dominant hand is required";
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
            // Date is already in DD/MM/YYYY format from the text input
            onComplete({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                dateOfBirth: dateOfBirth.trim(), // Already in DD/MM/YYYY format
                playingHand,
                termsAccepted,
            });
        }
    };

    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header with Icon - More Compact */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 relative">
                    {/* Close Button */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:text-gray-200 transition-colors p-1"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    )}

                    <div className="flex items-center justify-center mb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 sm:ring-3 ring-white/30">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white text-center">
                        {dict.profileSetup.form.title}
                    </h2>
                    <p className="text-purple-100 text-center mt-1 text-xs sm:text-sm">
                        {dict.profileSetup.form.description}
                    </p>
                </div>

                {/* Form Content - Reduced Padding and Spacing */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-3.5">

                    {/* First Name */}
                    <div className="space-y-1.5">
                        <label htmlFor="firstName" className="block text-xs sm:text-sm font-semibold text-gray-700">
                            {dict.profileSetup.form.firstName}
                        </label>
                        <div className="relative">
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
                                    w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border-2 transition-all duration-200 text-sm sm:text-base
                                    text-gray-900 placeholder-gray-400 bg-white
                                    focus:outline-none focus:ring-2
                                    ${errors.firstName
                                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                        : "border-gray-200 focus:border-purple-500 focus:ring-purple-100"
                                    }
                                `}
                            />
                            {showSuggestions.firstName && suggestions.firstName.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                                    {suggestions.firstName.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleSuggestionClick('firstName', suggestion)}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            <span className="text-gray-700">{suggestion}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {errors.firstName && (
                            <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                                <span className="text-red-500">⚠</span> {errors.firstName}
                            </p>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-1.5">
                        <label htmlFor="lastName" className="block text-xs sm:text-sm font-semibold text-gray-700">
                            {dict.profileSetup.form.lastName}
                        </label>
                        <div className="relative">
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
                                    w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border-2 transition-all duration-200 text-sm sm:text-base
                                    text-gray-900 placeholder-gray-400 bg-white
                                    focus:outline-none focus:ring-2
                                    ${errors.lastName
                                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                        : "border-gray-200 focus:border-purple-500 focus:ring-purple-100"
                                    }
                                `}
                            />
                            {showSuggestions.lastName && suggestions.lastName.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                                    {suggestions.lastName.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleSuggestionClick('lastName', suggestion)}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            <span className="text-gray-700">{suggestion}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {errors.lastName && (
                            <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                                <span className="text-red-500">⚠</span> {errors.lastName}
                            </p>
                        )}
                    </div>

                    {/* Date of Birth */}
                    <div className="space-y-1.5">
                        <label htmlFor="dateOfBirth" className="block text-xs sm:text-sm font-semibold text-gray-700">
                            {dict.profileSetup.form.dateOfBirth || "Date of Birth"}
                        </label>
                        <input
                            id="dateOfBirth"
                            type="text"
                            value={dateOfBirth}
                            placeholder="DD/MM/YYYY"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                let value = e.target.value;
                                // Remove any non-digit characters except slashes
                                value = value.replace(/[^\d/]/g, '');

                                // Auto-format as user types: DD/MM/YYYY
                                if (value.length > 2 && value[2] !== '/') {
                                    value = value.slice(0, 2) + '/' + value.slice(2);
                                }
                                if (value.length > 5 && value[5] !== '/') {
                                    value = value.slice(0, 5) + '/' + value.slice(5);
                                }
                                // Limit to DD/MM/YYYY format (10 characters)
                                if (value.length > 10) {
                                    value = value.slice(0, 10);
                                }

                                setDateOfBirth(value);
                                if (errors.dateOfBirth) {
                                    setErrors({ ...errors, dateOfBirth: '' });
                                }
                            }}
                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                // Validate format on blur
                                const value = e.target.value;
                                if (value && !/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                                    setErrors({ ...errors, dateOfBirth: dict.profileSetup.form.errors.dateOfBirthInvalid || "Please enter date in DD/MM/YYYY format" });
                                }
                            }}
                            className={`
                                w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border-2 transition-all duration-200 text-sm sm:text-base
                                text-gray-900 bg-white
                                focus:outline-none focus:ring-2
                                ${errors.dateOfBirth
                                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                    : "border-gray-200 focus:border-purple-500 focus:ring-purple-100"
                                }
                            `}
                        />
                        {errors.dateOfBirth && (
                            <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                                <span className="text-red-500">⚠</span> {errors.dateOfBirth}
                            </p>
                        )}
                        {dateOfBirth && !errors.dateOfBirth && (
                            <p className="text-xs text-gray-500">
                                {dict.profileSetup.form.age || "Age"}: {calculateAge(dateOfBirth)} {dict.profileSetup.form.yearsOld || "years old"}
                            </p>
                        )}
                    </div>

                    {/* Dominant Hand */}
                    <div className="space-y-1.5">
                        <label htmlFor="playingHand" className="block text-xs sm:text-sm font-semibold text-gray-700">
                            {dict.profileSetup.form.dominantHand || "Dominant Hand"}
                        </label>
                        <select
                            id="playingHand"
                            value={playingHand}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                setPlayingHand(e.target.value as 'left' | 'right');
                                if (errors.playingHand) {
                                    setErrors({ ...errors, playingHand: '' });
                                }
                            }}
                            className={`
                                w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border-2 transition-all duration-200 text-sm sm:text-base
                                text-gray-900 bg-white
                                focus:outline-none focus:ring-2
                                ${errors.playingHand
                                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                    : "border-gray-200 focus:border-purple-500 focus:ring-purple-100"
                                }
                            `}
                        >
                            <option value="right">{dict.profileSetup.form.handRight || "Right"}</option>
                            <option value="left">{dict.profileSetup.form.handLeft || "Left"}</option>
                        </select>
                        {errors.playingHand && (
                            <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                                <span className="text-red-500">⚠</span> {errors.playingHand}
                            </p>
                        )}
                    </div>

                    {/* Terms Checkbox */}
                    <div className="space-y-1.5">
                        <label className="flex items-start gap-3 cursor-pointer group">
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
                                        w-4 h-4 rounded border-2 transition-all duration-200
                                        ${errors.terms
                                            ? "border-red-300 text-red-600"
                                            : "border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-100"
                                        }
                                    `}
                                />
                            </div>
                            <span className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                                {dict.profileSetup.form.termsLabel}
                            </span>
                        </label>
                        {errors.terms && (
                            <p className="text-sm text-red-600 font-medium flex items-center gap-1 ml-7">
                                <span className="text-red-500">⚠</span> {errors.terms}
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            className="flex-1 py-2 sm:py-2.5 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all text-xs sm:text-sm"
                            disabled={loading}
                        >
                            {(dict as any)?.profileSetup?.skipForNow || "Skip for Now"}
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 py-2 sm:py-2.5 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all transform hover:scale-[1.02] text-xs sm:text-sm"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>{(dict as any)?.profileSetup?.processing || "Processing..."}</span>
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

