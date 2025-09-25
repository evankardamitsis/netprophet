'use client';

import React, { useState, useEffect } from 'react';
import { emailService, EmailLog } from '@netprophet/lib';
import { EmailTester } from './EmailTester';

interface EmailStats {
    total_sent: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    recent_activity: number;
}

export function EmailManager() {
    const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
    const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    useEffect(() => {
        loadEmailData();
    }, []);

    const loadEmailData = async () => {
        try {
            setIsLoading(true);
            const [logs, stats] = await Promise.all([
                emailService.getEmailLogs(100),
                emailService.getEmailStats()
            ]);
            setEmailLogs(logs);
            setEmailStats(stats);
        } catch (error) {
            console.error('Error loading email data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = emailLogs.filter(log => {
        const typeMatch = selectedType === 'all' || log.type === selectedType;
        const statusMatch = selectedStatus === 'all' || log.status === selectedStatus;
        return typeMatch && statusMatch;
    });


    if (isLoading) {
        return (
            <div className="p-6">
                <div className="text-white text-center">Loading email data...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Email Management</h1>
            </div>

            {/* Email Tester Component */}
            <EmailTester />

            {/* Email Statistics */}
            {emailStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-2">Total Sent</h3>
                        <p className="text-3xl font-bold text-yellow-400">{emailStats.total_sent}</p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-2">Recent Activity</h3>
                        <p className="text-3xl font-bold text-green-400">{emailStats.recent_activity}</p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-2">By Type</h3>
                        <div className="space-y-1">
                            {Object.entries(emailStats.by_type).map(([type, count]) => (
                                <div key={type} className="flex justify-between text-sm">
                                    <span className="text-gray-300 capitalize">{type}</span>
                                    <span className="text-white font-semibold">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-2">By Status</h3>
                        <div className="space-y-1">
                            {Object.entries(emailStats.by_status).map(([status, count]) => (
                                <div key={status} className="flex justify-between text-sm">
                                    <span className="text-gray-300 capitalize">{status}</span>
                                    <span className="text-white font-semibold">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-4">
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600"
                >
                    <option value="all">All Types</option>
                    <option value="2fa">2FA</option>
                    <option value="promotional">Promotional</option>
                    <option value="notification">Notification</option>
                    <option value="admin">Admin</option>
                </select>

                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600"
                >
                    <option value="all">All Statuses</option>
                    <option value="sent">Sent</option>
                    <option value="delivered">Delivered</option>
                    <option value="failed">Failed</option>
                    <option value="bounced">Bounced</option>
                    <option value="pending">Pending</option>
                </select>

                <button
                    onClick={loadEmailData}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                    Refresh
                </button>
            </div>

            {/* Email Logs Table */}
            <div className="bg-slate-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-white font-semibold">To</th>
                                <th className="px-4 py-3 text-left text-white font-semibold">Template</th>
                                <th className="px-4 py-3 text-left text-white font-semibold">Type</th>
                                <th className="px-4 py-3 text-left text-white font-semibold">Language</th>
                                <th className="px-4 py-3 text-left text-white font-semibold">Status</th>
                                <th className="px-4 py-3 text-left text-white font-semibold">Sent At</th>
                                <th className="px-4 py-3 text-left text-white font-semibold">Variables</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="border-t border-slate-700 hover:bg-slate-750">
                                    <td className="px-4 py-3 text-gray-300">{log.to_email}</td>
                                    <td className="px-4 py-3 text-gray-300">{log.template}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.type === '2fa' ? 'bg-blue-500 text-white' :
                                            log.type === 'promotional' ? 'bg-green-500 text-white' :
                                                log.type === 'notification' ? 'bg-yellow-500 text-black' :
                                                    'bg-red-500 text-white'
                                            }`}>
                                            {log.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300 uppercase">{log.language}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.status === 'sent' ? 'bg-green-500 text-white' :
                                            log.status === 'delivered' ? 'bg-blue-500 text-white' :
                                                log.status === 'failed' ? 'bg-red-500 text-white' :
                                                    log.status === 'bounced' ? 'bg-orange-500 text-white' :
                                                        'bg-gray-500 text-white'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">
                                        {new Date(log.sent_at).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => {
                                                const variables = JSON.stringify(log.variables, null, 2);
                                                alert(variables);
                                            }}
                                            className="text-blue-400 hover:text-blue-300 text-sm"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredLogs.length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                        No email logs found matching the current filters.
                    </div>
                )}
            </div>

            {/* Bulk Actions */}
            <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Bulk Actions</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Send Promotional Email to All Users
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="Enter your email for testing"
                                className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600"
                            />
                            <button
                                onClick={async () => {
                                    // This would need to be implemented to get all user emails
                                    alert('Feature coming soon - will send to all users');
                                }}
                                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                            >
                                Send Promotional
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
