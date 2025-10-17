'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@netprophet/lib';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import Logo from '@/components/Logo';
import { useDictionary } from '@/context/DictionaryContext';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const router = useRouter();
    const params = useParams();
    const lang = params?.lang as 'en' | 'el' || 'el';
    const { dict } = useDictionary();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            if (!supabase) {
                setError('Authentication service is not available.');
                return;
            }

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/${lang}/auth/reset-password`,
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage(
                    lang === 'el'
                        ? 'Αποστάλθηκε email με οδηγίες επαναφοράς κωδικού. Ελέγξτε το inbox σας.'
                        : 'Password reset email sent. Please check your inbox.'
                );
            }
        } catch (err: any) {
            setError(
                lang === 'el'
                    ? 'Παρουσιάστηκε απροσδόκητο σφάλμα.'
                    : 'An unexpected error occurred.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121A39' }}>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <Logo />
                    </div>
                    <CardTitle className="text-white text-2xl">
                        {lang === 'el' ? 'Επαναφορά Κωδικού' : 'Reset Password'}
                    </CardTitle>
                    <p className="text-gray-300">
                        {lang === 'el'
                            ? 'Εισάγετε το email σας για να σας στείλουμε οδηγίες επαναφοράς κωδικού.'
                            : 'Enter your email address and we\'ll send you instructions to reset your password.'
                        }
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                {lang === 'el' ? 'Email' : 'Email Address'}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-black"
                                placeholder={lang === 'el' ? 'Εισάγετε το email σας' : 'Enter your email address'}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                    {lang === 'el' ? 'Αποστολή...' : 'Sending...'}
                                </div>
                            ) : (
                                lang === 'el' ? 'Στείλε Email Επαναφοράς' : 'Send Reset Email'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => router.push(`/${lang}/auth/signin`)}
                            className="text-gray-400 hover:text-white text-sm"
                        >
                            {lang === 'el' ? '← Πίσω στη Σύνδεση' : '← Back to Sign In'}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
