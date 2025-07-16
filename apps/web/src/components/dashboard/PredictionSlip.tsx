'use client';

import { Card, CardContent, Button, Badge } from '@netprophet/ui';

import { Match, PredictionItem } from '@/types/dashboard';

// Icon component
function XIcon() {
  return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
}

function TargetIcon({ className = "h-8 w-8 text-green-500" }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
}

interface PredictionSlipProps {
    predictions: PredictionItem[];
    onRemovePrediction: (matchId: number) => void;
    onSubmitPredictions: () => void;
}

export function PredictionSlip({ predictions, onRemovePrediction, onSubmitPredictions }: PredictionSlipProps) {
    const getTotalPoints = () => predictions.reduce((total, item) => total + item.points, 0);

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

    return (
        <div className="w-80 bg-white border-l border-gray-200 p-6">
            <div className="sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Prediction Slip</h3>

                {predictions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <TargetIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No predictions yet</p>
                        <p className="text-sm">Select matches to add to your slip</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {predictions.map((item) => (
                            <Card key={item.matchId}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">
                                                {item.match.player1.name} vs {item.match.player2.name}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">{item.match.tournament || 'Tournament'}</div>
                                        </div>
                                        <button
                                            onClick={() => onRemovePrediction(item.matchId)}
                                            className="text-gray-400 hover:text-gray-600 ml-2"
                                        >
                                            <XIcon />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center space-x-2">
                                            <Badge variant={getStatusColor(item.match.status)} className="text-xs">
                                                {item.match.status === 'live' ? 'LIVE' : item.match.status.toUpperCase()}
                                            </Badge>
                                            <span className="text-xs text-gray-500">{item.match.time}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm">
                                            <span className="text-gray-600">Pick: </span>
                                            <span className="font-medium text-blue-600">{item.prediction}</span>
                                        </div>
                                        <div className="text-sm font-semibold text-green-600">
                                            +{item.points}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-semibold text-gray-900">Total Points:</span>
                                <span className="text-lg font-bold text-green-600">+{getTotalPoints()}</span>
                            </div>
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={onSubmitPredictions}
                            >
                                Submit Predictions ({predictions.length})
                            </Button>
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-2">Quick Stats</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500">Matches:</span>
                                    <span className="font-medium ml-1">{predictions.length}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Live:</span>
                                    <span className="font-medium ml-1">{predictions.filter(p => p.match.status === 'live').length}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Avg Points:</span>
                                    <span className="font-medium ml-1">{predictions.length > 0 ? Math.round(getTotalPoints() / predictions.length) : 0}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Tournaments:</span>
                                    <span className="font-medium ml-1">{new Set(predictions.map(p => p.match.tournament)).size}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 