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
    surface: string;
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
        <div className="space-y-8">
            {/* Match Winner */}
            <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold text-white mb-4">Match Winner</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => onPredictionChange('winner', details.player1.name)}
                        className={`p-4 rounded-lg border transition-colors ${formPredictions.winner === details.player1.name
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                            }`}
                    >
                        <div className="text-lg font-semibold">{details.player1.name.split(' ')[1]}</div>
                        <div className="text-sm text-gray-400">{details.player1.odds.toFixed(2)}x</div>
                    </button>
                    <button
                        onClick={() => onPredictionChange('winner', details.player2.name)}
                        className={`p-4 rounded-lg border transition-colors ${formPredictions.winner === details.player2.name
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                            }`}
                    >
                        <div className="text-lg font-semibold">{details.player2.name.split(' ')[1]}</div>
                        <div className="text-sm text-gray-400">{details.player2.odds.toFixed(2)}x</div>
                    </button>
                </div>
            </div>

            {/* Match Result */}
            {formPredictions.winner && (
                <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Match Result</h3>
                        <div className="bg-purple-600/20 text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/30">
                            {isBestOf5 ? 'Best of 5' : 'Best of 3'}
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">How will {formPredictions.winner.split(' ')[1]} win the match?</p>
                    <div className="grid grid-cols-2 gap-4">
                        {isBestOf5 ? (
                            <>
                                {formPredictions.winner === details.player1.name ? (
                                    <>
                                        <button
                                            onClick={() => onPredictionChange('matchResult', '3-0')}
                                            className={`p-4 rounded-lg border transition-colors ${formPredictions.matchResult === '3-0'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-lg font-semibold">3-0</div>
                                            <div className="text-sm text-gray-400">Straight sets</div>
                                        </button>
                                        <button
                                            onClick={() => onPredictionChange('matchResult', '3-1')}
                                            className={`p-4 rounded-lg border transition-colors ${formPredictions.matchResult === '3-1'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-lg font-semibold">3-1</div>
                                            <div className="text-sm text-gray-400">Four sets</div>
                                        </button>
                                        <button
                                            onClick={() => onPredictionChange('matchResult', '3-2')}
                                            className={`p-4 rounded-lg border transition-colors ${formPredictions.matchResult === '3-2'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-lg font-semibold">3-2</div>
                                            <div className="text-sm text-gray-400">Five sets</div>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => onPredictionChange('matchResult', '0-3')}
                                            className={`p-4 rounded-lg border transition-colors ${formPredictions.matchResult === '0-3'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-lg font-semibold">0-3</div>
                                            <div className="text-sm text-gray-400">Straight sets</div>
                                        </button>
                                        <button
                                            onClick={() => onPredictionChange('matchResult', '1-3')}
                                            className={`p-4 rounded-lg border transition-colors ${formPredictions.matchResult === '1-3'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-lg font-semibold">1-3</div>
                                            <div className="text-sm text-gray-400">Four sets</div>
                                        </button>
                                        <button
                                            onClick={() => onPredictionChange('matchResult', '2-3')}
                                            className={`p-4 rounded-lg border transition-colors ${formPredictions.matchResult === '2-3'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-lg font-semibold">2-3</div>
                                            <div className="text-sm text-gray-400">Five sets</div>
                                        </button>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                {formPredictions.winner === details.player1.name ? (
                                    <>
                                        <button
                                            onClick={() => onPredictionChange('matchResult', '2-0')}
                                            className={`p-4 rounded-lg border transition-colors ${formPredictions.matchResult === '2-0'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-lg font-semibold">2-0</div>
                                            <div className="text-sm text-gray-400">Straight sets</div>
                                        </button>
                                        <button
                                            onClick={() => onPredictionChange('matchResult', '2-1')}
                                            className={`p-4 rounded-lg border transition-colors ${formPredictions.matchResult === '2-1'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-lg font-semibold">2-1</div>
                                            <div className="text-sm text-gray-400">Three sets</div>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => onPredictionChange('matchResult', '0-2')}
                                            className={`p-4 rounded-lg border transition-colors ${formPredictions.matchResult === '0-2'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-lg font-semibold">0-2</div>
                                            <div className="text-sm text-gray-400">Straight sets</div>
                                        </button>
                                        <button
                                            onClick={() => onPredictionChange('matchResult', '1-2')}
                                            className={`p-4 rounded-lg border transition-colors ${formPredictions.matchResult === '1-2'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-lg font-semibold">1-2</div>
                                            <div className="text-sm text-gray-400">Three sets</div>
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Detailed Set Scores */}
            {formPredictions.matchResult && (
                <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Detailed Set Scores</h3>
                        <div className="bg-purple-600/20 text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/30">
                            {isBestOf5 ? 'Best of 5' : 'Best of 3'}
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">
                        Now predict the exact score for each set based on your {formPredictions.matchResult} prediction
                        {setsToShowFromResult > 0 && (
                            <span className="font-semibold text-purple-400">
                                {' '}({setsToShowFromResult} set{setsToShowFromResult > 1 ? 's' : ''} to predict)
                            </span>
                        )}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: setsToShowFromResult }, (_, i) => (
                            <div key={i} className="space-y-2">
                                <h4 className="font-semibold text-white">Set {i + 1}</h4>
                                {renderSetScoreDropdown(i + 1, getSetScore(i + 1), (value) => setSetScore(i + 1, value))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Set Winners */}
            {formPredictions.matchResult && (
                <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Set Winners</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">
                        Who wins each set based on your {formPredictions.matchResult} prediction?
                    </p>
                    {Array.from({ length: setsToShowFromResult }, (_, i) => {
                        const expectedWinner = setWinnersFromResult[i];
                        const currentWinner = getSetWinner(i + 1);
                        return (
                            <div key={i} className="space-y-3 mb-4">
                                <h4 className="font-semibold text-white">Set {i + 1} Winner</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setSetWinner(i + 1, details.player1.name)}
                                        className={`p-4 rounded-lg border transition-colors ${currentWinner === details.player1.name
                                            ? 'bg-purple-600 border-purple-600 text-white'
                                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                            }`}
                                    >
                                        {details.player1.name.split(' ')[1]}
                                    </button>
                                    <button
                                        onClick={() => setSetWinner(i + 1, details.player2.name)}
                                        className={`p-4 rounded-lg border transition-colors ${currentWinner === details.player2.name
                                            ? 'bg-purple-600 border-purple-600 text-white'
                                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                            }`}
                                    >
                                        {details.player2.name.split(' ')[1]}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Most Aces */}
            <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold text-white mb-4">Most Aces</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Who leads in aces during the match?
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => onPredictionChange('acesLeader', details.player1.name)}
                        className={`p-4 rounded-lg border transition-colors ${formPredictions.acesLeader === details.player1.name
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                            }`}
                    >
                        {details.player1.name.split(' ')[1]}
                    </button>
                    <button
                        onClick={() => onPredictionChange('acesLeader', details.player2.name)}
                        className={`p-4 rounded-lg border transition-colors ${formPredictions.acesLeader === details.player2.name
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                            }`}
                    >
                        {details.player2.name.split(' ')[1]}
                    </button>
                </div>
            </div>

            {/* Total Double Faults */}
            <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold text-white mb-4">Total Double Faults</h3>
                <p className="text-sm text-gray-400 mb-4">
                    What is the total number of double faults in the match?
                </p>
                <select
                    value={formPredictions.doubleFaults}
                    onChange={(e) => onPredictionChange('doubleFaults', e.target.value)}
                    className="w-full p-4 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                    <option value="">Select double faults</option>
                    <option value="Under 5">Under 5</option>
                    <option value="5-10">5-10</option>
                    <option value="11-15">11-15</option>
                    <option value="Over 15">Over 15</option>
                </select>
            </div>

            {/* Total Break Points */}
            <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold text-white mb-4">Total Break Points</h3>
                <p className="text-sm text-gray-400 mb-4">
                    What is the total number of break points faced in the match?
                </p>
                <select
                    value={formPredictions.breakPoints}
                    onChange={(e) => onPredictionChange('breakPoints', e.target.value)}
                    className="w-full p-4 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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