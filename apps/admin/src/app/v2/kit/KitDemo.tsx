'use client';
import { useState } from 'react';
import { Badge, Card, Empty, Ghost, PageHeader, Primary, SearchInput, Secondary, Section, Stats, Table, Tabs } from '../kit';

const SURNAMES = ['Παπαδόπουλος', 'Ροδίτης', 'Πράτσας', 'Κωνσταντινίδης', 'Αλεξίου', 'Παπαδάκης', 'Μέμμος', 'Γκότσης', 'Δεσύπρης', 'Τσιάμης'];
const rows = Array.from({ length: 62 }, (_, i) => ({
  id: String(i),
  name: `${SURNAMES[i % 10]} ${['Νίκος', 'Γιάννης', 'Ηλίας', 'Δημήτρης'][i % 4]}`,
  level: 2 + (i % 5),
  matches: (i * 7) % 23,
  state: i % 6 === 0 ? 'new' : i % 9 === 0 ? 'check' : 'ok',
}));

export function KitDemo() {
  const [tab, setTab] = useState<'all' | 'new' | 'check'>('all');
  const [q, setQ] = useState('');
  const shown = rows.filter((r) => (tab === 'all' || r.state === tab) && r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="v2-shell">
      <aside className="v2-nav">
        <div className="v2-brand">
          netprophet<small>Admin</small>
        </div>
        <nav className="v2-nav-items">
          <a className="v2-nav-item" aria-current="page" href="#">
            <span>Tournaments</span>
            <span className="v2-nav-count">3</span>
          </a>
          {['Results', 'Moderation', 'Players', 'Names', 'Quiz', 'Game'].map((l) => (
            <a key={l} className="v2-nav-item" href="#">
              <span>{l}</span>
            </a>
          ))}
        </nav>
        <div className="v2-nav-foot">
          <span>
            Evan
            <br />
            admin
          </span>
        </div>
      </aside>
      <main className="v2-page">
        <PageHeader title="Players" intent="Everyone in the roster. New names from the sheets land here; check their spelling once." actions={<Primary>Add a player</Primary>} />
        <Stats items={[{ label: 'players', value: 1269, ink: true }, { label: 'added this week', value: 109 }, { label: 'need a check', value: 7 }, { label: 'claimed by users', value: 214 }]} />
        <Section
          title="Roster"
          aside={
            <div className="v2-row">
              <Tabs value={tab} onChange={setTab} items={[{ value: 'all', label: 'All' }, { value: 'new', label: 'New', count: rows.filter((r) => r.state === 'new').length }, { value: 'check', label: 'To check', count: rows.filter((r) => r.state === 'check').length }]} />
              <SearchInput value={q} onChange={setQ} placeholder="Search a name" />
            </div>
          }
        >
          <Table
            rows={shown}
            rowKey={(r) => r.id}
            noun="players"
            columns={[
              { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
              { key: 'level', label: 'Level', render: (r) => `level ${r.level}`, width: 110 },
              { key: 'matches', label: 'Matches', num: true, render: (r) => r.matches, width: 110 },
              { key: 'state', label: '', width: 140, render: (r) => (r.state === 'new' ? <Badge tone="ink">New</Badge> : r.state === 'check' ? <Badge tone="attention">Check spelling</Badge> : <Badge>OK</Badge>) },
              { key: 'act', label: '', width: 120, render: () => <Ghost>Edit</Ghost> },
            ]}
            empty={<Empty title="No players match">Try another name.</Empty>}
          />
        </Section>
        <Section title="Cards">
          <div className="v2-grid">
            <Card>
              <div className="v2-row between">
                <b className="v2-h3">ΑΟΚ Tennis Open</b>
                <Badge tone="done">✓ Updated 22:00</Badge>
              </div>
              <span className="v2-muted">Clay · 9 to 25 Oct · 136 matches</span>
              <div className="v2-row">
                <Secondary small>Update now</Secondary>
                <Secondary small>Rained off…</Secondary>
                <Ghost>Edit</Ghost>
              </div>
            </Card>
            <Card tone="attention">
              <div className="v2-row between">
                <b className="v2-h3">PRC (Μαρούσι)</b>
                <Badge tone="attention">Needs a surface</Badge>
              </div>
              <span className="v2-muted">124 matches · Court 1 PRC, Court 2 PRC</span>
            </Card>
          </div>
        </Section>
      </main>
    </div>
  );
}
