import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStripePayment } from '@/hooks/useStripePayment';
import { useAuth } from '@/hooks/useAuth';
import { useDictionary } from '@/context/DictionaryContext';
import { supabase } from '@netprophet/lib';
import CoinIcon from '@/components/CoinIcon';

export type CoinPack = {
    id: string;
    name: string;
    priceEuro: number;
    baseCoins: number;
    bonusCoins: number;
};

interface CoinTopUpSectionProps {
    onTopUp?: (pack: CoinPack) => void;
}

export function CoinTopUpSection({ onTopUp }: CoinTopUpSectionProps) {
    const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
    const [loading, setLoading] = useState(true);
    const { isProcessing, processPayment } = useStripePayment();
    const { user } = useAuth();
    const { dict } = useDictionary();

    // Fetch coin packs from database
    useEffect(() => {
        const fetchCoinPacks = async () => {
            try {
                const { data, error } = await supabase
                    .from('coin_packs')
                    .select('*')
                    .eq('is_active', true)
                    .order('price_euro', { ascending: true });

                if (error) {
                    console.error('Error fetching coin packs:', error);
                    return;
                }

                // Transform database format to component format
                const transformedPacks: CoinPack[] = (data || []).map(pack => ({
                    id: pack.id,
                    name: pack.name,
                    priceEuro: pack.price_euro,
                    baseCoins: pack.base_coins,
                    bonusCoins: pack.bonus_coins
                }));

                setCoinPacks(transformedPacks);
            } catch (error) {
                console.error('Error fetching coin packs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCoinPacks();
    }, []);

    return (
        <div className="space-y-8 w-full">
            {/* Header */}
            <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                    {dict.rewards.coinTopUpPacks}
                </h3>
                <p className="text-gray-400 text-md">{dict.rewards.coinTopUpDescription}</p>
            </div>

            {loading ? (
                <div className="text-center py-8">
                    <div className="text-white/60">{dict.rewards.loadingCoinPacks}</div>
                </div>
            ) : coinPacks.length === 0 ? (
                <div className="text-center py-8">
                    <div className="text-white/60">{dict.rewards.noCoinPacks}</div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-4 w-full">
                    {coinPacks.map((pack, index) => {
                        const totalCoins = pack.baseCoins + pack.bonusCoins;
                        const valueRatio = totalCoins / pack.priceEuro;
                        const isBestValue = valueRatio === Math.max(...coinPacks.map(p => (p.baseCoins + p.bonusCoins) / p.priceEuro));
                        const isProPack = pack.name.toLowerCase().includes('pro') || pack.id.toLowerCase().includes('pro');


                        // Mobile layout: first 2 packs fit in 1 row, rest span full width
                        const getMobileLayoutClass = () => {
                            if (index < 2) {
                                // First 2 packs take half width on mobile
                                return 'col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1';
                            } else {
                                // Check if this is the last pack and there's an odd total (would be alone)
                                const isLastPack = index === coinPacks.length - 1;
                                const hasOddTotal = coinPacks.length % 2 === 1;

                                if (isLastPack && hasOddTotal) {
                                    // Last pack alone on mobile gets full width
                                    return 'col-span-2 md:col-span-1 lg:col-span-1 xl:col-span-1';
                                } else {
                                    // Other packs take full width on mobile
                                    return 'col-span-2 md:col-span-1 lg:col-span-1 xl:col-span-1';
                                }
                            }
                        };

                        return (
                            <Card key={pack.id} className={`group relative overflow-hidden border-2 transition-all duration-500 hover:scale-105 cursor-pointer bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-600/50 backdrop-blur-sm ${isBestValue ? 'border-yellow-400/80 shadow-2xl shadow-yellow-400/20' : 'hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10'} ${getMobileLayoutClass()}`}>
                                {/* Background gradient overlay */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${isBestValue ? 'from-yellow-400/5 to-orange-500/5' : 'from-purple-500/5 to-blue-500/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                                {isBestValue && !isProPack && (
                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-orange-500 text-white px-3 py-1 text-xs font-bold rounded-bl-xl shadow-lg">
                                        {dict.rewards.bestValue}
                                    </div>
                                )}
                                {pack.bonusCoins > 0 && (
                                    <div className="absolute top-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-2 py-1 text-xs font-bold rounded-br-xl shadow-lg flex items-center gap-1">
                                        <CoinIcon size={12} />
                                        <span>+{pack.bonusCoins.toLocaleString()} Bonus</span>
                                    </div>
                                )}
                                {isProPack && (
                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-500 to-pink-500 text-white px-2 py-1 text-xs font-bold rounded-bl-xl shadow-lg">
                                        ⭐ PRO
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
                                            <div className="animate-pulse">
                                                <CoinIcon size={32} />
                                            </div>
                                            <span className="text-base md:text-xl font-bold text-white">{pack.baseCoins.toLocaleString()}</span>
                                        </div>
                                        <div className="text-xs md:text-base font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                            {totalCoins.toLocaleString()} {dict.rewards.total}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={async () => {
                                            if (!user) {
                                                return;
                                            }

                                            if (onTopUp) {
                                                onTopUp(pack);
                                            } else {
                                                try {
                                                    await processPayment(pack.id);
                                                } catch (error) {
                                                    console.error('Payment error:', error);
                                                }
                                            }
                                        }}
                                        disabled={isProcessing || !user}
                                        className={`w-full mt-3 md:mt-6 py-1.5 md:py-3 text-sm md:text-base font-bold text-white transition-all duration-300 ${isBestValue
                                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg shadow-yellow-500/25'
                                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-purple-500/25'
                                            } hover:scale-105 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {!user ? dict.rewards.signInToBuy : isProcessing ? dict.rewards.processing : dict.rewards.buyNow}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
