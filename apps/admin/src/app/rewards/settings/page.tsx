'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Shield, Cog, Database } from 'lucide-react';

export default function RewardSettingsPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Reward Settings</h1>
                <p className="text-gray-600 mt-2">
                    Global reward configuration and policies for the entire system.
                </p>
            </div>

            {/* Coming Soon Card */}
            <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gray-100 rounded-lg">
                            <Settings className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl text-gray-900">Coming Soon</CardTitle>
                            <p className="text-gray-700">Global reward settings are under development</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Shield className="h-5 w-5 text-gray-600" />
                                <h3 className="font-medium text-gray-900">Policies</h3>
                            </div>
                            <p className="text-sm text-gray-700">Configure reward policies</p>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Cog className="h-5 w-5 text-gray-600" />
                                <h3 className="font-medium text-gray-900">Configuration</h3>
                            </div>
                            <p className="text-sm text-gray-700">Global system settings</p>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Database className="h-5 w-5 text-gray-600" />
                                <h3 className="font-medium text-gray-900">Data</h3>
                            </div>
                            <p className="text-sm text-gray-700">Reward data management</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
