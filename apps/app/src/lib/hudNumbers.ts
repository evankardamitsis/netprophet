/**
 * What the header shows while result cards wait to play. The server has already counted every result, so until a
 * card plays the header shows the σερί from before it and holds back its points. That holds only on the feed, where
 * the cards play: on any other screen the header shows get_me as it is, the same σερί Εγώ and the Ladder show
 * (founder, 18 Oct: «σερί 3» in the header over «σερί 5» on Εγώ).
 */
export interface PendingResult {
  id: string;
  points: number;
  streakBefore: number;
}

export function hudNumbers(
  pending: PendingResult[],
  applied: ReadonlySet<string>,
  onFeed: boolean,
): { pointsOffset: number; streakShown: number | null } {
  if (!onFeed) return { pointsOffset: 0, streakShown: null };
  const waiting = pending.filter((r) => !applied.has(r.id));
  return {
    pointsOffset: waiting.reduce((sum, r) => sum + r.points, 0),
    streakShown: waiting.length ? waiting[0]!.streakBefore : null,
  };
}
