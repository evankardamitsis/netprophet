'use client';

import { useEmail } from '@/hooks/useEmail';
import React, { useState } from 'react';

export function EmailTester() {
    const [testEmail, setTestEmail] = useState('');
    const [testType, setTestType] = useState<'2fa' | 'promotional' | 'winnings' | 'admin'>('2fa');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleTestEmail = async () => {
        if (!testEmail) {
            setResult({ success: false, message: 'Please enter an email address' });
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/test-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: testEmail,
                    type: testType,
                    language: 'en'
                }),
            });

            const result = await response.json();

            if (result.success) {
                setResult({
                    success: true,
                    message: `${testType.toUpperCase()} email sent successfully!`
                });
            } else {
                setResult({
                    success: false,
                    message: result.error || 'Failed to send email'
                });
            }
        } catch (error) {
            setResult({
                success: false,
                message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4">🧪 Email System Tester</h3>

            <div className="space-y-4">
                {/* Email Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Test Email Address
                    </label>
                    <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="test@example.com"
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-yellow-400 focus:outline-none"
                    />
                </div>

                {/* Test Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Type
                    </label>
                    <select
                        value={testType}
                        onChange={(e) => setTestType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-yellow-400 focus:outline-none"
                    >
                        <option value="2fa">🔐 2FA Verification</option>
                        <option value="promotional">📢 Promotional Update</option>
                        <option value="winnings">🎉 Winnings Notification</option>
                        <option value="admin">🚨 Admin Alert</option>
                    </select>
                </div>

                {/* Test Button */}
                <button
                    onClick={handleTestEmail}
                    disabled={isLoading || !testEmail}
                    className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors"
                >
                    {isLoading ? 'Sending...' : 'Send Test Email'}
                </button>

                {/* Result Display */}
                {result && (
                    <div className={`p-4 rounded-lg ${result.success
                        ? 'bg-green-900/50 border border-green-500 text-green-300'
                        : 'bg-red-900/50 border border-red-500 text-red-300'
                        }`}>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">
                                {result.success ? '✅' : '❌'}
                            </span>
                            <span className="font-medium">{result.message}</span>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-2">Test Instructions:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• <strong>2FA:</strong> Sends a verification code email</li>
                        <li>• <strong>Promotional:</strong> Sends featured matches email</li>
                        <li>• <strong>Winnings:</strong> Sends congratulations email for winning</li>
                        <li>• <strong>Admin Alert:</strong> Sends system notification to admins</li>
                        <li>• Check your email inbox (and spam folder) for the test email</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
