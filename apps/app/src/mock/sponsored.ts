import type { CardSponsored, FeedCard } from '../lib/feed';

/** Sample ads for mock mode and the dev guest, the same made-up businesses as the hosted demo (demo_sponsored.sql). */
export const MOCK_SPONSORED: readonly CardSponsored[] = [
  { kind: 'sponsored', id: 'mock-ad-1', label: 'Χορηγούμενο', title: 'Νέες χορδές σε 24 ώρες', subtitle: 'Φέρε τη ρακέτα το πρωί, πάρ’ τη το απόγευμα.' },
  { kind: 'sponsored', id: 'mock-ad-2', label: 'Χορηγούμενο', title: 'Δωρεάν πρώτο μάθημα', subtitle: 'Για όλα τα levels, κάθε Σάββατο.' },
  { kind: 'sponsored', id: 'mock-ad-3', label: 'Χορηγούμενο', title: 'Ο καφές μετά το ματς κερνάει', subtitle: 'Δείξε το σκορ σου στο ταμείο.' },
];

/** One ad after every fourth card, like api.get_feed. */
export function withMockAds(cards: FeedCard[]): FeedCard[] {
  return cards.flatMap((c, i) => ((i + 1) % 4 === 0 ? [c, MOCK_SPONSORED[((i + 1) / 4 - 1) % MOCK_SPONSORED.length]!] : [c]));
}
