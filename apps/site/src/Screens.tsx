'use client';
import { useState } from 'react';
import { BallPerson } from './BallPerson';
import type { Content } from './content';

/**
 * The app's answers drawn as phone screens you can try (founder, 16 Oct: "make the mockups interactive"): tap a
 * player to call the match, tap a reaction on a result, switch the opponent card's parts, answer the day's question.
 * Every name is made up. Drawn in the app's look, not screenshots, so they stay sharp and follow the brand tokens.
 */
type S = Content['screens'];
type Hair = 'short' | 'curly' | 'long' | 'bun';
type HairColour = 'black' | 'brown' | 'blonde' | 'auburn' | 'grey' | 'chestnut';

function Phone({ s, children, label }: { s: S; children: React.ReactNode; label?: string }) {
  return (
    <div className="phone" role="group" aria-label={label}>
      <div className="phone-top">
        <span className="phone-logo">
          <i />
          netprophet
        </span>
        <span className="phone-streak">
          <b>4</b> {s.streak}
        </span>
        <span className="phone-points">
          <b>320</b>
          <small>{s.points}</small>
        </span>
      </div>
      <div className="phone-body">{children}</div>
    </div>
  );
}

function Face({ id, skin, hair, colour, size = 46 }: { id: string; skin: number; hair: Hair; colour: HairColour; size?: number }) {
  return <BallPerson id={id} skin={skin} hair={hair} hairColour={colour} kit="kit_green" size={size} />;
}

/** «Ποιος παίζει σήμερα»: your match on top, then a match to call; tap a player and the crowd's split shows */
export function TodayScreen({ s, live = true }: { s: S; live?: boolean }) {
  const [pick, setPick] = useState<0 | 1 | null>(null);
  const sides = [
    { id: 't1', name: s.lang === 'el' ? 'Ρακετάκης' : 'Raketakis', first: s.lang === 'el' ? 'Νίκος' : 'Nikos', skin: 1, hair: 'short' as Hair, colour: 'brown' as HairColour, pct: 62 },
    { id: 't2', name: s.lang === 'el' ? 'Σερβίδης' : 'Servidis', first: s.lang === 'el' ? 'Γιώργος' : 'Giorgos', skin: 3, hair: 'curly' as Hair, colour: 'black' as HairColour, pct: 38 },
  ];
  return (
    <Phone s={s} label={s.today}>
      <p className="ph-title">{s.today}</p>
      <div className="ph-mine">
        <span className="ph-eyebrow">{s.yourMatch}</span>
        <p className="ph-mine-line">{s.yourMatchLine}</p>
        <a className="ph-pro" href="#opponent" tabIndex={live ? 0 : -1}>
          {s.proButton}
        </a>
      </div>
      <div className="ph-card">
        <p className="ph-meta">{s.matchMeta}</p>
        <div className="ph-sides">
          {sides.map((p, i) => (
            <button
              key={p.id}
              type="button"
              tabIndex={live ? 0 : -1}
              className={`ph-side${pick === i ? ' picked' : ''}${pick !== null && pick !== i ? ' other' : ''}`}
              onClick={() => setPick(i as 0 | 1)}
              aria-pressed={pick === i}
            >
              <Face id={`${p.id}${live ? '' : 'h'}`} skin={p.skin} hair={p.hair} colour={p.colour} />
              <b>{p.name}</b>
              <small>{p.first}</small>
              <span className={`ph-pct${pick === null ? ' hidden' : ''}`}>{p.pct}%</span>
            </button>
          ))}
        </div>
        <p className="ph-learn">{pick === null ? s.pick : `✓ ${s.learn}`}</p>
      </div>
    </Phone>
  );
}

/** «Ποιος κέρδισε χθες»: results by day; the call you got right, an upset, and reactions you can tap */
export function ResultsScreen({ s, live = true }: { s: S; live?: boolean }) {
  const [reaction, setReaction] = useState<number | null>(null);
  const counts = [24, 9];
  const el = s.lang === 'el';
  return (
    <Phone s={s} label={s.results}>
      <p className="ph-title">{s.results}</p>
      <p className="ph-day">{s.yesterday}</p>
      <div className="ph-card ph-result">
        <div className="ph-row win">
          <Face id={`r1${live ? '' : 'h'}`} skin={1} hair="short" colour="brown" size={34} />
          <b>{el ? 'Ρακετάκης' : 'Raketakis'}</b>
          <span className="ph-sets">6 6</span>
        </div>
        <div className="ph-row">
          <Face id={`r2${live ? '' : 'h'}`} skin={2} hair="short" colour="chestnut" size={34} />
          <span>{el ? 'Φορχάντης' : 'Forchantis'}</span>
          <span className="ph-sets">4 3</span>
        </div>
        <p className="ph-crowd">{s.crowd}</p>
        <div className="ph-react">
          <span className="ph-called">{s.called}</span>
          {s.reactions.map((r, i) => (
            <button key={r} type="button" tabIndex={live ? 0 : -1} className={reaction === i ? 'on' : ''} onClick={() => setReaction(reaction === i ? null : i)}>
              {r} <b>{counts[i]! + (reaction === i ? 1 : 0)}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="ph-card ph-result dark">
        <span className="ph-upset">{s.upset}</span>
        <div className="ph-row win">
          <Face id={`r3${live ? '' : 'h'}`} skin={0} hair="long" colour="blonde" size={34} />
          <b>{el ? 'Σλάισου' : 'Slaisou'}</b>
          <span className="ph-sets">7 6</span>
        </div>
        <div className="ph-row">
          <Face id={`r4${live ? '' : 'h'}`} skin={4} hair="bun" colour="black" size={34} />
          <span>{el ? 'Βολεάκη' : 'Voleaki'}</span>
          <span className="ph-sets">5 4</span>
        </div>
      </div>
    </Phone>
  );
}

/** «Ποιος είναι ο αντίπαλός σου»: the opponent card, with its three parts one tap apart */
export function OpponentScreen({ s, live = true }: { s: S; live?: boolean }) {
  const [tab, setTab] = useState(0);
  const form = ['w', 'w', 'l', 'w', 'w'];
  const el = s.lang === 'el';
  const last = el
    ? [
        ['Ν', 'Σερβίδης', '6-3 6-4'],
        ['Ν', 'Λοβάκης', '7-5 6-2'],
        ['Η', 'Ρακετάκης', '4-6 6-7'],
      ]
    : [
        ['W', 'Servidis', '6-3 6-4'],
        ['W', 'Lovakis', '7-5 6-2'],
        ['L', 'Raketakis', '4-6 6-7'],
      ];
  return (
    <Phone s={s} label={s.opponent}>
      <p className="ph-title">{s.opponent}</p>
      <div className="ph-card ph-opp">
        <div className="ph-opp-head">
          <BallPerson id={`o1${live ? '' : 'h'}`} skin={2} hair="short" hairColour="chestnut" kit="kit_clay" gear="cap" size={78} />
          <div>
            <small>{el ? 'Άρης' : 'Aris'}</small>
            <b>{el ? 'Φορχάντης' : 'Forchantis'}</b>
            <span className="ph-level">
              {s.level} · {s.rising}
            </span>
          </div>
        </div>
        <div className="ph-tabs" role="tablist">
          {s.tabs.map((t, i) => (
            <button key={t} type="button" role="tab" tabIndex={live ? 0 : -1} aria-selected={tab === i} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>
              {t}
            </button>
          ))}
        </div>
        {tab === 0 ? (
          <div className="ph-pane">
            <div className="ph-form">
              {form.map((f, i) => (
                <span key={i} className={f}>
                  {f === 'w' ? s.won : s.lost}
                </span>
              ))}
              <em>11-4</em>
            </div>
            <p className="ph-label">{s.last}</p>
            {last.map(([r, who, sc]) => (
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
            <p className="ph-crowd">{el ? 'Τελευταίο: Open Βούλας, 6-4 3-6 10-8' : 'Last: Voula Open, 6-4 3-6 10-8'}</p>
          </div>
        ) : null}
        {tab === 2 ? (
          <div className="ph-pane ph-traits">
            {s.traits.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        ) : null}
      </div>
    </Phone>
  );
}

type Side = { id: string; name: string; first: string; skin: number; hair: Hair; colour: HairColour; pct: number; tag?: string };

/** one match to call, the feed's way: tap a player and the crowd's split shows */
function MiniMatch({ meta, sides }: { meta: string; sides: [Side, Side] }) {
  const [pick, setPick] = useState<0 | 1 | null>(null);
  return (
    <div className="ph-card">
      <p className="ph-meta">{meta}</p>
      <div className="ph-sides">
        {sides.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`ph-side${pick === i ? ' picked' : ''}${pick !== null && pick !== i ? ' other' : ''}`}
            onClick={() => setPick(i as 0 | 1)}
            aria-pressed={pick === i}
          >
            <Face id={p.id} skin={p.skin} hair={p.hair} colour={p.colour} size={38} />
            <b>{p.name}</b>
            <small>{p.tag ? `${p.first} · ${p.tag}` : p.first}</small>
            <span className={`ph-pct${pick === null ? ' hidden' : ''}`}>{p.pct}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** the personalised feed: your friends' matches first, then your tournament's (founder, 16 Oct: show the feed) */
export function FeedScreen({ s }: { s: S }) {
  const el = s.lang === 'el';
  return (
    <Phone s={s} label={s.feedTitle}>
      <p className="ph-title">{s.feedTitle}</p>
      <p className="ph-day">{s.feedFriends}</p>
      <MiniMatch
        meta={s.friendMeta}
        sides={[
          { id: 'f1', name: el ? 'Σερβίδης' : 'Servidis', first: el ? 'Γιώργος' : 'Giorgos', skin: 3, hair: 'curly', colour: 'black', pct: 57, tag: s.friendTag },
          { id: 'f2', name: el ? 'Λοβάκης' : 'Lovakis', first: el ? 'Πέτρος' : 'Petros', skin: 1, hair: 'short', colour: 'grey', pct: 43 },
        ]}
      />
      <p className="ph-day">{s.feedTournament}</p>
      <MiniMatch
        meta={s.tournamentMeta}
        sides={[
          { id: 'f3', name: el ? 'Ντροπσότης' : 'Dropsotis', first: el ? 'Κώστας' : 'Kostas', skin: 2, hair: 'short', colour: 'brown', pct: 35 },
          { id: 'f4', name: el ? 'Βολεάδης' : 'Voleadis', first: el ? 'Μάνος' : 'Manos', skin: 0, hair: 'short', colour: 'blonde', pct: 65 },
        ]}
      />
    </Phone>
  );
}
