'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@netprophet/ui';
import { useAuth } from '@/hooks/useAuth';
import { TopNavigation } from '@/components/matches/TopNavigation';

export default function MyProfilePage() {
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang;
    const { user, signOut, loading } = useAuth();
    useEffect(() => {
        if (!loading && !user) {
            router.push(`/${lang}/auth/signin`);
        }
    }, [user, loading, router, lang]);

    const handleSignOut = async () => {
        await signOut();
        router.push(`/${lang}`);
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
            {/* Back to Dashboard Button */}
            <div className="max-w-4xl mx-auto px-6 pt-6">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/${lang}/matches`)}
                    className="mb-6 bg-yellow-500 text-white"
                >
                    ← Back to Dashboard
                </Button>
            </div>

            {/* Content Area */}
            <div className="max-w-4xl mx-auto px-6 pb-6">
                {/* Page Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Το Προφίλ Μου
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Διαχειρίσου τις πληροφορίες του λογαριασμού σου και τις ρυθμίσεις σου.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Profile Information */}
                    <Card className="bg-white border border-gray-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-900">
                                Πληροφορίες Προφίλ
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-2xl text-blue-600 font-bold">
                                        {user.email?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">NetProphet User</h3>
                                    <p className="text-gray-600">{user.email}</p>
                                    <Badge variant="secondary" className="mt-1">
                                        Active Member
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Email:</span>
                                    <span className="font-medium">{user.email}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Member since:</span>
                                    <span className="font-medium">January 2024</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-600">Status:</span>
                                    <Badge variant="default" className="bg-green-100 text-green-800">
                                        Verified
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Statistics */}
                    <Card className="bg-white border border-gray-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-900">
                                Στατιστικά
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">1,250</div>
                                    <div className="text-sm text-gray-600">Total Points</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">23</div>
                                    <div className="text-sm text-gray-600">Correct Picks</div>
                                </div>
                                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">7</div>
                                    <div className="text-sm text-gray-600">Current Streak</div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">12</div>
                                    <div className="text-sm text-gray-600">Ranking</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Settings */}
                    <Card className="bg-white border border-gray-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-900">
                                Ρυθμίσεις
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Email Notifications</h4>
                                        <p className="text-sm text-gray-600">Receive updates about matches</p>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        Configure
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Privacy Settings</h4>
                                        <p className="text-sm text-gray-600">Control your profile visibility</p>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        Manage
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Change Password</h4>
                                        <p className="text-sm text-gray-600">Update your account password</p>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        Update
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Actions */}
                    <Card className="bg-white border border-gray-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-900">
                                Ενέργειες Λογαριασμού
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => router.push(`/${lang}/matches/my-picks`)}
                                >
                                    <span className="mr-2">📊</span>
                                    View My Picks
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                >
                                    <span className="mr-2">📧</span>
                                    Contact Support
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                >
                                    <span className="mr-2">📖</span>
                                    Help & FAQ
                                </Button>
                                <div className="border-t border-gray-200 pt-3">
                                    <Button
                                        variant="destructive"
                                        className="w-full justify-start"
                                        onClick={handleSignOut}
                                    >
                                        <span className="mr-2">🚪</span>
                                        Sign Out
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
} 