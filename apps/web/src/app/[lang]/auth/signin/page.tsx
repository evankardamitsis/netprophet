'use client';

import { useState, useEffect, Suspense } from 'react';

// Force dynamic rendering to avoid build-time context issues
export const dynamic = 'force-dynamic';
import { supabase } from '@netprophet/lib';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { useDictionary } from '@/context/DictionaryContext';
import { useAuth } from '@/hooks/useAuth';
import { PasswordInput } from '@/components/PasswordInput';

// Component that uses useSearchParams - wrapped in Suspense
function AuthFormWithSearchParams() {
    const [mode, setMode] = useState<'signin' | 'register'>('register');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const lang = params?.lang as 'en' | 'el' || 'el';
    const { dict } = useDictionary();
    const { signInWithPassword } = useAuth();

    // Check URL parameters to set initial mode
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'signin') {
            setMode('signin');
        }
    }, [searchParams]);

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
                const result = await signInWithPassword(email, password);
                if (result.error) {
                    setMessage(typeof result.error === 'string' ? result.error : result.error.message);
                } else if (result.success) {
                    router.push(`/${lang}/matches`);
                }

            } else {
                // For registration, we need to validate name fields
                if (!firstName.trim() || !lastName.trim()) {
                    setMessage(lang === 'el' ? 'Παρακαλώ συμπληρώστε το όνομα και το επώνυμο σας.' : 'Please fill in your first and last name.');
                    return;
                }

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            firstName: firstName.trim(),
                            lastName: lastName.trim()
                        }
                    }
                });
                if (error) {
                    // Check if it's a password strength error and show a more user-friendly message
                    if (error.message.includes('Password should be at least') ||
                        error.message.includes('password') && error.message.includes('weak')) {
                        setMessage(dict?.auth?.passwordTooWeak || 'Password is too weak. Please use a stronger password.');
                    } else {
                        setMessage(error.message);
                    }
                } else {
                    setMessage(dict?.auth?.checkEmailToConfirm || 'Check your email to confirm your account!');
                }
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
        <div className="min-h-screen" style={{ backgroundColor: '#121A39' }}>
            {/* Decorative circles */}
            <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute top-40 right-20 w-48 h-48 bg-pink-400 rounded-full opacity-15 blur-3xl"></div>
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>

            {/* Header */}
            <Header lang={lang} showStartButton={false} />

            {/* Main Content */}
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">
                            {mode === 'register'
                                ? (lang === 'el' ? 'Καλώς ήρθες' : 'Welcome')
                                : (lang === 'el' ? 'Καλώς ήρθες' : 'Welcome back')
                            }
                        </h1>
                        <p className="text-white/80">
                            {mode === 'register'
                                ? (lang === 'el'
                                    ? 'Εγγράψου για να ξεκινήσεις τις προβλέψεις σου'
                                    : 'Sign up to start making predictions')
                                : (lang === 'el'
                                    ? 'Συνδέσου για να ξεκινήσεις τις προβλέψεις σου'
                                    : 'Sign in to start making predictions')
                            }
                        </p>
                    </div>

                    {/* Auth Card */}
                    <Card className={`border-0 shadow-xl bg-white/80 backdrop-blur-sm ${mode === 'register' ? 'max-w-2xl' : 'max-w-md'}`}>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-center text-lg">
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${mode === 'register'
                                            ? 'bg-blue-600 text-white shadow-md font-semibold'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                        onClick={() => setMode('register')}
                                    >
                                        {lang === 'el' ? 'Εγγραφή' : 'Register'}
                                    </button>
                                    <button
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${mode === 'signin'
                                            ? 'bg-blue-600 text-white shadow-md font-semibold'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                        onClick={() => setMode('signin')}
                                    >
                                        {lang === 'el' ? 'Σύνδεση' : 'Sign In'}
                                    </button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form className="space-y-4" onSubmit={handleAuth}>
                                {mode === 'register' ? (
                                    <>
                                        {/* Registration form - wider layout */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                                                    {lang === 'el' ? 'Όνομα' : 'First Name'}
                                                </label>
                                                <input
                                                    id="firstName"
                                                    name="firstName"
                                                    type="text"
                                                    autoComplete="given-name"
                                                    required
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-black"
                                                    placeholder={lang === 'el' ? 'Όνομα' : 'First Name'}
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                                                    {lang === 'el' ? 'Επώνυμο' : 'Last Name'}
                                                </label>
                                                <input
                                                    id="lastName"
                                                    name="lastName"
                                                    type="text"
                                                    autoComplete="family-name"
                                                    required
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-black"
                                                    placeholder={lang === 'el' ? 'Επώνυμο' : 'Last Name'}
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                />
                                            </div>
                                        </div>

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
                                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-black"
                                                placeholder={lang === 'el' ? 'Email' : 'Email'}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>

                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={lang === 'el' ? 'Κωδικός' : 'Password'}
                                            autoComplete="new-password"
                                            showRequirements={true}
                                            lang={lang}
                                        />
                                    </>
                                ) : (
                                    <>
                                        {/* Signin form - standard layout */}
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
                                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-black"
                                                placeholder={lang === 'el' ? 'εισάγετε το email σας' : 'Enter your email'}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={lang === 'el' ? 'εισάγετε τον κωδικό σας' : 'Enter your password'}
                                            autoComplete="current-password"
                                            showRequirements={false}
                                            lang={lang}
                                        />
                                    </>
                                )}
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
                                    <span className="px-2 text-slate-500">
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

                            {/* Switch between signin/register */}
                            {mode === 'register' && (
                                <div className="text-center mt-4">
                                    <p className="text-sm text-slate-600">
                                        {lang === 'el' ? 'Έχεις ήδη λογαριασμό; ' : 'You already have an account? '}
                                        <button
                                            type="button"
                                            onClick={() => setMode('signin')}
                                            className="text-blue-600 hover:text-blue-700 font-medium underline"
                                        >
                                            {lang === 'el' ? 'Συνδέσου' : 'Log in'}
                                        </button>
                                    </p>
                                </div>
                            )}

                            {mode === 'signin' && (
                                <div className="text-center mt-4 space-y-2">
                                    <p className="text-sm text-slate-600">
                                        {lang === 'el' ? 'Δεν έχεις λογαριασμό; ' : "Don't have an account? "}
                                        <button
                                            type="button"
                                            onClick={() => setMode('register')}
                                            className="text-blue-600 hover:text-blue-700 font-medium underline"
                                        >
                                            {lang === 'el' ? 'Εγγράψου' : 'Sign up'}
                                        </button>
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        {lang === 'el' ? 'Ξέχασες τον κωδικό σου; ' : 'Forgot your password? '}
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/${lang}/auth/forgot-password`)}
                                            className="text-blue-600 hover:text-blue-700 font-medium underline"
                                        >
                                            {lang === 'el' ? 'Επαναφορά Κωδικού' : 'Reset Password'}
                                        </button>
                                    </p>
                                </div>
                            )}

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
                        <p className="text-sm text-white/70">
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

// Main export with Suspense boundary
export default function AuthPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121A39' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
                    <p className="text-white">Loading...</p>
                </div>
            </div>
        }>
            <AuthFormWithSearchParams />
        </Suspense>
    );
} 