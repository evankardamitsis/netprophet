import { normalizeCategory, type Discipline } from './category';
import { sheetKey, type SheetPerson } from './names';
import type { SheetMatch } from './oop';
import { roundFromLabel } from './rounds';
import type { SheetSet } from './score';

/**
 * tournamentsoftware.com «Matches» pages (founder, 2 Nov 2026: the ITF Masters MT200 at Queens, updated daily). The
 * page has a day selector; each day is its own fragment, `…/Matches/MatchesInDay?date=YYYYMMDD`, read one by one.
 * A match is a `match match--list` block: the event («MS45 - Singles Main Draw»), the round, two rows of players
 * (two each in doubles), the winner's row tagged «W», the other «Retired» or «Walkover» when so, one `points` list a
 * set (side 1's games, then side 2's; a third set to 10 is a match tie-break) and the court. The time is the slot's
 * `<time datetime>` («Not before 14:30»). Every match becomes a SheetMatch, like the sheets and athenstennis.gr.
 * The site puts a cookie page first: the fetch (apps/admin) saves the necessary cookies only, then reads the days.
 */

const EVENT = /^(M|W|X)(S|D)\s*(\d{2})\b/i;

/** a tournamentsoftware.com tournament page, on any of its subdomains (itfmasters., www., …) */
export function isTournamentSoftware(url: string): boolean {
  return /^https?:\/\/([a-z0-9-]+\.)*tournamentsoftware\.com\/tournament\/[0-9a-f-]{36}/i.test(url.trim());
}

/** the tournament's base («https://itfmasters.tournamentsoftware.com/tournament/<id>»), whatever page the link opens */
export function tournamentSoftwareBase(url: string): string {
  const m = /^(https?:\/\/[^/]+\/tournament\/[0-9a-f-]{36})/i.exec(url.trim());
  if (!m) throw new Error('not a tournamentsoftware.com tournament link');
  return m[1]!;
}

/** the days of the selector on the Matches page, as YYYYMMDD, oldest first */
export function tournamentSoftwareDays(html: string): string[] {
  return [...new Set([...html.matchAll(/MatchesInDay\?date=(\d{8})/g)].map((m) => m[1]!))].sort();
}

const text = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** «Natassa PATERAKI [DA]», «Konstantinos RAFTOPOULOS [2, DA]»: the capitals are the surname; all capitals, the last word */
export function tournamentSoftwarePerson(raw: string): SheetPerson {
  const words = raw.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const caps = (w: string) => w.length > 1 && w === w.toUpperCase() && w !== w.toLowerCase();
  let at = words.findIndex(caps);
  if (at <= 0 || words.every(caps)) at = Math.max(words.length - 1, 0);
  const surname = words.slice(at).join(' ');
  const first = words.slice(0, at).join(' ');
  return { surname, first, key: sheetKey(`${surname} ${first}`) };
}

interface Row {
  players: SheetPerson[];
  won: boolean;
  retired: boolean;
  walkover: boolean;
}

function rows(block: string): Row[] {
  const body = block.split('class="match__result"')[0] ?? block;
  return body
    .split(/<div class="match__row(?=[ "])/)
    .slice(1)
    .map((r) => {
      const tags = [...r.matchAll(/<span class="[^"]*\btag\b[^"]*">([^<]*)<\/span>/g)].map((m) => m[1]!.trim());
      return {
        players: [...r.matchAll(/data-player-id="[^"]*"[^>]*>\s*<span class="nav-link__value">([^<]*)<\/span>/g)].map((m) => tournamentSoftwarePerson(text(m[1]!))),
        won: /\bhas-won\b/.test(r.slice(0, 40)) || tags.includes('W'),
        retired: tags.some((t) => /^retired$/i.test(t)),
        walkover: tags.some((t) => /^walkover$/i.test(t)),
      };
    })
    .filter((r) => r.players.length > 0);
}

function sets(block: string): SheetSet[] {
  const result = /class="match__result">([\s\S]*?)<div class="match__btn"/.exec(block)?.[1] ?? '';
  const out: SheetSet[] = [];
  for (const ul of result.matchAll(/<ul class="points">([\s\S]*?)<\/ul>/g)) {
    const g = [...ul[1]!.matchAll(/<li class="points__cell[^"]*">\s*(\d+)\s*<\/li>/g)].map((m) => Number(m[1]));
    if (g.length !== 2) continue;
    out.push({ g: [g[0]!, g[1]!], tb: Math.max(g[0]!, g[1]!) >= 10 });
  }
  return out;
}

function discipline(e: RegExpExecArray): Discipline {
  const sex = e[1]!.toUpperCase();
  if (sex === 'X') return 'XD';
  return `${sex}${e[2]!.toUpperCase()}` as Discipline;
}

/** one day's fragment (date as YYYYMMDD) into its matches, in the page's order */
export function parseTournamentSoftwareDay(html: string, day: string): SheetMatch[] {
  const date = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
  const out: SheetMatch[] = [];
  const seen = new Set<string>();
  const parts = html.split(/<div class="match match--list/);
  let time = '';
  for (let i = 0; i < parts.length; i++) {
    const block = parts[i]!;
    if (i > 0) {
      const head = /class="match__header-title-item">[\s\S]*?nav-link__value">([^<]*)<\/span>/.exec(block);
      const categoryRaw = head ? text(head[1]!) : '';
      // the header's second item is the round («Quarter final», «Final»)
      const roundItem = /class="match__header-title-item">[\s\S]*?class="match__header-title-item">[\s\S]*?nav-link__value">([^<]*)<\/span>/.exec(block);
      const round = roundFromLabel(roundItem ? text(roundItem[1]!) : '');
      const ev = EVENT.exec(categoryRaw);
      const rs = rows(block);
      if (ev && rs.length === 2 && rs[0]!.players.length === rs[1]!.players.length && rs[0]!.players.length <= 2) {
        const disc = discipline(ev);
        const level = normalizeCategory(`${ev[3]}+`);
        const court = text(/class="match__footer-list-item">[\s\S]*?nav-link__value">([^<]*)<\/span>/.exec(block)?.[1] ?? '');
        const [venueName, courtName] = court.includes(' - ') ? [court.slice(0, court.lastIndexOf(' - ')), court.slice(court.lastIndexOf(' - ') + 3)] : ['', court];
        const st = sets(block);
        const side1 = rs[0]!.players;
        const side2 = rs[1]!.players;
        const winner: 1 | 2 | null = rs[0]!.won ? 1 : rs[1]!.won ? 2 : null;
        const walkover = rs.some((r) => r.walkover);
        const retired = rs.some((r) => r.retired);
        const done = winner !== null && !walkover && st.length > 0;
        const won1 = st.filter((s) => s.g[0] > s.g[1]).length;
        const won2 = st.filter((s) => s.g[1] > s.g[0]).length;
        const k1 = side1.map((p) => p.key).join(' / ');
        const k2 = side2.map((p) => p.key).join(' / ');
        const flags = walkover ? (winner === null ? ['walkover_winner_unknown'] : []) : retired ? ['retired'] : [];
        const m: SheetMatch = {
          tab: venueName,
          date,
          time,
          venue: [courtName, venueName].filter(Boolean).join(' · '),
          discipline: disc,
          level,
          categoryRaw,
          side1: side1.map((p) => `${p.surname} ${p.first}`.trim()).join(' / '),
          side2: side2.map((p) => `${p.surname} ${p.first}`.trim()).join(' / '),
          players: { side1, side2 },
          scoreRaw: walkover ? 'w/o' : st.map((s) => (s.tb ? `[${s.g[0]}-${s.g[1]}]` : `${s.g[0]}-${s.g[1]}`)).join(' '),
          sets: walkover ? [] : st,
          setsWon: done ? `${won1}-${won2}` : '',
          // a walkover: the site shows who went through in bold (has-won, founder 6 Nov 2026), the other side is tagged
          winner: done || walkover ? winner : null,
          status: walkover ? 'walkover' : done ? 'completed' : 'scheduled',
          ...(retired && done ? { retired: true } : {}),
          fingerprint: ['ts', date, disc, level, ...[k1, k2].sort()].join('|'),
          flags,
          ...(venueName ? { club: venueName } : {}),
          ...(courtName ? { court: courtName } : {}),
          ...(round ? { round } : {}),
        };
        if (!seen.has(m.fingerprint)) {
          seen.add(m.fingerprint);
          out.push(m);
        }
      }
    }
    // the slot's time («Not before 14:30») is in the subheader after this block, for the next match
    const t = [...block.matchAll(/<time datetime="(\d{1,2}:\d{2})"/g)].pop();
    if (t) time = t[1]!.padStart(5, '0');
  }
  return out;
}
