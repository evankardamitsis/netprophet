import type { Lang } from './content';

/**
 * The official App Store and Google Play badges (downloaded 16 Oct 2026 from Apple's and Google's badge tools, used
 * unmodified as both require). No links until the apps are live; then `href`s go to the store pages. Google's PNGs
 * carry their own clear space, so they are drawn taller to line up with Apple's.
 */
const STORE_LINKS: { apple: string | null; google: string | null } = { apple: null, google: null };

export function StoreBadges({ lang, soon }: { lang: Lang; soon: string }) {
  const badge = (store: 'apple' | 'google') => {
    const img =
      store === 'apple' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/badges/app-store-${lang}.svg`} alt={lang === 'el' ? 'Λήψη στο App Store' : 'Download on the App Store'} height={48} className="badge-apple" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/badges/google-play-${lang}.png`} alt={lang === 'el' ? 'Αποκτήστε το στο Google Play' : 'Get it on Google Play'} className={`badge-google badge-google-${lang}`} />
      );
    const href = STORE_LINKS[store];
    return href ? (
      <a href={href} className="badge">
        {img}
      </a>
    ) : (
      <span className="badge off">{img}</span>
    );
  };
  return (
    <div className="badges">
      <div className="badge-row">
        {badge('apple')}
        {badge('google')}
      </div>
      {!STORE_LINKS.apple || !STORE_LINKS.google ? <span className="soon">{soon}</span> : null}
    </div>
  );
}
