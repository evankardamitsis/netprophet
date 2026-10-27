import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import type { Celebration as CelebrationItem } from '@netprophet/db';
import { Celebration } from '../src/components/Celebration';
import { ProWelcome } from '../src/components/ProWelcome';
import { nextGroup } from '../src/lib/celebrate';

const at = '2026-10-18T08:00:00Z';
const SAMPLES: Record<string, CelebrationItem[]> = {
  // a new level: Baller's own level-up move
  level: [{ id: 'lv', created_at: at, payload: { type: 'level', level: 4 } }],
  // σερί 3 and σερί 5 from one batch of results: one moment, the highest, both gifts
  streaks: [
    { id: 's5', created_at: at, payload: { type: 'streak_milestone', streak: 5, match_id: 'm5', reward: { freeze: false, frame: null, gear: 'gear_headband' } } },
    { id: 's3', created_at: at, payload: { type: 'streak_milestone', streak: 3, match_id: 'm3', reward: { freeze: true, frame: null, gear: null } } },
  ],
  badge: [{ id: 'b', created_at: at, payload: { type: 'badge', badge: 'in_a_row', tier: 1, new: true } }],
  // σερί 12 past a ΠΡ of 11: «Νέο ρεκόρ!»
  record: [{ id: 'r', created_at: at, payload: { type: 'streak_record', streak: 12, match_id: 'm12' } }],
};

/**
 * Development builds only: the full-screen moments on sample data, for the founder's review.
 * `/celebrate?kind=pro` (the welcome after buying Pro, on the free week), `/celebrate?kind=level` (the level-up move), `streaks` (σερί 3 and 5 queued together), `badge`, `record`.
 */
export default function CelebratePreview() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const [n, setN] = useState(0);
  if (!__DEV__) return null;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  if (kind === 'pro') return <ProWelcome trialEnd={new Date(Date.now() + 7 * 86400000)} onDone={close} />;
  const group = nextGroup(SAMPLES[kind ?? 'level'] ?? SAMPLES.level!);
  return (
    <Celebration
      key={n}
      items={group}
      onDone={() => (n < 2 ? setN(n + 1) : router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
