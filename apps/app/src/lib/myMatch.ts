import type { Copy } from '@netprophet/copy';
import type { PlayerProfile } from '@netprophet/db';
import { dayKey } from '@netprophet/core';
import { nextLine, nextParts } from './players';

/**
 * «Το ματς σου» on Σήμερα (founder, 14 Oct: "who is my opponent" is one of the four jobs): your claimed player's next
 * match when it is today or tomorrow (Athens), as «Σήμερα 20:37 με τον Γιάννη Πράτσα». Null otherwise, and for an
 * account without a player.
 */
export interface MyMatchView {
  matchId: string;
  line: string;
  /** the same in three lines: «Αύριο 19:30», «απέναντι …», «-40 · Διπλό» */
  when: string;
  who: string;
  category: string | null;
  today: boolean;
  /** when it starts: the home's Pro card says «Ο αντίπαλός σου στις 18:00» */
  startsAt: string;
}

export function myMatchOf(player: PlayerProfile | null, t: Copy, now: Date): MyMatchView | null {
  const m = player?.next_match;
  if (!m) return null;
  const day = dayKey(m.starts_at);
  const today = dayKey(now.toISOString());
  const tomorrow = dayKey(new Date(now.getTime() + 86_400_000).toISOString());
  if (day !== today && day !== tomorrow) return null;
  return { matchId: m.match_id, line: nextLine(m, t, now), ...nextParts(m, t, now), today: day === today, startsAt: m.starts_at };
}
