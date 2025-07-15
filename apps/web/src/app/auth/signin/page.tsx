'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@netprophet/ui';
import { useAuth } from '@/hooks/useAuth';

export default function SignInPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { signIn } = useAuth();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Check for error parameters in the URL
        const error = searchParams.get('error');
        if (error) {
            setMessage(error);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const { error } = await signIn(email);
            if (error) {
                setMessage('Error sending magic link. Please try again.');
            } else {
                setMessage('Check your email for the magic link!');
                setEmail('');
            }
        } catch (error) {
            setMessage('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Sign in to NetProphet
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your email to receive a magic link
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="sr-only">
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? 'Sending...' : 'Send Magic Link'}
                        </Button>
                    </div>

                    {message && (
                        <div className={`text-sm text-center ${message.includes('Error') || message.includes('failed') || message.includes('No session') ? 'text-red-600' : 'text-green-600'
                            }`}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
} 