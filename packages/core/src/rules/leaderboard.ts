/** Ladder and leaderboard ranking rules. Stub. */
export interface LadderEntry {
  userId: string;
  points: number;
}
export function rankLadder(entries: readonly LadderEntry[]): LadderEntry[] {
  return [...entries].sort((a, b) => b.points - a.points);
}
