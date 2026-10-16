'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Banner, Toast, type Tone } from '../feedback';
import { Badge, Card, Empty, Ghost, PageHeader, Primary, Secondary, Section, SkeletonCards, SkeletonRows, Stats, Table } from '../kit';
import { createTournament, deleteTournament, loadClubs, writeRecordsNow, loadReviews, loadTournaments, mergePlayers, rainDay, saveClub, type Club, readDraws, resolveReview, runNow, saveSource, type ReviewDecision } from '../sources/actions';
import type { ReviewItem, ReviewRow, SourceTournament } from '../sources/types';
import { reviewAnswers, reviewQuestions } from '@/lib/v2/ingestRows';
import type { RecordsResult } from '@/lib/v2/records';

/**
 * Tournaments (founder, 13-14 Oct): add a tournament once (name, surface, links) and it updates itself 3 times a day;
 * only the unclear things need staff. Built on the v2 kit: every action shows it is working (the button spins, the
 * card gets a moving bar and a banner), loading shows placeholder cards, never a blank or frozen page.
 */

const NEW = 'new';
const SURFACES = [
  { value: 'clay', label: 'Clay' },
  { value: 'hard', label: 'Hard' },
  { value: 'grass', label: 'Grass' },
  { value: 'carpet', label: 'Carpet' },
];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const surfaceWord = (s: string | null) => SURFACES.find((x) => x.value === s)?.label ?? '';

const athens = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', ...opts }).format(new Date(iso));

/** «today at 15:00», «yesterday at 22:00», «12 Oct at 08:00» in Athens time */
function whenWords(iso: string): string {
  const time = athens(iso, { hour: '2-digit', minute: '2-digit', hour12: false });
  const day = (d: Date) => athens(d.toISOString(), { year: 'numeric', month: '2-digit', day: '2-digit' });
  const now = new Date();
  if (day(new Date(iso)) === day(now)) return `today at ${time}`;
  if (day(new Date(iso)) === day(new Date(now.getTime() - 86_400_000))) return `yesterday at ${time}`;
  return `${athens(iso, { day: 'numeric', month: 'short' })} at ${time}`;
}

const shortDate = (d: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00Z`));
const dates = (t: SourceTournament) => (t.starts_on && t.ends_on ? `${shortDate(t.starts_on)} to ${shortDate(t.ends_on)}` : t.starts_on ? `from ${shortDate(t.starts_on)}` : '');

const notShared = 'We can’t open this sheet. In Google Sheets: Share → General access → Anyone with the link → Viewer.';
const readError = (m: string) => (m.includes('not shared') ? notShared : `We couldn’t read this link: ${m}`);

/** the sentence for a read, from the counts */
function foundSentence(m: { matches: number; results: number; draws: number | null; newPlayers: number; review: number }): string {
  let s = `Found ${plural(m.matches, 'match', 'matches')} (${m.results} with results)`;
  if (m.draws !== null) s += ` and ${plural(m.draws, 'draw')}`;
  s += '.';
  if (m.newPlayers > 0) s += ` ${plural(m.newPlayers, 'new player')} will be added.`;
  if (m.review > 0) s += ` ${m.review} need${m.review === 1 ? 's' : ''} a decision.`;
  return s;
}

/** what went wrong in the last run, in plain words; null when all is well */
function problemOf(t: SourceTournament): string | null {
  const last = t.last_run;
  const lastDraw = t.last_draw_run;
  const why = (e: string | null) => (e?.includes('not shared') ? 'it is not shared with “Anyone with the link”' : (e ?? 'unknown problem'));
  if (last && last.health === 'error') return `Couldn’t read the link ${whenWords(last.at)}: ${why(last.error)}`;
  if (lastDraw && lastDraw.health === 'error') return `Couldn’t read the draws sheet ${whenWords(lastDraw.at)}: ${why(lastDraw.error)}`;
  if (last && last.health === 'drop') return `The sheet looked much shorter than last time (${whenWords(last.at)}). Worth a look.`;
  if (last && last.health === 'empty') return `The sheet had no matches in it ${whenWords(last.at)}.`;
  return null;
}

/** the card's badge: what state the automatic updates are in */
function statusBadge(t: SourceTournament, problem: boolean): { tone: 'done' | 'attention' | 'neutral'; text: string } {
  if (!t.ongoing) return { tone: 'neutral', text: 'Paused' };
  if (problem) return { tone: 'attention', text: 'Needs a look' };
  if (!t.last_run) return { tone: 'neutral', text: 'Not updated yet' };
  return { tone: 'done', text: `✓ Updated ${whenWords(t.last_run.at).replace('today at ', '')}` };
}

/* ---------- names in plain words ---------- */

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ς/g, 'σ').trim();

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j += 1) d[0]![j] = j;
  for (let i = 1; i <= a.length; i += 1)
    for (let j = 1; j <= b.length; j += 1)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

/** how close a roster player is to the sheet's spelling, in words instead of a score */
function closeness(score: number, sheetHasFirst: boolean): string {
  if (!sheetHasFirst) return score >= 0.8 ? 'Same surname (the sheet has no first name)' : 'Similar surname (the sheet has no first name)';
  if (score >= 0.98) return 'Same name';
  if (score >= 0.9) return 'Almost the same name';
  if (score >= 0.75) return 'Similar name';
  return 'Only a little alike';
}

type Cand = { id: string; first_name: string; surname: string; score: number };

/** two suggestions that are surely one person written two ways: same first name, surname a letter or two apart */
function duplicatePair(cands: Cand[]): [Cand, Cand] | null {
  for (let i = 0; i < cands.length; i += 1)
    for (let j = i + 1; j < cands.length; j += 1) {
      const a = cands[i]!;
      const b = cands[j]!;
      if (fold(a.first_name) === fold(b.first_name) && fold(a.surname) !== fold(b.surname) && editDistance(fold(a.surname), fold(b.surname)) <= 2)
        return [a, b];
      if (fold(a.first_name) === fold(b.first_name) && fold(a.surname) === fold(b.surname)) return [a, b];
    }
  return null;
}

/** an Athens calendar day as YYYY-MM-DD, offset by whole days */
function athensDay(offset: number): string {
  const d = new Date(Date.now() + offset * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/* ---------- the page ---------- */

export function Tournaments() {
  const [tournaments, setTournaments] = useState<SourceTournament[] | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[] | null>(null);
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const notify = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2800);
  }, []);

  const [records, setRecords] = useState<RecordsState>({ kind: 'idle' });
  const writeRecords = async () => {
    setRecords({ kind: 'writing' });
    try {
      setRecords({ kind: 'result', result: await writeRecordsNow() });
    } catch (e) {
      setRecords({ kind: 'result', result: { ok: false, configured: true, message: e instanceof Error ? e.message : 'failed' } });
    }
  };

  const router = useRouter();
  const reload = useCallback(async () => {
    try {
      const [t, r, c] = await Promise.all([loadTournaments(), loadReviews(), loadClubs().catch(() => [] as Club[])]);
      setTournaments(t);
      setReviews(r);
      setClubs(c);
      setLoadError(null);
      // the side menu's counts are drawn on the server: ask for them again so a decision you just made leaves the badge
      router.refresh();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load');
    }
  }, [router]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const sorted = tournaments ? [...tournaments].sort((a, b) => Number(b.ongoing) - Number(a.ongoing) || a.name.localeCompare(b.name)) : null;
  const noSurface = clubs?.filter((c) => !c.surface).length ?? 0;

  return (
    <>
      <PageHeader
        title="Tournaments"
        intent="Add a tournament once. We read its links 3 times a day (08:00, 15:00, 22:00) and update matches, results and draws in the app."
        actions={
          <>
            <Secondary onClick={() => void writeRecords()} busy={records.kind === 'writing'}>
              {records.kind === 'writing' ? 'Writing…' : 'Write records now'}
            </Secondary>
            {!adding ? <Primary onClick={() => setAdding(true)}>+ Add a tournament</Primary> : null}
          </>
        }
      />
      <RecordsBanner state={records} />
      {loadError ? <Banner tone="problem" title="Could not load the tournaments" detail={loadError} /> : null}
      <Stats
        items={[
          { label: 'updating by themselves', value: tournaments ? tournaments.filter((t) => t.ongoing).length : '·', ink: true },
          { label: 'matches in them', value: tournaments ? tournaments.reduce((n, t) => n + t.matches, 0) : '·' },
          { label: 'decisions waiting', value: reviews ? reviews.length : '·' },
          { label: 'clubs without a surface', value: clubs ? noSurface : '·' },
        ]}
      />
      {adding ? <AddTournament onChanged={reload} onClose={() => setAdding(false)} /> : null}
      {reviews && reviews.length > 0 ? <NeedsYou items={reviews} onChanged={reload} notify={notify} /> : null}
      <Section
        title="Your tournaments"
        aside={
          <Link href="/v2/import" className="v2-muted" style={{ textDecoration: 'underline' }}>
            Manual CSV import
          </Link>
        }
      >
        {sorted === null ? (
          <SkeletonCards count={3} />
        ) : sorted.length === 0 ? (
          <Card>
            <Empty title="No tournaments yet">Add the first one with «+ Add a tournament» above.</Empty>
          </Card>
        ) : (
          <div className="v2-grid">
            {sorted.map((t) => (
              <TournamentCard key={t.id} t={t} onChanged={reload} notify={notify} />
            ))}
          </div>
        )}
      </Section>
      <Clubs clubs={clubs} onChanged={reload} notify={notify} />
      <Toast text={toast} />
    </>
  );
}

/* ---------- the records sheet ---------- */

type RecordsState = { kind: 'idle' } | { kind: 'writing' } | { kind: 'result'; result: RecordsResult };

const sheetLink = (url?: string) =>
  url ? (
    <a href={url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
      Open the sheet ›
    </a>
  ) : null;

/** working, then done with what was written and a link, or the problem in plain words */
function RecordsBanner({ state }: { state: RecordsState }) {
  if (state.kind === 'idle') return null;
  if (state.kind === 'writing') return <Banner tone="working" title="Writing the records sheet…" detail="Every tournament and its matches, plus what changed since the last write." />;
  const r = state.result;
  if (r.ok)
    return (
      <Banner
        tone="done"
        title="Records sheet written"
        detail={
          <>
            {plural(r.tournaments ?? 0, 'tournament')}, {plural(r.matches ?? 0, 'match', 'matches')}, {plural(r.changes ?? 0, 'change')} added to Changes. {sheetLink(r.url)}
          </>
        }
      />
    );
  return (
    <Banner
      tone="problem"
      title={r.configured ? 'Could not write the records sheet' : 'The records sheet is not set up yet'}
      detail={
        <>
          {r.message} {sheetLink(r.url)}
        </>
      }
    />
  );
}

function SurfaceSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select className="v2-select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose…</option>
      {SURFACES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

/* ---------- add a tournament ---------- */

type Phase =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'checked'; id: string; text: string }
  | { kind: 'starting'; id: string }
  | { kind: 'done' }
  | { kind: 'failed'; text: string };

function AddTournament({ onChanged, onClose }: { onChanged: () => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState('');
  const [surface, setSurface] = useState('');
  const [url, setUrl] = useState('');
  const [drawUrl, setDrawUrl] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [pending, start] = useTransition();
  const locked = phase.kind === 'checking' || phase.kind === 'checked' || phase.kind === 'starting';
  const ready = name.trim() !== '' && surface !== '' && url.trim() !== '';

  const resetForm = () => {
    setName('');
    setSurface('');
    setUrl('');
    setDrawUrl('');
  };

  const check = () =>
    start(async () => {
      setPhase({ kind: 'checking' });
      const created = await createTournament({ name, surface, source_url: url, draw_url: drawUrl });
      if (!created.ok || !created.data) {
        setPhase({ kind: 'failed', text: `We couldn’t save the tournament: ${created.message}` });
        return;
      }
      const id = created.data.id;
      await onChanged();
      const res = await runNow(id, true);
      if (!res.ok) {
        setPhase({ kind: 'failed', text: `${readError(res.message)} The tournament is saved. Fix the link with Edit on its card.` });
        resetForm();
        return;
      }
      let draws: number | null = null;
      if (drawUrl.trim()) {
        const d = await readDraws(id, true);
        if (!d.ok) {
          setPhase({ kind: 'failed', text: `${readError(d.message)} The tournament is saved. Fix the draws link with Edit on its card.` });
          resetForm();
          return;
        }
        draws = d.data?.draws ?? 0;
      }
      const c = res.data ?? {};
      setPhase({
        kind: 'checked',
        id,
        text: foundSentence({ matches: (c.created ?? 0) + (c.updated ?? 0), results: c.results ?? 0, draws, newPlayers: c.new_players ?? 0, review: c.held_for_review ?? 0 }),
      });
    });

  const go = (id: string) =>
    start(async () => {
      setPhase({ kind: 'starting', id });
      const res = await runNow(id, false);
      if (!res.ok) {
        setPhase({ kind: 'failed', text: readError(res.message) });
        resetForm();
        await onChanged();
        return;
      }
      if (drawUrl.trim()) {
        const d = await readDraws(id, false);
        if (!d.ok) {
          setPhase({ kind: 'failed', text: readError(d.message) });
          resetForm();
          await onChanged();
          return;
        }
      }
      resetForm();
      setPhase({ kind: 'done' });
      await onChanged();
    });

  const working = phase.kind === 'checking' || phase.kind === 'starting';
  return (
    <div className={`v2-card attention v2-enter${working ? ' busy' : ''}`}>
      <div className="v2-row between">
        <h2 className="v2-h2">Add a tournament</h2>
        <Ghost onClick={onClose} disabled={working}>
          Close
        </Ghost>
      </div>
      <div className="v2-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        <label className="v2-field">
          Name
          <input className="v2-input" value={name} disabled={locked} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="v2-field">
          Surface
          <SurfaceSelect value={surface} onChange={setSurface} disabled={locked} />
        </label>
        <label className="v2-field">
          Schedule and results link
          <input className="v2-input" value={url} disabled={locked} placeholder="Google Sheet, or athenstennis.gr/el/schedule" onChange={(e) => setUrl(e.target.value)} />
        </label>
        <label className="v2-field">
          Draws sheet link (optional)
          <input className="v2-input" value={drawUrl} disabled={locked} placeholder="https://docs.google.com/spreadsheets/d/..." onChange={(e) => setDrawUrl(e.target.value)} />
        </label>
      </div>
      <span className="v2-muted">A Google Sheet must be shared as “Anyone with the link can view”. We check the links before anything goes into the app.</span>
      {phase.kind === 'checking' ? <Banner tone="working" title="Reading the links…" detail="We check them before adding anything. A few seconds." /> : null}
      {phase.kind === 'checked' ? <Banner tone="done" title="The links open fine" detail={`${phase.text} Press Start to add them to the app.`} /> : null}
      {phase.kind === 'starting' ? <Banner tone="working" title="Adding matches, results and draws…" detail="This takes a few seconds." /> : null}
      {phase.kind === 'done' ? <Banner tone="done" title="Added" detail="It is in the app now and updates by itself 3 times a day." /> : null}
      {phase.kind === 'failed' ? <Banner tone="problem" title="Something needs fixing" detail={phase.text} /> : null}
      <div className="v2-row">
        {phase.kind === 'checked' || phase.kind === 'starting' ? (
          <Primary busy={phase.kind === 'starting'} disabled={pending && phase.kind !== 'starting'} onClick={() => go(phase.id)}>
            {phase.kind === 'starting' ? 'Adding…' : 'Start'}
          </Primary>
        ) : (
          <Primary busy={phase.kind === 'checking'} disabled={!ready || pending} onClick={check}>
            {phase.kind === 'checking' ? 'Checking…' : 'Check and add'}
          </Primary>
        )}
      </div>
    </div>
  );
}

/* ---------- one tournament ---------- */

type Busy = null | 'update' | 'save' | 'rain' | 'callOff' | 'pause' | 'delete';

function TournamentCard({ t, onChanged, notify }: { t: SourceTournament; onChanged: () => Promise<void>; notify: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(t.name);
  const [surface, setSurface] = useState(t.surface ?? '');
  const [url, setUrl] = useState(t.source_url ?? '');
  const [drawUrl, setDrawUrl] = useState(t.draw_url ?? '');
  const [note, setNote] = useState<{ tone: Tone; title: string; detail?: string } | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [, start] = useTransition();
  const [leaving, setLeaving] = useState(false);
  const [rain, setRain] = useState<{ day: string; label: string; n: number }[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const problem = problemOf(t);
  const badge = statusBadge(t, problem !== null);

  /** run an action with its own busy state, so the right button spins and the card shows it is working */
  const run = (kind: Busy, f: () => Promise<void>) =>
    start(async () => {
      setBusy(kind);
      try {
        await f();
      } finally {
        setBusy(null);
      }
    });

  const update = () =>
    run('update', async () => {
      setNote({ tone: 'working', title: 'Updating from the links…', detail: 'Reading the schedule, results and draws. A few seconds.' });
      const res = await runNow(t.id, false);
      if (!res.ok) {
        setNote({ tone: 'problem', title: 'Could not update', detail: readError(res.message) });
        await onChanged();
        return;
      }
      let draws: number | null = null;
      if (t.draw_url) {
        const d = await readDraws(t.id, false);
        if (!d.ok) {
          setNote({ tone: 'problem', title: 'Matches updated, draws could not be read', detail: readError(d.message) });
          await onChanged();
          return;
        }
        draws = d.data?.draws ?? 0;
      }
      const c = res.data ?? {};
      const created = c.created ?? 0;
      const extra = [created ? `${created} new matches` : '', c.results ? `${c.results} new results` : '', c.new_players ? `${c.new_players} new players` : '', c.moved ? `${c.moved} moved` : '', c.cancelled ? `${c.cancelled} cancelled` : '']
        .filter(Boolean)
        .join(', ');
      setNote({
        tone: 'done',
        title: extra ? `Updated: ${extra}` : 'Updated, nothing new since last time',
        detail: [draws !== null ? `${draws} draws refreshed.` : '', c.held_for_review ? `${c.held_for_review} need a decision (top of the page).` : ''].filter(Boolean).join(' ') || undefined,
      });
      notify(`${t.name} updated`);
      await onChanged();
    });

  const save = () =>
    run('save', async () => {
      const r = await saveSource(t.id, { name: name.trim(), surface, source_url: url, draw_url: drawUrl });
      setNote(r.ok ? null : { tone: 'problem', title: 'Could not save', detail: r.message });
      if (r.ok) {
        notify('Saved');
        setEditing(false);
        await onChanged();
      }
    });

  // «Βροχή»: today and yesterday with how many matches are still open on each, then one tap calls a day off
  const openRain = () =>
    run('rain', async () => {
      const days = [
        { day: athensDay(0), label: 'Today' },
        { day: athensDay(-1), label: 'Yesterday' },
      ];
      setRain(await Promise.all(days.map(async (d) => ({ ...d, n: (await rainDay(t.id, d.day, true)).data?.matches ?? 0 }))));
    });

  const callOff = (day: string, label: string) =>
    run('callOff', async () => {
      setNote({ tone: 'working', title: `Calling off ${label.toLowerCase()}’s matches…` });
      const r = await rainDay(t.id, day, false);
      setRain(null);
      if (!r.ok) {
        setNote({ tone: 'problem', title: 'Could not call them off', detail: r.message });
        return;
      }
      const n = r.data?.matches ?? 0;
      setNote({
        tone: 'done',
        title: `${label}: ${plural(n, 'match', 'matches')} called off for rain`,
        detail: 'Players see «Αναβλήθηκε» and keep their votes. When the sheet gives a match a new day, it comes back on its own.',
      });
      notify('Called off for rain');
      await onChanged();
    });

  const remove = () =>
    run('delete', async () => {
      setNote({ tone: 'working', title: `Deleting ${t.name}…`, detail: t.matches ? `Its ${plural(t.matches, 'match', 'matches')} go with it, then levels are worked out again.` : undefined });
      const r = await deleteTournament(t.id);
      setDeleting(false);
      if (!r.ok) {
        setNote({
          tone: 'problem',
          title: 'Could not delete it',
          detail: r.message.includes('has_votes') ? 'People already voted on its matches, so their points depend on it. Pause updates instead.' : r.message,
        });
        return;
      }
      setLeaving(true);
      notify(`${t.name} deleted`);
      await onChanged();
    });

  const toggle = () =>
    run('pause', async () => {
      const r = await saveSource(t.id, { ongoing: !t.ongoing });
      if (r.ok) notify(t.ongoing ? 'Updates paused' : 'Updates resumed');
      else setNote({ tone: 'problem', title: 'Could not change it', detail: r.message });
      if (r.ok) await onChanged();
    });

  const working = busy === 'update' || busy === 'delete' || busy === 'callOff' || busy === 'save';
  const idle = busy === null;
  return (
    <div className={['v2-card', 'v2-enter', working ? 'busy' : '', leaving ? 'leaving' : '', !t.ongoing ? 'paused' : ''].filter(Boolean).join(' ')} aria-busy={working || undefined}>
      <div className="v2-row between" style={{ alignItems: 'flex-start' }}>
        <div className="v2-stack" style={{ gap: 2 }}>
          <b className="v2-h3" style={{ fontSize: 18 }}>
            {t.name}
          </b>
          <span className="v2-muted">{[surfaceWord(t.surface), dates(t)].filter(Boolean).join(' · ') || 'No dates yet'}</span>
        </div>
        <Badge tone={badge.tone}>{badge.text}</Badge>
      </div>
      <div className="v2-row" style={{ gap: 18 }}>
        <span>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{t.matches}</b> <span className="v2-muted">matches</span>
        </span>
        <span>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{t.draws}</b> <span className="v2-muted">draws</span>
        </span>
        {t.open_reviews ? <Badge tone="attention">{plural(t.open_reviews, 'decision', 'decisions')}</Badge> : null}
      </div>
      {problem ? <span style={{ fontWeight: 700, fontSize: 14 }}>! {problem}</span> : null}
      {editing ? (
        <div className="v2-stack" style={{ gap: 10 }}>
          <label className="v2-field">
            Name
            <input className="v2-input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="v2-field">
            Surface
            <SurfaceSelect value={surface} onChange={setSurface} />
          </label>
          <label className="v2-field">
            Schedule and results link
            <input className="v2-input" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="v2-field">
            Draws sheet link (optional)
            <input className="v2-input" value={drawUrl} onChange={(e) => setDrawUrl(e.target.value)} />
          </label>
          <div className="v2-row">
            <Secondary small busy={busy === 'save'} disabled={!idle || name.trim() === '' || (t.ongoing && url.trim() === '' && drawUrl.trim() === '')} onClick={save}>
              {busy === 'save' ? 'Saving…' : 'Save'}
            </Secondary>
            <Ghost onClick={() => setEditing(false)} disabled={!idle}>
              Cancel
            </Ghost>
          </div>
        </div>
      ) : (
        <div className="v2-row" style={{ gap: 8 }}>
          <Secondary small busy={busy === 'update'} disabled={!idle || !t.source_url} onClick={update}>
            {busy === 'update' ? 'Updating…' : 'Update now'}
          </Secondary>
          <Secondary small busy={busy === 'rain'} disabled={!idle} onClick={openRain}>
            {busy === 'rain' ? 'Counting…' : 'Rained off…'}
          </Secondary>
          <Ghost disabled={!idle} onClick={() => setEditing(true)}>
            Edit
          </Ghost>
          <Ghost disabled={!idle} onClick={toggle}>
            {busy === 'pause' ? (t.ongoing ? 'Pausing…' : 'Resuming…') : t.ongoing ? 'Pause' : 'Resume'}
          </Ghost>
          <Ghost disabled={!idle} onClick={() => setDeleting(true)}>
            Delete…
          </Ghost>
        </div>
      )}
      {deleting ? (
        <div className="v2-confirm">
          <b>
            Delete {t.name}
            {t.matches ? ` and its ${plural(t.matches, 'match', 'matches')}` : ''}?
          </b>
          <span className="v2-muted">Results, draws and decisions go with it, and levels are worked out again. This cannot be undone.</span>
          <div className="v2-row">
            <Secondary small busy={busy === 'delete'} onClick={remove}>
              {busy === 'delete' ? 'Deleting…' : 'Delete for good'}
            </Secondary>
            <Ghost disabled={!idle} onClick={() => setDeleting(false)}>
              Cancel
            </Ghost>
          </div>
        </div>
      ) : null}
      {rain ? (
        <div className="v2-confirm">
          <b>Call off the matches that have no result yet</b>
          <div className="v2-row">
            {rain.map((d) => (
              <Secondary key={d.day} small busy={busy === 'callOff'} disabled={!idle || d.n === 0} onClick={() => callOff(d.day, d.label)}>
                {d.label}: {d.n === 0 ? 'nothing open' : plural(d.n, 'match', 'matches')}
              </Secondary>
            ))}
            <Ghost disabled={!idle} onClick={() => setRain(null)}>
              Cancel
            </Ghost>
          </div>
        </div>
      ) : null}
      {note ? <Banner tone={note.tone} title={note.title} detail={note.detail} /> : null}
    </div>
  );
}

/* ---------- decisions from the last update ---------- */

const sideNames = (side: { raw?: string; surname?: string; first?: string }[]) => side.map((p) => p.raw ?? `${p.surname ?? ''} ${p.first ?? ''}`.trim()).join(' / ');
const rowDate = (r: ReviewRow) => (r.date ? shortDate(r.date) : '');

function NeedsYou({ items, onChanged, notify }: { items: ReviewItem[]; onChanged: () => Promise<void>; notify: (text: string) => void }) {
  return (
    <Section title={`${plural(items.length, 'thing needs', 'things need')} a decision`} aside={<span className="v2-muted">Pick the right player, or “a new player”. Not sure? Skip it.</span>}>
      <div className="v2-stack" style={{ gap: 12 }}>
        {items.map((item) => (
          <ReviewBlock key={item.id} item={item} onChanged={onChanged} notify={notify} />
        ))}
      </div>
    </Section>
  );
}

function ReviewBlock({ item, onChanged, notify }: { item: ReviewItem; onChanged: () => Promise<void>; notify: (text: string) => void }) {
  const r = item.payload.row;
  const unclear = item.payload.unclear ?? [];
  // one question per place when one spelling is two people (two «ΚΑΛΙΒΡΟΥΣΗΣ» in a doubles, 15 Oct)
  const questions = reviewQuestions(r, unclear);
  // nothing chosen at first: Save waits until every name on the card has an answer (founder, 13 Oct)
  const [choice, setChoice] = useState<Record<string, string>>({});
  const allChosen = questions.every((q) => !!choice[q.key]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [merging, setMerging] = useState<{ raw: string; keep: string; drop: string } | null>(null);
  const [mergedIds, setMergedIds] = useState<string[]>([]);
  const a = sideNames(r.side1);
  const b = sideNames(r.side2);
  const where = `${item.tournament}, ${[rowDate(r), r.category_raw].filter(Boolean).join(' ')}`;

  const send = (decision: ReviewDecision) =>
    start(async () => {
      setError(null);
      const res = await resolveReview(item.id, decision);
      if (!res.ok) setError(res.message);
      else {
        notify('dismiss' in decision ? 'Skipped' : 'Saved. The match is in the app.');
        await onChanged();
      }
    });

  const merge = () =>
    start(async () => {
      if (!merging) return;
      setError(null);
      const res = await mergePlayers(merging.drop, merging.keep);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setMergedIds((m) => [...m, merging.drop]);
      setChoice((c) => ({ ...c, [merging.raw]: merging.keep }));
      setMerging(null);
      notify('Merged into one player. Now press Save.');
    });

  const savePeople = () =>
    send({ decisions: reviewAnswers(questions, choice, NEW) });

  return (
    <div className={`v2-card attention v2-enter${pending ? ' busy' : ''}`} aria-busy={pending || undefined}>
      {item.kind === 'people' && unclear.some((u) => u.reason) ? (
        <>
          {/* the sheet itself is short (a place with no name, one name on a doubles side): no player to pick */}
          <span>
            In {where}: {a} vs {b}.{' '}
            {unclear.some((u) => u.reason === 'side_incomplete')
              ? 'A side has the wrong number of names for this category.'
              : 'A place on this match has no name.'}
            <span className="v2-muted" style={{ display: 'block', marginTop: 2 }}>
              Fix the sheet and the next update picks it up, or skip this match.
            </span>
          </span>
          <div className="v2-row">
            <Skip pending={pending} send={send} />
          </div>
        </>
      ) : item.kind === 'people' ? (
        <>
          {questions.map(({ key, u, label }) => (
            <fieldset key={key} className="v2-stack" style={{ border: 0, padding: 0, margin: 0, gap: 2 }}>
              <legend style={{ padding: 0, marginBottom: 6, fontSize: 16, fontWeight: 700 }}>
                In {where}: is “{label}” one of these players?
                <span className="v2-muted" style={{ display: 'block', marginTop: 2, fontWeight: 400 }}>
                  The match: {a} vs {b}
                </span>
              </legend>
              {(u.candidates ?? [])
                .filter((c) => !mergedIds.includes(c.id))
                .map((c) => (
                  <label key={c.id} className="v2-choice">
                    <input type="radio" name={`${item.id}-${key}`} checked={choice[key] === c.id} onChange={() => setChoice({ ...choice, [key]: c.id })} />
                    <span>
                      <b>
                        {c.first_name} {c.surname}
                      </b>{' '}
                      <span className="v2-muted">· {closeness(c.score, (u.first ?? '').trim() !== '')}</span>
                    </span>
                  </label>
                ))}
              {(() => {
                const pair = duplicatePair((u.candidates ?? []).filter((c) => !mergedIds.includes(c.id)));
                if (!pair) return null;
                const [p, q] = pair;
                if (!merging || merging.raw !== key)
                  return (
                    <span style={{ alignSelf: 'flex-start' }}>
                      <Ghost disabled={pending} onClick={() => setMerging({ raw: key, keep: p.id, drop: q.id })}>
                        {p.first_name} {p.surname} and {q.first_name} {q.surname} look like the same person. Merge them
                      </Ghost>
                    </span>
                  );
                return (
                  <div className="v2-confirm">
                    <b>Merge into one player. Which spelling is right?</b>
                    {[p, q].map((c) => (
                      <label key={c.id} className="v2-choice">
                        <input type="radio" name={`${item.id}-${key}-keep`} checked={merging.keep === c.id} onChange={() => setMerging({ raw: key, keep: c.id, drop: c.id === p.id ? q.id : p.id })} />
                        {c.first_name} {c.surname}
                      </label>
                    ))}
                    <span className="v2-muted">The other one’s matches, results and followers move to the one you keep.</span>
                    <div className="v2-row">
                      <Secondary small busy={pending} onClick={merge}>
                        {pending ? 'Merging…' : 'Merge'}
                      </Secondary>
                      <Ghost disabled={pending} onClick={() => setMerging(null)}>
                        Cancel
                      </Ghost>
                    </div>
                  </div>
                );
              })()}
              <label className="v2-choice">
                <input type="radio" name={`${item.id}-${key}`} checked={choice[key] === NEW} onChange={() => setChoice({ ...choice, [key]: NEW })} />
                No, a new player
              </label>
            </fieldset>
          ))}
          <div className="v2-row">
            <Secondary small busy={pending} disabled={!allChosen} onClick={savePeople}>
              {pending ? 'Saving…' : 'Save'}
            </Secondary>
            {!allChosen ? <span className="v2-muted">Choose an answer{unclear.length > 1 ? ' for each name' : ''} first.</span> : null}
            <Skip pending={pending} send={send} />
          </div>
        </>
      ) : item.kind === 'walkover' ? (
        <>
          <span>
            {a} vs {b} ({item.tournament}, {rowDate(r)}) was a walkover. Who went through?
          </span>
          <div className="v2-row">
            <Secondary small disabled={pending} onClick={() => send({ winner_side: 1 })}>
              {a}
            </Secondary>
            <Secondary small disabled={pending} onClick={() => send({ winner_side: 2 })}>
              {b}
            </Secondary>
            <Skip pending={pending} send={send} />
          </div>
        </>
      ) : (
        <>
          <span>
            The sheet’s score for {a} vs {b} is different from what the players logged ({r.score_raw ?? 'see the sheet'}). If the sheet is right, fix it in{' '}
            <Link href="/v2/moderation" style={{ color: 'inherit', fontWeight: 700 }}>
              Moderation
            </Link>
            .
          </span>
          <div className="v2-row">
            <Secondary small disabled={pending} onClick={() => send({ dismiss: true })}>
              OK, done
            </Secondary>
            <Skip pending={pending} send={send} />
          </div>
        </>
      )}
      {error ? <Banner tone="problem" title="That did not save" detail={error} /> : null}
    </div>
  );
}

function Skip({ pending, send }: { pending: boolean; send: (d: ReviewDecision) => void }) {
  return (
    <Ghost disabled={pending} onClick={() => send({ dismiss: true })}>
      Skip
    </Ghost>
  );
}

/* ---------- clubs ---------- */

/**
 * Clubs (founder, 14 Oct): a league like Athens Tennis plays at several clubs, each its own surface. A source that
 * names the club adds it here the first time; give it a surface once and every match there takes it.
 */
function Clubs({ clubs, onChanged, notify }: { clubs: Club[] | null; onChanged: () => Promise<void>; notify: (text: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, start] = useTransition();
  if (clubs !== null && clubs.length === 0) return null;
  const missing = clubs?.filter((c) => !c.surface).length ?? 0;
  const set = (c: Club, surface: string) =>
    start(async () => {
      setSavingId(c.id);
      const r = await saveClub(c.id, surface);
      if (!r.ok) setError(r.message);
      else notify(`${c.name}: ${surfaceWord(surface) || 'no surface'}`);
      await onChanged();
      setSavingId(null);
    });
  return (
    <Section
      title="Clubs"
      aside={<span className="v2-muted">{missing ? `${plural(missing, 'club needs', 'clubs need')} a surface. Every match there takes it.` : 'Every match takes its club’s surface, else its tournament’s.'}</span>}
    >
      {error ? <Banner tone="problem" title="Could not save the surface" detail={error} /> : null}
      {clubs === null ? (
        <SkeletonRows rows={4} />
      ) : (
        <Table
          rows={clubs}
          rowKey={(c) => c.id}
          noun="clubs"
          pageSize={20}
          columns={[
            { key: 'name', label: 'Club', render: (c) => <b>{c.name}</b> },
            { key: 'courts', label: 'Courts', render: (c) => <span className="v2-muted">{c.courts.length ? c.courts.join(', ') : '·'}</span> },
            { key: 'matches', label: 'Matches', num: true, width: 100, render: (c) => c.matches },
            {
              key: 'surface',
              label: 'Surface',
              width: 240,
              render: (c) => (
                <div className="v2-row" style={{ flexWrap: 'nowrap' }}>
                  <SurfaceSelect value={c.surface ?? ''} disabled={savingId !== null} onChange={(v) => set(c, v)} />
                  {savingId === c.id ? <span className="v2-spin" aria-label="Saving" /> : !c.surface ? <Badge tone="attention">Needed</Badge> : null}
                </div>
              ),
            },
          ]}
        />
      )}
    </Section>
  );
}
