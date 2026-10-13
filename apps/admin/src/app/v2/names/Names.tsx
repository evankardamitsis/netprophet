"use client";
import { useCallback, useEffect, useState, useTransition, type CSSProperties } from "react";
import { colors, ui } from "../ui";
import { applyNames, loadPass, saveSpelling, type ActionResult } from "./actions";

export type Confidence = "high" | "review" | "missing";

export interface NameRow {
  player_id: string;
  first_name: string | null;
  surname: string | null;
  proposed_first: string | null;
  proposed_surname: string | null;
  confidence: Confidence;
  claimed: boolean;
}

export interface NameWord {
  kind: "first" | "surname";
  word: string;
  spelling: string | null;
  confidence: Confidence | null;
  players: number;
}

export interface NamePass {
  counts: { high: number; review: number; missing: number };
  rows: NameRow[] | null;
  words: NameWord[] | null;
}

const PAGE = 100;
const TABS: { key: Confidence; label: string }[] = [
  { key: "high", label: "Sure" },
  { key: "review", label: "Check" },
  { key: "missing", label: "Missing" },
];

const th: CSSProperties = { textAlign: "left", padding: "6px 10px", fontSize: 13, borderBottom: `2px solid ${colors.ink}` };
const td: CSSProperties = { padding: "6px 10px", fontSize: 14, borderBottom: `1px solid ${colors.mist}`, verticalAlign: "top" };

const join = (a: string | null, b: string | null) => [a, b].filter(Boolean).join(" ");

/** a title-cased guess of a capitalised word, hyphen and space aware, accents untouched */
function titleCase(w: string): string {
  return w.toLowerCase().replace(/(^|[\s'-])(\S)/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Accent pass for v1 names: tabs, proposals, words to fix. */
export function Names() {
  const [tab, setTab] = useState<Confidence>("high");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<NamePass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, run] = useTransition();

  const reload = useCallback(async (t: Confidence, p: number) => {
    try {
      setData(await loadPass(t, PAGE, p * PAGE));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }, []);

  useEffect(() => {
    void reload(tab, page);
  }, [tab, page, reload]);

  const rows = data?.rows ?? [];
  const words = data?.words ?? [];
  const total = data ? data.counts[tab] : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.player_id));

  const go = (t: Confidence) => {
    setTab(t);
    setPage(0);
    setPicked(new Set());
    setData(null);
  };

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const apply = (ids: string[] | null) =>
    run(async () => {
      const r = await applyNames(ids);
      setNotice(r);
      setPicked(new Set());
      await reload(tab, page);
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={ui.h1}>Names: accent pass</h1>
        <p style={ui.muted}>
          v1 names are in capitals. Proposals only change case and accents; search and imports are unaffected.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            style={{ ...ui.secondary, background: tab === t.key ? colors.ink : "transparent", color: tab === t.key ? colors.paper : colors.ink }}
            onClick={() => go(t.key)}
          >
            {t.label} {data ? data.counts[t.key] : ""}
          </button>
        ))}
      </div>
      {notice ? (
        <div
          role="status"
          style={{
            ...ui.card,
            background: notice.ok ? colors.ink : colors.white,
            color: notice.ok ? colors.paper : colors.ink,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>{notice.message}</span>
          <button style={ui.link} onClick={() => setNotice(null)}>
            Close
          </button>
        </div>
      ) : null}
      {error ? <p style={ui.error}>{error}</p> : null}
      {!data && !error ? <p style={ui.muted}>Loading.</p> : null}
      {data && tab !== "high" && words.length > 0 ? (
        <section style={{ ...ui.card, display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Words to fix</h2>
          {words.map((w) => (
            <WordRow
              key={`${w.kind}:${w.word}`}
              w={w}
              onSaved={async (r) => {
                setNotice(r);
                await reload(tab, page);
              }}
            />
          ))}
        </section>
      ) : null}
      {data ? (
        <section style={{ ...ui.card, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label style={{ fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={allPicked}
                disabled={tab === "missing" || rows.length === 0}
                onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.player_id)))}
              />
              Select all on page
            </label>
            {tab !== "missing" ? (
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={ui.secondary} disabled={busy || picked.size === 0} onClick={() => apply([...picked])}>
                  Apply selected ({picked.size})
                </button>
                {tab === "high" ? (
                  <button
                    style={ui.primary}
                    disabled={busy || data.counts.high === 0}
                    onClick={() => {
                      if (!window.confirm(`Rename ${data.counts.high} real players to their proposed names?`)) return;
                      apply(null);
                    }}
                  >
                    Apply all {data.counts.high} sure
                  </button>
                ) : null}
              </span>
            ) : null}
          </div>
          {rows.length === 0 ? (
            <p style={ui.muted}>Nothing here.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={th} />
                    <th style={th}>Current</th>
                    <th style={th}>Proposed</th>
                    <th style={th}>Claimed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.player_id}>
                      <td style={td}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${join(r.first_name, r.surname)}`}
                          disabled={tab === "missing"}
                          checked={picked.has(r.player_id)}
                          onChange={() => toggle(r.player_id)}
                        />
                      </td>
                      <td style={td}>{join(r.first_name, r.surname)}</td>
                      <td style={td}>
                        <span style={{ fontWeight: 700 }}>{join(r.proposed_first, r.proposed_surname)}</span>
                      </td>
                      <td style={td}>{r.claimed ? "✓" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              style={ui.secondary}
              disabled={busy || page === 0}
              onClick={() => {
                setPage(page - 1);
                setPicked(new Set());
              }}
            >
              ‹
            </button>
            <span style={ui.muted}>
              Page {page + 1} of {pages}
            </span>
            <button
              style={ui.secondary}
              disabled={busy || page + 1 >= pages}
              onClick={() => {
                setPage(page + 1);
                setPicked(new Set());
              }}
            >
              ›
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function WordRow({ w, onSaved }: { w: NameWord; onSaved: (r: ActionResult) => Promise<void> }) {
  const [value, setValue] = useState(w.spelling ?? titleCase(w.word));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await saveSpelling(w.kind, w.word, value.trim());
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setError(null);
      await onSaved(r);
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, borderBottom: `1px solid ${colors.mist}`, paddingBottom: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <strong style={{ minWidth: 120 }}>{w.word}</strong>
        <span style={{ ...ui.muted, minWidth: 70 }}>{w.kind}</span>
        <span style={{ ...ui.muted, minWidth: 110 }}>{w.spelling ?? ""}</span>
        <span style={{ ...ui.muted, minWidth: 80 }}>{w.players} players</span>
        <input
          style={{ ...ui.input, width: 200 }}
          value={value}
          aria-label={`Spelling for ${w.word}`}
          onChange={(e) => setValue(e.target.value)}
        />
        <button style={ui.secondary} disabled={pending || value.trim() === ""} onClick={save}>
          Save
        </button>
      </div>
      {error ? <p style={ui.error}>{error}</p> : null}
    </div>
  );
}
