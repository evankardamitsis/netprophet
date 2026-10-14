/** the 08:30 staff email (api.admin_morning_digest → Resend), built as plain sentences */
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
  /** players the imports added to the roster in the last day, per tournament (up to 15 names each) */
  new_players?: { tournament: string; count: number; names: string[] }[];
}

const ADMIN_URL = 'https://netprophet-admin-v2.vercel.app/v2';
export const athensHour = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
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
  if (d.results_for_you) todo.push(`${many(d.results_for_you, 'match needs', 'matches need')} a result from you: ${ADMIN_URL}/results`);
  for (const p of d.sheet_problems)
    todo.push(p.health === 'error'
      ? `${p.tournament}: we could not read the ${p.kind === 'draws' ? 'draws' : 'schedule'} sheet (${p.error ?? 'unknown error'}). Check it on ${ADMIN_URL}/tournaments`
      : `${p.tournament}: the ${p.kind === 'draws' ? 'draws' : 'schedule'} sheet looked much shorter than before. Worth a look: ${ADMIN_URL}/tournaments`);
  const news: string[] = [];
  for (const o of d.overdue) news.push(`${o.tournament}: ${many(o.matches, 'match has', 'matches have')} no result after 3 nights (the organiser has not filled them in yet)`);
  if (d.postponed) news.push(`${many(d.postponed, 'match was', 'matches were')} postponed in the last day (rain or a moved day); they come back when the organiser puts them on a new day`);
  const today = d.today.length ? d.today.map((t) => `${t.tournament}: ${many(t.matches, 'match', 'matches')}`) : ['No matches today.'];
  for (const n of d.new_players ?? []) {
    const more = n.count > n.names.length ? `, and ${n.count - n.names.length} more` : '';
    news.push(`${n.tournament}: ${many(n.count, 'new player', 'new players')} added to the roster (${n.names.join(', ')}${more}). Check the spelling on ${ADMIN_URL}/players`);
  }
  if (!d.last_runs) news.push('The sheets were not read in the last day. The automatic updates may be stuck.');
  const subject = todo.length ? `NetProphet: ${many(todo.length, 'thing needs', 'things need')} you today` : 'NetProphet: all quiet this morning';
  const block = (title: string, lines: string[]) =>
    lines.length ? `<h3 style="margin:20px 0 8px;font:700 16px system-ui">${esc(title)}</h3><ul style="margin:0;padding-left:18px;font:15px/1.5 system-ui">${lines.map((l) => `<li>${esc(l).replace(/(https:\/\/\S+)/g, '<a href="$1">open</a>')}</li>`).join('')}</ul>` : '';
  const html = `<div style="max-width:560px;color:#0F2019">
<p style="font:700 20px system-ui;margin:0 0 4px">Good morning</p>
<p style="font:15px system-ui;margin:0;color:#3F4E46">${todo.length ? 'Here is what needs you today.' : 'Nothing needs you today.'}</p>
${block('Needs you', todo)}${block('Good to know', news)}${block('Today', today)}
<p style="font:13px system-ui;color:#7C8A82;margin-top:24px">Sent every morning at 08:30 by the NetProphet admin.</p></div>`;
  const text = [todo.length ? 'Needs you:' : 'Nothing needs you today.', ...todo.map((l) => `- ${l}`), news.length ? '\nGood to know:' : '', ...news.map((l) => `- ${l}`), '\nToday:', ...today.map((l) => `- ${l}`)]
    .filter((l) => l !== '')
    .join('\n');
  return { subject, html, text };
}

