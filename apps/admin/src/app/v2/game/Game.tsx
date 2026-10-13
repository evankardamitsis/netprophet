"use client";
import { useEffect, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { colors, ui } from "../ui";
import { closeMonth, leaguePreview, loadConfig, type ActionResult } from "./actions";

interface Condition {
  counter: string;
  min: number;
}

export interface GameConfig {
  points: Record<string, unknown> | null;
  quests: { key: string; period: string; target: number; title_el: string; triggers: unknown; reward: unknown; active: boolean }[] | null;
  badges: { key: string; name_el: string; counter: string; thresholds: number[]; on_card: boolean; tier3_reward: unknown }[] | null;
  unlocks:
    | { key: string; step: number; title_el: string; primary: Condition[] | null; backup_votes: number | null; features: string[]; celebrate: boolean }[]
    | null;
  league: Record<string, number>;
  quiz: Record<string, string | number>;
}

export interface LeaguePreview {
  month: string;
  groups: {
    tier: string;
    group_no: number;
    closed: boolean;
    rows:
      | {
          userId: string;
          position: number;
          movement: "promote" | "relegate" | "stay";
          nextLeague: string;
          topThreeAward: boolean;
          name: string | null;
          points: number;
        }[]
      | null;
  }[];
}

const th: CSSProperties = { textAlign: "left", padding: "6px 10px", fontSize: 13, borderBottom: `2px solid ${colors.ink}` };
const td: CSSProperties = { padding: "6px 10px", fontSize: 14, borderBottom: `1px solid ${colors.mist}`, verticalAlign: "top" };

function show(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} style={td}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ ...ui.card, display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

const MOVE = { promote: "↑", relegate: "↓", stay: "=" } as const;

/** Game settings, read-only, plus the month close dry run and the month close. */
export function Game() {
  const [cfg, setCfg] = useState<GameConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [closing, close] = useTransition();

  useEffect(() => {
    loadConfig()
      .then(setCfg)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={ui.h1}>Game</h1>
        <button
          style={ui.secondary}
          disabled={closing}
          onClick={() => {
            if (!window.confirm("Close this month now? Promotions, relegations and awards are final for the month.")) return;
            close(async () => setNotice(await closeMonth()));
          }}
        >
          Close this month now
        </button>
      </div>
      <div style={{ ...ui.card, background: colors.ink, color: colors.paper }}>
        Read-only. The rules live in packages/core and change in code, with the shared test vectors.
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
          <span>
            <strong>League:</strong> {notice.message}
          </span>
          <button style={ui.link} onClick={() => setNotice(null)}>
            Close
          </button>
        </div>
      ) : null}
      {error ? <p style={ui.error}>{error}</p> : null}
      {cfg === null && !error ? <p style={ui.muted}>Loading.</p> : null}
      {cfg ? (
        <>
          <Section title="Points rules">
            <Table head={["Rule", "Value"]} rows={Object.entries(cfg.points ?? {}).map(([k, v]) => [<code key={k}>{k}</code>, show(v)])} />
          </Section>
          <Section title="Quests">
            <Table
              head={["Key", "Period", "Target", "Reward", "Active"]}
              rows={(cfg.quests ?? []).map((q) => [
                <span key="k">
                  <code>{q.key}</code>
                  <br />
                  <span style={ui.muted}>{q.title_el}</span>
                </span>,
                q.period,
                q.target,
                show(q.reward),
                q.active ? "✓" : "",
              ])}
            />
          </Section>
          <Section title="Badges">
            <Table
              head={["Key", "Name", "Counter", "Thresholds", "On card"]}
              rows={(cfg.badges ?? []).map((b) => [
                <code key="k">{b.key}</code>,
                b.name_el,
                b.counter,
                (b.thresholds ?? []).join(", "),
                b.on_card ? "✓" : "",
              ])}
            />
          </Section>
          <Section title="Unlock ladder">
            <Table
              head={["Step", "Key", "Conditions", "Backup votes", "Features"]}
              rows={(cfg.unlocks ?? []).map((u) => [
                u.step,
                <span key="k">
                  <code>{u.key}</code>
                  <br />
                  <span style={ui.muted}>{u.title_el}</span>
                </span>,
                (u.primary ?? []).map((c) => `${c.counter} ≥ ${c.min}`).join(" and ") || "none",
                u.backup_votes ?? "",
                (u.features ?? []).join(", "),
              ])}
            />
          </Section>
          <Section title="League">
            <Table head={["Constant", "Value"]} rows={Object.entries(cfg.league).map(([k, v]) => [<code key={k}>{k}</code>, show(v)])} />
          </Section>
          <Section title="Quiz">
            <Table head={["Constant", "Value"]} rows={Object.entries(cfg.quiz).map(([k, v]) => [<code key={k}>{k}</code>, show(v)])} />
          </Section>
        </>
      ) : null}
      <DryRun />
    </div>
  );
}

function DryRun() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [result, setResult] = useState<LeaguePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      try {
        setResult(await leaguePreview(month));
        setError(null);
      } catch (e) {
        setResult(null);
        setError(e instanceof Error ? e.message : "failed");
      }
    });

  return (
    <Section title="Month close dry run">
      <p style={ui.muted}>Nothing is written.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...ui.input, width: 140 }}
          value={month}
          placeholder="YYYY-MM"
          aria-label="Month"
          maxLength={7}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button style={ui.primary} disabled={pending || !/^\d{4}-\d{2}$/.test(month)} onClick={run}>
          Run dry run
        </button>
      </div>
      {error ? <p style={ui.error}>{error}</p> : null}
      {result && result.groups.length === 0 ? <p style={ui.muted}>No leagues for {result.month}.</p> : null}
      {result?.groups.map((g) => (
        <div key={`${g.tier}-${g.group_no}`} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <strong>
            {g.tier} {g.group_no}
            {g.closed ? " (already closed)" : ""}
          </strong>
          <Table
            head={["#", "Name", "Points", "Move", "Award"]}
            rows={(g.rows ?? []).map((r) => [
              r.position,
              r.name ?? r.userId,
              r.points,
              `${MOVE[r.movement] ?? "="}${r.movement === "stay" ? "" : ` ${r.nextLeague}`}`,
              r.topThreeAward ? "✓" : "",
            ])}
          />
        </div>
      ))}
    </Section>
  );
}
