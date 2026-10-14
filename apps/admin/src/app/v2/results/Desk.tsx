'use client';
import { useState, useTransition } from 'react';
import { isValidMatchTiebreak, isValidTennisSet } from '@netprophet/core';
import type { FeedPlayer, SetScore, Side } from '@netprophet/db';
import { Banner, Toast, useToast, type Tone } from '../feedback';
import { Badge, Card, Empty, Ghost, PageHeader, Pager, Secondary, Section, Stats, Tabs, usePages } from '../kit';
import { keepPostponed, resolveNow, saveResult, voidMatch, type ActionResult } from './actions';

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
  /** put off (rain or a moved day), and by whom: the 15:00 rule ('auto') or staff */
  postponed?: boolean;
  postponed_by?: 'auto' | 'staff' | null;
  /** a sheet match with no result two days on: a person decides (founder, 14 Oct) */
  overdue?: boolean;
}

type Notice = { tone: Tone; title: string; detail?: string };

const ROUNDS: Record<string, string> = {
  round64: 'Round of 64', round32: 'Round of 32', round16: 'Round of 16', quarter: 'Quarter-final', semi: 'Semi-final', final: 'Final',
};
const FORMATS: Record<DeskItem['format'], string> = { singles: 'Singles', doubles: 'Doubles', mixed: 'Mixed doubles' };

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

type Tab = 'you' | 'sheets' | 'done';

export function Desk({ items, admin }: { items: DeskItem[]; admin: boolean }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const { toast, notify } = useToast();

  const waiting = items.filter((i) => i.bucket_name === 'to_score');
  // sheet matches still empty two days on come to you; staff-postponed ones wait for the sheet's new day
  const fromSheets = waiting.filter((i) => i.tournament && !i.overdue && i.postponed_by !== 'staff');
  const fromYou = waiting.filter((i) => !i.tournament || i.overdue);
  const done = items.filter((i) => i.bucket_name === 'done');
  const [tab, setTab] = useState<Tab>(fromYou.length > 0 || fromSheets.length === 0 ? 'you' : 'sheets');
  const list = tab === 'you' ? fromYou : tab === 'sheets' ? fromSheets : done;
  const p = usePages(list, 8);

  return (
    <>
      <PageHeader
        title="Results"
        intent={
          fromYou.length > 0
            ? `${plural(fromYou.length, 'match', 'matches')} started and ${fromYou.length === 1 ? 'needs' : 'need'} a result from you.`
            : 'All clear. Nothing needs a result from you right now.'
        }
      />
      <Stats
        items={[
          { label: 'need a result from you', value: fromYou.length, ink: true },
          { label: 'waiting on tournament sheets', value: fromSheets.length },
          { label: 'finished this week', value: done.length },
        ]}
      />
      {notice ? <Banner {...notice} /> : null}
      <Section
        title={tab === 'you' ? 'Need a result from you' : tab === 'sheets' ? 'From tournament sheets' : 'Finished this week'}
        aside={
          <Tabs
            value={tab}
            onChange={(t) => {
              setTab(t);
              p.setPage(0);
            }}
            items={[
              { value: 'you', label: 'Need you', count: fromYou.length },
              { value: 'sheets', label: 'From sheets', count: fromSheets.length },
              { value: 'done', label: 'Finished', count: done.length },
            ]}
          />
        }
      >
        <span className="v2-muted">
          {tab === 'you'
            ? 'Friendly matches, and sheet matches that still have no result 2 days on. Pick who won, then the score, or say what happened.'
            : tab === 'sheets'
              ? 'These fill in by themselves when the organiser’s sheet has the score. Enter one only if the sheet never will.'
              : 'Results from the last 7 days. Count the votes now if a result came in and votes are still open.'}
        </span>
        {list.length === 0 ? (
          <Card>
            <Empty title="All clear">Nothing waiting here.</Empty>
          </Card>
        ) : (
          <div className="v2-stack" style={{ gap: 12 }}>
            {p.slice.map((item) => (
              <Row key={item.match_id} item={item} admin={admin} onNotice={setNotice} notify={notify} />
            ))}
            <div className="v2-table-wrap">
              <Pager p={p as ReturnType<typeof usePages<unknown>>} noun="matches" />
            </div>
          </div>
        )}
      </Section>
      <Toast text={toast} />
    </>
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
        onNotice({ tone: 'done', title: `${names}: ${what === 'Saving' ? 'saved' : what === 'Removing' ? 'removed' : what === 'Keeping' ? 'kept as rained off' : 'done'}`, detail: r.message });
        notify(what === 'Saving' ? 'Result saved' : what === 'Removing' ? 'Match removed' : what === 'Keeping' ? 'Kept as rained off' : 'Votes counted');
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
      <div className="v2-row between">
        <span className="v2-muted">
          {when(item.starts_at)} · {place}
        </span>
        <span className="v2-row" style={{ gap: 6 }}>
          {item.overdue ? <Badge tone="attention">No result for 2 days</Badge> : null}
          {item.postponed_by === 'auto' ? <Badge tone="ink">Rained off by the 15:00 rule</Badge> : null}
          <Badge>{plural(item.votes, 'vote')}</Badge>
        </span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{names}</div>
    </>
  );

  if (item.result || item.status === 'void') {
    return (
      <div className={`v2-card tight v2-enter${pending ? ' busy' : ''}`}>
        {header}
        {item.result ? (
          <div className="v2-row between">
            <span style={{ fontWeight: 700 }}>
              {sideName(item, item.result.winner_side)} won ·{' '}
              {item.result.walkover ? 'walkover' : item.result.sets.map((s) => `${s.w}–${s.l}`).join(', ')}
              {item.result.retired ? ' (retired)' : ''}
            </span>
            {admin && item.votes > item.votes_resolved ? (
              <Secondary small busy={pending} onClick={() => run('Counting votes', () => resolveNow(item.match_id))}>
                {pending ? 'Counting…' : 'Count the votes now'}
              </Secondary>
            ) : null}
          </div>
        ) : (
          <span className="v2-muted">This match was removed.</span>
        )}
      </div>
    );
  }

  return (
    <div className={`v2-card v2-enter${pending ? ' busy' : ''}`} aria-busy={pending || undefined}>
      {header}
      <b>Who won?</b>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {([1, 2] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => setWinner(s)}
            aria-pressed={winner === s}
            className="v2-btn secondary"
            style={{ minHeight: 56, fontSize: 16, background: winner === s ? 'var(--np-ink)' : undefined, color: winner === s ? 'var(--np-paper)' : undefined }}
          >
            {winner === s ? '✓ ' : ''}
            {sideName(item, s)}
          </button>
        ))}
      </div>

      {winner !== null && !walkover ? (
        <div className="v2-stack">
          <span className="v2-muted">
            Games in each set, {sideName(item, winner)} first.
          </span>
          {[0, 1, 2].map((r) => (
            <div key={r} className="v2-row">
              <span className="v2-muted" style={{ width: 120 }}>{r === 2 ? (tiebreak ? 'Tie-break' : 'Set 3 (if played)') : `Set ${r + 1}`}</span>
              <input className="v2-input" style={{ width: 64, textAlign: 'center' }} inputMode="numeric" value={games[r]![0]} onChange={(e) => setGame(r, 0, e.target.value)} aria-label={`Set ${r + 1}, ${sideName(item, winner)}`} />
              <span>–</span>
              <input className="v2-input" style={{ width: 64, textAlign: 'center' }} inputMode="numeric" value={games[r]![1]} onChange={(e) => setGame(r, 1, e.target.value)} aria-label={`Set ${r + 1}, other side`} />
            </div>
          ))}
          <label className="v2-choice">
            <input type="checkbox" checked={tiebreak} onChange={(e) => setTiebreak(e.target.checked)} />
            The third set was a match tie-break (first to 10)
          </label>
        </div>
      ) : null}

      <div className="v2-row">
        <label className="v2-choice">
          <input type="checkbox" checked={retired} disabled={walkover} onChange={(e) => setRetired(e.target.checked)} />
          Retired
        </label>
        <label className="v2-choice">
          <input type="checkbox" checked={walkover} onChange={(e) => { setWalkover(e.target.checked); if (e.target.checked) setRetired(false); }} />
          Walkover
        </label>
      </div>

      {winner !== null && check.problem ? <span className="v2-muted">{check.problem}</span> : null}

      <div className="v2-row">
        <Secondary busy={pending} disabled={!canSave} onClick={save}>
          {pending ? 'Saving…' : 'Save result'}
        </Secondary>
        {confirmGone ? (
          <span className="v2-confirm" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <b style={{ fontSize: 14 }}>Remove this match? Votes on it are cancelled.</b>
            <Secondary small busy={pending} onClick={() => run('Removing', () => voidMatch(item.match_id), () => setConfirmGone(false))}>
              {pending ? 'Removing…' : 'Yes, remove it'}
            </Secondary>
            <Ghost disabled={pending} onClick={() => setConfirmGone(false)}>
              Keep it
            </Ghost>
          </span>
        ) : (
          <Ghost disabled={pending} onClick={() => setConfirmGone(true)}>
            It didn’t happen
          </Ghost>
        )}
        {item.tournament ? (
          <Ghost disabled={pending} onClick={() => run('Keeping', () => keepPostponed(item.match_id))}>
            Rained off, keep it
          </Ghost>
        ) : null}
      </div>
    </div>
  );
}
