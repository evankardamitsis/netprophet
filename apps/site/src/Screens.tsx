'use client';
import { useRef, useState } from 'react';
import { surfaceTints } from '@netprophet/tokens';
import { BallPerson } from './BallPerson';
import type { Screens as S } from './content';

/**
 * The app's screens drawn as phones you can try (founder, 16 Oct: "make the mockups interactive"; refreshed 22 Oct to
 * the app as it is now): tap a name to vote, hold a name to see its run through the draw, switch the scout card's
 * parts, tap a trait for +1. Every name is made up. Drawn in the app's look, not screenshots, so they stay sharp and
 * follow the brand tokens.
 */
type Hair = 'short' | 'curly' | 'long' | 'bun';
type HairColour = 'black' | 'brown' | 'blonde' | 'auburn' | 'grey' | 'chestnut';

function Phone({ s, children, label, tab }: { s: S; children: React.ReactNode; label?: string; tab: number }) {
  return (
    <div className="phone" role="group" aria-label={label}>
      <div className="phone-top">
        <span className="phone-logo">
          <i />
          netprophet
        </span>
        <span className="phone-streak">
          <b>5</b> {s.streak}
        </span>
        <span className="phone-points">
          <b>320</b>
          <small>{s.points}</small>
        </span>
      </div>
      <div className="phone-body">{children}</div>
      <div className="phone-tabs" aria-hidden="true">
        {s.tabBar.map((t, i) => (
          <span key={t} className={i === tab ? 'on' : ''}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Face({ id, skin, hair, colour, size = 46 }: { id: string; skin: number; hair: Hair; colour: HairColour; size?: number }) {
  return <BallPerson id={id} skin={skin} hair={hair} hairColour={colour} kit="kit_green" size={size} />;
}

type Pair = [{ name: string; pct: number }, { name: string; pct: number }];

/**
 * «Ψήφισε σήμερα»: one match, two names. Tap a name to vote (instant): the chosen name fills lime and the
 * percentages show. With `onHold`, holding a name opens its run through the draw instead.
 */
function VoteRow({ s, meta, pair, live = true, onHold }: { s: S; meta: string; pair: Pair; live?: boolean; onHold?: (i: number) => void }) {
  const [pick, setPick] = useState<0 | 1 | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <div className="vr">
      <p className="vr-meta">
        <span>{meta}</span>
        {pick !== null ? <em>{s.home.called} ✓</em> : null}
      </p>
      <div className="vr-names">
        {pair.map((p, i) => (
          <button
            key={p.name}
            type="button"
            tabIndex={live ? 0 : -1}
            className={`vr-name${pick === i ? ' picked' : ''}${pick !== null && pick !== i ? ' other' : ''}`}
            aria-pressed={pick === i}
            onPointerDown={() => {
              held.current = false;
              if (!onHold) return;
              stop();
              timer.current = setTimeout(() => {
                held.current = true;
                onHold(i);
              }, 450);
            }}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              if (held.current) {
                held.current = false;
                return;
              }
              setPick(i as 0 | 1);
            }}
          >
            <b>{p.name}</b>
            <span className={`vr-pct${pick === null ? ' hidden' : ''}`}>{p.pct}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** «Σήμερα», the home of the app, top to bottom as it is now */
export function HomeScreen({ s, live = true }: { s: S; live?: boolean }) {
  const h = s.home;
  const el = s.lang === 'el';
  const clay = surfaceTints.clay;
  const hard = surfaceTints.hard;
  return (
    <Phone s={s} label={h.title} tab={0}>
      <div className="hm-head">
        <p className="ph-title">{h.title}</p>
        <span>{h.date}</span>
      </div>

      <div className="hm-results">
        <div>
          <b>{h.resultsTitle}</b>
          <p>
            {h.resultsLine} · <i>{h.resultsPoints}</i>
          </p>
        </div>
        <a className="hm-blue" href="#results" tabIndex={live ? 0 : -1}>
          {h.resultsBtn}
        </a>
      </div>

      <div className="hm-yours">
        <p className="hm-h">{h.yours}</p>
        <div className="hm-row">
          <span className="hm-time">18:00</span>
          <div>
            <b>{h.myMatch}</b>
            <small>{h.myMatchLine}</small>
          </div>
        </div>
        <div className="hm-row">
          <span className="hm-time">
            <em>{h.now}</em>
          </span>
          <div>
            <b>{h.friends}</b>
            <small>{h.friendsLine}</small>
          </div>
        </div>
      </div>

      <div className="hm-quiz" style={{ background: hard.bg, color: hard.ink }}>
        <div>
          <b>{h.quizTitle}</b>
          <small>{h.quizLine}</small>
        </div>
        <span aria-hidden="true">›</span>
      </div>

      <div className="hm-vote">
        <p className="hm-h">{h.vote}</p>
        <p className="hm-hint">{h.voteHint}</p>
        <VoteRow s={s} live={live} meta="19:30 · M 40+" pair={[{ name: el ? 'Ρακετάκης' : 'Raketakis', pct: 62 }, { name: el ? 'Σερβίδης' : 'Servidis', pct: 38 }]} />
        <VoteRow s={s} live={live} meta="20:00 · M 50+" pair={[{ name: el ? 'Λοβάκης' : 'Lovakis', pct: 44 }, { name: el ? 'Βολεάδης' : 'Voleadis', pct: 56 }]} />
      </div>

      <div className="hm-pro">
        <p>
          <span className="hm-protag">{h.proTag}</span>
          <span className="hm-trial">{h.trial}</span>
        </p>
        <b>{h.proTitle}</b>
        <small>{h.proLine}</small>
        <a href="#opponent" tabIndex={live ? 0 : -1}>
          {h.proBtn}
        </a>
      </div>

      <div className="hm-tour-head">
        <p className="hm-h">{h.tournaments}</p>
        <button type="button" className="hm-add" tabIndex={live ? 0 : -1}>
          {h.addMatch}
        </button>
      </div>
      <div className="hm-tour">
        <div className="hm-tour-top">
          <b>{s.tournament.name}</b>
          <span className="hm-playing">{h.playing}</span>
        </div>
        <p>
          <span className="hm-surface" style={{ background: clay.bg, color: clay.ink }}>
            {h.clay}
          </span>
          {h.firstMatch}
        </p>
      </div>
      <div className="hm-tour">
        <div className="hm-tour-top">
          <b>{el ? 'Κύπελλο Βούλας' : 'Voula Cup'}</b>
          <span className="hm-following">{h.following}</span>
        </div>
        <p>
          <span className="hm-surface" style={{ background: hard.bg, color: hard.ink }}>
            {h.hard}
          </span>
          {h.nextMatch}
        </p>
      </div>
    </Phone>
  );
}

/** «Αποτελέσματα»: what you called right lands in lime, with ✓ */
export function ResultsScreen({ s, live = true }: { s: S; live?: boolean }) {
  const r = s.results;
  const el = s.lang === 'el';
  const [open, setOpen] = useState<number | null>(null);
  const rows = [
    { win: el ? 'Ρακετάκης' : 'Raketakis', lose: el ? 'Φορχάντης' : 'Forchantis', ws: '6 6', ls: '4 3', got: true, skin: [1, 2] as const },
    { win: el ? 'Σλάισου' : 'Slaisou', lose: el ? 'Βολεάκη' : 'Voleaki', ws: '7 6', ls: '5 4', got: true, upset: true, skin: [0, 4] as const },
    { win: el ? 'Λοβάκης' : 'Lovakis', lose: el ? 'Σερβίδης' : 'Servidis', ws: '6 7 6', ls: '3 6 4', got: false, skin: [1, 3] as const },
  ];
  return (
    <Phone s={s} label={r.title} tab={1}>
      <div className="hm-head">
        <p className="ph-title">{r.title}</p>
      </div>
      <p className="rs-sum">
        <b>{r.summary}</b>
        <i>{r.points}</i>
      </p>
      <p className="ph-day">{r.day}</p>
      {rows.map((x, n) => (
        <button
          key={x.win}
          type="button"
          tabIndex={live ? 0 : -1}
          className={`rs-card${x.got ? ' got' : ''}${open === n ? ' on' : ''}`}
          onClick={() => setOpen(open === n ? null : n)}
          aria-expanded={open === n}
        >
          <span className="rs-line win">
            <Face id={`rw${n}${live ? '' : 'h'}`} skin={x.skin[0]} hair="short" colour="brown" size={30} />
            <b>{x.win}</b>
            <span className="ph-sets">{x.ws}</span>
          </span>
          <span className="rs-line">
            <Face id={`rl${n}${live ? '' : 'h'}`} skin={x.skin[1]} hair="curly" colour="black" size={30} />
            <span>{x.lose}</span>
            <span className="ph-sets">{x.ls}</span>
          </span>
          <span className="rs-foot">
            {x.got ? <strong>{r.right} ✓</strong> : <strong className="miss">{r.wrong}</strong>}
            {x.upset ? <em>{r.upset}</em> : null}
          </span>
        </button>
      ))}
    </Phone>
  );
}

/** «Δες τον αντίπαλό σου» (Pro): the opponent's whole history, three parts one tap apart */
export function ScoutScreen({ s, live = true }: { s: S; live?: boolean }) {
  const c = s.scout;
  const el = s.lang === 'el';
  const [tab, setTab] = useState(0);
  const [format, setFormat] = useState(0);
  const [votes, setVotes] = useState([12, 9, 7]);
  const [mine, setMine] = useState<number | null>(null);
  const form = ['w', 'w', 'l', 'w', 'w'];
  const singles = el
    ? [['Ν', 'Σερβίδης', '6-3 6-4'], ['Ν', 'Λοβάκης', '7-5 6-2'], ['Η', 'Ρακετάκης', '4-6 6-7']]
    : [['W', 'Servidis', '6-3 6-4'], ['W', 'Lovakis', '7-5 6-2'], ['L', 'Raketakis', '4-6 6-7']];
  const doubles = el
    ? [['Ν', 'με Λοβάκη · Βολεάδης/Δροπσώτης', '6-2 6-4'], ['Η', 'με Λοβάκη · Σερβίδης/Σλάισου', '3-6 4-6']]
    : [['W', 'with Lovakis · Voleadis/Dropsotis', '6-2 6-4'], ['L', 'with Lovakis · Servidis/Slaisou', '3-6 4-6']];
  const rows = format === 0 ? singles : doubles;
  const surf = [
    [surfaceTints.clay, el ? 'Χώμα' : 'Clay', '7-1', 88],
    [surfaceTints.hard, el ? 'Σκληρό' : 'Hard', '4-3', 57],
  ] as const;
  return (
    <Phone s={s} label={c.title} tab={0}>
      <div className="hm-head">
        <p className="ph-title sc-title">{c.title}</p>
      </div>
      <div className="ph-card ph-opp">
        <div className="ph-opp-head">
          <BallPerson id={`o1${live ? '' : 'h'}`} skin={2} hair="short" hairColour="chestnut" kit="kit_clay" gear="cap" size={72} />
          <div>
            <small>{el ? 'Άρης' : 'Aris'}</small>
            <b>{el ? 'Φορχάντης' : 'Forchantis'}</b>
            <span className="ph-level">
              {c.hand} · {c.year}
            </span>
          </div>
          <span className="sc-pro">{c.pro}</span>
        </div>
        <div className="ph-tabs" role="tablist">
          {c.tabs.map((t, i) => (
            <button key={t} type="button" role="tab" tabIndex={live ? 0 : -1} aria-selected={tab === i} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>
              {t}
            </button>
          ))}
        </div>
        {tab === 0 ? (
          <div className="ph-pane">
            <div className="sc-fmt">
              {c.formats.map((f, i) => (
                <button key={f} type="button" tabIndex={live ? 0 : -1} className={format === i ? 'on' : ''} onClick={() => setFormat(i)}>
                  {f}
                </button>
              ))}
            </div>
            <div className="ph-form">
              {form.map((f, i) => (
                <span key={i} className={f}>
                  {f === 'w' ? s.won : s.lost}
                </span>
              ))}
              <em>11-4</em>
            </div>
            <p className="ph-label">{c.last}</p>
            {rows.map(([r, who, sc]) => (
              <p key={who} className="ph-last">
                <span className={r === s.won ? 'w' : 'l'}>{r}</span> {who} <em>{sc}</em>
              </p>
            ))}
          </div>
        ) : null}
        {tab === 1 ? (
          <div className="ph-pane">
            <p className="ph-h2h">
              <b>2</b> - <b>1</b>
            </p>
            <p className="ph-crowd">{c.h2hLine}</p>
            <p className="ph-label">{c.surfaces}</p>
            {surf.map(([tint, name, rec, w]) => (
              <p key={name} className="sc-surf">
                <span style={{ background: tint.bg, color: tint.ink }}>{name}</span>
                <i>
                  <u style={{ width: `${w}%` }} />
                </i>
                <em>{rec}</em>
              </p>
            ))}
            <p className="ph-label">{c.partners}</p>
            <p className="ph-last">
              {el ? 'με Λοβάκη' : 'with Lovakis'} <em>{el ? '4 ματς μαζί' : '4 matches together'}</em>
            </p>
          </div>
        ) : null}
        {tab === 2 ? (
          <div className="ph-pane">
            <div className="ph-traits">
              {c.traits.map((t, i) => (
                <button key={t} type="button" tabIndex={live ? 0 : -1} className={mine === i ? 'on' : ''} onClick={() => {
                  if (mine !== null) return;
                  setMine(i);
                  setVotes(votes.map((v, k) => (k === i ? v + 1 : v)));
                }}>
                  {t} <b>{votes[i]}</b>
                </button>
              ))}
            </div>
            <p className="ph-crowd">{c.playsHint}</p>
          </div>
        ) : null}
      </div>
    </Phone>
  );
}

/** inside a tournament: Σήμερα | Ταμπλό | Πρόγραμμα, and hold a name to see its run («Αν κερδίσει») */
export function TournamentScreen({ s, live = true }: { s: S; live?: boolean }) {
  const t = s.tournament;
  const el = s.lang === 'el';
  const [tab, setTab] = useState(0);
  const [path, setPath] = useState(false);
  const sets = [
    [t.round[0], '✓', '6-3 6-4'],
    [t.round[1], '✓', '7-5 6-2'],
  ];
  const pair = (a: string, b: string): Pair => [{ name: a, pct: 58 }, { name: b, pct: 42 }];
  return (
    <Phone s={s} label={t.name} tab={0}>
      <div className="tn-head">
        <p className="ph-title">{t.name}</p>
        <small>{t.meta}</small>
      </div>
      <div className="ph-tabs tn-tabs" role="tablist">
        {t.tabs.map((x, i) => (
          <button key={x} type="button" role="tab" tabIndex={live ? 0 : -1} aria-selected={tab === i} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>
            {x}
          </button>
        ))}
      </div>
      {tab === 0 ? (
        <>
          <div className="tn-record">
            <b>{t.newRecord}</b>
            <span>{t.streakLine}</span>
          </div>
          <div className="rs-card got tn-done">
            <span className="rs-line win">
              <b>{el ? 'Ρακετάκης' : 'Raketakis'}</b>
              <span className="ph-sets">6 6</span>
            </span>
            <span className="rs-line">
              <span>{el ? 'Δροπσώτης' : 'Dropsotis'}</span>
              <span className="ph-sets">4 3</span>
            </span>
            <span className="rs-foot">
              <strong>
                {s.results.right} ✓ <i>+10</i>
              </strong>
            </span>
          </div>
          <VoteRow s={s} live={live} meta="18:00 · M 40+" pair={pair(el ? 'Φορχάντης' : 'Forchantis', el ? 'Σερβίδης' : 'Servidis')} onHold={(i) => i === 0 && setPath(true)} />
          <p className="hm-hint">{t.hint}</p>
        </>
      ) : null}
      {tab === 1 ? (
        <div className="tn-draw">
          {t.round.slice(1).map((r, i) => (
            <p key={r}>
              <small>{r}</small>
              <b>{i === 0 ? (el ? 'Ρακετάκης · Δροπσώτης' : 'Raketakis · Dropsotis') : i === 1 ? (el ? 'Φορχάντης · Σερβίδης' : 'Forchantis · Servidis') : '?'}</b>
            </p>
          ))}
        </div>
      ) : null}
      {tab === 2 ? (
        <div className="tn-draw">
          {t.schedule.map((x) => (
            <p key={x}>
              <b>{x}</b>
            </p>
          ))}
        </div>
      ) : null}
      {path ? (
        <div className="tn-sheet" role="dialog" aria-label={t.hold}>
          <button type="button" className="tn-close" tabIndex={live ? 0 : -1} onClick={() => setPath(false)} aria-label="‹">
            {t.close}
          </button>
          <p className="ph-title">{t.path}</p>
          <p className="ph-label">{t.hold}</p>
          {sets.map(([round, ok, score]) => (
            <p key={round} className="ph-last">
              <span className="w">{ok}</span> {round} <em>{score}</em>
            </p>
          ))}
          <p className="ph-last">
            <span className="l">=</span> {t.round[2]} <em>18:00</em>
          </p>
          <p className="tn-if">
            <small>{t.ifWins}</small>
            <b>{el ? 'Ρακετάκης ή Δροπσώτης' : 'Raketakis or Dropsotis'}</b>
          </p>
        </div>
      ) : null}
    </Phone>
  );
}
