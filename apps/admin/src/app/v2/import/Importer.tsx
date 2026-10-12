'use client';
import { useMemo, useState, useTransition } from 'react';
import { everydayFirst, parseCsv, parseSheet, parseSheetExport, toDbSets, type SheetMatch, type SheetPerson } from '@netprophet/ingest';
import { colors, ui } from '../ui';
import { importRows, listTournaments, matchPeople, saveTournament, type Candidate, type ImportSummary, type Tournament } from './actions';

/**
 * Import desk. 1) tournament; 2) the organiser's file: the whole Google Sheet export («## Sheet name:» per tab)
 * or one tab as CSV; parsed here with packages/ingest (the port of parse_oop.py). 3) people: each sheet name
 * once, with roster candidates (an alias or ≥ 0.92 is certain); a new player otherwise. 4) matches: ticked
 * unless flagged as a possible duplicate or another venue; a walkover needs its winner. Import writes aliases,
 * new players, matches (same fingerprint = update) and the organiser's results.
 */
const SURFACES = [
  ['', '—'],
  ['clay', 'Clay'],
  ['hard', 'Hard'],
  ['grass', 'Grass'],
  ['carpet', 'Carpet'],
] as const;
const CERTAIN = 0.92;
const CHUNK = 40;
const NEW = 'new';

const personKey = (p: SheetPerson) => p.key;
const personName = (p: SheetPerson) => `${p.surname} ${p.first}`.trim();

interface PersonChoice {
  person: SheetPerson;
  alias: string | null;
  candidates: Candidate[];
  /** a player id, or NEW */
  choice: string;
}

function defaultSeason(): number {
  const now = new Date();
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

export function Importer({ tournaments: initial, areas }: { tournaments: Tournament[]; areas: { id: string; name_el: string }[] }) {
  const [tournaments, setTournaments] = useState(initial);
  const [tournamentId, setTournamentId] = useState(initial.find((t) => t.active)?.id ?? '');
  const [draft, setDraft] = useState<{ name: string; venue: string; area_id: string; surface: string; starts_on: string; ends_on: string } | null>(null);
  const [season, setSeason] = useState(defaultSeason());
  const [tabName, setTabName] = useState('');
  const [matches, setMatches] = useState<SheetMatch[]>([]);
  const [include, setInclude] = useState<boolean[]>([]);
  const [walkover, setWalkover] = useState<Record<number, '' | '1' | '2'>>({});
  const [people, setPeople] = useState<Record<string, PersonChoice>>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const tournament = tournaments.find((t) => t.id === tournamentId) ?? null;

  const onFile = async (file: File) => {
    setMessage(null);
    setSummary(null);
    const text = await file.text();
    const tabs = text.includes('## Sheet name:')
      ? parseSheetExport(text)
      : [{ name: tabName || file.name.replace(/\.[^.]+$/, '').replace(/^\d+_/, '').replace(/_/g, ' ').replace(/-/g, '/'), rows: parseCsv(text) }];
    const parsed = parseSheet(tabs, season);
    if (parsed.length === 0) {
      setMessage('No matches found. A tab name like «ΣΑΒ 26/09» and a header row with ΩΡΑ, PLAYER 1, PLAYER 2 are needed.');
      return;
    }
    setMatches(parsed);
    setInclude(parsed.map((m) => !m.flags.includes('possible_duplicate') && !m.flags.includes('other_tournament')));
    setWalkover({});
    // each sheet person once, then the roster candidates for all of them in one call
    const unique = new Map<string, SheetPerson>();
    parsed.forEach((m) => [...m.players.side1, ...m.players.side2].forEach((p) => unique.set(personKey(p), p)));
    const list = [...unique.values()];
    start(async () => {
      try {
        const found = await matchPeople(list.map((p) => ({ surname: p.surname, first: p.first, first_alt: everydayFirst(p.first) })));
        const next: Record<string, PersonChoice> = {};
        list.forEach((p, i) => {
          const f = found[i] ?? { alias: null, candidates: [] };
          const top = f.candidates[0];
          next[personKey(p)] = { person: p, alias: f.alias, candidates: f.candidates, choice: f.alias ?? (top && top.score >= CERTAIN ? top.id : NEW) };
        });
        setPeople(next);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'matching failed');
      }
    });
  };

  const createTournament = () =>
    start(async () => {
      if (!draft?.name.trim()) return;
      try {
        const id = await saveTournament(draft);
        setTournaments(await listTournaments());
        setTournamentId(id);
        setDraft(null);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'save failed');
      }
    });

  const peopleList = useMemo(() => Object.values(people).sort((a, b) => a.person.surname.localeCompare(b.person.surname, 'el')), [people]);
  const toReview = peopleList.filter((p) => !p.alias && !(p.candidates[0] && p.candidates[0].score >= CERTAIN)).length;

  const run = () =>
    start(async () => {
      if (!tournamentId) return;
      setMessage(null);
      const side = (ps: SheetPerson[]) =>
        ps.map((p) => {
          const c = people[personKey(p)]?.choice ?? NEW;
          return c === NEW ? { new: { surname: p.surname, first: p.first }, raw: personName(p) } : { player_id: c, raw: personName(p) };
        });
      const rows = matches.flatMap((m, i) => {
        if (!include[i]) return [];
        const wo = walkover[i];
        const result =
          m.status === 'completed' && m.winner
            ? { winner_side: m.winner, sets: toDbSets(m.sets, m.winner), walkover: false }
            : m.status === 'walkover' && wo
              ? { winner_side: Number(wo), sets: [], walkover: true }
              : null;
        return [
          {
            fingerprint: m.fingerprint,
            date: m.date,
            time: m.time,
            discipline: m.discipline,
            level: m.level,
            category_raw: m.categoryRaw,
            tab: m.tab,
            row: i + 1,
            flags: m.flags,
            side1: side(m.players.side1),
            side2: side(m.players.side2),
            result,
          },
        ];
      });
      try {
        const total: ImportSummary = { created: 0, updated: 0, results: 0, results_skipped: 0, new_players: 0 };
        for (let i = 0; i < rows.length; i += CHUNK) {
          const s = await importRows(tournamentId, rows.slice(i, i + CHUNK));
          (Object.keys(total) as (keyof ImportSummary)[]).forEach((k) => (total[k] += s[k]));
        }
        setSummary(total);
        setTournaments(await listTournaments());
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'import failed');
      }
    });

  const chosen = include.filter(Boolean).length;
  const woMissing = matches.filter((m, i) => include[i] && m.status === 'walkover' && !walkover[i]).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={ui.h1}>Import an order of play</h1>
        <p style={ui.muted}>
          The organiser&apos;s Google Sheet (File › Download as text with every tab, «## Sheet name:») or one tab as CSV. Nothing is saved until you
          press Import.
        </p>
      </div>

      <section style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <strong>1. Tournament</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select style={{ ...ui.input, maxWidth: 420 }} value={tournamentId} onChange={(e) => setTournamentId(e.target.value)}>
            <option value="">Choose a tournament</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.surface ? ` · ${t.surface}` : ''} · {t.matches} matches
              </option>
            ))}
          </select>
          <button style={ui.secondary} onClick={() => setDraft({ name: '', venue: '', area_id: '', surface: '', starts_on: '', ends_on: '' })}>
            New tournament
          </button>
        </div>
        {tournament && !tournament.surface ? <span style={ui.muted}>This tournament has no surface yet.</span> : null}
        {draft ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            <input style={ui.input} placeholder="Name, e.g. TAF RACE 2026-2027" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <input style={ui.input} placeholder="Venue" value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} />
            <select style={ui.input} value={draft.area_id} onChange={(e) => setDraft({ ...draft, area_id: e.target.value })}>
              <option value="">Area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name_el}
                </option>
              ))}
            </select>
            <select style={ui.input} value={draft.surface} onChange={(e) => setDraft({ ...draft, surface: e.target.value })}>
              {SURFACES.map(([v, l]) => (
                <option key={v} value={v}>
                  {v ? l : 'Surface'}
                </option>
              ))}
            </select>
            <input style={ui.input} type="date" value={draft.starts_on} onChange={(e) => setDraft({ ...draft, starts_on: e.target.value })} />
            <input style={ui.input} type="date" value={draft.ends_on} onChange={(e) => setDraft({ ...draft, ends_on: e.target.value })} />
            <button style={ui.primary} disabled={pending || !draft.name.trim()} onClick={createTournament}>
              Save tournament
            </button>
            <button style={ui.link} onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        ) : null}
      </section>

      <section style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <strong>2. File</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={ui.muted}>
            Season starting{' '}
            <input style={{ ...ui.input, width: 100, display: 'inline-block' }} type="number" value={season} onChange={(e) => setSeason(Number(e.target.value))} />
          </label>
          <label style={ui.muted}>
            Tab name for a single CSV{' '}
            <input style={{ ...ui.input, width: 160, display: 'inline-block' }} placeholder="ΣΑΒ 26/09" value={tabName} onChange={(e) => setTabName(e.target.value)} />
          </label>
          <input type="file" accept=".txt,.csv,text/plain,text/csv" disabled={!tournamentId} onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
        </div>
        {!tournamentId ? <span style={ui.muted}>Choose a tournament first.</span> : null}
      </section>

      {message ? <p style={ui.error}>{message}</p> : null}

      {peopleList.length > 0 ? (
        <section style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong>
            3. People · {peopleList.length} names, {toReview} to check
          </strong>
          <span style={ui.muted}>Lime: certain (a remembered spelling, or ≥ 0.92). Sand: a guess, check it. White: a new player.</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {peopleList.map((p) => {
              const top = p.candidates[0];
              const certain = !!p.alias || (!!top && top.score >= CERTAIN && p.choice === top.id);
              const bg = p.choice === NEW ? colors.white : certain ? colors.lime : colors.sand;
              return (
                <div key={personKey(p.person)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 10px', borderRadius: 10, background: bg }}>
                  <span style={{ flex: '0 0 260px', fontWeight: 700 }}>{personName(p.person)}</span>
                  <select
                    style={{ ...ui.input, height: 36, fontSize: 14 }}
                    value={p.choice}
                    onChange={(e) => setPeople({ ...people, [personKey(p.person)]: { ...p, choice: e.target.value } })}
                  >
                    {p.alias && !p.candidates.some((c) => c.id === p.alias) ? <option value={p.alias}>Remembered player</option> : null}
                    {p.candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.surname} · {c.score.toFixed(2)}
                        {c.id === p.alias ? ' · remembered' : ''}
                      </option>
                    ))}
                    <option value={NEW}>New player: {personName(p.person)}</option>
                  </select>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {matches.length > 0 ? (
        <section style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong>
            4. Matches · {chosen} of {matches.length} ticked
          </strong>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: colors.inkSoft }}>
                  <th />
                  <th>Day</th>
                  <th>Category</th>
                  <th>Side 1</th>
                  <th>Side 2</th>
                  <th>Score</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => (
                  <tr key={`${m.fingerprint}-${i}`} style={{ borderTop: `1px solid ${colors.mist}`, opacity: include[i] ? 1 : 0.45 }}>
                    <td>
                      <input type="checkbox" checked={!!include[i]} onChange={(e) => setInclude(include.map((v, k) => (k === i ? e.target.checked : v)))} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {m.date} {m.time}
                    </td>
                    <td>
                      {m.discipline} {m.level}
                    </td>
                    <td>{m.side1}</td>
                    <td>{m.side2}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {m.status === 'walkover' ? (
                        <select value={walkover[i] ?? ''} onChange={(e) => setWalkover({ ...walkover, [i]: e.target.value as '' | '1' | '2' })}>
                          <option value="">wo: who won?</option>
                          <option value="1">Side 1</option>
                          <option value="2">Side 2</option>
                        </select>
                      ) : (
                        <>
                          {m.scoreRaw || '—'} {m.status === 'completed' && m.winner ? `(side ${m.winner})` : m.status === 'incomplete' ? '(unfinished)' : ''}
                        </>
                      )}
                    </td>
                    <td style={{ color: colors.inkSoft }}>{m.flags.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {woMissing ? <span style={ui.muted}>{woMissing} walkover(s) without a winner go in as matches with no result.</span> : null}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button style={ui.primary} disabled={pending || !tournamentId || chosen === 0 || peopleList.length === 0} onClick={run}>
              {pending ? 'Working…' : `Import ${chosen} matches`}
            </button>
            {summary ? (
              <span>
                {summary.created} new, {summary.updated} already there, {summary.results} results, {summary.new_players} new players
                {summary.results_skipped ? `, ${summary.results_skipped} results skipped (already resolved)` : ''}.
              </span>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
