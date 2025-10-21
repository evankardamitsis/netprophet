"use client";

import { useState } from "react";
import { ProfileClaimFlowTestEnhanced } from "./ProfileClaimFlowTestEnhanced";
import { ProfileClaimFlowTestScenarios } from "./ProfileClaimFlowTestScenarios";
import { ProfileClaimFlowTestManual } from "./ProfileClaimFlowTestManual";
import { ProfileClaimFlowDebug } from "./ProfileClaimFlowDebug";

type TestMode = 'enhanced' | 'scenarios' | 'manual' | 'debug';

export function ProfileClaimFlowTestDashboard() {
    const [testMode, setTestMode] = useState<TestMode>('enhanced');

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6 max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Claim Flow Test Dashboard</h1>
                    <p className="text-gray-800">Comprehensive testing tools for the ProfileClaimFlowNew component</p>
                </div>

                {/* Test Mode Tabs */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setTestMode('enhanced')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${testMode === 'enhanced'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                                    }`}
                            >
                                Enhanced Testing (Existing Users)
                            </button>
                            <button
                                onClick={() => setTestMode('scenarios')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${testMode === 'scenarios'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                                    }`}
                            >
                                Scenario Testing (Create Test Users)
                            </button>
                            <button
                                onClick={() => setTestMode('manual')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${testMode === 'manual'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                                    }`}
                            >
                                Manual Testing (Specific User ID)
                            </button>
                            <button
                                onClick={() => setTestMode('debug')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${testMode === 'debug'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                                    }`}
                            >
                                Debug (getUserName Function)
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Test Mode Descriptions */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    {testMode === 'enhanced' ? (
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Enhanced Testing Mode</h3>
                            <p className="text-blue-800 text-sm">
                                Test with existing users from your database. This mode allows you to:
                            </p>
                            <ul className="list-disc list-inside text-blue-900 text-sm mt-2 space-y-1">
                                <li>Select from existing users in your database</li>
                                <li>Run diagnostic tests on user profiles</li>
                                <li>Test the actual ProfileClaimFlowNew component</li>
                                <li>Clear profile data to test sync scenarios</li>
                                <li>Reset claim statuses for re-testing</li>
                            </ul>
                        </div>
                    ) : testMode === 'scenarios' ? (
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Scenario Testing Mode</h3>
                            <p className="text-blue-800 text-sm">
                                Create test users with specific scenarios. This mode allows you to:
                            </p>
                            <ul className="list-disc list-inside text-blue-900 text-sm mt-2 space-y-1">
                                <li>Create users with predefined test scenarios</li>
                                <li>Test different profile claim states</li>
                                <li>Simulate various user conditions</li>
                                <li>Test the complete flow from start to finish</li>
                                <li>Clean up test users when done</li>
                            </ul>
                        </div>
                    ) : testMode === 'manual' ? (
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Manual Testing Mode</h3>
                            <p className="text-blue-800 text-sm">
                                Test with a specific User ID. This mode allows you to:
                            </p>
                            <ul className="list-disc list-inside text-blue-900 text-sm mt-2 space-y-1">
                                <li>Enter any specific User ID to test</li>
                                <li>View user information and profile data</li>
                                <li>Test the ProfileClaimFlowNew component</li>
                                <li>Clear user data to test sync scenarios</li>
                                <li>Perfect for testing your specific Gmail user</li>
                            </ul>
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Debug Mode</h3>
                            <p className="text-blue-800 text-sm">
                                Debug the getUserName function and profile claim flow. This mode allows you to:
                            </p>
                            <ul className="list-disc list-inside text-blue-900 text-sm mt-2 space-y-1">
                                <li>See exactly what getUserName returns for your user</li>
                                <li>View user metadata and profile data</li>
                                <li>Understand why the form is showing or not showing</li>
                                <li>Debug Gmail user name detection issues</li>
                                <li>Test name syncing from user_metadata to profile</li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Render Selected Test Mode */}
                {testMode === 'enhanced' ? (
                    <ProfileClaimFlowTestEnhanced />
                ) : testMode === 'scenarios' ? (
                    <ProfileClaimFlowTestScenarios />
                ) : testMode === 'manual' ? (
                    <ProfileClaimFlowTestManual />
                ) : (
                    <ProfileClaimFlowDebug />
                )}
            </div>
        </div>
    );
}
