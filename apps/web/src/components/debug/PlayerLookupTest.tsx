"use client";

import { useState } from "react";
import { Button } from "@netprophet/ui";
import { debugPlayerLookup } from "@/lib/debugPlayerLookup";
import { findMatchingPlayers } from "@/lib/playerLookup";

export function PlayerLookupTest() {
    const [firstName, setFirstName] = useState("Evangelos");
    const [lastName, setLastName] = useState("Kardamitsis");
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleTest = async () => {
        setLoading(true);
        try {
            console.log("🧪 Testing player lookup with:", firstName, lastName);

            // Run debug lookup
            const debugResults = await debugPlayerLookup(firstName, lastName);

            // Run normal lookup
            const normalResults = await findMatchingPlayers(firstName, lastName);

            setResults({
                debug: debugResults,
                normal: normalResults
            });

            console.log("✅ Test completed");
        } catch (error) {
            console.error("❌ Test failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Player Lookup Test</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name:
                    </label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name:
                    </label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <Button
                    onClick={handleTest}
                    disabled={loading}
                    className="w-full"
                >
                    {loading ? "Testing..." : "Test Lookup"}
                </Button>

                {results && (
                    <div className="mt-6 space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Debug Results:</h3>
                            <div className="text-sm space-y-2">
                                <div>
                                    <strong>All Players Found:</strong> {results.debug.allPlayers?.length || 0}
                                </div>
                                <div>
                                    <strong>Transliteration:</strong> {results.debug.transliteration?.firstName} {results.debug.transliteration?.lastName}
                                </div>
                                <div>
                                    <strong>Normal Matches:</strong> {results.debug.normalMatches?.length || 0}
                                </div>
                                <div>
                                    <strong>Reversed Matches:</strong> {results.debug.reversedMatches?.length || 0}
                                </div>
                                <div>
                                    <strong>Fuzzy Matches:</strong> {results.debug.fuzzyMatches?.length || 0}
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Normal Lookup Results:</h3>
                            <div className="text-sm">
                                <strong>Matches Found:</strong> {results.normal.matches?.length || 0}
                                {results.normal.matches?.map((match: any, index: number) => (
                                    <div key={index} className="mt-1 text-gray-600">
                                        {match.first_name} {match.last_name} (Score: {match.match_score})
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
