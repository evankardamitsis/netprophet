'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { PredictionItem } from '@/types/dashboard';
import {
    SESSION_KEYS,
    loadFromSessionStorage,
    saveToSessionStorage,
    removeFromSessionStorage
} from '@/lib/sessionStorage';

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

// Extend PredictionItem to include structured prediction
export interface StructuredPredictionItem extends Omit<PredictionItem, 'prediction'> {
    prediction: PredictionOptions;
    betAmount?: number;
    multiplier?: number;
    potentialWinnings?: number;
}

interface PredictionSlipContextType {
    predictions: StructuredPredictionItem[];
    addPrediction: (item: StructuredPredictionItem) => void;
    removePrediction: (matchId: number) => void;
    clearPredictions: () => void;
    setSlipCollapsed?: (collapsed: boolean) => void;
    slipCollapsed?: boolean;
    // New parlay-specific methods
    getParlayEligibility: () => { isEligible: boolean; minRequired: number; current: number };
    getParlayStats: () => { totalPicks: number; liveMatches: number; tournaments: number };
}

const PredictionSlipContext = createContext<PredictionSlipContextType>({
    predictions: [],
    addPrediction: () => { },
    removePrediction: () => { },
    clearPredictions: () => { },
    getParlayEligibility: () => ({ isEligible: false, minRequired: 2, current: 0 }),
    getParlayStats: () => ({ totalPicks: 0, liveMatches: 0, tournaments: 0 }),
});

export function usePredictionSlip() {
    return useContext(PredictionSlipContext);
}

// Helper to migrate string predictions to structured objects
function migratePredictions(predictions: any[]): StructuredPredictionItem[] {
    return predictions.map(p => {
        if (typeof p.prediction === 'object' && p.prediction !== null && 'winner' in p.prediction) {
            return p;
        }
        // If prediction is a string, return empty structured prediction
        return {
            ...p, prediction: {
                winner: '', matchResult: '', set1Score: '', set2Score: '', set3Score: '', set4Score: '', set5Score: '', set1Winner: '', set2Winner: '', set3Winner: '', set4Winner: '', set5Winner: '', tieBreak: '', totalGames: '', acesLeader: '', doubleFaults: '', breakPoints: ''
            }
        };
    });
}

export function PredictionSlipProvider({ children }: { children: React.ReactNode }) {
    // Initialize state from session storage
    const [predictions, setPredictions] = useState<StructuredPredictionItem[]>(() => {
        const stored = loadFromSessionStorage(SESSION_KEYS.PREDICTIONS, []);
        return migratePredictions(stored);
    });

    const [slipCollapsed, setSlipCollapsed] = useState<boolean>(() => {
        return loadFromSessionStorage(SESSION_KEYS.SLIP_COLLAPSED, false);
    });

    // Save predictions to session storage whenever they change
    useEffect(() => {
        saveToSessionStorage(SESSION_KEYS.PREDICTIONS, predictions);
    }, [predictions]);

    // Save slip collapsed state to session storage whenever it changes
    useEffect(() => {
        saveToSessionStorage(SESSION_KEYS.SLIP_COLLAPSED, slipCollapsed);
    }, [slipCollapsed]);

    const addPrediction = (item: StructuredPredictionItem) => {
        setPredictions(prev => {
            const exists = prev.find(p => p.matchId === item.matchId);
            if (exists) {
                // Replace the existing prediction
                return prev.map(p => p.matchId === item.matchId ? item : p);
            }
            return [...prev, item];
        });
        setSlipCollapsed(false); // Open slip if closed
    };

    const removePrediction = (matchId: number) => {
        setPredictions(prev => prev.filter(p => p.matchId !== matchId));
    };

    const clearPredictions = () => {
        setPredictions([]);
        // Clear all form predictions from session storage
        removeFromSessionStorage(SESSION_KEYS.FORM_PREDICTIONS);
    };

    // New parlay-specific methods
    const getParlayEligibility = () => {
        const current = predictions.length;
        const minRequired = 2;
        return {
            isEligible: current >= minRequired,
            minRequired,
            current
        };
    };

    const getParlayStats = () => {
        return {
            totalPicks: predictions.length,
            liveMatches: predictions.filter(p => p.match.status === 'live').length,
            tournaments: new Set(predictions.map(p => p.match.tournament)).size
        };
    };

    return (
        <PredictionSlipContext.Provider value={{
            predictions,
            addPrediction,
            removePrediction,
            clearPredictions,
            setSlipCollapsed,
            slipCollapsed,
            getParlayEligibility,
            getParlayStats
        }}>
            {children}
        </PredictionSlipContext.Provider>
    );
} 