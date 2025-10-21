"use client";

import { useState, useEffect } from "react";
import { supabase } from "@netprophet/lib";
import { getUserName } from "@/lib/playerLookup";
import { ProfileClaimFlowNew } from "./ProfileClaimFlowNew";

interface User {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    profile_claim_status: string | null;
    created_at: string;
}

export function ProfileClaimFlowTestEnhanced() {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [testResults, setTestResults] = useState<any[]>([]);
    const [showFlow, setShowFlow] = useState(false);
    const [testMode, setTestMode] = useState<'normal' | 'match' | 'multiple'>('normal');
    const [forceRefresh, setForceRefresh] = useState(0);

    // Load users from database
    const loadUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, email, first_name, last_name, profile_claim_status, created_at")
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error loading users:", error);
            alert(`Error loading users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const runTests = async (userId: string) => {
        setLoading(true);
        setTestResults([]);

        try {
            const results = [];

            // Test 1: Get user data
            const { data: { user } } = await supabase.auth.getUser();
            results.push({
                test: "Current Auth User",
                result: user ? "✅ Logged in" : "❌ Not logged in",
                details: user ? `ID: ${user.id}, Email: ${user.email}` : "No user logged in"
            });

            // Test 2: Get selected user profile
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("first_name, last_name, profile_claim_status, claimed_player_id")
                .eq("id", userId)
                .single();

            results.push({
                test: "Selected User Profile",
                result: profile ? "✅ Found" : "❌ Missing",
                details: profile ? JSON.stringify(profile, null, 2) : profileError?.message || "No profile found"
            });

            // Test 3: Test getUserName function
            try {
                const { firstName, lastName } = await getUserName(userId);
                results.push({
                    test: "getUserName Function",
                    result: (firstName && lastName) ? "✅ Names Found" : "❌ Names Missing",
                    details: `firstName: "${firstName}", lastName: "${lastName}"`
                });
            } catch (error) {
                results.push({
                    test: "getUserName Function",
                    result: "❌ Error",
                    details: error instanceof Error ? error.message : "Unknown error"
                });
            }

            // Test 4: Check profile claim status
            if (profile) {
                const status = profile.profile_claim_status;
                let statusResult = "❓ Unknown";
                let statusDetails = `Status: ${status}`;

                if (status === "claimed") {
                    statusResult = "✅ Already Claimed";
                    statusDetails = `Player ID: ${profile.claimed_player_id}`;
                } else if (status === "creation_requested") {
                    statusResult = "⚠️ Creation Requested";
                    statusDetails = "User requested profile creation";
                } else if (status === "skipped") {
                    statusResult = "⏭️ Skipped";
                    statusDetails = "User skipped profile claim";
                } else if (status === "pending") {
                    statusResult = "⏳ Pending";
                    statusDetails = "Profile claim in progress";
                } else if (!status) {
                    statusResult = "🆕 Not Started";
                    statusDetails = "Profile claim not started";
                }

                results.push({
                    test: "Profile Claim Status",
                    result: statusResult,
                    details: statusDetails
                });
            }

            setTestResults(results);

        } catch (error) {
            setTestResults([{
                test: "Test Execution",
                result: "❌ Error",
                details: error instanceof Error ? error.message : "Unknown error"
            }]);
        } finally {
            setLoading(false);
        }
    };

    const clearProfileNames = async (userId: string) => {
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    first_name: null,
                    last_name: null,
                    profile_claim_status: null,
                    claimed_player_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq("id", userId);

            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                alert("Profile data cleared! Run tests again to see the sync in action.");
                loadUsers(); // Refresh user list
            }
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const resetProfileClaim = async (userId: string) => {
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    profile_claim_status: null,
                    claimed_player_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq("id", userId);

            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                alert("Profile claim status reset!");
                loadUsers(); // Refresh user list
            }
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const selectedUser = users.find(u => u.id === selectedUserId);

    if (showFlow && selectedUserId) {
        return (
            <div className="w-full h-full">
                <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">Testing Profile Claim Flow</h3>
                        <button
                            onClick={() => setShowFlow(false)}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                            Back to Test Panel
                        </button>
                    </div>
                    <div className="text-sm text-gray-800">
                        <p><strong>User:</strong> {selectedUser?.email}</p>
                        <p><strong>Name:</strong> {selectedUser?.first_name} {selectedUser?.last_name}</p>
                        <p><strong>Status:</strong> {selectedUser?.profile_claim_status || 'None'}</p>
                        <p><strong>Test Mode:</strong> {testMode}</p>
                    </div>
                </div>
                <ProfileClaimFlowNew
                    userId={selectedUserId}
                    onComplete={() => {
                        alert("Profile claim completed!");
                        setShowFlow(false);
                        loadUsers();
                    }}
                    onSkip={() => {
                        alert("Profile claim skipped!");
                        setShowFlow(false);
                        loadUsers();
                    }}
                    onRefresh={() => {
                        loadUsers();
                    }}
                    forceRefresh={forceRefresh}
                    testMode={testMode}
                />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto bg-white">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Enhanced ProfileClaimFlowNew Test Suite</h2>

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

            {/* User Selection */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Select User to Test</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedUserId === user.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                            onClick={() => setSelectedUserId(user.id)}
                        >
                            <div className="font-medium text-sm text-gray-900">{user.email}</div>
                            <div className="text-xs text-gray-700">
                                {user.first_name} {user.last_name}
                            </div>
                            <div className="text-xs text-gray-800">
                                Status: {user.profile_claim_status || 'None'}
                            </div>
                            <div className="text-xs text-gray-700">
                                {new Date(user.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={loadUsers}
                    disabled={loading}
                    className="mt-3 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                >
                    {loading ? "Loading..." : "Refresh Users"}
                </button>
            </div>

            {/* Test Actions */}
            {selectedUserId && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Test Actions</h3>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => runTests(selectedUserId)}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? "Running Tests..." : "Run Tests"}
                        </button>

                        <button
                            onClick={() => setShowFlow(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            Test Profile Claim Flow
                        </button>

                        <button
                            onClick={() => clearProfileNames(selectedUserId)}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Clear Profile Names
                        </button>

                        <button
                            onClick={() => resetProfileClaim(selectedUserId)}
                            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                        >
                            Reset Claim Status
                        </button>

                        <button
                            onClick={() => setForceRefresh(prev => prev + 1)}
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                            Force Refresh
                        </button>
                    </div>
                </div>
            )}

            {/* Test Results */}
            {testResults.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Test Results:</h3>
                    {testResults.map((result, index) => (
                        <div key={index} className="border border-gray-300 rounded p-4 bg-white">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900">{result.test}:</span>
                                <span className={result.result.includes("✅") ? "text-green-600" :
                                    result.result.includes("⚠️") ? "text-yellow-600" :
                                        result.result.includes("⏳") ? "text-blue-600" :
                                            result.result.includes("🆕") ? "text-purple-600" :
                                                result.result.includes("⏭️") ? "text-gray-600" :
                                                    "text-red-600"}>
                                    {result.result}
                                </span>
                            </div>
                            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto text-gray-900 border">
                                {result.details}
                            </pre>
                        </div>
                    ))}
                </div>
            )}

            {/* Instructions */}
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-semibold mb-2 text-gray-900">How to Test:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-800">
                    <li>Select a user from the list above</li>
                    <li>Choose a test mode (Normal, Test Match, or Test Multiple)</li>
                    <li>Run tests to see current state</li>
                    <li>Use &quot;Test Profile Claim Flow&quot; to see the actual flow</li>
                    <li>Use &quot;Clear Profile Names&quot; to simulate missing profile data</li>
                    <li>Use &quot;Reset Claim Status&quot; to reset the claim status</li>
                    <li>Use &quot;Force Refresh&quot; to refresh the flow component</li>
                </ol>
            </div>
        </div>
    );
}
