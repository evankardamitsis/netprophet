'use client';
import { useMemo, useState, useTransition } from 'react';
import { formatSets, parseTennisScore, toWinnerFirst } from '@netprophet/core';
import type { FeedPlayer, SetScore, Side } from '@netprophet/db';
import { colors, ui } from '../ui';
import { resolveNow, saveResult, voidMatch, type ActionResult } from './actions';

export interface DeskItem {
  match_id: string;
  format: 'singles' | 'doubles' | 'mixed';
  status: string;
  starts_at: string;
  venue: string | null;
  round: string | null;
  tournament: string | null;
  resolved_at: string | null;
  sides: { side: Side; players: FeedPlayer[] }[];
  result: { winner_side: Side; sets: SetScore[]; score: string | null; retired: boolean; walkover: boolean } | null;
  votes: number;
  votes_resolved: number;
  bucket_name: 'to_score' | 'upcoming' | 'done';
}

const GROUPS: { key: DeskItem['bucket_name']; title: string; hint: string }[] = [
  { key: 'to_score', title: 'Waiting for a result', hint: 'Started, no result yet. Oldest first.' },
  { key: 'upcoming', title: 'Upcoming', hint: 'Voting is open until the start time.' },
  { key: 'done', title: 'Done', hint: 'Last 7 days.' },
];

const ROUNDS: Record<string, string> = {
  round64: 'Round of 64', round32: 'Round of 32', round16: 'Round of 16', quarter: 'Quarter-final', semi: 'Semi-final', final: 'Final',
};

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const sideName = (item: DeskItem, side: Side) =>
  (item.sides.find((s) => s.side === side)?.players ?? []).map((p) => `${p.first_name} ${p.surname}`).join(' / ') || `Side ${side}`;

export function Desk({ items, admin }: { items: DeskItem[]; admin: boolean }) {
  const [openUpcoming, setOpenUpcoming] = useState(false);
  // the last action's outcome; kept here because a saved match moves to another section and its row remounts
  const [notice, setNotice] = useState<(ActionResult & { what: string }) | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {notice ? (
        <div
          role="status"
          style={{ ...ui.card, background: notice.ok ? colors.ink : colors.white, color: notice.ok ? colors.paper : colors.ink, display: 'flex', justifyContent: 'space-between', gap: 12 }}
        >
          <span>
            <strong>{notice.what}</strong> {notice.message}
          </span>
          <button style={ui.link} onClick={() => setNotice(null)}>
            Close
          </button>
        </div>
      ) : null}
      {GROUPS.map((g) => {
        const list = items.filter((i) => i.bucket_name === g.key);
        const collapsed = g.key === 'upcoming' && !openUpcoming;
        return (
          <section key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ ...ui.h1, fontSize: 22 }}>
                  {g.title} <span style={{ ...ui.muted, fontSize: 16 }}>{list.length}</span>
                </h2>
                <p style={{ ...ui.muted, margin: 0 }}>{g.hint}</p>
              </div>
              {g.key === 'upcoming' && list.length ? (
                <button style={ui.link} onClick={() => setOpenUpcoming((o) => !o)}>
                  {openUpcoming ? 'Hide' : 'Show'}
                </button>
              ) : null}
            </div>
            {!collapsed && list.map((item) => <Row key={item.match_id} item={item} admin={admin} onNotice={setNotice} />)}
            {!collapsed && list.length === 0 ? <p style={ui.muted}>Nothing here.</p> : null}
          </section>
        );
      })}
    </div>
  );
}

function Row({
  item,
  admin,
  onNotice,
}: {
  item: DeskItem;
  admin: boolean;
  onNotice: (n: ActionResult & { what: string }) => void;
}) {
  const [raw, setRaw] = useState('');
  const [winnerChoice, setWinnerChoice] = useState<Side | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const parsed = useMemo(() => (raw.trim() ? parseTennisScore(raw) : null), [raw]);

  const place = [item.tournament ?? item.venue, item.round ? ROUNDS[item.round] ?? item.round : null].filter(Boolean).join(' · ');
  const needsWinnerPick = parsed?.status === 'wo' || (parsed?.status === 'ok' && parsed.retired);
  const winner: Side | null =
    parsed?.status === 'ok' ? (parsed.retired ? winnerChoice ?? parsed.winner : parsed.winner) : parsed?.status === 'wo' ? winnerChoice : null;
  const canSave = !pending && winner !== null && (parsed?.status === 'ok' || parsed?.status === 'wo');

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setFeedback(r);
      onNotice({ ...r, what: `${sideName(item, 1)} vs ${sideName(item, 2)}:` });
      if (r.ok) setRaw('');
    });

  const save = () => {
    if (!parsed || winner === null) return;
    const sets = parsed.status === 'ok' ? toWinnerFirst(parsed.sets, winner) : [];
    run(() =>
      saveResult({
        matchId: item.match_id,
        winnerSide: winner,
        sets,
        retired: parsed.status === 'ok' && parsed.retired,
        walkover: parsed.status === 'wo',
      }),
    );
  };

  return (
    <div style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={ui.muted}>
          {when(item.starts_at)} · {place || 'Friendly'} · {item.format}
        </span>
        <span style={ui.muted}>
          {item.votes} votes{item.votes_resolved ? ` · ${item.votes_resolved} resolved` : ''}
        </span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>
        <span style={{ color: colors.inkSoft, fontWeight: 600 }}>1 </span>
        {sideName(item, 1)}
        <span style={{ color: colors.inkSoft, fontWeight: 600 }}> vs 2 </span>
        {sideName(item, 2)}
      </div>

      {item.result ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>
            Winner: {sideName(item, item.result.winner_side)} ·{' '}
            {item.result.walkover ? 'walkover' : item.result.sets.map((s) => `${s.w}-${s.l}`).join(', ')}
            {item.result.retired ? ' ret.' : ''}
          </span>
          {admin && item.votes > item.votes_resolved ? (
            <button style={ui.secondary} disabled={pending} onClick={() => run(() => resolveNow(item.match_id))}>
              Resolve votes now
            </button>
          ) : null}
        </div>
      ) : item.status === 'void' ? (
        <span style={ui.muted}>Void</span>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              style={{ ...ui.input, flex: '1 1 220px', width: 'auto' }}
              placeholder="Score from side 1: 6-3 7-5, 62 36 10-6, wo"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setWinnerChoice(null);
                setFeedback(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && canSave && save()}
              aria-label={`Score for ${sideName(item, 1)} vs ${sideName(item, 2)}`}
            />
            <button style={ui.primary} disabled={!canSave} onClick={save}>
              Save result
            </button>
            <button
              style={ui.secondary}
              disabled={pending}
              onClick={() => {
                if (window.confirm('Void this match? Votes close with no points.')) run(() => voidMatch(item.match_id));
              }}
            >
              Void
            </button>
          </div>
          <Preview item={item} parsed={parsed} needsWinnerPick={needsWinnerPick} winner={winner} onPick={setWinnerChoice} />
        </>
      )}
      {feedback ? <p style={{ ...ui.error, color: feedback.ok ? colors.ink : colors.blue, margin: 0 }}>{feedback.message}</p> : null}
    </div>
  );
}

function Preview({
  item,
  parsed,
  needsWinnerPick,
  winner,
  onPick,
}: {
  item: DeskItem;
  parsed: ReturnType<typeof parseTennisScore> | null;
  needsWinnerPick: boolean;
  winner: Side | null;
  onPick: (s: Side) => void;
}) {
  if (!parsed) return null;
  if (parsed.status === 'invalid') return <p style={{ ...ui.muted, margin: 0 }}>Not a score yet: {parsed.reason}</p>;
  if (parsed.status === 'tbc') return <p style={{ ...ui.muted, margin: 0 }}>«tbc» is not a result. Leave it empty until there is one.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {needsWinnerPick ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={ui.muted}>{parsed.status === 'wo' ? 'Walkover. Who goes through?' : 'Retired. Who won?'}</span>
          {([1, 2] as Side[]).map((s) => (
            <label key={s} style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 700, fontSize: 14 }}>
              <input type="radio" checked={winner === s} onChange={() => onPick(s)} />
              {sideName(item, s)}
            </label>
          ))}
        </div>
      ) : null}
      {winner !== null ? (
        <p style={{ margin: 0, fontWeight: 700 }}>
          Winner: {sideName(item, winner)}
          {parsed.status === 'ok' ? ` · ${formatSets(parsed.sets)} (side 1 first)` : ' · walkover'}
        </p>
      ) : null}
    </div>
  );
}
