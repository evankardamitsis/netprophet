'use client';
import { useEffect, useState } from 'react';
import { Banner } from '../feedback';
import { PageHeader, Section, SkeletonCards, Stats, Table, Tabs } from '../kit';
import { loadNumbers } from './actions';

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

export interface NumbersData {
  today: string;
  store: { apple: number; google: number; apple_7d: number; google_7d: number; apple_through: string | null; google_through: string | null; fetched_at: string | null };
  accounts: { total: number; new_1d: number; new_7d: number; new_30d: number; opened_1d: number; opened_7d: number; opened_30d: number };
  pro: { total: number; paid: number; trial: number; given: number };
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

/**
 * Numbers (founder, 25 Nov 2026): downloads from both stores, accounts, who opens the app, Pro and play day by day.
 * The stores' numbers arrive once a day (a day behind); «opened» per day starts from the day this desk shipped.
 */
export function Numbers() {
  const [range, setRange] = useState('30');
  const [data, setData] = useState<NumbersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    loadNumbers(Number(range))
      .then((d) => {
        if (!live) return;
        setData(d);
        setError(null);
      })
      .catch((e: Error) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [range]);

  const s = data?.store;
  const a = data?.accounts;
  const p = data?.pro;
  const through = [s?.apple_through ? `App Store to ${short(s.apple_through)}` : null, s?.google_through ? `Google Play to ${short(s.google_through)}` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <PageHeader title="Numbers" intent="How many people get the app, open it and play. The stores report once a day, a day behind." />
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
                { label: 'Opened today', value: n(a.opened_1d) },
                { label: 'Opened in 7 days', value: n(a.opened_7d) },
                { label: 'Opened in 30 days', value: n(a.opened_30d) },
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
              ]}
            />
          </Section>

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
