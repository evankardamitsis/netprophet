"use client";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { renderQuizQuestion, renderQuizText } from "@netprophet/copy";
import { colors, ui } from "../ui";
import { Banner, Toast, useToast } from "../feedback";
import { listTemplates, previewDay, saveTemplate, type ActionResult } from "./actions";

type Family = "s" | "c" | "q" | "o";
type Gender = "m" | "f";

export interface QuizTemplate {
  id: string;
  family: Family;
  tag: string;
  q: string;
  players: number;
  options: string[];
  gender: Gender | null;
  active: boolean;
  used: number;
  answers: number;
}

interface PreviewPlayer {
  id?: string;
  first_name: string;
  surname: string;
  gender: Gender | null;
}

export interface DayPreview {
  quiz_day: string;
  pro: boolean;
  cards: {
    position: number;
    family: Family;
    content: {
      tag: string;
      q: string;
      options: { label: string }[];
      clues?: string[];
      right?: number;
      players: PreviewPlayer[];
    };
  }[];
}

const FAMILIES: { id: Family; name: string; hint: string }[] = [
  { id: "s", name: "Scenario", hint: "A little story, then a choice." },
  { id: "c", name: "Pick one", hint: "Pick one player out of a few." },
  { id: "q", name: "Who is it?", hint: "Built from facts about players. Only the tag and on/off can change." },
  { id: "o", name: "Opinion", hint: "A question about the game, no players." },
];
const familyName = (f: Family) => FAMILIES.find((x) => x.id === f)?.name ?? f;

const MEN: PreviewPlayer[] = [
  { first_name: "Νίκος", surname: "Ροδίτης", gender: "m" },
  { first_name: "Γιώργος", surname: "Δεσύπρης", gender: "m" },
  { first_name: "Ηλίας", surname: "Μέμμος", gender: "m" },
  { first_name: "Δημήτρης", surname: "Γκότσης", gender: "m" },
];
const WOMEN: PreviewPlayer[] = [
  { first_name: "Μαρία", surname: "Καρρά", gender: "f" },
  { first_name: "Ιωάννα", surname: "Τσάκου", gender: "f" },
  { first_name: "Άννα", surname: "Μάνου", gender: "f" },
  { first_name: "Σοφία", surname: "Νικολάου", gender: "f" },
];

const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 700 };
const check: CSSProperties = { display: "flex", gap: 6, alignItems: "center", fontSize: 14, fontWeight: 600 };

type Notice = ActionResult & { what: string };

const examplePlayers = (t: Pick<QuizTemplate, "players" | "gender">): PreviewPlayer[] =>
  (t.gender === "f" ? WOMEN : MEN).slice(0, t.players);

/** the plain-words buttons that put a player token into the question */
function tokenButtons(players: number): { label: string; token: string }[] {
  const out: { label: string; token: string }[] = [];
  for (let n = 1; n <= players; n += 1) {
    out.push(
      { label: `Player ${n} name`, token: `{p${n}}` },
      { label: `Player ${n} first name`, token: `{p${n}.first}` },
      { label: `Player ${n} (ο/η …)`, token: `{p${n}.o}` },
      { label: `Player ${n} first name (ο/η …)`, token: `{p${n}.o_first}` },
      { label: `Player ${n} (τον/την …)`, token: `{p${n}.ton}` },
      { label: `Player ${n} (στον/στην …)`, token: `{p${n}.ston}` },
    );
  }
  return out;
}

/** Quiz questions: the list first, an editor for one question, and a way to see a day's questions. */
export function Quiz() {
  const [rows, setRows] = useState<QuizTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuizTemplate | "new" | null>(null);
  const [tick, setTick] = useState(0);
  const { toast, notify } = useToast();

  useEffect(() => {
    listTemplates()
      .then((r) => {
        setRows(r);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [tick]);

  const onNotice = (n: Notice) => {
    if (n.ok) {
      notify(`${n.what} saved`);
      setEditing(null);
      setTick((t) => t + 1);
    } else {
      setError(`${n.what} not saved: ${n.message}`);
    }
  };

  const active = (rows ?? []).filter((t) => t.active).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 style={ui.h1}>Quiz questions</h1>
          <p style={ui.muted}>
            These are the questions «Οι 6 της ημέρας» is built from.{" "}
            {rows ? `${active} of ${rows.length} are switched on. Nothing needs you unless you want to change a question.` : ""}
          </p>
        </div>
        {editing === null ? (
          <button style={ui.primary} onClick={() => setEditing("new")}>
            New question
          </button>
        ) : null}
      </div>
      {error ? <Banner tone="problem" title="Something went wrong" detail={error} /> : null}
      {editing !== null ? (
        <Editor
          key={editing === "new" ? "new" : editing.id}
          t={editing === "new" ? null : editing}
          onNotice={onNotice}
          onCancel={() => setEditing(null)}
        />
      ) : null}
      {rows === null && !error ? <p style={ui.muted}>Loading…</p> : null}
      {rows && rows.length === 0 ? <p style={ui.muted}>There are no questions yet. Press New question to add the first one.</p> : null}
      {FAMILIES.map((f) => {
        const list = (rows ?? []).filter((t) => t.family === f.id);
        if (list.length === 0) return null;
        return (
          <section key={f.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 0" }}>
                {f.name} <span style={ui.muted}>({list.length})</span>
              </h2>
              <span style={ui.muted}>{f.hint}</span>
            </div>
            {list.map((t) => (
              <Row key={t.id} t={t} onEdit={() => setEditing(t)} onNotice={onNotice} />
            ))}
          </section>
        );
      })}
      <DayPreviewPanel />
      <Toast text={toast} />
    </div>
  );
}

/** one line of the list: tag, an example, on/off, Edit */
function Row({ t, onEdit, onNotice }: { t: QuizTemplate; onEdit: () => void; onNotice: (n: Notice) => void }) {
  const [pending, start] = useTransition();
  const fromFacts = t.family === "q";
  const example = fromFacts ? "Built from facts about players" : renderQuizQuestion(t.q, examplePlayers(t));

  const flip = () =>
    start(async () => {
      const p: Record<string, unknown> = { family: t.family, tag: t.tag, active: !t.active };
      if (!fromFacts) {
        p.q = t.q;
        p.options = t.options;
        p.players = t.players;
        p.gender = t.gender;
      }
      onNotice({ ...(await saveTemplate(t.id, p)), what: t.tag });
    });

  return (
    <div style={{ ...ui.card, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", opacity: t.active ? 1 : 0.7 }}>
      <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 2 }}>
        <strong>{t.tag}</strong>
        <span style={{ fontSize: 15 }}>{example}</span>
        <span style={ui.muted}>
          {t.used === 0 ? "Not asked yet" : `Asked ${t.used} ${t.used === 1 ? "time" : "times"}`} · {t.answers} {t.answers === 1 ? "answer" : "answers"}
        </span>
      </div>
      <label style={check}>
        <input type="checkbox" checked={t.active} disabled={pending} onChange={flip} />
        {t.active ? "On" : "Off"}
      </label>
      <button style={ui.secondary} onClick={onEdit}>
        Edit
      </button>
    </div>
  );
}

function Editor({ t, onNotice, onCancel }: { t: QuizTemplate | null; onNotice: (n: Notice) => void; onCancel: () => void }) {
  const [family, setFamily] = useState<Family>(t?.family ?? "s");
  const [tag, setTag] = useState(t?.tag ?? "");
  const [q, setQ] = useState(t?.q ?? "");
  const [players, setPlayers] = useState(t?.players || 1);
  const [gender, setGender] = useState<Gender>(t?.gender ?? "m");
  const [options, setOptions] = useState<string[]>(t?.options?.length ? t.options : ["", ""]);
  const [active, setActive] = useState(t?.active ?? true);
  const [pending, start] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);
  const fromFacts = family === "q";
  const isOpinion = family === "o";
  const what = t ? t.tag : "New question";

  const save = () =>
    start(async () => {
      const p: Record<string, unknown> = { family, tag, active };
      if (!fromFacts) {
        p.q = q;
        p.options = options.map((o) => o.trim()).filter(Boolean);
        p.players = isOpinion ? 0 : players;
        p.gender = isOpinion ? null : gender;
      }
      onNotice({ ...(await saveTemplate(t?.id ?? null, p)), what });
    });

  const insert = (token: string) => {
    const el = area.current;
    const at = el ? [el.selectionStart, el.selectionEnd] : [q.length, q.length];
    const next = q.slice(0, at[0]) + token + q.slice(at[1]);
    setQ(next);
    window.setTimeout(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(at[0] + token.length, at[0] + token.length);
    }, 0);
  };

  const pool = gender === "f" ? WOMEN : MEN;
  const shown = fromFacts ? [] : pool.slice(0, isOpinion ? 0 : players);

  return (
    <div style={{ ...ui.card, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", borderColor: colors.ink, borderWidth: 2 }}>
      <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{t ? `Edit: ${t.tag}` : "New question"}</h2>
        {t ? null : (
          <label style={label}>
            Kind of question
            <select style={ui.input} value={family} onChange={(e) => setFamily(e.target.value as Family)}>
              {FAMILIES.filter((f) => f.id !== "q").map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label style={label}>
          Tag (the small label on the card)
          <input style={ui.input} value={tag} onChange={(e) => setTag(e.target.value)} />
        </label>
        {fromFacts ? (
          <p style={ui.muted}>This one is built from facts about the players, so the question and options can’t be edited.</p>
        ) : (
          <>
            {isOpinion ? null : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <label style={{ ...label, width: 130 }}>
                  How many players
                  <select style={ui.input} value={players} onChange={(e) => setPlayers(Number(e.target.value))}>
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ ...label, width: 130 }}>
                  Players are
                  <select style={ui.input} value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                    <option value="m">Men</option>
                    <option value="f">Women</option>
                  </select>
                </label>
              </div>
            )}
            <label style={label}>
              Question
              <textarea
                ref={area}
                style={{ ...ui.input, height: 90, padding: 12, fontFamily: "inherit" }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            {isOpinion ? null : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Put a player’s name in the question (it goes where your cursor is)</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {tokenButtons(players).map((b) => (
                    <button key={b.token} type="button" style={{ ...ui.secondary, minHeight: 36, fontSize: 13 }} onClick={() => insert(b.token)}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Answers (2 to 4)</span>
              {options.map((o, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input
                    style={ui.input}
                    value={o}
                    aria-label={`Answer ${i + 1}`}
                    onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <button
                    style={ui.secondary}
                    disabled={options.length <= 2}
                    aria-label={`Remove answer ${i + 1}`}
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {options.length < 4 ? (
                <button style={{ ...ui.link, alignSelf: "flex-start" }} onClick={() => setOptions([...options, ""])}>
                  + Add an answer
                </button>
              ) : null}
            </div>
          </>
        )}
        <label style={check}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Switched on (players can get this question)
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button style={ui.primary} disabled={pending || !tag.trim()} onClick={save}>
            {t ? "Save" : "Add question"}
          </button>
          <button style={ui.secondary} disabled={pending} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
      {fromFacts ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>How it looks on the phone</span>
          <PhoneCard
            tag={tag}
            question={renderQuizQuestion(q, shown)}
            options={options.map((o) => renderQuizText(o, shown)).filter((o) => o.trim())}
          />
        </div>
      )}
    </div>
  );
}

/** a 360px wide ink card, as the app shows it */
function PhoneCard({ tag, question, options, clues, right }: { tag: string; question: string; options: string[]; clues?: string[]; right?: number }) {
  return (
    <div
      style={{
        width: 360,
        maxWidth: "100%",
        boxSizing: "border-box",
        background: colors.ink,
        color: colors.paper,
        borderRadius: 24,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, opacity: 0.7 }}>{tag || "TAG"}</span>
      <strong style={{ fontSize: 20, lineHeight: 1.25 }}>{question || "..."}</strong>
      {clues?.length ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, opacity: 0.85 }}>
          {clues.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : null}
      {options.map((o, i) => (
        <div
          key={i}
          style={{
            border: `2px solid ${colors.paper}`,
            borderRadius: 14,
            padding: "12px 14px",
            fontWeight: 700,
            fontSize: 16,
            opacity: right === undefined || right === i ? 1 : 0.6,
          }}
        >
          {o}
          {right === i ? " ✓" : ""}
        </div>
      ))}
    </div>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** «See someone’s daily questions»: the cards one account gets (6, or 12 with Pro) */
function DayPreviewPanel() {
  const [email, setEmail] = useState("");
  const [day, setDay] = useState(today());
  const [pro, setPro] = useState(false);
  const [result, setResult] = useState<DayPreview | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      try {
        setResult(await previewDay(email.trim(), day, pro));
        setError(null);
      } catch (e) {
        setResult(undefined);
        setError(e instanceof Error ? e.message : "failed");
      }
    });

  return (
    <section style={{ ...ui.card, display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>See someone’s daily questions</h2>
      <p style={ui.muted}>Type a player’s email and a day to see the questions they get.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...ui.input, flex: 1, minWidth: 220 }}
          type="email"
          placeholder="Their email"
          aria-label="Their email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input style={{ ...ui.input, width: 170 }} type="date" aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)} />
        <label style={check}>
          <input type="checkbox" checked={pro} onChange={(e) => setPro(e.target.checked)} />
          Pro account (12 questions)
        </label>
        <button style={ui.primary} disabled={pending || !email.trim()} onClick={run}>
          Show questions
        </button>
      </div>
      {error ? <Banner tone="problem" title="Couldn’t load that day" detail={error} /> : null}
      {result === null ? <p style={ui.muted}>Nothing for that email and day.</p> : null}
      {result ? (
        <>
          <p style={ui.muted}>
            {result.quiz_day} · {result.pro ? "Pro" : "Free"} account · {result.cards.length} questions
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {result.cards.map((c) => {
              const pl = c.content.players ?? [];
              return (
                <PhoneCard
                  key={c.position}
                  tag={`${c.position}. ${familyName(c.family)} · ${c.content.tag}`}
                  question={renderQuizQuestion(c.content.q, pl)}
                  options={(c.content.options ?? []).map((o) => renderQuizText(o.label, pl))}
                  clues={c.content.clues}
                  right={c.content.right}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
