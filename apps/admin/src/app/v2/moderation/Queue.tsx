'use client';
import { useEffect, useState, useTransition } from 'react';
import type { FeedPlayer, Side } from '@netprophet/db';
import { colors, ui } from '../ui';
import { approvePlayer, linkSuggestion, mergePlayer, resolveDispute, searchPlayers, type ActionResult, type FoundPlayer } from './actions';

export interface Dispute {
  match_id: string;
  format: 'singles' | 'doubles' | 'mixed';
  starts_at: string;
  tournament: string | null;
  sides: { side: Side; players: FeedPlayer[] }[];
  winner_side: Side;
  score: string | null;
  reason: 'not_me' | 'other_winner' | null;
  logged_by: { first_name: string | null; surname: string | null } | null;
  answers: { player: string; side: Side; state: string; via: string | null; fix: { winner: 'me' | 'them'; sets: string } | null }[];
  votes: number;
}

export interface PendingPlayer {
  player_id: string;
  first_name: string;
  surname: string;
  source: string;
  created_at: string;
  claimed: boolean;
  matches: number;
  similar: { player_id: string; name: string; claimed: boolean }[];
}

export interface Moderation {
  disputes: Dispute[];
  players: PendingPlayer[];
  tournaments: { text: string; matches: number; last: string }[];
}

export interface TournamentOption {
  id: string;
  name: string;
}

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(iso));

const sideName = (d: Dispute, side: Side) =>
  (d.sides.find((s) => s.side === side)?.players ?? []).map((p) => `${p.first_name} ${p.surname}`).join(' / ') || `Side ${side}`;

/**
 * The moderation queue. Player-logged matches and names are live at once; this is where staff review them:
 * disputes (keep, turn round, void), new players (approve, fix the spelling, merge into the roster player),
 * tournament names typed under «Άλλο» (link to a tournament or keep as friendlies).
 */
export function Queue({ data, tournaments }: { data: Moderation; tournaments: TournamentOption[] }) {
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
      <Section title="Disputed matches" hint="The other side said it went differently. Votes were paid, then taken back." n={data.disputes.length}>
        {data.disputes.map((d) => (
          <DisputeRow key={d.match_id} d={d} onNotice={setNotice} />
        ))}
      </Section>
      <Section title="New players" hint="Names typed in «+ Ματς». They already show by name; approve them or merge a typo into the roster player." n={data.players.length}>
        {data.players.map((p) => (
          <PlayerRow key={p.player_id} p={p} onNotice={setNotice} />
        ))}
      </Section>
      <Section title="Tournament names" hint="Typed under «Άλλο». Link them to a tournament, or keep the matches as friendlies." n={data.tournaments.length}>
        {data.tournaments.map((t) => (
          <SuggestionRow key={t.text} s={t} tournaments={tournaments} onNotice={setNotice} />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, hint, n, children }: { title: string; hint: string; n: number; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <h2 style={{ ...ui.h1, fontSize: 22 }}>
          {title} <span style={{ ...ui.muted, fontSize: 16 }}>{n}</span>
        </h2>
        <p style={{ ...ui.muted, margin: 0 }}>{hint}</p>
      </div>
      {n === 0 ? <p style={ui.muted}>Nothing here.</p> : children}
    </section>
  );
}

type Notice = (n: ActionResult & { what: string }) => void;

function DisputeRow({ d, onNotice }: { d: Dispute; onNotice: Notice }) {
  const [pending, start] = useTransition();
  const logger = [d.logged_by?.first_name, d.logged_by?.surname].filter(Boolean).join(' ') || 'Someone';
  const run = (decision: 'keep' | 'flip' | 'void') =>
    start(async () => onNotice({ ...(await resolveDispute(d.match_id, decision)), what: `${sideName(d, 1)} vs ${sideName(d, 2)}:` }));
  const other: Side = d.winner_side === 1 ? 2 : 1;
  return (
    <div style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={ui.muted}>
        {when(d.starts_at)} · {d.tournament ?? 'Friendly'} · {d.format} · {d.votes} votes
      </span>
      <div style={{ fontSize: 16 }}>
        <strong>{logger}</strong> logged: <strong>{sideName(d, d.winner_side)}</strong> beat {sideName(d, other)} {d.score ?? ''}
      </div>
      {d.answers
        .filter((a) => a.state !== 'pending')
        .map((a) => (
          <div key={a.player} style={{ fontSize: 15 }}>
            <strong>{a.player}</strong>
            {a.state === 'not_me'
              ? ' says they did not play this.'
              : a.fix
                ? ` says ${a.fix.winner === 'me' ? 'they' : 'the other side'} won ${a.fix.sets}.`
                : ` answered: ${a.state}.`}
            {a.via ? <span style={ui.muted}> ({a.via})</span> : null}
          </div>
        ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={ui.secondary} disabled={pending} onClick={() => run('keep')}>
          Keep as logged
        </button>
        <button style={ui.secondary} disabled={pending} onClick={() => run('flip')}>
          {sideName(d, other)} won
        </button>
        <button style={ui.secondary} disabled={pending} onClick={() => run('void')}>
          Void
        </button>
      </div>
    </div>
  );
}

function PlayerRow({ p, onNotice }: { p: PendingPlayer; onNotice: Notice }) {
  const [first, setFirst] = useState(p.first_name);
  const [surname, setSurname] = useState(p.surname);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<FoundPlayer[]>([]);
  const [pending, start] = useTransition();
  useEffect(() => {
    const id = setTimeout(() => {
      void searchPlayers(q).then(setFound).catch(() => setFound([]));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);
  const what = `${p.first_name} ${p.surname}:`;
  const merge = (target: string) => start(async () => onNotice({ ...(await mergePlayer(p.player_id, target)), what }));
  const targets: { id: string; name: string; note: string }[] = [
    ...p.similar.map((s) => ({ id: s.player_id, name: s.name, note: s.claimed ? 'has an account' : 'looks similar' })),
    ...found.filter((f) => !p.similar.some((s) => s.player_id === f.id)).map((f) => ({ id: f.id, name: f.name, note: f.sub })),
  ];
  return (
    <div style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={ui.muted}>
        Added {when(p.created_at)} · {p.matches} match{p.matches === 1 ? '' : 'es'}
        {p.claimed ? ' · has an account' : ''}
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={{ ...ui.input, width: 180 }} value={first} onChange={(e) => setFirst(e.target.value)} aria-label="First name" />
        <input style={{ ...ui.input, width: 220 }} value={surname} onChange={(e) => setSurname(e.target.value)} aria-label="Surname" />
        <button style={ui.primary} disabled={pending} onClick={() => start(async () => onNotice({ ...(await approvePlayer(p.player_id, first, surname)), what }))}>
          Approve
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Or merge into a roster player</span>
        <input style={ui.input} placeholder="Search the roster" value={q} onChange={(e) => setQ(e.target.value)} />
        {targets.map((t) => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>
              {t.name} <span style={ui.muted}>{t.note}</span>
            </span>
            <button style={ui.secondary} disabled={pending} onClick={() => merge(t.id)}>
              Merge into
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionRow({ s, tournaments, onNotice }: { s: Moderation['tournaments'][number]; tournaments: TournamentOption[]; onNotice: Notice }) {
  const [pick, setPick] = useState('');
  const [pending, start] = useTransition();
  const run = (id: string | null) => start(async () => onNotice({ ...(await linkSuggestion(s.text, id)), what: `«${s.text}»:` }));
  return (
    <div style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 17, fontWeight: 700 }}>
        «{s.text}» <span style={ui.muted}>
          {s.matches} match{s.matches === 1 ? '' : 'es'} · last {when(s.last)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={{ ...ui.input, width: 320 }} value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Tournament">
          <option value="">Choose a tournament</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button style={ui.primary} disabled={pending || !pick} onClick={() => run(pick)}>
          Link
        </button>
        <button style={ui.secondary} disabled={pending} onClick={() => run(null)}>
          Keep as friendlies
        </button>
      </div>
      <p style={{ ...ui.muted, margin: 0 }}>Not in the list? Add it on the Import page first.</p>
    </div>
  );
}
