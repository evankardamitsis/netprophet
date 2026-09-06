// lib/daily/content/generate.ts
//
// snapshot -> facts -> ranked -> rendered -> validated -> cards.
//
// Runs offline, after an upload. Nothing here is called from a render: the
// output goes to review, and only approved cards reach a player.

import type { Locale } from '../copy';
import type { GameCard } from '../types';
import type { Snapshot } from '../providers/supabase';
import { resultFacts, setScoreFacts, type Fact, type ResultValue } from './facts';
import { rank, type Context } from './interest';
import { renderResult } from './templates/result';
import { renderScore } from './templates/score';
import { validateCard, type Issue } from './validate';

export interface Candidate {
    card: GameCard;
    /** what the card was built from, for the reviewer and for audit */
    fact: Fact;
    interest: number;
}

export interface Rejection {
    factId: string;
    cardId: string | null;
    issues: Issue[];
}

export interface GenerationRun {
    locale: Locale;
    generatedAt: string;
    candidates: Candidate[];
    rejected: Rejection[];
}

/**
 * Build every card the snapshot can support, best first.
 *
 * Deliberately does not cut to a run length — that is `schedule.ts`, which
 * rations the pool across the days until the next upload. This produces the
 * pool.
 */
export function generate({
    snapshot, locale, now = new Date().toISOString(), recentlyFeatured,
}: {
    snapshot: Snapshot;
    locale: Locale;
    now?: string;
    recentlyFeatured?: Set<string>;
}): GenerationRun {
    const context: Context = { now, recentlyFeatured };

    const facts: { fact: Fact<ResultValue>; render: typeof renderResult }[] = [
        ...resultFacts(snapshot).map((fact) => ({ fact, render: renderResult })),
        ...setScoreFacts(snapshot).map((fact) => ({ fact, render: renderScore })),
    ];

    // Rank the facts, then render in that order, so the best material is what
    // a reviewer sees first.
    const order = new Map(
        rank(facts.map((f) => f.fact), context).map((f, i) => [f.id, { i, interest: f.interest }]),
    );

    const candidates: Candidate[] = [];
    const rejected: Rejection[] = [];

    for (const { fact, render } of facts) {
        const card = render(fact, snapshot, locale, now);
        if (!card) {
            rejected.push({
                factId: fact.id, cardId: null,
                issues: [{ rule: 'not-renderable', detail: 'the template declined this fact' }],
            });
            continue;
        }

        // Tournament names are proper nouns, not English leaking into Greek.
        const verdict = validateCard(card, locale, {
            properNouns: [...snapshot.tournaments.values()].map((t) => t.name),
        });
        if (!verdict.ok) {
            rejected.push({ factId: fact.id, cardId: card.id, issues: verdict.issues });
            continue;
        }

        candidates.push({ card, fact, interest: order.get(fact.id)?.interest ?? 0 });
    }

    candidates.sort((x, y) => y.interest - x.interest);
    return { locale, generatedAt: now, candidates, rejected };
}
