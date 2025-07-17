'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateOdds, formatOdds, type PlayerOddsData, type MatchContext } from '@netprophet/lib';

// Mock player data for demo
const demoPlayers: PlayerOddsData[] = [
    {
        id: '1',
        firstName: 'Γιώργος',
        lastName: 'Παπαδόπουλος',
        ntrpRating: 4.5,
        wins: 15,
        losses: 8,
        last5: ['W', 'W', 'L', 'W', 'L'],
        currentStreak: 3,
        streakType: 'W',
        surfacePreference: 'Hard Court',
        surfaceWinRates: {
            hardCourt: 0.75,
            clayCourt: 0.45,
            grassCourt: 0.60,
            indoor: 0.70
        },
        aggressiveness: 7,
        stamina: 8,
        consistency: 6,
        age: 28,
        hand: 'right',
        club: 'Ολυμπιακός',
        notes: 'Strong baseline player',
        lastMatchDate: '2024-01-15',
        fatigueLevel: 2,
        injuryStatus: 'healthy',
        seasonalForm: 0.68
    },
    {
        id: '2',
        firstName: 'Μάριος',
        lastName: 'Κωνσταντίνου',
        ntrpRating: 3.5,
        wins: 12,
        losses: 10,
        last5: ['L', 'W', 'W', 'L', 'W'],
        currentStreak: 1,
        streakType: 'W',
        surfacePreference: 'Clay Court',
        surfaceWinRates: {
            hardCourt: 0.40,
            clayCourt: 0.80,
            grassCourt: 0.35,
            indoor: 0.45
        },
        aggressiveness: 5,
        stamina: 7,
        consistency: 8,
        age: 25,
        hand: 'right',
        club: 'Παναθηναϊκός',
        notes: 'Consistent player',
        lastMatchDate: '2024-01-12',
        fatigueLevel: 4,
        injuryStatus: 'healthy',
        seasonalForm: 0.55
    },
    {
        id: '3',
        firstName: 'Νίκος',
        lastName: 'Αλεξίου',
        ntrpRating: 5.0,
        wins: 20,
        losses: 5,
        last5: ['W', 'W', 'W', 'W', 'W'],
        currentStreak: 5,
        streakType: 'W',
        surfacePreference: 'Grass Court',
        surfaceWinRates: {
            hardCourt: 0.85,
            clayCourt: 0.70,
            grassCourt: 0.90,
            indoor: 0.80
        },
        aggressiveness: 9,
        stamina: 9,
        consistency: 7,
        age: 30,
        hand: 'left',
        club: 'ΑΕΚ',
        notes: 'Top player',
        lastMatchDate: '2024-01-14',
        fatigueLevel: 1,
        injuryStatus: 'healthy',
        seasonalForm: 0.82
    }
];

// Shared H2H records: key is sorted player IDs (e.g., '1-2')
type H2HRecord = {
    player1Id: string;
    player2Id: string;
    player1Wins: number;
    player2Wins: number;
    lastMatchResult?: 'W' | 'L'; // W = player1 won, L = player2 won
    lastMatchDate?: string;
};

const initialH2HRecords: Record<string, H2HRecord> = {
    '1-2': { player1Id: '1', player2Id: '2', player1Wins: 2, player2Wins: 0, lastMatchResult: 'W', lastMatchDate: '2024-01-10' },
    '1-3': { player1Id: '1', player2Id: '3', player1Wins: 1, player2Wins: 3, lastMatchResult: 'L', lastMatchDate: '2024-01-08' },
    '2-3': { player1Id: '2', player2Id: '3', player1Wins: 1, player2Wins: 2, lastMatchResult: 'L', lastMatchDate: '2024-01-09' }
};

function getH2HKey(id1: string, id2: string) {
    return [id1, id2].sort().join('-');
}

export default function OddsDemoPage() {
    const [player1, setPlayer1] = useState<PlayerOddsData>(demoPlayers[0]);
    const [player2, setPlayer2] = useState<PlayerOddsData>(demoPlayers[1]);
    const [matchContext, setMatchContext] = useState<MatchContext>({
        surface: 'Hard Court'
    });
    const [h2hRecords, setH2hRecords] = useState<Record<string, H2HRecord>>(initialH2HRecords);
    const [oddsResult, setOddsResult] = useState<any>(null);

    // Get H2H record for the selected pair
    const h2hKey = getH2HKey(player1.id, player2.id);
    const h2h = h2hRecords[h2hKey] || { player1Id: player1.id, player2Id: player2.id, player1Wins: 0, player2Wins: 0 };
    // Determine which player is player1/player2 in the record
    const isDirect = h2h.player1Id === player1.id;
    const player1Wins = isDirect ? h2h.player1Wins : h2h.player2Wins;
    const player2Wins = isDirect ? h2h.player2Wins : h2h.player1Wins;
    const lastMatchResult = isDirect ? h2h.lastMatchResult : h2h.lastMatchResult === 'W' ? 'L' : h2h.lastMatchResult === 'L' ? 'W' : undefined;
    const lastMatchDate = h2h.lastMatchDate;

    const calculateMatchOdds = () => {
        try {
            // Pass the H2H record for this matchup to the odds algorithm
            const result = calculateOdds(player1, player2, matchContext, {
                wins: player1Wins,
                losses: player2Wins,
                lastMatchResult,
                lastMatchDate
            });
            setOddsResult(result);
        } catch (error) {
            console.error('Error calculating odds:', error);
            alert('Error calculating odds. Check console for details.');
        }
    };

    const updatePlayerField = (playerId: string, field: keyof PlayerOddsData, value: any) => {
        const player = playerId === '1' ? player1 : player2;
        const setPlayer = playerId === '1' ? setPlayer1 : setPlayer2;

        setPlayer({ ...player, [field]: value });
    };

    const getWinRate = (wins: number, losses: number) => {
        const total = wins + losses;
        return total > 0 ? Math.round((wins / total) * 100) : 0;
    };

    const getLast5Display = (last5: string[]) => {
        return last5.map((result, index) => (
            <span
                key={index}
                className={`w-6 h-6 rounded-full text-xs font-bold inline-flex items-center justify-center mr-1 ${result === 'W' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
            >
                {result}
            </span>
        ));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">🧠 Odds Algorithm Demo</h1>
                    <p className="text-gray-600 mt-2">
                        Test the odds calculation algorithm with different player data and match contexts
                    </p>
                </div>
                <Button
                    onClick={calculateMatchOdds}
                    className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:scale-105 text-white font-bold"
                >
                    🎯 Calculate Odds
                </Button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Player 1 Configuration */}
                <Card className="transition-all duration-200 hover:shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            🎾 Player 1 Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Player</Label>
                                <Select
                                    value={player1.id}
                                    onValueChange={(value) => {
                                        const selected = demoPlayers.find(p => p.id === value);
                                        if (selected) setPlayer1(selected);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {demoPlayers.map(player => (
                                            <SelectItem key={player.id} value={player.id}>
                                                {player.firstName} {player.lastName} (NTRP: {player.ntrpRating})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>NTRP Rating</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    min="1.0"
                                    max="7.0"
                                    value={player1.ntrpRating}
                                    onChange={(e) => updatePlayerField('1', 'ntrpRating', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Wins</Label>
                                <Input
                                    type="number"
                                    value={player1.wins}
                                    onChange={(e) => updatePlayerField('1', 'wins', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <Label>Losses</Label>
                                <Input
                                    type="number"
                                    value={player1.losses}
                                    onChange={(e) => updatePlayerField('1', 'losses', parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Surface Preference</Label>
                            <Select
                                value={player1.surfacePreference}
                                onValueChange={(value) => updatePlayerField('1', 'surfacePreference', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Hard Court">Hard Court</SelectItem>
                                    <SelectItem value="Clay Court">Clay Court</SelectItem>
                                    <SelectItem value="Grass Court">Grass Court</SelectItem>
                                    <SelectItem value="Indoor">Indoor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-sm font-semibold text-blue-800 mb-2">Current Stats</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>Win Rate: {getWinRate(player1.wins, player1.losses)}%</div>
                                <div>Last 5: {getLast5Display(player1.last5)}</div>
                                <div>Streak: {player1.currentStreak} {player1.streakType}</div>
                                <div>Age: {player1.age}</div>
                                <div>Fatigue: {player1.fatigueLevel || 0}/10</div>
                                <div>Season: {((player1.seasonalForm || 0) * 100).toFixed(0)}%</div>
                            </div>
                            {player1.surfaceWinRates && (
                                <div className="mt-2 pt-2 border-t border-blue-200">
                                    <div className="text-xs font-semibold text-blue-700 mb-1">Surface Win Rates:</div>
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        <div>Hard: {((player1.surfaceWinRates.hardCourt || 0) * 100).toFixed(0)}%</div>
                                        <div>Clay: {((player1.surfaceWinRates.clayCourt || 0) * 100).toFixed(0)}%</div>
                                        <div>Grass: {((player1.surfaceWinRates.grassCourt || 0) * 100).toFixed(0)}%</div>
                                        <div>Indoor: {((player1.surfaceWinRates.indoor || 0) * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                            )}
                            {player1.headToHeadRecord && (
                                <div className="mt-2 pt-2 border-t border-blue-200">
                                    <div className="text-xs font-semibold text-blue-700 mb-1">H2H Record:</div>
                                    <div className="text-xs">
                                        {player1.headToHeadRecord.wins}-{player1.headToHeadRecord.losses}
                                        ({((player1.headToHeadRecord.wins / (player1.headToHeadRecord.wins + player1.headToHeadRecord.losses)) * 100).toFixed(0)}%)
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* H2H Display for Player 1 */}
                        <div className="bg-blue-50 p-3 rounded-lg mt-2">
                            <div className="text-xs font-semibold text-blue-700 mb-1">H2H vs {player2.firstName}:</div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-blue-800">{player1Wins}-{player2Wins}</span>
                                <span className="text-xs text-blue-600">({(player1Wins + player2Wins > 0 ? (player1Wins / (player1Wins + player2Wins) * 100).toFixed(0) : 0)}%)</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Player 2 Configuration */}
                <Card className="transition-all duration-200 hover:shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            🎾 Player 2 Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Player</Label>
                                <Select
                                    value={player2.id}
                                    onValueChange={(value) => {
                                        const selected = demoPlayers.find(p => p.id === value);
                                        if (selected) setPlayer2(selected);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {demoPlayers.map(player => (
                                            <SelectItem key={player.id} value={player.id}>
                                                {player.firstName} {player.lastName} (NTRP: {player.ntrpRating})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>NTRP Rating</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    min="1.0"
                                    max="7.0"
                                    value={player2.ntrpRating}
                                    onChange={(e) => updatePlayerField('2', 'ntrpRating', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Wins</Label>
                                <Input
                                    type="number"
                                    value={player2.wins}
                                    onChange={(e) => updatePlayerField('2', 'wins', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <Label>Losses</Label>
                                <Input
                                    type="number"
                                    value={player2.losses}
                                    onChange={(e) => updatePlayerField('2', 'losses', parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Surface Preference</Label>
                            <Select
                                value={player2.surfacePreference}
                                onValueChange={(value) => updatePlayerField('2', 'surfacePreference', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Hard Court">Hard Court</SelectItem>
                                    <SelectItem value="Clay Court">Clay Court</SelectItem>
                                    <SelectItem value="Grass Court">Grass Court</SelectItem>
                                    <SelectItem value="Indoor">Indoor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-sm font-semibold text-green-800 mb-2">Current Stats</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>Win Rate: {getWinRate(player2.wins, player2.losses)}%</div>
                                <div>Last 5: {getLast5Display(player2.last5)}</div>
                                <div>Streak: {player2.currentStreak} {player2.streakType}</div>
                                <div>Age: {player2.age}</div>
                                <div>Fatigue: {player2.fatigueLevel || 0}/10</div>
                                <div>Season: {((player2.seasonalForm || 0) * 100).toFixed(0)}%</div>
                            </div>
                            {player2.surfaceWinRates && (
                                <div className="mt-2 pt-2 border-t border-green-200">
                                    <div className="text-xs font-semibold text-green-700 mb-1">Surface Win Rates:</div>
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        <div>Hard: {((player2.surfaceWinRates.hardCourt || 0) * 100).toFixed(0)}%</div>
                                        <div>Clay: {((player2.surfaceWinRates.clayCourt || 0) * 100).toFixed(0)}%</div>
                                        <div>Grass: {((player2.surfaceWinRates.grassCourt || 0) * 100).toFixed(0)}%</div>
                                        <div>Indoor: {((player2.surfaceWinRates.indoor || 0) * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                            )}
                            {player2.headToHeadRecord && (
                                <div className="mt-2 pt-2 border-t border-green-200">
                                    <div className="text-xs font-semibold text-green-700 mb-1">H2H Record:</div>
                                    <div className="text-xs">
                                        {player2.headToHeadRecord.wins}-{player2.headToHeadRecord.losses}
                                        ({((player2.headToHeadRecord.wins / (player2.headToHeadRecord.wins + player2.headToHeadRecord.losses)) * 100).toFixed(0)}%)
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* H2H Display for Player 2 */}
                        <div className="bg-green-50 p-3 rounded-lg mt-2">
                            <div className="text-xs font-semibold text-green-700 mb-1">H2H vs {player1.firstName}:</div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-green-800">{player2Wins}-{player1Wins}</span>
                                <span className="text-xs text-green-600">({(player1Wins + player2Wins > 0 ? (player2Wins / (player1Wins + player2Wins) * 100).toFixed(0) : 0)}%)</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* H2H Editor */}
            <Card className="transition-all duration-200 hover:shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        🤝 Head-to-Head Editor
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-4">
                        <div>
                            <span className="font-semibold text-blue-800">{player1.firstName}</span> wins:
                            <Input
                                type="number"
                                min={0}
                                value={player1Wins}
                                onChange={e => {
                                    const newWins = parseInt(e.target.value) || 0;
                                    setH2hRecords(prev => ({
                                        ...prev,
                                        [h2hKey]: {
                                            ...h2h,
                                            player1Wins: isDirect ? newWins : h2h.player1Wins,
                                            player2Wins: isDirect ? h2h.player2Wins : newWins
                                        }
                                    }));
                                }}
                                className="w-16 ml-2"
                            />
                        </div>
                        <div>
                            <span className="font-semibold text-green-800">{player2.firstName}</span> wins:
                            <Input
                                type="number"
                                min={0}
                                value={player2Wins}
                                onChange={e => {
                                    const newWins = parseInt(e.target.value) || 0;
                                    setH2hRecords(prev => ({
                                        ...prev,
                                        [h2hKey]: {
                                            ...h2h,
                                            player1Wins: isDirect ? h2h.player1Wins : newWins,
                                            player2Wins: isDirect ? newWins : h2h.player2Wins
                                        }
                                    }));
                                }}
                                className="w-16 ml-2"
                            />
                        </div>
                        <div>
                            <span className="font-semibold">Last Match Result:</span>
                            <Select
                                value={lastMatchResult || ''}
                                onValueChange={val => {
                                    setH2hRecords(prev => ({
                                        ...prev,
                                        [h2hKey]: {
                                            ...h2h,
                                            lastMatchResult: isDirect ? val as 'W' | 'L' : val === 'W' ? 'L' : val === 'L' ? 'W' : undefined
                                        }
                                    }));
                                }}
                            >
                                <SelectTrigger className="w-24 ml-2">
                                    <SelectValue placeholder="Result" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="W">{player1.firstName} Win</SelectItem>
                                    <SelectItem value="L">{player2.firstName} Win</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <span className="font-semibold">Last Match Date:</span>
                            <Input
                                type="date"
                                value={lastMatchDate ? lastMatchDate.substring(0, 10) : ''}
                                onChange={e => {
                                    setH2hRecords(prev => ({
                                        ...prev,
                                        [h2hKey]: {
                                            ...h2h,
                                            lastMatchDate: e.target.value
                                        }
                                    }));
                                }}
                                className="w-40 ml-2"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Match Context */}
            <Card className="transition-all duration-200 hover:shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        🏟️ Match Context
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <Label>Surface</Label>
                            <Select
                                value={matchContext.surface}
                                onValueChange={(value: any) => setMatchContext({ ...matchContext, surface: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Hard Court">Hard Court</SelectItem>
                                    <SelectItem value="Clay Court">Clay Court</SelectItem>
                                    <SelectItem value="Grass Court">Grass Court</SelectItem>
                                    <SelectItem value="Indoor">Indoor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            {oddsResult && (
                <Card className="transition-all duration-200 hover:shadow-lg border-2 border-blue-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-800">
                            🎯 Odds Calculation Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Win Probabilities */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">
                                    {(oddsResult.player1WinProbability * 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600">Player 1 Win Probability</div>
                                <div className="text-lg font-semibold text-blue-800 mt-1">
                                    {formatOdds(oddsResult.player1Odds)}
                                </div>
                                <div className="text-xs text-gray-500">Decimal: {oddsResult.player1Odds}</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                    {(oddsResult.player2WinProbability * 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600">Player 2 Win Probability</div>
                                <div className="text-lg font-semibold text-green-800 mt-1">
                                    {formatOdds(oddsResult.player2Odds)}
                                </div>
                                <div className="text-xs text-gray-500">Decimal: {oddsResult.player2Odds}</div>
                            </div>
                        </div>

                        {/* Factors Breakdown */}
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3">📊 Factor Analysis</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(oddsResult.factors).map(([factor, value]) => (
                                    <div key={factor} className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-sm font-medium text-gray-700 capitalize">
                                            {factor.replace(/([A-Z])/g, ' $1').trim()}
                                        </div>
                                        <div className={`text-lg font-bold ${(value as number) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {(value as number) > 0 ? '+' : ''}{(value as number).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Confidence and Recommendations */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">🎯 Confidence</h4>
                                <div className="bg-yellow-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {(oddsResult.confidence * 100).toFixed(0)}%
                                    </div>
                                    <div className="text-sm text-gray-600">Algorithm Confidence</div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">💡 Recommendations</h4>
                                <div className="space-y-2">
                                    {oddsResult.recommendations.map((rec: string, index: number) => (
                                        <div key={index} className="bg-purple-50 p-3 rounded-lg">
                                            <div className="text-sm text-purple-800">{rec}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 