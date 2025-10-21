"use client";

import { useState } from "react";
import { supabase } from "@netprophet/lib";
import { getUserName } from "@/lib/playerLookup";

export function ProfileClaimFlowDebug() {
    const [debugResults, setDebugResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [testUserId, setTestUserId] = useState("");

    const runDebug = async () => {
        setLoading(true);
        setDebugResults(null);

        try {
            let userId = testUserId.trim();

            // If no user ID provided, use current user
            if (!userId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setDebugResults({ error: "No user logged in and no user ID provided" });
                    return;
                }
                userId = user.id;
            }

            console.log("🔍 Debug - Starting getUserName debug for user:", userId);

            // Test getUserName function
            const { firstName, lastName } = await getUserName(userId);

            // Get profile data directly
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            // Get user metadata (this will be for the current logged-in user, not the test user)
            const { data: { user: currentUser } } = await supabase.auth.getUser();

            setDebugResults({
                userId: userId,
                userEmail: profile?.email || currentUser?.email || 'Unknown',
                userMetadata: currentUser?.user_metadata,
                getUserNameResult: { firstName, lastName },
                profileData: profile,
                profileError: profileError?.message,
                hasNames: !!(firstName && lastName),
                willShowForm: !firstName || !lastName
            });

        } catch (error) {
            setDebugResults({ error: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">ProfileClaimFlow Debug</h2>
            <p className="text-gray-800 mb-6">Debug the getUserName function and see what&apos;s happening</p>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">User ID Input</h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={testUserId}
                        onChange={(e) => setTestUserId(e.target.value)}
                        placeholder="Enter User ID to test (or leave empty for current user)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                    <button
                        onClick={runDebug}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Running Debug..." : "Run Debug"}
                    </button>
                </div>
                <p className="text-sm text-gray-800 mt-2">
                    Enter a specific User ID to test the getUserName function, or leave empty to test with the current logged-in user.
                </p>
            </div>

            {debugResults && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Debug Results:</h3>

                    {debugResults.error ? (
                        <div className="p-4 bg-red-50 border border-red-200 rounded">
                            <p className="text-red-800">Error: {debugResults.error}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                                <h4 className="font-semibold text-blue-900 mb-2">User Info</h4>
                                <p className="text-gray-900"><strong>ID:</strong> {debugResults.userId}</p>
                                <p className="text-gray-900"><strong>Email:</strong> {debugResults.userEmail}</p>
                            </div>

                            <div className="p-4 bg-green-50 border border-green-200 rounded">
                                <h4 className="font-semibold text-green-900 mb-2">getUserName Result</h4>
                                <p className="text-gray-900"><strong>First Name:</strong> {debugResults.getUserNameResult.firstName || 'null'}</p>
                                <p className="text-gray-900"><strong>Last Name:</strong> {debugResults.getUserNameResult.lastName || 'null'}</p>
                                <p className="text-gray-900"><strong>Has Names:</strong> {debugResults.hasNames ? '✅ Yes' : '❌ No'}</p>
                                <p className="text-gray-900"><strong>Will Show Form:</strong> {debugResults.willShowForm ? '❌ Yes (BAD)' : '✅ No (GOOD)'}</p>
                            </div>

                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                                <h4 className="font-semibold text-yellow-900 mb-2">User Metadata</h4>
                                <pre className="text-sm bg-white p-3 rounded border overflow-auto text-gray-900">
                                    {JSON.stringify(debugResults.userMetadata, null, 2)}
                                </pre>
                            </div>

                            <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                                <h4 className="font-semibold text-purple-900 mb-2">Profile Data</h4>
                                {debugResults.profileError ? (
                                    <p className="text-red-800 font-semibold">Error: {debugResults.profileError}</p>
                                ) : (
                                    <pre className="text-sm bg-white p-3 rounded border overflow-auto text-gray-900">
                                        {JSON.stringify(debugResults.profileData, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
