/** the 08:30 staff email (api.admin_morning_digest → Resend), built as plain sentences */
import { block, esc, renderEmail } from './emailLayout';

export interface Digest {
  date: string;
  recipients: string[];
  decisions: { people: number; walkovers: number; score_conflicts: number };
  results_for_you: number;
  overdue: { tournament: string; matches: number }[];
  sheet_problems: { tournament: string; kind: 'schedule' | 'draws'; health: 'error' | 'drop'; error: string | null; at: string }[];
  postponed: number;
  today: { tournament: string; matches: number }[];
  last_runs: number;
  /** matches called off for rain in the last day, per tournament and day: by the 15:00 rule (auto) or by staff */
  rained_off?: { tournament: string; day: string; auto: number; staff: number }[];
  /** players the imports added to the roster in the last day, per tournament (up to 15 names each) */
  new_players?: { tournament: string; count: number; names: string[] }[];
  /** clubs a sheet named that have matches but no surface yet (their matches use the tournament's meanwhile) */
  clubs_no_surface?: { club: string; matches: number; tournaments: string[] }[];
}

const ADMIN_URL = 'https://netprophet-admin-v2.vercel.app/v2';
export const athensHour = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;

/** the email: what needs you first, then what happened; plain sentences, one link per thing to do */
export function morningEmail(d: Digest): { subject: string; html: string; text: string } {
  const decisions = d.decisions.people + d.decisions.walkovers + d.decisions.score_conflicts;
  const todo: string[] = [];
  if (decisions) todo.push(`${many(decisions, 'decision', 'decisions')} on the Tournaments page (${[
    d.decisions.people ? many(d.decisions.people, 'name to match', 'names to match') : '',
    d.decisions.walkovers ? many(d.decisions.walkovers, 'walkover', 'walkovers') : '',
    d.decisions.score_conflicts ? many(d.decisions.score_conflicts, 'score that differs', 'scores that differ') : '',
  ].filter(Boolean).join(', ')}): ${ADMIN_URL}/tournaments`);
  // sheet matches with no result two days on wait for a person (founder, 14 Oct)
  for (const o of d.overdue)
    todo.push(`${o.tournament}: ${many(o.matches, 'match has', 'matches have')} no result 2 days on. Enter it, mark it rained off, or say it didn’t happen: ${ADMIN_URL}/results`);
  if (d.results_for_you) todo.push(`${many(d.results_for_you, 'match needs', 'matches need')} a result from you: ${ADMIN_URL}/results`);
  for (const p of d.sheet_problems)
    todo.push(p.health === 'error'
      ? `${p.tournament}: we could not read the ${p.kind === 'draws' ? 'draws' : 'schedule'} sheet (${p.error ?? 'unknown error'}). Check it on ${ADMIN_URL}/tournaments`
      : `${p.tournament}: the ${p.kind === 'draws' ? 'draws' : 'schedule'} sheet looked much shorter than before. Worth a look: ${ADMIN_URL}/tournaments`);
  // a new club from a sheet needs its surface (founder, 15 Oct)
  for (const c of d.clubs_no_surface ?? []) {
    const where = c.tournaments.length ? `, ${c.tournaments.join(', ')}` : '';
    todo.push(`${c.club} has no surface yet (${many(c.matches, 'match', 'matches')}${where}). Until you set it, its matches use the tournament’s surface. Set it on ${ADMIN_URL}/tournaments`);
  }
  const news: string[] = [];

  if (d.postponed) news.push(`${many(d.postponed, 'match was', 'matches were')} postponed in the last day (rain or a moved day); they come back when the organiser puts them on a new day`);
  const today = d.today.length ? d.today.map((t) => `${t.tournament}: ${many(t.matches, 'match', 'matches')}`) : ['No matches today.'];
  const dayWords = (day: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${day}T00:00:00Z`));
  for (const r of d.rained_off ?? []) {
    const parts = [
      r.auto ? `${many(r.auto, 'match', 'matches')} had no result the next afternoon and ${r.auto === 1 ? 'was' : 'were'} called off as rained off automatically` : '',
      r.staff ? `${many(r.staff, 'match was', 'matches were')} called off by you` : '',
    ].filter(Boolean);
    news.push(`${r.tournament}, ${dayWords(r.day)}: ${parts.join('; ')}. They come back when the organiser gives them a new day. Wrong? Check ${ADMIN_URL}/tournaments`);
  }
  for (const n of d.new_players ?? []) {
    const more = n.count > n.names.length ? `, and ${n.count - n.names.length} more` : '';
    news.push(`${n.tournament}: ${many(n.count, 'new player', 'new players')} added to the roster (${n.names.join(', ')}${more}). Check the spelling on ${ADMIN_URL}/players`);
  }
  if (!d.last_runs) news.push('The sheets were not read in the last day. The automatic updates may be stuck.');
  const subject = todo.length ? `NetProphet: ${many(todo.length, 'thing needs', 'things need')} you today` : 'NetProphet: all quiet this morning';
  const linked = (l: string) => esc(l).replace(/(https:\/\/\S+)/g, (url) => block.link(url, 'open'));
  const section = (title: string, lines: string[]) => (lines.length ? block.subheading(title) + block.list(lines.map(linked)) : '');
  const lead = todo.length ? 'Here is what needs you today.' : 'Nothing needs you today.';
  const bodyText = [todo.length ? 'Needs you:' : 'Nothing needs you today.', ...todo.map((l) => `- ${l}`), news.length ? '\nGood to know:' : '', ...news.map((l) => `- ${l}`), '\nToday:', ...today.map((l) => `- ${l}`)]
    .filter((l) => l !== '')
    .join('\n');
  const { html, text } = renderEmail({
    lang: 'en',
    subject,
    preheader: esc(lead),
    bodyHtml: [block.heading('Good morning'), block.note(esc(lead)), section('Needs you', todo), section('Good to know', news), section('Today', today)].join('\n'),
    bodyText,
    why: 'Sent every morning at 08:30 by the NetProphet admin, because the morning email is on for your staff account.',
  });
  return { subject, html, text };
}

