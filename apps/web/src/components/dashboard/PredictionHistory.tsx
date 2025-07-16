'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Badge, Button } from '@netprophet/ui';

interface Prediction {
    winner: string;
    score: string;
    tiebreak: string;
}

interface PredictionHistoryItem {
    id: number;
    matchTitle: string;
    date: string;
    time: string;
    prediction: Prediction;
    status: 'pending' | 'correct' | 'wrong';
    pointsEarned: number;
    streak: number | null;
}

interface PredictionHistoryProps {
    predictions: PredictionHistoryItem[];
}

export function PredictionHistory({ predictions }: PredictionHistoryProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 border border-gray-300">
                        Σε εκκρεμότητα
                    </Badge>
                );
            case 'correct':
                return (
                    <Badge variant="default" className="bg-green-100 text-green-800 border border-green-300">
                        Σωστή πρόβλεψη
                    </Badge>
                );
            case 'wrong':
                return (
                    <Badge variant="destructive" className="bg-red-100 text-red-800 border border-red-300">
                        Λάθος πρόβλεψη
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
                                        {prediction.streak && (
                                            <div className="flex items-center space-x-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                                                <span>🔥</span>
                                                <span>x{prediction.streak}</span>
                                            </div>
                                        )}
                                        {getStatusBadge(prediction.status)}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg">🏆</span>
                                            <span className="text-sm text-gray-600">Νικητής:</span>
                                            <span className="font-semibold text-gray-900">{prediction.prediction.winner}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg">🧮</span>
                                            <span className="text-sm text-gray-600">Σκορ:</span>
                                            <span className="font-semibold text-gray-900">{prediction.prediction.score}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg">🔀</span>
                                            <span className="text-sm text-gray-600">Tie-break:</span>
                                            <span className="font-semibold text-gray-900">{prediction.prediction.tiebreak}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end">
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-green-600">
                                                {prediction.pointsEarned > 0 ? `+${prediction.pointsEarned}π` : '0π'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Πόντοι κερδισμένοι
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