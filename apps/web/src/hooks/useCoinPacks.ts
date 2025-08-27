import { useState, useEffect } from 'react';
import { supabase } from '@netprophet/lib';

interface CoinPack {
  id: string;
  name: string;
  base_coins: number;
  bonus_coins: number;
  price_euro: number;
  is_active: boolean;
}

interface UseCoinPacksReturn {
  coinPacks: CoinPack[];
  loading: boolean;
  error: string | null;
}

export function useCoinPacks(): UseCoinPacksReturn {
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoinPacks = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('coin_packs')
          .select('*')
          .eq('is_active', true)
          .order('price_euro', { ascending: true });

        if (error) {
          throw error;
        }

        setCoinPacks(data || []);
      } catch (err) {
        console.error('Error fetching coin packs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch coin packs');
      } finally {
        setLoading(false);
      }
    };

    fetchCoinPacks();
  }, []);

  return { coinPacks, loading, error };
}
