"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Banner, Toast, useToast, type Tone } from "../feedback";
import { Badge, Empty, Ghost, PageHeader, Pager, Primary, Secondary, Section, SkeletonRows, Stats, Table, Tabs, usePages } from "../kit";
import { applyNames, loadPass, saveSpelling } from "./actions";

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

/** names per page, fetched page by page from the server */
const PAGE = 25;
const TABS: { key: Confidence; label: string }[] = [
  { key: "high", label: "Ready to fix" },
  { key: "review", label: "Check these" },
  { key: "missing", label: "We don’t know these yet" },
];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const join = (a: string | null, b: string | null) => [a, b].filter(Boolean).join(" ");

/** a title-cased guess of a capitalised word, hyphen and space aware, accents untouched */
function titleCase(w: string): string {
  return w.toLowerCase().replace(/(^|[\s'-])(\S)/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

type Notice = { tone: Tone; title: string; detail?: string };

/** Names in capitals: tabs, suggested spellings, words to teach. */
export function Names() {
  const [tab, setTab] = useState<Confidence>("high");
  const [page, setPage] = useState(0);
  /** the last page that came back, and which tab and page it is for */
  const [loaded, setLoaded] = useState<{ key: string; pass: NamePass } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirmAll, setConfirmAll] = useState(false);
  const [applying, setApplying] = useState<"all" | "picked" | null>(null);
  const [busy, run] = useTransition();
  const { toast, notify } = useToast();

  const reload = useCallback(async (t: Confidence, p: number) => {
    try {
      const pass = await loadPass(t, PAGE, p * PAGE);
      setLoaded({ key: `${t}:${p}`, pass });
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "failed");
    }
  }, []);

  /** bumped after a change so the one loader above fetches the tab and page on screen now */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    void reload(tab, page);
  }, [tab, page, tick, reload]);

  const data = loaded?.pass ?? null;
  /** rows on screen belong to this tab and page; otherwise they are on their way */
  const current = loaded?.key === `${tab}:${page}`;
  const rows = current ? (data?.rows ?? []) : [];
  const words = current ? (data?.words ?? []) : [];
  const total = data ? data.counts[tab] : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.player_id));

  const go = (t: Confidence) => {
    setTab(t);
    setPage(0);
    setPicked(new Set());
    setConfirmAll(false);
  };

  const turn = (p: number) => {
    setPage(p);
    setPicked(new Set());
  };

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const apply = (ids: string[] | null) => {
    const count = ids ? ids.length : (data?.counts.high ?? 0);
    setApplying(ids ? "picked" : "all");
    setNotice({ tone: "working", title: `Renaming ${plural(count, "player")}…`, detail: "Applying the suggested spellings." });
    run(async () => {
      const r = await applyNames(ids);
      setConfirmAll(false);
      setPicked(new Set());
      if (r.ok) {
        const text = r.message.replace("Applied", "Fixed");
        setNotice({ tone: "done", title: text, detail: "The new spellings show in the app now." });
        notify(text);
      } else {
        setNotice({ tone: "problem", title: "The names were not fixed", detail: r.message });
      }
      setTick((t) => t + 1);
      setApplying(null);
    });
  };

  const ready = data?.counts.high ?? 0;
  const waiting = data ? data.counts.review + data.counts.missing : 0;
  const sentence = !data
    ? ""
    : ready > 0
      ? `${plural(ready, "name")} can be fixed now.`
      : waiting > 0
        ? "Nothing is ready to fix. Teach us the words below and more names will become ready."
        : "All names are done. Nothing needs you.";

  // the kit pager, driven by the server's pages
  const pager = {
    page,
    pages,
    setPage: turn,
    slice: rows as unknown[],
    from: total ? page * PAGE + 1 : 0,
    to: Math.min(total, page * PAGE + PAGE),
    total,
  };

  const ticks = tab !== "missing";

  return (
    <>
      <PageHeader
        title="Names in capitals"
        intent="Old and imported names come in capitals (ΠΑΠΑΔΟΠΟΥΛΟΣ); here they get the normal spelling (Παπαδόπουλος), with only capitals and accents changing, never letters."
      />
      <Stats
        items={[
          { label: "ready to fix", value: data ? data.counts.high : "·", ink: true },
          { label: "to check", value: data ? data.counts.review : "·" },
          { label: "with words we don’t know yet", value: data ? data.counts.missing : "·" },
        ]}
      />
      {loadError ? <Banner tone="problem" title="Could not load the names" detail={loadError} /> : null}
      {notice ? <Banner {...notice} /> : null}

      <Section
        title={TABS.find((t) => t.key === tab)?.label ?? ""}
        aside={<Tabs value={tab} onChange={go} items={TABS.map((t) => ({ value: t.key, label: t.label, count: data?.counts[t.key] }))} />}
      >
        {sentence ? <span className="v2-muted">{sentence}</span> : null}

        {data && tab !== "high" && current && words.length > 0 ? <Words words={words} onNotice={setNotice} notify={notify} onSaved={() => setTick((t) => t + 1)} /> : null}

        <div className={`v2-card${busy ? " busy" : ""}`} aria-busy={busy || undefined}>
          {tab === "high" && ready > 0 ? (
            confirmAll ? (
              <div className="v2-confirm">
                <b>Fix all {ready}? This renames {plural(ready, "player")} in the app.</b>
                <div className="v2-row">
                  <Primary busy={applying === "all"} disabled={busy} onClick={() => apply(null)}>
                    {applying === "all" ? "Applying…" : `Yes, fix all ${ready}`}
                  </Primary>
                  <Ghost disabled={busy} onClick={() => setConfirmAll(false)}>
                    Cancel
                  </Ghost>
                </div>
              </div>
            ) : (
              <div className="v2-row">
                <Primary disabled={busy} onClick={() => setConfirmAll(true)}>
                  Fix all {ready}
                </Primary>
                <Secondary busy={applying === "picked"} disabled={busy || picked.size === 0} onClick={() => apply([...picked])}>
                  {applying === "picked" ? "Applying…" : `Fix selected (${picked.size})`}
                </Secondary>
              </div>
            )
          ) : null}
          {tab === "review" && rows.length > 0 ? (
            <div className="v2-row">
              <Secondary busy={applying === "picked"} disabled={busy || picked.size === 0} onClick={() => apply([...picked])}>
                {applying === "picked" ? "Applying…" : `Fix selected (${picked.size})`}
              </Secondary>
              <span className="v2-muted">Tick the names that look right.</span>
            </div>
          ) : null}

          {!current ? (
            loadError ? (
              <Empty title="Could not load the names">Reload the page to try again.</Empty>
            ) : (
              <SkeletonRows rows={8} />
            )
          ) : rows.length === 0 ? (
            <Empty title="All clear">
              {tab === "high" ? "Nothing is ready to fix right now." : tab === "review" ? "No names to check right now." : "No unknown words right now."}
            </Empty>
          ) : (
            <div className="v2-table-wrap">
              <div className="v2-table-scroll">
                <table className="v2-table">
                  <thead>
                    <tr>
                      {ticks ? (
                        <th style={{ width: 44 }}>
                          <input
                            type="checkbox"
                            aria-label="Tick all on this page"
                            title="Tick all on this page"
                            checked={allPicked}
                            disabled={busy}
                            onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.player_id)))}
                          />
                        </th>
                      ) : null}
                      <th>Now</th>
                      <th style={{ width: 24 }} aria-hidden />
                      <th>Suggested</th>
                      <th style={{ width: 150 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const now = join(r.surname, r.first_name);
                      const sug = join(r.proposed_first, r.proposed_surname);
                      return (
                        <tr key={r.player_id}>
                          {ticks ? (
                            <td>
                              <input type="checkbox" aria-label={`Tick ${now}`} checked={picked.has(r.player_id)} disabled={busy} onChange={() => toggle(r.player_id)} />
                            </td>
                          ) : null}
                          <td className="v2-muted">{now}</td>
                          <td aria-hidden>›</td>
                          <td style={{ fontWeight: 700 }}>{sug || <span className="v2-muted">no suggestion yet</span>}</td>
                          <td>{r.claimed ? <Badge tone="ink">Has an account</Badge> : null}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager p={pager as ReturnType<typeof usePages<unknown>>} noun="names" />
            </div>
          )}
        </div>
      </Section>
      <Toast text={toast} />
    </>
  );
}

/** the words behind the names we can't spell yet: save a spelling once and every name with it gets fixed */
function Words({ words, onNotice, notify, onSaved }: { words: NameWord[]; onNotice: (n: Notice) => void; notify: (t: string) => void; onSaved: () => void }) {
  /** words being saved right now: the card shows its moving bar while any is */
  const [saving, setSaving] = useState(0);
  const onBusy = useCallback((on: boolean) => setSaving((n) => Math.max(0, n + (on ? 1 : -1))), []);
  return (
    <div className={`v2-card${saving > 0 ? " busy" : ""}`} aria-busy={saving > 0 || undefined}>
      <div className="v2-stack" style={{ gap: 4 }}>
        <h3 className="v2-h3">Teach us these words</h3>
        <span className="v2-muted">Check the spelling in the box and press Save. Save a word once and every name with it gets fixed.</span>
      </div>
      <Table
        rows={words}
        rowKey={(w) => `${w.kind}:${w.word}`}
        pageSize={20}
        noun="words"
        columns={[
          { key: "word", label: "Word", render: (w) => <b>{w.word}</b> },
          { key: "kind", label: "Kind", render: (w) => <span className="v2-muted">{w.kind === "first" ? "First name" : "Surname"}</span> },
          { key: "players", label: "In names", num: true, render: (w) => w.players },
          { key: "spelling", label: "Spelling", width: 320, render: (w) => <WordSpelling w={w} onNotice={onNotice} notify={notify} onSaved={onSaved} onBusy={onBusy} /> },
        ]}
      />
    </div>
  );
}

function WordSpelling({ w, onNotice, notify, onSaved, onBusy }: { w: NameWord; onNotice: (n: Notice) => void; notify: (t: string) => void; onSaved: () => void; onBusy: (on: boolean) => void }) {
  const [value, setValue] = useState(w.spelling ?? titleCase(w.word));
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!pending) return;
    onBusy(true);
    return () => onBusy(false);
  }, [pending, onBusy]);

  const save = () => {
    onNotice({ tone: "working", title: `Saving the spelling of ${w.word}…` });
    start(async () => {
      const r = await saveSpelling(w.kind, w.word, value.trim());
      if (!r.ok) {
        onNotice({ tone: "problem", title: `${w.word}: not saved`, detail: r.message });
        return;
      }
      onNotice({ tone: "done", title: r.message, detail: `Names with ${w.word} use this spelling from now on.` });
      notify(r.message);
      onSaved();
    });
  };

  return (
    <div className="v2-row" style={{ flexWrap: "nowrap" }}>
      <input className="v2-input" style={{ height: 34, minWidth: 140 }} value={value} disabled={pending} aria-label={`Spelling for ${w.word}`} onChange={(e) => setValue(e.target.value)} />
      <Secondary small busy={pending} disabled={value.trim() === ""} onClick={save}>
        {pending ? "Saving…" : "Save"}
      </Secondary>
    </div>
  );
}
