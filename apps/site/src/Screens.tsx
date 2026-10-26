'use client';
import { useRef, useState } from 'react';
import { surfaceTints } from '@netprophet/tokens';
import { BallPerson } from './BallPerson';
import type { Screens as S } from './content';

/**
 * The app's screens drawn as phones you can try (founder, 16 Oct: "make the mockups interactive"; refreshed 26 Oct to
 * the app as it is now): tap a name to vote, hold a name to see its run through the draw, switch the scout card's
 * parts, tap a trait for +1. Every name is made up. Drawn in the app's look, not screenshots, so they stay sharp and
 * follow the brand tokens.
 */
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
        <span className="phone-pro">{s.proPill}</span>
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

type Pair = [{ name: string; pct: number }, { name: string; pct: number }];

/**
 * One match as the app's vote row: the time on the left, a small line, then the two names as full-width buttons, one
 * under the other. Tap a name to vote (instant): the chosen name fills lime and the percentage shows. With `onHold`,
 * holding a name opens its run through the draw instead.
 */
function VoteRow({ time, meta, pair, live = true, onHold }: { time: string; meta: string; pair: Pair; live?: boolean; onHold?: (i: number) => void }) {
  const [pick, setPick] = useState<0 | 1 | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <div className="vr">
      <span className="vr-time">{time}</span>
      <div className="vr-body">
        <p className="vr-meta">{meta}</p>
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

const split = (a: string, b: string, pa: number): Pair => [{ name: a, pct: pa }, { name: b, pct: 100 - pa }];

/** «Σήμερα», the home of the app, top to bottom as it is now (layout C) */
export function HomeScreen({ s, live = true }: { s: S; live?: boolean }) {
  const h = s.home;
  const el = s.lang === 'el';
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
          <span className="hm-chev" aria-hidden="true">›</span>
        </div>
        <div className="hm-row">
          <span className="hm-time">
            <em>{h.nowCaps}</em>
          </span>
          <div>
            <b>{h.friends}</b>
            <small>{h.friendsLine}</small>
          </div>
          <span className="hm-chev" aria-hidden="true">›</span>
        </div>
      </div>

      <div className="hm-tour-head">
        <p className="hm-h">{h.tournaments}</p>
        <button type="button" className="hm-add" tabIndex={live ? 0 : -1}>
          {h.addMatch}
        </button>
      </div>
      <div className="hm-strip">
        <div className="hm-scard">
          <b>{s.tournament.name}</b>
          <p>
            <em>{h.nowCaps}</em>
            <span>{h.friends}</span>
          </p>
          <span className="hm-tag on">{h.playing}</span>
        </div>
        <div className="hm-scard">
          <b>{el ? 'Κύπελλο Βούλας' : 'Voula Cup'}</b>
          <p>
            <span>{h.nextMatch}</span>
          </p>
          <span className="hm-tag">{h.following}</span>
        </div>
        <div className="hm-scard all">
          <b>{h.all}</b>
        </div>
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

      <div className="hm-quiz" style={{ background: surfaceTints.hard.bg, color: surfaceTints.hard.ink }}>
        <span className="hm-qnum" aria-hidden="true">
          6
        </span>
        <div>
          <b>{h.quizTitle}</b>
          <small>{h.quizLine}</small>
        </div>
      </div>

      <div className="hm-vote">
        <p className="hm-h">{h.vote}</p>
        <p className="vg-head">
          <b>{s.tournament.name}</b>
          <small>{h.count}</small>
        </p>
        <VoteRow live={live} time="19:30" meta={el ? 'Μ 40+' : 'MS 40+'} pair={split(el ? 'Ρακετάκης' : 'Raketakis', el ? 'Σερβίδης' : 'Servidis', 62)} />
        <VoteRow live={live} time="20:00" meta={el ? 'Μ 50+' : 'MS 50+'} pair={split(el ? 'Λοβάκης' : 'Lovakis', el ? 'Βολεάδης' : 'Voleadis', 44)} />
        <VoteRow
          live={live}
          time="20:30"
          meta={el ? 'ΜΔ 45+' : 'MD 45+'}
          pair={split(el ? 'Δροπσώτης & Βολεάκη' : 'Dropsotis & Voleaki', el ? 'Σλάισου & Λοβάκης' : 'Slaisou & Lovakis', 51)}
        />
        <span className="hm-more">{h.more}</span>
      </div>
    </Phone>
  );
}

/** «Αποτελέσματα»: the scoreboard, white cards, ink for an upset, the lime pill when you called it */
export function ResultsScreen({ s }: { s: S; live?: boolean }) {
  const r = s.results;
  const el = s.lang === 'el';
  const rows = [
    {
      cat: el ? 'Μ 40+' : 'MS 40+',
      round: el ? 'Ημιτελικός' : 'Semi-final',
      win: el ? 'Ρακετάκης Γ.' : 'Raketakis G.',
      lose: el ? 'Φορχάντης Α.' : 'Forchantis A.',
      ws: '6 6',
      ls: '4 3',
      score: '6-4 6-3',
      pct: 62,
      said: el ? 'Ρακετάκης' : 'Raketakis',
      got: true,
      upset: false,
    },
    {
      cat: el ? 'Μ 50+' : 'MS 50+',
      round: el ? 'Προημιτελικός' : 'Quarter-final',
      win: el ? 'Σλάισου Κ.' : 'Slaisou K.',
      lose: el ? 'Βολεάκη Π.' : 'Voleaki P.',
      ws: '7 6',
      ls: '5 4',
      score: '7-5 6-4',
      pct: 71,
      said: el ? 'Βολεάκη' : 'Voleaki',
      got: false,
      upset: true,
    },
    {
      cat: el ? 'Μ 40+' : 'MS 40+',
      round: el ? 'Προημιτελικός' : 'Quarter-final',
      win: el ? 'Λοβάκης Δ.' : 'Lovakis D.',
      lose: el ? 'Σερβίδης Ν.' : 'Servidis N.',
      ws: '6 3 2',
      ls: `3 6 ${r.retired}`,
      score: `6-3 3-6 2-0 ${r.retired}`,
      pct: 58,
      said: el ? 'Σερβίδης' : 'Servidis',
      got: false,
      upset: false,
    },
  ];
  return (
    <Phone s={s} label={r.title} tab={1}>
      <div className="hm-head">
        <p className="ph-title">{r.title}</p>
      </div>
      <p className="rs-sub">{r.subtitle}</p>
      <div className="rs-search">
        <span>{r.search}</span>
        <em>{r.tournaments}</em>
      </div>
      <p className="ph-day">{r.yesterday}</p>
      <p className="rs-event">{s.tournament.name}</p>
      {rows.map((x) => (
        <div key={x.win} className={`rs-card${x.upset ? ' hot' : ''}`}>
          <p className="rs-cat">
            <b>{x.cat}</b>
            <span>{x.round}</span>
          </p>
          {x.upset || x.got ? (
            <p className="rs-top">
              {x.upset ? <span className="rs-tag">{r.upset}</span> : <span />}
              {x.got ? <span className="rs-pill">{r.calledIt}</span> : null}
            </p>
          ) : null}
          <div className="rs-pair">
            <div className="rs-names">
              <b>{x.win}</b>
              <span>{x.lose}</span>
            </div>
            <div className="rs-scores">
              <b>{x.ws}</b>
              <span>{x.ls}</span>
            </div>
          </div>
          <p className="rs-meta">
            {x.score} · {r.line.replace('{pct}', String(x.pct)).replace('{name}', x.said)}
          </p>
        </div>
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

/** the small caps label over a block, without accents (the app's greekCaps) */
const caps = (v: string) => v.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * One player in one tournament, as the app's player screen: the name on top, then a header for each category and pair
 * they play here (the held one open, the others closed with ↓). In the open one: «Αν κερδίσει», the next match, the
 * path in the draw (won rounds in lime) and what they did so far (✓ on lime for a win). «‹» closes it.
 */
function PlayerRun({ s, live = true, onClose }: { s: S; live?: boolean; onClose?: () => void }) {
  const p = s.player;
  const [open, setOpen] = useState([true, false]);
  const toggle = (i: number) => setOpen(open.map((o, k) => (k === i ? !o : o)));
  const labels = [p.held, p.other];
  return (
    <div className="pr">
      <button type="button" className="tn-close" tabIndex={live ? 0 : -1} onClick={onClose} aria-label={s.tournament.close} disabled={!onClose}>
        {s.tournament.close}
      </button>
      <div className="pr-top">
        <p className="ph-title pr-name">{p.name}</p>
        <small>{p.tournament}</small>
      </div>
      {labels.map((label, i) => (
        <div key={label} className="pr-sec">
          <button type="button" tabIndex={live ? 0 : -1} className={`pr-head${open[i] ? ' on' : ''}`} aria-expanded={open[i]} onClick={() => toggle(i)}>
            <span>{label}</span>
            <b>{open[i] ? '↑' : '↓'}</b>
          </button>
          {open[i] ? (
            <div className="pr-body">
              {i === 0 ? (
                <>
                  <p className="pr-if">
                    <b>{p.ifWins}</b>
                    <small>{p.ifWinsWhen}</small>
                  </p>
                </>
              ) : null}
              <button type="button" tabIndex={live ? 0 : -1} className={`pr-path${i === 0 ? '' : ' quiet'}`}>
                <span className="pr-path-top">
                  <b>{p.pathBtn}</b>
                  <span aria-hidden="true">›</span>
                </span>
                {i === 0 ? (
                  <span className="pr-mini" aria-hidden="true">
                    <i className="won" />
                    <u className="walked" />
                    <i className="won" />
                    <u className="walked" />
                    <i className="next" />
                    <u />
                    <i className="open" />
                  </span>
                ) : null}
              </button>
              <div>
                <p className="pr-label">{caps(p.played)}</p>
                <div className="pr-list">
                  {(i === 0 ? p.rows : p.rows.slice(0, 1)).map((r) => (
                    <p key={r.against} className="pr-played">
                      <span className="tick" aria-hidden="true">✓</span>
                      <span>
                        <b>{r.against}</b>
                        <small>{r.meta}</small>
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** the section that comes after the tournament: a held name's whole run, in the phone */
export function PlayerScreen({ s, live = true }: { s: S; live?: boolean }) {
  return (
    <Phone s={s} label={s.player.name} tab={0}>
      <PlayerRun s={s} live={live} />
    </Phone>
  );
}

/** inside a tournament: Σήμερα | Ταμπλό | Πρόγραμμα, and hold a name to see its run («Αν κερδίσει») */
export function TournamentScreen({ s, live = true }: { s: S; live?: boolean }) {
  const t = s.tournament;
  const h = s.home;
  const el = s.lang === 'el';
  const [tab, setTab] = useState(0);
  const [path, setPath] = useState(false);
  const [follows, setFollows] = useState(false);
  return (
    <Phone s={s} label={t.name} tab={0}>
      <p className="tn-back">{t.back}</p>
      <div className="tn-title">
        <p className="ph-title tn-name">{t.name}</p>
        <button type="button" tabIndex={live ? 0 : -1} className={`tn-follow${follows ? ' on' : ''}`} onClick={() => setFollows(!follows)} aria-pressed={follows}>
          {follows ? t.following : t.follow}
        </button>
      </div>
      <small className="tn-meta">{t.meta}</small>
      <div className="ph-tabs tn-tabs" role="tablist">
        {t.tabs.map((x, i) => (
          <button key={x} type="button" role="tab" tabIndex={live ? 0 : -1} aria-selected={tab === i} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>
            {x}
          </button>
        ))}
      </div>
      {tab === 0 ? (
        <>
          <div className="hm-yours tn-mine">
            <div className="hm-row">
              <span className="hm-time">18:00</span>
              <div>
                <b>{h.myMatch}</b>
                <small>{t.mineLine}</small>
              </div>
              <span className="hm-chev" aria-hidden="true">›</span>
            </div>
          </div>
          <div className="tn-court">
            <small>{t.court}</small>
            <p>
              <em className="now">{h.now}</em>
              <b>{h.friends}</b>
            </p>
            <p>
              <em>{t.next}</em>
              <span>{t.schedule[0]}</span>
            </p>
          </div>
          <p className="tn-group">{t.category}</p>
          <VoteRow
            live={live}
            time="19:30"
            meta={t.round[2]!}
            pair={split(el ? 'Φορχάντης & Ρήγας' : 'Forchantis & Rigas', el ? 'Δροπσώτης & Βολεάκη' : 'Dropsotis & Voleaki', 58)}
            onHold={() => setPath(true)}
          />
          <p className="tn-group">{s.player.other.replace('45+', '50+')}</p>
          <VoteRow live={live} time="20:00" meta={t.round[1]!} pair={split(el ? 'Βολεάδης' : 'Voleadis', el ? 'Σλάισου' : 'Slaisou', 46)} />
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
          <PlayerRun s={s} live={live} onClose={() => setPath(false)} />
        </div>
      ) : null}
    </Phone>
  );
}
