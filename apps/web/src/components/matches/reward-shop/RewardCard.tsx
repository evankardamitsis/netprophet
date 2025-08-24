import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@netprophet/ui';

export interface RewardItem {
    id: number;
    title: string;
    description: string;
    image: string;
    points: number;
    category: 'merchandise' | 'experience' | 'badge' | 'premium' | 'boost' | 'exclusive';
    available: boolean;
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
    discount?: number;
    featured?: boolean;
}

interface RewardCardProps {
    reward: RewardItem;
    canAfford: boolean;
    onRedeem: (reward: RewardItem) => void;
    isFeatured?: boolean;
}

export function RewardCard({ reward, canAfford, onRedeem, isFeatured = false }: RewardCardProps) {
    const discountedPoints = reward.discount ? Math.floor(reward.points * (1 - reward.discount / 100)) : reward.points;

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'merchandise':
                return 'bg-blue-900/50 text-blue-300 border-blue-700/50';
            case 'experience':
                return 'bg-green-900/50 text-green-300 border-green-700/50';
            case 'badge':
                return 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50';
            case 'premium':
                return 'bg-purple-900/50 text-purple-300 border-purple-700/50';
            case 'boost':
                return 'bg-orange-900/50 text-orange-300 border-orange-700/50';
            case 'exclusive':
                return 'bg-pink-900/50 text-pink-300 border-pink-700/50';
            default:
                return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'merchandise':
                return 'Merchandise';
            case 'experience':
                return 'Experience';
            case 'badge':
                return 'Badge';
            case 'premium':
                return 'Premium';
            case 'boost':
                return 'Boost';
            case 'exclusive':
                return 'Exclusive';
            default:
                return 'Other';
        }
    };

    const getRarityColor = (rarity?: string) => {
        switch (rarity) {
            case 'common':
                return 'border-slate-600 bg-slate-800/50';
            case 'rare':
                return 'border-blue-600 bg-blue-900/30';
            case 'epic':
                return 'border-purple-600 bg-purple-900/30';
            case 'legendary':
                return 'border-yellow-500 bg-gradient-to-r from-yellow-900/30 to-orange-900/30';
            default:
                return 'border-slate-600 bg-slate-800/50';
        }
    };

    const getRarityLabel = (rarity?: string) => {
        switch (rarity) {
            case 'common':
                return 'Common';
            case 'rare':
                return 'Rare';
            case 'epic':
                return 'Epic';
            case 'legendary':
                return 'Legendary';
            default:
                return 'Common';
        }
    };

    return (
        <Card className={`group relative overflow-hidden border-2 transition-all duration-500 hover:scale-105 cursor-pointer bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-600/50 backdrop-blur-sm hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 ${getRarityColor(reward.rarity)} ${reward.featured ? 'border-yellow-400/80 shadow-2xl shadow-yellow-400/20' : ''}`}>
            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {reward.discount && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-red-500 to-pink-500 text-white px-3 py-1 text-xs font-bold rounded-bl-xl shadow-lg z-10">
                    🔥 -{reward.discount}%
                </div>
            )}

            {isFeatured && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-orange-500 text-white px-3 py-1 text-xs font-bold rounded-bl-xl shadow-lg z-10">
                    ⭐ FEATURED
                </div>
            )}

            <CardHeader className="pb-3 relative z-10">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                        <div className={`${isFeatured ? 'text-6xl' : 'text-5xl'} group-hover:scale-110 transition-transform duration-300`}>{reward.image}</div>
                        <div className="flex-1">
                            <CardTitle className={`${isFeatured ? 'text-xl' : 'text-lg'} font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent`}>{reward.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-3">
                                <Badge variant="secondary" className={`text-xs font-semibold ${getCategoryColor(reward.category)} shadow-sm`}>
                                    {getCategoryLabel(reward.category)}
                                </Badge>
                                <Badge variant="secondary" className={`text-xs font-semibold ${reward.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-lg' : 'bg-gray-100 text-gray-700 shadow-sm'}`}>
                                    {getRarityLabel(reward.rarity)}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0 relative z-10">
                <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                    {reward.description.replace(/'/g, "&#39;")}
                </p>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-400 font-medium">Cost:</span>
                            <div className="flex items-center gap-2">
                                {reward.discount && (
                                    <span className="text-sm text-gray-500 line-through font-medium">
                                        {reward.points} π
                                    </span>
                                )}
                                <span className={`text-lg font-bold ${canAfford ? 'text-green-400' : 'text-red-400'} bg-gradient-to-r ${canAfford ? 'from-green-400 to-emerald-400' : 'from-red-400 to-pink-400'} bg-clip-text text-transparent`}>
                                    {discountedPoints} π
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={() => onRedeem(reward)}
                        disabled={!canAfford || !reward.available}
                        className={`w-full font-bold transition-all duration-300 ${canAfford
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25 hover:scale-105'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {canAfford ? '🎯 Redeem Now' : '❌ Need Points'}
                    </Button>

                    {!canAfford && (
                        <div className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20 text-center">
                            Need {discountedPoints} more points
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
