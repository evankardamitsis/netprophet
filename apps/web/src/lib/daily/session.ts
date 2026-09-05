// lib/daily/session.ts
//
// Builds one run: take everything the registered generators can produce, drop
// what this tester has already seen, shuffle with a seed derived from the date
// so a reload gives the same run back, and cut to eight.

import { allCards } from './generators';
import type { GameCard } from './types';

export const RUN_SIZE = 8;

/** Deterministic PRNG — same seed, same run. */
function mulberry32(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
        t = (t + 0x6d2b79f5) >>> 0;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

/** A stable 32-bit seed for a string, so '2026-09-05' always shuffles the same. */
export function seedFrom(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Shuffle deterministically from a string seed. Used by OrderList too. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
    return shuffle(items, mulberry32(seedFrom(seed)));
}

function shuffle<T>(items: T[], rand: () => number): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

export function buildRun({
    seenCardIds = [],
    seed,
    size = RUN_SIZE,
}: {
    seenCardIds?: string[];
    /** Usually the date, so the run is stable across reloads within a day. */
    seed: string;
    size?: number;
}): GameCard[] {
    const pool = allCards();
    const seen = new Set(seenCardIds);
    const fresh = pool.filter((c) => !seen.has(c.id));

    // Once a tester has exhausted the deck, replaying beats a dead end.
    const source = fresh.length > 0 ? fresh : pool;

    const rand = mulberry32(seedFrom(seed));
    const picked: GameCard[] = [];
    const used = new Set<string>();

    for (const card of shuffle(source, rand)) {
        if (used.has(card.id)) continue;   // no repeats within a run
        used.add(card.id);
        picked.push(card);
        if (picked.length === size) break;
    }

    return picked;
}
