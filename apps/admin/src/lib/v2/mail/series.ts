/**
 * The email series and the weekly emails (founder's email board, approved 17 Nov 2026): day1_vote, day3_follow,
 * day7_week, day14_missed, monday, month_close and away30. The database queues each one with the numbers and names it
 * shows (core.email_series_sweep, migration 20270426000000_email_series); this file only words them. Any field can
 * be missing («Send me a test» queues a kind with no data), so every line that needs one is left out without it.
 *
 * Gender is not known (profiles.gender is empty): places read «στη θέση 6», «6η», never «6ος». Every button opens
 * www.netprophetapp.com/open. All are game emails, so they carry the unsubscribe link.
 */
import { accusativeWord, getCopy, greekCaps } from '@netprophet/copy';
import { block, esc } from '../emailLayout';
import { OPEN_URL, build, hello, type DueEmail, type Mail } from './core';
import { mondayStreakLines } from './streak';

const el = getCopy('el');

// ── reading the payload ──────────────────────────────────────────────────────────────────────────────────────────

type Obj = Record<string, unknown>;
const num = (o: Obj | null | undefined, k: string): number | null => {
  const v = o?.[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};
const str = (o: Obj | null | undefined, k: string): string | null => {
  const v = o?.[k];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
};
const obj = (o: Obj | null | undefined, k: string): Obj | null => {
  const v = o?.[k];
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null;
};
const list = (o: Obj | null | undefined, k: string): Obj[] => {
  const v = o?.[k];
  return Array.isArray(v) ? v.filter((x): x is Obj => !!x && typeof x === 'object') : [];
};

// ── Greek helpers ────────────────────────────────────────────────────────────────────────────────────────────────

const NUM = new Intl.NumberFormat('el-GR');
/** «1.234» */
export const fmt = (n: number) => NUM.format(n);

const WEEKDAYS = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
/** «2027-03-11» → «Πέμπτη» */
const weekday = (iso: string | null) => {
  const d = iso ? new Date(`${iso}T12:00:00Z`) : null;
  return d && !Number.isNaN(d.getTime()) ? WEEKDAYS[d.getUTCDay()]! : null;
};
/** «2027-03-08» → «8/3» */
const dayMonth = (iso: string | null) => {
  const m = iso?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[2])}/${Number(m[1])}` : null;
};
/** «2026-11» → «Νοέμβριος» */
const monthName = (key: string | null) => {
  const m = key?.match(/^\d{4}-(\d{2})$/);
  return m ? (el.season.months[Number(m[1]) - 1] ?? null) : null;
};
/** «τον Νοέμβριο»: months are masculine */
const inMonth = (key: string | null) => {
  const m = monthName(key);
  return m ? `τον ${accusativeWord(m, 'm')}` : null;
};

type Tier = 'bronze' | 'silver' | 'gold';
const tierName = (t: string | null) => (t === 'bronze' || t === 'silver' || t === 'gold' ? el.ladder.tiers[t as Tier] : null);
/** «στη Χρυσή», «στην Ασημένια»: the ν stays before a vowel */
const inTier = (t: string | null) => {
  const n = tierName(t);
  return n ? `${/^[ΑΕΗΙΟΥΩΆΈΉΊΌΎΏ]/.test(n) ? 'στην' : 'στη'} ${n}` : null;
};

/** «12 ματς», «1 ανατροπή» */
const count = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

/** a match line: «Γιώργος Μέμμος - Ηλίας Λάππας» */
const pairing = (m: Obj) => [str(m, 'a'), str(m, 'b')].filter(Boolean).join(' - ');
/** a result line, the winner first: «Γιώργος Μέμμος 2-0 Σπύρος Βλάσσης» */
const scoreline = (m: Obj) => {
  const score = m.walkover === true ? 'w.o.' : (str(m, 'score') ?? '-');
  return [str(m, 'winner'), score, str(m, 'loser')].filter(Boolean).join(' ');
};
const kicker = (...parts: (string | null)[]) => greekCaps(parts.filter(Boolean).join(' · '));

interface Card {
  kicker?: string;
  title: string;
  sub?: string;
}
const cardsHtml = (cards: Card[]) => cards.map((c) => block.card(c)).join('\n');
const cardsText = (cards: Card[]) => cards.map((c) => [c.kicker, c.title, c.sub].filter(Boolean).join(' · '));

// ── the emails ───────────────────────────────────────────────────────────────────────────────────────────────────

/** day1_vote: no vote 24 hours after signing up, on a day with matches */
export function day1VoteEmail(e: DueEmail): Mail {
  const p = e.payload;
  const open = num(p, 'open');
  const subject =
    open && open > 1 ? `Σήμερα παίζονται ${fmt(open)} ματς. Ποιος το παίρνει;`
    : open === 1 ? 'Σήμερα παίζεται 1 ματς. Ποιος το παίρνει;'
    : 'Σήμερα έχει ματς. Ποιος το παίρνει;';
  const lead = 'Η πρώτη σου ψήφος είναι ένα tap μακριά.';
  const cards: Card[] = list(p, 'matches')
    .filter((m) => pairing(m))
    .map((m) => ({ kicker: kicker(str(m, 'time'), str(m, 'tournament')) || undefined, title: pairing(m) }));
  const how = 'Στο NetProphet πατάς όποιον πιστεύεις ότι κερδίζει.';
  return build(e, {
    subject,
    preheader: lead,
    hero: open
      ? { kicker: 'ΣΗΜΕΡΑ', big: fmt(open), title: open === 1 ? 'ματς σε περιμένει' : 'ματς σε περιμένουν', sub: esc(lead) }
      : { kicker: 'ΣΗΜΕΡΑ', title: 'Σε περιμένουν ματς', sub: esc(lead), art: 'launch' },
    body: [cardsHtml(cards), block.note(esc(how)), block.button(OPEN_URL, 'Ψήφισε τώρα')],
    text: [...cardsText(cards), '', how, '', `Ψήφισε τώρα: ${OPEN_URL}`],
    why: 'Πήρες αυτό το email επειδή έφτιαξες λογαριασμό στο NetProphet.',
  });
}

/** day3_follow: follows nobody after 3 days */
export function day3FollowEmail(e: DueEmail): Mail {
  const players: Card[] = list(e.payload, 'players')
    .filter((x) => str(x, 'name'))
    .map((x) => {
      const n = num(x, 'matches');
      return { title: str(x, 'name')!, sub: n ? `${count(n, 'ματς', 'ματς')} φέτος` : undefined };
    });
  const sub = 'Ακολούθησέ τους. Δες τους αγώνες τους πρώτα και μάθε τα αποτελέσματα αμέσως.';
  const intro = 'Μερικοί που παίζουν συχνά:';
  return build(e, {
    subject: 'Ποιους ξέρεις στα γήπεδα;',
    preheader: 'Ακολούθησέ τους και μαθαίνεις αμέσως πώς πήγαν.',
    hero: { kicker: 'Η ΠΑΡΕΑ ΣΟΥ', title: 'Ποιους ξέρεις στα γήπεδα;', sub: esc(sub), art: 'friends' },
    body: [players.length ? block.paragraph(esc(intro)) : '', cardsHtml(players), block.button(OPEN_URL, 'Βρες την παρέα σου')],
    text: [...(players.length ? [intro, ...cardsText(players), ''] : []), `Βρες την παρέα σου: ${OPEN_URL}`],
    why: 'Πήρες αυτό το email επειδή έφτιαξες λογαριασμό στο NetProphet.',
  });
}

/** the stats row of day7 and monday: correct out of resolved (lime: what happened), streak and a third tile */
function statTiles(p: Obj, third: { value: string; label: string } | null) {
  const resolved = num(p, 'resolved') ?? 0;
  const correct = num(p, 'correct') ?? 0;
  const votes = num(p, 'votes');
  const streak = num(p, 'streak');
  const tiles: { value: string; label: string; lime?: boolean }[] = [];
  if (resolved > 0) tiles.push({ value: `${fmt(correct)}/${fmt(resolved)}`, label: 'μέσα', lime: true });
  else if (votes) tiles.push({ value: fmt(votes), label: votes === 1 ? 'ψήφος' : 'ψήφοι' });
  if (streak !== null) tiles.push({ value: fmt(streak), label: 'σερί' });
  if (third) tiles.push(third);
  return tiles;
}

/** day7_week: the first week in numbers */
export function day7WeekEmail(e: DueEmail): Mail {
  const p = e.payload;
  const resolved = num(p, 'resolved') ?? 0;
  const correct = num(p, 'correct') ?? 0;
  const points = num(p, 'points');
  const ladder = obj(p, 'ladder');
  const place = num(ladder, 'place');
  const size = num(ladder, 'size');
  const tier = tierName(str(ladder, 'tier'));
  const toMedal = place !== null && place > 3 ? place - 3 : null;
  const subject = resolved > 0 ? `Η πρώτη σου εβδομάδα: ${fmt(correct)} στις ${fmt(resolved)}` : 'Η πρώτη σου εβδομάδα στο NetProphet';
  const preheader =
    toMedal !== null ? `Είσαι ${count(toMedal, 'θέση', 'θέσεις')} από μετάλλιο.`
    : place !== null ? 'Είσαι στις 3 πρώτες θέσεις της Κατηγορίας σου.'
    : 'Η πρώτη σου εβδομάδα σε νούμερα.';
  const tiles = statTiles(p, points !== null ? { value: fmt(points), label: 'πόντοι' } : null);
  const board = tier && size ? el.ladder.scopeName.league.replace('{tier}', tier).replace('{n}', fmt(size)) : null;
  const where =
    place === null ? null
    : toMedal !== null
      ? `Είσαι στη θέση ${fmt(place)}. Οι 3 πρώτοι στο τέλος του μήνα παίρνουν μετάλλιο, Frame και badge. ${toMedal === 1 ? 'Μία θέση ακόμα.' : `${count(toMedal, 'θέση', 'θέσεις')} ακόμα.`}`
      : `Είσαι στη θέση ${fmt(place)}. Οι 3 πρώτοι στο τέλος του μήνα παίρνουν μετάλλιο, Frame και badge. Κράτα τη!`;
  return build(e, {
    subject,
    preheader,
    hero: { kicker: 'Η 1Η ΣΟΥ ΕΒΔΟΜΑΔΑ', title: resolved > 0 && correct * 2 < resolved ? 'Η αρχή έγινε' : 'Όχι κι άσχημα για αρχή' },
    body: [
      tiles.length ? block.tiles(tiles) : '',
      board ? block.card({ kicker: 'ΚΑΤΗΓΟΡΙΑ', title: board }) : '',
      where ? block.paragraph(esc(where)) : '',
      block.button(OPEN_URL, 'Συνέχισε'),
    ],
    text: [tiles.map((t) => `${t.value} ${t.label}`).join(' · '), board ?? '', where ?? '', '', `Συνέχισε: ${OPEN_URL}`],
    why: 'Πήρες αυτό το email επειδή ξεκίνησες να παίζεις στο NetProphet.',
  });
}

/** day14_missed: what happened while away (upsets, the players they follow) */
export function day14MissedEmail(e: DueEmail): Mail {
  const p = e.payload;
  const upsets = num(p, 'upsets') ?? 0;
  const upsetCards: Card[] = list(p, 'upset_list').map((m) => {
    const share = num(m, 'share');
    return {
      kicker: kicker('Ανατροπή', str(m, 'tournament')),
      title: scoreline(m),
      sub: share !== null ? `Μόνο το ${fmt(share)}% το είδε` : undefined,
    };
  });
  const followed: Card[] = list(p, 'followed').map((m) => ({
    kicker: kicker('Ακολουθείς', str(m, 'tournament')),
    title: scoreline(m),
    sub: str(m, 'player') ? `${str(m, 'player')}: ${m.won === true ? 'νίκη' : 'ήττα'}` : undefined,
  }));
  const subject = upsets > 0 ? `Όσο έλειπες: ${count(upsets, 'ανατροπή', 'ανατροπές')}` : 'Όσο έλειπες στα γήπεδα';
  const first = list(p, 'followed')[0];
  const preheader =
    first && str(first, 'player') ? `${str(first, 'player')}: ${first.won === true ? 'νίκη' : 'ήττα'} ${first.walkover === true ? 'w.o.' : (str(first, 'score') ?? '')}`.trim() + '.'
    : 'Δες τι έγινε στα γήπεδα.';
  const sub =
    upsets > 0 && followed.length ? `${count(upsets, 'ανατροπή', 'ανατροπές')} και τα νέα όσων ακολουθείς.`
    : upsets > 0 ? `${count(upsets, 'ανατροπή', 'ανατροπές')} που λίγοι είδαν.`
    : followed.length ? 'Τα νέα όσων ακολουθείς.'
    : 'Τα ματς δεν σταμάτησαν.';
  const back = 'Η Κατάταξη ξεκινάει από το μηδέν κάθε μήνα. Προλαβαίνεις.';
  const cards = [...upsetCards, ...followed];
  return build(e, {
    subject,
    preheader,
    hero: { kicker: 'ΟΣΟ ΕΛΕΙΠΕΣ', title: 'Τα γήπεδα είναι ακόμα εκεί', sub: esc(sub), art: 'missed' },
    body: [cardsHtml(cards), block.paragraph(esc(back)), block.button(OPEN_URL, 'Δες τι έγινε')],
    text: [...cardsText(cards), '', back, '', `Δες τι έγινε: ${OPEN_URL}`],
    why: 'Πήρες αυτό το email επειδή έφτιαξες λογαριασμό στο NetProphet πριν από δύο εβδομάδες.',
  });
}

/** monday: last week in numbers and the followed players who play this week */
export function mondayEmail(e: DueEmail): Mail {
  const p = e.payload;
  const resolved = num(p, 'resolved') ?? 0;
  const correct = num(p, 'correct') ?? 0;
  const place = num(obj(p, 'ladder'), 'place');
  const title = resolved > 0 ? `${fmt(correct)} στις ${fmt(resolved)}. Καλή εβδομάδα!` : 'Καλή εβδομάδα!';
  const tiles = statTiles(p, place !== null ? { value: `${fmt(place)}η`, label: 'θέση' } : null);
  const games: Card[] = list(p, 'followed')
    .filter((m) => pairing(m))
    .map((m) => ({ kicker: kicker(weekday(str(m, 'date')), str(m, 'time'), str(m, 'tournament')) || undefined, title: pairing(m) }));
  const head = 'Παίζουν οι δικοί σου:';
  const date = dayMonth(str(p, 'date'));
  // the daily σερί line, only when it is on (payload.days)
  const days = mondayStreakLines(p) ?? [];
  return build(e, {
    subject: title,
    preheader: games.length ? 'Η εβδομάδα σου και ποιοι δικοί σου παίζουν.' : 'Η εβδομάδα σου σε νούμερα.',
    hero: { kicker: kicker('Δευτέρα', date), title: esc(title) },
    body: [
      tiles.length ? block.tiles(tiles) : '',
      ...days.map((l) => block.paragraph(esc(l))),
      games.length ? block.subheading(head) : '',
      cardsHtml(games),
      block.button(OPEN_URL, 'Ψήφισε την εβδομάδα'),
    ],
    text: [tiles.map((t) => `${t.value} ${t.label}`).join(' · '), ...days, ...(games.length ? ['', head, ...cardsText(games)] : []), '', `Ψήφισε την εβδομάδα: ${OPEN_URL}`],
    why: 'Πήρες αυτό το email επειδή ψήφισες την προηγούμενη εβδομάδα στο NetProphet.',
  });
}

/** month_close: the place in the closed month for everyone with points but no medal (the top 3 get the medal email) */
export function monthCloseEmail(e: DueEmail): Mail {
  const p = e.payload;
  const month = monthName(str(p, 'month'));
  const place = num(p, 'place');
  const size = num(p, 'size');
  const points = num(p, 'points');
  const tier = tierName(str(p, 'tier'));
  const outcome = str(p, 'outcome');
  const next = inTier(str(p, 'next_tier'));
  const nextMonth = inMonth(str(p, 'next_month'));
  const at = place !== null ? (size ? `θέση ${fmt(place)} από ${fmt(size)}` : `θέση ${fmt(place)}`) : null;
  const subject = month && at ? `Ο ${month} έκλεισε: ${at}` : month ? `Ο ${month} έκλεισε` : 'Ο μήνας έκλεισε';
  const arrow = outcome === 'promoted' ? ' ↑' : outcome === 'relegated' ? ' ↓' : '';
  const when = nextMonth ? `${nextMonth[0]!.toUpperCase()}${nextMonth.slice(1)}` : 'Τον νέο μήνα';
  const nextLine = next
    ? outcome === 'promoted' ? `Ανεβαίνεις! ${when} παίζεις ${next}${arrow}.`
      : outcome === 'relegated' ? `${when} παίζεις ${next}${arrow}. Νέος μήνας, νέα Κατάταξη.`
      : `${when} μένεις ${next}. Νέος μήνας, νέα Κατάταξη.`
    : 'Νέος μήνας, νέα Κατάταξη.';
  const gear = 'Μήπως ο Baller σου θέλει καινούριο εξοπλισμό;';
  return build(e, {
    subject,
    preheader: nextLine,
    hero: {
      kicker: kicker(month, tier),
      title: esc(at ? `${at[0]!.toUpperCase()}${at.slice(1)}` : 'Ο μήνας έκλεισε'),
      sub: points !== null ? esc(`${count(points, 'πόντος', 'πόντοι')} στην Κατηγορία σου.`) : undefined,
      art: 'launch',
    },
    body: [block.paragraph(esc(nextLine)), block.paragraph(esc(gear)), block.button(OPEN_URL, 'Μπες στον νέο μήνα')],
    text: [nextLine, '', gear, '', `Μπες στον νέο μήνα: ${OPEN_URL}`],
    why: 'Πήρες αυτό το email επειδή μάζεψες πόντους στην Κατάταξη τον μήνα που έκλεισε.',
  });
}

/** away30: 30 days without opening the app, once */
export function away30Email(e: DueEmail): Mail {
  const p = e.payload;
  const name = hello(e.first_name);
  const tournaments = num(p, 'tournaments') ?? 0;
  const matches = num(p, 'matches') ?? 0;
  const near = p.near === true ? ' κοντά σου' : '';
  const items: [string, string][] = [];
  if (tournaments > 0)
    items.push([count(tournaments, 'νέο τουρνουά', 'νέα τουρνουά'), `${tournaments === 1 ? 'ξεκίνησε' : 'ξεκίνησαν'}${near}.`]);
  if (matches > 0) items.push([count(matches, 'ματς', 'ματς'), `${matches === 1 ? 'παίχτηκε' : 'παίχτηκαν'} από τότε.`]);
  items.push(['Η Κατάταξη', 'ξεκινάει από το μηδέν κάθε μήνα. Είσαι ακόμα μέσα.']);
  const subject = name ? `Πάει καιρός, ${name}` : 'Πάει καιρός';
  const last = 'Δεν θα σου ξαναγράψουμε γι’ αυτό.';
  return build(e, {
    subject,
    preheader: tournaments > 0 ? `Τα γήπεδα είναι ακόμα εκεί. ${count(tournaments, 'νέο τουρνουά', 'νέα τουρνουά')}${near}.` : 'Τα γήπεδα είναι ακόμα εκεί.',
    hero: { title: esc(subject), sub: 'Ο Baller σου σε περιμένει.', art: 'missed' },
    body: [block.checks(items.map(([b, rest]) => `<strong>${esc(b)}</strong> ${esc(rest)}`)), block.button(OPEN_URL, 'Ξαναμπές'), block.note(esc(last))],
    text: [...items.map(([b, rest]) => `✓ ${b} ${rest}`), '', `Ξαναμπές: ${OPEN_URL}`, '', last],
    why: 'Πήρες αυτό το email επειδή έχεις λογαριασμό στο NetProphet.',
  });
}

/** the series kinds for the registry in index.ts */
export const SERIES_EMAILS: Record<string, (e: DueEmail) => Mail | null> = {
  day1_vote: day1VoteEmail,
  day3_follow: day3FollowEmail,
  day7_week: day7WeekEmail,
  day14_missed: day14MissedEmail,
  monday: mondayEmail,
  month_close: monthCloseEmail,
  away30: away30Email,
};
