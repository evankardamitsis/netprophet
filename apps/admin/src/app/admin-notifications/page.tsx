"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Mail,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Clock
} from "lucide-react";

export default function AdminNotificationsPage() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [processResult, setProcessResult] = useState<string | null>(null);
    const [clearResult, setClearResult] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const processEmails = async () => {
        try {
            setIsProcessing(true);
            setError(null);
            setProcessResult(null);

            const response = await fetch('/api/admin/process-emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process emails');
            }

            setProcessResult(data.message || 'Emails processed successfully!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const clearTestEmails = async () => {
        try {
            setIsClearing(true);
            setError(null);
            setClearResult(null);

            const response = await fetch('/api/admin/clear-test-emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to clear test emails');
            }

            setClearResult(data.message || 'Test emails cleared successfully!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsClearing(false);
        }
    };

    const createTestNotifications = async () => {
        try {
            setIsTesting(true);
            setError(null);
            setTestResult(null);

            // Create test notifications by calling the Supabase function directly
            const response = await fetch('/api/admin/create-test-notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create test notifications');
            }

            setTestResult(data.message || 'Test notifications created successfully!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Admin Email Notifications</h1>
                <p className="text-muted-foreground mt-2">
                    Manage admin email notifications and process pending emails
                </p>
            </div>

            <div className="grid gap-6">
                {/* System Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            System Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Email System Active</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Admin Detection Working</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span className="text-sm">Auto-processing Every 5min</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Email Management */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Email Management
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Process pending admin emails or clear test data.
                            </p>

                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    onClick={createTestNotifications}
                                    disabled={isTesting}
                                    variant="outline"
                                    className="w-full md:w-auto"
                                >
                                    {isTesting ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Create Test Notifications
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={processEmails}
                                    disabled={isProcessing}
                                    className="w-full md:w-auto"
                                >
                                    {isProcessing ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="h-4 w-4 mr-2" />
                                            Process Email Queue
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={clearTestEmails}
                                    disabled={isClearing}
                                    variant="destructive"
                                    className="w-full md:w-auto"
                                >
                                    {isClearing ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Clearing...
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-4 w-4 mr-2" />
                                            Clear Test Emails
                                        </>
                                    )}
                                </Button>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                        <span className="text-sm text-red-700">{error}</span>
                                    </div>
                                </div>
                            )}

                            {processResult && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-sm text-green-700">{processResult}</span>
                                    </div>
                                </div>
                            )}

                            {testResult && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-blue-500" />
                                        <span className="text-sm text-blue-700">{testResult}</span>
                                    </div>
                                </div>
                            )}

                            {clearResult && (
                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-orange-500" />
                                        <span className="text-sm text-orange-700">{clearResult}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Automatic Processing Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Automatic Processing
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Admin emails are automatically processed every 5 minutes via cron job.
                                The manual &quot;Process Email Queue&quot; button is available for immediate processing if needed.
                            </p>

                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Every 5 minutes
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    <Mail className="h-3 w-3 mr-1" />
                                    Recent emails only
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Deduplication enabled
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}