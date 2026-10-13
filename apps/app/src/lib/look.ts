import { levelNumber, type Copy } from '@netprophet/copy';
import type { GetLookResult, GetMyLevelResult, LookCategory, LookItem } from '@netprophet/db';
import { fmt } from './votes';

/**
 * Εμφάνιση (prototype V2, the look screen) and the back of the Εγώ card: the words and decisions, pure and tested.
 * Style only: nothing here touches level, votes or the Ladder. Buying waits for the payment provider.
 */
export const LOOK_TABS: readonly LookCategory[] = ['frame', 'background', 'kit'];

/** a tile in the grid: an item, or the «Χωρίς frame» / «Χωρίς φόντο» tile (key null) */
export interface Tile {
  category: LookCategory;
  key: string | null;
  item: LookItem | null;
}

export type Tone = 'free' | 'earned' | 'bought' | 'price' | 'locked';

/** 1.99 -> «1,99» */
export function eur(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

export const itemName = (i: LookItem): string => i.name_el;

export function tileName(tile: Tile, t: Copy): string {
  if (tile.item) return itemName(tile.item);
  return tile.category === 'frame' ? t.look.noFrame : t.look.noBackground;
}

/** the tiles of a tab: frames and backgrounds start with «Χωρίς …» */
export function tilesFor(look: GetLookResult, tab: LookCategory): Tile[] {
  const own = look.items.filter((i) => i.category === tab).map((item): Tile => ({ category: tab, key: item.key, item }));
  return tab === 'kit' ? own : [{ category: tab, key: null, item: null }, ...own];
}

/** the key worn in a category (null: nothing on) */
export function wornKey(look: GetLookResult, category: LookCategory): string | null {
  return look.equipped[category];
}

export function findTile(look: GetLookResult, tab: LookCategory, key: string | null | undefined): Tile {
  const tiles = tilesFor(look, tab);
  const want = key === undefined ? wornKey(look, tab) : key;
  return tiles.find((x) => x.key === want) ?? tiles.find((x) => x.key === wornKey(look, tab)) ?? tiles[0]!;
}

/** the little tag under a name: «Δωρεάν», «Το κέρδισες», «1,99€», or what earns it */
export function tagOf(tile: Tile, t: Copy): { text: string; tone: Tone } | null {
  const i = tile.item;
  if (!i) return null;
  if (i.owned) {
    if (i.kind === 'free') return { text: t.look.tagFree, tone: 'free' };
    if (i.kind === 'earned' || i.source === 'earned') return { text: t.look.tagEarned, tone: 'earned' };
    return { text: t.look.tagBought, tone: 'bought' };
  }
  if ((i.kind === 'buy' || i.kind === 'pack') && i.price_eur !== null) return { text: fmt(t.look.price, { price: eur(i.price_eur) }), tone: 'price' };
  return { text: i.earn_rule ?? '', tone: 'locked' };
}

export type Cta = { kind: 'wear' } | { kind: 'worn' } | { kind: 'buy'; label: string } | { kind: 'none' };

/** the button on the selected card: wear it, it is worn, buy it (sheet), or nothing (earned and not yet yours) */
export function ctaOf(tile: Tile, look: GetLookResult, t: Copy): Cta {
  const i = tile.item;
  const isWorn = wornKey(look, tile.category) === tile.key;
  if (!i || i.owned) return isWorn ? { kind: 'worn' } : { kind: 'wear' };
  if ((i.kind === 'buy' || i.kind === 'pack') && i.price_eur !== null) {
    return { kind: 'buy', label: fmt(t.look.buy, { price: fmt(t.look.priceSpaced, { price: eur(i.price_eur) }) }) };
  }
  return { kind: 'none' };
}

export interface BuySheet {
  title: string;
  price: string;
  line: string;
  note: string;
}

/** the sheet behind «Αγόρασε · 1,99 €»: price and words only, there is no purchase yet */
export function buySheetOf(item: LookItem, t: Copy): BuySheet | null {
  if (item.price_eur === null) return null;
  const s = t.look.sheet;
  const price = fmt(t.look.priceSpaced, { price: eur(item.price_eur) });
  if (item.category === 'kit') return { title: s.kit, price, line: s.lineKit, note: s.noteKit };
  if (item.category === 'frame') return { title: fmt(s.frame, { name: itemName(item) }), price, line: s.lineFrame, note: s.noteFrame };
  return { title: fmt(s.background, { name: itemName(item) }), price, line: s.lineBackground, note: s.noteBackground };
}

/** wear `key` (null: take it off) right away, before the server answers */
export function withWorn(look: GetLookResult, category: LookCategory, key: string | null): GetLookResult {
  return {
    items: look.items.map((i) => (i.category === category ? { ...i, equipped: i.key === key } : i)),
    equipped: { ...look.equipped, [category]: key },
  };
}

/** what the preview card wears: the picked tile in its category, the rest as worn */
export function previewOf(look: GetLookResult, tab: LookCategory, picked: string | null): { frame: string | null; background: string | null; kit: string } {
  const eq = look.equipped;
  return {
    frame: tab === 'frame' ? picked : eq.frame,
    background: tab === 'background' ? picked : eq.background,
    kit: tab === 'kit' && picked ? picked : eq.kit,
  };
}

/** «Νέο» on the Εμφάνιση row: something you own beyond the free kits that you have not looked at yet */
export function hasNewLook(look: GetLookResult | null, seen: ReadonlySet<string>): boolean {
  return !!look && look.items.some((i) => i.owned && i.kind !== 'free' && !seen.has(i.key));
}

export function ownedKeys(look: GetLookResult): string[] {
  return look.items.filter((i) => i.owned && i.kind !== 'free').map((i) => i.key);
}

/* ---------- the back of the card ---------- */

export interface LevelBack {
  state: 'pending' | 'active';
  /** «4», «4,5» */
  level: string;
  arrow: '↑' | '=' | '↓';
  word: string;
  /** «7 ματς · 23 ψήφοι» */
  counts: string;
  pro: boolean;
  /** Pro only: «4,23» */
  value: string | null;
  /** Pro only: «Ως το level 4,5: +0,27» */
  toNext: string | null;
}

/** two decimals with a comma: 4.23 -> «4,23» */
const dec = (n: number): string => n.toFixed(2).replace('.', ',');

/** the stats side from get_my_level; null while it has not loaded */
export function levelBackOf(r: GetMyLevelResult | null, t: Copy): LevelBack | null {
  if (!r) return null;
  const s = t.look.stats;
  const m = t.me.direction;
  const matches = r.matches ?? 0;
  const votes = r.votes ?? 0;
  const counts = `${fmt(s.matches, { n: matches })} · ${votes === 1 ? s.votesOne : fmt(s.votesMany, { n: votes })}`;
  const dir = r.direction ?? 'same';
  const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '=';
  const word = dir === 'up' ? m.up : dir === 'down' ? m.down : m.same;
  if (!r.claimed || r.status === 'pending' || r.tier === null || r.tier === undefined) {
    return { state: 'pending', level: '', arrow, word, counts, pro: r.pro, value: null, toNext: null };
  }
  const value = r.pro && r.value != null ? dec(r.value) : null;
  const toNext =
    r.pro && r.to_next != null && r.next_tier != null ? fmt(s.toNext, { next: levelNumber(r.next_tier), gap: dec(r.to_next) }) : null;
  return { state: 'active', level: levelNumber(r.tier), arrow, word, counts, pro: r.pro, value, toNext };
}
