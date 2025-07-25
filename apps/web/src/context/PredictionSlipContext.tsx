'use client';

import { createContext, useContext, useState } from 'react';
import { PredictionItem } from '@/types/dashboard';

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
}

interface PredictionSlipContextType {
    predictions: StructuredPredictionItem[];
    addPrediction: (item: StructuredPredictionItem) => void;
    removePrediction: (matchId: number) => void;
    clearPredictions: () => void;
    setSlipCollapsed?: (collapsed: boolean) => void;
    slipCollapsed?: boolean;
}

const PredictionSlipContext = createContext<PredictionSlipContextType>({
    predictions: [],
    addPrediction: () => { },
    removePrediction: () => { },
    clearPredictions: () => { },
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
    const [predictions, setPredictions] = useState<StructuredPredictionItem[]>(() => migratePredictions([]));
    const [slipCollapsed, setSlipCollapsed] = useState(false);

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

    const clearPredictions = () => setPredictions([]);

    return (
        <PredictionSlipContext.Provider value={{ predictions, addPrediction, removePrediction, clearPredictions, setSlipCollapsed, slipCollapsed }}>
            {children}
        </PredictionSlipContext.Provider>
    );
} 