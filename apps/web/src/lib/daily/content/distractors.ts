// lib/daily/content/distractors.ts
//
// A `score` card is only as good as its wrong answers. Every distractor is a
// perturbation of the real scoreline rather than an invention, so it is the
// same shape and the same length and gives nothing away (content spec §4.4).
//
// Deterministic: the same match always produces the same options, so a card
// regenerated after review does not quietly change under the reviewer.

/** Stable per-match randomness, so regeneration is idempotent. */
function seeded(seed: string): () => number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 15), 1 | h);
        h = (h + Math.imul(h ^ (h >>> 7), 61 | h)) ^ h;
        return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
    };
}

/** "6-4, 2-6, [17-15]" — brackets mark the champions tiebreak, as tennis does. */
export function formatScoreline(sets: string[], superTiebreak: boolean): string {
    if (sets.length === 0) return '';
    const body = superTiebreak ? sets.slice(0, -1) : sets;
    const decider = superTiebreak ? sets[sets.length - 1] : null;
    return [...body, decider ? `[${decider}]` : null].filter(Boolean).join(', ');
}

function flipSet(set: string): string {
    const [a, b] = set.split('-').map((n) => n.trim());
    return a && b ? `${b}-${a}` : set;
}

/** Nudge a tiebreak margin without making it implausible. */
function shiftTiebreak(set: string, by: number): string {
    const [a, b] = set.split('-').map((n) => Number.parseInt(n, 10));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return set;
    const high = Math.max(a, b) + by;
    const low = high - Math.abs(a - b);
    return a >= b ? `${high}-${low}` : `${low}-${high}`;
}

/**
 * Two wrong scorelines for a real one.
 *
 * Each is a different *kind* of wrong — a reversed set, a match that never went
 * the distance, a tiebreak decided by a different margin — so no two distractors
 * mean the same thing, and none of them is accidentally true.
 */
export function scoreDistractors(
    { sets, superTiebreak, matchId }: {
        sets: string[]; superTiebreak: boolean; matchId: string;
    },
    count = 2,
): string[] {
    const truth = formatScoreline(sets, superTiebreak);
    const random = seeded(matchId);
    const candidates: string[] = [];

    if (superTiebreak && sets.length >= 3) {
        // Same match, tiebreak decided differently.
        const shifted = [...sets];
        shifted[shifted.length - 1] = shiftTiebreak(sets[sets.length - 1], 2);
        candidates.push(formatScoreline(shifted, true));

        // Never went the distance: the first set holds, the second flips.
        candidates.push(formatScoreline([sets[0], flipSet(sets[1])], false));

        // The other player took it in three.
        candidates.push(formatScoreline(
            [flipSet(sets[0]), flipSet(sets[1]), flipSet(sets[2])], true,
        ));
    } else if (sets.length >= 2) {
        // Straight sets: it could have gone the distance instead.
        candidates.push(formatScoreline([sets[0], flipSet(sets[1]), '10-8'], true));
        candidates.push(formatScoreline([flipSet(sets[0]), flipSet(sets[1])], false));
        candidates.push(formatScoreline([sets[0], '7-6'], false));
    }

    const seen = new Set([truth]);
    const chosen: string[] = [];
    // Shuffle so the same perturbation is not always first.
    for (const candidate of candidates.sort(() => random() - 0.5)) {
        if (!candidate || seen.has(candidate)) continue;
        seen.add(candidate);
        chosen.push(candidate);
        if (chosen.length === count) break;
    }
    return chosen;
}

/** The answer among its distractors, in a stable but non-obvious position. */
export function placeAnswer(
    answer: string, distractors: string[], seed: string,
): { options: string[]; correctIndex: number } {
    const random = seeded(seed);
    const index = Math.floor(random() * (distractors.length + 1));
    const options = [...distractors];
    options.splice(index, 0, answer);
    return { options, correctIndex: index };
}
