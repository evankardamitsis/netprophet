"use client";

import { useState } from "react";
import { Button, Card, CardContent } from "@netprophet/ui";
import { User, CheckCircle } from "lucide-react";
import { useDictionary } from "@/context/DictionaryContext";

export interface PlayerMatch {
    id: string;
    first_name: string;
    last_name: string;
    is_hidden: boolean;
    is_active: boolean;
    claimed_by_user_id: string | null;
    is_demo_player: boolean;
    match_score?: number;
}

interface ProfileSelectionListProps {
    players: PlayerMatch[];
    onSelectPlayer: (playerId: string) => void;
    loading?: boolean;
}

export function ProfileSelectionList({
    players,
    onSelectPlayer,
    loading = false,
}: ProfileSelectionListProps) {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const { dict } = useDictionary();

    const handleSelect = (playerId: string) => {
        setSelectedPlayerId(playerId);
    };

    const handleConfirm = () => {
        if (selectedPlayerId) {
            onSelectPlayer(selectedPlayerId);
        }
    };

    // Sort players by match_score (descending)
    const sortedPlayers = [...players].sort((a, b) =>
        (b.match_score || 0) - (a.match_score || 0)
    );

    return (
        <div className="space-y-4">
            <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    {dict.profileSetup?.selectPlayer?.title || "Multiple Players Found"}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                    {dict.profileSetup?.selectPlayer?.description ||
                        "We found multiple players with a matching surname. Please select your profile:"}
                </p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {sortedPlayers.map((player) => (
                    <Card
                        key={player.id}
                        className={`cursor-pointer transition-all duration-200 ${selectedPlayerId === player.id
                            ? "border-green-500 border-2 bg-green-50"
                            : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                            }`}
                        onClick={() => handleSelect(player.id)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-full ${selectedPlayerId === player.id
                                            ? "bg-green-100"
                                            : "bg-blue-100"
                                            }`}
                                    >
                                        {selectedPlayerId === player.id ? (
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <User className="h-5 w-5 text-blue-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            {player.first_name} {player.last_name}
                                        </p>
                                        {player.match_score && player.match_score >= 90 && (
                                            <p className="text-xs text-green-600 font-medium">
                                                {dict.profileSetup?.selectPlayer?.highMatch || "High match confidence"}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    {selectedPlayerId === player.id && (
                                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                                            {dict.profileSetup?.selectPlayer?.selected || "Selected"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="pt-4 border-t">
                <Button
                    onClick={handleConfirm}
                    disabled={!selectedPlayerId || loading}
                    className="w-full"
                    size="lg"
                >
                    {loading ? (
                        <span className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            {dict.profileSetup?.selectPlayer?.claiming || "Claiming..."}
                        </span>
                    ) : (
                        dict.profileSetup?.selectPlayer?.confirmButton || "Claim Selected Profile"
                    )}
                </Button>
            </div>
        </div>
    );
}

