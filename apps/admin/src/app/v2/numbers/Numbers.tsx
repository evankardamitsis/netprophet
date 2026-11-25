'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createV2BrowserClient } from '@/lib/v2/browser';
import { Banner } from '../feedback';
import { PageHeader, Section, SkeletonCards, Stats, Table, Tabs } from '../kit';
import { loadNumbers, loadRetention } from './actions';

export interface NumbersDay {
  day: string;
  apple: number | null;
  google: number | null;
  signups: number;
  voters: number;
  votes: number;
  quizzes: number;
  opened_1d: number | null;
  opened_7d: number | null;
  opened_30d: number | null;
}

export interface NumbersFunnel {
  since: string;
  downloads: number;
  accounts: number;
  onboarded: number;
  voted: number;
  eligible_7d: number;
  returned_7d: number;
}

export interface RetentionWeek {
  cohort_week: string;
  joined: number;
  w1: number | null;
  w2: number | null;
  w4: number | null;
  w8: number | null;
}

export interface RetentionData {
  refreshed_at: string | null;
  weeks: RetentionWeek[];
}

export interface NumbersData {
  today: string;
  refreshed_at: string | null;
  store: { apple: number; google: number; apple_7d: number; google_7d: number; apple_through: string | null; google_through: string | null; fetched_at: string | null };
  accounts: { total: number; new_1d: number; new_7d: number; new_30d: number; opened_15m: number; opened_1d: number; opened_7d: number; opened_30d: number };
  pro: { total: number; paid: number; trial: number; given: number };
  funnel: NumbersFunnel;
  days: NumbersDay[];
}

const RANGES = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: 'A year' },
];

/** «23 Nov» */
const short = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00Z`));
const n = (v: number | null | undefined) => (v === null || v === undefined ? '–' : v.toLocaleString('en-GB'));
/** «40%», or a dash when there is nothing to divide by */
const pct = (part: number | null | undefined, whole: number | null | undefined) =>
  part === null || part === undefined || !whole ? '–' : `${Math.round((100 * part) / whole)}%`;
/** «14:30» Athens time */
const clock = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/** the path from a download to coming back, each step with its share of the step before */
function Funnel({ f, googleIn }: { f: NumbersFunnel; googleIn: boolean }) {
  const steps = [
    { label: googleIn ? 'Downloads' : 'App Store downloads', value: f.downloads, of: null as number | null },
    { label: 'Accounts', value: f.accounts, of: googleIn ? f.downloads : null },
    { label: 'Finished onboarding', value: f.onboarded, of: f.accounts },
    { label: 'Voted at least once', value: f.voted, of: f.onboarded },
    { label: 'Came back within 7 days', value: f.returned_7d, of: f.eligible_7d },
  ];
  const top = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="v2-card np-funnel">
      {steps.map((s) => (
        <div key={s.label} className="np-funnel-row">
          <span className="np-funnel-label">{s.label}</span>
          <span className="np-funnel-track">
            <span className="np-funnel-fill" style={{ width: `${(100 * s.value) / top}%` }} />
          </span>
          <b className="np-funnel-n">{n(s.value)}</b>
          <span className="np-funnel-pct v2-muted">{s.of === null ? '' : pct(s.value, s.of)}</span>
        </div>
      ))}
    </div>
  );
}

/** downloads a day, App Store and Play stacked, oldest on the left */
function DownloadBars({ days }: { days: NumbersDay[] }) {
  const shown = [...days].reverse();
  const top = Math.max(1, ...shown.map((d) => (d.apple ?? 0) + (d.google ?? 0)));
  return (
    <div className="v2-card" style={{ gap: 10 }}>
      <div className="np-bars" role="img" aria-label="Downloads a day">
        {shown.map((d) => {
          const a = d.apple ?? 0;
          const g = d.google ?? 0;
          return (
            <div key={d.day} className="np-bar" title={`${short(d.day)}: App Store ${a}, Google Play ${g}`}>
              <span className="np-bar-google" style={{ height: `${(100 * g) / top}%` }} />
              <span className="np-bar-apple" style={{ height: `${(100 * a) / top}%` }} />
            </div>
          );
        })}
      </div>
      <div className="np-bars-foot">
        <span>{shown.length ? short(shown[0].day) : ''}</span>
        <span className="np-key">
          <i className="np-bar-apple" /> App Store <i className="np-bar-google" /> Google Play <b>Most in a day: {top}</b>
        </span>
        <span>{shown.length ? short(shown[shown.length - 1].day) : ''}</span>
      </div>
    </div>
  );
}

/** signup weeks, and the share of each that still played 1, 2, 4 and 8 weeks later */
function Retention() {
  const [data, setData] = useState<RetentionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadRetention()
      .then((d) => live && setData(d))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  const cell = (part: number | null, whole: number) => {
    if (part === null) return <td className="num v2-muted">–</td>;
    const v = whole ? part / whole : 0;
    return (
      <td className={`np-ret-cell${v > 0.5 ? ' dark' : ''}`} style={{ ['--v' as string]: v }} title={`${part} of ${whole}`}>
        {pct(part, whole)}
      </td>
    );
  };
  return (
    <Section title="Do they stay?" aside={<span className="v2-muted">Refreshed every night</span>}>
      {error ? <Banner tone="problem" title="Couldn’t load retention" detail={error} /> : null}
      {!data && !error ? <SkeletonCards count={1} /> : null}
      {data && data.weeks.length === 0 ? <p className="v2-muted">No signup weeks yet.</p> : null}
      {data && data.weeks.length ? (
        <div className="v2-table-wrap">
          <div className="v2-table-scroll">
            <table className="v2-table np-ret">
              <thead>
                <tr>
                  <th>Joined the week of</th>
                  <th className="num">Joined</th>
                  <th className="num">Week 1</th>
                  <th className="num">Week 2</th>
                  <th className="num">Week 4</th>
                  <th className="num">Week 8</th>
                </tr>
              </thead>
              <tbody>
                {data.weeks.map((w) => (
                  <tr key={w.cohort_week}>
                    <td>{short(w.cohort_week)}</td>
                    <td className="num">{n(w.joined)}</td>
                    {cell(w.w1, w.joined)}
                    {cell(w.w2, w.joined)}
                    {cell(w.w4, w.joined)}
                    {cell(w.w8, w.joined)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <p className="v2-muted">
        Accounts made in the app, grouped by the week they joined. Each week shows the share that voted or played the quiz that week after joining; a dash
        means that week has not come for everyone yet. Accounts brought over from the old app are left out.
      </p>
    </Section>
  );
}

/**
 * Numbers (founder, 25 Nov 2026): downloads from both stores, accounts, who opens the app, Pro and play day by day.
 * The stores' numbers arrive once a day (a day behind); «opened» per day starts from the day this desk shipped.
 */
export function Numbers() {
  const [range, setRange] = useState('30');
  const [data, setData] = useState<NumbersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const rangeRef = useRef(range);
  rangeRef.current = range;

  const reload = useCallback((quiet: boolean) => {
    const asked = rangeRef.current;
    if (!quiet) setLoading(true);
    loadNumbers(Number(asked))
      .then((d) => {
        if (rangeRef.current !== asked) return;
        setData(d);
        setError(null);
      })
      .catch((e: Error) => rangeRef.current === asked && setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => reload(false), [range, reload]);

  // no polling: the database refreshes its summaries every 15 minutes and Realtime tells this page when they changed;
  // coming back to the tab reloads once in case a change arrived while the connection slept
  useEffect(() => {
    const client = createV2BrowserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => reload(true), 400);
    };
    const channel = client.channel('admin-numbers-now');
    void client.auth.getSession().then(({ data: auth }) => {
      if (auth.session) void client.realtime.setAuth(auth.session.access_token);
      channel.on('postgres_changes', { event: '*', schema: 'core', table: 'numbers_now' }, soon).subscribe();
    });
    const onShow = () => document.visibilityState === 'visible' && soon();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onShow);
      void client.removeChannel(channel);
    };
  }, [reload]);

  const s = data?.store;
  const a = data?.accounts;
  const p = data?.pro;
  const f = data?.funnel;
  const through = [s?.apple_through ? `App Store to ${short(s.apple_through)}` : null, s?.google_through ? `Google Play to ${short(s.google_through)}` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <PageHeader
        title="Numbers"
        intent="How many people get the app, open it and play. Updates by itself every 15 minutes; the stores report once a day, a day behind."
      />
      {data?.refreshed_at ? <p className="v2-muted">Last change {clock(data.refreshed_at)}</p> : null}
      {error ? <Banner tone="problem" title="Couldn’t load the numbers" detail={error} /> : null}
      {!data && loading ? <SkeletonCards count={4} /> : null}
      {s && a && p && data ? (
        <>
          <Section title="Downloads" aside={<span className="v2-muted">{through || 'No store numbers yet'}</span>}>
            <Stats
              items={[
                { label: 'Both stores', value: n(s.apple + s.google), ink: true },
                { label: 'App Store', value: n(s.apple) },
                { label: 'Google Play', value: n(s.google) },
                { label: 'Last 7 days', value: n(s.apple_7d + s.google_7d) },
              ]}
            />
            {!s.google_through ? (
              <p className="v2-muted">Google Play numbers start once Google opens its install reports to us, usually within a day.</p>
            ) : null}
          </Section>

          <Section title="People">
            <Stats
              items={[
                { label: 'Accounts', value: n(a.total), ink: true },
                { label: 'New in 7 days', value: n(a.new_7d) },
                { label: 'Active in the last 15 minutes', value: n(a.opened_15m) },
                { label: 'Opened today', value: n(a.opened_1d) },
                { label: 'Opened in 7 days', value: n(a.opened_7d) },
                { label: 'Opened in 30 days', value: n(a.opened_30d) },
                { label: 'Daily of monthly', value: pct(a.opened_1d, a.opened_30d) },
              ]}
            />
            <p className="v2-muted">Opened means the app checked in on a device or refreshed a sign-in in that time.</p>
          </Section>

          <Section title="Pro">
            <Stats
              items={[
                { label: 'Pro now', value: n(p.total), ink: true },
                { label: 'Paying', value: n(p.paid) },
                { label: 'On the free week', value: n(p.trial) },
                { label: 'Given', value: n(p.given) },
                { label: 'Accounts paying', value: pct(p.paid, a.total) },
              ]}
            />
          </Section>

          {f && f.since ? (
            <Section title="From download to coming back" aside={<span className="v2-muted">Accounts made since {short(f.since)}</span>}>
              <Funnel f={f} googleIn={Boolean(s.google_through)} />
              <p className="v2-muted">
                Accounts made in the app since the stores’ numbers start; accounts brought over from the old app are left out. Came back means voted or
                played the quiz on a later day within a week of joining, counted for the {n(f.eligible_7d)} who joined at least a week ago.
                {s.google_through ? '' : ' Downloads are App Store only until Google Play arrives.'}
              </p>
            </Section>
          ) : null}

          <Retention />

          <Section title="Day by day" aside={<Tabs value={range} onChange={setRange} items={RANGES} />}>
            <DownloadBars days={data.days} />
            <Table
              rows={data.days}
              rowKey={(d) => d.day}
              noun="days"
              pageSize={14}
              columns={[
                { key: 'day', label: 'Day', render: (d) => short(d.day) },
                { key: 'apple', label: 'App Store', num: true, render: (d) => n(d.apple) },
                { key: 'google', label: 'Google Play', num: true, render: (d) => n(d.google) },
                { key: 'signups', label: 'New accounts', num: true, render: (d) => n(d.signups) },
                { key: 'opened', label: 'Opened that day', num: true, render: (d) => n(d.opened_1d) },
                { key: 'voters', label: 'Voted', num: true, render: (d) => n(d.voters) },
                { key: 'votes', label: 'Votes', num: true, render: (d) => n(d.votes) },
                { key: 'quizzes', label: 'Quizzes', num: true, render: (d) => n(d.quizzes) },
              ]}
            />
          </Section>
        </>
      ) : null}
    </>
  );
}
