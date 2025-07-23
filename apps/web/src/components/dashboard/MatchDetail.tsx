'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@netprophet/ui';

import { Match } from '@/types/dashboard';
import { usePredictionSlip } from '@/context/PredictionSlipContext';

interface MatchDetailProps {
    match: Match | null;
    onAddToPredictionSlip: (match: Match, prediction: string) => void;
    onBack: () => void;
}

// Enhanced prediction types
interface PredictionOptions {
    winner: string;
    matchResult: string; // e.g., "3-0", "3-1", "3-2", "2-1", "2-0"
    set1Score: string;
    set2Score: string;
    set3Score: string;
    set4Score: string;
    set5Score: string;
    set1Winner: string;
    set2Winner: string;
    set3Winner: string;
    set4Winner: string;
    set5Winner: string;
    tieBreak: string;
    totalGames: string;
    acesLeader: string;
    doubleFaults: string;
    breakPoints: string;
}

// Mock match data with additional details
const getMatchDetails = (matchId: number) => {
    const matchDetails = {
        1: {
            tournament: 'Roland Garros 2024',
            player1: { name: 'Rafael Nadal', country: '🇪🇸', ranking: 1, odds: 2.15, wins: 22, losses: 8 },
            player2: { name: 'Novak Djokovic', country: '🇷🇸', ranking: 2, odds: 1.85, wins: 24, losses: 6 },
            points: 250,
            headToHead: 'Nadal leads 30-29',
            surface: 'Clay',
            round: 'Final',
            format: 'best-of-5' // Grand Slam final
        },
        2: {
            tournament: 'Roland Garros 2024',
            player1: { name: 'Carlos Alcaraz', country: '🇪🇸', ranking: 3, odds: 1.65, wins: 20, losses: 10 },
            player2: { name: 'Daniil Medvedev', country: '🇷🇺', ranking: 4, odds: 2.35, wins: 18, losses: 12 },
            points: 200,
            headToHead: 'Alcaraz leads 3-2',
            surface: 'Clay',
            round: 'Semi-Final',
            format: 'best-of-5' // Grand Slam semi-final
        },
        3: {
            tournament: 'Roland Garros 2024',
            player1: { name: 'Jannik Sinner', country: '🇮🇹', ranking: 5, odds: 1.95, wins: 19, losses: 11 },
            player2: { name: 'Alexander Zverev', country: '🇩🇪', ranking: 6, odds: 1.95, wins: 17, losses: 13 },
            points: 180,
            headToHead: 'Sinner leads 4-3',
            surface: 'Clay',
            round: 'Quarter-Final',
            format: 'best-of-5' // Grand Slam quarter-final
        },
        4: {
            tournament: 'Wimbledon 2024',
            player1: { name: 'Andy Murray', country: '🇬🇧', ranking: 7, odds: 2.50, wins: 15, losses: 15 },
            player2: { name: 'Stefanos Tsitsipas', country: '🇬🇷', ranking: 8, odds: 1.60, wins: 21, losses: 9 },
            points: 150,
            headToHead: 'Tsitsipas leads 2-1',
            surface: 'Grass',
            round: 'Third Round',
            format: 'best-of-3' // Early rounds
        }
    };
    return matchDetails[matchId as keyof typeof matchDetails];
};

function createEmptyPredictions(): PredictionOptions {
    return {
        winner: '',
        matchResult: '',
        set1Score: '',
        set2Score: '',
        set3Score: '',
        set4Score: '',
        set5Score: '',
        set1Winner: '',
        set2Winner: '',
        set3Winner: '',
        set4Winner: '',
        set5Winner: '',
        tieBreak: '',
        totalGames: '',
        acesLeader: '',
        doubleFaults: '',
        breakPoints: ''
    };
}

export function MatchDetail({ match, onAddToPredictionSlip, onBack }: MatchDetailProps) {
    const { predictions, addPrediction, removePrediction } = usePredictionSlip();
    // Local state for the form fields
    const [formPredictions, setFormPredictions] = useState<PredictionOptions>(createEmptyPredictions());

    // Clear predictions when match changes
    useEffect(() => {
        if (match) {
            const existing = predictions.find(p => p.matchId === match.id);
            if (existing && typeof existing.prediction === 'object' && existing.prediction !== null && 'winner' in existing.prediction) {
                setFormPredictions(existing.prediction);
            } else {
                setFormPredictions(createEmptyPredictions());
            }
        }
    }, [match, predictions]);

    if (!match) {
        return (
            <div className="flex-1 p-6">
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎾</div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select a Match</h2>
                    <p className="text-gray-600">Choose a match from the sidebar to view details and make predictions</p>
                </div>
            </div>
        );
    }

    const details = getMatchDetails(match.id);
    if (!details) {
        return (
            <div className="flex-1 p-6">
                <div className="text-center py-12">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Match Not Found</h2>
                    <p className="text-gray-600">Details for this match are not available</p>
                </div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'live':
                return 'destructive';
            case 'upcoming':
                return 'secondary';
            case 'finished':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const handlePredictionChange = (type: keyof PredictionOptions, value: string) => {
        setFormPredictions(prev => {
            const newPredictions = { ...prev, [type]: value };

            // If winner changes, clear dependent predictions
            if (type === 'winner') {
                newPredictions.matchResult = '';
                newPredictions.set1Score = '';
                newPredictions.set2Score = '';
                newPredictions.set3Score = '';
                newPredictions.set4Score = '';
                newPredictions.set5Score = '';
                newPredictions.set1Winner = '';
                newPredictions.set2Winner = '';
                newPredictions.set3Winner = '';
                newPredictions.set4Winner = '';
                newPredictions.set5Winner = '';
            }

            // If match result changes, clear set-specific predictions
            if (type === 'matchResult') {
                newPredictions.set1Score = '';
                newPredictions.set2Score = '';
                newPredictions.set3Score = '';
                newPredictions.set4Score = '';
                newPredictions.set5Score = '';
                newPredictions.set1Winner = '';
                newPredictions.set2Winner = '';
                newPredictions.set3Winner = '';
                newPredictions.set4Winner = '';
                newPredictions.set5Winner = '';
            }

            return newPredictions;
        });
    };

    const handleSubmitPredictions = () => {
        // Build a structured prediction object
        const predictionParts: string[] = [];

        if (formPredictions.winner) {
            predictionParts.push(`Winner: ${formPredictions.winner}`);
        }

        if (formPredictions.matchResult) {
            predictionParts.push(`Result: ${formPredictions.matchResult}`);
        }

        // Add set scores if available
        const setScores = [
            formPredictions.set1Score,
            formPredictions.set2Score,
            formPredictions.set3Score,
            formPredictions.set4Score,
            formPredictions.set5Score
        ].filter(score => score !== '');

        if (setScores.length > 0) {
            predictionParts.push(`Sets: ${setScores.join(', ')}`);
        }

        // Add other predictions
        if (formPredictions.tieBreak) {
            predictionParts.push(`Tie-break: ${formPredictions.tieBreak}`);
        }

        if (formPredictions.totalGames) {
            predictionParts.push(`Total Games: ${formPredictions.totalGames}`);
        }

        if (formPredictions.acesLeader) {
            predictionParts.push(`Most Aces: ${formPredictions.acesLeader}`);
        }

        if (formPredictions.doubleFaults) {
            predictionParts.push(`Double Faults: ${formPredictions.doubleFaults}`);
        }

        if (formPredictions.breakPoints) {
            predictionParts.push(`Break Points: ${formPredictions.breakPoints}`);
        }

        const predictionText = predictionParts.join(' | ');

        if (predictionText) {
            addPrediction({
                matchId: match.id,
                match,
                prediction: formPredictions,
                points: match.points,
            });
            // Optionally, call onAddToPredictionSlip as well if needed
        }
    };

    const hasPredictions = Object.values(formPredictions).some(value => value !== '');
    const predictionCount = Object.values(formPredictions).filter(value => value !== '').length;

    // Helper function to render set score dropdowns
    const renderSetScoreDropdown = (setNumber: number, value: string, onChange: (value: string) => void) => (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
            <option value="">Select set {setNumber} score</option>
            <option value="6-0">6-0</option>
            <option value="6-1">6-1</option>
            <option value="6-2">6-2</option>
            <option value="6-3">6-3</option>
            <option value="6-4">6-4</option>
            <option value="7-5">7-5</option>
            <option value="7-6">7-6</option>
            <option value="6-7">6-7</option>
            <option value="5-7">5-7</option>
            <option value="4-6">4-6</option>
            <option value="3-6">3-6</option>
            <option value="2-6">2-6</option>
            <option value="1-6">1-6</option>
            <option value="0-6">0-6</option>
        </select>
    );

    // Determine which sets to show based on tournament format
    const isBestOf5 = details.format === 'best-of-5';
    const setsToShow = isBestOf5 ? 5 : 3;

    // Calculate how many sets to show based on selected match result
    const getSetsToShowFromResult = (matchResult: string): number => {
        if (!matchResult) return 0;

        const [sets1, sets2] = matchResult.split('-').map(Number);
        // Total sets played = winner's sets + loser's sets
        return sets1 + sets2;
    };

    const setsToShowFromResult = getSetsToShowFromResult(formPredictions.matchResult);

    // Helper function to get set score value
    const getSetScore = (setNumber: number): string => {
        switch (setNumber) {
            case 1: return formPredictions.set1Score;
            case 2: return formPredictions.set2Score;
            case 3: return formPredictions.set3Score;
            case 4: return formPredictions.set4Score;
            case 5: return formPredictions.set5Score;
            default: return '';
        }
    };

    // Helper function to set set score value
    const setSetScore = (setNumber: number, value: string) => {
        switch (setNumber) {
            case 1: handlePredictionChange('set1Score', value); break;
            case 2: handlePredictionChange('set2Score', value); break;
            case 3: handlePredictionChange('set3Score', value); break;
            case 4: handlePredictionChange('set4Score', value); break;
            case 5: handlePredictionChange('set5Score', value); break;
        }
    };

    // Helper function to get set winner value
    const getSetWinner = (setNumber: number): string => {
        switch (setNumber) {
            case 1: return formPredictions.set1Winner;
            case 2: return formPredictions.set2Winner;
            case 3: return formPredictions.set3Winner;
            case 4: return formPredictions.set4Winner;
            case 5: return formPredictions.set5Winner;
            default: return '';
        }
    };

    // Helper function to set set winner value
    const setSetWinner = (setNumber: number, value: string) => {
        switch (setNumber) {
            case 1: handlePredictionChange('set1Winner', value); break;
            case 2: handlePredictionChange('set2Winner', value); break;
            case 3: handlePredictionChange('set3Winner', value); break;
            case 4: handlePredictionChange('set4Winner', value); break;
            case 5: handlePredictionChange('set5Winner', value); break;
        }
    };

    // Calculate which sets each player wins based on match result
    const getSetWinnersFromResult = (matchResult: string, winner: string): string[] => {
        if (!matchResult || !winner) return [];

        const [sets1, sets2] = matchResult.split('-').map(Number);
        const isPlayer1Winner = winner === details.player1.name;
        const winnerSets = isPlayer1Winner ? sets1 : sets2;
        const loserSets = isPlayer1Winner ? sets2 : sets1;

        const setWinners: string[] = [];

        // Add winner's sets first (consecutive wins)
        for (let i = 0; i < winnerSets; i++) {
            setWinners.push(winner);
        }

        // Add loser's sets (if any)
        for (let i = 0; i < loserSets; i++) {
            setWinners.push(isPlayer1Winner ? details.player2.name : details.player1.name);
        }

        return setWinners;
    };

    const setWinnersFromResult = getSetWinnersFromResult(formPredictions.matchResult, formPredictions.winner);

    return (
        <div className="flex flex-col flex-1 min-h-0 w-full overflow-auto gap-6">
            <Card className="p-6">
                <CardTitle>{details.tournament}</CardTitle>
                <CardContent>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-400">{details.round} • {details.surface} • {match.court}</span>
                        <Badge variant={getStatusColor(match.status)}>
                            {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
            <Button onClick={onBack} variant="outline">Back to Matches</Button>
            <div className="space-y-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1">
                            <div className="space-y-4">
                                <Card className="hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <CardTitle className="text-center">{details.player1.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center space-y-4">
                                        <div className="text-4xl">{details.player1.country}</div>
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-600">World Ranking</div>
                                            <div className="text-2xl font-bold text-blue-600">#{details.player1.ranking}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="text-gray-600">Wins</div>
                                                <div className="font-semibold text-green-600">{details.player1.wins}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-600">Losses</div>
                                                <div className="font-semibold text-red-600">{details.player1.losses}</div>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-blue-600">{details.player1.odds}</div>
                                    </CardContent>
                                </Card>
                                <Card className="hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <CardTitle className="text-center">{details.player2.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center space-y-4">
                                        <div className="text-4xl">{details.player2.country}</div>
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-600">World Ranking</div>
                                            <div className="text-2xl font-bold text-blue-600">#{details.player2.ranking}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="text-gray-600">Wins</div>
                                                <div className="font-semibold text-green-600">{details.player2.wins}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-600">Losses</div>
                                                <div className="font-semibold text-red-600">{details.player2.losses}</div>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-blue-600">{details.player2.odds}</div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                        <div className="lg:col-span-2 flex flex-col h-full">
                            <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200 flex-1 flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-xl">Make Your Predictions</CardTitle>
                                    <p className="text-gray-600">Choose from multiple prediction types to maximize your points!</p>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto space-y-6 pb-20">
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-gray-900">Match Winner</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant={formPredictions.winner === details.player1.name ? "default" : "outline"}
                                                onClick={() => handlePredictionChange('winner', details.player1.name)}
                                                className="h-12"
                                            >
                                                {details.player1.name.split(' ')[1]}
                                            </Button>
                                            <Button
                                                variant={formPredictions.winner === details.player2.name ? "default" : "outline"}
                                                onClick={() => handlePredictionChange('winner', details.player2.name)}
                                                className="h-12"
                                            >
                                                {details.player2.name.split(' ')[1]}
                                            </Button>
                                        </div>
                                    </div>
                                    {formPredictions.winner && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-gray-900">Match Result</h3>
                                                <Badge variant="secondary" className="text-xs">
                                                    {isBestOf5 ? 'Best of 5' : 'Best of 3'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                How will {formPredictions.winner.split(' ')[1]} win the match?
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {isBestOf5 ? (
                                                    <>
                                                        {formPredictions.winner === details.player1.name ? (
                                                            <>
                                                                <Button
                                                                    variant={formPredictions.matchResult === '3-0' ? "default" : "outline"}
                                                                    onClick={() => handlePredictionChange('matchResult', '3-0')}
                                                                    className="h-12"
                                                                >
                                                                    3-0
                                                                </Button>
                                                                <Button
                                                                    variant={formPredictions.matchResult === '3-1' ? "default" : "outline"}
                                                                    onClick={() => handlePredictionChange('matchResult', '3-1')}
                                                                    className="h-12"
                                                                >
                                                                    3-1
                                                                </Button>
                                                                <Button
                                                                    variant={formPredictions.matchResult === '3-2' ? "default" : "outline"}
                                                                    onClick={() => handlePredictionChange('matchResult', '3-2')}
                                                                    className="h-12"
                                                                >
                                                                    3-2
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant={formPredictions.matchResult === '0-3' ? "default" : "outline"}
                                                                    onClick={() => handlePredictionChange('matchResult', '0-3')}
                                                                    className="h-12"
                                                                >
                                                                    0-3
                                                                </Button>
                                                                <Button
                                                                    variant={formPredictions.matchResult === '1-3' ? "default" : "outline"}
                                                                    onClick={() => handlePredictionChange('matchResult', '1-3')}
                                                                    className="h-12"
                                                                >
                                                                    1-3
                                                                </Button>
                                                                <Button
                                                                    variant={formPredictions.matchResult === '2-3' ? "default" : "outline"}
                                                                    onClick={() => handlePredictionChange('matchResult', '2-3')}
                                                                    className="h-12"
                                                                >
                                                                    2-3
                                                                </Button>
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {formPredictions.winner === details.player1.name ? (
                                                            <>
                                                                <Button
                                                                    variant={formPredictions.matchResult === '2-0' ? "default" : "outline"}
                                                                    onClick={() => handlePredictionChange('matchResult', '2-0')}
                                                                    className="h-12"
                                                                >
                                                                    2-0
                                                                </Button>
                                                                <Button
                                                                    variant={formPredictions.matchResult === '2-1' ? "default" : "outline"}
                                                                    onClick={() => handlePredictionChange('matchResult', '2-1')}
                                                                    className="h-12"
                                                                >
                                                                    2-1
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant={formPredictions.matchResult === '0-2' ? "default" : "outline"}
                                                                    onClick={() => handlePredictionChange('matchResult', '0-2')}
                                                                    className="h-12"
                                                                >
                                                                    0-2
                                                                </Button>
                                                                <Button
                                                                    variant={formPredictions.matchResult === '1-2' ? "default" : "outline"}
                                                                    onClick={() => handlePredictionChange('matchResult', '1-2')}
                                                                    className="h-12"
                                                                >
                                                                    1-2
                                                                </Button>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {formPredictions.matchResult && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-gray-900">Detailed Set Scores</h3>
                                                <Badge variant="secondary" className="text-xs">
                                                    {isBestOf5 ? 'Best of 5' : 'Best of 3'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Now predict the exact score for each set based on your {formPredictions.matchResult} prediction
                                                {setsToShowFromResult > 0 && (
                                                    <span className="font-semibold text-blue-600">
                                                        {' '}({setsToShowFromResult} set{setsToShowFromResult > 1 ? 's' : ''} to predict)
                                                    </span>
                                                )}
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {Array.from({ length: setsToShowFromResult }, (_, i) => (
                                                    <div key={i} className="space-y-2">
                                                        <h4 className="font-semibold text-gray-900">Set {i + 1}</h4>
                                                        {renderSetScoreDropdown(i + 1, getSetScore(i + 1), (value) => setSetScore(i + 1, value))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {formPredictions.matchResult && !['3-0', '0-3', '2-0', '0-2'].includes(formPredictions.matchResult) && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-gray-900">Set Winners</h3>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Who wins each set based on your {formPredictions.matchResult} prediction?
                                            </p>
                                            {Array.from({ length: setsToShowFromResult }, (_, i) => {
                                                const expectedWinner = setWinnersFromResult[i];
                                                const currentWinner = getSetWinner(i + 1);
                                                return (
                                                    <div key={i} className="space-y-2">
                                                        <h4 className="font-semibold text-gray-900">Set {i + 1} Winner</h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Button
                                                                variant={currentWinner === details.player1.name ? "default" : "outline"}
                                                                onClick={() => setSetWinner(i + 1, details.player1.name)}
                                                                className="h-12"
                                                            >
                                                                {details.player1.name.split(' ')[1]}
                                                            </Button>
                                                            <Button
                                                                variant={currentWinner === details.player2.name ? "default" : "outline"}
                                                                onClick={() => setSetWinner(i + 1, details.player2.name)}
                                                                className="h-12"
                                                            >
                                                                {details.player2.name.split(' ')[1]}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-gray-900">Will there be a tie-break?</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant={formPredictions.tieBreak === 'Yes' ? "default" : "outline"}
                                                onClick={() => handlePredictionChange('tieBreak', 'Yes')}
                                            >
                                                Yes
                                            </Button>
                                            <Button
                                                variant={formPredictions.tieBreak === 'No' ? "default" : "outline"}
                                                onClick={() => handlePredictionChange('tieBreak', 'No')}
                                            >
                                                No
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-gray-900">Total Games in Match</h3>
                                        <select
                                            value={formPredictions.totalGames}
                                            onChange={(e) => handlePredictionChange('totalGames', e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select total games</option>
                                            <option value="Under 18">Under 18</option>
                                            <option value="18-22">18-22</option>
                                            <option value="23-27">23-27</option>
                                            <option value="28-32">28-32</option>
                                            <option value="Over 32">Over 32</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-gray-900">Most Aces</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant={formPredictions.acesLeader === details.player1.name ? "default" : "outline"}
                                                onClick={() => handlePredictionChange('acesLeader', details.player1.name)}
                                            >
                                                {details.player1.name.split(' ')[1]}
                                            </Button>
                                            <Button
                                                variant={formPredictions.acesLeader === details.player2.name ? "default" : "outline"}
                                                onClick={() => handlePredictionChange('acesLeader', details.player2.name)}
                                            >
                                                {details.player2.name.split(' ')[1]}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-gray-900">Total Double Faults</h3>
                                        <select
                                            value={formPredictions.doubleFaults}
                                            onChange={(e) => handlePredictionChange('doubleFaults', e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select double faults</option>
                                            <option value="Under 5">Under 5</option>
                                            <option value="5-8">5-8</option>
                                            <option value="9-12">9-12</option>
                                            <option value="Over 12">Over 12</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-gray-900">Total Break Points</h3>
                                        <select
                                            value={formPredictions.breakPoints}
                                            onChange={(e) => handlePredictionChange('breakPoints', e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select break points</option>
                                            <option value="Under 8">Under 8</option>
                                            <option value="8-12">8-12</option>
                                            <option value="13-17">13-17</option>
                                            <option value="Over 17">Over 17</option>
                                        </select>
                                    </div>
                                </CardContent>
                                <div className="sticky bottom-0 bg-gradient-to-r from-blue-50 to-green-50 border-t border-blue-200 p-6 pt-4">
                                    <Button
                                        onClick={handleSubmitPredictions}
                                        disabled={!hasPredictions}
                                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                                        size="lg"
                                    >
                                        {hasPredictions ? `Add to Prediction Slip (${predictionCount})` : 'Select at least one prediction'}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-4 text-center">
                                <div className="text-sm text-gray-600 mb-1">Head to Head</div>
                                <div className="font-semibold text-gray-900">{details.headToHead}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <div className="text-sm text-gray-600 mb-1">Surface</div>
                                <div className="font-semibold text-gray-900">{details.surface}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <div className="text-sm text-gray-600 mb-1">Points Available</div>
                                <div className="font-semibold text-green-600">+{details.points}</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            {predictions.some(p => p.matchId === match.id) && (
                <Button
                    variant="outline"
                    className="mt-4 w-full border-red-400 text-red-600 hover:bg-red-50"
                    onClick={() => removePrediction(match.id)}
                >
                    Remove Prediction
                </Button>
            )}
        </div>
    );
} 