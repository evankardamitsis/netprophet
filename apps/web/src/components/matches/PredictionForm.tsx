'use client';

import { Button, Badge } from '@netprophet/ui';

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
    // New fields for tiebreak predictions
    set1TieBreak: string; // "yes" or "no"
    set2TieBreak: string; // "yes" or "no"
    set1TieBreakScore: string; // e.g., "7-5", "7-6"
    set2TieBreakScore: string; // e.g., "7-5", "7-6"
    superTieBreak: string; // "yes" or "no" - for amateur format
    superTieBreakScore: string; // e.g., "10-8", "10-6"
    superTieBreakWinner: string; // player name
}

interface MatchDetails {
    player1: { name: string; country: string; ranking: number; odds: number; wins: number; losses: number };
    player2: { name: string; country: string; ranking: number; odds: number; wins: number; losses: number };
    round: string;
    surface: string;
    format: string; // Add format field
}

interface PredictionFormProps {
    formPredictions: PredictionOptions;
    onPredictionChange: (type: keyof PredictionOptions, value: string) => void;
    details: MatchDetails;
    isBestOf5: boolean;
    isAmateurFormat: boolean;
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
    isAmateurFormat,
    setsToShowFromResult,
    setWinnersFromResult,
    renderSetScoreDropdown,
    getSetScore,
    setSetScore,
    getSetWinner,
    setSetWinner
}: PredictionFormProps) {

    // Determine if this is amateur format (best-of-3 with super tiebreak)


    // Helper function to automatically set set winners for straight-set results
    const handleMatchResultChange = (newMatchResult: string) => {
        onPredictionChange('matchResult', newMatchResult);

        // For straight-set results, automatically set all set winners
        if (['3-0', '0-3', '2-0', '0-2'].includes(newMatchResult)) {
            const winner = formPredictions.winner;
            const [sets1, sets2] = newMatchResult.split('-').map(Number);
            const totalSets = sets1 + sets2;

            // Set all set winners to the match winner
            for (let i = 1; i <= totalSets; i++) {
                setSetWinner(i, winner);
            }
        }
    };

    const handleClearAll = () => {
        // Clear all prediction fields
        onPredictionChange('winner', '');
        onPredictionChange('matchResult', '');
        onPredictionChange('set1Score', '');
        onPredictionChange('set2Score', '');
        onPredictionChange('set3Score', '');
        onPredictionChange('set4Score', '');
        onPredictionChange('set5Score', '');
        onPredictionChange('set1Winner', '');
        onPredictionChange('set2Winner', '');
        onPredictionChange('set3Winner', '');
        onPredictionChange('set4Winner', '');
        onPredictionChange('set5Winner', '');
        onPredictionChange('tieBreak', '');
        onPredictionChange('totalGames', '');
        onPredictionChange('acesLeader', '');
        onPredictionChange('doubleFaults', '');
        onPredictionChange('breakPoints', '');
        // Clear new tiebreak fields
        onPredictionChange('set1TieBreak', '');
        onPredictionChange('set2TieBreak', '');
        onPredictionChange('set1TieBreakScore', '');
        onPredictionChange('set2TieBreakScore', '');
        onPredictionChange('superTieBreak', '');
        onPredictionChange('superTieBreakScore', '');
        onPredictionChange('superTieBreakWinner', '');
    };

    return (
        <div className="space-y-4 pb-4 h-full flex flex-col relative">
            {/* Clear All Button */}
            <button
                onClick={handleClearAll}
                className="absolute top-0 right-0 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-gray-600 hover:border-gray-500 bg-[#1A1A1A]/50 hover:bg-[#2A2A2A]/50"
                title="Clear all selections"
            >
                Clear All
            </button>
            {/* Match Winner */}
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <h3 className="text-base font-bold text-white mb-3">Match Winner</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => onPredictionChange('winner', formPredictions.winner === details.player1.name ? '' : details.player1.name)}
                        className={`p-3 rounded-lg border transition-colors ${formPredictions.winner === details.player1.name
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                            }`}
                    >
                        <div className="text-base font-semibold">{details.player1.name.split(' ')[1]}</div>
                        <div className="text-xs text-gray-400">{details.player1.odds.toFixed(2)}x</div>
                    </button>
                    <button
                        onClick={() => onPredictionChange('winner', formPredictions.winner === details.player2.name ? '' : details.player2.name)}
                        className={`p-3 rounded-lg border transition-colors ${formPredictions.winner === details.player2.name
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                            }`}
                    >
                        <div className="text-base font-semibold">{details.player2.name.split(' ')[1]}</div>
                        <div className="text-xs text-gray-400">{details.player2.odds.toFixed(2)}x</div>
                    </button>
                </div>
            </div>

            {/* Match Result */}
            {formPredictions.winner && (
                <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-white">Match Result</h3>
                        <div className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/30">
                            {isBestOf5 ? 'Best of 5' : isAmateurFormat ? 'Best of 3 (Super TB)' : 'Best of 3'}
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">How will {formPredictions.winner.split(' ')[1]} win the match?</p>
                    <div className="grid grid-cols-2 gap-3">
                        {isBestOf5 ? (
                            <>
                                {formPredictions.winner === details.player1.name ? (
                                    <>
                                        <button
                                            onClick={() => handleMatchResultChange(formPredictions.matchResult === '3-0' ? '' : '3-0')}
                                            className={`p-3 rounded-lg border transition-colors ${formPredictions.matchResult === '3-0'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-base font-semibold">3-0</div>
                                            <div className="text-xs text-gray-400">Straight sets</div>
                                        </button>
                                        <button
                                            onClick={() => handleMatchResultChange(formPredictions.matchResult === '3-1' ? '' : '3-1')}
                                            className={`p-3 rounded-lg border transition-colors ${formPredictions.matchResult === '3-1'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-base font-semibold">3-1</div>
                                            <div className="text-xs text-gray-400">Four sets</div>
                                        </button>
                                        <button
                                            onClick={() => handleMatchResultChange(formPredictions.matchResult === '3-2' ? '' : '3-2')}
                                            className={`p-3 rounded-lg border transition-colors ${formPredictions.matchResult === '3-2'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-base font-semibold">3-2</div>
                                            <div className="text-xs text-gray-400">Five sets</div>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleMatchResultChange(formPredictions.matchResult === '0-3' ? '' : '0-3')}
                                            className={`p-3 rounded-lg border transition-colors ${formPredictions.matchResult === '0-3'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-base font-semibold">0-3</div>
                                            <div className="text-xs text-gray-400">Straight sets</div>
                                        </button>
                                        <button
                                            onClick={() => handleMatchResultChange(formPredictions.matchResult === '1-3' ? '' : '1-3')}
                                            className={`p-3 rounded-lg border transition-colors ${formPredictions.matchResult === '1-3'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-base font-semibold">1-3</div>
                                            <div className="text-xs text-gray-400">Four sets</div>
                                        </button>
                                        <button
                                            onClick={() => handleMatchResultChange(formPredictions.matchResult === '2-3' ? '' : '2-3')}
                                            className={`p-3 rounded-lg border transition-colors ${formPredictions.matchResult === '2-3'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-base font-semibold">2-3</div>
                                            <div className="text-xs text-gray-400">Five sets</div>
                                        </button>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                {formPredictions.winner === details.player1.name ? (
                                    <>
                                        <button
                                            onClick={() => handleMatchResultChange(formPredictions.matchResult === '2-0' ? '' : '2-0')}
                                            className={`p-3 rounded-lg border transition-colors ${formPredictions.matchResult === '2-0'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-base font-semibold">2-0</div>
                                            <div className="text-xs text-gray-400">Straight sets</div>
                                        </button>
                                        <button
                                            onClick={() => handleMatchResultChange(formPredictions.matchResult === '2-1' ? '' : '2-1')}
                                            className={`p-3 rounded-lg border transition-colors ${formPredictions.matchResult === '2-1'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-base font-semibold">2-1</div>
                                            <div className="text-xs text-gray-400">{isAmateurFormat ? 'Super tiebreak' : 'Three sets'}</div>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleMatchResultChange(formPredictions.matchResult === '0-2' ? '' : '0-2')}
                                            className={`p-3 rounded-lg border transition-colors ${formPredictions.matchResult === '0-2'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-base font-semibold">0-2</div>
                                            <div className="text-xs text-gray-400">Straight sets</div>
                                        </button>
                                        <button
                                            onClick={() => handleMatchResultChange(formPredictions.matchResult === '1-2' ? '' : '1-2')}
                                            className={`p-3 rounded-lg border transition-colors ${formPredictions.matchResult === '1-2'
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                }`}
                                        >
                                            <div className="text-base font-semibold">1-2</div>
                                            <div className="text-xs text-gray-400">{isAmateurFormat ? 'Super tiebreak' : 'Three sets'}</div>
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Set Winners - 3rd Step */}
            {formPredictions.matchResult && (
                // For straight-set results, show set scores directly
                ['3-0', '0-3', '2-0', '0-2'].includes(formPredictions.matchResult) ? (
                    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-bold text-white">Set Scores</h3>
                            <div className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/30">
                                {isBestOf5 ? 'Best of 5' : isAmateurFormat ? 'Best of 3 (Super TB)' : 'Best of 3'}
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                            Predict the exact score for each set. {formPredictions.winner.split(' ')[1]} wins all sets.
                        </p>
                        {Array.from({
                            length: (() => {
                                // Determine how many sets to show for detailed scores
                                const getSetsToShowForScores = () => {
                                    if (isAmateurFormat && ['2-1', '1-2'].includes(formPredictions.matchResult)) {
                                        return 2; // Only 2 sets for amateur format with 2-1/1-2
                                    }
                                    // For other formats, show the actual number of sets played
                                    const [sets1, sets2] = formPredictions.matchResult.split('-').map(Number);
                                    return sets1 + sets2;
                                };

                                return getSetsToShowForScores();
                            })()
                        }, (_, i) => {
                            const setWinner = formPredictions.winner;

                            return (
                                <div key={i} className="space-y-2 mb-3">
                                    <h4 className="font-semibold text-white text-sm">Set {i + 1} Score - {setWinner.split(' ')[1]} wins</h4>
                                    {renderSetScoreDropdown(i + 1, getSetScore(i + 1), (value) => setSetScore(i + 1, value))}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // For non-straight-set results, show set winners with inline scores
                    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-bold text-white">Set Winners</h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                            Who wins each set based on your {formPredictions.matchResult} prediction?
                            {formPredictions.winner === details.player1.name ?
                                ` ${details.player1.name.split(' ')[1]} wins ${formPredictions.matchResult.split('-')[0]} sets, ${details.player2.name.split(' ')[1]} wins ${formPredictions.matchResult.split('-')[1]} sets` :
                                ` ${details.player2.name.split(' ')[1]} wins ${formPredictions.matchResult.split('-')[1]} sets, ${details.player1.name.split(' ')[1]} wins ${formPredictions.matchResult.split('-')[0]} sets`
                            }
                        </p>
                        {Array.from({ length: setsToShowFromResult }, (_, i) => {
                            const currentWinner = getSetWinner(i + 1);

                            // Count how many sets each player has already won (excluding current set)
                            const player1Wins = Array.from({ length: setsToShowFromResult }, (_, j) => getSetWinner(j + 1)).filter((winner, index) => winner === details.player1.name && index !== i).length;
                            const player2Wins = Array.from({ length: setsToShowFromResult }, (_, j) => getSetWinner(j + 1)).filter((winner, index) => winner === details.player2.name && index !== i).length;

                            // Get expected wins from match result
                            const expectedPlayer1Wins = formPredictions.winner === details.player1.name ? parseInt(formPredictions.matchResult.split('-')[0]) : parseInt(formPredictions.matchResult.split('-')[1]);
                            const expectedPlayer2Wins = formPredictions.winner === details.player2.name ? parseInt(formPredictions.matchResult.split('-')[0]) : parseInt(formPredictions.matchResult.split('-')[1]);

                            // Check if players can still win more sets (allow deselection)
                            const canPlayer1Win = player1Wins < expectedPlayer1Wins || currentWinner === details.player1.name;
                            const canPlayer2Win = player2Wins < expectedPlayer2Wins || currentWinner === details.player2.name;

                            return (
                                <div key={i} className="space-y-3 mb-4">
                                    <h4 className="font-semibold text-white text-sm">Set {i + 1} Winner</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setSetWinner(i + 1, currentWinner === details.player1.name ? '' : details.player1.name)}
                                            disabled={!canPlayer1Win}
                                            className={`p-3 rounded-lg border transition-colors ${currentWinner === details.player1.name
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : canPlayer1Win
                                                    ? 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                    : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-600 cursor-not-allowed'
                                                }`}
                                        >
                                            {details.player1.name.split(' ')[1]}
                                            {!canPlayer1Win && <span className="text-xs block text-gray-500">(max reached)</span>}
                                        </button>
                                        <button
                                            onClick={() => setSetWinner(i + 1, currentWinner === details.player2.name ? '' : details.player2.name)}
                                            disabled={!canPlayer2Win}
                                            className={`p-3 rounded-lg border transition-colors ${currentWinner === details.player2.name
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : canPlayer2Win
                                                    ? 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                    : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-600 cursor-not-allowed'
                                                }`}
                                        >
                                            {details.player2.name.split(' ')[1]}
                                            {!canPlayer2Win && <span className="text-xs block text-gray-500">(max reached)</span>}
                                        </button>
                                    </div>

                                    {/* Detailed Set Score - Show when set winner is selected */}
                                    {currentWinner && (
                                        <div className="space-y-2">
                                            <h5 className="font-medium text-white text-sm">Set {i + 1} Score - {currentWinner.split(' ')[1]} wins</h5>
                                            {renderSetScoreDropdown(i + 1, getSetScore(i + 1), (value) => setSetScore(i + 1, value))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            ) && (
                    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-bold text-white">Set Winners</h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                            Who wins each set based on your {formPredictions.matchResult} prediction?
                            {formPredictions.winner === details.player1.name ?
                                ` ${details.player1.name.split(' ')[1]} wins ${formPredictions.matchResult.split('-')[0]} sets, ${details.player2.name.split(' ')[1]} wins ${formPredictions.matchResult.split('-')[1]} sets` :
                                ` ${details.player2.name.split(' ')[1]} wins ${formPredictions.matchResult.split('-')[1]} sets, ${details.player1.name.split(' ')[1]} wins ${formPredictions.matchResult.split('-')[0]} sets`
                            }
                        </p>
                        {Array.from({ length: setsToShowFromResult }, (_, i) => {
                            const currentWinner = getSetWinner(i + 1);

                            // Count how many sets each player has already won (excluding current set)
                            const player1Wins = Array.from({ length: setsToShowFromResult }, (_, j) => getSetWinner(j + 1)).filter((winner, index) => winner === details.player1.name && index !== i).length;
                            const player2Wins = Array.from({ length: setsToShowFromResult }, (_, j) => getSetWinner(j + 1)).filter((winner, index) => winner === details.player2.name && index !== i).length;

                            // Get expected wins from match result
                            const expectedPlayer1Wins = formPredictions.winner === details.player1.name ? parseInt(formPredictions.matchResult.split('-')[0]) : parseInt(formPredictions.matchResult.split('-')[1]);
                            const expectedPlayer2Wins = formPredictions.winner === details.player2.name ? parseInt(formPredictions.matchResult.split('-')[0]) : parseInt(formPredictions.matchResult.split('-')[1]);

                            // Check if players can still win more sets (allow deselection)
                            const canPlayer1Win = player1Wins < expectedPlayer1Wins || currentWinner === details.player1.name;
                            const canPlayer2Win = player2Wins < expectedPlayer2Wins || currentWinner === details.player2.name;

                            return (
                                <div key={i} className="space-y-3 mb-4">
                                    <h4 className="font-semibold text-white text-sm">Set {i + 1} Winner</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setSetWinner(i + 1, currentWinner === details.player1.name ? '' : details.player1.name)}
                                            disabled={!canPlayer1Win}
                                            className={`p-3 rounded-lg border transition-colors ${currentWinner === details.player1.name
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : canPlayer1Win
                                                    ? 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                    : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-600 cursor-not-allowed'
                                                }`}
                                        >
                                            {details.player1.name.split(' ')[1]}
                                            {!canPlayer1Win && <span className="text-xs block text-gray-500">(max reached)</span>}
                                        </button>
                                        <button
                                            onClick={() => setSetWinner(i + 1, currentWinner === details.player2.name ? '' : details.player2.name)}
                                            disabled={!canPlayer2Win}
                                            className={`p-3 rounded-lg border transition-colors ${currentWinner === details.player2.name
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : canPlayer2Win
                                                    ? 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                                    : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-600 cursor-not-allowed'
                                                }`}
                                        >
                                            {details.player2.name.split(' ')[1]}
                                            {!canPlayer2Win && <span className="text-xs block text-gray-500">(max reached)</span>}
                                        </button>
                                    </div>

                                    {/* Detailed Set Score - Show when set winner is selected */}
                                    {currentWinner && (
                                        <div className="space-y-2">
                                            <h5 className="font-medium text-white text-sm">Set {i + 1} Score - {currentWinner.split(' ')[1]} wins</h5>
                                            {renderSetScoreDropdown(i + 1, getSetScore(i + 1), (value) => setSetScore(i + 1, value))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}



            {/* Set Tiebreaks - Show only when tiebreak scores are selected */}
            {formPredictions.matchResult && (() => {
                // Check if any set has a tiebreak score (7-6 or 6-7)
                const hasTiebreakScore = () => {
                    const set1Score = getSetScore(1);
                    const set2Score = getSetScore(2);
                    const set3Score = getSetScore(3);
                    const set4Score = getSetScore(4);
                    const set5Score = getSetScore(5);

                    return set1Score === '7-6' || set1Score === '6-7' ||
                        set2Score === '7-6' || set2Score === '6-7' ||
                        set3Score === '7-6' || set3Score === '6-7' ||
                        set4Score === '7-6' || set4Score === '6-7' ||
                        set5Score === '7-6' || set5Score === '6-7';
                };

                return hasTiebreakScore();
            })() && (
                    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-bold text-white">Set Tiebreaks</h3>
                            <div className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/30">
                                Optional
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                            You&apos;ve selected tiebreak scores for some sets. Here you can predict the detailed tiebreak scores within those sets.
                        </p>

                        {/* Set 1 Tiebreak */}
                        {(() => {
                            // Show Set 1 tiebreak only if Set 1 has a tiebreak score
                            const set1Score = getSetScore(1);
                            return set1Score === '7-6' || set1Score === '6-7';
                        })() && (
                                <div className="space-y-3 mb-4">
                                    <h4 className="font-semibold text-white text-sm">Set 1 Tiebreak Details</h4>
                                    <p className="text-xs text-gray-400 mb-2">
                                        Set 1 ended in a tiebreak. Predict the detailed tiebreak score:
                                    </p>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400">Tiebreak Score</label>
                                        <select
                                            value={formPredictions.set1TieBreakScore}
                                            onChange={(e) => onPredictionChange('set1TieBreakScore', e.target.value)}
                                            className="w-full p-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                        >
                                            <option value="">Select tiebreak score</option>
                                            <option value="7-0">7-0</option>
                                            <option value="7-1">7-1</option>
                                            <option value="7-2">7-2</option>
                                            <option value="7-3">7-3</option>
                                            <option value="7-4">7-4</option>
                                            <option value="7-5">7-5</option>
                                            <option value="7-6">7-6</option>
                                            <option value="6-7">6-7</option>
                                            <option value="5-7">5-7</option>
                                            <option value="4-7">4-7</option>
                                            <option value="3-7">3-7</option>
                                            <option value="2-7">2-7</option>
                                            <option value="1-7">1-7</option>
                                            <option value="0-7">0-7</option>
                                        </select>
                                    </div>


                                </div>
                            )}

                        {/* Set 2 Tiebreak */}
                        {(() => {
                            // Show Set 2 tiebreak only if Set 2 has a tiebreak score
                            const set2Score = getSetScore(2);
                            return set2Score === '7-6' || set2Score === '6-7';
                        })() && (
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-white text-sm">Set 2 Tiebreak Details</h4>
                                    <p className="text-xs text-gray-400 mb-2">
                                        Set 2 ended in a tiebreak. Predict the detailed tiebreak score:
                                    </p>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400">Tiebreak Score</label>
                                        <select
                                            value={formPredictions.set2TieBreakScore}
                                            onChange={(e) => onPredictionChange('set2TieBreakScore', e.target.value)}
                                            className="w-full p-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                        >
                                            <option value="">Select tiebreak score</option>
                                            <option value="7-0">7-0</option>
                                            <option value="7-1">7-1</option>
                                            <option value="7-2">7-2</option>
                                            <option value="7-3">7-3</option>
                                            <option value="7-4">7-4</option>
                                            <option value="7-5">7-5</option>
                                            <option value="7-6">7-6</option>
                                            <option value="6-7">6-7</option>
                                            <option value="5-7">5-7</option>
                                            <option value="4-7">4-7</option>
                                            <option value="3-7">3-7</option>
                                            <option value="2-7">2-7</option>
                                            <option value="1-7">1-7</option>
                                            <option value="0-7">0-7</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                    </div>
                )}

            {/* Super Tiebreak - Only for amateur format when 2-1/1-2 is selected */}
            {isAmateurFormat && formPredictions.matchResult && ['2-1', '1-2'].includes(formPredictions.matchResult) && (
                <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-white">Super Tiebreak</h3>
                        <div className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/30">
                            Amateur Format
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                        Since this is a 2-1 match in amateur format, there will be a 10-point super tiebreak instead of a 3rd set.
                    </p>

                    {/* Super Tiebreak Winner */}
                    <div className="space-y-3 mb-4">
                        <h4 className="font-semibold text-white text-sm">Super Tiebreak Winner</h4>
                        <p className="text-xs text-gray-400 mb-3">
                            The super tiebreak winner must be {formPredictions.winner.split(' ')[1]} to match your overall prediction.
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => onPredictionChange('superTieBreakWinner', formPredictions.superTieBreakWinner === formPredictions.winner ? '' : formPredictions.winner)}
                                className={`p-3 rounded-lg border transition-colors ${formPredictions.superTieBreakWinner === formPredictions.winner
                                    ? 'bg-purple-600 border-purple-600 text-white'
                                    : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                    }`}
                            >
                                <div className="text-sm font-semibold">{formPredictions.winner.split(' ')[1]}</div>
                                <div className="text-xs text-gray-400">Wins super tiebreak (required for match win)</div>
                            </button>
                        </div>
                    </div>

                    {/* Super Tiebreak Score */}
                    {formPredictions.superTieBreakWinner && (
                        <div className="space-y-2">
                            <h4 className="font-semibold text-white text-sm">Super Tiebreak Score - {formPredictions.winner.split(' ')[1]} wins</h4>
                            <select
                                value={formPredictions.superTieBreakScore}
                                onChange={(e) => onPredictionChange('superTieBreakScore', e.target.value)}
                                className="w-full p-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            >
                                <option value="">Select super tiebreak score</option>
                                {formPredictions.winner === details.player1.name ? (
                                    // Player 1 wins - show scores where first number > second number
                                    <>
                                        <option value="10-0">10-0</option>
                                        <option value="10-1">10-1</option>
                                        <option value="10-2">10-2</option>
                                        <option value="10-3">10-3</option>
                                        <option value="10-4">10-4</option>
                                        <option value="10-5">10-5</option>
                                        <option value="10-6">10-6</option>
                                        <option value="10-7">10-7</option>
                                        <option value="10-8">10-8</option>
                                        <option value="10-9">10-9</option>
                                    </>
                                ) : (
                                    // Player 2 wins - show scores where second number > first number
                                    <>
                                        <option value="0-10">0-10</option>
                                        <option value="1-10">1-10</option>
                                        <option value="2-10">2-10</option>
                                        <option value="3-10">3-10</option>
                                        <option value="4-10">4-10</option>
                                        <option value="5-10">5-10</option>
                                        <option value="6-10">6-10</option>
                                        <option value="7-10">7-10</option>
                                        <option value="8-10">8-10</option>
                                        <option value="9-10">9-10</option>
                                    </>
                                )}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Most Aces - COMMENTED OUT FOR FUTURE CHANGES */}
            {/* <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <h3 className="text-base font-bold text-white mb-3">Most Aces</h3>
                <p className="text-xs text-gray-400 mb-3">
                    Who leads in aces during the match?
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => onPredictionChange('acesLeader', formPredictions.acesLeader === details.player1.name ? '' : details.player1.name)}
                        className={`p-3 rounded-lg border transition-colors ${formPredictions.acesLeader === details.player1.name
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                            }`}
                    >
                        {details.player1.name.split(' ')[1]}
                    </button>
                    <button
                        onClick={() => onPredictionChange('acesLeader', formPredictions.acesLeader === details.player2.name ? '' : details.player2.name)}
                        className={`p-3 rounded-lg border transition-colors ${formPredictions.acesLeader === details.player2.name
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                            }`}
                    >
                        {details.player2.name.split(' ')[1]}
                    </button>
                </div>
            </div> */}

            {/* Total Double Faults - COMMENTED OUT FOR FUTURE CHANGES */}
            {/* <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <h3 className="text-base font-bold text-white mb-3">Total Double Faults</h3>
                <p className="text-xs text-gray-400 mb-3">
                    What is the total number of double faults in the match?
                </p>
                <select
                    value={formPredictions.doubleFaults}
                    onChange={(e) => onPredictionChange('doubleFaults', e.target.value)}
                    className="w-full p-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                >
                    <option value="">Select double faults</option>
                    <option value="Under 5">Under 5</option>
                    <option value="5-10">5-10</option>
                    <option value="11-15">11-15</option>
                    <option value="Over 15">Over 15</option>
                </select>
            </div> */}

            {/* Total Break Points - COMMENTED OUT FOR FUTURE CHANGES */}
            {/* <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <h3 className="text-base font-bold text-white mb-3">Total Break Points</h3>
                <p className="text-xs text-gray-400 mb-3">
                    What is the total number of break points faced in the match?
                </p>
                <select
                    value={formPredictions.breakPoints}
                    onChange={(e) => onPredictionChange('breakPoints', e.target.value)}
                    className="w-full p-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                >
                    <option value="">Select break points</option>
                    <option value="Under 8">Under 8</option>
                    <option value="8-12">8-12</option>
                    <option value="13-17">13-17</option>
                    <option value="Over 17">Over 17</option>
                </select>
            </div> */}
        </div>
    );
} 