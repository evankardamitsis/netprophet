'use client';
import { useEffect, useState, useTransition } from 'react';
import { colors, ui } from '../ui';
import { mergeInto, recomputeLevels, searchRoster, unclaimPlayer, updatePlayer, type ActionResult } from './actions';

export interface RosterPlayer {
  player_id: string;
  first_name: string;
  surname: string;
  gender: 'm' | 'f' | null;
  birth_year: number | null;
  is_minor: boolean;
  hidden: boolean;
  status: 'pending' | 'active' | 'merged';
  source: string;
  area_id: string | null;
  merged_into: string | null;
  claimed_by: string | null;
  matches: number;
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'New (pending)' },
  { id: 'minors', label: 'Minors' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'claimed', label: 'With an account' },
];

/**
 * Roster tools. Search by name (or pick a filter), then per player: fix the name, gender and birth year (under 18
 * makes a minor: never voted on, never on cards), hide, merge a duplicate into another player, release a claim.
 */
export function Roster() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState<RosterPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<(ActionResult & { what: string }) | null>(null);
  const [tick, setTick] = useState(0);
  // levels also recompute every night (docs/v2/level-algorithm.md)
  const [recomputing, recompute] = useTransition();

  useEffect(() => {
    if (filter === 'all' && q.trim().length < 2) {
      setRows(null);
      return undefined;
    }
    const id = setTimeout(() => {
      searchRoster(q, filter)
        .then((r) => {
          setRows(r);
          setError(null);
        })
        .catch((e: Error) => setError(e.message));
    }, 250);
    return () => clearTimeout(id);
  }, [q, filter, tick]);

  const onNotice = (n: ActionResult & { what: string }) => {
    setNotice(n);
    if (n.ok) setTick((t) => t + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={ui.h1}>Players</h1>
        <button style={ui.secondary} disabled={recomputing} onClick={() => recompute(async () => onNotice({ ...(await recomputeLevels()), what: 'Levels:' }))}>
          Recompute levels
        </button>
      </div>
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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input style={{ ...ui.input, flex: 1, minWidth: 220 }} placeholder="Search by name (2 letters or more)" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ ...ui.input, width: 200 }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter">
          {FILTERS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      {error ? <p style={ui.error}>{error}</p> : null}
      {rows === null ? <p style={ui.muted}>Type a name or choose a filter.</p> : rows.length === 0 ? <p style={ui.muted}>Nobody found.</p> : null}
      {(rows ?? []).map((p) => (
        <Row key={`${p.player_id}-${tick}`} p={p} onNotice={onNotice} />
      ))}
    </div>
  );
}

function Row({ p, onNotice }: { p: RosterPlayer; onNotice: (n: ActionResult & { what: string }) => void }) {
  const [first, setFirst] = useState(p.first_name);
  const [surname, setSurname] = useState(p.surname);
  const [gender, setGender] = useState(p.gender ?? '');
  const [birth, setBirth] = useState(p.birth_year ? String(p.birth_year) : '');
  const [minor, setMinor] = useState(p.is_minor);
  const [hidden, setHidden] = useState(p.hidden);
  const [mergeQ, setMergeQ] = useState('');
  const [targets, setTargets] = useState<RosterPlayer[]>([]);
  const [pending, start] = useTransition();
  const what = `${p.first_name} ${p.surname}:`;
  const merged = p.status === 'merged';

  useEffect(() => {
    if (mergeQ.trim().length < 2) {
      setTargets([]);
      return undefined;
    }
    const id = setTimeout(() => {
      searchRoster(mergeQ, 'all')
        .then((r) => setTargets(r.filter((x) => x.player_id !== p.player_id && x.status !== 'merged').slice(0, 5)))
        .catch(() => setTargets([]));
    }, 250);
    return () => clearTimeout(id);
  }, [mergeQ, p.player_id]);

  const save = () =>
    start(async () => {
      const patch: Record<string, unknown> = { first_name: first, surname, gender, hidden };
      // a birth year decides «minor» by itself; the box is for players without one
      if (birth.trim()) patch.birth_year = Number(birth);
      else {
        patch.birth_year = null;
        patch.is_minor = minor;
      }
      if (p.status === 'pending') patch.status = 'active';
      onNotice({ ...(await updatePlayer(p.player_id, patch)), what });
    });

  const tags = [
    p.status === 'pending' ? 'new' : null,
    merged ? 'merged' : null,
    p.is_minor ? 'minor' : null,
    p.hidden ? 'hidden' : null,
    p.claimed_by ? `account: ${p.claimed_by}` : null,
    `${p.matches} match${p.matches === 1 ? '' : 'es'}`,
    p.source,
  ].filter(Boolean);

  return (
    <div style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 10, opacity: merged ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 17 }}>
          {p.first_name} {p.surname}
        </strong>
        <span style={ui.muted}>{tags.join(' · ')}</span>
      </div>
      {merged ? null : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input style={{ ...ui.input, width: 160 }} value={first} onChange={(e) => setFirst(e.target.value)} aria-label="First name" />
            <input style={{ ...ui.input, width: 200 }} value={surname} onChange={(e) => setSurname(e.target.value)} aria-label="Surname" />
            <select style={{ ...ui.input, width: 110 }} value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender">
              <option value="">Gender</option>
              <option value="m">Man</option>
              <option value="f">Woman</option>
            </select>
            <input
              style={{ ...ui.input, width: 120 }}
              value={birth}
              onChange={(e) => setBirth(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Birth year"
              aria-label="Birth year"
              inputMode="numeric"
            />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
              <input type="checkbox" checked={minor} disabled={birth.trim().length > 0} onChange={(e) => setMinor(e.target.checked)} />
              Minor
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
              Hidden
            </label>
            <button style={ui.primary} disabled={pending} onClick={save}>
              {p.status === 'pending' ? 'Save and approve' : 'Save'}
            </button>
            {p.claimed_by ? (
              <button style={ui.secondary} disabled={pending} onClick={() => start(async () => onNotice({ ...(await unclaimPlayer(p.player_id)), what }))}>
                Release claim
              </button>
            ) : null}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input style={ui.input} placeholder="Duplicate? Find the player to merge into" value={mergeQ} onChange={(e) => setMergeQ(e.target.value)} />
            {targets.map((t) => (
              <div key={t.player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span>
                  {t.first_name} {t.surname}{' '}
                  <span style={ui.muted}>
                    {t.matches} matches{t.claimed_by ? ' · has an account' : ''}
                  </span>
                </span>
                <button style={ui.secondary} disabled={pending} onClick={() => start(async () => onNotice({ ...(await mergeInto(p.player_id, t.player_id)), what }))}>
                  Merge into
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
