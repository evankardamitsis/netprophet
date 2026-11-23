import { useEffect, useState } from 'react';
import { useApi } from './data';
import { supabase } from './supabase';

/**
 * «Οι δικοί σου» on the tournament pages: the players you follow (known or friends, api.my_follows, your own rows
 * only). Your claimed player is added by the screen (get_tournament's `me`). Kept between screens so the marks show
 * at once; read again on every mount, so a follow made elsewhere shows on the next visit.
 */

/** the dev guest follows two of the sample tournament's players, so the marks and the row show */
const MOCK_FOLLOWS = ['nik', 'gio'];

let cached: string[] | null = null;

export function useFollowedIds(): string[] {
  return useFollows().ids;
}

/**
 * The same, and whether the list has come in (so an empty «Οι δικοί σου» line never flashes for someone who follows).
 * A new `reread` (the home passes one per focus) reads the list again, so a follow made on Παίκτες shows on return.
 */
export function useFollows(reread?: number): { ids: string[]; loaded: boolean } {
  const api = useApi();
  const [loaded, setLoaded] = useState(!api || cached !== null);
  const [ids, setIds] = useState<string[]>(api ? cached ?? [] : MOCK_FOLLOWS);
  useEffect(() => {
    if (!api || !supabase) return undefined;
    let live = true;
    supabase
      .from('my_follows')
      .select('player_id')
      .then(({ data, error }) => {
        if (!live || error || !data) return;
        cached = data.map((r) => r.player_id as string).filter(Boolean);
        setIds(cached);
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [api, reread]);
  return { ids, loaded };
}
