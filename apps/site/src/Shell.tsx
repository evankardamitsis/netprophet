import Link from 'next/link';
import { CONTACT, content, type Lang } from './content';

/** the ink bar on top (logo, Απόρρητο, Βοήθεια, the other language) and the footer */
export function Shell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const c = content(lang);
  const base = lang === 'el' ? '' : '/en';
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link href={base || '/'} aria-label="NetProphet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-on-ink.svg" alt="NetProphet" width={160} height={30} />
          </Link>
          <nav className="links">
            <Link className="wide-only" href={`${base}/privacy`}>
              {c.nav.privacy}
            </Link>
            <Link className="wide-only" href={`${base}/support`}>
              {c.nav.support}
            </Link>
            <Link href={c.nav.otherHref} hrefLang={lang === 'el' ? 'en' : 'el'}>
              {c.nav.other}
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer>
        <div className="wrap">
          <span>{c.footer.by}</span>
          <span className="foot-links">
            <Link href={`${base}/privacy`}>{c.nav.privacy}</Link>
            <Link href={`${base}/support`}>{c.nav.support}</Link>
          </span>
          <span>
            {c.footer.contact}: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </span>
        </div>
      </footer>
    </>
  );
}
