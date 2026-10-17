"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { renderQuizQuestion, renderQuizText } from "@netprophet/copy";
import { Banner, Toast, useToast, type Tone } from "../feedback";
import { Badge, Card, Empty, Ghost, PageHeader, Primary, Secondary, Section, SkeletonCards, SkeletonRows, Stats, Table, Tabs } from "../kit";
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

type Notice = ActionResult & { what: string };
type Cue = { tone: Tone; title: string; detail?: string };

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

/** Quiz questions: the list first (a tab per kind), an editor for one question, and a way to see a day's questions. */
export function Quiz() {
  const [rows, setRows] = useState<QuizTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuizTemplate | "new" | null>(null);
  const [tick, setTick] = useState(0);
  const [cue, setCue] = useState<Cue | null>(null);
  const [tab, setTab] = useState<Family>("s");
  const { toast, notify } = useToast();

  useEffect(() => {
    listTemplates()
      .then((r) => {
        setRows(r);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [tick]);

  /** a save started: the banner says so while it runs */
  const onWorking = (title: string) => setCue({ tone: "working", title });

  const onNotice = (n: Notice) => {
    if (n.ok) {
      setCue({ tone: "done", title: `${n.what} saved` });
      notify(`${n.what} saved`);
      setEditing(null);
      setTick((t) => t + 1);
    } else {
      setCue({ tone: "problem", title: `${n.what} not saved`, detail: n.message });
    }
  };

  const all = rows ?? [];
  const active = all.filter((t) => t.active).length;
  const list = all.filter((t) => t.family === tab);
  const fam = FAMILIES.find((f) => f.id === tab) ?? FAMILIES[0]!;
  const dot = (n: number) => (rows ? n : "·");

  return (
    <>
      <PageHeader
        title="Quiz questions"
        intent="The questions «Οι ερωτήσεις της ημέρας» is built from. Nothing needs you unless you want to change a question."
        actions={editing === null ? <Primary onClick={() => setEditing("new")}>+ New question</Primary> : null}
      />
      {error ? <Banner tone="problem" title="Couldn’t load the questions" detail={error} /> : null}
      {cue ? <Banner {...cue} /> : null}
      <Stats
        items={[
          { label: "switched on", value: dot(active), ink: true },
          { label: "questions in all", value: dot(all.length) },
          { label: "times asked", value: dot(all.reduce((n, t) => n + t.used, 0)) },
          { label: "answers", value: dot(all.reduce((n, t) => n + t.answers, 0)) },
        ]}
      />
      {editing !== null ? (
        <Editor
          key={editing === "new" ? "new" : editing.id}
          t={editing === "new" ? null : editing}
          onWorking={onWorking}
          onNotice={onNotice}
          onCancel={() => setEditing(null)}
        />
      ) : null}
      <Section
        title={fam.name}
        aside={<Tabs value={tab} onChange={setTab} items={FAMILIES.map((f) => ({ value: f.id, label: f.name, count: all.filter((t) => t.family === f.id).length }))} />}
      >
        <span className="v2-muted">{fam.hint}</span>
        {rows === null && !error ? (
          <SkeletonRows rows={8} />
        ) : all.length === 0 ? (
          <Card>
            <Empty title="There are no questions yet">Press «+ New question» to add the first one.</Empty>
          </Card>
        ) : (
          <Table<QuizTemplate>
            key={tab}
            rows={list}
            rowKey={(t) => t.id}
            pageSize={20}
            noun="questions"
            empty={<Empty title={`No ${fam.name.toLowerCase()} questions yet`} />}
            columns={[
              { key: "tag", label: "Tag", render: (t) => <b>{t.tag}</b> },
              {
                key: "example",
                label: "Example",
                render: (t) => (t.family === "q" ? <span className="v2-muted">Built from facts about players</span> : renderQuizQuestion(t.q, examplePlayers(t))),
              },
              { key: "asked", label: "Asked", num: true, render: (t) => (t.used === 0 ? <span className="v2-muted">Not yet</span> : t.used) },
              { key: "answers", label: "Answers", num: true, render: (t) => t.answers },
              { key: "on", label: "On or off", width: 210, render: (t) => <OnOff t={t} onWorking={onWorking} onNotice={onNotice} /> },
              {
                key: "edit",
                label: "",
                width: 80,
                render: (t) => (
                  <Secondary small onClick={() => setEditing(t)}>
                    Edit
                  </Secondary>
                ),
              },
            ]}
          />
        )}
      </Section>
      <DayPreviewPanel />
      <Toast text={toast} />
    </>
  );
}

/** switch one question on or off, right in its row */
function OnOff({ t, onWorking, onNotice }: { t: QuizTemplate; onWorking: (title: string) => void; onNotice: (n: Notice) => void }) {
  const [pending, start] = useTransition();
  const fromFacts = t.family === "q";

  const flip = () => {
    onWorking(`${t.active ? "Switching off" : "Switching on"} ${t.tag}…`);
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
  };

  return (
    <span className="v2-row" style={{ flexWrap: "nowrap" }}>
      <Badge tone={t.active ? "ink" : "neutral"}>{t.active ? "On" : "Off"}</Badge>
      <Secondary small busy={pending} onClick={flip}>
        {pending ? "Saving…" : t.active ? "Switch off" : "Switch on"}
      </Secondary>
    </span>
  );
}

function Editor({
  t,
  onWorking,
  onNotice,
  onCancel,
}: {
  t: QuizTemplate | null;
  onWorking: (title: string) => void;
  onNotice: (n: Notice) => void;
  onCancel: () => void;
}) {
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

  const save = () => {
    onWorking(t ? `Saving ${t.tag}…` : "Adding the question…");
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
  };

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
    <div className={`v2-card attention v2-enter${pending ? " busy" : ""}`} aria-busy={pending || undefined}>
      <h2 className="v2-h2">{t ? `Edit: ${t.tag}` : "New question"}</h2>
      <div className="v2-row" style={{ alignItems: "flex-start", gap: 24 }}>
        <div className="v2-stack" style={{ flex: 1, minWidth: 280, gap: 12 }}>
          <div className="v2-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {t ? null : (
              <label className="v2-field">
                Kind of question
                <select className="v2-select" value={family} onChange={(e) => setFamily(e.target.value as Family)}>
                  {FAMILIES.filter((f) => f.id !== "q").map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="v2-field">
              Tag (the small label on the card)
              <input className="v2-input" value={tag} onChange={(e) => setTag(e.target.value)} />
            </label>
            {fromFacts || isOpinion ? null : (
              <>
                <label className="v2-field">
                  How many players
                  <select className="v2-select" value={players} onChange={(e) => setPlayers(Number(e.target.value))}>
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="v2-field">
                  Players are
                  <select className="v2-select" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                    <option value="m">Men</option>
                    <option value="f">Women</option>
                  </select>
                </label>
              </>
            )}
          </div>
          {fromFacts ? (
            <span className="v2-muted">This one is built from facts about the players, so the question and options can’t be edited.</span>
          ) : (
            <>
              <label className="v2-field">
                Question
                <textarea ref={area} className="v2-input" style={{ height: 90, padding: 12 }} value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              {isOpinion ? null : (
                <div className="v2-stack">
                  <span className="v2-field">Put a player’s name in the question (it goes where your cursor is)</span>
                  <div className="v2-row" style={{ gap: 6 }}>
                    {tokenButtons(players).map((b) => (
                      <Secondary key={b.token} small onClick={() => insert(b.token)}>
                        {b.label}
                      </Secondary>
                    ))}
                  </div>
                </div>
              )}
              <div className="v2-stack">
                <span className="v2-field">Answers (2 to 4)</span>
                {options.map((o, i) => (
                  <div key={i} className="v2-row" style={{ flexWrap: "nowrap" }}>
                    <input
                      className="v2-input"
                      value={o}
                      aria-label={`Answer ${i + 1}`}
                      onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                    <Secondary small disabled={options.length <= 2} onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                      Remove
                    </Secondary>
                  </div>
                ))}
                {options.length < 4 ? (
                  <span>
                    <Ghost onClick={() => setOptions([...options, ""])}>+ Add an answer</Ghost>
                  </span>
                ) : null}
              </div>
            </>
          )}
          <label className="v2-choice">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Switched on (players can get this question)
          </label>
          <div className="v2-row">
            <Primary busy={pending} disabled={!tag.trim()} onClick={save}>
              {pending ? (t ? "Saving…" : "Adding…") : t ? "Save" : "Add question"}
            </Primary>
            <Secondary disabled={pending} onClick={onCancel}>
              Cancel
            </Secondary>
          </div>
        </div>
        {fromFacts ? null : (
          <div className="v2-stack">
            <span className="v2-field">How it looks on the phone</span>
            <PhoneCard
              tag={tag}
              question={renderQuizQuestion(q, shown)}
              options={options.map((o) => renderQuizText(o, shown)).filter((o) => o.trim())}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** a 360px wide ink card, as the app shows it */
function PhoneCard({ tag, question, options, clues, right }: { tag: string; question: string; options: string[]; clues?: string[]; right?: number }) {
  return (
    <div className="v2-card ink v2-enter" style={{ width: 360, maxWidth: "100%", borderRadius: 24, padding: 20 }}>
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
            border: "2px solid var(--np-paper)",
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
    <Section title="See someone’s daily questions">
      <div className={`v2-card${pending ? " busy" : ""}`} aria-busy={pending || undefined}>
        <span className="v2-muted">Type a player’s email and a day to see the questions they get. This only looks, it changes nothing.</span>
        <div className="v2-row" style={{ alignItems: "flex-end" }}>
          <label className="v2-field" style={{ flex: 1, minWidth: 220 }}>
            Their email
            <input className="v2-input" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="v2-field" style={{ width: 170 }}>
            Day
            <input className="v2-input" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <label className="v2-choice">
            <input type="checkbox" checked={pro} onChange={(e) => setPro(e.target.checked)} />
            Pro account (12 questions)
          </label>
          <Secondary busy={pending} disabled={!email.trim()} onClick={run}>
            {pending ? "Loading…" : "Show questions"}
          </Secondary>
        </div>
        {pending ? <Banner tone="working" title="Building their questions…" detail="The same cards the app would show them that day." /> : null}
        {!pending && error ? <Banner tone="problem" title="Couldn’t load that day" detail={error} /> : null}
        {!pending && result === null ? <Empty title="Nothing for that email and day">Check the email, or try another day.</Empty> : null}
      </div>
      {pending ? (
        <SkeletonCards count={6} />
      ) : result ? (
        <>
          <div className="v2-row">
            <Badge tone="ink">{result.pro ? "Pro" : "Free"} account</Badge>
            <span className="v2-muted">
              {result.quiz_day} · {result.cards.length} questions
            </span>
          </div>
          <div className="v2-row" style={{ alignItems: "flex-start", gap: 14 }}>
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
    </Section>
  );
}
