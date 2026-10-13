"use client";
import { useEffect, useState, useTransition, type CSSProperties } from "react";
import { ui } from "../ui";
import { Banner, Toast, useToast, type Tone } from "../feedback";
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
const stack = (gap: number): CSSProperties => ({ display: "flex", flexDirection: "column", gap });
const wrapRow: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
const tag: CSSProperties = { fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid currentColor" };
const fieldLabel: CSSProperties = { ...ui.muted, fontWeight: 700, ...stack(4) };

/**
 * Players. Opens on the first page of a filter; search by name for anyone else. Edit fixes the details,
 * hides a player or joins a duplicate into another player.
 */
export function Roster() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState<RosterPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const { toast, notify } = useToast();
  const [tick, setTick] = useState(0);
  const [recomputing, recompute] = useTransition();

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

  const done = (what: string, r: ActionResult, toastText: string) => {
    if (r.ok) {
      setNotice({ tone: "done", title: what, detail: r.message });
      notify(toastText);
      setTick((t) => t + 1);
    } else {
      setNotice({ tone: "problem", title: `${what}: it didn’t work`, detail: r.message });
    }
  };

  const pendingCount = rows && filter === "pending" ? rows.length : null;

  return (
    <div style={stack(16)}>
      <div>
        <h1 style={ui.h1}>Players</h1>
        <p style={ui.muted}>
          Everyone who can appear in a match. Fix a name, hide someone, or join two entries for the same person.
          {pendingCount !== null && pendingCount > 0 ? ` ${pendingCount} added by users, worth a look.` : ""}
        </p>
      </div>
      {notice ? <Banner {...notice} /> : null}
      <div style={wrapRow}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            style={{ ...ui.secondary, minHeight: 36, background: filter === f.id ? "#0F2019" : "transparent", color: filter === f.id ? "#F3F5EE" : undefined }}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <input style={ui.input} placeholder="Search by name (2 letters or more)" value={q} onChange={(e) => setQ(e.target.value)} />
      {error ? <Banner tone="problem" title="Couldn’t load the players" detail={error} /> : null}
      {rows === null && !error ? <p style={ui.muted}>Loading…</p> : null}
      {rows && rows.length === 0 ? (
        <p style={ui.muted}>{q.trim() ? "Nobody has that name." : "All clear. Nobody in this list."}</p>
      ) : null}
      {(rows ?? []).map((p) => (
        <Row key={`${p.player_id}-${tick}`} p={p} done={done} />
      ))}
      {rows && rows.length >= 50 ? <p style={ui.muted}>Showing the first 50. Search by name to find anyone else.</p> : null}

      <details style={{ marginTop: 16 }}>
        <summary style={{ ...ui.muted, cursor: "pointer", fontWeight: 700 }}>Advanced</summary>
        <div style={{ ...stack(10), paddingTop: 10 }}>
          <p style={{ ...ui.muted, margin: 0 }}>Levels update by themselves every night. Use this only after you fixed many results by hand.</p>
          <div>
            <button
              style={ui.secondary}
              disabled={recomputing}
              onClick={() => {
                setNotice({ tone: "working", title: "Updating levels…" });
                recompute(async () => done("Levels", await recomputeLevels(), "Levels updated"));
              }}
            >
              {recomputing ? "Updating…" : "Update levels now"}
            </button>
          </div>
        </div>
      </details>
      <Toast text={toast} />
    </div>
  );
}

function Row({ p, done }: { p: RosterPlayer; done: (what: string, r: ActionResult, toast: string) => void }) {
  const [editing, setEditing] = useState(false);
  const merged = p.status === "merged";
  const tags = [
    p.status === "pending" ? "new" : null,
    merged ? "joined into another player" : null,
    p.claimed_by ? "has an account" : null,
    p.hidden ? "hidden" : null,
    p.is_minor ? "under 18" : null,
  ].filter(Boolean) as string[];
  return (
    <div style={{ ...ui.card, ...stack(10), opacity: merged ? 0.6 : 1 }}>
      <div style={{ ...wrapRow, justifyContent: "space-between" }}>
        <div style={wrapRow}>
          <strong style={{ fontSize: 17 }}>
            {p.first_name} {p.surname}
          </strong>
          {p.level != null ? <span style={ui.muted}>Level {p.level}</span> : null}
          {tags.map((t) => (
            <span key={t} style={tag}>
              {t}
            </span>
          ))}
        </div>
        <span style={wrapRow}>
          <span style={ui.muted}>{p.matches} {p.matches === 1 ? "match" : "matches"}</span>
          {merged ? null : (
            <button style={ui.link} onClick={() => setEditing((e) => !e)}>
              {editing ? "Close" : "Edit"}
            </button>
          )}
        </span>
      </div>
      {editing && !merged ? <Editor p={p} done={done} /> : null}
    </div>
  );
}

function Editor({ p, done }: { p: RosterPlayer; done: (what: string, r: ActionResult, toast: string) => void }) {
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
    start(async () => {
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
    <div style={stack(12)}>
      <div style={wrapRow}>
        <label style={fieldLabel}>
          First name
          <input style={{ ...ui.input, width: 170 }} value={first} onChange={(e) => setFirst(e.target.value)} />
        </label>
        <label style={fieldLabel}>
          Surname
          <input style={{ ...ui.input, width: 210 }} value={surname} onChange={(e) => setSurname(e.target.value)} />
        </label>
        <label style={fieldLabel}>
          Gender
          <select style={{ ...ui.input, width: 120 }} value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Not set</option>
            <option value="m">Man</option>
            <option value="f">Woman</option>
          </select>
        </label>
        <label style={fieldLabel}>
          Birth year
          <input
            style={{ ...ui.input, width: 110 }}
            value={birth}
            onChange={(e) => setBirth(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
          />
        </label>
      </div>
      <div style={{ ...wrapRow, gap: 16 }}>
        <label style={{ ...wrapRow, fontSize: 14, fontWeight: 600 }}>
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          Hide from the app
        </label>
        <label style={{ ...wrapRow, fontSize: 14, fontWeight: 600 }}>
          <input type="checkbox" checked={minor} disabled={birth.trim().length > 0} onChange={(e) => setMinor(e.target.checked)} />
          Under 18
        </label>
        {birth.trim() ? <span style={ui.muted}>With a birth year, “Under 18” follows by itself.</span> : null}
      </div>
      <div>
        <button style={ui.primary} disabled={pending} onClick={save}>
          {pending ? "Saving…" : p.status === "pending" ? "Save and approve" : "Save"}
        </button>
      </div>

      <div style={stack(6)}>
        <strong style={{ fontSize: 14 }}>Merge with another player</strong>
        <span style={ui.muted}>Use this when the same person is in the list twice. Their matches move to the player you pick.</span>
        <input style={ui.input} placeholder="Search for the other player" value={mergeQ} onChange={(e) => setMergeQ(e.target.value)} />
        {targets.map((t) => (
          <div key={t.player_id} style={{ ...wrapRow, justifyContent: "space-between" }}>
            <span>
              {t.first_name} {t.surname}{" "}
              <span style={ui.muted}>
                {t.matches} {t.matches === 1 ? "match" : "matches"}
                {t.claimed_by ? " · has an account" : ""}
              </span>
            </span>
            {joinTo === t.player_id ? (
              <span style={wrapRow}>
                <strong style={{ fontSize: 14 }}>Merge {what} into {t.first_name} {t.surname}?</strong>
                <button
                  style={ui.secondary}
                  disabled={pending}
                  onClick={() => {
                    setJoinTo(null);
                    start(async () => done(what, await mergeInto(p.player_id, t.player_id), "Players merged"));
                  }}
                >
                  Yes, merge
                </button>
                <button style={ui.link} onClick={() => setJoinTo(null)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button style={ui.secondary} onClick={() => setJoinTo(t.player_id)}>
                Merge into this one
              </button>
            )}
          </div>
        ))}
      </div>

      {p.claimed_by ? (
        <div style={wrapRow}>
          {confirmUnlink ? (
            <>
              <strong style={{ fontSize: 14 }}>Unlink the account of {p.claimed_by} from this player?</strong>
              <button
                style={ui.secondary}
                disabled={pending}
                onClick={() => {
                  setConfirmUnlink(false);
                  start(async () => done(what, await unclaimPlayer(p.player_id), "Account unlinked"));
                }}
              >
                Yes, unlink
              </button>
              <button style={ui.link} onClick={() => setConfirmUnlink(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button style={ui.link} onClick={() => setConfirmUnlink(true)}>
              Unlink the account ({p.claimed_by})
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
