import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStripePayment } from '@/hooks/useStripePayment';

export type CoinPack = {
    id: string;
    name: string;
    priceEuro: number;
    baseCoins: number;
    bonusCoins: number;
};

const coinPacks: CoinPack[] = [
    {
        id: "starter",
        name: "Starter Pack",
        priceEuro: 1.99,
        baseCoins: 350,
        bonusCoins: 0
    },
    {
        id: "basic",
        name: "Basic Pack",
        priceEuro: 4.99,
        baseCoins: 900,
        bonusCoins: 50
    },
    {
        id: "pro",
        name: "Pro Pack",
        priceEuro: 9.99,
        baseCoins: 1800,
        bonusCoins: 150
    },
    {
        id: "champion",
        name: "Champion Pack",
        priceEuro: 19.99,
        baseCoins: 3600,
        bonusCoins: 300
    },
    {
        id: "legend",
        name: "Legend Pack",
        priceEuro: 39.99,
        baseCoins: 7000,
        bonusCoins: 700
    }
];

interface CoinTopUpSectionProps {
    onTopUp?: (pack: CoinPack) => void;
}

export function CoinTopUpSection({ onTopUp }: CoinTopUpSectionProps) {
    const { isProcessing, processPayment } = useStripePayment();
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">💳</span>
                Coin Top-Up Packs
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-4">
                {coinPacks.map((pack) => {
                    const totalCoins = pack.baseCoins + pack.bonusCoins;
                    const valueRatio = totalCoins / pack.priceEuro;
                    const isBestValue = valueRatio === Math.max(...coinPacks.map(p => (p.baseCoins + p.bonusCoins) / p.priceEuro));
                    const isProPack = pack.id === 'pro';

                    return (
                        <Card key={pack.id} className={`group relative overflow-hidden border-2 transition-all duration-500 hover:scale-105 cursor-pointer bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-600/50 backdrop-blur-sm ${isBestValue ? 'border-yellow-400/80 shadow-2xl shadow-yellow-400/20' : 'hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10'} ${isProPack ? 'col-span-2 md:col-span-1 lg:col-span-1 xl:col-span-1' : ''}`}>
                            {/* Background gradient overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${isBestValue ? 'from-yellow-400/5 to-orange-500/5' : 'from-purple-500/5 to-blue-500/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                            {isBestValue && (
                                <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-orange-500 text-white px-3 py-1 text-xs font-bold rounded-bl-xl shadow-lg">
                                    ⭐ BEST VALUE
                                </div>
                            )}
                            {pack.bonusCoins > 0 && (
                                <div className="absolute top-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-2 py-1 text-xs font-bold rounded-br-xl shadow-lg flex items-center gap-1">
                                    <span className="text-xs">🌕</span>
                                    <span>+{pack.bonusCoins.toLocaleString()}</span>
                                </div>
                            )}

                            <CardHeader className="pb-2 md:pb-3 relative z-10">
                                <CardTitle className="text-xs md:text-base text-center font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mt-4">{pack.name}</CardTitle>
                                <div className="text-center mt-1 md:mt-2">
                                    <div className="text-lg md:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">€{pack.priceEuro}</div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0 text-center relative z-10">
                                <div className="space-y-2 md:space-y-4">
                                    <div className="flex items-center justify-center gap-2 md:gap-3">
                                        <div className="text-lg md:text-2xl animate-pulse">🌕</div>
                                        <span className="text-base md:text-xl font-bold text-white">{pack.baseCoins.toLocaleString()}</span>
                                    </div>
                                    <div className="text-xs md:text-base font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                        {totalCoins.toLocaleString()} Total
                                    </div>
                                </div>
                                <Button
                                    onClick={() => {
                                        if (onTopUp) {
                                            onTopUp(pack);
                                        } else {
                                            processPayment(pack.id);
                                        }
                                    }}
                                    disabled={isProcessing}
                                    className={`w-full mt-3 md:mt-6 py-1.5 md:py-3 text-sm md:text-base font-bold text-white transition-all duration-300 ${isBestValue
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg shadow-yellow-500/25'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-purple-500/25'
                                        } hover:scale-105 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isProcessing ? 'Processing...' : 'Buy Now'}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
