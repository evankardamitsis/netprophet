'use client';

import React from 'react';
import { EmailTester } from '@/components/admin/EmailTester';

export default function EmailTestPage() {
    return (
        <div className="min-h-screen bg-slate-900 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">🧪 Email System Test</h1>
                    <p className="text-gray-300">
                        Test the email system functionality with different email types
                    </p>
                </div>

                <EmailTester />

                <div className="mt-8 bg-slate-800 p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-4">📋 Test Results Checklist</h3>
                    <div className="space-y-2 text-gray-300">
                        <div className="flex items-center gap-2">
                            <span>☐</span>
                            <span>2FA email received and formatted correctly</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>☐</span>
                            <span>Promotional email with featured matches</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>☐</span>
                            <span>Winnings notification email</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>☐</span>
                            <span>Admin alert email</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>☐</span>
                            <span>All emails delivered to inbox (check spam folder)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>☐</span>
                            <span>Email templates render correctly</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>☐</span>
                            <span>Variables are populated correctly</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
