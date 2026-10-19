"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Banner, Toast, useToast, type Tone } from "../feedback";
import { Badge, Card, Empty, Ghost, PageHeader, SearchInput, Secondary, Section, SkeletonRows, Table, Tabs } from "../kit";
import { mergeInto, recomputeLevels, searchRoster, unclaimPlayer, updatePlayer, type ActionResult } from "./actions";

export interface RosterPlayer {
  player_id: string;
  first_name: string;
  surname: string;
  gender: "m" | "f" | null;
  birth_year: number | null;
  is_minor: boolean;
  hidden: boolean;
  status: "pending" | "active" | "merged";
  source: string;
  area_id: string | null;
  merged_into: string | null;
  claimed_by: string | null;
  matches: number;
  /** the player's level, when the list carries one */
  level?: number | null;
}

// «Added recently» is the players users added by typing a name (waiting status); the list has no dates to sort by
const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Added recently" },
  { id: "claimed", label: "Have an account" },
  { id: "hidden", label: "Hidden" },
  { id: "minors", label: "Under 18" },
];

type Notice = { tone: Tone; title: string; detail?: string };
type Done = (what: string, r: ActionResult, toast: string) => void;

const tagsOf = (p: RosterPlayer) =>
  [
    p.status === "pending" ? { t: "New", tone: "ink" as const } : null,
    p.status === "merged" ? { t: "Merged", tone: "neutral" as const } : null,
    p.claimed_by ? { t: "Has an account", tone: "neutral" as const } : null,
    p.hidden ? { t: "Hidden", tone: "attention" as const } : null,
    p.is_minor ? { t: "Under 18", tone: "attention" as const } : null,
  ].filter(Boolean) as { t: string; tone: "ink" | "neutral" | "attention" }[];

/**
 * Players. Opens on the first page of a filter; search by name for anyone else. Edit opens the player above the
 * list: fix the details, hide a player or merge a duplicate into another player.
 */
export function Roster() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState<RosterPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editing, setEditing] = useState<RosterPlayer | null>(null);
  const { toast, notify } = useToast();
  const [tick, setTick] = useState(0);
  const [recomputing, recompute] = useTransition();

  // opened from a held name on Tournaments («Open in Players»): start on that search
  useEffect(() => {
    const q0 = new URLSearchParams(window.location.search).get("q");
    if (q0) setQ(q0);
  }, []);

  useEffect(() => {
    setRows(null);
    const id = setTimeout(() => {
      searchRoster(q.trim().length >= 2 ? q : "", filter)
        .then((r) => {
          setRows(r);
          setError(null);
        })
        .catch((e: Error) => setError(e.message));
    }, q ? 250 : 0);
    return () => clearTimeout(id);
  }, [q, filter, tick]);

  const done: Done = (what, r, toastText) => {
    if (r.ok) {
      setNotice({ tone: "done", title: what, detail: r.message });
      notify(toastText);
      setEditing(null);
      setTick((t) => t + 1);
    } else {
      setNotice({ tone: "problem", title: `${what}: it didn’t work`, detail: r.message });
    }
  };

  return (
    <>
      <PageHeader title="Players" intent="Everyone who can appear in a match. Fix a name, hide someone, or merge two entries for the same person." />
      {notice ? <Banner {...notice} /> : null}
      {editing ? <Editor key={editing.player_id} p={editing} done={done} onClose={() => setEditing(null)} onWorking={setNotice} /> : null}
      <Section
        title="Roster"
        aside={
          <div className="v2-row">
            <Tabs value={filter} onChange={setFilter} items={FILTERS.map((f) => ({ value: f.id, label: f.label }))} />
          </div>
        }
      >
        <SearchInput value={q} onChange={setQ} placeholder="Search by name (2 letters or more)" />
        {error ? <Banner tone="problem" title="Couldn’t load the players" detail={error} /> : null}
        {rows === null && !error ? (
          <SkeletonRows rows={8} />
        ) : rows ? (
          <Table
            rows={rows}
            rowKey={(p) => p.player_id}
            noun="players"
            pageSize={25}
            empty={<Empty title={q.trim() ? "Nobody has that name" : "All clear"}>{q.trim() ? "Try another spelling." : "Nobody in this list."}</Empty>}
            columns={[
              {
                key: "name",
                label: "Player",
                render: (p) => (
                  <div className="v2-row" style={{ gap: 6 }}>
                    <b style={{ opacity: p.status === "merged" ? 0.5 : 1 }}>
                      {p.first_name} {p.surname}
                    </b>
                    {tagsOf(p).map((t) => (
                      <Badge key={t.t} tone={t.tone}>
                        {t.t}
                      </Badge>
                    ))}
                  </div>
                ),
              },
              { key: "level", label: "Level", width: 90, render: (p) => (p.level != null ? `level ${p.level}` : <span className="v2-muted">·</span>) },
              { key: "matches", label: "Matches", width: 100, num: true, render: (p) => p.matches },
              {
                key: "edit",
                label: "",
                width: 90,
                render: (p) => (p.status === "merged" ? null : <Ghost onClick={() => setEditing(p)}>{editing?.player_id === p.player_id ? "Open" : "Edit"}</Ghost>),
              },
            ]}
          />
        ) : null}
        {rows && rows.length >= 50 ? <span className="v2-muted">Showing the first 50. Search by name to find anyone else.</span> : null}
      </Section>
      <Section title="Levels">
        <Card>
          <span className="v2-muted">Levels update by themselves every night. Use this only after you fixed many results by hand.</span>
          <div>
            <Secondary
              busy={recomputing}
              onClick={() => {
                setNotice({ tone: "working", title: "Updating levels…", detail: "Working out every player’s level from their results." });
                recompute(async () => done("Levels", await recomputeLevels(), "Levels updated"));
              }}
            >
              {recomputing ? "Updating…" : "Update levels now"}
            </Secondary>
          </div>
        </Card>
      </Section>
      <Toast text={toast} />
    </>
  );
}

function Editor({ p, done, onClose, onWorking }: { p: RosterPlayer; done: Done; onClose: () => void; onWorking: (n: Notice) => void }) {
  const [first, setFirst] = useState(p.first_name);
  const [surname, setSurname] = useState(p.surname);
  const [gender, setGender] = useState(p.gender ?? "");
  const [birth, setBirth] = useState(p.birth_year ? String(p.birth_year) : "");
  const [minor, setMinor] = useState(p.is_minor);
  const [hidden, setHidden] = useState(p.hidden);
  const [mergeQ, setMergeQ] = useState("");
  const [targets, setTargets] = useState<RosterPlayer[]>([]);
  const [joinTo, setJoinTo] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [pending, start] = useTransition();
  const what = `${p.first_name} ${p.surname}`;
  // opened from far down the list: bring it into view
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const [busy, setBusy] = useState<null | "save" | "merge" | "unlink">(null);
  const act = (kind: "save" | "merge" | "unlink", title: string, f: () => Promise<void>) => {
    setBusy(kind);
    onWorking({ tone: "working", title });
    start(async () => {
      try {
        await f();
      } finally {
        setBusy(null);
      }
    });
  };

  useEffect(() => {
    if (mergeQ.trim().length < 2) {
      setTargets([]);
      return undefined;
    }
    const id = setTimeout(() => {
      searchRoster(mergeQ, "all")
        .then((r) => setTargets(r.filter((x) => x.player_id !== p.player_id && x.status !== "merged").slice(0, 5)))
        .catch(() => setTargets([]));
    }, 250);
    return () => clearTimeout(id);
  }, [mergeQ, p.player_id]);

  const save = () =>
    act("save", `Saving ${what}…`, async () => {
      const patch: Record<string, unknown> = { first_name: first, surname, gender, hidden };
      // a birth year decides «under 18» by itself; the box is for players without one
      if (birth.trim()) patch.birth_year = Number(birth);
      else {
        patch.birth_year = null;
        patch.is_minor = minor;
      }
      if (p.status === "pending") patch.status = "active";
      done(what, await updatePlayer(p.player_id, patch), "Saved");
    });

  return (
    <div ref={box} className={`v2-card attention v2-enter${busy ? " busy" : ""}`} aria-busy={busy !== null || undefined} style={{ scrollMarginTop: 16 }}>
      <div className="v2-row between">
        <div className="v2-row">
          <h2 className="v2-h2">
            {p.first_name} {p.surname}
          </h2>
          {tagsOf(p).map((t) => (
            <Badge key={t.t} tone={t.tone}>
              {t.t}
            </Badge>
          ))}
        </div>
        <Ghost onClick={onClose} disabled={busy !== null}>
          Close
        </Ghost>
      </div>
      <span className="v2-muted">
        {p.matches} {p.matches === 1 ? "match" : "matches"}
        {p.level != null ? ` · level ${p.level}` : ""}
      </span>
      <div className="v2-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <label className="v2-field">
          First name
          <input className="v2-input" value={first} onChange={(e) => setFirst(e.target.value)} />
        </label>
        <label className="v2-field">
          Surname
          <input className="v2-input" value={surname} onChange={(e) => setSurname(e.target.value)} />
        </label>
        <label className="v2-field">
          Gender
          <select className="v2-select" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Not set</option>
            <option value="m">Man</option>
            <option value="f">Woman</option>
          </select>
        </label>
        <label className="v2-field">
          Birth year
          <input
            className="v2-input"
            value={birth}
            onChange={(e) => setBirth(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
          />
        </label>
      </div>
      <div className="v2-row" style={{ gap: 16 }}>
        <label className="v2-choice">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          Hide from the app
        </label>
        <label className="v2-choice">
          <input type="checkbox" checked={minor} disabled={birth.trim().length > 0} onChange={(e) => setMinor(e.target.checked)} />
          Under 18
        </label>
        {birth.trim() ? <span className="v2-muted">With a birth year, “Under 18” follows by itself.</span> : null}
      </div>
      <div>
        <Secondary busy={busy === "save"} disabled={pending} onClick={save}>
          {busy === "save" ? "Saving…" : p.status === "pending" ? "Save and approve" : "Save"}
        </Secondary>
      </div>

      <div className="v2-confirm">
        <b>Merge with another player</b>
        <span className="v2-muted">Use this when the same person is in the list twice. Their matches move to the player you pick.</span>
        <input className="v2-input" placeholder="Search for the other player" value={mergeQ} onChange={(e) => setMergeQ(e.target.value)} />
        {targets.map((t) => (
          <div key={t.player_id} className="v2-row between">
            <span>
              {t.first_name} {t.surname}{" "}
              <span className="v2-muted">
                {t.matches} {t.matches === 1 ? "match" : "matches"}
                {t.claimed_by ? " · has an account" : ""}
              </span>
            </span>
            {joinTo === t.player_id ? (
              <span className="v2-row">
                <b style={{ fontSize: 14 }}>
                  Merge {what} into {t.first_name} {t.surname}?
                </b>
                <Secondary
                  small
                  busy={busy === "merge"}
                  disabled={pending}
                  onClick={() => act("merge", `Merging ${what} into ${t.first_name} ${t.surname}…`, async () => done(what, await mergeInto(p.player_id, t.player_id), "Players merged"))}
                >
                  {busy === "merge" ? "Merging…" : "Yes, merge"}
                </Secondary>
                <Ghost disabled={pending} onClick={() => setJoinTo(null)}>
                  Cancel
                </Ghost>
              </span>
            ) : (
              <Secondary small disabled={pending} onClick={() => setJoinTo(t.player_id)}>
                Merge into this one
              </Secondary>
            )}
          </div>
        ))}
      </div>

      {p.claimed_by ? (
        <div className="v2-row">
          {confirmUnlink ? (
            <>
              <b style={{ fontSize: 14 }}>Unlink the account of {p.claimed_by} from this player?</b>
              <Secondary small busy={busy === "unlink"} disabled={pending} onClick={() => act("unlink", "Unlinking the account…", async () => done(what, await unclaimPlayer(p.player_id), "Account unlinked"))}>
                {busy === "unlink" ? "Unlinking…" : "Yes, unlink"}
              </Secondary>
              <Ghost disabled={pending} onClick={() => setConfirmUnlink(false)}>
                Cancel
              </Ghost>
            </>
          ) : (
            <Ghost disabled={pending} onClick={() => setConfirmUnlink(true)}>
              Unlink the account ({p.claimed_by})
            </Ghost>
          )}
        </div>
      ) : null}
    </div>
  );
}
