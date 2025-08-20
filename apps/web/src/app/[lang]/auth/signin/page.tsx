'use client';

import { useState } from 'react';
import { supabase } from '@netprophet/lib';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import Logo from '@/components/Logo';

export default function AuthPage() {
    const [mode, setMode] = useState<'signin' | 'register'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang as 'en' | 'el' || 'el';

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            if (!supabase) {
                setMessage('Authentication service is not available.');
                return;
            }

            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) setMessage(error.message);
                else router.push(`/${lang}/matches`);
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) setMessage(error.message);
                else setMessage('Check your email to confirm your account!');
            }
        } catch (err: any) {
            setMessage('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setLoading(true);
        setMessage('');
        try {
            if (!supabase) {
                setMessage('Authentication service is not available.');
                return;
            }

            // Store the current language in localStorage for callback handling
            localStorage.setItem('oauth_lang', lang as string);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/${lang}/auth/callback`
                }
            });
            if (error) setMessage(error.message);
        } catch (err: any) {
            setMessage('An unexpected error occurred.');

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-indigo-200">
            {/* Header */}
            <Header lang={lang} showStartButton={false} />

            {/* Main Content */}
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    {/* Logo and Title */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center mb-4">
                            <Logo size="lg" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            {lang === 'el' ? 'Καλώς ήρθες' : 'Welcome back'}
                        </h1>
                        <p className="text-slate-600">
                            {lang === 'el'
                                ? 'Συνδέσου για να ξεκινήσεις τις προβλέψεις σου'
                                : 'Sign in to start making predictions'
                            }
                        </p>
                    </div>

                    {/* Auth Card */}
                    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-center text-lg">
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${mode === 'signin'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        onClick={() => setMode('signin')}
                                    >
                                        {lang === 'el' ? 'Σύνδεση' : 'Sign In'}
                                    </button>
                                    <button
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${mode === 'register'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        onClick={() => setMode('register')}
                                    >
                                        {lang === 'el' ? 'Εγγραφή' : 'Register'}
                                    </button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form className="space-y-4" onSubmit={handleAuth}>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                        {lang === 'el' ? 'Email' : 'Email'}
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                                        placeholder={lang === 'el' ? 'εισάγετε το email σας' : 'Enter your email'}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                                        {lang === 'el' ? 'Κωδικός' : 'Password'}
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                                        required
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                                        placeholder={lang === 'el' ? 'εισάγετε τον κωδικό σας' : 'Enter your password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 font-medium"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                            {mode === 'signin'
                                                ? (lang === 'el' ? 'Σύνδεση...' : 'Signing in...')
                                                : (lang === 'el' ? 'Εγγραφή...' : 'Registering...')
                                            }
                                        </div>
                                    ) : (
                                        mode === 'signin'
                                            ? (lang === 'el' ? 'Σύνδεση' : 'Sign In')
                                            : (lang === 'el' ? 'Εγγραφή' : 'Register')
                                    )}
                                </Button>
                            </form>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-slate-500">
                                        {lang === 'el' ? 'ή' : 'or'}
                                    </span>
                                </div>
                            </div>

                            {/* Google Sign In */}
                            <Button
                                type="button"
                                onClick={handleGoogle}
                                disabled={loading}
                                className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-3 font-medium flex items-center justify-center"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600 mr-2"></div>
                                        {lang === 'el' ? 'Ανακατεύθυνση...' : 'Redirecting...'}
                                    </div>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        {lang === 'el' ? 'Σύνδεση με Google' : 'Sign in with Google'}
                                    </>
                                )}
                            </Button>

                            {/* Message */}
                            {message && (
                                <div className={`text-sm text-center p-3 rounded-lg ${message.toLowerCase().includes('error')
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-green-50 text-green-700 border border-green-200'
                                    }`}>
                                    {message}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Footer */}
                    <div className="text-center mt-8">
                        <p className="text-sm text-slate-500">
                            {lang === 'el'
                                ? 'Συνεχίζοντας, συμφωνείτε με τους Όρους Χρήσης και την Πολιτική Απορρήτου'
                                : 'By continuing, you agree to our Terms of Service and Privacy Policy'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
} 