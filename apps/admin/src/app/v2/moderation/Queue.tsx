'use client';
import { useEffect, useState, useTransition, type ReactNode } from 'react';
import type { FeedPlayer, Side } from '@netprophet/db';
import { Banner, Toast, useToast, type Tone } from '../feedback';
import { Badge, Card, Empty, Ghost, PageHeader, Pager, Secondary, Section, Stats, Tabs, usePages } from '../kit';
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

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const FORMATS = { singles: 'Singles', doubles: 'Doubles', mixed: 'Mixed doubles' } as const;
/** cards per page: each one is a small form */
const PAGE = 10;

const sideName = (d: Dispute, side: Side) =>
  (d.sides.find((s) => s.side === side)?.players ?? []).map((p) => `${p.first_name} ${p.surname}`).join(' / ') || 'Unknown';

type Notice = { tone: Tone; title: string; detail?: string };
type Cues = { onNotice: (n: Notice) => void; notify: (t: string) => void };

/**
 * One item's action with every cue: the pressed button spins (`busy === key`), the card gets a moving bar (`pending`),
 * the page shows a working banner, then a done or problem banner and a toast. After a success the card fades
 * (`gone`) while the queue reloads without it.
 */
function useItemAction({ onNotice, notify }: Cues) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const run = (key: string, subject: string, working: string, fn: () => Promise<ActionResult>, toast: string) => {
    setBusy(key);
    onNotice({ tone: 'working', title: `${working} ${subject}…` });
    start(async () => {
      const r = await fn();
      setBusy(null);
      if (r.ok) {
        setGone(true);
        onNotice({ tone: 'done', title: `${subject}: ${toast.toLowerCase()}`, detail: r.message });
        notify(toast);
      } else {
        onNotice({ tone: 'problem', title: `${subject}: it didn’t work`, detail: r.message });
      }
    });
  };
  const cardClass = (extra = '') => ['v2-card', extra, 'v2-enter', pending ? 'busy' : '', gone && !pending ? 'leaving' : ''].filter(Boolean).join(' ');
  return { pending, busy, run, cardClass };
}

type Tab = 'reports' | 'disputes' | 'players' | 'traits' | 'tournaments';

const SECTIONS: Record<Tab, { label: string; title: string; hint: string; noun: string }> = {
  reports: {
    label: 'Reports',
    title: 'Reports from users',
    hint: 'Someone flagged a match or a player. Hiding takes it out of the app for everyone.',
    noun: 'reports',
  },
  disputes: {
    label: 'Disputes',
    title: 'Results people disagree on',
    hint: 'The two players disagree about the result. Decide which one stands.',
    noun: 'disputes',
  },
  players: {
    label: 'New players',
    title: 'New players',
    hint: 'Players that users added by typing a name. They already show in the app; check the spelling, or join them to a player we already have.',
    noun: 'players',
  },
  traits: {
    label: 'Phrases',
    title: 'Phrases for «Πώς παίζει»',
    hint: 'Phrases users suggested to describe how someone plays. Fix the wording, then approve it to show it to everyone.',
    noun: 'phrases',
  },
  tournaments: {
    label: 'Tournament names',
    title: 'Tournament names users typed',
    hint: 'Typed under «Άλλο». Say which tournament it is, or keep those matches as friendlies.',
    noun: 'names',
  },
};
const ORDER: Tab[] = ['reports', 'disputes', 'players', 'traits', 'tournaments'];

/**
 * The moderation queue: things only a person can decide. Each item is a question with plain buttons.
 * Player-logged matches and names are live at once; this is where staff review them.
 */
export function Queue({ data, tournaments }: { data: Moderation; tournaments: TournamentOption[] }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const { toast, notify } = useToast();
  const traits = data.traits ?? [];
  const counts: Record<Tab, number> = {
    reports: data.reports.length,
    disputes: data.disputes.length,
    players: data.players.length,
    traits: traits.length,
    tournaments: data.tournaments.length,
  };
  const total = ORDER.reduce((n, t) => n + counts[t], 0);
  const [tab, setTab] = useState<Tab>(() => ORDER.find((t) => counts[t] > 0) ?? 'reports');
  const cues: Cues = { onNotice: setNotice, notify };
  const s = SECTIONS[tab];

  let body: ReactNode;
  if (counts[tab] === 0) {
    body = (
      <Card>
        <Empty title="All clear">Nothing waiting here.</Empty>
      </Card>
    );
  } else if (tab === 'reports') {
    body = <Paged key={tab} items={data.reports} noun={s.noun} grid render={(r) => <ReportRow key={r.id} r={r} cues={cues} />} />;
  } else if (tab === 'disputes') {
    body = <Paged key={tab} items={data.disputes} noun={s.noun} grid render={(d) => <DisputeRow key={d.match_id} d={d} cues={cues} />} />;
  } else if (tab === 'players') {
    body = <Paged key={tab} items={data.players} noun={s.noun} render={(p) => <PlayerRow key={p.player_id} p={p} cues={cues} />} />;
  } else if (tab === 'traits') {
    body = <Paged key={tab} items={traits} noun={s.noun} render={(t) => <TraitRow key={t.id} t={t} cues={cues} />} />;
  } else {
    body = <Paged key={tab} items={data.tournaments} noun={s.noun} render={(t) => <SuggestionRow key={t.text} s={t} tournaments={tournaments} cues={cues} />} />;
  }

  return (
    <>
      <PageHeader title="Moderation" intent="Things only a person can decide: reports, disputed results, new players, phrases and typed tournament names. Nothing here blocks the app; it keeps working until you decide." />
      <Stats
        items={[
          { label: total === 0 ? 'all clear' : 'waiting for you', value: total, ink: true },
          { label: 'reports', value: counts.reports },
          { label: 'disputed results', value: counts.disputes },
          { label: 'new players', value: counts.players },
          { label: 'phrases', value: counts.traits },
          { label: 'tournament names', value: counts.tournaments },
        ]}
      />
      {notice ? <Banner {...notice} /> : null}
      <Section title={s.title} aside={<Tabs value={tab} onChange={setTab} items={ORDER.map((t) => ({ value: t, label: SECTIONS[t].label, count: counts[t] }))} />}>
        <span className="v2-muted">{s.hint}</span>
        {body}
      </Section>
      <Toast text={toast} />
    </>
  );
}

/** a page of cards with the kit pager under them */
function Paged<T>({ items, noun, grid, render }: { items: T[]; noun: string; grid?: boolean; render: (item: T) => ReactNode }) {
  const p = usePages(items, PAGE);
  return (
    <div className="v2-stack" style={{ gap: 12 }}>
      <div className={grid ? 'v2-grid' : 'v2-stack'} style={grid ? undefined : { gap: 12 }}>
        {p.slice.map(render)}
      </div>
      <div className="v2-table-wrap">
        <Pager p={p as ReturnType<typeof usePages<unknown>>} noun={noun} />
      </div>
    </div>
  );
}

/** a destructive button that asks first, in the card; the yes button spins while it runs */
function Confirm({ label, question, yes, working, busy, disabled, onYes }: { label: string; question: string; yes: string; working: string; busy: boolean; disabled?: boolean; onYes: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <Secondary disabled={disabled} onClick={() => setAsking(true)}>
        {label}
      </Secondary>
    );
  return (
    <div className="v2-confirm" style={{ flexBasis: '100%' }}>
      <b style={{ fontSize: 14 }}>{question}</b>
      <div className="v2-row">
        <Secondary small busy={busy} disabled={disabled} onClick={onYes}>
          {busy ? working : yes}
        </Secondary>
        <Ghost disabled={busy} onClick={() => setAsking(false)}>
          Cancel
        </Ghost>
      </div>
    </div>
  );
}

function DisputeRow({ d, cues }: { d: Dispute; cues: Cues }) {
  const { pending, busy, run, cardClass } = useItemAction(cues);
  const logger = [d.logged_by?.first_name, d.logged_by?.surname].filter(Boolean).join(' ') || 'Someone';
  const other: Side = d.winner_side === 1 ? 2 : 1;
  const names = `${sideName(d, 1)} vs ${sideName(d, 2)}`;
  const go = (decision: 'keep' | 'flip' | 'void', working: string, toast: string) => run(decision, names, working, () => resolveDispute(d.match_id, decision), toast);
  return (
    <div className={cardClass()} aria-busy={pending || undefined}>
      <div className="v2-row between">
        <span className="v2-muted">
          {when(d.starts_at)} · {d.tournament ?? 'Friendly'} · {FORMATS[d.format]}
        </span>
        <Badge>{plural(d.votes, 'vote')}</Badge>
      </div>
      <div style={{ fontSize: 16 }}>
        <b>{logger}</b> logged that <b>{sideName(d, d.winner_side)}</b> beat {sideName(d, other)}
        {d.score ? ` ${d.score}` : ''}. Which result is right?
      </div>
      {d.answers.some((a) => a.state !== 'pending') ? (
        <div className="v2-stack" style={{ gap: 4 }}>
          {d.answers
            .filter((a) => a.state !== 'pending')
            .map((a) => (
              <span key={a.player}>
                <b>{a.player}</b>
                {a.state === 'not_me'
                  ? ' says they did not play this.'
                  : a.fix
                    ? ` says ${a.fix.winner === 'me' ? 'they' : 'the other side'} won ${a.fix.sets}.`
                    : ' disagrees.'}
              </span>
            ))}
        </div>
      ) : null}
      <div className="v2-row">
        <Secondary busy={busy === 'keep'} disabled={pending} onClick={() => go('keep', 'Keeping', 'Kept as logged')}>
          {busy === 'keep' ? 'Keeping…' : 'Keep the logged result'}
        </Secondary>
        <Secondary busy={busy === 'flip'} disabled={pending} onClick={() => go('flip', 'Turning round', 'Result turned round')}>
          {busy === 'flip' ? 'Turning round…' : `${sideName(d, other)} won`}
        </Secondary>
        <Confirm
          label="It didn’t happen"
          question="Remove this match? Votes on it are cancelled."
          yes="Yes, remove it"
          working="Removing…"
          busy={busy === 'void'}
          disabled={pending}
          onYes={() => go('void', 'Removing', 'Match removed')}
        />
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

function ReportRow({ r, cues }: { r: Report; cues: Cues }) {
  const { pending, busy, run, cardClass } = useItemAction(cues);
  const subject =
    r.entity_type === 'player'
      ? r.what?.name ?? 'A removed player'
      : `${(r.what?.sides ?? []).map((s) => s.players.map((p) => `${p.first_name} ${p.surname}`).join(' / ')).join(' vs ')}${
          r.what?.starts_at ? ` (${when(r.what.starts_at)})` : ''
        }`;
  const kind = r.entity_type === 'player' ? 'player' : 'match';
  return (
    <div className={cardClass()} aria-busy={pending || undefined}>
      <div className="v2-row between">
        <span className="v2-muted">
          {when(r.created_at)} · from {r.reporter ?? 'someone'}
        </span>
        <span className="v2-row" style={{ gap: 6 }}>
          <Badge tone="ink">{kind === 'player' ? 'Player' : 'Match'}</Badge>
          {r.reports > 1 ? <Badge tone="attention">{r.reports} people reported this</Badge> : null}
          {r.what?.hidden ? <Badge>Already hidden</Badge> : null}
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{subject}</div>
      <div>
        {REASONS[r.reason]}
        {r.note ? <span>: «{r.note}»</span> : null}
      </div>
      <b style={{ fontSize: 14 }}>Should this {kind} be hidden from the app?</b>
      <div className="v2-row">
        <Secondary busy={busy === 'leave'} disabled={pending} onClick={() => run('leave', subject, 'Closing the report on', () => closeReport(r.id, false), 'Left as it is')}>
          {busy === 'leave' ? 'Closing…' : 'No, leave it'}
        </Secondary>
        <Confirm
          label={`Hide this ${kind}`}
          question={`Hide this ${kind} from everyone?`}
          yes="Yes, hide it"
          working="Hiding…"
          busy={busy === 'hide'}
          disabled={pending}
          onYes={() => run('hide', subject, 'Hiding', () => closeReport(r.id, true), 'Hidden')}
        />
      </div>
    </div>
  );
}

function PlayerRow({ p, cues }: { p: PendingPlayer; cues: Cues }) {
  const { pending, busy, run, cardClass } = useItemAction(cues);
  const [first, setFirst] = useState(p.first_name);
  const [surname, setSurname] = useState(p.surname);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<FoundPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [joinTo, setJoinTo] = useState<string | null>(null);
  useEffect(() => {
    setSearching(q.trim().length >= 2);
    const id = setTimeout(() => {
      void searchPlayers(q)
        .then(setFound)
        .catch(() => setFound([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);
  const what = `${p.first_name} ${p.surname}`;
  const targets: { id: string; name: string; note: string }[] = [
    ...p.similar.map((s) => ({ id: s.player_id, name: s.name, note: s.claimed ? 'has an account' : 'looks like the same person' })),
    ...found.filter((f) => !p.similar.some((s) => s.player_id === f.id)).map((f) => ({ id: f.id, name: f.name, note: '' })),
  ];
  return (
    <div className={cardClass()} aria-busy={pending || undefined}>
      <div className="v2-row between">
        <span className="v2-muted">
          Added {when(p.created_at)} · {plural(p.matches, 'match', 'matches')}
        </span>
        {p.claimed ? <Badge tone="ink">Has an account</Badge> : null}
      </div>
      <b style={{ fontSize: 16 }}>Is “{what}” spelled right?</b>
      <div className="v2-row" style={{ alignItems: 'flex-end' }}>
        <label className="v2-field" style={{ width: 200 }}>
          First name
          <input className="v2-input" value={first} disabled={pending} onChange={(e) => setFirst(e.target.value)} />
        </label>
        <label className="v2-field" style={{ width: 240 }}>
          Surname
          <input className="v2-input" value={surname} disabled={pending} onChange={(e) => setSurname(e.target.value)} />
        </label>
        <Secondary busy={busy === 'approve'} disabled={pending} onClick={() => run('approve', what, 'Approving', () => approvePlayer(p.player_id, first, surname), 'Player approved')}>
          {busy === 'approve' ? 'Approving…' : 'Yes, approve'}
        </Secondary>
      </div>
      <div className="v2-confirm">
        <b style={{ fontSize: 14 }}>Or is this someone we already have? Find them to join the two.</b>
        <input className="v2-input" placeholder="Search players" value={q} disabled={pending} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 360 }} />
        {searching ? (
          <span className="v2-row v2-muted" style={{ gap: 8 }}>
            <span className="v2-spin" aria-hidden /> Searching…
          </span>
        ) : null}
        {targets.map((t) => (
          <div key={t.id} className="v2-row between" style={{ padding: '4px 0' }}>
            <span>
              <b>{t.name}</b> {t.note ? <span className="v2-muted">{t.note}</span> : null}
            </span>
            {joinTo === t.id ? (
              <span className="v2-row">
                <b style={{ fontSize: 14 }}>
                  Join “{what}” into {t.name}?
                </b>
                <Secondary small busy={busy === 'merge'} disabled={pending} onClick={() => run('merge', what, 'Merging', () => mergePlayer(p.player_id, t.id), 'Players joined')}>
                  {busy === 'merge' ? 'Merging…' : 'Yes, join them'}
                </Secondary>
                <Ghost disabled={pending} onClick={() => setJoinTo(null)}>
                  Cancel
                </Ghost>
              </span>
            ) : (
              <Secondary small disabled={pending} onClick={() => setJoinTo(t.id)}>
                Same person
              </Secondary>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionRow({ s, tournaments, cues }: { s: Moderation['tournaments'][number]; tournaments: TournamentOption[]; cues: Cues }) {
  const { pending, busy, run, cardClass } = useItemAction(cues);
  const [pick, setPick] = useState('');
  const what = `«${s.text}»`;
  return (
    <div className={cardClass('tight')} aria-busy={pending || undefined}>
      <div className="v2-row between">
        <b style={{ fontSize: 17 }}>Which tournament is {what}?</b>
        <span className="v2-muted">
          {plural(s.matches, 'match', 'matches')} · last {when(s.last)}
        </span>
      </div>
      <div className="v2-row">
        <select className="v2-select" style={{ width: 320 }} value={pick} disabled={pending} onChange={(e) => setPick(e.target.value)} aria-label="Tournament">
          <option value="">Choose a tournament</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Secondary busy={busy === 'link'} disabled={!pick || pending} onClick={() => run('link', what, 'Linking', () => linkSuggestion(s.text, pick), 'Matches linked')}>
          {busy === 'link' ? 'Linking…' : 'Link them'}
        </Secondary>
        <Secondary busy={busy === 'friendly'} disabled={pending} onClick={() => run('friendly', what, 'Keeping as friendlies', () => linkSuggestion(s.text, null), 'Kept as friendlies')}>
          {busy === 'friendly' ? 'Saving…' : 'They are friendlies'}
        </Secondary>
      </div>
      <span className="v2-muted">Not in the list? Add the tournament on the Tournaments page first.</span>
    </div>
  );
}

function TraitRow({ t, cues }: { t: PendingTrait; cues: Cues }) {
  const { pending, busy, run, cardClass } = useItemAction(cues);
  const [m, setM] = useState(t.label_el.m);
  const [f, setF] = useState(t.label_el.f);
  const [en, setEn] = useState(t.label_en);
  const what = `«${t.label_el.m}»`;
  return (
    <div className={cardClass()} aria-busy={pending || undefined}>
      <div className="v2-row between">
        <span className="v2-muted">
          Suggested {when(t.created_at)} by {t.by ?? 'someone'}
          {t.player ? ` about ${t.player}` : ''}
        </span>
        <Badge>{plural(t.votes, 'vote')}</Badge>
      </div>
      <b style={{ fontSize: 16 }}>Show this phrase to everyone?</b>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <label className="v2-field">
          For a man
          <input className="v2-input" value={m} disabled={pending} onChange={(e) => setM(e.target.value)} />
        </label>
        <label className="v2-field">
          For a woman
          <input className="v2-input" value={f} disabled={pending} onChange={(e) => setF(e.target.value)} />
        </label>
        <label className="v2-field">
          In English
          <input className="v2-input" value={en} disabled={pending} onChange={(e) => setEn(e.target.value)} />
        </label>
      </div>
      <div className="v2-row">
        <Secondary busy={busy === 'approve'} disabled={!m.trim() || pending} onClick={() => run('approve', what, 'Approving', () => decideTrait(t.id, true, { m, f, en }), 'Phrase approved')}>
          {busy === 'approve' ? 'Approving…' : 'Yes, approve'}
        </Secondary>
        <Confirm
          label="No, throw it away"
          question="Throw this phrase away? The votes on it go too."
          yes="Yes, throw it away"
          working="Throwing away…"
          busy={busy === 'drop'}
          disabled={pending}
          onYes={() => run('drop', what, 'Throwing away', () => decideTrait(t.id, false), 'Phrase dropped')}
        />
      </div>
    </div>
  );
}
