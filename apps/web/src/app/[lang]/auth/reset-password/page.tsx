'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@netprophet/lib';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import Logo from '@/components/Logo';
import { useDictionary } from '@/context/DictionaryContext';
import { PasswordInput } from '@/components/PasswordInput';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

// Component that uses useSearchParams - wrapped in Suspense
function ResetPasswordContent() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isValidSession, setIsValidSession] = useState(false);
    const [sessionLoading, setSessionLoading] = useState(true);

    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const lang = params?.lang as 'en' | 'el' || 'el';
    const { dict } = useDictionary();

    // Check if we have a valid session for password reset
    useEffect(() => {
        const checkSession = async () => {
            try {
                if (!supabase) {
                    setError('Authentication service is not available.');
                    setSessionLoading(false);
                    return;
                }

                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    setError('Invalid or expired reset link. Please request a new password reset.');
                    setSessionLoading(false);
                    return;
                }

                if (!session) {
                    setError('No active session found. Please request a new password reset.');
                    setSessionLoading(false);
                    return;
                }

                // Check if this is a password recovery session
                // For password reset, we check if the session exists and is valid
                if (session.user) {
                    setIsValidSession(true);
                } else {
                    setError('Invalid reset session. Please request a new password reset.');
                }
            } catch (err) {
                setError('An error occurred while verifying your session.');
            } finally {
                setSessionLoading(false);
            }
        };

        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        // Validation
        if (password.length < 8) {
            setError(dict?.auth?.passwordTooWeak || 'Password must be at least 8 characters long.');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError((dict as any)?.auth?.passwordsDoNotMatch || 'Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            if (!supabase) {
                setError('Authentication service is not available.');
                return;
            }

            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage((dict as any)?.auth?.passwordResetSuccess || 'Password updated successfully! Redirecting to sign in...');

                // Redirect to sign in after successful password reset
                setTimeout(() => {
                    router.push(`/${lang}/auth/signin?message=password-reset-success`);
                }, 2000);
            }
        } catch (err: any) {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    if (sessionLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121A39' }}>
                <Card className="w-full max-w-md mx-auto">
                    <CardContent className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
                        <p className="text-white">Verifying your reset link...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!isValidSession) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121A39' }}>
                <Card className="w-full max-w-md mx-auto">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4">
                            <Logo />
                        </div>
                        <CardTitle className="text-white text-2xl">
                            {(dict as any)?.auth?.invalidResetLink || 'Invalid Reset Link'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-gray-300 mb-6">
                            {error}
                        </p>
                        <Button
                            onClick={() => router.push(`/${lang}/auth/signin`)}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            {(dict as any)?.auth?.backToSignIn || 'Back to Sign In'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121A39' }}>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <Logo />
                    </div>
                    <CardTitle className="text-white text-2xl">
                        {(dict as any)?.auth?.resetPassword || 'Reset Password'}
                    </CardTitle>
                    <p className="text-gray-300">
                        {(dict as any)?.auth?.enterNewPassword || 'Enter your new password below'}
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                {(dict as any)?.auth?.newPassword || 'New Password'}
                            </label>
                            <PasswordInput
                                id="password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={(dict as any)?.auth?.enterNewPassword || 'Enter new password'}
                                autoComplete="new-password"
                                required
                                showRequirements={true}
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                                {(dict as any)?.auth?.confirmPassword || 'Confirm Password'}
                            </label>
                            <PasswordInput
                                id="confirmPassword"
                                name="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={(dict as any)?.auth?.confirmNewPassword || 'Confirm new password'}
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {message && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                <p className="text-green-400 text-sm">{message}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    {(dict as any)?.auth?.updatingPassword || 'Updating Password...'}
                                </div>
                            ) : (
                                (dict as any)?.auth?.updatePassword || 'Update Password'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => router.push(`/${lang}/auth/signin`)}
                            className="text-gray-400 hover:text-white text-sm"
                        >
                            {(dict as any)?.auth?.backToSignIn || 'Back to Sign In'}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Main export with Suspense boundary
export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121A39' }}>
                <Card className="w-full max-w-md mx-auto">
                    <CardContent className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
                        <p className="text-white">Loading...</p>
                    </CardContent>
                </Card>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
