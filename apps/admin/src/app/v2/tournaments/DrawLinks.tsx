'use client';
import { Ghost } from '../kit';

/**
 * The draw sheet links of a tournament (founder, 19 Nov 2026: TAF keeps the doubles draws in a separate file). The
 * first link is the one the tournament always had; «+ Ταμπλό από άλλο αρχείο» adds another file, each one removable.
 * Every link is read on each update and its draws are stored side by side.
 */
export function DrawLinks({ links, onChange, disabled }: { links: string[]; onChange: (links: string[]) => void; disabled?: boolean }) {
  const rows = links.length > 0 ? links : [''];
  const set = (i: number, v: string) => onChange(rows.map((x, k) => (k === i ? v : x)));
  const remove = (i: number) => onChange(rows.filter((_, k) => k !== i));
  const canAdd = rows[rows.length - 1]!.trim() !== '';
  return (
    <div className="v2-field">
      Draws sheet links (optional)
      <div className="v2-stack" style={{ gap: 6 }}>
        {rows.map((u, i) => (
          <div key={i} className="v2-row v2-enter" style={{ gap: 6, flexWrap: 'nowrap' }}>
            <input
              className="v2-input"
              style={{ flex: 1 }}
              value={u}
              disabled={disabled}
              aria-label={i === 0 ? 'Draws sheet link' : `Draws sheet link ${i + 1}`}
              placeholder={i === 0 ? 'https://docs.google.com/spreadsheets/d/...' : 'Another file, e.g. the doubles draws'}
              onChange={(e) => set(i, e.target.value)}
            />
            {rows.length > 1 ? (
              <Ghost small disabled={disabled} onClick={() => remove(i)}>
                Remove
              </Ghost>
            ) : null}
          </div>
        ))}
      </div>
      <div className="v2-row">
        <Ghost small disabled={disabled || !canAdd} onClick={() => onChange([...rows, ''])}>
          + Ταμπλό από άλλο αρχείο
        </Ghost>
      </div>
    </div>
  );
}

/** the links as they will be saved: trimmed, no blanks */
export const filledLinks = (links: string[]) => links.map((u) => u.trim()).filter(Boolean);

/** the same list of links, ignoring blanks and spaces */
export const sameLinks = (a: string[], b: string[]) => filledLinks(a).join('\n') === filledLinks(b).join('\n');
