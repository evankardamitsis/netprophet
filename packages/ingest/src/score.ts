/**
 * Organiser scores, written from side 1's point of view: «63 76», «62 36 10 6», «75 16 14-16», «57-26»,
 * «64-46 10-8». A two-digit token is one set (6-3); a pair that is not a valid set is a match tie-break
 * (10-6, 14-16), which only decides a match at one set all. «wo» and «tbc» keep their raw text and settle
 * nothing until a clear result exists. Sets come out winner-first, as the database stores them.
 */
export interface SetScore {
  w: number;
  l: number;
  /** a 7-6 set */
  tb?: true;
  /** the match tie-break that decided the match */
  stb?: true;
}

export type ParsedScore =
  | { kind: 'sets'; winnerSide: 1 | 2; sets: SetScore[] }
  | { kind: 'raw'; text: string }
  | { kind: 'empty' };

const RAW = /^(w\.?o\.?|wo|tbc|ret\.?|αναβολη|αναβολή|ακυρο|άκυρο)$/i;

function validSet(a: number, b: number): boolean {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi === 6 && lo <= 4) || (hi === 7 && (lo === 5 || lo === 6));
}

export function parseScore(raw: string | undefined): ParsedScore {
  const text = (raw ?? '').trim();
  if (text === '') return { kind: 'empty' };
  if (RAW.test(text.replace(/\s+/g, ''))) return { kind: 'raw', text };
  const tokens = text
    .replace(/\(\d+\)/g, '')
    .split(/[\s,/-]+/)
    .filter(Boolean);
  if (tokens.some((t) => !/^\d+$/.test(t))) return { kind: 'raw', text };

  const sides: { a: number; b: number; stb?: true }[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;
    if (t.length === 2 && validSet(Number(t[0]), Number(t[1]))) {
      sides.push({ a: Number(t[0]), b: Number(t[1]) });
    } else if (i === tokens.length - 2) {
      const a = Number(t);
      const b = Number(tokens[i + 1]);
      if (Math.max(a, b) < 7 || Math.abs(a - b) < 2) return { kind: 'raw', text };
      sides.push({ a, b, stb: true });
      i += 1;
    } else return { kind: 'raw', text };
  }

  const won1 = sides.filter((s) => s.a > s.b).length;
  const won2 = sides.length - won1;
  if (sides.length === 0 || won1 === won2) return { kind: 'raw', text };
  // a match tie-break only decides a match at one set all
  const stbAt = sides.findIndex((s) => s.stb);
  if (stbAt >= 0 && (stbAt !== 2 || sides.length !== 3 || (sides[0]!.a > sides[0]!.b) === (sides[1]!.a > sides[1]!.b))) {
    return { kind: 'raw', text };
  }
  const winnerSide: 1 | 2 = won1 > won2 ? 1 : 2;
  return {
    kind: 'sets',
    winnerSide,
    sets: sides.map((s) => {
      const w = winnerSide === 1 ? s.a : s.b;
      const l = winnerSide === 1 ? s.b : s.a;
      return { w, l, ...(s.stb ? { stb: true as const } : Math.max(w, l) === 7 && Math.min(w, l) === 6 ? { tb: true as const } : {}) };
    }),
  };
}
