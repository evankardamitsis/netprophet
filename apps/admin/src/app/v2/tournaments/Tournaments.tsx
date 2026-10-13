'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState, useTransition, type CSSProperties } from 'react';
import { colors, ui } from '../ui';
import { createTournament, loadReviews, loadTournaments, mergePlayers, readDraws, resolveReview, runNow, saveSource, type ReviewDecision } from '../sources/actions';
import type { ReviewItem, ReviewRow, SourceTournament } from '../sources/types';

const NEW = 'new';
const SURFACES = [
  { value: 'clay', label: 'Clay' },
  { value: 'hard', label: 'Hard' },
  { value: 'grass', label: 'Grass' },
  { value: 'carpet', label: 'Carpet' },
];

const stack = (gap: number): CSSProperties => ({ display: 'flex', flexDirection: 'column', gap });
const row: CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' };
const label: CSSProperties = { ...ui.muted, fontWeight: 700, display: 'flex', flexDirection: 'column', gap: 4 };

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
const readError = (m: string) => (m.includes('not shared') ? notShared : `We couldn’t read this sheet: ${m}`);

/** the sentence for a read, from the counts */
function foundSentence(m: { matches: number; results: number; draws: number | null; newPlayers: number; review: number }): string {
  let s = `Found ${plural(m.matches, 'match', 'matches')} (${m.results} with results)`;
  if (m.draws !== null) s += ` and ${plural(m.draws, 'draw')}`;
  s += '.';
  if (m.newPlayers > 0) s += ` ${plural(m.newPlayers, 'new player')} will be added.`;
  if (m.review > 0) s += ` ${m.review} need${m.review === 1 ? 's' : ''} a decision.`;
  return s;
}

function statusLine(t: SourceTournament): { text: string; bad: boolean } {
  const last = t.last_run;
  const lastDraw = t.last_draw_run;
  if (last && last.health === 'error') return { text: `Couldn’t read the sheet ${whenWords(last.at)}: ${last.error?.includes('not shared') ? 'it is not shared with “Anyone with the link”' : (last.error ?? 'unknown problem')}`, bad: true };
  if (lastDraw && lastDraw.health === 'error') return { text: `Couldn’t read the draws sheet ${whenWords(lastDraw.at)}: ${lastDraw.error?.includes('not shared') ? 'it is not shared with “Anyone with the link”' : (lastDraw.error ?? 'unknown problem')}`, bad: true };
  if (!last) return { text: 'Not updated yet', bad: false };
  if (last.health === 'drop') return { text: `The sheet looked much shorter than last time ${whenWords(last.at)}, worth a look`, bad: true };
  if (last.health === 'empty') return { text: `The sheet had no matches in it ${whenWords(last.at)}`, bad: true };
  return { text: `Updated ${whenWords(last.at)} · ${plural(t.matches, 'match', 'matches')} · ${plural(t.draws, 'draw')}`, bad: false };
}


/* ---------- visual cues: working, done, problem, and a toast after a decision ---------- */

const CUE_CSS = `
@keyframes npSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
@keyframes npIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
`;

type Tone = 'working' | 'done' | 'problem';

function Banner({ tone, title, detail }: { tone: Tone; title: string; detail?: string }) {
  const base: CSSProperties = { borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, animation: 'npIn .25s ease-out', position: 'relative', overflow: 'hidden' };
  const look: Record<Tone, CSSProperties> = {
    working: { background: colors.ink, color: colors.paper },
    done: { background: colors.lime, color: colors.ink },
    problem: { background: colors.white, color: colors.ink, border: `2px solid ${colors.ink}`, borderLeft: `8px solid ${colors.ink}` },
  };
  return (
    <div role={tone === 'problem' ? 'alert' : 'status'} style={{ ...base, ...look[tone] }}>
      <style>{CUE_CSS}</style>
      <span style={{ fontWeight: 800, fontSize: 15 }}>
        {tone === 'done' ? '✓ ' : tone === 'problem' ? '! ' : ''}
        {title}
      </span>
      {detail ? <span style={{ fontSize: 14, fontWeight: 600 }}>{detail}</span> : null}
      {tone === 'working' ? (
        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: colors.inkRaised }}>
          <span style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: colors.lime, animation: 'npSlide 1.1s ease-in-out infinite' }} />
        </span>
      ) : null}
    </div>
  );
}

function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="status" style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: colors.ink, color: colors.paper, padding: '12px 18px', borderRadius: 999, fontWeight: 700, fontSize: 15, boxShadow: '0 6px 24px rgba(0,0,0,.18)', zIndex: 50, animation: 'npIn .2s ease-out' }}>
      <style>{CUE_CSS}</style>
      {text}
    </div>
  );
}


/* ---------- names in plain words ---------- */

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').trim();

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

export function Tournaments() {
  const [tournaments, setTournaments] = useState<SourceTournament[] | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const notify = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2800);
  }, []);

  const reload = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([loadTournaments(), loadReviews()]);
      setTournaments(t);
      setReviews(r);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const sorted = tournaments ? [...tournaments].sort((a, b) => Number(b.ongoing) - Number(a.ongoing)) : null;

  return (
    <div style={stack(24)}>
      <div>
        <h1 style={ui.h1}>Tournaments</h1>
        <p style={ui.muted}>Add a tournament once. We read its sheets 3 times a day (08:00, 15:00, 22:00) and update matches, results and draws in the app.</p>
      </div>
      {loadError ? <p style={ui.error}>{loadError}</p> : null}
      {reviews && reviews.length > 0 ? <NeedsYou items={reviews} onChanged={reload} notify={notify} /> : null}
      <AddTournament onChanged={reload} />
      <section style={stack(12)}>
        <strong style={{ fontSize: 18 }}>Your tournaments</strong>
        {sorted === null ? <span style={ui.muted}>Loading…</span> : null}
        {sorted?.map((t) => <TournamentCard key={t.id} t={t} onChanged={reload} notify={notify} />)}
        {sorted && sorted.length === 0 ? <span style={ui.muted}>No tournaments yet. Add the first one above.</span> : null}
      </section>
      <p style={{ margin: 0 }}>
        <Link href="/v2/import" style={{ ...ui.muted, textDecoration: 'underline' }}>
          Manual CSV import
        </Link>
      </p>
      <Toast text={toast} />
    </div>
  );
}

function SurfaceSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select style={ui.input} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose…</option>
      {SURFACES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'checked'; id: string; text: string }
  | { kind: 'starting'; id: string }
  | { kind: 'done' }
  | { kind: 'failed'; text: string };

function AddTournament({ onChanged }: { onChanged: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [surface, setSurface] = useState('');
  const [url, setUrl] = useState('');
  const [drawUrl, setDrawUrl] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [pending, start] = useTransition();
  const locked = phase.kind === 'checking' || phase.kind === 'checked' || phase.kind === 'starting';
  const ready = name.trim() !== '' && surface !== '' && url.trim() !== '';

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
        setPhase({ kind: 'failed', text: `${readError(res.message)} The tournament is saved. Fix the link with Edit below.` });
        resetForm();
        return;
      }
      let draws: number | null = null;
      if (drawUrl.trim()) {
        const d = await readDraws(id, true);
        if (!d.ok) {
          setPhase({ kind: 'failed', text: `${readError(d.message)} The tournament is saved. Fix the draws link with Edit below.` });
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

  const resetForm = () => {
    setName('');
    setSurface('');
    setUrl('');
    setDrawUrl('');
  };

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

  return (
    <section style={{ ...ui.card, ...stack(14) }}>
      <strong style={{ fontSize: 18 }}>Add a tournament</strong>
      <label style={label}>
        Name
        <input style={ui.input} value={name} disabled={locked} onChange={(e) => setName(e.target.value)} />
      </label>
      <label style={label}>
        Surface
        <SurfaceSelect value={surface} onChange={setSurface} disabled={locked} />
      </label>
      <label style={label}>
        Schedule and results sheet link
        <input style={ui.input} value={url} disabled={locked} placeholder="https://docs.google.com/spreadsheets/d/..." onChange={(e) => setUrl(e.target.value)} />
      </label>
      <label style={label}>
        Draws sheet link (optional)
        <input style={ui.input} value={drawUrl} disabled={locked} placeholder="https://docs.google.com/spreadsheets/d/..." onChange={(e) => setDrawUrl(e.target.value)} />
      </label>
      <span style={ui.muted}>Paste the Google Sheets link. The sheet must be shared as “Anyone with the link can view”.</span>
      {phase.kind === 'idle' || phase.kind === 'failed' || phase.kind === 'done' || phase.kind === 'checking' ? (
        <div style={row}>
          <button style={ui.primary} disabled={!ready || pending || locked} onClick={check}>
            {phase.kind === 'checking' ? 'Checking…' : 'Check and add'}
          </button>
        </div>
      ) : null}
      {phase.kind === 'checked' || phase.kind === 'starting' ? (
        <div style={{ ...stack(10), border: `2px solid ${colors.ink}`, borderRadius: 12, padding: 12 }}>
          {phase.kind === 'checked' ? (
            <Banner tone="done" title="The sheets open fine" detail={`${phase.text} Press Start to add them to the app.`} />
          ) : (
            <Banner tone="working" title="Adding matches, results and draws…" detail="This takes a few seconds." />
          )}
          <div style={row}>
            <button style={ui.primary} disabled={pending || phase.kind === 'starting'} onClick={() => go(phase.id)}>
              Start
            </button>
          </div>
        </div>
      ) : null}
      {phase.kind === 'checking' ? <Banner tone="working" title="Reading the sheets…" detail="We check the links before adding anything." /> : null}
      {phase.kind === 'done' ? <Banner tone="done" title="Added" detail="It is in the app now and will update by itself 3 times a day." /> : null}
      {phase.kind === 'failed' ? <Banner tone="problem" title="Something needs fixing" detail={phase.text} /> : null}
    </section>
  );
}

function TournamentCard({ t, onChanged, notify }: { t: SourceTournament; onChanged: () => Promise<void>; notify: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(t.name);
  const [surface, setSurface] = useState(t.surface ?? '');
  const [url, setUrl] = useState(t.source_url ?? '');
  const [drawUrl, setDrawUrl] = useState(t.draw_url ?? '');
  const [note, setNote] = useState<{ tone: Tone; title: string; detail?: string } | null>(null);
  const [pending, start] = useTransition();
  const status = statusLine(t);

  const update = () =>
    start(async () => {
      setNote({ tone: 'working', title: 'Updating from the sheets…', detail: 'Reading the schedule, results and draws. This takes a few seconds.' });
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
        detail: [draws !== null ? `${draws} draws refreshed.` : '', c.held_for_review ? `${c.held_for_review} need a decision (see the top of the page).` : ''].filter(Boolean).join(' ') || undefined,
      });
      notify(`${t.name} updated`);
      await onChanged();
    });

  const save = () =>
    start(async () => {
      const r = await saveSource(t.id, { name: name.trim(), surface, source_url: url, draw_url: drawUrl });
      setNote(r.ok ? null : { tone: 'problem', title: 'Could not save', detail: r.message });
      if (r.ok) {
        notify('Saved');
        setEditing(false);
        await onChanged();
      }
    });

  const toggle = () =>
    start(async () => {
      const r = await saveSource(t.id, { ongoing: !t.ongoing });
      if (r.ok) notify(t.ongoing ? 'Updates paused' : 'Updates resumed');
      else setNote({ tone: 'problem', title: 'Could not change it', detail: r.message });
      if (r.ok) await onChanged();
    });

  return (
    <div style={{ ...ui.card, ...stack(10), opacity: t.ongoing ? 1 : 0.75 }}>
      <div style={{ ...row, gap: 8 }}>
        <strong style={{ fontSize: 17 }}>{t.name}</strong>
        <span style={ui.muted}>{[surfaceWord(t.surface), dates(t)].filter(Boolean).join(' · ')}</span>
        {!t.ongoing ? <span style={ui.muted}>· Paused</span> : null}
      </div>
      <span style={status.bad ? ui.error : { fontSize: 14 }}>{status.text}</span>
      {editing ? (
        <div style={stack(10)}>
          <label style={label}>
            Name
            <input style={ui.input} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label style={label}>
            Surface
            <SurfaceSelect value={surface} onChange={setSurface} />
          </label>
          <label style={label}>
            Schedule and results sheet link
            <input style={ui.input} value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label style={label}>
            Draws sheet link (optional)
            <input style={ui.input} value={drawUrl} onChange={(e) => setDrawUrl(e.target.value)} />
          </label>
          <div style={row}>
            <button style={ui.secondary} disabled={pending || name.trim() === '' || (t.ongoing && url.trim() === '' && drawUrl.trim() === '')} onClick={save}>
              Save
            </button>
            <button style={ui.link} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={row}>
          <button style={ui.secondary} disabled={pending || !t.source_url} onClick={update}>
            {pending && note?.tone === 'working' ? 'Updating…' : 'Update now'}
          </button>
          <button style={ui.secondary} disabled={pending} onClick={() => setEditing(true)}>
            Edit
          </button>
          <button style={ui.link} disabled={pending} onClick={toggle}>
            {t.ongoing ? 'Pause updates' : 'Resume updates'}
          </button>
        </div>
      )}
      {note ? <Banner tone={note.tone} title={note.title} detail={note.detail} /> : null}
    </div>
  );
}

const sideNames = (side: { raw?: string; surname?: string; first?: string }[]) => side.map((p) => p.raw ?? `${p.surname ?? ''} ${p.first ?? ''}`.trim()).join(' / ');
const rowDate = (r: ReviewRow) => (r.date ? shortDate(r.date) : '');

function NeedsYou({ items, onChanged, notify }: { items: ReviewItem[]; onChanged: () => Promise<void>; notify: (text: string) => void }) {
  return (
    <section style={{ ...ui.card, ...stack(16) }}>
      <div style={stack(4)}>
        <strong style={{ fontSize: 18 }}>{plural(items.length, 'thing needs', 'things need')} a decision</strong>
        <span style={ui.muted}>From the last update. Pick the right player, or “a new player” if none of them is the person. Not sure? Skip it.</span>
      </div>
      {items.map((item) => (
        <ReviewBlock key={item.id} item={item} onChanged={onChanged} notify={notify} />
      ))}
    </section>
  );
}

function ReviewBlock({ item, onChanged, notify }: { item: ReviewItem; onChanged: () => Promise<void>; notify: (text: string) => void }) {
  const r = item.payload.row;
  const unclear = item.payload.unclear ?? [];
  const [choice, setChoice] = useState<Record<string, string>>(() => Object.fromEntries(unclear.map((u) => [u.raw, u.candidates?.[0]?.id ?? NEW])));
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
    send({ decisions: unclear.map((u) => (choice[u.raw] === NEW ? { raw: u.raw, new: true as const } : { raw: u.raw, player_id: choice[u.raw] })) });

  return (
    <div style={{ ...stack(10), borderTop: `1px solid ${colors.mist}`, paddingTop: 14 }}>
      {item.kind === 'people' ? (
        <>
          {unclear.map((u) => (
            <fieldset key={u.raw} style={{ border: 0, padding: 0, margin: 0, ...stack(6) }}>
              <legend style={{ padding: 0, marginBottom: 6, fontSize: 15 }}>
                In {where}: is “{u.raw}” one of these players?
                <span style={{ ...ui.muted, display: 'block', marginTop: 2 }}>
                  The match: {a} vs {b}
                </span>
              </legend>
              {(u.candidates ?? [])
                .filter((c) => !mergedIds.includes(c.id))
                .map((c) => (
                  <label key={c.id} style={{ ...row, gap: 8, fontSize: 15 }}>
                    <input type="radio" name={`${item.id}-${u.raw}`} checked={choice[u.raw] === c.id} onChange={() => setChoice({ ...choice, [u.raw]: c.id })} />
                    <span>
                      <strong>
                        {c.first_name} {c.surname}
                      </strong>{' '}
                      <span style={ui.muted}>· {closeness(c.score, (u.first ?? '').trim() !== '')}</span>
                    </span>
                  </label>
                ))}
              {(() => {
                const pair = duplicatePair((u.candidates ?? []).filter((c) => !mergedIds.includes(c.id)));
                if (!pair) return null;
                const [a, b] = pair;
                if (!merging || merging.raw !== u.raw)
                  return (
                    <button style={{ ...ui.link, alignSelf: 'flex-start' }} disabled={pending} onClick={() => setMerging({ raw: u.raw, keep: a.id, drop: b.id })}>
                      {a.first_name} {a.surname} and {b.first_name} {b.surname} look like the same person. Merge them
                    </button>
                  );
                return (
                  <div style={{ ...stack(8), border: `2px solid ${colors.ink}`, borderRadius: 12, padding: 12 }}>
                    <span style={{ fontWeight: 700 }}>Merge into one player. Which spelling is right?</span>
                    {[a, b].map((c) => (
                      <label key={c.id} style={{ ...row, gap: 8, fontSize: 15 }}>
                        <input type="radio" name={`${item.id}-${u.raw}-keep`} checked={merging.keep === c.id} onChange={() => setMerging({ raw: u.raw, keep: c.id, drop: c.id === a.id ? b.id : a.id })} />
                        {c.first_name} {c.surname}
                      </label>
                    ))}
                    <span style={ui.muted}>The other one’s matches, results and followers move to the one you keep.</span>
                    <div style={row}>
                      <button style={ui.secondary} disabled={pending} onClick={merge}>
                        {pending ? 'Merging…' : 'Merge'}
                      </button>
                      <button style={ui.link} disabled={pending} onClick={() => setMerging(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })()}
              <label style={{ ...row, gap: 8, fontSize: 15 }}>
                <input type="radio" name={`${item.id}-${u.raw}`} checked={choice[u.raw] === NEW} onChange={() => setChoice({ ...choice, [u.raw]: NEW })} />
                No, a new player
              </label>
            </fieldset>
          ))}
          <div style={row}>
            <button style={ui.secondary} disabled={pending} onClick={savePeople}>
              {pending ? 'Saving…' : 'Save'}
            </button>
            <Skip pending={pending} send={send} />
          </div>
        </>
      ) : item.kind === 'walkover' ? (
        <>
          <span>
            {a} vs {b} ({item.tournament}, {rowDate(r)}) was a walkover. Who went through?
          </span>
          <div style={row}>
            <button style={ui.secondary} disabled={pending} onClick={() => send({ winner_side: 1 })}>
              {a}
            </button>
            <button style={ui.secondary} disabled={pending} onClick={() => send({ winner_side: 2 })}>
              {b}
            </button>
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
          <div style={row}>
            <button style={ui.secondary} disabled={pending} onClick={() => send({ dismiss: true })}>
              OK, done
            </button>
            <Skip pending={pending} send={send} />
          </div>
        </>
      )}
      {error ? <span style={ui.error}>{error}</span> : null}
    </div>
  );
}

function Skip({ pending, send }: { pending: boolean; send: (d: ReviewDecision) => void }) {
  return (
    <button style={ui.link} disabled={pending} onClick={() => send({ dismiss: true })}>
      Skip
    </button>
  );
}
