'use client';

import { ScratchPanel } from '@/components/daily/ScratchPanel';
import { surface } from '@/lib/daily/tokens';

// Bottom sheet in three moods. It stays mounted and slides, so the transition
// runs in both directions.
//
// `explanation` carries <b> from the card data — that string is authored in
// `lib/daily/providers` and never comes from a tester or a network response.
// On a `scratch` card it goes under the foil instead of straight onto the
// sheet, and nothing moves forward until the foil is off.

export type FeedbackMood = 'win' | 'lose' | 'info';

export function FeedbackSheet({
    open, mood, title, explanation, actionLabel, onAction, children,
    scratch, scratchKey, scratched, onScratchCleared, onScratchTick, onScratchStart,
}: {
    open: boolean;
    mood: FeedbackMood;
    title: string;
    explanation: string;
    /** omitted when `children` supplies its own way forward */
    actionLabel?: string;
    onAction?: () => void;
    /** the risk choice takes the place of a plain continue button */
    children?: React.ReactNode;
    /** hide the explanation under foil */
    scratch?: boolean;
    /** remounts the foil when the card changes */
    scratchKey?: string;
    scratched?: boolean;
    onScratchCleared?: () => void;
    onScratchTick?: () => void;
    onScratchStart?: () => void;
}) {
    const locked = Boolean(scratch) && !scratched;

    return (
        <div
            className={`np-fb is-${mood}${open ? ' is-up' : ''}`}
            role="status"
            aria-hidden={!open}
        >
            <h4>{title}</h4>

            {scratch ? (
                <ScratchPanel
                    key={scratchKey}
                    html={explanation}
                    tone={
                        mood === 'lose' ? surface.scratchToneLose : surface.scratchToneWin
                    }
                    onCleared={onScratchCleared}
                    onTick={onScratchTick}
                    onStart={onScratchStart}
                />
            ) : (
                <p dangerouslySetInnerHTML={{ __html: explanation }} />
            )}

            {children ?? (
                <button
                    type="button"
                    className="np-cta"
                    onClick={onAction}
                    disabled={locked}
                    tabIndex={open ? 0 : -1}
                >
                    {locked ? 'Ξύσε πρώτα' : actionLabel}
                </button>
            )}
        </div>
    );
}