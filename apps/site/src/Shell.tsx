import Link from 'next/link';
import { Logo } from './Logo';
import { CONTACT, content, type Lang } from './content';

/**
 * The ink bar on top holds only the animated logo (founder, 16 Oct: "we don't need this main nav"); Πολιτική
 * Απορρήτου, Βοήθεια and the other language live in the footer.
 */
export function Shell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const c = content(lang);
  const base = lang === 'el' ? '' : '/en';
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link href={base || '/'} aria-label="NetProphet">
            <Logo height={30} />
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer>
        <div className="wrap">
          <span>{c.footer.by}</span>
          <nav className="foot-links" aria-label={lang === 'el' ? 'Σελίδες' : 'Pages'}>
            <Link href={`${base}/privacy`}>{c.nav.privacy}</Link>
            <Link href={`${base}/terms`}>{c.nav.terms}</Link>
            <Link href={`${base}/support`}>{c.nav.support}</Link>
            <Link href={c.nav.otherHref} hrefLang={lang === 'el' ? 'en' : 'el'}>
              {c.nav.other}
            </Link>
          </nav>
          <span>
            {c.footer.contact}: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </span>
        </div>
      </footer>
    </>
  );
}
