"use client";
import { useEffect, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { colors, ui } from "../ui";
import { Banner, Toast, useToast } from "../feedback";
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

const humanize = (k: string) => k.replace(/_/g, " ");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** a value in a few plain words; objects show their main fields */
function words(v: unknown): string {
  if (v === null || v === undefined || v === "") return "none";
  if (Array.isArray(v)) return v.length === 0 ? "none" : v.map(words).join(", ");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x === null || typeof x !== "object")
      .slice(0, 4)
      .map(([k, x]) => `${humanize(k)} ${words(x)}`)
      .join(", ");
  }
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v);
}

/** the raw data under a small disclosure, for anyone who wants every field */
function Details({ value }: { value: unknown }) {
  if (value === null || value === undefined || (typeof value === "object" && Object.keys(value as object).length === 0)) return null;
  return (
    <details style={{ fontSize: 13 }}>
      <summary style={{ cursor: "pointer", color: colors.inkSoft }}>Details</summary>
      <pre style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

function pointsLines(p: Record<string, unknown>): string[] {
  const n = (k: string) => Number(p[k]);
  const known = new Set(["correct", "upset", "chain", "daily_quiz", "freeze_max", "free_freeze_every_votes", "first_free_freeze_at_streak", "upset_share_max", "upset_min_votes", "streak_milestones"]);
  const out: string[] = [];
  if ("correct" in p) out.push(`A right pick: ${n("correct")} points`);
  if ("upset" in p) out.push(`Calling an upset: ${n("upset")} more`);
  if ("chain" in p) out.push(`Each right pick in a row after the first: ${n("chain")} more`);
  if ("daily_quiz" in p) out.push(`Finishing the daily questions: ${n("daily_quiz")} points`);
  if ("upset_share_max" in p) out.push(`A pick counts as an upset when ${Math.round(n("upset_share_max") * 100)}% or fewer of the votes chose it`);
  if ("upset_min_votes" in p) out.push(`An upset needs at least ${plural(n("upset_min_votes"), "vote")} on the match`);
  for (const [k, v] of Object.entries(p)) if (!known.has(k)) out.push(`${humanize(k)}: ${words(v)}`);
  return out;
}

function streakLines(p: Record<string, unknown>): string[] {
  const n = (k: string) => Number(p[k]);
  const out: string[] = [];
  if (Array.isArray(p.streak_milestones)) out.push(`A σερί celebrates at ${(p.streak_milestones as number[]).join(", ")} in a row`);
  if ("freeze_max" in p) out.push(`A player can hold up to ${plural(n("freeze_max"), "freeze")} at once (a freeze saves a σερί for a missed day)`);
  if ("first_free_freeze_at_streak" in p) out.push(`The first free freeze comes at a σερί of ${n("first_free_freeze_at_streak")}`);
  if ("free_freeze_every_votes" in p) out.push(`After that, a free freeze every ${plural(n("free_freeze_every_votes"), "vote")}`);
  return out;
}

const PERIOD: Record<string, string> = { daily: "every day", weekly: "every week", once: "one time only" };

function rewardWords(r: unknown): string {
  if (!r || typeof r !== "object") return "no reward";
  const x = r as { cosmeticIds?: string[]; badgeId?: string; badgeAmount?: number };
  const parts: string[] = [];
  if (x.badgeId) parts.push(`${x.badgeAmount ?? 1} toward the “${humanize(x.badgeId)}” badge`);
  if (x.cosmeticIds?.length) parts.push(`a look to unlock (${x.cosmeticIds.map(humanize).join(", ")})`);
  return parts.length ? parts.join(" and ") : words(r);
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section style={{ ...ui.card, display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{title}</h2>
      {hint ? <p style={ui.muted}>{hint}</p> : null}
      {children}
    </section>
  );
}

function Lines({ items }: { items: string[] }) {
  if (items.length === 0) return <p style={ui.muted}>Nothing is set here.</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4, fontSize: 15 }}>
      {items.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );
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

const MOVE = { promote: "↑", relegate: "↓", stay: "=" } as const;

function leagueLines(l: Record<string, unknown>): string[] {
  const n = (k: string) => Number(l[k]);
  const known = new Set(["group_size", "promote_top", "relegate_from", "award_top"]);
  const out: string[] = [];
  if ("group_size" in l) out.push(`Each league group has ${plural(n("group_size"), "player")}`);
  if ("promote_top" in l) out.push(`The top ${n("promote_top")} move up at the end of the month`);
  if ("relegate_from" in l && "group_size" in l) out.push(`From place ${n("relegate_from")} down, players move down`);
  if ("award_top" in l) out.push(`The top ${n("award_top")} get an award`);
  for (const [k, v] of Object.entries(l)) if (!known.has(k)) out.push(`${humanize(k)}: ${words(v)}`);
  return out;
}

function quizLines(q: Record<string, unknown>): string[] {
  const known = new Set(["free", "pro", "required", "resets"]);
  const out: string[] = [];
  if ("free" in q) out.push(`Free players get ${plural(Number(q.free), "question")} a day`);
  if ("pro" in q) out.push(`Pro players get ${Number(q.pro)} a day`);
  if ("required" in q) out.push(`${Number(q.required)} answers finish the day`);
  if ("resets" in q) out.push(`A new day starts at ${String(q.resets).replace("Athens", "Athens time")}`);
  for (const [k, v] of Object.entries(q)) if (!known.has(k)) out.push(`${humanize(k)}: ${words(v)}`);
  return out;
}

/** The game's rules in sentences, read-only, plus the month close at the bottom. */
export function Game() {
  const [cfg, setCfg] = useState<GameConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig()
      .then(setCfg)
      .catch((e: Error) => setError(e.message));
  }, []);

  const points = cfg?.points ?? {};
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={ui.h1}>Game</h1>
        <p style={ui.muted}>These are the game’s rules. They change in code, so this page only shows them. Nothing here needs you.</p>
      </div>
      {error ? <Banner tone="problem" title="Couldn’t load the rules" detail={error} /> : null}
      {cfg === null && !error ? <p style={ui.muted}>Loading…</p> : null}
      {cfg ? (
        <>
          <Section title="Points">
            <Lines items={pointsLines(points)} />
          </Section>
          <Section title="σερί and freezes">
            <Lines items={streakLines(points)} />
          </Section>
          <Section title="Quests">
            {(cfg.quests ?? []).length === 0 ? <p style={ui.muted}>There are no quests.</p> : null}
            {(cfg.quests ?? []).map((q) => (
              <div key={q.key} style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 8, borderBottom: `1px solid ${colors.mist}` }}>
                <strong>
                  {q.title_el}
                  {q.active ? "" : " (switched off)"}
                </strong>
                <span style={{ fontSize: 15 }}>
                  What to do: {humanize(q.key).includes("invite") ? "bring friends who join" : "do it"} {q.target} {q.target === 1 ? "time" : "times"}, {PERIOD[q.period] ?? q.period}.
                </span>
                <span style={{ fontSize: 15 }}>Reward: {rewardWords(q.reward)}.</span>
                <Details value={{ triggers: q.triggers, reward: q.reward }} />
              </div>
            ))}
          </Section>
          <Section title="Badges">
            {(cfg.badges ?? []).length === 0 ? <p style={ui.muted}>There are no badges.</p> : null}
            {(cfg.badges ?? []).map((b) => (
              <div key={b.key} style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 8, borderBottom: `1px solid ${colors.mist}` }}>
                <strong>{b.name_el}</strong>
                <span style={{ fontSize: 15 }}>
                  Counts {humanize(b.counter)}. Tiers at {(b.thresholds ?? []).join(", ") || "none"}.
                  {b.on_card ? " Shown on the player card." : ""}
                </span>
                {b.tier3_reward ? <Details value={{ top_tier_reward: b.tier3_reward }} /> : null}
              </div>
            ))}
          </Section>
          <Section title="Unlock ladder" hint="What opens as a player does more.">
            {(cfg.unlocks ?? []).length === 0 ? <p style={ui.muted}>There are no unlock steps.</p> : null}
            {(cfg.unlocks ?? []).map((u) => {
              const need = (u.primary ?? []).map((c) => `${humanize(c.counter)} at least ${c.min}`).join(" and ");
              return (
                <div key={u.key} style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 8, borderBottom: `1px solid ${colors.mist}` }}>
                  <strong>
                    Step {u.step}: {u.title_el}
                  </strong>
                  <span style={{ fontSize: 15 }}>
                    {need ? `Opens when: ${need}` : "Opens right away"}
                    {u.backup_votes ? `, or after ${plural(u.backup_votes, "vote")}` : ""}.
                  </span>
                  <span style={{ fontSize: 15 }}>What opens: {(u.features ?? []).map(humanize).join(", ") || "nothing new"}.</span>
                </div>
              );
            })}
          </Section>
          <Section title="Leagues">
            <Lines items={leagueLines(cfg.league)} />
          </Section>
          <Section title="Daily questions">
            <Lines items={quizLines(cfg.quiz)} />
          </Section>
        </>
      ) : null}
      <MonthClose />
    </div>
  );
}

function MonthClose() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [result, setResult] = useState<LeaguePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [closing, close] = useTransition();
  const { toast, notify } = useToast();

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

  const doClose = () =>
    close(async () => {
      const r: ActionResult = await closeMonth();
      setConfirm(false);
      if (r.ok) notify(r.message.replace("Closed:", "Month closed for"));
      else setError(r.message);
    });

  return (
    <Section title="Close this month now">
      <p style={ui.muted}>
        Ends this month’s leagues now: moves players up and down and gives the month’s rewards. Normally it happens by itself on the 1st. Use it only for a demo.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...ui.input, width: 140 }}
          value={month}
          placeholder="YYYY-MM"
          aria-label="Month to look at"
          maxLength={7}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button style={confirm ? ui.secondary : ui.primary} disabled={pending || !/^\d{4}-\d{2}$/.test(month)} onClick={run}>
          See what closing would do
        </button>
        {!confirm ? (
          <button style={ui.secondary} disabled={closing} onClick={() => setConfirm(true)}>
            Close this month now
          </button>
        ) : null}
      </div>
      <span style={ui.muted}>Looking first writes nothing.</span>
      {confirm ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Banner tone="problem" title="Close this month now?" detail="Moves and rewards are final for the month. This can’t be undone." />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={ui.primary} disabled={closing} onClick={doClose}>
              Yes, close this month
            </button>
            <button style={ui.secondary} disabled={closing} onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {closing ? <Banner tone="working" title="Closing the month…" /> : null}
      {error ? <Banner tone="problem" title="Something went wrong" detail={error} /> : null}
      {result && result.groups.length === 0 ? <p style={ui.muted}>There are no leagues for {result.month}.</p> : null}
      {result?.groups.map((g) => (
        <div key={`${g.tier}-${g.group_no}`} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <strong>
            {g.tier} {g.group_no}
            {g.closed ? " (already closed)" : ""}
          </strong>
          <Table
            head={["Place", "Name", "Points", "Moves", "Award"]}
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
      <Toast text={toast} />
    </Section>
  );
}
