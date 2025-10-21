"use client";

import { useState } from "react";
import { supabase } from "@netprophet/lib";
import { ProfileClaimFlowNew } from "./ProfileClaimFlowNew";

export function ProfileClaimFlowTestManual() {
    const [testUserId, setTestUserId] = useState<string>("");
    const [testMode, setTestMode] = useState<'normal' | 'match' | 'multiple'>('normal');
    const [forceRefresh, setForceRefresh] = useState(0);
    const [showFlow, setShowFlow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);

    const loadUserInfo = async () => {
        if (!testUserId.trim()) {
            alert("Please enter a User ID");
            return;
        }

        setLoading(true);
        try {
            const { data: profile, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", testUserId)
                .single();

            if (error) {
                alert(`Error loading user: ${error.message}`);
                setUserInfo(null);
            } else {
                setUserInfo(profile);
            }
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setUserInfo(null);
        } finally {
            setLoading(false);
        }
    };

    const clearUserData = async () => {
        if (!testUserId.trim()) {
            alert("Please enter a User ID");
            return;
        }

        if (!confirm("Are you sure you want to clear this user's profile data?")) return;

        setLoading(true);
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
                .eq("id", testUserId);

            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                alert("User data cleared successfully!");
                loadUserInfo(); // Refresh user info
            }
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    if (showFlow && testUserId) {
        return (
            <div className="w-full h-full">
                <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">Testing Profile Claim Flow</h3>
                        <button
                            onClick={() => setShowFlow(false)}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                            Back to Manual Test
                        </button>
                    </div>
                    <div className="text-sm text-gray-800">
                        <p><strong>User ID:</strong> {testUserId}</p>
                        <p><strong>Test Mode:</strong> {testMode}</p>
                        {userInfo && (
                            <>
                                <p><strong>Email:</strong> {userInfo.email}</p>
                                <p><strong>Name:</strong> {userInfo.first_name} {userInfo.last_name}</p>
                                <p><strong>Status:</strong> {userInfo.profile_claim_status || 'None'}</p>
                            </>
                        )}
                    </div>
                </div>
                <ProfileClaimFlowNew
                    userId={testUserId}
                    onComplete={() => {
                        alert("Profile claim completed!");
                        setShowFlow(false);
                        loadUserInfo(); // Refresh user info
                    }}
                    onSkip={() => {
                        alert("Profile claim skipped!");
                        setShowFlow(false);
                        loadUserInfo(); // Refresh user info
                    }}
                    onRefresh={() => {
                        loadUserInfo();
                    }}
                    forceRefresh={forceRefresh}
                    testMode={testMode}
                />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Manual Profile Claim Flow Test</h2>
            <p className="text-gray-800 mb-6">Enter a specific User ID to test the ProfileClaimFlowNew component</p>

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

            {/* User ID Input */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">User ID Input</h3>
                <div className="flex gap-3 mb-4">
                    <input
                        type="text"
                        value={testUserId}
                        onChange={(e) => setTestUserId(e.target.value)}
                        placeholder="Enter User ID (e.g., 0fd82e0f-6144-4504-b580-b4a65a079d91)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                    <button
                        onClick={loadUserInfo}
                        disabled={loading || !testUserId.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Loading..." : "Load User Info"}
                    </button>
                </div>
            </div>

            {/* User Info Display */}
            {userInfo && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">User Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p><strong>ID:</strong> {userInfo.id}</p>
                            <p><strong>Email:</strong> {userInfo.email}</p>
                            <p><strong>First Name:</strong> {userInfo.first_name || 'None'}</p>
                            <p><strong>Last Name:</strong> {userInfo.last_name || 'None'}</p>
                        </div>
                        <div>
                            <p><strong>Profile Claim Status:</strong> {userInfo.profile_claim_status || 'None'}</p>
                            <p><strong>Claimed Player ID:</strong> {userInfo.claimed_player_id || 'None'}</p>
                            <p><strong>Created:</strong> {new Date(userInfo.created_at).toLocaleString()}</p>
                            <p><strong>Updated:</strong> {new Date(userInfo.updated_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Actions */}
            {testUserId && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Test Actions</h3>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setShowFlow(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            Test Profile Claim Flow
                        </button>

                        <button
                            onClick={clearUserData}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            disabled={loading}
                        >
                            Clear User Data
                        </button>

                        <button
                            onClick={() => setForceRefresh(prev => prev + 1)}
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                            Force Refresh
                        </button>

                        <button
                            onClick={loadUserInfo}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            disabled={loading}
                        >
                            Refresh User Info
                        </button>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-semibold mb-2 text-gray-900">How to Use:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-800">
                    <li>Enter a User ID from your database</li>
                    <li>Click &quot;Load User Info&quot; to see the user&apos;s current state</li>
                    <li>Choose a test mode (Normal, Test Match, or Test Multiple)</li>
                    <li>Click &quot;Test Profile Claim Flow&quot; to see the component in action</li>
                    <li>Use &quot;Clear User Data&quot; to reset the user&apos;s profile data for testing</li>
                    <li>Use &quot;Force Refresh&quot; to refresh the flow component</li>
                </ol>
            </div>
        </div>
    );
}
