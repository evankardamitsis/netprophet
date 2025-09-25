'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TestResult {
    success: boolean;
    message?: string;
    error?: string;
}

export default function EmailTestPage() {
    const [email, setEmail] = useState('');
    const [template, setTemplate] = useState('2fa');
    const [language, setLanguage] = useState('en');
    const [variables, setVariables] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<TestResult | null>(null);

    const handleSendTest = async () => {
        if (!email) {
            setResult({ success: false, error: 'Please enter an email address' });
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            let parsedVariables = {};
            if (variables.trim()) {
                try {
                    parsedVariables = JSON.parse(variables);
                } catch (e) {
                    setResult({ success: false, error: 'Invalid JSON in variables field' });
                    setIsLoading(false);
                    return;
                }
            }

            const response = await fetch('/api/test-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    type: template,
                    language,
                    template: template,
                    variables: parsedVariables,
                }),
            });

            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send test email',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getVariableExamples = () => {
        switch (template) {
            case '2fa':
                return JSON.stringify({
                    code: '123456',
                    user_email: email,
                    expiry_minutes: '10'
                }, null, 2);
            case 'promotional':
                return JSON.stringify({
                    featuredMatches: [
                        {
                            id: '1',
                            tournament: 'Wimbledon',
                            player1: { name: 'Player A', odds: 1.50 },
                            player2: { name: 'Player B', odds: 2.50 }
                        }
                    ]
                }, null, 2);
            case 'winnings':
                return JSON.stringify({
                    amount: '150.00',
                    currency: 'EUR',
                    match_details: 'Wimbledon Final'
                }, null, 2);
            case 'admin':
                return JSON.stringify({
                    alert_type: 'system',
                    message: 'Database backup completed successfully',
                    timestamp: new Date().toISOString()
                }, null, 2);
            default:
                return '{}';
        }
    };

    useEffect(() => {
        setVariables(getVariableExamples());
    }, [template, email]);

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Email Testing</h1>
                <p className="text-gray-600 mt-2">
                    Test your email templates with real data and see how they look
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Test Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="email">Recipient Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="test@example.com"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="template">Template Type</Label>
                            <Select value={template} onValueChange={setTemplate}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2fa">2FA Verification</SelectItem>
                                    <SelectItem value="promotional">Promotional</SelectItem>
                                    <SelectItem value="winnings">Winnings</SelectItem>
                                    <SelectItem value="admin">Admin Alert</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="language">Language</Label>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English 🇺🇸</SelectItem>
                                    <SelectItem value="el">Greek 🇬🇷</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="variables">Template Variables (JSON)</Label>
                            <Textarea
                                id="variables"
                                value={variables}
                                onChange={(e) => setVariables(e.target.value)}
                                placeholder="Enter JSON variables"
                                className="min-h-32 font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Enter variables as JSON. Examples are provided based on template type.
                            </p>
                        </div>

                        <Button
                            onClick={handleSendTest}
                            disabled={isLoading || !email}
                            className="w-full"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Test Email
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Test Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {result ? (
                            <div className={`p-4 rounded-lg ${result.success
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {result.success ? (
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-600" />
                                    )}
                                    <span className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'
                                        }`}>
                                        {result.success ? 'Success!' : 'Error'}
                                    </span>
                                </div>
                                <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                    {result.success ? result.message : result.error}
                                </p>
                                {result.success && (
                                    <p className="text-xs text-green-600 mt-2">
                                        Check the recipient's inbox for the test email.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No test results yet.</p>
                                <p className="text-sm">Configure and send a test email to see results here.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Template Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">2FA Template</h4>
                            <p className="text-gray-600">Used for two-factor authentication verification codes.</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Variables: code, user_email, expiry_minutes
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Promotional Template</h4>
                            <p className="text-gray-600">Used for marketing and promotional content.</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Variables: featuredMatches, special_offers
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Winnings Template</h4>
                            <p className="text-gray-600">Used to notify users about their winnings.</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Variables: amount, currency, match_details
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Admin Template</h4>
                            <p className="text-gray-600">Used for administrative alerts and notifications.</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Variables: alert_type, message, timestamp
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
