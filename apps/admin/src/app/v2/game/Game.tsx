"use client";
import { useEffect, useState, useTransition } from "react";
import { Banner, Toast, useToast, type Tone } from "../feedback";
import { Badge, Card, Empty, PageHeader, Primary, Secondary, Section, SkeletonCards, SkeletonRows, Stats, Table, Tabs } from "../kit";
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

type Quest = NonNullable<GameConfig["quests"]>[number];
type GameBadge = NonNullable<GameConfig["badges"]>[number];
type Unlock = NonNullable<GameConfig["unlocks"]>[number];
type LeagueRow = NonNullable<LeaguePreview["groups"][number]["rows"]>[number];
type Notice = { tone: Tone; title: string; detail?: string };

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
    <details className="v2-muted">
      <summary style={{ cursor: "pointer" }}>Details</summary>
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
  if (p.level && typeof p.level === "object") {
    const l = p.level as Record<string, unknown>;
    out.push(`Levels go from ${Number(l.min ?? 1)} to ${Number(l.max ?? 7)}, shown in halves; match results move them, the crowd only a little (see docs/v2/level-algorithm.md)`);
  }
  for (const [k, v] of Object.entries(p)) if (!known.has(k) && k !== "level") out.push(`${humanize(k)}: ${words(v)}`);
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

function Lines({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="v2-muted">Nothing is set here.</span>;
  return (
    <ul className="v2-stack" style={{ margin: 0, paddingLeft: 20, gap: 4 }}>
      {items.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );
}

/** one block of rules: a small card with its sentences */
function RuleCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <h3 className="v2-h3">{title}</h3>
      <Lines items={items} />
    </Card>
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

type Tab = "quests" | "badges" | "unlocks";

/** The game's rules in sentences, read-only, plus the month close at the bottom. */
export function Game() {
  const [cfg, setCfg] = useState<GameConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("quests");

  useEffect(() => {
    loadConfig()
      .then(setCfg)
      .catch((e: Error) => setError(e.message));
  }, []);

  const points = cfg?.points ?? {};
  const quests = cfg?.quests ?? [];
  const badges = cfg?.badges ?? [];
  const unlocks = cfg?.unlocks ?? [];
  const loading = cfg === null && !error;
  const dot = (n: number) => (cfg ? n : "·");

  return (
    <>
      <PageHeader title="Game" intent="The game’s rules in plain words. They change in code, so this page only shows them. Nothing here needs you." />
      {error ? <Banner tone="problem" title="Couldn’t load the rules" detail={error} /> : null}
      <Stats
        items={[
          { label: "quests switched on", value: dot(quests.filter((q) => q.active).length), ink: true },
          { label: "quests in all", value: dot(quests.length) },
          { label: "badges", value: dot(badges.length) },
          { label: "unlock steps", value: dot(unlocks.length) },
        ]}
      />
      <Section title="Rules">
        {loading ? (
          <SkeletonCards count={4} />
        ) : cfg ? (
          <div className="v2-grid">
            <RuleCard title="Points" items={pointsLines(points)} />
            <RuleCard title="σερί and freezes" items={streakLines(points)} />
            <RuleCard title="Leagues" items={leagueLines(cfg.league)} />
            <RuleCard title="Daily questions" items={quizLines(cfg.quiz)} />
          </div>
        ) : (
          <Card>
            <Empty title="No rules to show">They could not be loaded. Reload the page to try again.</Empty>
          </Card>
        )}
      </Section>
      <Section
        title={tab === "quests" ? "Quests" : tab === "badges" ? "Badges" : "Unlock ladder"}
        aside={
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "quests", label: "Quests", count: quests.length },
              { value: "badges", label: "Badges", count: badges.length },
              { value: "unlocks", label: "Unlock ladder", count: unlocks.length },
            ]}
          />
        }
      >
        <span className="v2-muted">
          {tab === "quests"
            ? "Small goals a player can finish for a reward."
            : tab === "badges"
              ? "Badges grow in tiers as a player keeps doing something."
              : "What opens as a player does more."}
        </span>
        {loading ? (
          <SkeletonRows rows={6} />
        ) : tab === "quests" ? (
          <Table<Quest>
            key="quests"
            rows={quests}
            rowKey={(q) => q.key}
            pageSize={20}
            noun="quests"
            empty={<Empty title="There are no quests" />}
            columns={[
              {
                key: "title",
                label: "Quest",
                render: (q) => (
                  <span className="v2-row">
                    <b>{q.title_el}</b>
                    {q.active ? null : <Badge>Switched off</Badge>}
                  </span>
                ),
              },
              {
                key: "do",
                label: "What to do",
                render: (q) =>
                  `${humanize(q.key).includes("invite") ? "Bring friends who join" : "Do it"} ${q.target} ${q.target === 1 ? "time" : "times"}, ${PERIOD[q.period] ?? q.period}.`,
              },
              { key: "reward", label: "Reward", render: (q) => `${rewardWords(q.reward)}.` },
              { key: "details", label: "", render: (q) => <Details value={{ triggers: q.triggers, reward: q.reward }} /> },
            ]}
          />
        ) : tab === "badges" ? (
          <Table<GameBadge>
            key="badges"
            rows={badges}
            rowKey={(b) => b.key}
            pageSize={20}
            noun="badges"
            empty={<Empty title="There are no badges" />}
            columns={[
              { key: "name", label: "Badge", render: (b) => <b>{b.name_el}</b> },
              { key: "counts", label: "Counts", render: (b) => humanize(b.counter) },
              { key: "tiers", label: "Tiers at", render: (b) => (b.thresholds ?? []).join(", ") || "none" },
              { key: "card", label: "On the player card", render: (b) => (b.on_card ? "✓" : "") },
              { key: "details", label: "", render: (b) => (b.tier3_reward ? <Details value={{ top_tier_reward: b.tier3_reward }} /> : null) },
            ]}
          />
        ) : (
          <Table<Unlock>
            key="unlocks"
            rows={unlocks}
            rowKey={(u) => u.key}
            pageSize={20}
            noun="steps"
            empty={<Empty title="There are no unlock steps" />}
            columns={[
              { key: "step", label: "Step", num: true, width: 60, render: (u) => u.step },
              { key: "title", label: "Name", render: (u) => <b>{u.title_el}</b> },
              {
                key: "when",
                label: "Opens when",
                render: (u) => {
                  const need = (u.primary ?? []).map((c) => `${humanize(c.counter)} at least ${c.min}`).join(" and ");
                  return `${need || "Right away"}${u.backup_votes ? `, or after ${plural(u.backup_votes, "vote")}` : ""}`;
                },
              },
              { key: "opens", label: "What opens", render: (u) => (u.features ?? []).map(humanize).join(", ") || "nothing new" },
            ]}
          />
        )}
      </Section>
      <MonthClose />
    </>
  );
}

function MonthClose() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [result, setResult] = useState<LeaguePreview | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [closing, close] = useTransition();
  const { toast, notify } = useToast();

  const run = () => {
    setNotice({ tone: "working", title: `Looking at ${month}…`, detail: "Working out who moves up and down. Nothing is written." });
    start(async () => {
      try {
        const r = await leaguePreview(month);
        setResult(r);
        setNotice(null);
      } catch (e) {
        setResult(null);
        setNotice({ tone: "problem", title: "Couldn’t look at that month", detail: e instanceof Error ? e.message : "failed" });
      }
    });
  };

  const doClose = () => {
    setNotice({ tone: "working", title: "Closing the month…", detail: "Moving players up and down and giving the month’s rewards." });
    close(async () => {
      const r: ActionResult = await closeMonth();
      setConfirm(false);
      if (r.ok) {
        const text = r.message.replace("Closed:", "Month closed for");
        setNotice({ tone: "done", title: text });
        notify(text);
      } else {
        setNotice({ tone: "problem", title: "The month was not closed", detail: r.message });
      }
    });
  };

  const valid = /^\d{4}-\d{2}$/.test(month);
  const working = pending || closing;

  return (
    <Section title="Close this month now">
      <div className={`v2-card v2-enter${working ? " busy" : ""}`} aria-busy={working || undefined}>
        <span className="v2-muted">
          Ends this month’s leagues now: moves players up and down and gives the month’s rewards. Normally it happens by itself on the 1st. Use it only for a demo.
        </span>
        <div className="v2-row" style={{ alignItems: "flex-end" }}>
          <label className="v2-field" style={{ width: 160 }}>
            Month to look at
            <input className="v2-input" value={month} placeholder="YYYY-MM" maxLength={7} onChange={(e) => setMonth(e.target.value)} />
          </label>
          <Primary busy={pending} disabled={!valid || closing} onClick={run}>
            {pending ? "Looking…" : "See what closing would do"}
          </Primary>
          {!confirm ? (
            <Secondary disabled={working} onClick={() => setConfirm(true)}>
              Close this month now
            </Secondary>
          ) : null}
        </div>
        <span className="v2-muted">Looking first writes nothing.</span>
        {confirm ? (
          <div className="v2-confirm">
            <b>Close this month now?</b>
            <span className="v2-muted">Moves and rewards are final for the month. This can’t be undone.</span>
            <div className="v2-row">
              <Secondary small busy={closing} disabled={pending} onClick={doClose}>
                {closing ? "Closing…" : "Yes, close this month"}
              </Secondary>
              <Secondary small disabled={closing} onClick={() => setConfirm(false)}>
                Cancel
              </Secondary>
            </div>
          </div>
        ) : null}
        {notice ? <Banner {...notice} /> : null}
      </div>
      {pending ? (
        <SkeletonRows rows={8} />
      ) : result && result.groups.length === 0 ? (
        <Card>
          <Empty title={`There are no leagues for ${result.month}`}>Nothing would change if this month closed.</Empty>
        </Card>
      ) : (
        result?.groups.map((g) => (
          <div key={`${g.tier}-${g.group_no}`} className="v2-stack v2-enter">
            <div className="v2-row">
              <h3 className="v2-h3">
                {g.tier} {g.group_no}
              </h3>
              {g.closed ? <Badge tone="done">✓ Already closed</Badge> : null}
            </div>
            <Table<LeagueRow>
              rows={g.rows ?? []}
              rowKey={(r) => r.userId}
              pageSize={20}
              noun="players"
              empty={<Empty title="No players in this group" />}
              columns={[
                { key: "place", label: "Place", num: true, width: 70, render: (r) => r.position },
                { key: "name", label: "Name", render: (r) => r.name ?? r.userId },
                { key: "points", label: "Points", num: true, render: (r) => r.points },
                { key: "moves", label: "Moves", render: (r) => `${MOVE[r.movement] ?? "="}${r.movement === "stay" ? "" : ` ${r.nextLeague}`}` },
                { key: "award", label: "Award", render: (r) => (r.topThreeAward ? "✓" : "") },
              ]}
            />
          </div>
        ))
      )}
      <Toast text={toast} />
    </Section>
  );
}
