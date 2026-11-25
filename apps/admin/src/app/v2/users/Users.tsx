'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { Banner, Toast, useToast, type Tone } from '../feedback';
import { Badge, Card, Empty, Ghost, PageHeader, SearchInput, Secondary, Section, SkeletonRows, Stats, Tabs } from '../kit';
import { endGivenPro, givePro, loadTimeline, loadUsers, releasePlayer, resetBallerName, setHidden, type ActionResult } from './actions';

export interface AppUser {
  user_id: string;
  email: string | null;
  name: string | null;
  baller_name: string | null;
  hidden: boolean;
  role: string | null;
  locale: string | null;
  via: string | null;
  onboarded: boolean;
  created_at: string;
  last_opened: string | null;
  last_played: string | null;
  platforms: string | null;
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

export type Segment = 'all' | 'new' | 'active' | 'at_risk' | 'gone' | 'pro' | 'paying' | 'claimed' | 'hidden';
export type SortKey = 'opened' | 'joined' | 'played' | 'votes' | 'points' | 'streak' | 'name';

export interface UsersQuery {
  query: string;
  segment: Segment;
  platform: string;
  lang: string;
  sort: SortKey;
  desc: boolean;
  page: number;
  size: number;
}

export interface UsersPage {
  refreshed_at: string | null;
  counts: Record<Segment | 'devices', number>;
  total: number;
  page: number;
  size: number;
  rows: AppUser[];
}

export interface TimelineItem {
  at: string;
  kind: string;
  text: string;
}

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'active', label: 'Active' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'gone', label: 'Gone' },
  { value: 'pro', label: 'Pro' },
  { value: 'paying', label: 'Paying' },
  { value: 'claimed', label: 'Have a player' },
  { value: 'hidden', label: 'Hidden' },
];
const SEGMENT_HINT: Record<Segment, string> = {
  all: 'Everyone with an account.',
  new: 'Joined in the last 7 days.',
  active: 'Opened the app in the last 7 days.',
  at_risk: 'Last opened between 7 and 30 days ago.',
  gone: 'Not opened in 30 days, or never.',
  pro: 'Have Pro now, paid, free week or given.',
  paying: 'Pay for Pro through a store.',
  claimed: 'Linked to their player.',
  hidden: 'Hidden from the Ladder.',
};
const PLATFORMS = [
  { value: '', label: 'Any device' },
  { value: 'ios', label: 'iPhone' },
  { value: 'android', label: 'Android' },
  { value: 'none', label: 'No notifications' },
];
const LANGS = [
  { value: '', label: 'Any language' },
  { value: 'el', label: 'Greek' },
  { value: 'en', label: 'English' },
];
const SIZE = 50;

type Notice = { tone: Tone; title: string; detail?: string };

/** «6 Nov 2026» in Athens time */
const day = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : 'Never';
/** «6 Nov, 14:30» in Athens time */
const when = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const label = (u: AppUser) => u.name || u.baller_name || u.email || 'No name yet';
const rate = (u: AppUser) => (u.votes > 0 ? `${Math.round((100 * u.correct) / u.votes)}%` : '–');
// a subscription is the store's; what an admin gave can end here
const given = (u: AppUser) => u.pro && (u.pro_source === 'promo' || u.pro_source === 'gift');

interface Col {
  key: string;
  label: string;
  sort?: SortKey;
  num?: boolean;
  width?: number;
  render: (u: AppUser) => React.ReactNode;
}

/**
 * Users (founder, 6 Nov 2026; reworked 25 Nov): everyone with an account, 50 at a time. Search, segments, filters,
 * sorting and paging all happen in the database, on a summary it refreshes every 15 minutes (and at once for a
 * person an admin just changed). «Manage» opens one person above the list with their story. Accounts are never
 * deleted from here; that stays with the person, in the app.
 */
export function Users() {
  const [q, setQ] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [platform, setPlatform] = useState('');
  const [lang, setLang] = useState('');
  const [sort, setSort] = useState<SortKey>('opened');
  const [desc, setDesc] = useState(true);
  const [pageNo, setPageNo] = useState(0);
  const [page, setPage] = useState<UsersPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [open, setOpen] = useState<AppUser | null>(null);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast, notify } = useToast();
  const query = q.trim().length >= 2 ? q.trim() : '';

  // a new search, segment, filter or sort starts from the first page
  useEffect(() => setPageNo(0), [query, segment, platform, lang, sort, desc]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    const id = setTimeout(
      () => {
        loadUsers({ query, segment, platform, lang, sort, desc, page: pageNo, size: SIZE })
          .then((r) => {
            if (!live) return;
            setPage(r);
            setError(null);
            setOpen((o) => (o ? (r.rows.find((u) => u.user_id === o.user_id) ?? o) : o));
          })
          .catch((e: Error) => live && setError(e.message))
          .finally(() => live && setLoading(false));
      },
      q ? 250 : 0,
    );
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [query, q, segment, platform, lang, sort, desc, pageNo, tick]);

  const done = (who: string, r: ActionResult) => {
    if (r.ok) {
      setNotice({ tone: 'done', title: who, detail: r.message });
      notify(r.message);
      setTick((t) => t + 1);
    } else {
      setNotice({ tone: 'problem', title: `${who}: it didn’t work`, detail: r.message });
    }
  };

  const sortBy = (k: SortKey) => {
    if (k === 'name') {
      setSort('name'); // names always run A to Z
      setDesc(false);
    } else if (sort === k) setDesc((d) => !d);
    else {
      setSort(k);
      setDesc(true);
    }
  };

  const c = page?.counts;
  const pages = page ? Math.max(1, Math.ceil(page.total / page.size)) : 1;
  const columns: Col[] = [
    {
      key: 'name',
      label: 'User',
      sort: 'name',
      render: (u) => (
        <div className="v2-stack" style={{ gap: 2 }}>
          <div className="v2-row" style={{ gap: 6 }}>
            <b>{label(u)}</b>
            {u.pro ? <Badge tone="ink">Pro</Badge> : null}
            {u.hidden ? <Badge tone="attention">Hidden</Badge> : null}
            {u.role && u.role !== 'user' ? <Badge>{u.role}</Badge> : null}
          </div>
          <span className="v2-muted">
            {u.email}
            {u.platforms ? ` · ${u.platforms}` : ''}
            {u.locale === 'en' ? ' · EN' : ''}
          </span>
        </div>
      ),
    },
    { key: 'opened', label: 'Last opened', sort: 'opened', width: 120, render: (u) => day(u.last_opened) },
    { key: 'played', label: 'Last played', sort: 'played', width: 120, render: (u) => (u.last_played ? day(u.last_played) : '–') },
    { key: 'joined', label: 'Joined', sort: 'joined', width: 120, render: (u) => day(u.created_at) },
    { key: 'votes', label: 'Votes', sort: 'votes', width: 70, num: true, render: (u) => u.votes },
    { key: 'rate', label: 'Right', width: 64, num: true, render: rate },
    { key: 'points', label: 'Points', sort: 'points', width: 76, num: true, render: (u) => u.points },
    { key: 'streak', label: 'Σερί', sort: 'streak', width: 60, num: true, render: (u) => u.streak },
    {
      key: 'manage',
      label: '',
      width: 96,
      render: (u) => <Ghost onClick={() => setOpen(open?.user_id === u.user_id ? null : u)}>{open?.user_id === u.user_id ? 'Close' : 'Manage'}</Ghost>,
    },
  ];

  return (
    <>
      <PageHeader title="Users" intent="Everyone with an account on the app. Find a group, see how they play, give or end Pro, and step in when something needs it." />
      {notice ? <Banner {...notice} /> : null}
      {c ? (
        <Stats
          items={[
            { label: 'Accounts', value: c.all, ink: true },
            { label: 'New in 7 days', value: c.new },
            { label: 'Active in 7 days', value: c.active },
            { label: 'At risk', value: c.at_risk },
            { label: 'Gone', value: c.gone },
            { label: 'Pro', value: c.pro },
            { label: 'Have a player', value: c.claimed },
          ]}
        />
      ) : null}
      {open ? <Manage key={open.user_id} u={open} done={done} onWorking={setNotice} onClose={() => setOpen(null)} /> : null}
      <Section
        title="Accounts"
        aside={
          <Tabs
            value={segment}
            onChange={setSegment}
            items={SEGMENTS.map((s) => ({ ...s, count: c ? c[s.value] : undefined }))}
          />
        }
      >
        <div className="np-users-tools">
          <SearchInput value={q} onChange={setQ} placeholder="Search by name, Baller name or email (2 letters or more)" />
          <select className="v2-select" value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Device">
            {PLATFORMS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select className="v2-select" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
            {LANGS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <span className="v2-muted">
          {SEGMENT_HINT[segment]}
          {page?.refreshed_at ? ` Up to date as of ${when(page.refreshed_at)}; it refreshes every 15 minutes.` : ''}
        </span>
        {error ? <Banner tone="problem" title="Couldn’t load the accounts" detail={error} /> : null}
        {loading && !page ? (
          <SkeletonRows rows={8} />
        ) : page && page.rows.length === 0 ? (
          <Empty title="Nobody here">{query ? 'Try another spelling.' : 'No account fits these filters.'}</Empty>
        ) : page ? (
          <div className="v2-table-wrap" aria-busy={loading}>
            <div className="v2-table-scroll">
              <table className="v2-table" style={loading ? { opacity: 0.6, transition: 'opacity 150ms' } : undefined}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} className={col.num ? 'num' : undefined} style={col.width ? { width: col.width } : undefined}>
                        {col.sort ? (
                          <button
                            type="button"
                            className={`np-sort${sort === col.sort ? ' on' : ''}`}
                            onClick={() => sortBy(col.sort!)}
                            aria-label={`Sort by ${col.label}`}
                          >
                            {col.label}
                            {sort === col.sort ? (col.sort === 'name' || !desc ? ' ↑' : ' ↓') : ''}
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((u) => (
                    <tr key={u.user_id}>
                      {columns.map((col) => (
                        <td key={col.key} className={col.num ? 'num' : undefined}>
                          {col.render(u)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="v2-pager">
              <span>
                {page.page * page.size + 1} to {page.page * page.size + page.rows.length} of {page.total} accounts
              </span>
              {pages > 1 ? (
                <span className="v2-row">
                  <button className="v2-btn secondary small" disabled={pageNo === 0 || loading} onClick={() => setPageNo(pageNo - 1)} aria-label="Previous page">
                    ‹
                  </button>
                  <span>
                    Page {pageNo + 1} of {pages}
                  </span>
                  <button
                    className="v2-btn secondary small"
                    disabled={pageNo >= pages - 1 || loading}
                    onClick={() => setPageNo(pageNo + 1)}
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </span>
              ) : null}
            </div>
          </div>
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
        {u.locale === 'en' ? 'English' : 'Greek'} · {u.via === 'before-onboarding' ? 'came over from the old app' : u.onboarded ? 'finished onboarding' : 'onboarding not finished'}
        {u.last_played ? ` · last played ${day(u.last_played)}` : ' · has not played yet'}
      </span>

      <span className="v2-muted">
        Joined {day(u.created_at)} · Last opened {day(u.last_opened)} · Notifications {u.platforms ?? 'off or never allowed'}
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
              <Secondary small busy={pending} onClick={() => run('Releasing the player', () => releasePlayer(u.player_id!, u.user_id))}>
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

      <Timeline userId={u.user_id} />
    </Card>
  );
}

/** one person's story, newest first: account, onboarding, player, votes, quizzes, Pro, store, emails */
function Timeline({ userId }: { userId: string }) {
  const [items, setItems] = useState<TimelineItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    let live = true;
    loadTimeline(userId)
      .then((r) => live && setItems(r))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [userId]);
  const shown = items ? (all ? items : items.slice(0, 12)) : [];
  return (
    <>
      <b>Their story</b>
      {error ? <Banner tone="problem" title="Couldn’t load their story" detail={error} /> : null}
      {!items && !error ? <SkeletonRows rows={4} /> : null}
      {items && items.length === 0 ? <span className="v2-muted">Nothing yet.</span> : null}
      {shown.length ? (
        <ol className="np-timeline">
          {shown.map((t, i) => (
            <li key={`${t.at}-${i}`} className={`np-tl-${t.kind}`}>
              <span className="v2-muted">{when(t.at)}</span>
              <span>{t.text}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {items && items.length > 12 ? (
        <Ghost onClick={() => setAll((a) => !a)}>{all ? 'Show less' : `Show all ${items.length}`}</Ghost>
      ) : null}
    </>
  );
}
