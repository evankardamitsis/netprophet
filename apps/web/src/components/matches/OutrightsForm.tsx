'use client';

import { useState, useEffect } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { SESSION_KEYS, loadFromSessionStorage, removeFromSessionStorage, saveToSessionStorage } from '@/lib/sessionStorage';

interface OutrightsFormProps {
    matchId: number;
    selectedTournamentWinner: string;
    selectedFinalsPair: string;
    onTournamentWinnerChange: (winner: string) => void;
    onFinalsPairChange: (pair: string) => void;
    tournament: string;
}

interface Player {
    name: string;
    odds: number;
}

interface FinalsPair {
    pair: string;
    odds: number;
}

interface CategoryOutrights {
    tournamentWinners: Player[];
    finalsPairs: FinalsPair[];
}

interface TournamentOutrights {
    categories: {
        [category: string]: CategoryOutrights;
    };
}

// Mock data for tournament winners and finals pairs by category
const getTournamentOutrights = (tournament: string): TournamentOutrights => {
    const outrights: { [key: string]: TournamentOutrights } = {
        'Roland Garros 2024': {
            categories: {
                'Open': {
                    tournamentWinners: [
                        { name: 'Rafael Nadal', odds: 3.50 },
                        { name: 'Novak Djokovic', odds: 2.80 },
                        { name: 'Carlos Alcaraz', odds: 2.20 },
                        { name: 'Jannik Sinner', odds: 4.50 },
                        { name: 'Daniil Medvedev', odds: 6.00 },
                        { name: 'Alexander Zverev', odds: 8.00 },
                        { name: 'Stefanos Tsitsipas', odds: 10.00 },
                        { name: 'Casper Ruud', odds: 12.00 }
                    ],
                    finalsPairs: [
                        { pair: 'Nadal vs Djokovic', odds: 5.50 },
                        { pair: 'Alcaraz vs Sinner', odds: 4.20 },
                        { pair: 'Nadal vs Alcaraz', odds: 6.80 },
                        { pair: 'Djokovic vs Medvedev', odds: 8.50 },
                        { pair: 'Sinner vs Zverev', odds: 12.00 },
                        { pair: 'Alcaraz vs Medvedev', odds: 9.20 },
                        { pair: 'Nadal vs Sinner', odds: 7.50 },
                        { pair: 'Djokovic vs Alcaraz', odds: 5.80 }
                    ]
                },
                '14-39': {
                    tournamentWinners: [
                        { name: 'Carlos Alcaraz', odds: 2.20 },
                        { name: 'Jannik Sinner', odds: 3.80 },
                        { name: 'Stefanos Tsitsipas', odds: 6.50 },
                        { name: 'Alexander Zverev', odds: 8.20 },
                        { name: 'Andrey Rublev', odds: 10.00 },
                        { name: 'Hubert Hurkacz', odds: 12.50 },
                        { name: 'Taylor Fritz', odds: 15.00 },
                        { name: 'Frances Tiafoe', odds: 18.00 }
                    ],
                    finalsPairs: [
                        { pair: 'Alcaraz vs Sinner', odds: 4.20 },
                        { pair: 'Tsitsipas vs Zverev', odds: 12.00 },
                        { pair: 'Alcaraz vs Tsitsipas', odds: 6.80 },
                        { pair: 'Sinner vs Rublev', odds: 8.50 },
                        { pair: 'Zverev vs Hurkacz', odds: 18.00 },
                        { pair: 'Alcaraz vs Rublev', odds: 9.20 },
                        { pair: 'Sinner vs Zverev', odds: 12.50 },
                        { pair: 'Tsitsipas vs Rublev', odds: 15.00 }
                    ]
                },
                '40-49': {
                    tournamentWinners: [
                        { name: 'Novak Djokovic', odds: 2.50 },
                        { name: 'Daniil Medvedev', odds: 4.20 },
                        { name: 'Andy Murray', odds: 8.00 },
                        { name: 'Gael Monfils', odds: 12.00 },
                        { name: 'Stan Wawrinka', odds: 15.00 },
                        { name: 'Richard Gasquet', odds: 18.00 },
                        { name: 'Feliciano Lopez', odds: 25.00 },
                        { name: 'Fernando Verdasco', odds: 30.00 }
                    ],
                    finalsPairs: [
                        { pair: 'Djokovic vs Medvedev', odds: 6.20 },
                        { pair: 'Murray vs Monfils', odds: 18.00 },
                        { pair: 'Djokovic vs Murray', odds: 8.50 },
                        { pair: 'Medvedev vs Wawrinka', odds: 12.00 },
                        { pair: 'Monfils vs Gasquet', odds: 25.00 },
                        { pair: 'Djokovic vs Wawrinka', odds: 10.00 },
                        { pair: 'Medvedev vs Monfils', odds: 15.00 },
                        { pair: 'Murray vs Gasquet', odds: 20.00 }
                    ]
                },
                '50+': {
                    tournamentWinners: [
                        { name: 'Roger Federer', odds: 3.20 },
                        { name: 'Rafael Nadal', odds: 4.50 },
                        { name: 'Ivan Ljubicic', odds: 8.00 },
                        { name: 'Tommy Haas', odds: 10.00 },
                        { name: 'Juan Carlos Ferrero', odds: 12.00 },
                        { name: 'Marat Safin', odds: 15.00 },
                        { name: 'Lleyton Hewitt', odds: 18.00 },
                        { name: 'David Nalbandian', odds: 20.00 }
                    ],
                    finalsPairs: [
                        { pair: 'Federer vs Nadal', odds: 5.50 },
                        { pair: 'Ljubicic vs Haas', odds: 15.00 },
                        { pair: 'Federer vs Ljubicic', odds: 8.20 },
                        { pair: 'Nadal vs Ferrero', odds: 10.00 },
                        { pair: 'Haas vs Safin', odds: 20.00 },
                        { pair: 'Federer vs Haas', odds: 12.00 },
                        { pair: 'Nadal vs Ljubicic', odds: 15.00 },
                        { pair: 'Ferrero vs Safin', odds: 25.00 }
                    ]
                }
            }
        },
        'Wimbledon 2024': {
            categories: {
                'Open': {
                    tournamentWinners: [
                        { name: 'Novak Djokovic', odds: 2.10 },
                        { name: 'Carlos Alcaraz', odds: 2.80 },
                        { name: 'Jannik Sinner', odds: 3.20 },
                        { name: 'Daniil Medvedev', odds: 5.50 },
                        { name: 'Andy Murray', odds: 15.00 },
                        { name: 'Stefanos Tsitsipas', odds: 8.00 },
                        { name: 'Alexander Zverev', odds: 12.00 },
                        { name: 'Hubert Hurkacz', odds: 18.00 }
                    ],
                    finalsPairs: [
                        { pair: 'Djokovic vs Alcaraz', odds: 3.80 },
                        { pair: 'Sinner vs Medvedev', odds: 6.20 },
                        { pair: 'Djokovic vs Sinner', odds: 4.50 },
                        { pair: 'Alcaraz vs Medvedev', odds: 7.80 },
                        { pair: 'Murray vs Tsitsipas', odds: 25.00 },
                        { pair: 'Djokovic vs Murray', odds: 12.50 },
                        { pair: 'Alcaraz vs Sinner', odds: 5.20 },
                        { pair: 'Medvedev vs Zverev', odds: 15.00 }
                    ]
                },
                '14-39': {
                    tournamentWinners: [
                        { name: 'Carlos Alcaraz', odds: 2.50 },
                        { name: 'Jannik Sinner', odds: 3.50 },
                        { name: 'Stefanos Tsitsipas', odds: 6.00 },
                        { name: 'Alexander Zverev', odds: 8.50 },
                        { name: 'Andrey Rublev', odds: 10.50 },
                        { name: 'Hubert Hurkacz', odds: 12.00 },
                        { name: 'Taylor Fritz', odds: 15.00 },
                        { name: 'Frances Tiafoe', odds: 18.00 }
                    ],
                    finalsPairs: [
                        { pair: 'Alcaraz vs Sinner', odds: 4.50 },
                        { pair: 'Tsitsipas vs Zverev', odds: 12.50 },
                        { pair: 'Alcaraz vs Tsitsipas', odds: 7.00 },
                        { pair: 'Sinner vs Rublev', odds: 8.80 },
                        { pair: 'Zverev vs Hurkacz', odds: 18.00 },
                        { pair: 'Alcaraz vs Rublev', odds: 9.50 },
                        { pair: 'Sinner vs Zverev', odds: 12.80 },
                        { pair: 'Tsitsipas vs Rublev', odds: 15.50 }
                    ]
                },
                '40-49': {
                    tournamentWinners: [
                        { name: 'Novak Djokovic', odds: 2.80 },
                        { name: 'Daniil Medvedev', odds: 4.80 },
                        { name: 'Andy Murray', odds: 8.50 },
                        { name: 'Gael Monfils', odds: 12.50 },
                        { name: 'Stan Wawrinka', odds: 15.50 },
                        { name: 'Richard Gasquet', odds: 18.50 },
                        { name: 'Feliciano Lopez', odds: 25.00 },
                        { name: 'Fernando Verdasco', odds: 30.00 }
                    ],
                    finalsPairs: [
                        { pair: 'Djokovic vs Medvedev', odds: 6.80 },
                        { pair: 'Murray vs Monfils', odds: 18.50 },
                        { pair: 'Djokovic vs Murray', odds: 9.00 },
                        { pair: 'Medvedev vs Wawrinka', odds: 12.80 },
                        { pair: 'Monfils vs Gasquet', odds: 25.50 },
                        { pair: 'Djokovic vs Wawrinka', odds: 10.50 },
                        { pair: 'Medvedev vs Monfils', odds: 15.80 },
                        { pair: 'Murray vs Gasquet', odds: 20.50 }
                    ]
                },
                '50+': {
                    tournamentWinners: [
                        { name: 'Roger Federer', odds: 3.50 },
                        { name: 'Rafael Nadal', odds: 4.80 },
                        { name: 'Ivan Ljubicic', odds: 8.50 },
                        { name: 'Tommy Haas', odds: 10.50 },
                        { name: 'Juan Carlos Ferrero', odds: 12.50 },
                        { name: 'Marat Safin', odds: 15.50 },
                        { name: 'Lleyton Hewitt', odds: 18.50 },
                        { name: 'David Nalbandian', odds: 20.50 }
                    ],
                    finalsPairs: [
                        { pair: 'Federer vs Nadal', odds: 6.00 },
                        { pair: 'Ljubicic vs Haas', odds: 15.50 },
                        { pair: 'Federer vs Ljubicic', odds: 8.80 },
                        { pair: 'Nadal vs Ferrero', odds: 10.50 },
                        { pair: 'Haas vs Safin', odds: 20.50 },
                        { pair: 'Federer vs Haas', odds: 12.50 },
                        { pair: 'Nadal vs Ljubicic', odds: 15.80 },
                        { pair: 'Ferrero vs Safin', odds: 25.50 }
                    ]
                }
            }
        },
        'US Open 2024': {
            categories: {
                'Open': {
                    tournamentWinners: [
                        { name: 'Novak Djokovic', odds: 2.50 },
                        { name: 'Carlos Alcaraz', odds: 2.20 },
                        { name: 'Daniil Medvedev', odds: 4.00 },
                        { name: 'Jannik Sinner', odds: 3.80 },
                        { name: 'Andrey Rublev', odds: 8.50 },
                        { name: 'Alexander Zverev', odds: 10.00 },
                        { name: 'Stefanos Tsitsipas', odds: 12.00 },
                        { name: 'Casper Ruud', odds: 15.00 }
                    ],
                    finalsPairs: [
                        { pair: 'Djokovic vs Alcaraz', odds: 4.20 },
                        { pair: 'Medvedev vs Sinner', odds: 6.80 },
                        { pair: 'Alcaraz vs Medvedev', odds: 5.50 },
                        { pair: 'Djokovic vs Sinner', odds: 7.20 },
                        { pair: 'Rublev vs Zverev', odds: 18.00 },
                        { pair: 'Alcaraz vs Rublev', odds: 9.50 },
                        { pair: 'Djokovic vs Medvedev', odds: 6.20 },
                        { pair: 'Sinner vs Zverev', odds: 12.50 }
                    ]
                },
                '14-39': {
                    tournamentWinners: [
                        { name: 'Carlos Alcaraz', odds: 2.20 },
                        { name: 'Jannik Sinner', odds: 3.60 },
                        { name: 'Stefanos Tsitsipas', odds: 6.20 },
                        { name: 'Alexander Zverev', odds: 8.20 },
                        { name: 'Andrey Rublev', odds: 9.80 },
                        { name: 'Hubert Hurkacz', odds: 12.20 },
                        { name: 'Taylor Fritz', odds: 14.50 },
                        { name: 'Frances Tiafoe', odds: 17.50 }
                    ],
                    finalsPairs: [
                        { pair: 'Alcaraz vs Sinner', odds: 4.00 },
                        { pair: 'Tsitsipas vs Zverev', odds: 12.20 },
                        { pair: 'Alcaraz vs Tsitsipas', odds: 6.50 },
                        { pair: 'Sinner vs Rublev', odds: 8.20 },
                        { pair: 'Zverev vs Hurkacz', odds: 17.50 },
                        { pair: 'Alcaraz vs Rublev', odds: 9.20 },
                        { pair: 'Sinner vs Zverev', odds: 12.00 },
                        { pair: 'Tsitsipas vs Rublev', odds: 14.80 }
                    ]
                },
                '40-49': {
                    tournamentWinners: [
                        { name: 'Novak Djokovic', odds: 2.80 },
                        { name: 'Daniil Medvedev', odds: 4.50 },
                        { name: 'Andy Murray', odds: 8.80 },
                        { name: 'Gael Monfils', odds: 12.80 },
                        { name: 'Stan Wawrinka', odds: 15.80 },
                        { name: 'Richard Gasquet', odds: 18.80 },
                        { name: 'Feliciano Lopez', odds: 25.50 },
                        { name: 'Fernando Verdasco', odds: 30.50 }
                    ],
                    finalsPairs: [
                        { pair: 'Djokovic vs Medvedev', odds: 6.50 },
                        { pair: 'Murray vs Monfils', odds: 18.80 },
                        { pair: 'Djokovic vs Murray', odds: 9.20 },
                        { pair: 'Medvedev vs Wawrinka', odds: 12.50 },
                        { pair: 'Monfils vs Gasquet', odds: 25.80 },
                        { pair: 'Djokovic vs Wawrinka', odds: 10.80 },
                        { pair: 'Medvedev vs Monfils', odds: 15.50 },
                        { pair: 'Murray vs Gasquet', odds: 20.80 }
                    ]
                },
                '50+': {
                    tournamentWinners: [
                        { name: 'Roger Federer', odds: 3.80 },
                        { name: 'Rafael Nadal', odds: 5.20 },
                        { name: 'Ivan Ljubicic', odds: 8.80 },
                        { name: 'Tommy Haas', odds: 10.80 },
                        { name: 'Juan Carlos Ferrero', odds: 12.80 },
                        { name: 'Marat Safin', odds: 15.80 },
                        { name: 'Lleyton Hewitt', odds: 18.80 },
                        { name: 'David Nalbandian', odds: 20.80 }
                    ],
                    finalsPairs: [
                        { pair: 'Federer vs Nadal', odds: 6.50 },
                        { pair: 'Ljubicic vs Haas', odds: 15.80 },
                        { pair: 'Federer vs Ljubicic', odds: 9.20 },
                        { pair: 'Nadal vs Ferrero', odds: 10.80 },
                        { pair: 'Haas vs Safin', odds: 20.80 },
                        { pair: 'Federer vs Haas', odds: 12.80 },
                        { pair: 'Nadal vs Ljubicic', odds: 16.20 },
                        { pair: 'Ferrero vs Safin', odds: 25.80 }
                    ]
                }
            }
        },
        'Local Amateur Tournament': {
            categories: {
                'Open': {
                    tournamentWinners: [
                        { name: 'John Smith', odds: 2.80 },
                        { name: 'Mike Johnson', odds: 3.20 },
                        { name: 'David Wilson', odds: 4.50 },
                        { name: 'Chris Brown', odds: 5.20 },
                        { name: 'Alex Davis', odds: 6.80 },
                        { name: 'Tom Miller', odds: 8.50 },
                        { name: 'James Taylor', odds: 10.00 },
                        { name: 'Robert Anderson', odds: 12.00 }
                    ],
                    finalsPairs: [
                        { pair: 'Smith vs Johnson', odds: 4.50 },
                        { pair: 'Wilson vs Brown', odds: 6.80 },
                        { pair: 'Smith vs Wilson', odds: 5.20 },
                        { pair: 'Johnson vs Davis', odds: 7.50 },
                        { pair: 'Brown vs Miller', odds: 12.00 },
                        { pair: 'Smith vs Davis', odds: 8.20 },
                        { pair: 'Johnson vs Wilson', odds: 6.50 },
                        { pair: 'Brown vs Taylor', odds: 15.00 }
                    ]
                },
                '14-39': {
                    tournamentWinners: [
                        { name: 'John Smith', odds: 2.50 },
                        { name: 'Mike Johnson', odds: 3.00 },
                        { name: 'David Wilson', odds: 4.20 },
                        { name: 'Chris Brown', odds: 4.80 },
                        { name: 'Alex Davis', odds: 6.20 },
                        { name: 'Tom Miller', odds: 7.80 },
                        { name: 'James Taylor', odds: 9.20 },
                        { name: 'Robert Anderson', odds: 11.00 }
                    ],
                    finalsPairs: [
                        { pair: 'Smith vs Johnson', odds: 4.00 },
                        { pair: 'Wilson vs Brown', odds: 6.20 },
                        { pair: 'Smith vs Wilson', odds: 4.80 },
                        { pair: 'Johnson vs Davis', odds: 6.80 },
                        { pair: 'Brown vs Miller', odds: 10.50 },
                        { pair: 'Smith vs Davis', odds: 7.20 },
                        { pair: 'Johnson vs Wilson', odds: 5.80 },
                        { pair: 'Brown vs Taylor', odds: 12.50 }
                    ]
                },
                '40-49': {
                    tournamentWinners: [
                        { name: 'Mike Johnson', odds: 2.80 },
                        { name: 'David Wilson', odds: 3.50 },
                        { name: 'Chris Brown', odds: 4.20 },
                        { name: 'Alex Davis', odds: 5.00 },
                        { name: 'Tom Miller', odds: 6.50 },
                        { name: 'James Taylor', odds: 8.20 },
                        { name: 'Robert Anderson', odds: 9.80 },
                        { name: 'William Thomas', odds: 12.00 }
                    ],
                    finalsPairs: [
                        { pair: 'Johnson vs Wilson', odds: 4.80 },
                        { pair: 'Brown vs Davis', odds: 6.50 },
                        { pair: 'Johnson vs Brown', odds: 5.20 },
                        { pair: 'Wilson vs Miller', odds: 7.20 },
                        { pair: 'Davis vs Taylor', odds: 11.50 },
                        { pair: 'Johnson vs Miller', odds: 8.00 },
                        { pair: 'Wilson vs Brown', odds: 6.20 },
                        { pair: 'Davis vs Anderson', odds: 13.00 }
                    ]
                },
                '50+': {
                    tournamentWinners: [
                        { name: 'David Wilson', odds: 3.20 },
                        { name: 'Chris Brown', odds: 3.80 },
                        { name: 'Alex Davis', odds: 4.50 },
                        { name: 'Tom Miller', odds: 5.50 },
                        { name: 'James Taylor', odds: 7.20 },
                        { name: 'Robert Anderson', odds: 8.80 },
                        { name: 'William Thomas', odds: 10.50 },
                        { name: 'Richard Jackson', odds: 12.50 }
                    ],
                    finalsPairs: [
                        { pair: 'Wilson vs Brown', odds: 5.20 },
                        { pair: 'Davis vs Miller', odds: 7.50 },
                        { pair: 'Wilson vs Davis', odds: 5.80 },
                        { pair: 'Brown vs Taylor', odds: 8.20 },
                        { pair: 'Miller vs Anderson', odds: 12.80 },
                        { pair: 'Wilson vs Taylor', odds: 9.00 },
                        { pair: 'Brown vs Davis', odds: 6.80 },
                        { pair: 'Miller vs Thomas', odds: 14.50 }
                    ]
                }
            }
        }
    };

    return outrights[tournament as keyof typeof outrights] || {
        categories: {}
    };
};

export function OutrightsForm({
    matchId,
    selectedTournamentWinner,
    selectedFinalsPair,
    onTournamentWinnerChange,
    onFinalsPairChange,
    tournament
}: OutrightsFormProps) {
    const { dict, lang } = useDictionary();
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const outrights = getTournamentOutrights(tournament);
    const categories = Object.keys(outrights.categories);

    // Load saved selections from session storage on component mount
    useEffect(() => {
        const storageKey = `${SESSION_KEYS.FORM_PREDICTIONS}_outrights_${matchId}`;
        const savedData = loadFromSessionStorage(storageKey, {
            selectedCategory: '',
            selectedTournamentWinner: '',
            selectedFinalsPair: ''
        });

        if (savedData.selectedCategory) {
            setSelectedCategory(savedData.selectedCategory);
        }
        if (savedData.selectedTournamentWinner) {
            onTournamentWinnerChange(savedData.selectedTournamentWinner);
        }
        if (savedData.selectedFinalsPair) {
            onFinalsPairChange(savedData.selectedFinalsPair);
        }
    }, [matchId, onTournamentWinnerChange, onFinalsPairChange]);

    // Save selections to session storage whenever they change
    useEffect(() => {
        const storageKey = `${SESSION_KEYS.FORM_PREDICTIONS}_outrights_${matchId}`;
        const dataToSave = {
            selectedCategory,
            selectedTournamentWinner,
            selectedFinalsPair
        };
        saveToSessionStorage(storageKey, dataToSave);
    }, [selectedCategory, selectedTournamentWinner, selectedFinalsPair, matchId]);

    const handleClearAll = () => {
        setSelectedCategory('');
        onTournamentWinnerChange('');
        onFinalsPairChange('');

        // Clear session storage for this match
        const storageKey = `${SESSION_KEYS.FORM_PREDICTIONS}_outrights_${matchId}`;
        removeFromSessionStorage(storageKey);
    };

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        // Clear previous selections when changing category
        onTournamentWinnerChange('');
        onFinalsPairChange('');
    };

    const currentCategoryOutrights = selectedCategory ? outrights.categories[selectedCategory] : null;

    return (
        <div className="space-y-4 pb-4 h-full flex flex-col relative">
            {/* Clear All Button */}
            <button
                onClick={handleClearAll}
                className="absolute top-0 right-0 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-slate-600 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-700/50 z-10"
                title={dict?.matches?.clearAllSelections || "Clear all selections"}
            >
                {dict?.matches?.clearAll || 'Clear All'}
            </button>

            {/* Category Selection */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-base font-bold text-white mb-3">📋 {dict?.matches?.selectCategory || 'Select Category'}</h3>
                <p className="text-xs text-gray-400 mb-4">
                    {dict?.matches?.chooseAgeCategory || 'Choose your age category to see relevant players and predictions.'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                    {categories.map((category) => (
                        <button
                            key={category}
                            type="button"
                            onClick={() => handleCategoryChange(category)}
                            className={`p-3 rounded-lg border transition-colors ${selectedCategory === category
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50'
                                }`}
                        >
                            <div className="text-sm font-semibold">{category}</div>
                            <div className="text-xs opacity-80">
                                {category === 'Open' ? (dict?.matches?.allAges || 'All ages') : `${category} ${dict?.matches?.years || 'years'}`}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tournament Winner Selection - Only show if category is selected */}
            {currentCategoryOutrights && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                    <h3 className="text-base font-bold text-white mb-3">🏆 {dict?.matches?.tournamentWinner || 'Tournament Winner'} - {selectedCategory}</h3>
                    <p className="text-xs text-gray-400 mb-4">
                        {dict?.matches?.predictCategoryWinner?.replace('{category}', selectedCategory) || `Predict who will win the ${selectedCategory} category of the tournament.`}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {currentCategoryOutrights.tournamentWinners.map((winner) => (
                            <button
                                key={winner.name}
                                type="button"
                                onClick={() => onTournamentWinnerChange(selectedTournamentWinner === winner.name ? '' : winner.name)}
                                className={`p-3 rounded-lg border transition-colors ${selectedTournamentWinner === winner.name
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50'
                                    }`}
                            >
                                <div className="text-sm font-semibold">{winner.name}</div>
                                <div className="text-xs text-gray-400">{winner.odds.toFixed(2)}x</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Finals Pair Selection - Only show if category is selected */}
            {currentCategoryOutrights && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                    <h3 className="text-base font-bold text-white mb-3">🎯 {dict?.matches?.finalsPair || 'Finals Pair'} - {selectedCategory}</h3>
                    <p className="text-xs text-gray-400 mb-4">
                        {dict?.matches?.predictCategoryFinalists?.replace('{category}', selectedCategory) || `Predict which two players will reach the ${selectedCategory} category final.`}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                        {currentCategoryOutrights.finalsPairs.map((pair) => (
                            <button
                                key={pair.pair}
                                type="button"
                                onClick={() => onFinalsPairChange(selectedFinalsPair === pair.pair ? '' : pair.pair)}
                                className={`p-3 rounded-lg border transition-colors ${selectedFinalsPair === pair.pair
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50'
                                    }`}
                            >
                                <div className="text-sm font-semibold">{pair.pair}</div>
                                <div className="text-xs text-gray-400">{pair.odds.toFixed(2)}x</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Betting Information */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-base font-bold text-white mb-3">ℹ️ {dict?.matches?.bettingInformation || 'Betting Information'}</h3>
                <div className="space-y-2 text-sm text-gray-400">
                    <p>{dict?.matches?.outrightsHigherMultipliers || '• Outrights have higher multipliers due to their difficulty'}</p>
                    <p>{dict?.matches?.tournamentWinnerSettled || '• Tournament winner predictions are settled at the end of the tournament'}</p>
                    <p>{dict?.matches?.finalsPairSettled || '• Finals pair predictions are settled when finalists are determined'}</p>
                    <p>{dict?.matches?.betOnBothPredictions || '• You can bet on both predictions for maximum potential winnings'}</p>
                    <p>{dict?.matches?.higherRiskHigherRewards || '• Higher risk = higher potential rewards'}</p>
                    <p>{dict?.matches?.differentPlayersAndOdds || '• Each category has different players and odds'}</p>
                </div>
            </div>
        </div>
    );
} 