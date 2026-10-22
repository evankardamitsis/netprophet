import { colors } from '@netprophet/tokens';
import { BallPerson } from './BallPerson';
import { content, type Lang } from './content';
import { HomeScreen, ResultsScreen, ScoutScreen, TournamentScreen } from './Screens';
import { Shell } from './Shell';
import { StoreBadges } from './StoreBadges';

/** the four sports' balls hopping on the hero's court, like the app's first screen */
const BALLS = [
  { left: '4%', size: 30, color: colors.lime, delay: '0s', dur: '1.5s' },
  { left: '20%', size: 24, color: colors.padelBall, delay: '.35s', dur: '1.3s' },
  { left: '78%', size: 40, color: colors.basketBall, delay: '.7s', dur: '1.8s' },
  { left: '92%', size: 34, color: colors.paper, delay: '1.05s', dur: '1.6s' },
];

const SCREENS = { today: HomeScreen, results: ResultsScreen, opponent: ScoutScreen } as const;

export function Home({ lang }: { lang: Lang }) {
  const c = content(lang);
  return (
    <Shell lang={lang}>
      <div className="hero">
        <div className="wrap">
          <div>
            <p className="eyebrow">{c.hero.eyebrow}</p>
            <h1 className="display questions">
              {c.hero.questions.map((q, i) => (
                <a key={q} href={`#${c.questions[i]!.id}`} style={{ animationDelay: `${i * 140}ms` }}>
                  {q}
                </a>
              ))}
            </h1>
            <p className="line">{c.hero.line}</p>
            <a className="cta" href="#today">
              {c.hero.cta}
            </a>
            <StoreBadges lang={lang} soon={c.hero.soon} />
          </div>
          <div className="stage" aria-hidden="true">
            <div className="court" />
            {BALLS.map((b) => (
              <span
                key={b.left}
                className="ball"
                style={{ left: b.left, width: b.size, height: b.size, background: b.color, animationDelay: b.delay, animationDuration: b.dur }}
              />
            ))}
            {/* the three answers, fanned out */}
            <div className="fan">
              <div className="fan-l">
                <ResultsScreen s={c.screens} live={false} />
              </div>
              <div className="fan-r">
                <ScoutScreen s={c.screens} live={false} />
              </div>
              <div className="fan-c">
                <HomeScreen s={c.screens} live={false} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {c.questions.map((q, i) => {
        const Screen = SCREENS[q.id as keyof typeof SCREENS];
        return (
          <section key={q.id} id={q.id} className={i % 2 ? 'dark' : undefined}>
            <div className={`wrap question${i % 2 ? ' flip' : ''}`}>
              <div>
                <p className="eyebrow q-eyebrow">
                  <span>{i + 1}</span>
                  {q.eyebrow}
                </p>
                <h2 className="display">{q.title}</h2>
                <p className="lead">{q.line}</p>
                <ul className="ticks">
                  {q.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="shot">
                <Screen s={c.screens} />
                <span className="try">{c.screens.tapHint}</span>
              </div>
            </div>
          </section>
        );
      })}

      <section id={c.tournament.id} className="dark">
        <div className="wrap question flip">
          <div>
            <p className="eyebrow">{c.tournament.eyebrow}</p>
            <h2 className="display">{c.tournament.title}</h2>
            <p className="lead">{c.tournament.line}</p>
            <ul className="ticks">
              {c.tournament.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="shot">
            <TournamentScreen s={c.screens} />
            <span className="try">{c.screens.tapHint}</span>
          </div>
        </div>
      </section>

      <section className="game">
        <div className="wrap">
          <p className="eyebrow">{c.game.eyebrow}</p>
          <h2 className="display">{c.game.title}</h2>
          <p className="lead">{c.game.line}</p>
          <div className="steps">
            {c.game.steps.map((s) => (
              <div key={s.title} className="card">
                <h3 className="display">{s.title}</h3>
                <p>{s.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dark">
        <div className="wrap">
          <h2 className="display">{c.more.title}</h2>
          <div className="grid3">
            {c.more.items.map((s) => (
              <div key={s.title} className="card">
                <h3 className="display">{s.title}</h3>
                <p>{s.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap player">
          <div>
            <p className="eyebrow">{c.player.eyebrow}</p>
            <h2 className="display">{c.player.title}</h2>
            <p className="lead">{c.player.line}</p>
            <p className="note">{c.player.note}</p>
          </div>
          <div className="cast" aria-hidden="true">
            <div><BallPerson id="p1" skin={3} hair="curly" hairColour="black" kit="kit_clay" gear="cap" /></div>
            <div><BallPerson id="p2" skin={0} hair="long" hairColour="blonde" kit="kit_white" gear="shades" /></div>
            <div><BallPerson id="p3" skin={5} hair="bun" hairColour="black" kit="kit_night" gear="bucket" /></div>
            <div><BallPerson id="p4" skin={2} hair="short" hairColour="auburn" kit="kit_grass" gear="headband" /></div>
          </div>
        </div>
      </section>

      <section className="dark">
        <div className="wrap pro">
          <div>
            <p className="eyebrow">{c.pro.eyebrow}</p>
            <h2 className="display">{c.pro.title}</h2>
            <p className="lead">{c.pro.line}</p>
            <p className="price">{c.pro.price}</p>
            <p className="lead">{c.pro.note}</p>
          </div>
          <ul>
            {c.pro.items.map((i) => (
              <li key={i.title}>
                <b>{i.title}</b>
                <span>{i.line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="wrap faq">
          <h2 className="display">{c.faq.title}</h2>
          {c.faq.items.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="close dark">
        <div className="wrap">
          <h2 className="display">{c.close.title}</h2>
          <p>{c.close.line}</p>
          <StoreBadges lang={lang} soon={c.hero.soon} />
        </div>
      </section>
    </Shell>
  );
}
