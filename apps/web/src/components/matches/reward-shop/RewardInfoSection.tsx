import { Button } from '@/components/ui/button';

interface RewardInfoSectionProps {
    onViewAll: () => void;
}

export function RewardInfoSection({ onViewAll }: RewardInfoSectionProps) {
    return (
        <div className="mt-12 p-6 bg-gradient-to-r from-slate-800/50 to-purple-900/30 rounded-2xl border border-slate-700/50">
            <div className="flex items-start space-x-4">
                <div className="text-purple-400 text-2xl">ℹ️</div>
                <div className="flex-1">
                    <h4 className="font-bold text-white mb-2 text-lg">How the Reward Shop Works</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                        <div>
                            <h5 className="font-semibold mb-1 text-purple-300">🌕 Earn Points</h5>
                            <p>Make accurate predictions to earn points. The more correct picks, the more points you get!</p>
                        </div>
                        <div>
                            <h5 className="font-semibold mb-1 text-purple-300">🎯 Redeem Rewards</h5>
                            <p>Use your points to unlock premium features, exclusive merchandise, and special experiences.</p>
                        </div>
                        <div>
                            <h5 className="font-semibold mb-1 text-purple-300">⭐ Rarity System</h5>
                            <p>Items come in different rarities: Common, Rare, Epic, and Legendary. Rarer items offer better value!</p>
                        </div>
                        <div>
                            <h5 className="font-semibold mb-1 text-purple-300">🔥 Limited Time</h5>
                            <p>Some items are featured or discounted for a limited time. Don&apos;t miss out on great deals!</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
