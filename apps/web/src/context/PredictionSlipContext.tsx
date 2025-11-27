'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PredictionItem } from '@/types/dashboard';
import {
    SESSION_KEYS,
    loadFromSessionStorage,
    saveToSessionStorage,
    removeFromSessionStorage,
    clearAllFormPredictions
} from '@/lib/sessionStorage';
import { supabase } from '@netprophet/lib';
import { toast } from 'sonner';
import { useDictionary } from '@/context/DictionaryContext';

// Add PredictionOptions type
export interface PredictionOptions {
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

// Add OutrightsOptions type
export interface OutrightsOptions {
    tournamentWinner: string;
    finalsPair: string;
}

// Extend PredictionItem to include structured prediction
export interface StructuredPredictionItem extends Omit<PredictionItem, 'prediction'> {
    prediction: PredictionOptions;
    betAmount?: number;
    multiplier?: number;
    potentialWinnings?: number;
}

// Add OutrightsPredictionItem type
export interface OutrightsPredictionItem extends Omit<PredictionItem, 'prediction'> {
    prediction: OutrightsOptions;
    betAmount?: number;
    multiplier?: number;
    potentialWinnings?: number;
    isOutrights: true;
}

interface PredictionSlipContextType {
    predictions: StructuredPredictionItem[];
    outrightsPredictions: OutrightsPredictionItem[];
    addPrediction: (item: StructuredPredictionItem) => Promise<void>;
    addOutrightsPrediction: (item: OutrightsPredictionItem) => void;
    removePrediction: (matchId: string) => void;
    removeOutrightsPrediction: (matchId: string) => void;
    clearPredictions: () => void;
    clearOutrightsPredictions: () => void;
    updatePredictionBetAmount: (matchId: string, betAmount: number) => void;
    updateOutrightsBetAmount: (matchId: string, betAmount: number) => void;
    setSlipCollapsed?: (collapsed: boolean) => void;
    slipCollapsed?: boolean;
    resetSlipState: () => void;
    // New parlay-specific methods
    getParlayEligibility: () => { isEligible: boolean; minRequired: number; current: number };
    getParlayStats: () => { totalPicks: number; liveMatches: number; tournaments: number };
    // Helper methods
    hasPrediction: (matchId: string) => boolean;
    hasOutrightsPrediction: (matchId: string) => boolean;
    hasFormPredictions: () => boolean;
}

const PredictionSlipContext = createContext<PredictionSlipContextType>({
    predictions: [],
    outrightsPredictions: [],
    addPrediction: async () => { },
    addOutrightsPrediction: () => { },
    removePrediction: () => { },
    removeOutrightsPrediction: () => { },
    clearPredictions: () => { },
    clearOutrightsPredictions: () => { },
    updatePredictionBetAmount: () => { },
    updateOutrightsBetAmount: () => { },
    resetSlipState: () => { },
    getParlayEligibility: () => ({ isEligible: false, minRequired: 2, current: 0 }),
    getParlayStats: () => ({ totalPicks: 0, liveMatches: 0, tournaments: 0 }),
    hasPrediction: () => false,
    hasOutrightsPrediction: () => false,
    hasFormPredictions: () => false,
});

export function usePredictionSlip() {
    return useContext(PredictionSlipContext);
}

// Helper to migrate string predictions to structured objects
function migratePredictions(predictions: any[]): StructuredPredictionItem[] {
    return predictions.map(p => {
        // If prediction is already a structured object with all required fields
        if (typeof p.prediction === 'object' && p.prediction !== null &&
            'winner' in p.prediction &&
            'matchResult' in p.prediction &&
            'set1Score' in p.prediction) {
            // Preserve existing betAmount and potentialWinnings if they exist
            return {
                ...p,
                betAmount: p.betAmount || 0,
                potentialWinnings: p.potentialWinnings || 0
            } as StructuredPredictionItem;
        }

        // If prediction is a string or missing fields, return empty structured prediction
        return {
            ...p,
            betAmount: p.betAmount || 0,
            potentialWinnings: p.potentialWinnings || 0,
            prediction: {
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
                breakPoints: '',
                // Add new tiebreak fields
                set1TieBreak: '',
                set2TieBreak: '',
                set1TieBreakScore: '',
                set2TieBreakScore: '',
                superTieBreak: '',
                superTieBreakScore: '',
                superTieBreakWinner: ''
            }
        } as StructuredPredictionItem;
    });
}

export function PredictionSlipProvider({ children }: { children: React.ReactNode }) {
    const { dict } = useDictionary();
    
    // Initialize state from session storage
    const [predictions, setPredictions] = useState<StructuredPredictionItem[]>(() => {
        const stored = loadFromSessionStorage(SESSION_KEYS.PREDICTIONS, []);
        return migratePredictions(stored);
    });

    const [outrightsPredictions, setOutrightsPredictions] = useState<OutrightsPredictionItem[]>(() => {
        const stored = loadFromSessionStorage(SESSION_KEYS.OUTRIGHTS_PREDICTIONS, []);
        return stored;
    });

    const [slipCollapsed, setSlipCollapsed] = useState<boolean>(() => {
        const stored = loadFromSessionStorage(SESSION_KEYS.SLIP_COLLAPSED, true); // Default to true (collapsed)
        return stored;
    });

    // No longer clearing predictions on mount - we want to persist the state

    // Save predictions to session storage whenever they change
    useEffect(() => {
        saveToSessionStorage(SESSION_KEYS.PREDICTIONS, predictions);
    }, [predictions]);

    // Save outrights predictions to session storage whenever they change
    useEffect(() => {
        saveToSessionStorage(SESSION_KEYS.OUTRIGHTS_PREDICTIONS, outrightsPredictions);
    }, [outrightsPredictions]);

    // Save slip collapsed state to session storage whenever it changes
    useEffect(() => {
        saveToSessionStorage(SESSION_KEYS.SLIP_COLLAPSED, slipCollapsed);
    }, [slipCollapsed]);

    // Auto-collapse slip when there are no predictions and no form predictions
    // Only trigger when predictions are actually removed, not on initial load
    useEffect(() => {
        // Skip auto-collapse on initial mount to avoid overriding manual collapse state
        if (predictions.length === 0 && outrightsPredictions.length === 0) {
            const checkForFormPredictions = () => {
                try {
                    // Check the main form predictions key (used by MatchDetail)
                    const stored = sessionStorage.getItem(SESSION_KEYS.FORM_PREDICTIONS);
                    if (stored) {
                        const formData = JSON.parse(stored);
                        if (Object.keys(formData).length > 0) {
                            return true;
                        }
                    }

                    // Check for individual form prediction keys (used by PredictionForm)
                    const allKeys = Object.keys(sessionStorage);
                    const formPredictionKeys = allKeys.filter(key =>
                        key.startsWith(`${SESSION_KEYS.FORM_PREDICTIONS}_`) &&
                        !key.includes('_outrights_')
                    );

                    return formPredictionKeys.length > 0;
                } catch (error) {
                    console.warn('Failed to check form predictions:', error);
                }
                return false;
            };

            // Only auto-collapse if there are no form predictions either
            if (!checkForFormPredictions()) {
                setSlipCollapsed(true);
            }
        }
    }, [predictions.length, outrightsPredictions.length]);

    const addPrediction = async (item: StructuredPredictionItem) => {
        // Validate that user is not a participant in this match
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Get user's profile to check claimed_player_id
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('claimed_player_id')
                    .eq('id', user.id)
                    .single();

                const claimedPlayerId = profile?.claimed_player_id;
                
                if (claimedPlayerId) {
                    // Check if user is participating in this match
                    const match = item.match;
                    if (match && match.player_a_id && match.player_b_id) {
                        const isParticipant = 
                            match.player_a_id === claimedPlayerId || 
                            match.player_b_id === claimedPlayerId;

                        if (isParticipant) {
                            toast.error(dict?.matches?.cannotPlacePredictionOnOwnMatch || 'You cannot place predictions on matches you are participating in.');
                            return;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error validating participant conflict:', error);
            // Don't block adding prediction if validation fails - let backend handle it
        }

        // If validation passes, add the prediction
        setPredictions(prev => {
            const exists = prev.find(p => p.matchId === item.matchId);
            if (exists) {
                // Replace the existing prediction, but preserve bet amount if not provided
                const existingBetAmount = exists.betAmount || 0;
                const existingPotentialWinnings = exists.potentialWinnings || 0;
                return prev.map(p => p.matchId === item.matchId ? {
                    ...item,
                    betAmount: item.betAmount !== undefined ? item.betAmount : existingBetAmount,
                    potentialWinnings: item.potentialWinnings !== undefined ? item.potentialWinnings : existingPotentialWinnings
                } : p);
            }
            // For new predictions, preserve any bet amount that was passed in
            const newItem = {
                ...item,
                betAmount: item.betAmount || 0,
                potentialWinnings: item.potentialWinnings || 0
            };
            return [...prev, newItem];
        });
        setSlipCollapsed(false); // Open slip if closed
    };

    const removePrediction = (matchId: string) => {
        setPredictions(prev => prev.filter(p => p.matchId !== matchId));
    };

    const addOutrightsPrediction = (item: OutrightsPredictionItem) => {
        setOutrightsPredictions(prev => {
            const exists = prev.find(p => p.matchId === item.matchId);
            if (exists) {
                // Replace the existing prediction
                return prev.map(p => p.matchId === item.matchId ? item : p);
            }
            return [...prev, item];
        });
        setSlipCollapsed(false); // Open slip if closed
    };

    const removeOutrightsPrediction = (matchId: string) => {
        setOutrightsPredictions(prev => prev.filter(p => p.matchId !== matchId));
    };

    const clearOutrightsPredictions = () => {
        setOutrightsPredictions([]);
        // Only collapse if there are no regular predictions either
        if (predictions.length === 0) {
            setSlipCollapsed(true);
        }
    };

    const clearPredictions = () => {
        setPredictions([]);
        setSlipCollapsed(true); // Collapse slip when clearing predictions
        // Clear all form predictions from session storage
        clearAllFormPredictions();
    };

    // New parlay-specific methods
    const getParlayEligibility = () => {
        const current = predictions.length; // Only regular predictions count for parlay
        const minRequired = 2;
        return {
            isEligible: current >= minRequired,
            minRequired,
            current
        };
    };

    const getParlayStats = () => {
        return {
            totalPicks: predictions.length, // Only regular predictions count for parlay
            liveMatches: predictions.filter(p => p.match.status === 'live').length,
            tournaments: new Set(predictions.map(p => p.match.tournament)).size
        };
    };

    const updatePredictionBetAmount = (matchId: string, betAmount: number) => {
        setPredictions(prev => prev.map(p =>
            p.matchId === matchId
                ? { ...p, betAmount, potentialWinnings: betAmount * (p.multiplier || 1) }
                : p
        ));
    };

    const updateOutrightsBetAmount = (matchId: string, betAmount: number) => {
        setOutrightsPredictions(prev => prev.map(p =>
            p.matchId === matchId
                ? { ...p, betAmount, potentialWinnings: betAmount * (p.multiplier || 1) }
                : p
        ));
    };

    // Helper methods to check if predictions exist
    const hasPrediction = (matchId: string) => {
        return predictions.some(p => p.matchId === matchId);
    };

    const hasOutrightsPrediction = (matchId: string) => {
        return outrightsPredictions.some(p => p.matchId === matchId);
    };

    const hasFormPredictions = () => {
        try {
            // Check the main form predictions key (used by MatchDetail)
            const stored = sessionStorage.getItem(SESSION_KEYS.FORM_PREDICTIONS);
            if (stored) {
                const formData = JSON.parse(stored);
                if (Object.keys(formData).length > 0) {
                    return true;
                }
            }

            // Check for individual form prediction keys (used by PredictionForm)
            const allKeys = Object.keys(sessionStorage);
            const formPredictionKeys = allKeys.filter(key =>
                key.startsWith(`${SESSION_KEYS.FORM_PREDICTIONS}_`) &&
                !key.includes('_outrights_')
            );

            return formPredictionKeys.length > 0;
        } catch (error) {
            console.warn('Failed to check form predictions:', error);
        }
        return false;
    };

    const resetSlipState = useCallback(() => {
        setPredictions([]);
        setOutrightsPredictions([]);
        setSlipCollapsed(true);
        removeFromSessionStorage(SESSION_KEYS.PREDICTIONS);
        removeFromSessionStorage(SESSION_KEYS.OUTRIGHTS_PREDICTIONS);
        removeFromSessionStorage(SESSION_KEYS.SLIP_COLLAPSED);
        clearAllFormPredictions();
    }, []); // Empty dependency array since this function doesn't depend on any props or state

    return (
        <PredictionSlipContext.Provider value={{
            predictions,
            outrightsPredictions,
            addPrediction,
            addOutrightsPrediction,
            removePrediction,
            removeOutrightsPrediction,
            clearPredictions,
            clearOutrightsPredictions,
            updatePredictionBetAmount,
            updateOutrightsBetAmount,
            setSlipCollapsed,
            slipCollapsed,
            resetSlipState,
            getParlayEligibility,
            getParlayStats,
            hasPrediction,
            hasOutrightsPrediction,
            hasFormPredictions
        }}>
            {children}
        </PredictionSlipContext.Provider>
    );
} 