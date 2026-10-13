"use client";
import { useCallback, useEffect, useState, useTransition, type CSSProperties } from "react";
import { colors, ui } from "../ui";
import { Banner, Toast, useToast } from "../feedback";
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
  { key: "high", label: "Ready to fix" },
  { key: "review", label: "Check these" },
  { key: "missing", label: "We don’t know these yet" },
];

const rowLine: CSSProperties = { display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${colors.mist}`, fontSize: 15, flexWrap: "wrap" };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const join = (a: string | null, b: string | null) => [a, b].filter(Boolean).join(" ");

/** a title-cased guess of a capitalised word, hyphen and space aware, accents untouched */
function titleCase(w: string): string {
  return w.toLowerCase().replace(/(^|[\s'-])(\S)/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Names in capitals: tabs, suggested spellings, words to teach. */
export function Names() {
  const [tab, setTab] = useState<Confidence>("high");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<NamePass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, run] = useTransition();
  const { toast, notify } = useToast();

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
    setConfirmAll(false);
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
      setConfirmAll(false);
      setPicked(new Set());
      if (r.ok) notify(r.message.replace("Applied", "Fixed"));
      else setError(r.message);
      await reload(tab, page);
    });

  const ready = data?.counts.high ?? 0;
  const waiting = data ? data.counts.review + data.counts.missing : 0;
  const sentence = !data
    ? ""
    : ready > 0
      ? `${plural(ready, "name")} can be fixed now.`
      : waiting > 0
        ? "Nothing is ready to fix. Teach us the words below and more names will become ready."
        : "All names are done. Nothing needs you.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={ui.h1}>Names in capitals</h1>
        <p style={ui.muted}>
          Old and imported names come in capitals (ΠΑΠΑΔΟΠΟΥΛΟΣ). We suggest the normal spelling (Παπαδόπουλος). Only capitals and accents change, never letters.
          {sentence ? ` ${sentence}` : ""}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            style={{ ...ui.secondary, background: tab === t.key ? colors.ink : "transparent", color: tab === t.key ? colors.paper : colors.ink }}
            onClick={() => go(t.key)}
          >
            {t.label}{data ? ` (${data.counts[t.key]})` : ""}
          </button>
        ))}
      </div>
      {error ? <Banner tone="problem" title="Something went wrong" detail={error} /> : null}
      {busy ? <Banner tone="working" title="Renaming players…" /> : null}
      {!data && !error ? <p style={ui.muted}>Loading…</p> : null}
      {data && tab !== "high" && words.length > 0 ? (
        <section style={{ ...ui.card, display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Teach us these words</h2>
          <p style={ui.muted}>
            Check the spelling in the box and press Save. Save a word once and every name with it gets fixed.
          </p>
          {words.map((w) => (
            <WordRow
              key={`${w.kind}:${w.word}`}
              w={w}
              onSaved={async (r) => {
                notify(r.message);
                await reload(tab, page);
              }}
            />
          ))}
        </section>
      ) : null}
      {data ? (
        <section style={{ ...ui.card, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{TABS.find((t) => t.key === tab)?.label}</h2>
          {tab === "high" && ready > 0 ? (
            confirmAll ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Banner tone="problem" title={`Fix all ${ready}?`} detail={`This renames ${plural(ready, "player")} in the app.`} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={ui.primary} disabled={busy} onClick={() => apply(null)}>
                    Yes, fix all {ready}
                  </button>
                  <button style={ui.secondary} disabled={busy} onClick={() => setConfirmAll(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button style={{ ...ui.primary, minHeight: 52, fontSize: 17, padding: "0 28px" }} disabled={busy} onClick={() => setConfirmAll(true)}>
                  Fix all {ready}
                </button>
                <button style={ui.secondary} disabled={busy || picked.size === 0} onClick={() => apply([...picked])}>
                  Fix selected ({picked.size})
                </button>
              </div>
            )
          ) : null}
          {tab === "review" && rows.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button style={ui.secondary} disabled={busy || picked.size === 0} onClick={() => apply([...picked])}>
                Fix selected ({picked.size})
              </button>
              <span style={ui.muted}>Tick the names that look right.</span>
            </div>
          ) : null}
          {rows.length > 0 && tab !== "missing" ? (
            <label style={{ fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={allPicked}
                onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.player_id)))}
              />
              Tick all on this page
            </label>
          ) : null}
          {rows.length === 0 ? (
            <p style={ui.muted}>
              {tab === "high"
                ? "Nothing is ready to fix right now."
                : tab === "review"
                  ? "No names to check right now."
                  : "No unknown words right now."}
            </p>
          ) : (
            <div>
              {rows.map((r) => {
                const now = join(r.surname, r.first_name);
                const sug = join(r.proposed_first, r.proposed_surname);
                return (
                  <div key={r.player_id} style={rowLine}>
                    {tab !== "missing" ? (
                      <input
                        type="checkbox"
                        aria-label={`Tick ${now}`}
                        checked={picked.has(r.player_id)}
                        onChange={() => toggle(r.player_id)}
                      />
                    ) : null}
                    <span style={{ color: colors.inkSoft }}>{now}</span>
                    <span aria-hidden>→</span>
                    <span style={{ fontWeight: 700 }}>{sug || "no suggestion yet"}</span>
                    {r.claimed ? <span style={ui.muted}>(has an account)</span> : null}
                  </div>
                );
              })}
            </div>
          )}
          {pages > 1 ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                style={ui.secondary}
                disabled={busy || page === 0}
                aria-label="Previous page"
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
                aria-label="Next page"
                onClick={() => {
                  setPage(page + 1);
                  setPicked(new Set());
                }}
              >
                ›
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
      <Toast text={toast} />
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
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <strong style={{ minWidth: 120 }}>{w.word}</strong>
        <span aria-hidden>→</span>
        <input
          style={{ ...ui.input, width: 200 }}
          value={value}
          aria-label={`Spelling for ${w.word}`}
          onChange={(e) => setValue(e.target.value)}
        />
        <button style={ui.secondary} disabled={pending || value.trim() === ""} onClick={save}>
          Save
        </button>
        <span style={ui.muted}>
          {w.kind === "first" ? "first name" : "surname"} · in {plural(w.players, "name")}
        </span>
      </div>
      {error ? <Banner tone="problem" title="Not saved" detail={error} /> : null}
    </div>
  );
}
