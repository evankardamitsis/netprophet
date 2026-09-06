// lib/daily/content/generate.ts
//
// snapshot -> facts -> ranked -> rendered -> validated -> cards.
//
// Runs offline, after an upload. Nothing here is called from a render: the
// output goes to review, and only approved cards reach a player.

import type { Locale } from '../copy';
import type { GameCard } from '../types';
import type { Snapshot } from '../providers/supabase';
import {
    awardFacts, contrastFacts, rankingFacts, resultFacts, setScoreFacts, upsetFacts,
    type AwardValue, type ContrastValue, type Fact, type RankingValue,
} from './facts';
import { rank, type Context } from './interest';
import { renderAward, renderContrast } from './templates/opinion';
import { renderOrder } from './templates/order';
import { renderResult } from './templates/result';
import { renderScore } from './templates/score';
import { renderUpset } from './templates/upset';
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

    const results = resultFacts(snapshot);
    const upsets = upsetFacts(snapshot);

    // A pairing of a fact with the template that knows how to speak it.
    const jobs: { fact: Fact; build: () => GameCard | null }[] = [
        ...results.map((fact) => ({
            fact, build: () => renderResult(fact, snapshot, locale, now),
        })),
        ...setScoreFacts(snapshot).map((fact) => ({
            fact, build: () => renderScore(fact, snapshot, locale, now),
        })),
        // An upset card needs two ordinary results to sit beside the shock.
        ...upsets.map((fact) => ({
            fact,
            build: () => renderUpset(
                fact,
                results.filter((r) => !upsets.some((u) => u.value.matchId === r.value.matchId)),
                snapshot, locale, now,
            ),
        })),
        ...rankingFacts(snapshot).map((fact) => ({
            fact, build: () => renderOrder(fact as Fact<RankingValue>, snapshot, locale),
        })),
        ...awardFacts(snapshot).map((fact) => ({
            fact, build: () => renderAward(fact as Fact<AwardValue>, snapshot, locale),
        })),
        ...contrastFacts(snapshot).map((fact) => ({
            fact, build: () => renderContrast(fact as Fact<ContrastValue>, snapshot, locale),
        })),
    ];

    // Rank the facts, then render in that order, so the best material is what
    // a reviewer sees first.
    const scored = new Map(
        rank(jobs.map((j) => j.fact), context).map((f) => [f.id, f.interest]),
    );

    const candidates: Candidate[] = [];
    const rejected: Rejection[] = [];
    const properNouns = [...snapshot.tournaments.values()].map((t) => t.name);

    for (const { fact, build } of jobs) {
        const card = build();
        if (!card) {
            rejected.push({
                factId: fact.id, cardId: null,
                issues: [{ rule: 'not-renderable', detail: 'the template declined this fact' }],
            });
            continue;
        }

        // Tournament names are proper nouns, not English leaking into Greek.
        const verdict = validateCard(card, locale, { properNouns });
        if (!verdict.ok) {
            rejected.push({ factId: fact.id, cardId: card.id, issues: verdict.issues });
            continue;
        }

        candidates.push({ card, fact, interest: scored.get(fact.id) ?? 0 });
    }

    candidates.sort((x, y) => y.interest - x.interest);
    return { locale, generatedAt: now, candidates, rejected };
}
