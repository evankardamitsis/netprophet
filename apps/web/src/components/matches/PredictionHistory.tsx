'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Badge, Button } from '@netprophet/ui';

interface Prediction {
    winner?: string;
    score?: string;
    tiebreak?: string;
    matchResult?: string;
    set1Score?: string;
    set2Score?: string;
    set3Score?: string;
    superTiebreakScore?: string;
}

interface PredictionHistoryItem {
    id: string;
    matchTitle: string;
    date: string;
    time: string;
    prediction: Prediction;
    status: 'active' | 'won' | 'lost';
    pointsEarned: number;
    betAmount: number;
    potentialWinnings: number;
    multiplier: number;
    created_at: string;
}

interface PredictionHistoryProps {
    predictions: PredictionHistoryItem[];
}

export function PredictionHistory({ predictions }: PredictionHistoryProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border border-blue-300">
                        Active
                    </Badge>
                );
            case 'won':
                return (
                    <Badge variant="default" className="bg-green-100 text-green-800 border border-green-300">
                        Won
                    </Badge>
                );
            case 'lost':
                return (
                    <Badge variant="destructive" className="bg-red-100 text-red-800 border border-red-300">
                        Lost
                    </Badge>
                );
            default:
                return null;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('el-GR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {predictions.map((prediction, index) => (
                    <motion.div
                        key={prediction.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                            {prediction.matchTitle}
                                        </h3>
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            <span>{formatDate(prediction.date)}</span>
                                            <span>•</span>
                                            <span>{prediction.time}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {getStatusBadge(prediction.status)}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-2">
                                        {prediction.prediction.winner && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg">🏆</span>
                                                <span className="text-sm text-gray-600">Winner:</span>
                                                <span className="font-semibold text-gray-900">{prediction.prediction.winner}</span>
                                            </div>
                                        )}
                                        {prediction.prediction.matchResult && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg">🧮</span>
                                                <span className="text-sm text-gray-600">Result:</span>
                                                <span className="font-semibold text-gray-900">{prediction.prediction.matchResult}</span>
                                            </div>
                                        )}
                                        {prediction.prediction.set1Score && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg">🎾</span>
                                                <span className="text-sm text-gray-600">Set 1:</span>
                                                <span className="font-semibold text-gray-900">{prediction.prediction.set1Score}</span>
                                            </div>
                                        )}
                                        {prediction.prediction.set2Score && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg">🎾</span>
                                                <span className="text-sm text-gray-600">Set 2:</span>
                                                <span className="font-semibold text-gray-900">{prediction.prediction.set2Score}</span>
                                            </div>
                                        )}
                                        {prediction.prediction.set3Score && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg">🎾</span>
                                                <span className="text-sm text-gray-600">Set 3:</span>
                                                <span className="font-semibold text-gray-900">{prediction.prediction.set3Score}</span>
                                            </div>
                                        )}
                                        {prediction.prediction.superTiebreakScore && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg">⚡</span>
                                                <span className="text-sm text-gray-600">Super TB:</span>
                                                <span className="font-semibold text-gray-900">{prediction.prediction.superTiebreakScore}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-end">
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-green-600">
                                                {prediction.pointsEarned > 0 ? `+${prediction.pointsEarned} 🌕` : '0 🌕'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Winnings
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Bet: {prediction.betAmount} 🌕 | Multiplier: {prediction.multiplier}x
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                {index < predictions.length - 1 && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Pagination Placeholder */}
            <div className="flex justify-center items-center space-x-2 mt-8">
                <Button variant="outline" size="sm" disabled>
                    Προηγούμενη
                </Button>
                <div className="flex items-center space-x-1">
                    <Button variant="default" size="sm">1</Button>
                    <Button variant="outline" size="sm">2</Button>
                    <Button variant="outline" size="sm">3</Button>
                    <span className="text-gray-500">...</span>
                    <Button variant="outline" size="sm">10</Button>
                </div>
                <Button variant="outline" size="sm">
                    Επόμενη
                </Button>
            </div>
        </div>
    );
} 