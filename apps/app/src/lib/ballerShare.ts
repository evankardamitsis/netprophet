import type { Copy } from '@netprophet/copy';
import { fmt } from './votes';

/** where a friend makes their own Baller */
export const SHARE_URL = 'https://netprophetapp.com';

/** the words that travel with the card: your Baller's name when it has one */
export function shareMessage(t: Copy, name: string | null): string {
  const s = t.baller.share;
  return name ? fmt(s.message, { name, url: SHARE_URL }) : fmt(s.messageNoName, { url: SHARE_URL });
}

/** whose Baller it is, short: «Βαγγέλης Κ.» */
export function ownerLine(first: string, surname: string): string {
  const f = first.trim();
  const initial = [...surname.trim()][0];
  if (!f) return initial ? `${initial}.` : '';
  return initial ? `${f} ${initial.toLocaleUpperCase('el')}.` : f;
}

/** the three numbers on the card: your level from points, σερί, πόντοι μήνα */
export function cardStats(t: Copy, v: { game: { level: number }; streak: number; monthPoints: number }): { value: string; label: string }[] {
  const s = t.baller.share;
  return [
    { value: String(v.game.level), label: s.level },
    { value: String(v.streak), label: s.streak },
    { value: String(v.monthPoints), label: s.points },
  ];
}
