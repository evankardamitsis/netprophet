/** Points rules (server-authoritative; this module is pure and has no IO). Stub. */
export function pointsForVote(correct: boolean): number {
  return correct ? 1 : 0;
}
