'use client';

import { useState } from 'react';
import { supabase } from '@netprophet/lib';
import { Button } from '@netprophet/ui';
import { useRouter, useParams } from 'next/navigation';

export default function AuthPage() {
    const [mode, setMode] = useState<'signin' | 'register'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
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
            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (error) setMessage(error.message);
        } catch (err: any) {
            setMessage('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
                <div className="flex justify-center mb-4">
                    <button
                        className={`px-4 py-2 rounded-l-md border ${mode === 'signin' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`}
                        onClick={() => setMode('signin')}
                        disabled={mode === 'signin'}
                    >
                        Sign In
                    </button>
                    <button
                        className={`px-4 py-2 rounded-r-md border-t border-b border-r ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`}
                        onClick={() => setMode('register')}
                        disabled={mode === 'register'}
                    >
                        Register
                    </button>
                </div>
                <form className="space-y-6" onSubmit={handleAuth}>
                    <div>
                        <label htmlFor="email" className="sr-only">Email address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? (mode === 'signin' ? 'Signing in...' : 'Registering...') : (mode === 'signin' ? 'Sign In' : 'Register')}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleGoogle} disabled={loading} className="w-full">
                            {loading ? 'Redirecting...' : 'Sign in with Google'}
                        </Button>
                    </div>
                    {message && (
                        <div className={`text-sm text-center ${message.toLowerCase().includes('error') ? 'text-red-600' : 'text-green-600'}`}>{message}</div>
                    )}
                </form>
            </div>
        </div>
    );
} 