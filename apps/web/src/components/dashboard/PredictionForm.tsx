'use client';

import { Button, Badge } from '@netprophet/ui';
import { useTheme } from '../Providers';

interface PredictionOptions {
    winner: string;
    matchResult: string;
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

interface MatchDetails {
    player1: { name: string; country: string; ranking: number; odds: number; wins: number; losses: number };
    player2: { name: string; country: string; ranking: number; odds: number; wins: number; losses: number };
    round: string;
    format: string;
}

interface PredictionFormProps {
    formPredictions: PredictionOptions;
    onPredictionChange: (type: keyof PredictionOptions, value: string) => void;
    details: MatchDetails;
    isBestOf5: boolean;
    setsToShowFromResult: number;
    setWinnersFromResult: string[];
    renderSetScoreDropdown: (setNumber: number, value: string, onChange: (value: string) => void) => JSX.Element;
    getSetScore: (setNumber: number) => string;
    setSetScore: (setNumber: number, value: string) => void;
    getSetWinner: (setNumber: number) => string;
    setSetWinner: (setNumber: number, value: string) => void;
}

export function PredictionForm({
    formPredictions,
    onPredictionChange,
    details,
    isBestOf5,
    setsToShowFromResult,
    setWinnersFromResult,
    renderSetScoreDropdown,
    getSetScore,
    setSetScore,
    getSetWinner,
    setSetWinner
}: PredictionFormProps) {
    const { theme } = useTheme();

    return (
        <div className="space-y-6">
            {/* Match Winner */}
            <div className="space-y-3">
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Match Winner</h3>
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant={formPredictions.winner === details.player1.name ? "default" : "outline"}
                        onClick={() => onPredictionChange('winner', details.player1.name)}
                        className="h-12"
                    >
                        {details.player1.name.split(' ')[1]}
                    </Button>
                    <Button
                        variant={formPredictions.winner === details.player2.name ? "default" : "outline"}
                        onClick={() => onPredictionChange('winner', details.player2.name)}
                        className="h-12"
                    >
                        {details.player2.name.split(' ')[1]}
                    </Button>
                </div>
            </div>

            {/* Match Result */}
            {formPredictions.winner && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Match Result</h3>
                        <Badge variant="secondary" className="text-xs">
                            {isBestOf5 ? 'Best of 5' : 'Best of 3'}
                        </Badge>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>How will {formPredictions.winner.split(' ')[1]} win the match?</p>
                    <div className="grid grid-cols-2 gap-3">
                        {isBestOf5 ? (
                            <>
                                {formPredictions.winner === details.player1.name ? (
                                    <>
                                        <Button
                                            variant={formPredictions.matchResult === '3-0' ? "default" : "outline"}
                                            onClick={() => onPredictionChange('matchResult', '3-0')}
                                            className="h-12"
                                        >
                                            3-0
                                        </Button>
                                        <Button
                                            variant={formPredictions.matchResult === '3-1' ? "default" : "outline"}
                                            onClick={() => onPredictionChange('matchResult', '3-1')}
                                            className="h-12"
                                        >
                                            3-1
                                        </Button>
                                        <Button
                                            variant={formPredictions.matchResult === '3-2' ? "default" : "outline"}
                                            onClick={() => onPredictionChange('matchResult', '3-2')}
                                            className="h-12"
                                        >
                                            3-2
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant={formPredictions.matchResult === '0-3' ? "default" : "outline"}
                                            onClick={() => onPredictionChange('matchResult', '0-3')}
                                            className="h-12"
                                        >
                                            0-3
                                        </Button>
                                        <Button
                                            variant={formPredictions.matchResult === '1-3' ? "default" : "outline"}
                                            onClick={() => onPredictionChange('matchResult', '1-3')}
                                            className="h-12"
                                        >
                                            1-3
                                        </Button>
                                        <Button
                                            variant={formPredictions.matchResult === '2-3' ? "default" : "outline"}
                                            onClick={() => onPredictionChange('matchResult', '2-3')}
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
                                            onClick={() => onPredictionChange('matchResult', '2-0')}
                                            className="h-12"
                                        >
                                            2-0
                                        </Button>
                                        <Button
                                            variant={formPredictions.matchResult === '2-1' ? "default" : "outline"}
                                            onClick={() => onPredictionChange('matchResult', '2-1')}
                                            className="h-12"
                                        >
                                            2-1
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant={formPredictions.matchResult === '0-2' ? "default" : "outline"}
                                            onClick={() => onPredictionChange('matchResult', '0-2')}
                                            className="h-12"
                                        >
                                            0-2
                                        </Button>
                                        <Button
                                            variant={formPredictions.matchResult === '1-2' ? "default" : "outline"}
                                            onClick={() => onPredictionChange('matchResult', '1-2')}
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

            {/* Detailed Set Scores */}
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

            {/* Set Winners */}
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

            {/* Tie-break */}
            <div className="space-y-3">
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Will there be a tie-break?</h3>
                <p className="text-sm text-gray-600">
                    Will there be a tie-break in the match?
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant={formPredictions.tieBreak === 'Yes' ? "default" : "outline"}
                        onClick={() => onPredictionChange('tieBreak', 'Yes')}
                        className="h-12"
                    >
                        Yes
                    </Button>
                    <Button
                        variant={formPredictions.tieBreak === 'No' ? "default" : "outline"}
                        onClick={() => onPredictionChange('tieBreak', 'No')}
                        className="h-12"
                    >
                        No
                    </Button>
                </div>
            </div>

            {/* Total Games */}
            <div className="space-y-3">
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Total Games in Match</h3>
                <p className="text-sm text-gray-600">
                    What is the total number of games played in the match?
                </p>
                <select
                    value={formPredictions.totalGames}
                    onChange={(e) => onPredictionChange('totalGames', e.target.value)}
                    className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
                >
                    <option value="">Select total games</option>
                    <option value="Under 18">Under 18</option>
                    <option value="18-22">18-22</option>
                    <option value="23-27">23-27</option>
                    <option value="28-32">28-32</option>
                    <option value="Over 32">Over 32</option>
                </select>
            </div>

            {/* Most Aces */}
            <div className="space-y-3">
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Most Aces</h3>
                <p className="text-sm text-gray-600">
                    Who leads in aces during the match?
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant={formPredictions.acesLeader === details.player1.name ? "default" : "outline"}
                        onClick={() => onPredictionChange('acesLeader', details.player1.name)}
                        className="h-12"
                    >
                        {details.player1.name.split(' ')[1]}
                    </Button>
                    <Button
                        variant={formPredictions.acesLeader === details.player2.name ? "default" : "outline"}
                        onClick={() => onPredictionChange('acesLeader', details.player2.name)}
                        className="h-12"
                    >
                        {details.player2.name.split(' ')[1]}
                    </Button>
                </div>
            </div>

            {/* Total Double Faults */}
            <div className="space-y-3">
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Total Double Faults</h3>
                <p className="text-sm text-gray-600">
                    What is the total number of double faults in the match?
                </p>
                <select
                    value={formPredictions.doubleFaults}
                    onChange={(e) => onPredictionChange('doubleFaults', e.target.value)}
                    className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
                >
                    <option value="">Select double faults</option>
                    <option value="Under 5">Under 5</option>
                    <option value="5-8">5-8</option>
                    <option value="9-12">9-12</option>
                    <option value="Over 12">Over 12</option>
                </select>
            </div>

            {/* Total Break Points */}
            <div className="space-y-3">
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Total Break Points</h3>
                <p className="text-sm text-gray-600">
                    What is the total number of break points faced in the match?
                </p>
                <select
                    value={formPredictions.breakPoints}
                    onChange={(e) => onPredictionChange('breakPoints', e.target.value)}
                    className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
                >
                    <option value="">Select break points</option>
                    <option value="Under 8">Under 8</option>
                    <option value="8-12">8-12</option>
                    <option value="13-17">13-17</option>
                    <option value="Over 17">Over 17</option>
                </select>
            </div>
        </div>
    );
} 