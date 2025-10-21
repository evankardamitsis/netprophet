"use client";

import { useState } from "react";
import { supabase } from "@netprophet/lib";
import { ProfileClaimFlowNew } from "./ProfileClaimFlowNew";

interface TestScenario {
    id: string;
    name: string;
    description: string;
    userData: {
        email: string;
        firstName: string;
        lastName: string;
        profileClaimStatus?: string;
    };
}

const TEST_SCENARIOS: TestScenario[] = [
    {
        id: "new-user-no-name",
        name: "New User - No Name",
        description: "User with no first/last name in profile",
        userData: {
            email: "test-no-name@example.com",
            firstName: "",
            lastName: "",
        }
    },
    {
        id: "new-user-with-name",
        name: "New User - With Name",
        description: "User with first/last name in profile",
        userData: {
            email: "test-with-name@example.com",
            firstName: "John",
            lastName: "Doe",
        }
    },
    {
        id: "user-already-claimed",
        name: "User Already Claimed",
        description: "User who has already claimed a player profile",
        userData: {
            email: "test-claimed@example.com",
            firstName: "Jane",
            lastName: "Smith",
            profileClaimStatus: "claimed"
        }
    },
    {
        id: "user-creation-requested",
        name: "User Creation Requested",
        description: "User who requested profile creation",
        userData: {
            email: "test-creation@example.com",
            firstName: "Bob",
            lastName: "Johnson",
            profileClaimStatus: "creation_requested"
        }
    },
    {
        id: "user-skipped",
        name: "User Skipped",
        description: "User who skipped profile claim",
        userData: {
            email: "test-skipped@example.com",
            firstName: "Alice",
            lastName: "Brown",
            profileClaimStatus: "skipped"
        }
    }
];

export function ProfileClaimFlowTestScenarios() {
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
    const [testUserId, setTestUserId] = useState<string | null>(null);
    const [showFlow, setShowFlow] = useState(false);
    const [testMode, setTestMode] = useState<'normal' | 'match' | 'multiple'>('normal');
    const [forceRefresh, setForceRefresh] = useState(0);
    const [loading, setLoading] = useState(false);

    const createTestUser = async (scenario: TestScenario) => {
        setLoading(true);
        try {
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: scenario.userData.email,
                password: "testpassword123",
                options: {
                    data: {
                        first_name: scenario.userData.firstName,
                        last_name: scenario.userData.lastName,
                    }
                }
            });

            if (authError) throw authError;

            const userId = authData.user?.id;
            if (!userId) throw new Error("Failed to create user");

            // Create profile
            const { error: profileError } = await supabase
                .from("profiles")
                .insert({
                    id: userId,
                    email: scenario.userData.email,
                    first_name: scenario.userData.firstName || null,
                    last_name: scenario.userData.lastName || null,
                    profile_claim_status: scenario.userData.profileClaimStatus || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (profileError) throw profileError;

            setTestUserId(userId);
            alert(`Test user created successfully! User ID: ${userId}`);
        } catch (error) {
            console.error("Error creating test user:", error);
            alert(`Error creating test user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const deleteTestUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this test user?")) return;

        setLoading(true);
        try {
            // Delete profile first
            const { error: profileError } = await supabase
                .from("profiles")
                .delete()
                .eq("id", userId);

            if (profileError) throw profileError;

            // Delete auth user
            const { error: authError } = await supabase.auth.admin.deleteUser(userId);
            if (authError) throw authError;

            setTestUserId(null);
            setShowFlow(false);
            alert("Test user deleted successfully!");
        } catch (error) {
            console.error("Error deleting test user:", error);
            alert(`Error deleting test user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const selectedScenarioData = TEST_SCENARIOS.find(s => s.id === selectedScenario);

    if (showFlow && testUserId) {
        return (
            <div className="w-full h-full">
                <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">Testing Profile Claim Flow</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowFlow(false)}
                                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                                Back to Scenarios
                            </button>
                            <button
                                onClick={() => deleteTestUser(testUserId)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                disabled={loading}
                            >
                                Delete Test User
                            </button>
                        </div>
                    </div>
                    <div className="text-sm text-gray-800">
                        <p><strong>Scenario:</strong> {selectedScenarioData?.name}</p>
                        <p><strong>Description:</strong> {selectedScenarioData?.description}</p>
                        <p><strong>User ID:</strong> {testUserId}</p>
                        <p><strong>Test Mode:</strong> {testMode}</p>
                    </div>
                </div>
                <ProfileClaimFlowNew
                    userId={testUserId}
                    onComplete={() => {
                        alert("Profile claim completed!");
                        setShowFlow(false);
                    }}
                    onSkip={() => {
                        alert("Profile claim skipped!");
                        setShowFlow(false);
                    }}
                    onRefresh={() => { }}
                    forceRefresh={forceRefresh}
                    testMode={testMode}
                />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Profile Claim Flow Test Scenarios</h2>

            {/* Test Mode Selection */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Test Mode</h3>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="testMode"
                            value="normal"
                            checked={testMode === 'normal'}
                            onChange={(e) => setTestMode(e.target.value as any)}
                        />
                        <span className="text-gray-900">Normal (Real lookup)</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="testMode"
                            value="match"
                            checked={testMode === 'match'}
                            onChange={(e) => setTestMode(e.target.value as any)}
                        />
                        <span className="text-gray-900">Test Match (Single match)</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="testMode"
                            value="multiple"
                            checked={testMode === 'multiple'}
                            onChange={(e) => setTestMode(e.target.value as any)}
                        />
                        <span className="text-gray-900">Test Multiple (Multiple matches)</span>
                    </label>
                </div>
            </div>

            {/* Test Scenarios */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Test Scenarios</h3>
                {TEST_SCENARIOS.map((scenario) => (
                    <div key={scenario.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-gray-900">{scenario.name}</h4>
                                <p className="text-sm text-gray-800 mb-2">{scenario.description}</p>
                                <div className="text-xs text-gray-800">
                                    <p>Email: {scenario.userData.email}</p>
                                    <p>Name: {scenario.userData.firstName} {scenario.userData.lastName}</p>
                                    <p>Status: {scenario.userData.profileClaimStatus || 'None'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => createTestUser(scenario)}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? "Creating..." : "Create & Test"}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Current Test User */}
            {testUserId && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Current Test User</h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p><strong>User ID:</strong> {testUserId}</p>
                            <p><strong>Scenario:</strong> {selectedScenarioData?.name}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowFlow(true)}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Test Flow
                            </button>
                            <button
                                onClick={() => setForceRefresh(prev => prev + 1)}
                                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                            >
                                Force Refresh
                            </button>
                            <button
                                onClick={() => deleteTestUser(testUserId)}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                disabled={loading}
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-semibold mb-2 text-gray-900">How to Test:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-800">
                    <li>Select a test mode (Normal, Test Match, or Test Multiple)</li>
                    <li>Choose a scenario and click &quot;Create &amp; Test&quot;</li>
                    <li>This will create a real user in your database with the scenario data</li>
                    <li>Click &quot;Test Flow&quot; to see the ProfileClaimFlowNew component in action</li>
                    <li>Test different scenarios to see how the flow behaves</li>
                    <li>Delete test users when done to clean up</li>
                </ol>
            </div>
        </div>
    );
}
