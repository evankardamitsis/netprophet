export type Side = 'a' | 'b';

export interface Split {
  pctA: number;
  pctB: number;
  total: number;
}

/**
 * Vote split after the viewer adds their own vote. Percentages are whole numbers that always sum
 * to 100 (B is the remainder). With no votes at all it is 50/50.
 * This is display only: the server decides everything that counts.
 */
export function voteSplit(votesA: number, votesB: number, pick?: Side): Split {
  const a = Math.max(0, votesA) + (pick === 'a' ? 1 : 0);
  const b = Math.max(0, votesB) + (pick === 'b' ? 1 : 0);
  const total = a + b;
  if (total === 0) return { pctA: 50, pctB: 50, total: 0 };
  const pctA = Math.round((a / total) * 100);
  return { pctA, pctB: 100 - pctA, total };
}

/** Replace `{key}` placeholders in a copy string. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}
