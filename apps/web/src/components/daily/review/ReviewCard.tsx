'use client';

import { useState } from 'react';
import { CardStage } from '@/components/daily/CardStage';
import { OptionList } from '@/components/daily/answers/OptionList';
import { OrderList } from '@/components/daily/answers/OrderList';
import { PlayerPair } from '@/components/daily/answers/PlayerPair';
import { RowList } from '@/components/daily/answers/RowList';
import { ThisOrThat } from '@/components/daily/answers/ThisOrThat';
import type { GameCard } from '@/lib/daily/types';

// One card as the player will see it, with the evidence beside it.
//
// Rendering the real components rather than a preview is the point: a reviewer
// judging a mock-up is judging the wrong thing, and a card that overflows or
// wraps badly should be visible here rather than in a tester's hands.

export interface ReviewAction {
    id: string;
    action: 'approve' | 'edit' | 'reject';
    corrected?: GameCard;
    reason?: string;
}

/** The strings a reviewer is allowed to change. Answers are not editable. */
function editableFields(card: GameCard): { key: string; label: string; value: string }[] {
    const fields = [
        { key: 'kicker', label: 'Kicker', value: card.kicker },
        { key: 'question', label: 'Question', value: card.question },
        { key: 'explanation', label: 'Explanation', value: card.explanation },
    ];
    if (card.lede !== undefined) {
        fields.push({ key: 'lede', label: 'Lede', value: card.lede });
    }
    return fields;
}

export function ReviewCard({
    card, fact, interest, onAction, busy,
}: {
    card: GameCard;
    fact: { id: string; kind: string; source: { table: string; ids: string[] }; validUntil: string | null };
    interest: number;
    onAction: (action: ReviewAction) => void;
    busy: boolean;
}) {
    const [draft, setDraft] = useState<GameCard>(card);
    const [reason, setReason] = useState('');
    const [editing, setEditing] = useState(false);

    const changed = JSON.stringify(draft) !== JSON.stringify(card);

    return (
        <article className="np-rv">
            <div className="np-rv-preview">
                {/* exactly what the player gets */}
                <CardStage
                    kind={draft.kind}
                    points={draft.points}
                    kicker={draft.kicker}
                    question={draft.question}
                    lede={draft.lede}
                />
                <div className="np-rv-answers">
                    {draft.kind === 'result' && (
                        <PlayerPair card={draft} selectedId={null} answered={false} onSelect={() => {}} />
                    )}
                    {(draft.kind === 'score' || draft.kind === 'guess') && (
                        <OptionList
                            options={draft.options} selectedIndex={null} answered={false}
                            onSelect={() => {}} correctIndex={draft.correctIndex} clues={draft.clues}
                        />
                    )}
                    {(draft.kind === 'poll' || draft.kind === 'award') && (
                        <OptionList
                            options={draft.options} selectedIndex={null} answered={false}
                            onSelect={() => {}} crowdSplit={draft.crowdSplit}
                        />
                    )}
                    {draft.kind === 'thisThat' && (
                        <ThisOrThat
                            options={draft.options} crowdSplit={draft.crowdSplit}
                            selectedIndex={null} answered={false} onSelect={() => {}}
                        />
                    )}
                    {draft.kind === 'upset' && (
                        <RowList
                            rows={draft.rows} mode="single" selected={[]} answered={false}
                            onToggle={() => {}} correctIndex={draft.correctIndex}
                        />
                    )}
                    {draft.kind === 'combo' && (
                        <RowList
                            rows={draft.rows} mode="multi" selected={[]} answered={false}
                            onToggle={() => {}} pickCount={draft.pickCount}
                        />
                    )}
                    {draft.kind === 'order' && (
                        <OrderList
                            cardId={draft.id} items={draft.items} picked={[]}
                            answered={false} correct={false} onPick={() => {}}
                        />
                    )}
                </div>
            </div>

            <div className="np-rv-side">
                <div className="np-rv-meta">
                    <span className="np-rv-tag">{draft.kind}</span>
                    <span>interest {interest.toFixed(2)}</span>
                    <span>{draft.points} pts</span>
                    {!draft.scoring && <span className="np-rv-tag">no answer</span>}
                </div>

                {/* provenance: from a wrong card back to the rows in one step */}
                <div className="np-rv-prov">
                    <div><b>fact</b> {fact.id}</div>
                    <div><b>source</b> {fact.source.table} · {fact.source.ids.join(', ')}</div>
                    <div><b>expires</b> {fact.validUntil ?? 'never'}</div>
                </div>

                <p className="np-rv-expl" dangerouslySetInnerHTML={{ __html: draft.explanation }} />

                {editing && (
                    <div className="np-rv-form">
                        {editableFields(draft).map((field) => (
                            <label key={field.key}>
                                <span>{field.label}</span>
                                <textarea
                                    rows={field.key === 'explanation' ? 3 : 2}
                                    value={field.value}
                                    onChange={(e) =>
                                        setDraft({ ...draft, [field.key]: e.target.value } as GameCard)}
                                />
                            </label>
                        ))}
                        <label>
                            <span>Why (feeds the corpus)</span>
                            <input value={reason} onChange={(e) => setReason(e.target.value)} />
                        </label>
                    </div>
                )}

                <div className="np-rv-actions">
                    {!editing && (
                        <>
                            <button
                                type="button" className="np-rv-btn is-yes" disabled={busy}
                                onClick={() => onAction({ id: draft.id, action: 'approve' })}
                            >
                                Approve
                            </button>
                            <button
                                type="button" className="np-rv-btn" disabled={busy}
                                onClick={() => setEditing(true)}
                            >
                                Edit
                            </button>
                            <button
                                type="button" className="np-rv-btn is-no" disabled={busy}
                                onClick={() => {
                                    const why = window.prompt('Why is this card wrong?');
                                    if (why) onAction({ id: draft.id, action: 'reject', reason: why });
                                }}
                            >
                                Reject
                            </button>
                        </>
                    )}
                    {editing && (
                        <>
                            <button
                                type="button" className="np-rv-btn is-yes"
                                disabled={busy || !changed}
                                onClick={() => onAction({
                                    id: draft.id, action: 'edit', corrected: draft, reason,
                                })}
                            >
                                Save &amp; approve
                            </button>
                            <button
                                type="button" className="np-rv-btn"
                                onClick={() => { setDraft(card); setEditing(false); }}
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>
        </article>
    );
}
