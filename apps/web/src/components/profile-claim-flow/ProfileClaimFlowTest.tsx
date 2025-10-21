"use client";

import { useState } from "react";
import { supabase } from "@netprophet/lib";
import { getUserName } from "@/lib/playerLookup";

export function ProfileClaimFlowTest() {
    const [testResults, setTestResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const runTests = async () => {
        setLoading(true);
        setTestResults([]);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setTestResults([{ test: "Authentication", result: "❌ No user logged in", details: "Please log in first" }]);
                return;
            }

            const results = [];

            // Test 1: Check user metadata
            results.push({
                test: "User Metadata Check",
                result: user.user_metadata ? "✅ Found" : "❌ Missing",
                details: user.user_metadata ? JSON.stringify(user.user_metadata, null, 2) : "No metadata"
            });

            // Test 2: Check profile table
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("first_name, last_name, profile_claim_status")
                .eq("id", user.id)
                .single();

            results.push({
                test: "Profile Table Check",
                result: profile ? "✅ Found" : "❌ Missing",
                details: profile ? JSON.stringify(profile, null, 2) : profileError?.message || "No profile found"
            });

            // Test 3: Test getUserName function
            try {
                const { firstName, lastName } = await getUserName(user.id);
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

            // Test 4: Check if names need syncing
            if (profile && (!profile.first_name || !profile.last_name)) {
                results.push({
                    test: "Profile Sync Needed",
                    result: "⚠️ Yes - Profile missing names",
                    details: "Profile table needs to be updated with names from user_metadata"
                });
            } else if (profile && profile.first_name && profile.last_name) {
                results.push({
                    test: "Profile Sync Needed",
                    result: "✅ No - Profile has names",
                    details: "Profile table already has names"
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

    const clearProfileNames = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("profiles")
                .update({
                    first_name: null,
                    last_name: null,
                    updated_at: new Date().toISOString()
                })
                .eq("id", user.id);

            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                alert("Profile names cleared! Run tests again to see the sync in action.");
            }
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">ProfileClaimFlowNew Test Suite</h2>

            <div className="space-y-4 mb-6">
                <button
                    onClick={runTests}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Running Tests..." : "Run Tests"}
                </button>

                <button
                    onClick={clearProfileNames}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ml-4"
                >
                    Clear Profile Names (Test Sync)
                </button>
            </div>

            {testResults.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Test Results:</h3>
                    {testResults.map((result, index) => (
                        <div key={index} className="border border-gray-300 rounded p-4 bg-white">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900">{result.test}:</span>
                                <span className={result.result.includes("✅") ? "text-green-600" :
                                    result.result.includes("⚠️") ? "text-yellow-600" : "text-red-600"}>
                                    {result.result}
                                </span>
                            </div>
                            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto text-gray-800 border">
                                {result.details}
                            </pre>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-semibold mb-2 text-gray-900">How to Test:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-800">
                    <li>Register a new user with email/password (include first/last name)</li>
                    <li>Run the tests to see current state</li>
                    <li>Use &quot;Clear Profile Names&quot; to simulate missing profile data</li>
                    <li>Run tests again to see if the sync logic works</li>
                    <li>Check browser console for detailed debug logs</li>
                </ol>
            </div>
        </div>
    );
}
