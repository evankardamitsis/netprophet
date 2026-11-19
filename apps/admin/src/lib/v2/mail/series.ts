/**
 * The email series and the weekly emails (founder's email board, approved 17 Nov 2026): day1_vote, day3_follow,
 * day7_week, day14_missed, monday, month_close and away30. The database queues each one with the numbers and names it
 * shows (core.email_series_sweep, migration 20270426000000_email_series); this file only words them, in Greek or in
 * English (the row's lang). Any field can be missing («Send me a test» queues a kind with no data), so every line that
 * needs one is left out without it.
 *
 * Gender is not known (profiles.gender is empty): places read «στη θέση 6», «6η», never «6ος». Every button opens
 * www.netprophetapp.com/open. All are game emails, so they carry the unsubscribe link. Player names come as written
 * (Greek script) and stay so in English, plain, with no article.
 */
import { accusativeWord, getCopy, greekCaps, weekdayName } from '@netprophet/copy';
import { block, esc, type EmailLang } from '../emailLayout';
import { OPEN_URL, build, fmtNum, hello, langOf, t, type DueEmail, type Mail } from './core';
import { mondayStreakLines } from './streak';

const COPY = { el: getCopy('el'), en: getCopy('en') };

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

// ── words per language ───────────────────────────────────────────────────────────────────────────────────────────

/** «1.234» in Greek, «1,234» in English */
export const fmt = (n: number, lang: EmailLang = 'el') => fmtNum(n, lang);

/** «2027-03-11» → «Πέμπτη», «Thursday» */
const weekday = (iso: string | null, lang: EmailLang) => (iso ? weekdayName(iso, lang) : null);
/** «2027-03-08» → «8/3» in Greek, «8 March» in English */
const dayMonth = (iso: string | null, lang: EmailLang) => {
  const m = iso?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return lang === 'en' ? `${Number(m[2])} ${COPY.en.season.months[Number(m[1]) - 1]}` : `${Number(m[2])}/${Number(m[1])}`;
};
/** «2026-11» → «Νοέμβριος», «November» */
const monthName = (key: string | null, lang: EmailLang) => {
  const m = key?.match(/^\d{4}-(\d{2})$/);
  return m ? (COPY[lang].season.months[Number(m[1]) - 1] ?? null) : null;
};
/** «τον Νοέμβριο» (months are masculine), «in November» */
const inMonth = (key: string | null, lang: EmailLang) => {
  const m = monthName(key, lang);
  if (!m) return null;
  return lang === 'en' ? `in ${m}` : `τον ${accusativeWord(m, 'm')}`;
};

type Tier = 'bronze' | 'silver' | 'gold';
const tierName = (t: string | null, lang: EmailLang) =>
  t === 'bronze' || t === 'silver' || t === 'gold' ? COPY[lang].ladder.tiers[t as Tier] : null;
/** «στη Χρυσή», «στην Ασημένια» (the ν stays before a vowel); «in Gold» */
const inTier = (t: string | null, lang: EmailLang) => {
  const n = tierName(t, lang);
  if (!n) return null;
  return lang === 'en' ? `in ${n}` : `${/^[ΑΕΗΙΟΥΩΆΈΉΊΌΎΏ]/.test(n) ? 'στην' : 'στη'} ${n}`;
};

/** «12 ματς», «1 ανατροπή»; «12 matches», «1 upset» */
const count = (n: number, one: string, many: string, lang: EmailLang = 'el') => `${fmt(n, lang)} ${n === 1 ? one : many}`;

/** a place: «6η» in Greek (feminine, θέση: never «6ος»), «6th» in English */
const place = (n: number, lang: EmailLang) => {
  if (lang !== 'en') return `${fmt(n)}η`;
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${fmt(n, lang)}${suffix}`;
};

/** a followed player's result: «νίκη», «ήττα»; «won», «lost» */
const outcome = (won: boolean, lang: EmailLang) => (lang === 'en' ? (won ? 'won' : 'lost') : won ? 'νίκη' : 'ήττα');

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
  const lang = langOf(e);
  const p = e.payload;
  const open = num(p, 'open');
  const n = open !== null ? fmt(open, lang) : '';
  const c = t(
    e,
    {
      subject:
        open && open > 1 ? `Σήμερα παίζονται ${n} ματς. Ποιος το παίρνει;`
        : open === 1 ? 'Σήμερα παίζεται 1 ματς. Ποιος το παίρνει;'
        : 'Σήμερα έχει ματς. Ποιος το παίρνει;',
      lead: 'Η πρώτη σου ψήφος είναι ένα tap μακριά.',
      how: 'Στο NetProphet ψηφίζεις όποιον πιστεύεις ότι θα κερδίσει.',
      kicker: 'ΣΗΜΕΡΑ',
      waiting: open === 1 ? 'ματς σε περιμένει' : 'ματς σε περιμένουν',
      waitingAll: 'Σε περιμένουν ματς',
      button: 'Ψήφισε τώρα',
      why: 'Πήρες αυτό το email επειδή έφτιαξες λογαριασμό στο NetProphet.',
    },
    {
      subject:
        open && open > 1 ? `${n} matches today. Who’s winning?`
        : open === 1 ? '1 match today. Who’s winning?'
        : 'Matches today. Who’s winning?',
      lead: 'Your first vote is one tap away.',
      how: 'On NetProphet you vote for whoever you think will win.',
      kicker: 'TODAY',
      waiting: open === 1 ? 'match waiting for you' : 'matches waiting for you',
      waitingAll: 'Matches are waiting for you',
      button: 'Vote now',
      why: 'You got this email because you made a NetProphet account.',
    },
  );
  const cards: Card[] = list(p, 'matches')
    .filter((m) => pairing(m))
    .map((m) => ({ kicker: kicker(str(m, 'time'), str(m, 'tournament')) || undefined, title: pairing(m) }));
  return build(e, {
    subject: c.subject,
    preheader: c.lead,
    hero: open
      ? { kicker: c.kicker, big: n, title: c.waiting, sub: esc(c.lead) }
      : { kicker: c.kicker, title: c.waitingAll, sub: esc(c.lead), art: 'launch' },
    body: [cardsHtml(cards), block.note(esc(c.how)), block.button(OPEN_URL, c.button)],
    text: [...cardsText(cards), '', c.how, '', `${c.button}: ${OPEN_URL}`],
    why: c.why,
  });
}

/** day3_follow: follows nobody after 3 days */
export function day3FollowEmail(e: DueEmail): Mail {
  const lang = langOf(e);
  const c = t(
    e,
    {
      played: (n: number) => `${count(n, 'ματς', 'ματς')} φέτος`,
      sub: 'Ακολούθησέ τους. Δες τους αγώνες τους πρώτα και μάθε τα αποτελέσματά τους αμέσως.',
      intro: 'Μερικοί που παίζουν συχνά:',
      subject: 'Ποιους ξέρεις στα γήπεδα;',
      preheader: 'Ακολούθησέ τους και μαθαίνεις αμέσως πώς πήγαν.',
      kicker: 'Η ΠΑΡΕΑ ΣΟΥ',
      button: 'Βρες την παρέα σου',
      why: 'Πήρες αυτό το email επειδή έφτιαξες λογαριασμό στο NetProphet.',
    },
    {
      played: (n: number) => `${count(n, 'match', 'matches', lang)} this year`,
      sub: 'Follow them. See their matches first and get their results right away.',
      intro: 'A few who play a lot:',
      subject: 'Who do you know on court?',
      preheader: 'Follow them and you hear how they did right away.',
      kicker: 'YOUR CROWD',
      button: 'Find your crowd',
      why: 'You got this email because you made a NetProphet account.',
    },
  );
  const players: Card[] = list(e.payload, 'players')
    .filter((x) => str(x, 'name'))
    .map((x) => {
      const n = num(x, 'matches');
      return { title: str(x, 'name')!, sub: n ? c.played(n) : undefined };
    });
  return build(e, {
    subject: c.subject,
    preheader: c.preheader,
    hero: { kicker: c.kicker, title: c.subject, sub: esc(c.sub), art: 'friends' },
    body: [players.length ? block.paragraph(esc(c.intro)) : '', cardsHtml(players), block.button(OPEN_URL, c.button)],
    text: [...(players.length ? [c.intro, ...cardsText(players), ''] : []), `${c.button}: ${OPEN_URL}`],
    why: c.why,
  });
}

/** the stats row of day7 and monday: correct out of resolved (lime: what happened), streak and a third tile */
function statTiles(p: Obj, third: { value: string; label: string } | null, lang: EmailLang) {
  const resolved = num(p, 'resolved') ?? 0;
  const correct = num(p, 'correct') ?? 0;
  const votes = num(p, 'votes');
  const streak = num(p, 'streak');
  const en = lang === 'en';
  const tiles: { value: string; label: string; lime?: boolean }[] = [];
  if (resolved > 0) tiles.push({ value: `${fmt(correct, lang)}/${fmt(resolved, lang)}`, label: en ? 'right' : 'μέσα', lime: true });
  else if (votes) tiles.push({ value: fmt(votes, lang), label: en ? (votes === 1 ? 'vote' : 'votes') : votes === 1 ? 'ψήφος' : 'ψήφοι' });
  if (streak !== null) tiles.push({ value: fmt(streak, lang), label: en ? 'streak' : 'σερί' });
  if (third) tiles.push(third);
  return tiles;
}

/** day7_week: the first week in numbers */
export function day7WeekEmail(e: DueEmail): Mail {
  const lang = langOf(e);
  const p = e.payload;
  const resolved = num(p, 'resolved') ?? 0;
  const correct = num(p, 'correct') ?? 0;
  const points = num(p, 'points');
  const ladder = obj(p, 'ladder');
  const at = num(ladder, 'place');
  const size = num(ladder, 'size');
  const tier = tierName(str(ladder, 'tier'), lang);
  const toMedal = at !== null && at > 3 ? at - 3 : null;
  const board = tier && size ? COPY[lang].ladder.scopeName.league.replace('{tier}', tier).replace('{n}', fmt(size, lang)) : null;
  const slow = resolved > 0 && correct * 2 < resolved;
  const c = t(
    e,
    {
      subject: resolved > 0 ? `Η πρώτη σου εβδομάδα: ${fmt(correct)} στις ${fmt(resolved)}` : 'Η πρώτη σου εβδομάδα στο NetProphet',
      preheader:
        toMedal !== null ? `Είσαι ${count(toMedal, 'θέση', 'θέσεις')} από μετάλλιο.`
        : at !== null ? 'Είσαι στις 3 πρώτες θέσεις της Κατηγορίας σου.'
        : 'Η πρώτη σου εβδομάδα σε νούμερα.',
      points: 'πόντοι',
      boardKicker: 'ΚΑΤΗΓΟΡΙΑ',
      where:
        at === null ? null
        : toMedal !== null
          ? `Είσαι στη θέση ${fmt(at)}. Οι 3 πρώτοι στο τέλος του μήνα παίρνουν δώρα, frames και badges. Θα είσαι ένας από αυτούς;`
          : `Είσαι στη θέση ${fmt(at)}. Οι 3 πρώτοι στο τέλος του μήνα παίρνουν δώρα, frames και badges. Κράτα τη!`,
      kicker: 'Η 1Η ΣΟΥ ΕΒΔΟΜΑΔΑ',
      title: slow ? 'Η αρχή έγινε' : 'Όχι κι άσχημα για αρχή',
      button: 'Συνέχισε',
      why: 'Πήρες αυτό το email επειδή ξεκίνησες να παίζεις στο NetProphet.',
    },
    {
      subject: resolved > 0 ? `Your first week: ${fmt(correct, lang)} of ${fmt(resolved, lang)}` : 'Your first week on NetProphet',
      preheader:
        toMedal !== null ? `You’re ${count(toMedal, 'place', 'places', lang)} from a medal.`
        : at !== null ? 'You’re in the top 3 of your Ladder.'
        : 'Your first week in numbers.',
      points: points === 1 ? 'point' : 'points',
      boardKicker: 'YOUR LADDER',
      where:
        at === null ? null
        : toMedal !== null
          ? `You’re ${place(at, lang)}. The top 3 at the end of the month get a medal, a Frame and a badge. Will you be one of them?`
          : `You’re ${place(at, lang)}. The top 3 at the end of the month get a medal, a Frame and a badge. Hold on to it!`,
      kicker: 'YOUR FIRST WEEK',
      title: slow ? 'It’s a start' : 'Not bad for a start',
      button: 'Keep going',
      why: 'You got this email because you started playing on NetProphet.',
    },
  );
  const tiles = statTiles(p, points !== null ? { value: fmt(points, lang), label: c.points } : null, lang);
  return build(e, {
    subject: c.subject,
    preheader: c.preheader,
    hero: { kicker: c.kicker, title: c.title },
    body: [
      tiles.length ? block.tiles(tiles) : '',
      board ? block.card({ kicker: c.boardKicker, title: board }) : '',
      c.where ? block.paragraph(esc(c.where)) : '',
      block.button(OPEN_URL, c.button),
    ],
    text: [tiles.map((x) => `${x.value} ${x.label}`).join(' · '), board ?? '', c.where ?? '', '', `${c.button}: ${OPEN_URL}`],
    why: c.why,
  });
}

/** day14_missed: what happened while away (upsets, the players they follow) */
export function day14MissedEmail(e: DueEmail): Mail {
  const lang = langOf(e);
  const p = e.payload;
  const upsets = num(p, 'upsets') ?? 0;
  const w = t(
    e,
    { upset: 'Ανατροπή', following: 'Ακολουθείς', saw: (n: number) => `Μόνο το ${fmt(n)}% το είδε`, upsets: (n: number) => count(n, 'ανατροπή', 'ανατροπές') },
    { upset: 'Upset', following: 'Following', saw: (n: number) => `Only ${fmt(n, lang)}% saw it`, upsets: (n: number) => count(n, 'upset', 'upsets', lang) },
  );
  const upsetCards: Card[] = list(p, 'upset_list').map((m) => {
    const share = num(m, 'share');
    return { kicker: kicker(w.upset, str(m, 'tournament')), title: scoreline(m), sub: share !== null ? w.saw(share) : undefined };
  });
  const followed: Card[] = list(p, 'followed').map((m) => ({
    kicker: kicker(w.following, str(m, 'tournament')),
    title: scoreline(m),
    sub: str(m, 'player') ? `${str(m, 'player')}: ${outcome(m.won === true, lang)}` : undefined,
  }));
  const first = list(p, 'followed')[0];
  const firstLine =
    first && str(first, 'player')
      ? `${str(first, 'player')}: ${outcome(first.won === true, lang)} ${first.walkover === true ? 'w.o.' : (str(first, 'score') ?? '')}`.trim() + '.'
      : null;
  const c = t(
    e,
    {
      subject: upsets > 0 ? `Όσο έλειπες: ${w.upsets(upsets)}` : 'Όσο έλειπες στα γήπεδα',
      preheader: firstLine ?? 'Δες τι έγινε στα γήπεδα.',
      sub:
        upsets > 0 && followed.length ? `${w.upsets(upsets)} και τα νέα όσων ακολουθείς.`
        : upsets > 0 ? `${w.upsets(upsets)} που λίγοι είδαν.`
        : followed.length ? 'Τα νέα όσων ακολουθείς.'
        : 'Τα ματς δεν σταμάτησαν.',
      back: 'Η Κατάταξη ξεκινάει από το μηδέν κάθε μήνα. Προλαβαίνεις.',
      kicker: 'ΟΣΟ ΕΛΕΙΠΕΣ',
      title: 'Τα γήπεδα είναι ακόμα εκεί',
      button: 'Δες τι έγινε',
      why: 'Πήρες αυτό το email επειδή έφτιαξες λογαριασμό στο NetProphet πριν από δύο εβδομάδες.',
    },
    {
      subject: upsets > 0 ? `While you were away: ${w.upsets(upsets)}` : 'What you missed on court',
      // a walkover already ends in a full stop: «lost w.o.», not «lost w.o..»
      preheader: firstLine?.replace(/\.\.$/, '.') ?? 'See what happened on court.',
      sub:
        upsets > 0 && followed.length ? `${w.upsets(upsets)} and news from the players you follow.`
        : upsets > 0 ? `${w.upsets(upsets)} that few saw coming.`
        : followed.length ? 'News from the players you follow.'
        : 'The matches didn’t stop.',
      back: 'The Ladder starts from zero every month. There’s still time.',
      kicker: 'WHILE YOU WERE AWAY',
      title: 'The courts are still here',
      button: 'See what happened',
      why: 'You got this email because you made a NetProphet account two weeks ago.',
    },
  );
  const cards = [...upsetCards, ...followed];
  return build(e, {
    subject: c.subject,
    preheader: c.preheader,
    hero: { kicker: c.kicker, title: c.title, sub: esc(c.sub), art: 'missed' },
    body: [cardsHtml(cards), block.paragraph(esc(c.back)), block.button(OPEN_URL, c.button)],
    text: [...cardsText(cards), '', c.back, '', `${c.button}: ${OPEN_URL}`],
    why: c.why,
  });
}

/** monday: last week in numbers and the followed players who play this week */
export function mondayEmail(e: DueEmail): Mail {
  const lang = langOf(e);
  const p = e.payload;
  const resolved = num(p, 'resolved') ?? 0;
  const correct = num(p, 'correct') ?? 0;
  const at = num(obj(p, 'ladder'), 'place');
  const games: Card[] = list(p, 'followed')
    .filter((m) => pairing(m))
    .map((m) => ({ kicker: kicker(weekday(str(m, 'date'), lang), str(m, 'time'), str(m, 'tournament')) || undefined, title: pairing(m) }));
  const voted = (num(p, 'votes') ?? 0) > 0;
  const c = t(
    e,
    {
      title: resolved > 0 ? `${fmt(correct)} στις ${fmt(resolved)}. Καλή εβδομάδα!` : 'Καλή εβδομάδα!',
      placeLabel: 'θέση',
      head: 'Παίζουν οι δικοί σου:',
      preheader: games.length ? 'Η εβδομάδα σου και ποιοι δικοί σου παίζουν.' : 'Η εβδομάδα σου σε νούμερα.',
      monday: 'Δευτέρα',
      button: 'Ψήφισε την εβδομάδα',
      // a quiz-only week (the daily σερί): they played, they did not vote
      why: voted
        ? 'Πήρες αυτό το email επειδή ψήφισες την προηγούμενη εβδομάδα στο NetProphet.'
        : 'Πήρες αυτό το email επειδή έπαιξες την προηγούμενη εβδομάδα στο NetProphet.',
    },
    {
      title: resolved > 0 ? `${fmt(correct, lang)} of ${fmt(resolved, lang)}. Have a good week!` : 'Have a good week!',
      placeLabel: 'place',
      head: 'Your people play this week:',
      preheader: games.length ? 'Your week, and which of your people play.' : 'Your week in numbers.',
      monday: 'Monday',
      button: 'Vote on this week',
      why: voted
        ? 'You got this email because you voted last week on NetProphet.'
        : 'You got this email because you played last week on NetProphet.',
    },
  );
  const tiles = statTiles(p, at !== null ? { value: place(at, lang), label: c.placeLabel } : null, lang);
  // the daily σερί line, only when it is on (payload.days)
  const days = mondayStreakLines(p, lang) ?? [];
  return build(e, {
    subject: c.title,
    preheader: c.preheader,
    hero: { kicker: kicker(c.monday, dayMonth(str(p, 'date'), lang)), title: esc(c.title) },
    body: [
      tiles.length ? block.tiles(tiles) : '',
      ...days.map((l) => block.paragraph(esc(l))),
      games.length ? block.subheading(c.head) : '',
      cardsHtml(games),
      block.button(OPEN_URL, c.button),
    ],
    text: [tiles.map((x) => `${x.value} ${x.label}`).join(' · '), ...days, ...(games.length ? ['', c.head, ...cardsText(games)] : []), '', `${c.button}: ${OPEN_URL}`],
    why: c.why,
  });
}

/** month_close: the place in the closed month for everyone with points but no medal (the top 3 get the medal email) */
export function monthCloseEmail(e: DueEmail): Mail {
  const lang = langOf(e);
  const p = e.payload;
  const month = monthName(str(p, 'month'), lang);
  const at = num(p, 'place');
  const size = num(p, 'size');
  const points = num(p, 'points');
  const tier = tierName(str(p, 'tier'), lang);
  const result = str(p, 'outcome');
  const next = inTier(str(p, 'next_tier'), lang);
  const nextMonth = inMonth(str(p, 'next_month'), lang);
  const arrow = result === 'promoted' ? ' ↑' : result === 'relegated' ? ' ↓' : '';
  const cap = (s: string) => `${s[0]!.toUpperCase()}${s.slice(1)}`;
  const when = nextMonth ? cap(nextMonth) : null;
  const c = t(
    e,
    (() => {
      const pos = at !== null ? (size ? `θέση ${fmt(at)} από ${fmt(size)}` : `θέση ${fmt(at)}`) : null;
      const w = when ?? 'Τον νέο μήνα';
      return {
        pos,
        subject: month && pos ? `Ο ${month} έκλεισε: ${pos}` : month ? `Ο ${month} έκλεισε` : 'Ο μήνας έκλεισε',
        nextLine: next
          ? result === 'promoted' ? `Ανεβαίνεις! ${w} παίζεις ${next}${arrow}.`
            : result === 'relegated' ? `${w} παίζεις ${next}${arrow}. Νέος μήνας, νέα Κατάταξη.`
            : `${w} μένεις ${next}. Νέος μήνας, νέα Κατάταξη.`
          : 'Νέος μήνας, νέα Κατάταξη.',
        gear: 'Μήπως ο Baller σου θέλει καινούριο εξοπλισμό;',
        closed: 'Ο μήνας έκλεισε',
        points: points !== null ? `${count(points, 'πόντος', 'πόντοι')} στην Κατηγορία σου.` : null,
        button: 'Μπες στον νέο μήνα',
        why: 'Πήρες αυτό το email επειδή μάζεψες πόντους στην Κατάταξη τον μήνα που έκλεισε.',
      };
    })(),
    (() => {
      const pos = at !== null ? (size ? `${place(at, lang)} of ${fmt(size, lang)}` : place(at, lang)) : null;
      const w = when ?? 'Next month';
      return {
        pos,
        subject: month && pos ? `${month} is over: ${pos}` : month ? `${month} is over` : 'The month is over',
        nextLine: next
          ? result === 'promoted' ? `You’re moving up! ${w} you play ${next}${arrow}.`
            : result === 'relegated' ? `${w} you play ${next}${arrow}. New month, new Ladder.`
            : `${w} you stay ${next}. New month, new Ladder.`
          : 'New month, new Ladder.',
        gear: 'Maybe your Baller could use some new gear?',
        closed: 'The month is over',
        points: points !== null ? `${count(points, 'point', 'points', lang)} on your Ladder.` : null,
        button: 'Into the new month',
        why: 'You got this email because you earned points on the Ladder in the month that just ended.',
      };
    })(),
  );
  return build(e, {
    subject: c.subject,
    preheader: c.nextLine,
    hero: {
      kicker: kicker(month, tier),
      title: esc(c.pos ? cap(c.pos) : c.closed),
      sub: c.points ? esc(c.points) : undefined,
      art: 'launch',
    },
    body: [block.paragraph(esc(c.nextLine)), block.paragraph(esc(c.gear)), block.button(OPEN_URL, c.button)],
    text: [c.nextLine, '', c.gear, '', `${c.button}: ${OPEN_URL}`],
    why: c.why,
  });
}

/** away30: 30 days without opening the app, once */
export function away30Email(e: DueEmail): Mail {
  const lang = langOf(e);
  const p = e.payload;
  const name = hello(e.first_name, lang);
  const tournaments = num(p, 'tournaments') ?? 0;
  const matches = num(p, 'matches') ?? 0;
  const c = t(
    e,
    {
      near: p.near === true ? ' κοντά σου' : '',
      newT: (n: number) => count(n, 'νέο τουρνουά', 'νέα τουρνουά'),
      started: (n: number) => (n === 1 ? 'ξεκίνησε' : 'ξεκίνησαν'),
      matches: (n: number) => count(n, 'ματς', 'ματς'),
      played: (n: number) => `${n === 1 ? 'παίχτηκε' : 'παίχτηκαν'} από τότε.`,
      ladder: ['Η Κατάταξη', 'ξεκινάει από το μηδέν κάθε μήνα. Είσαι ακόμα μέσα.'] as [string, string],
      subject: name ? `Πάει καιρός, ${name}` : 'Πάει καιρός',
      last: 'Δεν θα σου ξαναγράψουμε γι’ αυτό.',
      still: 'Τα γήπεδα είναι ακόμα εκεί.',
      sub: 'Ο Baller σου σε περιμένει.',
      button: 'Ξαναμπές',
      why: 'Πήρες αυτό το email επειδή έχεις λογαριασμό στο NetProphet.',
    },
    {
      near: p.near === true ? ' near you' : '',
      newT: (n: number) => count(n, 'new tournament', 'new tournaments', lang),
      started: (n: number) => (n === 1 ? 'has started' : 'have started'),
      matches: (n: number) => count(n, 'match', 'matches', lang),
      played: (n: number) => `${n === 1 ? 'has' : 'have'} been played since.`,
      ladder: ['The Ladder', 'starts from zero every month. You’re still in it.'] as [string, string],
      subject: name ? `It’s been a while, ${name}` : 'It’s been a while',
      last: 'We won’t write to you about this again.',
      still: 'The courts are still here.',
      sub: 'Your Baller is waiting for you.',
      button: 'Come back',
      why: 'You got this email because you have a NetProphet account.',
    },
  );
  const items: [string, string][] = [];
  if (tournaments > 0) items.push([c.newT(tournaments), `${c.started(tournaments)}${c.near}.`]);
  if (matches > 0) items.push([c.matches(matches), c.played(matches)]);
  items.push(c.ladder);
  return build(e, {
    subject: c.subject,
    preheader: tournaments > 0 ? `${c.still} ${c.newT(tournaments)}${c.near}.` : c.still,
    hero: { title: esc(c.subject), sub: c.sub, art: 'missed' },
    body: [block.checks(items.map(([b, rest]) => `<strong>${esc(b)}</strong> ${esc(rest)}`)), block.button(OPEN_URL, c.button), block.note(esc(c.last))],
    text: [...items.map(([b, rest]) => `✓ ${b} ${rest}`), '', `${c.button}: ${OPEN_URL}`, '', c.last],
    why: c.why,
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
