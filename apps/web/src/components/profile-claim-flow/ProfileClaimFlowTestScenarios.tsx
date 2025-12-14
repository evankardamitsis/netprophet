"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@netprophet/lib";
import { ProfileClaimFlowNew } from "./ProfileClaimFlowNew";
import { useAuth } from "@/hooks/useAuth";

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
    const { user, loading: authLoading } = useAuth();
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
    const [testUserId, setTestUserId] = useState<string | null>(null);
    const [showFlow, setShowFlow] = useState(false);
    // Removed testMode - flow is now simplified and always shows form first
    const [forceRefresh, setForceRefresh] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminCheckLoading, setAdminCheckLoading] = useState(true);

    // Check if user is admin
    const checkAdminStatus = useCallback(async () => {
        if (!user?.id) {
            setIsAdmin(false);
            setAdminCheckLoading(false);
            return;
        }

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            setIsAdmin(profile?.is_admin || false);
        } catch (err) {
            console.error('Failed to check admin status:', err);
            setIsAdmin(false);
        } finally {
            setAdminCheckLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        checkAdminStatus();
    }, [checkAdminStatus]);

    const createTestUser = async (scenario: TestScenario) => {
        setLoading(true);
        try {
            // Use API endpoint to create test user with admin privileges
            const response = await fetch('/api/admin/create-test-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: scenario.userData.email,
                    password: "testpassword123",
                    firstName: scenario.userData.firstName,
                    lastName: scenario.userData.lastName,
                    profileClaimStatus: scenario.userData.profileClaimStatus
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create test user');
            }

            setTestUserId(result.userId);
            alert(`Test user created successfully! User ID: ${result.userId}\n\n✅ Email confirmation bypassed!\n\nTo test the notification:\n1. Sign out of your current account\n2. Sign in with: ${scenario.userData.email} / testpassword123\n3. Look for the notification in the top-right corner!`);
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

    // Show loading state while checking admin status
    if (authLoading || adminCheckLoading) {
        return (
            <div className="p-6 max-w-4xl mx-auto bg-white">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Checking access permissions...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show access denied for non-admin users
    if (!user || !isAdmin) {
        return (
            <div className="p-6 max-w-4xl mx-auto bg-white">
                <div className="text-center">
                    <div className="mb-6">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                        <p className="text-gray-600 mb-4">
                            This page is only accessible to administrators.
                        </p>
                        {!user ? (
                            <p className="text-sm text-gray-500">
                                Please sign in to continue.
                            </p>
                        ) : (
                            <p className="text-sm text-gray-500">
                                You don&apos;t have administrator privileges.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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
                />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Profile Claim Flow Test Scenarios</h2>

            {/* Info Box */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">New Simplified Flow</h3>
                <p className="text-sm text-gray-800 mb-2">
                    The flow now always shows the form first to collect: First Name, Last Name, Date of Birth, and Playing Hand.
                </p>
                <p className="text-sm text-gray-800">
                    After form submission, it searches the database and shows results (match found, no match, or multiple matches).
                </p>
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
                    <li>Choose a scenario and click &quot;Create &amp; Test&quot;</li>
                    <li>This will create a real user in your database with the scenario data</li>
                    <li>Click &quot;Test Flow&quot; to see the ProfileClaimFlowNew component in action</li>
                    <li>The flow will show a form asking for: First Name, Last Name, Date of Birth, and Playing Hand</li>
                    <li>Fill out the form and submit to test the lookup functionality</li>
                    <li>Test different scenarios to see how the flow behaves</li>
                    <li>Delete test users when done to clean up</li>
                </ol>
            </div>
        </div>
    );
}
