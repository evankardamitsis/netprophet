import Link from 'next/link';
import type { Lang, ListBox } from './content';

/**
 * «Στείλε μου τα αποτελέσματα της εβδομάδας»: the website list (double opt-in). A plain form that posts to
 * /email/subscribe, so it works without JavaScript; the database sends the confirm email and decides the rest.
 * The hidden «website» field is a trap for bots: people never see it, so a filled one is dropped quietly.
 */
export function ListSignup({ lang, c }: { lang: Lang; c: ListBox }) {
  const base = lang === 'el' ? '' : '/en';
  return (
    <section id={c.id} className="list-box">
      <div className="wrap">
        <p className="eyebrow">{c.eyebrow}</p>
        <h2 className="display">{c.title}</h2>
        <p className="lead">{c.line}</p>
        <form method="post" action="/email/subscribe" className="list-form">
          <input type="hidden" name="lang" value={lang} />
          <label className="trap" aria-hidden="true">
            website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <label htmlFor="list-email" className="sr">
            {c.label}
          </label>
          <input id="list-email" type="email" name="email" required maxLength={254} autoComplete="email" inputMode="email" placeholder={c.placeholder} />
          <button type="submit" className="open-app">
            {c.button}
          </button>
        </form>
        <p className="list-consent">
          {c.consent} <Link href={`${base}/privacy`}>{c.privacy} ›</Link>
        </p>
      </div>
    </section>
  );
}
