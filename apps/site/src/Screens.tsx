import { BallPerson } from './BallPerson';
import type { Content } from './content';

/**
 * The three questions as the app answers them, drawn as phone screens in the app's look (ink header with σερί and
 * πόντοι, paper body, the ball people). Not screenshots: they stay sharp and follow the brand tokens.
 */
type S = Content['screens'];

function Phone({ s, children }: { s: S; children: React.ReactNode }) {
  return (
    <div className="phone" aria-hidden="true">
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

function Face({ id, skin, hair, colour, gear }: { id: string; skin: number; hair: 'short' | 'curly' | 'long' | 'bun'; colour: 'black' | 'brown' | 'blonde' | 'auburn' | 'grey' | 'chestnut'; gear?: 'cap' | 'headband' | 'shades' | 'bucket' | null }) {
  return <BallPerson id={id} skin={skin} hair={hair} hairColour={colour} kit="kit_green" gear={gear ?? null} size={46} />;
}

export function TodayScreen({ s }: { s: S }) {
  return (
    <Phone s={s}>
      <p className="ph-title">{s.today}</p>
      <div className="ph-mine">
        <span className="ph-eyebrow">{s.yourMatch}</span>
        <p className="ph-mine-line">{s.yourMatchLine}</p>
        <span className="ph-pro">{s.proButton}</span>
      </div>
      <div className="ph-card">
        <p className="ph-meta">{s.matchMeta}</p>
        <div className="ph-sides">
          <div className="ph-side picked">
            <Face id="t1" skin={1} hair="short" colour="brown" />
            <b>Πράτσας</b>
            <small>Νίκος</small>
            <span className="ph-pct">62%</span>
          </div>
          <div className="ph-side">
            <Face id="t2" skin={3} hair="curly" colour="black" />
            <b>Βλάχος</b>
            <small>Γιώργος</small>
            <span className="ph-pct">38%</span>
          </div>
        </div>
        <p className="ph-learn">✓ {s.learn}</p>
      </div>
    </Phone>
  );
}

export function ResultsScreen({ s }: { s: S }) {
  return (
    <Phone s={s}>
      <p className="ph-title">{s.results}</p>
      <p className="ph-day">{s.yesterday}</p>
      <div className="ph-card ph-result">
        <div className="ph-row win">
          <Face id="r1" skin={1} hair="short" colour="brown" />
          <b>Πράτσας</b>
          <span className="ph-sets">6 6</span>
        </div>
        <div className="ph-row">
          <Face id="r2" skin={2} hair="short" colour="chestnut" />
          <span>Κοψιάλης</span>
          <span className="ph-sets">4 3</span>
        </div>
        <p className="ph-crowd">{s.crowd}</p>
        <span className="ph-called">{s.called}</span>
      </div>
      <div className="ph-card ph-result dark">
        <span className="ph-upset">{s.upset}</span>
        <div className="ph-row win">
          <Face id="r3" skin={0} hair="long" colour="blonde" />
          <b>Ρήγου</b>
          <span className="ph-sets">7 6</span>
        </div>
        <div className="ph-row">
          <Face id="r4" skin={4} hair="bun" colour="black" />
          <span>Λάγου</span>
          <span className="ph-sets">5 4</span>
        </div>
      </div>
    </Phone>
  );
}

export function OpponentScreen({ s }: { s: S }) {
  const form = ['w', 'w', 'l', 'w', 'w'];
  return (
    <Phone s={s}>
      <p className="ph-title">{s.opponent}</p>
      <div className="ph-card ph-opp">
        <div className="ph-opp-head">
          <BallPerson id="o1" skin={2} hair="short" hairColour="chestnut" kit="kit_clay" gear="cap" size={78} />
          <div>
            <small>Αλέξανδρος</small>
            <b>Κοψιάλης</b>
            <span className="ph-level">
              {s.level} · {s.rising}
            </span>
          </div>
        </div>
        <p className="ph-label">{s.form}</p>
        <div className="ph-form">
          {form.map((f, i) => (
            <span key={i} className={f}>
              {f === 'w' ? s.won : s.lost}
            </span>
          ))}
          <em>11-4</em>
        </div>
        <p className="ph-label">{s.h2h}</p>
        <p className="ph-h2h">
          <b>2</b> - <b>1</b>
        </p>
        <p className="ph-label">{s.plays}</p>
        <div className="ph-traits">
          {s.traits.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </Phone>
  );
}
