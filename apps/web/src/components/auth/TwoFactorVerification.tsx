'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@netprophet/ui';
import { TwoFactorAuthService } from '@netprophet/lib';
import { useEmail } from '@/hooks/useEmail';
import { useDictionary } from '@/context/DictionaryContext';

interface TwoFactorVerificationProps {
    userId: string;
    userEmail: string;
    onVerificationSuccess: () => void;
    onCancel: () => void;
}

export function TwoFactorVerification({
    userId,
    userEmail,
    onVerificationSuccess,
    onCancel
}: TwoFactorVerificationProps) {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const { send2FAEmail } = useEmail();
    const { dict, lang } = useDictionary();

    // Timer for resend functionality
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft]);

    const handleInputChange = (index: number, value: string) => {
        if (value.length > 1) return; // Prevent multiple characters

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Move to next input if value is entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        setError('');
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
        if (pastedData.length === 6) {
            const newCode = pastedData.split('');
            setCode(newCode);
            inputRefs.current[5]?.focus();
        }
    };

    const handleVerify = async () => {
        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await TwoFactorAuthService.verifyCode(userId, fullCode);

            if (result.success) {
                setMessage('Verification successful!');
                setTimeout(() => {
                    onVerificationSuccess();
                }, 1000);
            } else {
                setError(result.error || 'Invalid verification code');
                setCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (error) {
            console.error('Verification error:', error);
            setError('An error occurred during verification');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setResendLoading(true);
        setError('');
        setMessage('');

        try {
            // Generate new code
            const codeResult = await TwoFactorAuthService.createCode(userId);

            if (codeResult.success && codeResult.code) {
                // Send email with new code
                await send2FAEmail(userEmail, codeResult.code, lang as 'en' | 'el');

                setMessage('New verification code sent to your email');
                setTimeLeft(60); // 60 second cooldown
                setCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            } else {
                setError(codeResult.error || 'Failed to generate new code');
            }
        } catch (error) {
            console.error('Resend error:', error);
            setError('Failed to resend verification code');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🔐</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Two-Factor Authentication
                        </h1>
                        <p className="text-slate-300 text-sm">
                            Enter the 6-digit code sent to your email
                        </p>
                        <p className="text-yellow-400 text-sm font-medium mt-2">
                            {userEmail}
                        </p>
                    </div>

                    {/* Code Input */}
                    <div className="mb-6">
                        <div className="flex justify-center space-x-3 mb-4">
                            {code.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleInputChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    className="w-12 h-12 text-center text-xl font-bold bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:outline-none transition-all"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
                            <p className="text-green-400 text-sm text-center">{message}</p>
                        </div>
                    )}

                    {/* Verify Button */}
                    <Button
                        onClick={handleVerify}
                        disabled={loading || code.join('').length !== 6}
                        className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                                Verifying...
                            </div>
                        ) : (
                            'Verify Code'
                        )}
                    </Button>

                    {/* Resend Code */}
                    <div className="text-center mt-6">
                        {timeLeft > 0 ? (
                            <p className="text-slate-400 text-sm">
                                Resend code in {timeLeft}s
                            </p>
                        ) : (
                            <button
                                onClick={handleResendCode}
                                disabled={resendLoading}
                                className="text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {resendLoading ? 'Sending...' : 'Resend Code'}
                            </button>
                        )}
                    </div>

                    {/* Cancel Button */}
                    <div className="text-center mt-4">
                        <button
                            onClick={onCancel}
                            className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
