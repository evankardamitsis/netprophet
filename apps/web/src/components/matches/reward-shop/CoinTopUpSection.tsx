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
        <div className="w-full">
            {loading ? (
                <div className="text-center py-8">
                    <div className="text-[#94A3B8] text-sm">{dict.rewards.loadingCoinPacks}</div>
                </div>
            ) : coinPacks.length === 0 ? (
                <div className="text-center py-8">
                    <div className="text-[#94A3B8] text-sm">{dict.rewards.noCoinPacks}</div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
                    {coinPacks.map((pack, index) => {
                        const totalCoins = pack.baseCoins + pack.bonusCoins;
                        const valueRatio = Math.round(totalCoins / pack.priceEuro);
                        const isLastOdd = index === coinPacks.length - 1 && coinPacks.length % 2 === 1;

                        return (
                            <div key={pack.id} className={`group relative bg-[#161F35] border border-white/[0.06] rounded-2xl p-4 flex flex-col transition-all duration-150 hover:border-white/[0.12] hover:-translate-y-px hover:shadow-elevated ${isLastOdd ? 'col-span-2 md:col-span-1' : ''}`}>
                                {/* Shine line */}
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent rounded-t-2xl" />

                                {pack.bonusCoins > 0 && (
                                    <div className="absolute top-2 left-2 bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676] px-2 py-0.5 text-[9px] font-bold rounded-full">
                                        +{pack.bonusCoins.toLocaleString()} Bonus
                                    </div>
                                )}

                                <div className="flex flex-col items-center text-center flex-1 mt-4 gap-2">
                                    <CoinIcon size={28} />
                                    <div className="text-xl font-black tabular-nums text-white">{totalCoins.toLocaleString()}</div>
                                    <div className="text-[11px] text-[#4B5975]">{valueRatio} νομίσματα / €1</div>
                                </div>

                                <Button
                                    onClick={async () => {
                                        if (!user) return;
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
                                    className="w-full mt-4 py-2.5 rounded-xl bg-[#FFD60A] text-[#080C18] font-black text-sm shadow-[0_4px_16px_rgba(255,214,10,0.3)] hover:bg-[#FFE033] active:scale-95 transition-all disabled:bg-[#1E2A45] disabled:text-[#4B5975] disabled:shadow-none"
                                >
                                    {!user ? dict.rewards.signInToBuy : isProcessing ? dict.rewards.processing : `Αγορά — €${pack.priceEuro}`}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
