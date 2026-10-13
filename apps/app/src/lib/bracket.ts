import type { BracketMatch } from './tournaments';

/**
 * The geometry of a knockout tree, pure: one column per round, a card per match, match i of round r centred at
 * y = (i + 0.5) * (H + G) * 2^r so it sits midway between its two feeders. No IO, no React.
 */
export const CARD_H = 66;
export const CARD_GAP = 14;
/** the horizontal run between two columns, where the connectors live */
export const CONN_W = 28;
export const HEADER_H = 36;
export const LINE_W = 1.5;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TreeCard extends Box {
  round: number;
  index: number;
}

export interface BracketLayout {
  cards: TreeCard[];
  /** thin rectangles: a horizontal out of a feeder, the vertical joining a pair, a horizontal into the next card */
  connectors: Box[];
  /** left edge of each round's column */
  columns: number[];
  /** where the champion slot starts and its vertical centre (from the final's card) */
  champion: { x: number; cy: number } | null;
  width: number;
  height: number;
}

/** centre y of match `index` in round `round` (0-based), in the body (below the headers) */
export function centerY(round: number, index: number, cardH = CARD_H, gap = CARD_GAP): number {
  return (index + 0.5) * (cardH + gap) * 2 ** round;
}

/**
 * `counts[r]` is how many matches round r has. Returns the cards, the connector segments and the overall size.
 * `colW` is the card width; `championW` leaves room at the right for the champion slot (0 for none).
 */
export function layoutBracket(counts: number[], colW: number, championW = 0, cardH = CARD_H, gap = CARD_GAP): BracketLayout {
  const step = colW + CONN_W;
  const cards: TreeCard[] = [];
  const connectors: Box[] = [];
  const columns = counts.map((_, r) => r * step);
  counts.forEach((n, r) => {
    for (let i = 0; i < n; i++) cards.push({ round: r, index: i, x: columns[r]!, y: centerY(r, i, cardH, gap) - cardH / 2, w: colW, h: cardH });
  });
  const hline = (x: number, cy: number, w: number): Box => ({ x, y: cy - LINE_W / 2, w, h: LINE_W });
  for (let r = 0; r + 1 < counts.length; r++) {
    const xOut = columns[r]! + colW;
    const xMid = xOut + CONN_W / 2;
    const xIn = columns[r + 1]!;
    for (let i = 0; i < counts[r]!; i++) {
      const next = Math.floor(i / 2);
      if (next >= counts[r + 1]!) continue;
      connectors.push(hline(xOut, centerY(r, i, cardH, gap), CONN_W / 2));
      if (i % 2 === 1 || i + 1 >= counts[r]!) {
        // the pair is complete (or the feeder is alone): join them and run into the next card
        const top = centerY(r, i - (i % 2), cardH, gap);
        const bottom = centerY(r, i, cardH, gap);
        if (bottom > top) connectors.push({ x: xMid - LINE_W / 2, y: top - LINE_W / 2, w: LINE_W, h: bottom - top + LINE_W });
        connectors.push(hline(xMid, centerY(r + 1, next, cardH, gap), xIn - xMid));
      }
    }
  }
  const last = counts.length - 1;
  const height = last < 0 ? 0 : counts[0]! * (cardH + gap);
  const endX = last < 0 ? 0 : columns[last]! + colW;
  const champion = last >= 0 && championW > 0 ? { x: endX + CONN_W, cy: centerY(last, 0, cardH, gap) } : null;
  if (champion) {
    connectors.push(hline(endX, champion.cy, CONN_W));
  }
  return { cards, connectors, columns, champion, width: endX + (champion ? CONN_W + championW : 0), height };
}

/** the earliest round that still has a match to play (nobody through, no bye), else the last round */
export function startRound(rounds: { matches: Pick<BracketMatch, 'winner' | 'advances'>[] }[]): number {
  const open = rounds.findIndex((r) => r.matches.some((m) => !m.winner && !m.advances));
  return open >= 0 ? open : Math.max(0, rounds.length - 1);
}

/** the champion: the winner's side of a decided final */
export function championOf(rounds: { matches: Pick<BracketMatch, 'winner' | 'sides'>[] }[]): BracketMatch['sides'][number] | null {
  const final = rounds[rounds.length - 1]?.matches[0];
  return final && final.winner ? final.sides[final.winner - 1]! : null;
}
