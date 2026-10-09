/** Level and unlock rules. Stub. */
export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 100) + 1);
}
