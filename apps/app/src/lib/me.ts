import type { Copy } from '@netprophet/copy';
import type { MePage, MeResult, PlayerProfile } from '@netprophet/db';
import { initials } from './feed';
import { toProfile } from './players';
import { fmt } from './votes';

/**
 * Εγώ (prototype V2, isMeScr): the words and numbers of your own page, from get_me, get_me_page and
 * your player's profile. An account without a player (or a player without a level yet) is «new»:
 * the hero says «Δεν έχεις level ακόμα» and shows the ματς / ψήφοι progress instead of the level.
 */
export const LEVEL_MATCHES = 3;
export const LEVEL_VOTES = 10;

export interface MeView {
  first: string;
  surname: string;
  /** «Γλυφάδα · δεξί χέρι · τένις» */
  sub: string;
  isNew: boolean;
  level: number | null;
  direction: { arrow: '↑' | '=' | '↓'; word: string };
  streak: number;
  best: string;
  monthPoints: number;
  freezes: { slots: { ready: boolean; label: string }[]; line: string };
  progress: { matches: number; votes: number; matchesLabel: string; votesLabel: string; cta: string };
  stats: { value: string; label: string }[];
  votes: { title: string; sub: string };
  last: { win: boolean; score: string; when: string; against: string }[];
  next: string | null;
  /** your next match, for «Ο αντίπαλος πριν το ματς» */
  nextMatchId: string | null;
  friends: { count: number; initials: string[] };
}

const plural = (n: number, forms: { one: string; many: string }) => (n === 1 ? forms.one : fmt(forms.many, { n }));

export function toMeView(
  me: MeResult,
  page: MePage,
  player: PlayerProfile | null,
  areas: Record<string, string>,
  t: Copy,
  now: Date,
): MeView {
  const m = t.me;
  const p = me.profile;
  const first = me.player?.first_name ?? p.first_name ?? '';
  const surname = me.player?.surname ?? p.surname ?? '';
  const level = me.player?.level_tier ?? null;
  const isNew = me.player === null || level === null;
  const dir = me.player?.level_direction ?? 'same';
  const sport = p.primary_sport === 'padel' ? m.sports.padel : m.sports.tennis;
  const area = p.area_id ? areas[p.area_id] ?? null : null;
  const hand = p.hand ? m.hands[p.hand] : null;

  const { free, paid, max } = me.game.freezes;
  const held = Math.min(free + paid, max);
  const toFree = me.game.votes_to_next_free_freeze;

  const matches = Math.min(page.matches, LEVEL_MATCHES);
  const votes = Math.min(me.game.votes_cast, LEVEL_VOTES);
  const correct = `${page.votes.correct}/${page.votes.resolved}`;
  const wl = (r: { w: number; l: number }) => `${r.w}-${r.l}`;

  const profile = player ? toProfile(player, areas, t, now) : null;

  return {
    first,
    surname,
    sub: [area, hand, sport].filter(Boolean).join(' · '),
    isNew,
    level,
    direction: dir === 'up' ? { arrow: '↑', word: m.direction.up } : dir === 'down' ? { arrow: '↓', word: m.direction.down } : { arrow: '=', word: m.direction.same },
    streak: me.game.streak,
    best: fmt(m.best, { n: me.game.streak_best }),
    monthPoints: me.game.month_points,
    freezes: {
      slots: Array.from({ length: max }, (_, i) => ({
        ready: i < held,
        label: fmt(i < held ? m.freeze.ready : m.freeze.empty, { i: i + 1, max }),
      })),
      line: held >= max ? m.freezesFull : plural(toFree, m.nextFreeze),
    },
    progress: {
      matches,
      votes,
      matchesLabel: fmt(m.progressMatches, { n: matches }),
      votesLabel: fmt(m.progressVotes, { n: votes }),
      cta: page.matches >= 1 ? m.addMatch : m.addFirst,
    },
    stats:
      isNew || !page.record_year
        ? [
            { value: correct, label: m.stats.correct },
            { value: String(me.game.month_points), label: m.stats.points },
          ]
        : [
            { value: wl(page.record_year.singles), label: m.stats.singles },
            { value: wl(page.record_year.doubles), label: m.stats.doubles },
            { value: correct, label: m.stats.correct },
            { value: String(me.game.month_points), label: m.stats.points },
          ],
    votes: {
      title:
        page.votes.waiting > 0
          ? plural(page.votes.waiting, m.votes.waiting)
          : me.game.votes_cast > 0
            ? plural(me.game.votes_cast, m.votes.sofar)
            : m.votes.none,
      sub:
        page.votes.waiting > 0
          ? fmt(m.votes.ifAll, { n: page.votes.pending_points })
          : page.votes.open > 0
            ? plural(page.votes.open, m.votes.open)
            : m.votes.noneOpen,
    },
    last: (player?.last_matches ?? []).map((x, i) => ({
      win: x.won,
      score: x.walkover ? t.results.walkover : x.score ?? '',
      when: profile?.last[i]?.when ?? '',
      against: (profile?.last[i]?.against ?? '').replace(/^·\s*/, ''),
    })),
    next: profile?.next ?? null,
    nextMatchId: player?.next_match?.match_id ?? null,
    friends: { count: page.friends.count, initials: page.friends.first.map((f) => initials(f.first_name, f.surname)) },
  };
}
