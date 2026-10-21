"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Banner, Toast, useToast, type Tone } from "../../feedback";
import { Badge, Empty, Ghost, PageHeader, Pager, Primary, Secondary, Section, SkeletonRows, Stats, Tabs, usePages } from "../../kit";
import { dismissPair, loadDuplicates, loadPairs, mergePairs } from "./actions";

export type Confidence = "sure" | "likely";

export interface DupSide {
  player_id: string;
  first_name: string;
  surname: string;
  gender: "m" | "f" | null;
  birth_year: number | null;
  is_minor: boolean;
  hidden: boolean;
  status: "active" | "pending" | "merged";
  source: string;
  area: string | null;
  claimed_by: string | null;
  matches: number;
  tournaments: string[];
  created_at: string;
}

export interface DupRow {
  a: DupSide;
  b: DupSide;
  /** the row that stays: an account holder's, else the active one with more matches */
  keep: string;
  confidence: Confidence;
  evidence: { key: "exact" | "sound" | "prefix"; shared_tournaments: string[]; matches: number[]; claimed: boolean[] };
}

export interface DupPage {
  counts: { sure: number; likely: number };
  rows: DupRow[] | null;
}

export interface MergePair {
  keep: string;
  drop: string;
}

export interface MergeResult {
  ok: boolean;
  merged: number;
  skipped: (MergePair & { reason: string })[];
  message: string;
}

const PAGE = 25;
/** pairs per call in the bulk merge: small enough for a moving count, big enough to finish quickly */
const CHUNK = 10;
const TABS: { key: Confidence; label: string }[] = [
  { key: "sure", label: "Sure" },
  { key: "likely", label: "Check these" },
];

const KEY_WORDS: Record<DupRow["evidence"]["key"], string> = {
  exact: "Same name",
  sound: "Same name, spelled differently",
  prefix: "First name cut or longer",
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const nameOf = (s: DupSide) => [s.surname, s.first_name].filter(Boolean).join(" ");

type Notice = { tone: Tone; title: string; detail?: string };
type Progress = { done: number; total: number };

/** «Διπλοί παίκτες»: the sure pairs in one go, the rest one by one, side by side. */
export function Duplicates() {
  const [tab, setTab] = useState<Confidence>("sure");
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; data: DupPage } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, run] = useTransition();
  const { toast, notify } = useToast();
  const [tick, setTick] = useState(0);

  const reload = useCallback(async (t: Confidence, p: number) => {
    try {
      const data = await loadDuplicates(t, PAGE, p * PAGE);
      setLoaded({ key: `${t}:${p}`, data });
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "failed");
    }
  }, []);

  useEffect(() => {
    void reload(tab, page);
  }, [tab, page, tick, reload]);

  const data = loaded?.data ?? null;
  const current = loaded?.key === `${tab}:${page}`;
  const rows = current ? (data?.rows ?? []) : [];
  const total = data ? data.counts[tab] : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const sure = data?.counts.sure ?? 0;

  const go = (t: Confidence) => {
    setTab(t);
    setPage(0);
    setConfirmAll(false);
  };

  /** every sure pair, a chunk at a time, with a count that moves */
  const mergeAllSure = () => {
    setConfirmAll(false);
    run(async () => {
      setNotice({ tone: "working", title: "Finding the sure pairs…" });
      let pairs: MergePair[];
      try {
        pairs = await loadPairs("sure");
      } catch (e) {
        setNotice({ tone: "problem", title: "Could not load the pairs", detail: e instanceof Error ? e.message : "failed" });
        return;
      }
      let merged = 0;
      const skipped: MergeResult["skipped"] = [];
      setProgress({ done: 0, total: pairs.length });
      for (let i = 0; i < pairs.length; i += CHUNK) {
        const chunk = pairs.slice(i, i + CHUNK);
        setNotice({ tone: "working", title: `Merging ${Math.min(i + chunk.length, pairs.length)} of ${pairs.length}…`, detail: "Matches, draws, follows and claims move to the row that stays." });
        const r = await mergePairs(chunk, "sure");
        if (!r.ok) {
          setNotice({ tone: "problem", title: `Stopped after ${plural(merged, "merge")}`, detail: r.message });
          setProgress(null);
          setTick((t) => t + 1);
          return;
        }
        merged += r.merged;
        skipped.push(...r.skipped);
        setProgress({ done: Math.min(i + chunk.length, pairs.length), total: pairs.length });
      }
      setProgress(null);
      const text = `Merged ${plural(merged, "pair")}`;
      setNotice(
        skipped.length > 0
          ? { tone: "problem", title: `${text}. ${plural(skipped.length, "pair")} left as they are`, detail: `Changed since the list was made (${[...new Set(skipped.map((s) => s.reason))].slice(0, 3).join(", ")}). They show again below if they still look alike.` }
          : { tone: "done", title: text, detail: "One row per person now. The app shows the change at once." },
      );
      notify(text);
      setTick((t) => t + 1);
    });
  };

  const pager = {
    page,
    pages,
    setPage,
    slice: rows as unknown[],
    from: total ? page * PAGE + 1 : 0,
    to: Math.min(total, page * PAGE + PAGE),
    total,
  };

  const sentence = !data
    ? ""
    : tab === "sure"
      ? sure > 0
        ? `${plural(sure, "pair")} where one row has no match and no account: the same name, or a draw entry that fits only one player of that tournament. Merging them loses nothing.`
        : "No sure pairs. Nothing needs you here."
      : data.counts.likely > 0
        ? "Look at both sides and keep the right row, or say they are two people."
        : "Nothing to check.";

  return (
    <>
      <PageHeader
        title="Διπλοί παίκτες"
        intent="The same person under two roster rows, from imports that spelled a name another way. Merging moves matches, draws, follows, claims and kudos to the row that stays and remembers the other spelling for the next import."
        actions={
          <Link href="/v2/players" className="v2-btn secondary">
            ‹ Players
          </Link>
        }
      />
      <Stats
        items={[
          { label: "sure", value: data ? data.counts.sure : "·", ink: true },
          { label: "to check", value: data ? data.counts.likely : "·" },
        ]}
      />
      {loadError ? <Banner tone="problem" title="Could not load the pairs" detail={loadError} /> : null}
      {notice ? <Banner {...notice} /> : null}
      {progress ? (
        <div className="v2-progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="Merged so far">
          <span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 100}%` }} />
        </div>
      ) : null}

      <Section
        title={TABS.find((t) => t.key === tab)?.label ?? ""}
        aside={<Tabs value={tab} onChange={go} items={TABS.map((t) => ({ value: t.key, label: t.label, count: data?.counts[t.key] }))} />}
      >
        {sentence ? <span className="v2-muted">{sentence}</span> : null}
        <div className={`v2-card${busy ? " busy" : ""}`} aria-busy={busy || undefined}>
          {tab === "sure" && sure > 0 ? (
            confirmAll ? (
              <div className="v2-confirm">
                <b>Merge all {sure}? Each pair becomes one row; the merge is kept in the log.</b>
                <div className="v2-row">
                  <Primary busy={busy} onClick={mergeAllSure}>
                    {busy ? "Merging…" : `Yes, merge all ${sure}`}
                  </Primary>
                  <Ghost disabled={busy} onClick={() => setConfirmAll(false)}>
                    Cancel
                  </Ghost>
                </div>
              </div>
            ) : (
              <div className="v2-row">
                <Primary disabled={busy} onClick={() => setConfirmAll(true)}>
                  Merge all {sure}
                </Primary>
              </div>
            )
          ) : null}

          {!current ? (
            loadError ? (
              <Empty title="Could not load the pairs">Reload the page to try again.</Empty>
            ) : (
              <SkeletonRows rows={8} />
            )
          ) : rows.length === 0 ? (
            <Empty title="All clear">{tab === "sure" ? "No sure pairs right now." : "No pairs to check right now."}</Empty>
          ) : tab === "sure" ? (
            <div className="v2-table-wrap">
              <div className="v2-table-scroll">
                <table className="v2-table">
                  <thead>
                    <tr>
                      <th>Stays</th>
                      <th style={{ width: 24 }} aria-hidden />
                      <th>Goes into it</th>
                      <th>Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const keep = r.keep === r.a.player_id ? r.a : r.b;
                      const drop = r.keep === r.a.player_id ? r.b : r.a;
                      return (
                        <tr key={`${r.a.player_id}:${r.b.player_id}`}>
                          <td>
                            <b>{nameOf(keep)}</b> <Flags s={keep} />
                            <div className="v2-muted">{plural(keep.matches, "match", "matches")}</div>
                          </td>
                          <td aria-hidden>‹</td>
                          <td>
                            {nameOf(drop)} <Flags s={drop} />
                            <div className="v2-muted">{plural(drop.matches, "match", "matches")}</div>
                          </td>
                          <td className="v2-muted">
                            {KEY_WORDS[r.evidence.key]}
                            {r.evidence.shared_tournaments.length > 0 ? ` · both in ${r.evidence.shared_tournaments.join(", ")}` : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager p={pager as ReturnType<typeof usePages<unknown>>} noun="pairs" />
            </div>
          ) : (
            <div className="v2-stack">
              {rows.map((r) => (
                <PairCard key={`${r.a.player_id}:${r.b.player_id}`} r={r} busy={busy} onNotice={setNotice} notify={notify} onDone={() => setTick((t) => t + 1)} />
              ))}
              <Pager p={pager as ReturnType<typeof usePages<unknown>>} noun="pairs" />
            </div>
          )}
        </div>
      </Section>
      <Toast text={toast} />
    </>
  );
}

function Flags({ s }: { s: DupSide }) {
  return (
    <>
      {s.claimed_by ? <Badge tone="ink">Account: {s.claimed_by}</Badge> : null}
      {s.is_minor ? <Badge tone="attention">Minor</Badge> : null}
      {s.hidden ? <Badge>Hidden</Badge> : null}
      {s.status === "pending" ? <Badge>Added by a user</Badge> : null}
    </>
  );
}

/** one side of a pair, everything that tells two people apart */
function Side({ s, suggested }: { s: DupSide; suggested: boolean }) {
  const facts = [
    s.area,
    s.gender === "m" ? "man" : s.gender === "f" ? "woman" : null,
    s.birth_year ? `born ${s.birth_year}` : null,
    s.source === "import" ? "from a sheet" : s.source === "user" ? "typed by a user" : "roster",
  ].filter(Boolean);
  return (
    <div className="v2-stack" style={{ gap: 4, flex: 1, minWidth: 220 }}>
      <b style={{ fontSize: 17 }}>
        {nameOf(s)} {suggested ? <Badge tone="done">Suggested to stay</Badge> : null}
      </b>
      <div className="v2-row" style={{ gap: 6 }}>
        <Flags s={s} />
      </div>
      <span className="v2-muted">{facts.join(" · ")}</span>
      <span>{plural(s.matches, "match", "matches")}</span>
      <span className="v2-muted">{s.tournaments.length > 0 ? s.tournaments.join(", ") : "No tournaments"}</span>
    </div>
  );
}

function PairCard({ r, busy, onNotice, notify, onDone }: { r: DupRow; busy: boolean; onNotice: (n: Notice) => void; notify: (t: string) => void; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  // an account holder's row always stays, and two account holders are two people
  const twoAccounts = !!r.a.claimed_by && !!r.b.claimed_by;

  const keep = (stay: DupSide, go: DupSide) => {
    onNotice({ tone: "working", title: `Merging ${nameOf(go)} into ${nameOf(stay)}…` });
    start(async () => {
      const res = await mergePairs([{ keep: stay.player_id, drop: go.player_id }], "likely");
      if (!res.ok || res.merged === 0) {
        onNotice({ tone: "problem", title: `${nameOf(go)}: not merged`, detail: res.skipped[0]?.reason ?? res.message });
        return;
      }
      onNotice({ tone: "done", title: `Merged into ${nameOf(stay)}`, detail: "The other spelling now finds this player in imports." });
      notify("Merged");
      setGone(true);
      onDone();
    });
  };

  const apart = () => {
    onNotice({ tone: "working", title: "Keeping them apart…" });
    start(async () => {
      const res = await dismissPair(r.a.player_id, r.b.player_id);
      if (!res.ok) {
        onNotice({ tone: "problem", title: "Not saved", detail: res.message });
        return;
      }
      onNotice({ tone: "done", title: `${nameOf(r.a)} and ${nameOf(r.b)} are two people`, detail: "This pair will not be suggested again." });
      notify("Kept apart");
      setGone(true);
      onDone();
    });
  };

  if (gone) return null;
  return (
    <div className={`v2-card${pending ? " busy" : ""}`} aria-busy={pending || undefined}>
      <span className="v2-muted">
        {KEY_WORDS[r.evidence.key]}
        {r.evidence.shared_tournaments.length > 0 ? ` · both in ${r.evidence.shared_tournaments.join(", ")}` : ""}
      </span>
      <div className="v2-row" style={{ alignItems: "flex-start", gap: 24 }}>
        <Side s={r.a} suggested={r.keep === r.a.player_id} />
        <Side s={r.b} suggested={r.keep === r.b.player_id} />
      </div>
      <div className="v2-row">
        <Secondary small busy={pending} disabled={busy || pending || twoAccounts || !!r.b.claimed_by} onClick={() => keep(r.a, r.b)}>
          Keep {nameOf(r.a)}
        </Secondary>
        <Secondary small disabled={busy || pending || twoAccounts || !!r.a.claimed_by} onClick={() => keep(r.b, r.a)}>
          Keep {nameOf(r.b)}
        </Secondary>
        <Ghost small disabled={busy || pending} onClick={apart}>
          Not the same person
        </Ghost>
      </div>
    </div>
  );
}
