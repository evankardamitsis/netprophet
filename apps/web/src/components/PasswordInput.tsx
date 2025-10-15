'use client';

import { useState } from 'react';

interface PasswordInputProps {
    id: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    autoComplete?: string;
    required?: boolean;
    className?: string;
    showRequirements?: boolean;
    lang?: 'en' | 'el';
}

// Eye icon components
function EyeIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );
}

function EyeOffIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
        </svg>
    );
}

function InfoIcon({ className = "h-4 w-4" }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
    );
}

export function PasswordInput({
    id,
    name,
    value,
    onChange,
    placeholder,
    autoComplete = "current-password",
    required = true,
    className = "",
    showRequirements = false,
    lang = 'en'
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                    {lang === 'el' ? 'Κωδικός' : 'Password'}
                </label>
                {showRequirements && (
                    <div className="group relative">
                        <InfoIcon className="w-4 h-4 text-slate-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            <div className="text-center">
                                <div className="font-medium mb-1">{lang === 'el' ? 'Απαιτήσεις κωδικού:' : 'Password requirements:'}</div>
                                <div className="space-y-1">
                                    <div>• {lang === 'el' ? 'Τουλάχιστον 8 χαρακτήρες' : 'At least 8 characters'}</div>
                                    <div>• {lang === 'el' ? 'Κεφαλαία γράμματα (A-Z)' : 'Uppercase letters (A-Z)'}</div>
                                    <div>• {lang === 'el' ? 'Πεζά γράμματα (a-z)' : 'Lowercase letters (a-z)'}</div>
                                    <div>• {lang === 'el' ? 'Αριθμοί (0-9)' : 'Numbers (0-9)'}</div>
                                </div>
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                    </div>
                )}
            </div>
            <div className="relative">
                <input
                    id={id}
                    name={name}
                    type={showPassword ? "text" : "password"}
                    autoComplete={autoComplete}
                    required={required}
                    className={`w-full px-4 py-3 pr-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-black ${className}`}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                />
                <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded"
                    aria-label={showPassword ? (lang === 'el' ? 'Απόκρυψη κωδικού' : 'Hide password') : (lang === 'el' ? 'Εμφάνιση κωδικού' : 'Show password')}
                >
                    {showPassword ? (
                        <EyeOffIcon className="h-5 w-5" />
                    ) : (
                        <EyeIcon className="h-5 w-5" />
                    )}
                </button>
            </div>
        </div>
    );
}
