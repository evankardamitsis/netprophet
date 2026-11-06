'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { Banner, Toast, useToast, type Tone } from '../feedback';
import { Badge, Card, Empty, Ghost, PageHeader, SearchInput, Secondary, Section, SkeletonRows, Stats, Table, Tabs } from '../kit';
import { endGivenPro, givePro, loadUsers, releasePlayer, resetBallerName, setHidden, type ActionResult } from './actions';

export interface AppUser {
  user_id: string;
  email: string | null;
  name: string | null;
  baller_name: string | null;
  hidden: boolean;
  role: string | null;
  created_at: string;
  last_opened: string | null;
  devices: string | null;
  pro: boolean;
  pro_source: string | null;
  pro_until: string | null;
  player_id: string | null;
  player: string | null;
  points: number;
  streak: number;
  streak_best: number;
  votes: number;
  correct: number;
  active_days: number;
  quizzes: number;
}

export interface UsersPage {
  stats: { total: number; new_7d: number; opened_7d: number; opened_30d: number; devices: number; pro: number; claimed: number };
  rows: AppUser[];
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New this week' },
  { value: 'pro', label: 'Pro' },
  { value: 'device', label: 'With notifications' },
  { value: 'claimed', label: 'Have a player' },
  { value: 'gone', label: 'Away 30 days' },
  { value: 'hidden', label: 'Hidden' },
];

type Notice = { tone: Tone; title: string; detail?: string };

/** «6 Nov 2026» in Athens time */
const day = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : 'Never';

const label = (u: AppUser) => u.name || u.baller_name || u.email || 'No name yet';
const rate = (u: AppUser) => (u.votes > 0 ? `${Math.round((100 * u.correct) / u.votes)}%` : '–');
// a subscription is the store's; what an admin gave can end here
const given = (u: AppUser) => u.pro && (u.pro_source === 'promo' || u.pro_source === 'gift');

/**
 * Users (founder, 6 Nov 2026): everyone with an account, most recently opened first, with the totals on top. «Manage»
 * opens one person above the list: their numbers and what an admin can do. Accounts are never deleted from here; that
 * stays with the person, in the app.
 */
export function Users() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState<UsersPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast, notify } = useToast();

  useEffect(() => {
    let live = true;
    setLoading(true);
    const id = setTimeout(() => {
      loadUsers(q.trim().length >= 2 ? q : '', filter)
        .then((r) => {
          if (!live) return;
          setPage(r);
          setError(null);
          setLoading(false);
        })
        .catch((e: Error) => {
          if (!live) return;
          setError(e.message);
          setLoading(false);
        });
    }, q ? 250 : 0);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [q, filter, tick]);

  const done = (who: string, r: ActionResult) => {
    if (r.ok) {
      setNotice({ tone: 'done', title: who, detail: r.message });
      notify(r.message);
      setTick((t) => t + 1);
    } else {
      setNotice({ tone: 'problem', title: `${who}: it didn’t work`, detail: r.message });
    }
  };

  const s = page?.stats;
  const current = page?.rows.find((u) => u.user_id === open) ?? null;

  return (
    <>
      <PageHeader title="Users" intent="Everyone with an account on the app. See how they play, give or end Pro, and step in when something needs it." />
      {notice ? <Banner {...notice} /> : null}
      {s ? (
        <Stats
          items={[
            { label: 'Accounts', value: s.total, ink: true },
            { label: 'New in 7 days', value: s.new_7d },
            { label: 'Opened in 7 days', value: s.opened_7d },
            { label: 'Opened in 30 days', value: s.opened_30d },
            { label: 'With notifications', value: s.devices },
            { label: 'Pro', value: s.pro },
            { label: 'Have a player', value: s.claimed },
          ]}
        />
      ) : null}
      {current ? <Manage key={current.user_id} u={current} done={done} onWorking={setNotice} onClose={() => setOpen(null)} /> : null}
      <Section title="Accounts" aside={<Tabs value={filter} onChange={setFilter} items={FILTERS} />}>
        <SearchInput value={q} onChange={setQ} placeholder="Search by name, Baller name or email (2 letters or more)" />
        {error ? <Banner tone="problem" title="Couldn’t load the accounts" detail={error} /> : null}
        {loading && !page ? (
          <SkeletonRows rows={8} />
        ) : page ? (
          <Table
            rows={page.rows}
            rowKey={(u) => u.user_id}
            noun="accounts"
            pageSize={25}
            empty={<Empty title="Nobody here">{q.trim() ? 'Try another spelling.' : 'No account fits this filter.'}</Empty>}
            columns={[
              {
                key: 'name',
                label: 'User',
                render: (u) => (
                  <div className="v2-stack" style={{ gap: 2 }}>
                    <div className="v2-row" style={{ gap: 6 }}>
                      <b>{label(u)}</b>
                      {u.pro ? <Badge tone="ink">Pro</Badge> : null}
                      {u.hidden ? <Badge tone="attention">Hidden</Badge> : null}
                      {u.role && u.role !== 'user' ? <Badge>{u.role}</Badge> : null}
                    </div>
                    <span className="v2-muted">{u.email}</span>
                  </div>
                ),
              },
              { key: 'opened', label: 'Last opened', width: 120, render: (u) => day(u.last_opened) },
              { key: 'joined', label: 'Joined', width: 120, render: (u) => day(u.created_at) },
              { key: 'votes', label: 'Votes', width: 70, num: true, render: (u) => u.votes },
              { key: 'rate', label: 'Right', width: 70, num: true, render: rate },
              { key: 'points', label: 'Points', width: 80, num: true, render: (u) => u.points },
              { key: 'streak', label: 'Σερί', width: 60, num: true, render: (u) => u.streak },
              {
                key: 'manage',
                label: '',
                width: 100,
                render: (u) => <Ghost onClick={() => setOpen(open === u.user_id ? null : u.user_id)}>{open === u.user_id ? 'Close' : 'Manage'}</Ghost>,
              },
            ]}
          />
        ) : null}
      </Section>
      <Toast text={toast} />
    </>
  );
}

function Manage({ u, done, onWorking, onClose }: { u: AppUser; done: (who: string, r: ActionResult) => void; onWorking: (n: Notice) => void; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState<null | 'release'>(null);

  const run = (what: string, fn: () => Promise<ActionResult>) => {
    onWorking({ tone: 'working', title: `${what}…` });
    start(async () => {
      done(label(u), await fn());
      setAsk(null);
    });
  };

  return (
    <Card>
      <div className="v2-row between">
        <div className="v2-stack" style={{ gap: 2 }}>
          <b style={{ fontSize: 18 }}>{label(u)}</b>
          <span className="v2-muted">{u.email}</span>
        </div>
        <Ghost disabled={pending} onClick={onClose}>
          Close
        </Ghost>
      </div>

      <Stats
        items={[
          { label: 'Points', value: u.points },
          { label: 'Votes', value: u.votes },
          { label: 'Right', value: rate(u) },
          { label: 'Σερί now', value: u.streak },
          { label: 'Best σερί', value: u.streak_best },
          { label: 'Days active', value: u.active_days },
          { label: 'Quizzes finished', value: u.quizzes },
        ]}
      />

      <span className="v2-muted">
        Joined {day(u.created_at)} · Last opened {day(u.last_opened)} · Notifications {u.devices ?? 'off or never allowed'}
        {u.baller_name ? ` · Baller «${u.baller_name}»` : ''}
      </span>

      <b>Pro</b>
      <span className="v2-muted">
        {u.pro ? `Has Pro (${u.pro_source})${u.pro_until ? ` until ${day(u.pro_until)}` : ''}.` : 'No Pro.'}
      </span>
      <div className="v2-row">
        {[7, 30, 365].map((d) => (
          <Secondary key={d} small busy={pending} disabled={pending} onClick={() => run(`Giving Pro for ${d} days`, () => givePro(u.user_id, d))}>
            Give {d} days
          </Secondary>
        ))}
        {given(u) ? (
          <Ghost disabled={pending} onClick={() => run('Ending Pro', () => endGivenPro(u.user_id))}>
            End given Pro
          </Ghost>
        ) : null}
      </div>
      {u.pro && !given(u) ? <span className="v2-muted">A paid subscription is ended by them, in the App Store or Google Play.</span> : null}

      <b>Ladder and name</b>
      <div className="v2-row">
        <Secondary small busy={pending} disabled={pending} onClick={() => run(u.hidden ? 'Showing them' : 'Hiding them', () => setHidden(u.user_id, !u.hidden))}>
          {u.hidden ? 'Show on the Ladder' : 'Hide from the Ladder'}
        </Secondary>
        {u.baller_name ? (
          <Ghost disabled={pending} onClick={() => run('Resetting the Baller name', () => resetBallerName(u.user_id))}>
            Reset Baller name
          </Ghost>
        ) : null}
      </div>

      <b>Player</b>
      {u.player_id ? (
        <div className="v2-row">
          <span>{u.player}</span>
          <Link href={`/v2/players?q=${encodeURIComponent(u.player ?? '')}`} className="v2-btn ghost">
            Open in Players ›
          </Link>
          {ask === 'release' ? (
            <span className="v2-confirm" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <b style={{ fontSize: 14 }}>Release this player? The account stays, but it is no longer linked to them.</b>
              <Secondary small busy={pending} onClick={() => run('Releasing the player', () => releasePlayer(u.player_id!))}>
                {pending ? 'Releasing…' : 'Yes, release'}
              </Secondary>
              <Ghost disabled={pending} onClick={() => setAsk(null)}>
                Keep it
              </Ghost>
            </span>
          ) : (
            <Ghost disabled={pending} onClick={() => setAsk('release')}>
              Release player
            </Ghost>
          )}
        </div>
      ) : (
        <span className="v2-muted">No player linked.</span>
      )}
    </Card>
  );
}
