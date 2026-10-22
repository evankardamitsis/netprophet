/**
 * What the header shows for σερί while result cards wait to play (πόντοι: hudPoints.ts, held back card by card).
 * The server has already counted every result.
 *
 * σερί goes card by card, as the spec has it (each card plays its own change: +1, a fall to 0, a frost). The header
 * shows the σερί from before the card at the head of the queue until that card plays, then the σερί the card left.
 * A card says «+15 · σερί 3», the «+1» flies, and the header reads 3, not the σερί of the last card behind it
 * (founder, 22 Oct: «isn't it supposed to show the correct voting streak?»: the header read 2 under a card saying 3).
 * Once the queue is empty (played, or «Πάρε τους πόντους») it is get_me's again, the number the last card left.
 *
 * That holds only on the feed, where the cards play: on any other screen the header shows get_me as it is, the same
 * σερί Εγώ and the Ladder show (founder, 18 Oct: «σερί 3» in the header over «σερί 5» on Εγώ).
 */
export interface PendingResult {
  id: string;
  /** σερί before this card and after it */
  streakBefore: number;
  streak: number;
}

/** σερί at the head of the queue (oldest first): before the card until it plays, then what it left */
export function streakAtHead(pending: readonly PendingResult[], applied: ReadonlySet<string>): number | null {
  const head = pending[0];
  if (!head) return null;
  return applied.has(head.id) ? head.streak : head.streakBefore;
}

export function hudNumbers(
  pending: readonly PendingResult[],
  applied: ReadonlySet<string>,
  onFeed: boolean,
): { streakShown: number | null } {
  return { streakShown: onFeed ? streakAtHead(pending, applied) : null };
}
