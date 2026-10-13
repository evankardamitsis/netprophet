'use client';
import { useEffect, useState, useTransition, type CSSProperties, type ReactNode } from 'react';
import type { FeedPlayer, Side } from '@netprophet/db';
import { ui } from '../ui';
import { Banner, Toast, useToast, type Tone } from '../feedback';
import { approvePlayer, closeReport, decideTrait, linkSuggestion, mergePlayer, resolveDispute, searchPlayers, type ActionResult, type FoundPlayer } from './actions';

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

export interface Report {
  id: string;
  entity_type: 'match' | 'player';
  entity_id: string;
  reason: 'wrong_result' | 'never_played' | 'offensive' | 'fake' | 'other';
  note: string | null;
  created_at: string;
  reporter: string | null;
  what: { name?: string; hidden: boolean; sides?: { side: Side; players: FeedPlayer[] }[]; starts_at?: string; source?: string } | null;
  /** open reports on the same thing */
  reports: number;
}

export interface PendingTrait {
  id: string;
  label_el: { m: string; f: string };
  label_en: string;
  created_at: string;
  /** who added it */
  by: string | null;
  /** the player it was first said about */
  player: string | null;
  votes: number;
}

export interface Moderation {
  reports: Report[];
  disputes: Dispute[];
  players: PendingPlayer[];
  tournaments: { text: string; matches: number; last: string }[];
  traits: PendingTrait[];
}

export interface TournamentOption {
  id: string;
  name: string;
}

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)).replace(',', '');

const stack = (gap: number): CSSProperties => ({ display: 'flex', flexDirection: 'column', gap });
const wrapRow: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const FORMATS = { singles: 'Singles', doubles: 'Doubles', mixed: 'Mixed doubles' } as const;

const sideName = (d: Dispute, side: Side) =>
  (d.sides.find((s) => s.side === side)?.players ?? []).map((p) => `${p.first_name} ${p.surname}`).join(' / ') || 'Unknown';

type Notice = { tone: Tone; title: string; detail?: string };
/** run an action with the working / done / problem banner and a toast */
type Run = (what: string, fn: () => Promise<ActionResult>, toast: string) => void;

/**
 * The moderation queue: things only a person can decide. Each item is a question with plain buttons.
 * Player-logged matches and names are live at once; this is where staff review them.
 */
export function Queue({ data, tournaments }: { data: Moderation; tournaments: TournamentOption[] }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const { toast, notify } = useToast();
  const [, start] = useTransition();
  const run: Run = (what, fn, toastText) => {
    setNotice({ tone: 'working', title: `${what}…` });
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setNotice({ tone: 'done', title: what, detail: r.message });
        notify(toastText);
      } else {
        setNotice({ tone: 'problem', title: `${what}: it didn’t work`, detail: r.message });
      }
    });
  };
  const traits = data.traits ?? [];
  const total = data.reports.length + data.disputes.length + data.players.length + traits.length + data.tournaments.length;

  return (
    <div style={stack(28)}>
      <div>
        <h1 style={ui.h1}>Moderation</h1>
        <p style={ui.muted}>
          {total === 0
            ? 'All clear. Nothing waiting for you.'
            : `${plural(total, 'thing')} ${total === 1 ? 'is' : 'are'} waiting for your decision. Nothing here blocks the app; it all keeps working until you decide.`}
        </p>
      </div>
      {notice ? <Banner {...notice} /> : null}
      <Section title="Reports from users" hint="Someone flagged a match or a player. Hiding takes it out of the app for everyone." n={data.reports.length}>
        {data.reports.map((r) => (
          <ReportRow key={r.id} r={r} run={run} />
        ))}
      </Section>
      <Section title="Results people disagree on" hint="The two players disagree about the result. Decide which one stands." n={data.disputes.length}>
        {data.disputes.map((d) => (
          <DisputeRow key={d.match_id} d={d} run={run} />
        ))}
      </Section>
      <Section title="New players" hint="Players that users added by typing a name. They already show in the app; check the spelling, or join them to a player we already have." n={data.players.length}>
        {data.players.map((p) => (
          <PlayerRow key={p.player_id} p={p} run={run} />
        ))}
      </Section>
      <Section title="Phrases for «Πώς παίζει»" hint="Phrases users suggested to describe how someone plays. Fix the wording, then approve it to show it to everyone." n={traits.length}>
        {traits.map((t) => (
          <TraitRow key={t.id} t={t} run={run} />
        ))}
      </Section>
      <Section title="Tournament names users typed" hint="Typed under «Άλλο». Say which tournament it is, or keep those matches as friendlies." n={data.tournaments.length}>
        {data.tournaments.map((t) => (
          <SuggestionRow key={t.text} s={t} tournaments={tournaments} run={run} />
        ))}
      </Section>
      <Toast text={toast} />
    </div>
  );
}

function Section({ title, hint, n, children }: { title: string; hint: string; n: number; children: ReactNode }) {
  return (
    <section style={stack(10)}>
      <div>
        <strong style={{ fontSize: 20 }}>
          {title} <span style={{ ...ui.muted, fontSize: 16 }}>{n}</span>
        </strong>
        <p style={{ ...ui.muted, margin: 0 }}>{hint}</p>
      </div>
      {n === 0 ? <p style={ui.muted}>All clear. Nothing waiting.</p> : children}
    </section>
  );
}

/** a destructive button that asks first, in the page */
function Confirm({ label, question, yes, disabled, onYes }: { label: string; question: string; yes: string; disabled?: boolean; onYes: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button style={ui.secondary} disabled={disabled} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  return (
    <span style={wrapRow}>
      <strong style={{ fontSize: 14 }}>{question}</strong>
      <button
        style={ui.secondary}
        disabled={disabled}
        onClick={() => {
          setAsking(false);
          onYes();
        }}
      >
        {yes}
      </button>
      <button style={ui.link} onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  );
}

function DisputeRow({ d, run }: { d: Dispute; run: Run }) {
  const logger = [d.logged_by?.first_name, d.logged_by?.surname].filter(Boolean).join(' ') || 'Someone';
  const other: Side = d.winner_side === 1 ? 2 : 1;
  const names = `${sideName(d, 1)} vs ${sideName(d, 2)}`;
  const go = (decision: 'keep' | 'flip' | 'void', toast: string) => run(`${names}`, () => resolveDispute(d.match_id, decision), toast);
  return (
    <div style={{ ...ui.card, ...stack(10) }}>
      <span style={ui.muted}>
        {when(d.starts_at)} · {d.tournament ?? 'Friendly'} · {FORMATS[d.format]} · {plural(d.votes, 'vote')}
      </span>
      <div style={{ fontSize: 16 }}>
        <strong>{logger}</strong> logged that <strong>{sideName(d, d.winner_side)}</strong> beat {sideName(d, other)}
        {d.score ? ` ${d.score}` : ''}. Which result is right?
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
                : ' disagrees.'}
          </div>
        ))}
      <div style={wrapRow}>
        <button style={ui.primary} onClick={() => go('keep', 'Kept as logged')}>
          Keep the logged result
        </button>
        <button style={ui.secondary} onClick={() => go('flip', 'Result turned round')}>
          {sideName(d, other)} won
        </button>
        <Confirm label="It didn’t happen" question="Remove this match? Votes on it are cancelled." yes="Yes, remove it" onYes={() => go('void', 'Match removed')} />
      </div>
    </div>
  );
}

const REASONS: Record<Report['reason'], string> = {
  wrong_result: 'Says the result is wrong',
  never_played: 'Says it never happened',
  offensive: 'Says it is offensive',
  fake: 'Says it is a fake profile',
  other: 'Reported for another reason',
};

function ReportRow({ r, run }: { r: Report; run: Run }) {
  const subject =
    r.entity_type === 'player'
      ? r.what?.name ?? 'A removed player'
      : `${(r.what?.sides ?? []).map((s) => s.players.map((p) => `${p.first_name} ${p.surname}`).join(' / ')).join(' vs ')}${
          r.what?.starts_at ? ` (${when(r.what.starts_at)})` : ''
        }`;
  const kind = r.entity_type === 'player' ? 'player' : 'match';
  return (
    <div style={{ ...ui.card, ...stack(8) }}>
      <span style={ui.muted}>
        {when(r.created_at)} · from {r.reporter ?? 'someone'}
        {r.reports > 1 ? ` · ${r.reports} people reported this` : ''}
        {r.what?.hidden ? ' · already hidden' : ''}
      </span>
      <div style={{ fontSize: 16, fontWeight: 700 }}>
        {kind === 'player' ? 'Player' : 'Match'}: {subject}
      </div>
      <div>
        {REASONS[r.reason]}
        {r.note ? <span>: «{r.note}»</span> : null}
      </div>
      <strong style={{ fontSize: 14 }}>Should this {kind} be hidden from the app?</strong>
      <div style={wrapRow}>
        <button style={ui.primary} onClick={() => run(`${subject}`, () => closeReport(r.id, false), 'Left as it is')}>
          No, leave it
        </button>
        <Confirm
          label={`Hide this ${kind}`}
          question={`Hide this ${kind} from everyone?`}
          yes="Yes, hide it"
          onYes={() => run(`${subject}`, () => closeReport(r.id, true), 'Hidden')}
        />
      </div>
    </div>
  );
}

function PlayerRow({ p, run }: { p: PendingPlayer; run: Run }) {
  const [first, setFirst] = useState(p.first_name);
  const [surname, setSurname] = useState(p.surname);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<FoundPlayer[]>([]);
  const [joinTo, setJoinTo] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      void searchPlayers(q).then(setFound).catch(() => setFound([]));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);
  const what = `${p.first_name} ${p.surname}`;
  const targets: { id: string; name: string; note: string }[] = [
    ...p.similar.map((s) => ({ id: s.player_id, name: s.name, note: s.claimed ? 'has an account' : 'looks like the same person' })),
    ...found.filter((f) => !p.similar.some((s) => s.player_id === f.id)).map((f) => ({ id: f.id, name: f.name, note: '' })),
  ];
  return (
    <div style={{ ...ui.card, ...stack(10) }}>
      <span style={ui.muted}>
        Added {when(p.created_at)} · {plural(p.matches, 'match', 'matches')}
        {p.claimed ? ' · has an account' : ''}
      </span>
      <strong style={{ fontSize: 16 }}>Is “{what}” spelled right?</strong>
      <div style={wrapRow}>
        <input style={{ ...ui.input, width: 180 }} value={first} onChange={(e) => setFirst(e.target.value)} aria-label="First name" />
        <input style={{ ...ui.input, width: 220 }} value={surname} onChange={(e) => setSurname(e.target.value)} aria-label="Surname" />
        <button style={ui.primary} onClick={() => run(what, () => approvePlayer(p.player_id, first, surname), 'Player approved')}>
          Yes, approve
        </button>
      </div>
      <div style={stack(6)}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Or is this someone we already have? Find them to join the two.</span>
        <input style={ui.input} placeholder="Search players" value={q} onChange={(e) => setQ(e.target.value)} />
        {targets.map((t) => (
          <div key={t.id} style={{ ...wrapRow, justifyContent: 'space-between' }}>
            <span>
              {t.name} {t.note ? <span style={ui.muted}>{t.note}</span> : null}
            </span>
            {joinTo === t.id ? (
              <span style={wrapRow}>
                <strong style={{ fontSize: 14 }}>Join “{what}” into {t.name}?</strong>
                <button
                  style={ui.secondary}
                  onClick={() => {
                    setJoinTo(null);
                    run(what, () => mergePlayer(p.player_id, t.id), 'Players joined');
                  }}
                >
                  Yes, join them
                </button>
                <button style={ui.link} onClick={() => setJoinTo(null)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button style={ui.secondary} onClick={() => setJoinTo(t.id)}>
                Same person
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionRow({ s, tournaments, run }: { s: Moderation['tournaments'][number]; tournaments: TournamentOption[]; run: Run }) {
  const [pick, setPick] = useState('');
  return (
    <div style={{ ...ui.card, ...stack(10) }}>
      <div style={{ fontSize: 17, fontWeight: 700 }}>
        Which tournament is «{s.text}»?{' '}
        <span style={ui.muted}>
          {plural(s.matches, 'match', 'matches')} · last {when(s.last)}
        </span>
      </div>
      <div style={wrapRow}>
        <select style={{ ...ui.input, width: 320 }} value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Tournament">
          <option value="">Choose a tournament</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button style={ui.primary} disabled={!pick} onClick={() => run(`«${s.text}»`, () => linkSuggestion(s.text, pick), 'Matches linked')}>
          Link them
        </button>
        <button style={ui.secondary} onClick={() => run(`«${s.text}»`, () => linkSuggestion(s.text, null), 'Kept as friendlies')}>
          They are friendlies
        </button>
      </div>
      <p style={{ ...ui.muted, margin: 0 }}>Not in the list? Add the tournament on the Tournaments page first.</p>
    </div>
  );
}

function TraitRow({ t, run }: { t: PendingTrait; run: Run }) {
  const [m, setM] = useState(t.label_el.m);
  const [f, setF] = useState(t.label_el.f);
  const [en, setEn] = useState(t.label_en);
  const what = `«${t.label_el.m}»`;
  return (
    <div style={{ ...ui.card, ...stack(10) }}>
      <span style={ui.muted}>
        Suggested {when(t.created_at)} by {t.by ?? 'someone'}
        {t.player ? ` about ${t.player}` : ''} · {plural(t.votes, 'vote')}
      </span>
      <strong style={{ fontSize: 16 }}>Show this phrase to everyone?</strong>
      <div style={wrapRow}>
        <label style={{ ...ui.muted, fontWeight: 700, ...stack(4) }}>
          For a man
          <input style={{ ...ui.input, width: 240 }} value={m} onChange={(e) => setM(e.target.value)} />
        </label>
        <label style={{ ...ui.muted, fontWeight: 700, ...stack(4) }}>
          For a woman
          <input style={{ ...ui.input, width: 240 }} value={f} onChange={(e) => setF(e.target.value)} />
        </label>
        <label style={{ ...ui.muted, fontWeight: 700, ...stack(4) }}>
          In English
          <input style={{ ...ui.input, width: 240 }} value={en} onChange={(e) => setEn(e.target.value)} />
        </label>
      </div>
      <div style={wrapRow}>
        <button style={ui.primary} disabled={!m.trim()} onClick={() => run(what, () => decideTrait(t.id, true, { m, f, en }), 'Phrase approved')}>
          Yes, approve
        </button>
        <Confirm
          label="No, throw it away"
          question="Throw this phrase away? The votes on it go too."
          yes="Yes, throw it away"
          onYes={() => run(what, () => decideTrait(t.id, false), 'Phrase dropped')}
        />
      </div>
    </div>
  );
}
