'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { colors, ui } from '../ui';
import { loadReviews, loadTournaments, readDraws, resolveReview, runNow, saveSource, type ReviewDecision } from './actions';
import { reviewAnswers, reviewQuestions } from '@/lib/v2/ingestRows';
import type { Health, IngestCounts, ReviewItem, SourceTournament } from './types';

const NEW = 'new';

const healthColors: Record<Health, { background: string; color: string }> = {
  ok: { background: colors.lime, color: colors.ink },
  drop: { background: colors.sand, color: colors.ink },
  empty: { background: colors.sand, color: colors.ink },
  error: { background: colors.ink, color: colors.paper },
};

function HealthWord({ health }: { health: Health }) {
  return <span style={{ ...healthColors[health], borderRadius: 8, padding: '2px 8px', fontWeight: 800, fontSize: 13 }}>{health}</span>;
}

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

function Counts({ c }: { c: IngestCounts }) {
  const parts: [string, number | undefined][] = [
    ['created', c.created],
    ['updated', c.updated],
    ['results', c.results],
    ['new players', c.new_players],
    ['linked', c.linked],
    ['held for review', c.held_for_review],
    ['walkovers to decide', c.walkovers_to_decide],
    ['moved', c.moved],
    ['attached to player matches', c.attached],
    ['score conflicts', c.score_conflicts],
    ['missing', c.missing],
    ['cancelled', c.cancelled],
  ];
  return (
    <span>
      {c.rows_seen !== undefined ? `${c.rows_seen} rows seen` : ''}
      {parts.map(([label, n]) => (n === undefined ? '' : `, ${n} ${label}`)).join('')}
    </span>
  );
}

export function Sources() {
  const [tournaments, setTournaments] = useState<SourceTournament[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reload = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([loadTournaments(), loadReviews()]);
      setTournaments(t);
      setReviews(r);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'could not load');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={ui.h1}>Sources</h1>
        <p style={ui.muted}>
          Each ongoing tournament&apos;s sheet is read at 08:00 and 22:00 Athens time. Share the sheet with anyone who has the link.
        </p>
      </div>
      {message ? <p style={ui.error}>{message}</p> : null}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <strong>Tournaments</strong>
        {tournaments.map((t) => (
          <TournamentCard key={t.id} t={t} onChanged={reload} busy={pending} start={start} />
        ))}
        {tournaments.length === 0 ? <span style={ui.muted}>No tournaments yet. Create one on the Import desk.</span> : null}
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <strong>Review · {reviews.length} open</strong>
        {reviews.map((r) => (
          <ReviewCard key={r.id} item={r} onChanged={reload} />
        ))}
        {reviews.length === 0 ? <span style={ui.muted}>Nothing to review.</span> : null}
      </section>
    </div>
  );
}

function TournamentCard({
  t,
  onChanged,
  busy,
  start,
}: {
  t: SourceTournament;
  onChanged: () => Promise<void>;
  busy: boolean;
  start: (fn: () => Promise<void>) => void;
}) {
  const [url, setUrl] = useState(t.source_url ?? '');
  const [kind, setKind] = useState(t.source_kind ?? 'sheet');
  const [season, setSeason] = useState(t.season_start_year ? String(t.season_start_year) : '');
  const [drawUrl, setDrawUrl] = useState(t.draw_url ?? '');
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState<{ text: string; error: boolean; counts?: IngestCounts } | null>(null);
  const dirty = url !== (t.source_url ?? '') || drawUrl !== (t.draw_url ?? '') || kind !== (t.source_kind ?? 'sheet') || season !== (t.season_start_year ? String(t.season_start_year) : '');

  const save = () =>
    start(async () => {
      const r = await saveSource(t.id, { source_kind: url ? kind : '', source_url: url, draw_url: drawUrl, season_start_year: season ? Number(season) : null });
      setNote({ text: r.message, error: !r.ok });
      if (r.ok) await onChanged();
    });

  const toggle = () =>
    start(async () => {
      const r = await saveSource(t.id, { ongoing: !t.ongoing });
      setNote({ text: r.message, error: !r.ok });
      if (r.ok) await onChanged();
    });

  const run = (dry: boolean) =>
    start(async () => {
      setConfirming(false);
      setNote({ text: dry ? 'Reading the sheet…' : 'Running…', error: false });
      const r = await runNow(t.id, dry);
      setNote({ text: r.message, error: !r.ok, counts: r.data });
      if (r.ok && !dry) await onChanged();
    });

  const draws = (dry: boolean) =>
    start(async () => {
      setNote({ text: 'Reading the draw sheet…', error: false });
      const r = await readDraws(t.id, dry);
      setNote({ text: `${r.message}${r.data ? ` · ${r.data.draws ?? 0} draws, ${r.data.linked ?? 0} of ${r.data.people ?? 0} names linked` : ''}`, error: !r.ok });
      if (r.ok && !dry) await onChanged();
    });

  const last = t.last_run;
  const lastDraw = t.last_draw_run;
  return (
    <div style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 17 }}>{t.name}</strong>
        <label style={{ ...ui.muted, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={t.ongoing} disabled={busy} onChange={toggle} /> ongoing
        </label>
        <span style={ui.muted}>
          {t.matches} matches · {t.draws} draws · {t.open_reviews} open reviews
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={{ ...ui.input, width: 110 }} value={kind} onChange={(e) => setKind(e.target.value as 'sheet' | 'csv' | 'site')}>
          <option value="sheet">Sheet</option>
          <option value="csv">CSV</option>
          <option value="site">Site</option>
        </select>
        <input style={{ ...ui.input, flex: '1 1 320px', width: 'auto' }} placeholder="https://docs.google.com/spreadsheets/d/..." value={url} onChange={(e) => setUrl(e.target.value)} />
        <label style={ui.muted}>
          Season starting{' '}
          <input style={{ ...ui.input, width: 100, display: 'inline-block' }} type="number" placeholder="auto" value={season} onChange={(e) => setSeason(e.target.value)} />
        </label>
        <button style={ui.secondary} disabled={busy || !dirty} onClick={save}>
          Save
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ ...ui.muted, width: 110 }}>Draw sheet</span>
        <input style={{ ...ui.input, flex: '1 1 320px', width: 'auto' }} placeholder="https://docs.google.com/spreadsheets/d/... (one bracket per tab)" value={drawUrl} onChange={(e) => setDrawUrl(e.target.value)} />
        <button style={ui.secondary} disabled={busy || !t.draw_url} onClick={() => draws(true)}>
          Δοκιμή draws
        </button>
        <button style={ui.secondary} disabled={busy || !t.draw_url} onClick={() => draws(false)}>
          Read draws
        </button>
      </div>
      <div style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {last ? (
          <>
            <span>
              Last run {when(last.at)} ({last.trigger})
            </span>
            <HealthWord health={last.health} />
            <Counts c={{ ...last.counts, rows_seen: last.rows_seen }} />
            {last.error ? <span style={ui.error}>{last.error}</span> : null}
          </>
        ) : (
          <span style={ui.muted}>Never run.</span>
        )}
      </div>
      {lastDraw ? (
        <div style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>
            Last draw read {when(lastDraw.at)} ({lastDraw.trigger})
          </span>
          <HealthWord health={lastDraw.health} />
          <span style={ui.muted}>
            {lastDraw.counts.draws ?? 0} draws, {lastDraw.counts.linked ?? 0} of {lastDraw.counts.people ?? 0} names linked
          </span>
          {lastDraw.error ? <span style={ui.error}>{lastDraw.error}</span> : null}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={ui.secondary} disabled={busy || !t.source_url} onClick={() => run(true)}>
          Δοκιμή τώρα
        </button>
        {confirming ? (
          <>
            <span style={ui.muted}>This saves matches, results and new players.</span>
            <button style={ui.primary} disabled={busy} onClick={() => run(false)}>
              Yes, run it
            </button>
            <button style={ui.link} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button style={ui.secondary} disabled={busy || !t.source_url} onClick={() => setConfirming(true)}>
            Τρέξε τώρα
          </button>
        )}
      </div>
      {note ? (
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
          <span style={note.error ? ui.error : undefined}>{note.text}</span>
          {note.counts ? (
            <span style={{ fontWeight: 400 }}>
              {' '}
              · <Counts c={note.counts} />
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

const sideNames = (side: { raw?: string; surname?: string; first?: string }[]) => side.map((p) => p.raw ?? `${p.surname ?? ''} ${p.first ?? ''}`.trim()).join(' / ');

function ReviewCard({ item, onChanged }: { item: ReviewItem; onChanged: () => Promise<void> }) {
  const row = item.payload.row;
  const unclear = item.payload.unclear ?? [];
  const questions = reviewQuestions(row, unclear);
  const [choice, setChoice] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((q) => [q.key, q.u.candidates?.[0]?.id ?? NEW])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = (decision: ReviewDecision) =>
    start(async () => {
      setError(null);
      const r = await resolveReview(item.id, decision);
      if (!r.ok) setError(r.message);
      else await onChanged();
    });

  const save = () =>
    send({
      decisions: reviewAnswers(questions, choice, NEW),
    });

  return (
    <div style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 14 }}>
        <strong>{item.tournament}</strong> · {item.kind === 'people' ? 'unclear people' : item.kind === 'walkover' ? 'walkover' : 'score differs from the players\' result'} · {row.date} {row.time} · {row.category_raw}
      </div>
      <div style={{ fontWeight: 700 }}>
        {sideNames(row.side1)} vs {sideNames(row.side2)}
      </div>
      {item.kind === 'people'
        ? questions.map(({ key, u, label }) => (
            <div key={key} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ flex: '0 0 240px', fontWeight: 700 }}>{label}</span>
              <select style={{ ...ui.input, height: 36, fontSize: 14, width: 'auto', minWidth: 260 }} value={choice[key]} onChange={(e) => setChoice({ ...choice, [key]: e.target.value })}>
                {(u.candidates ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.surname} · {c.score.toFixed(2)}
                  </option>
                ))}
                <option value={NEW}>New player</option>
              </select>
            </div>
          ))
        : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {item.kind === 'score_conflict' ? (
          <span style={ui.muted}>
            Sheet: {row.score_raw ?? 'see the sheet'}. The players already settled this match; if the sheet is right, correct it on Moderation, then dismiss.
          </span>
        ) : item.kind === 'people' ? (
          <button style={ui.primary} disabled={pending} onClick={save}>
            Save
          </button>
        ) : (
          <>
            <button style={ui.secondary} disabled={pending} onClick={() => send({ winner_side: 1 })}>
              Side 1 won
            </button>
            <button style={ui.secondary} disabled={pending} onClick={() => send({ winner_side: 2 })}>
              Side 2 won
            </button>
          </>
        )}
        <button style={ui.link} disabled={pending} onClick={() => send({ dismiss: true })}>
          Dismiss
        </button>
        {error ? <span style={ui.error}>{error}</span> : null}
      </div>
    </div>
  );
}
