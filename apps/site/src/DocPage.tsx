import type { Doc } from './legal';
import type { Lang } from './content';
import { Shell } from './Shell';

/** a text page (privacy, help) on paper */
export function DocPage({ lang, doc }: { lang: Lang; doc: Doc }) {
  return (
    <Shell lang={lang}>
      <article className="wrap doc">
        <h1 className="display">{doc.title}</h1>
        <p className="updated">{doc.updated}</p>
        <p>{doc.intro}</p>
        {doc.sections.map((s) => (
          <section key={s.heading} style={{ padding: 0 }}>
            <h2 className="display">{s.heading}</h2>
            {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
            {s.bullets ? (
              <ul>
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </article>
    </Shell>
  );
}
