"use client";
import { useEffect, useState, useTransition, type CSSProperties } from "react";
import { renderQuizQuestion, renderQuizText } from "@netprophet/copy";
import { colors, ui } from "../ui";
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

const FAMILIES: { id: Family; name: string }[] = [
  { id: "s", name: "Σενάριο" },
  { id: "c", name: "Διάλεξε έναν" },
  { id: "q", name: "Ποιος είναι;" },
  { id: "o", name: "Άποψη" },
];

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

/** Quiz bank: the templates behind «Οι 6 της ημέρας», a live phone preview per template, and a day preview per account. */
export function Quiz() {
  const [rows, setRows] = useState<QuizTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    listTemplates()
      .then((r) => {
        setRows(r);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [tick]);

  const onNotice = (n: Notice) => {
    setNotice(n);
    if (n.ok) setTick((t) => t + 1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={ui.h1}>Quiz bank</h1>
        <p style={ui.muted}>
          The templates «Οι 6 της ημέρας» is built from. Question text can hold player tokens (p1 to p4):{" "}
          <code>{"{p1}"}</code> full name, <code>{"{p1.first}"}</code> first name, <code>{"{p1.o}"}</code> «ο Νίκος Ροδίτης»,{" "}
          <code>{"{p1.o_first}"}</code> «ο Νίκος», <code>{"{p1.ton}"}</code> «τον Νίκο Ροδίτη», <code>{"{p1.ston}"}</code> «στον Νίκο Ροδίτη».
          Families: s Σενάριο, c Διάλεξε έναν, q Ποιος είναι; (built from facts: only the tag and active can change), o Άποψη.
        </p>
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
            <strong>{notice.what}</strong> {notice.message}
          </span>
          <button style={ui.link} onClick={() => setNotice(null)}>
            Close
          </button>
        </div>
      ) : null}
      <DayPreviewPanel />
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>New template</h2>
        <Editor key={`new-${tick}`} t={null} onNotice={onNotice} />
      </section>
      {error ? <p style={ui.error}>{error}</p> : null}
      {rows === null && !error ? <p style={ui.muted}>Loading.</p> : null}
      {FAMILIES.map((f) => {
        const list = (rows ?? []).filter((t) => t.family === f.id);
        if (list.length === 0) return null;
        return (
          <section key={f.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 0" }}>
              {f.name} <span style={ui.muted}>({f.id}, {list.length})</span>
            </h2>
            {list.map((t) => (
              <Editor key={`${t.id}-${tick}`} t={t} onNotice={onNotice} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Editor({ t, onNotice }: { t: QuizTemplate | null; onNotice: (n: Notice) => void }) {
  const [family, setFamily] = useState<Family>(t?.family ?? "s");
  const [tag, setTag] = useState(t?.tag ?? "");
  const [q, setQ] = useState(t?.q ?? "");
  const [players, setPlayers] = useState(t?.players || 1);
  const [gender, setGender] = useState<Gender>(t?.gender ?? "m");
  const [options, setOptions] = useState<string[]>(t?.options?.length ? t.options : ["", ""]);
  const [active, setActive] = useState(t?.active ?? true);
  const [pending, start] = useTransition();
  const fromFacts = family === "q";
  const isOpinion = family === "o";
  const what = t ? `${t.tag}:` : "New template:";

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

  const pool = gender === "f" ? WOMEN : MEN;
  const shown = fromFacts ? [] : pool.slice(0, isOpinion ? 0 : players);

  return (
    <div style={{ ...ui.card, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", opacity: t && !t.active ? 0.75 : 1 }}>
      <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}>
        {t ? null : (
          <label style={label}>
            Family
            <select style={ui.input} value={family} onChange={(e) => setFamily(e.target.value as Family)}>
              {FAMILIES.filter((f) => f.id !== "q").map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id} {f.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label style={label}>
          Tag
          <input style={ui.input} value={tag} onChange={(e) => setTag(e.target.value)} />
        </label>
        {fromFacts ? (
          <p style={ui.muted}>Built from the facts of the roster: the question and options cannot be edited.</p>
        ) : (
          <>
            <label style={label}>
              Question
              <textarea
                style={{ ...ui.input, height: 90, padding: 12, fontFamily: "inherit" }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            {isOpinion ? null : (
              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ ...label, width: 110 }}>
                  Players
                  <select style={ui.input} value={players} onChange={(e) => setPlayers(Number(e.target.value))}>
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ ...label, width: 130 }}>
                  Gender
                  <select style={ui.input} value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                    <option value="m">Man</option>
                    <option value="f">Woman</option>
                  </select>
                </label>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Options (2 to 4)</span>
              {options.map((o, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input
                    style={ui.input}
                    value={o}
                    aria-label={`Option ${i + 1}`}
                    onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <button
                    style={ui.secondary}
                    disabled={options.length <= 2}
                    aria-label={`Remove option ${i + 1}`}
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {options.length < 4 ? (
                <button style={{ ...ui.link, alignSelf: "flex-start" }} onClick={() => setOptions([...options, ""])}>
                  Add option
                </button>
              ) : null}
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <label style={check}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
          <button style={ui.primary} disabled={pending} onClick={save}>
            {t ? "Save" : "Add template"}
          </button>
          {t ? <span style={ui.muted}>used {t.used} times · {t.answers} answers</span> : null}
        </div>
      </div>
      {fromFacts ? null : (
        <PhoneCard
          tag={tag}
          question={renderQuizQuestion(q, shown)}
          options={options.map((o) => renderQuizText(o, shown)).filter((o) => o.trim())}
        />
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

/** «Preview a day»: the cards one account gets (6, or 12 with Pro) */
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
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Preview a day</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...ui.input, flex: 1, minWidth: 220 }}
          type="email"
          placeholder="Account email"
          aria-label="Account email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input style={{ ...ui.input, width: 170 }} type="date" aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)} />
        <label style={check}>
          <input type="checkbox" checked={pro} onChange={(e) => setPro(e.target.checked)} />
          Pro
        </label>
        <button style={ui.primary} disabled={pending || !email.trim()} onClick={run}>
          Preview
        </button>
      </div>
      {error ? <p style={ui.error}>{error}</p> : null}
      {result === null ? <p style={ui.muted}>Nothing for that account and day.</p> : null}
      {result ? (
        <>
          <p style={ui.muted}>
            {result.quiz_day} · {result.pro ? "Pro" : "Free"} · {result.cards.length} cards
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {result.cards.map((c) => {
              const pl = c.content.players ?? [];
              return (
                <PhoneCard
                  key={c.position}
                  tag={`${c.position}. ${c.family} · ${c.content.tag}`}
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
