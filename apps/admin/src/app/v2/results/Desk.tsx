'use client';
import { useState, useTransition, type CSSProperties } from 'react';
import { isValidMatchTiebreak, isValidTennisSet } from '@netprophet/core';
import type { FeedPlayer, SetScore, Side } from '@netprophet/db';
import { colors, ui } from '../ui';
import { Banner, Toast, useToast, type Tone } from '../feedback';
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

type Notice = { tone: Tone; title: string; detail?: string };

const ROUNDS: Record<string, string> = {
  round64: 'Round of 64', round32: 'Round of 32', round16: 'Round of 16', quarter: 'Quarter-final', semi: 'Semi-final', final: 'Final',
};
const FORMATS: Record<DeskItem['format'], string> = { singles: 'Singles', doubles: 'Doubles', mixed: 'Mixed doubles' };

const stack = (gap: number): CSSProperties => ({ display: 'flex', flexDirection: 'column', gap });
const wrapRow: CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** «Sat 10 Oct, 11:45» in Athens time */
const when = (iso: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.weekday} ${p.day} ${p.month}, ${p.hour}:${p.minute}`;
};

const sideName = (item: DeskItem, side: Side) =>
  (item.sides.find((s) => s.side === side)?.players ?? []).map((p) => `${p.first_name} ${p.surname}`).join(' / ') || 'Unknown';

export function Desk({ items, admin }: { items: DeskItem[]; admin: boolean }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const { toast, notify } = useToast();
  const [openSheets, setOpenSheets] = useState(false);
  const [openDone, setOpenDone] = useState(false);

  const waiting = items.filter((i) => i.bucket_name === 'to_score');
  const fromSheets = waiting.filter((i) => i.tournament);
  const fromYou = waiting.filter((i) => !i.tournament);
  const done = items.filter((i) => i.bucket_name === 'done');

  const sentence =
    fromYou.length > 0
      ? `${plural(fromYou.length, 'match', 'matches')} started and ${fromYou.length === 1 ? 'needs' : 'need'} a result from you.`
      : 'All clear. Nothing needs a result from you right now.';

  return (
    <div style={stack(24)}>
      <div>
        <h1 style={ui.h1}>Results</h1>
        <p style={ui.muted}>
          Matches that have started and have no result yet. {sentence}
        </p>
      </div>
      {notice ? <Banner {...notice} /> : null}

      <section style={stack(10)}>
        <strong style={{ fontSize: 18 }}>
          Need a result from you <span style={ui.muted}>{fromYou.length}</span>
        </strong>
        <p style={{ ...ui.muted, margin: 0 }}>Friendly matches and anything not on a tournament sheet. Pick who won, then the score.</p>
        {fromYou.length === 0 ? <p style={ui.muted}>All clear. Nothing waiting.</p> : null}
        {fromYou.map((item) => (
          <Row key={item.match_id} item={item} admin={admin} onNotice={setNotice} notify={notify} />
        ))}
      </section>

      <section style={stack(10)}>
        <div style={{ ...wrapRow, justifyContent: 'space-between' }}>
          <strong style={{ fontSize: 18 }}>
            From tournament sheets <span style={ui.muted}>{fromSheets.length}</span>
          </strong>
          {fromSheets.length ? (
            <button style={ui.link} onClick={() => setOpenSheets((o) => !o)}>
              {openSheets ? 'Hide' : 'Show'}
            </button>
          ) : null}
        </div>
        <p style={{ ...ui.muted, margin: 0 }}>These fill in by themselves when the organiser’s sheet has the score. Enter one only if the sheet never will.</p>
        {fromSheets.length === 0 ? <p style={ui.muted}>All clear. Nothing waiting.</p> : null}
        {openSheets ? fromSheets.map((item) => <Row key={item.match_id} item={item} admin={admin} onNotice={setNotice} notify={notify} />) : null}
      </section>

      {done.length ? (
        <section style={stack(10)}>
          <div style={{ ...wrapRow, justifyContent: 'space-between' }}>
            <strong style={{ fontSize: 18 }}>
              Finished this week <span style={ui.muted}>{done.length}</span>
            </strong>
            <button style={ui.link} onClick={() => setOpenDone((o) => !o)}>
              {openDone ? 'Hide' : 'Show'}
            </button>
          </div>
          {openDone ? done.map((item) => <Row key={item.match_id} item={item} admin={admin} onNotice={setNotice} notify={notify} />) : null}
        </section>
      ) : null}
      <Toast text={toast} />
    </div>
  );
}

function Row({ item, admin, onNotice, notify }: { item: DeskItem; admin: boolean; onNotice: (n: Notice) => void; notify: (t: string) => void }) {
  const [pending, start] = useTransition();
  const [winner, setWinner] = useState<Side | null>(null);
  const [games, setGames] = useState<string[][]>([['', ''], ['', ''], ['', '']]);
  const [tiebreak, setTiebreak] = useState(false);
  const [retired, setRetired] = useState(false);
  const [walkover, setWalkover] = useState(false);
  const [confirmGone, setConfirmGone] = useState(false);

  const names = `${sideName(item, 1)} vs ${sideName(item, 2)}`;
  const place = [item.tournament ?? item.venue ?? 'Friendly', item.round ? ROUNDS[item.round] ?? item.round : null, FORMATS[item.format]].filter(Boolean).join(' · ');

  const setGame = (r: number, c: number, v: string) =>
    setGames((g) => g.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v.replace(/\D/g, '').slice(0, 2) : x)) : row)));

  // the score as the server wants it: winner first
  const built = (): { sets: SetScore[]; problem: string | null } => {
    if (walkover) return { sets: [], problem: null };
    const sets: SetScore[] = [];
    let wonByWinner = 0;
    let wonByOther = 0;
    for (let r = 0; r < 3; r += 1) {
      const [a, b] = games[r]!;
      if (a === '' && b === '') {
        if (r < 2 && !retired) return { sets, problem: r === 0 ? 'Enter the games of the first set.' : 'Enter the games of the second set.' };
        continue;
      }
      if (a === '' || b === '') return { sets, problem: `Fill both boxes of set ${r + 1}.` };
      const w = Number(a);
      const l = Number(b);
      const isTb = r === 2 && tiebreak;
      const last = retired && (r === 2 || (games[r + 1]?.[0] === '' && games[r + 1]?.[1] === ''));
      if (isTb ? !isValidMatchTiebreak(w, l) : !isValidTennisSet(w, l) && !last) {
        return { sets, problem: isTb ? 'A match tie-break goes to 10, won by two (for example 10 – 7).' : `Set ${r + 1} (${w} – ${l}) is not a possible score.` };
      }
      if (w === l) return { sets, problem: `Set ${r + 1} can’t be a draw.` };
      if (w > l) wonByWinner += 1;
      else wonByOther += 1;
      sets.push(isTb ? { w, l, stb: true } : { w, l });
    }
    if (!retired) {
      if (wonByWinner !== 2 || wonByOther > 1) return { sets, problem: 'The winner must win two sets. Check the games or who won.' };
      if (sets.length === 3 && wonByWinner + wonByOther !== 3) return { sets, problem: 'Check the games.' };
      if (sets.length === 2 && wonByOther !== 0) return { sets, problem: 'After one set each, the third set is needed.' };
    }
    if (sets.length === 0) return { sets, problem: 'Enter the games.' };
    return { sets, problem: null };
  };

  const check = winner === null ? { sets: [], problem: 'Tap who won.' } : built();
  const canSave = !pending && winner !== null && check.problem === null;

  const run = (what: string, fn: () => Promise<ActionResult>, after?: () => void) => {
    onNotice({ tone: 'working', title: `${what}…` });
    start(async () => {
      const r = await fn();
      if (r.ok) {
        onNotice({ tone: 'done', title: `${names}: ${what === 'Saving' ? 'saved' : what === 'Removing' ? 'removed' : 'done'}`, detail: r.message });
        notify(what === 'Saving' ? 'Result saved' : what === 'Removing' ? 'Match removed' : 'Votes counted');
        after?.();
      } else {
        onNotice({ tone: 'problem', title: `${names}: it didn’t work`, detail: r.message });
      }
    });
  };

  const save = () => {
    if (winner === null) return;
    run('Saving', () => saveResult({ matchId: item.match_id, winnerSide: winner, sets: check.sets, retired, walkover }));
  };

  const header = (
    <>
      <div style={{ ...wrapRow, justifyContent: 'space-between' }}>
        <span style={ui.muted}>
          {when(item.starts_at)} · {place}
        </span>
        <span style={ui.muted}>{plural(item.votes, 'vote')}</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{names}</div>
    </>
  );

  if (item.result || item.status === 'void') {
    return (
      <div style={{ ...ui.card, ...stack(10) }}>
        {header}
        {item.result ? (
          <div style={wrapRow}>
            <span style={{ fontWeight: 700 }}>
              {sideName(item, item.result.winner_side)} won ·{' '}
              {item.result.walkover ? 'walkover' : item.result.sets.map((s) => `${s.w}–${s.l}`).join(', ')}
              {item.result.retired ? ' (retired)' : ''}
            </span>
            {admin && item.votes > item.votes_resolved ? (
              <button style={ui.secondary} disabled={pending} onClick={() => run('Counting votes', () => resolveNow(item.match_id))}>
                Count the votes now
              </button>
            ) : null}
          </div>
        ) : (
          <span style={ui.muted}>This match was removed.</span>
        )}
      </div>
    );
  }

  return (
    <div style={{ ...ui.card, ...stack(12) }}>
      {header}
      <strong style={{ fontSize: 15 }}>Who won?</strong>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {([1, 2] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => setWinner(s)}
            aria-pressed={winner === s}
            style={{ ...ui.secondary, minHeight: 56, fontSize: 16, background: winner === s ? colors.ink : 'transparent', color: winner === s ? colors.paper : colors.ink }}
          >
            {winner === s ? '✓ ' : ''}
            {sideName(item, s)}
          </button>
        ))}
      </div>

      {winner !== null && !walkover ? (
        <div style={stack(8)}>
          <span style={ui.muted}>
            Games in each set, {sideName(item, winner)} first.
          </span>
          {[0, 1, 2].map((r) => (
            <div key={r} style={wrapRow}>
              <span style={{ ...ui.muted, width: 92 }}>{r === 2 ? (tiebreak ? 'Tie-break' : 'Set 3 (if played)') : `Set ${r + 1}`}</span>
              <input style={{ ...ui.input, width: 64, textAlign: 'center' }} inputMode="numeric" value={games[r]![0]} onChange={(e) => setGame(r, 0, e.target.value)} aria-label={`Set ${r + 1}, ${sideName(item, winner)}`} />
              <span>–</span>
              <input style={{ ...ui.input, width: 64, textAlign: 'center' }} inputMode="numeric" value={games[r]![1]} onChange={(e) => setGame(r, 1, e.target.value)} aria-label={`Set ${r + 1}, other side`} />
            </div>
          ))}
          <label style={{ ...wrapRow, fontSize: 14, fontWeight: 600 }}>
            <input type="checkbox" checked={tiebreak} onChange={(e) => setTiebreak(e.target.checked)} />
            The third set was a match tie-break (first to 10)
          </label>
        </div>
      ) : null}

      <div style={wrapRow}>
        <label style={{ ...wrapRow, fontSize: 14, fontWeight: 600 }}>
          <input type="checkbox" checked={retired} disabled={walkover} onChange={(e) => setRetired(e.target.checked)} />
          Retired
        </label>
        <label style={{ ...wrapRow, fontSize: 14, fontWeight: 600 }}>
          <input type="checkbox" checked={walkover} onChange={(e) => { setWalkover(e.target.checked); if (e.target.checked) setRetired(false); }} />
          Walkover
        </label>
      </div>

      {winner !== null && check.problem ? <p style={{ ...ui.muted, margin: 0 }}>{check.problem}</p> : null}

      <div style={wrapRow}>
        <button style={ui.primary} disabled={!canSave} onClick={save}>
          {pending ? 'Saving…' : 'Save result'}
        </button>
        {confirmGone ? (
          <span style={wrapRow}>
            <strong style={{ fontSize: 14 }}>Remove this match? Votes on it are cancelled.</strong>
            <button
              style={ui.secondary}
              disabled={pending}
              onClick={() => run('Removing', () => voidMatch(item.match_id), () => setConfirmGone(false))}
            >
              Yes, remove it
            </button>
            <button style={ui.link} onClick={() => setConfirmGone(false)}>
              Keep it
            </button>
          </span>
        ) : (
          <button style={ui.link} disabled={pending} onClick={() => setConfirmGone(true)}>
            It didn’t happen
          </button>
        )}
      </div>
    </div>
  );
}
