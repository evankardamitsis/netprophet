import type { Draw } from './draw';
import type { SheetPerson } from './names';
import type { SheetMatch } from './oop';
import { fold } from './text';

/**
 * The round of a match (founder, 4 Nov 2026: semifinals and finals stand out and get their own pushes). Only what the
 * source says for sure: a label we know, or the match's place in its draw. «Round 1» says nothing about the draw's
 * size, so it stays unknown; the words in the database are the app's keys (t.match.rounds), never the source's.
 */
export type RoundKey = 'round64' | 'round32' | 'round16' | 'quarter' | 'semi' | 'final';

const LABELS: Record<string, RoundKey> = {
  roundof64: 'round64',
  roundof32: 'round32',
  roundof16: 'round16',
  roundof8: 'quarter',
  quarterfinal: 'quarter',
  quarterfinals: 'quarter',
  προημιτελικοσ: 'quarter',
  προημιτελικα: 'quarter',
  roundof4: 'semi',
  semifinal: 'semi',
  semifinals: 'semi',
  ημιτελικοσ: 'semi',
  ημιτελικα: 'semi',
  final: 'final',
  finals: 'final',
  τελικοσ: 'final',
};

/** «Quarter final», «Semi-final», «ΗΜΙΤΕΛΙΚΟΣ» → the key; anything else → null */
export function roundFromLabel(raw: string | null | undefined): RoundKey | null {
  return LABELS[fold(raw ?? '').replace(/[^\p{L}\p{N}]/gu, '')] ?? null;
}

const FROM_LAST: RoundKey[] = ['final', 'semi', 'quarter', 'round16', 'round32', 'round64'];

/** every person of a side named in what the draw wrote for that slot («ΧΑΜΑΜΗΣ ΧΑΜΑΜΗΣ», «ΠΑΠΑΣ Γ.») */
function named(side: SheetPerson[], slot: string | null): boolean {
  const written = fold(slot ?? '');
  return written !== '' && side.length > 0 && side.every((p) => p.surname !== '' && written.includes(fold(p.surname)));
}

/** a row the source did not label takes its round from its category's knockout draw, when exactly one slot holds both sides */
export function roundsFromDraws(matches: SheetMatch[], draws: Draw[]): SheetMatch[] {
  return matches.map((m) => {
    if (m.round) return m;
    const d = draws.find((x) => x.format === 'knockout' && x.discipline === m.discipline && x.level === m.level);
    if (!d) return m;
    const hits = d.rounds.flatMap((matchesOfRound, i) =>
      matchesOfRound
        .filter((s) => !s.bye)
        .filter(
          (s) =>
            (named(m.players.side1, s.side1) && named(m.players.side2, s.side2)) ||
            (named(m.players.side1, s.side2) && named(m.players.side2, s.side1)),
        )
        .map(() => FROM_LAST[d.rounds.length - 1 - i]),
    );
    return hits.length === 1 && hits[0] ? { ...m, round: hits[0] } : m;
  });
}
