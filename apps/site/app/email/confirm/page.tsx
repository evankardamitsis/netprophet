import type { Metadata } from 'next';
import Link from 'next/link';
import { content, listPages } from '../../../src/content';
import { Shell } from '../../../src/Shell';
import { StoreBadges } from '../../../src/StoreBadges';
import { validToken } from '../../../src/unsubscribe';

export const metadata: Metadata = { title: 'NetProphet · email', robots: { index: false } };

/**
 * The website list's pages: «check your inbox» after the sign-up box (sent=1), the confirm email's link (t=, with a
 * button so a mail scanner confirms nothing; it posts to /email/join) and its answer (done=1 or 0).
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; sent?: string; done?: string; l?: string }> }) {
  const { t, sent, done, l } = await searchParams;
  const lang = l === 'en' ? 'en' : 'el';
  const c = listPages[lang];
  const home = lang === 'en' ? '/en#list' : '/#list';
  const suffix = lang === 'en' ? '&l=en' : '';
  let body: React.ReactNode;
  if (sent === '1') {
    body = (
      <>
        <h1>{c.sentTitle}</h1>
        <p>{c.sent}</p>
      </>
    );
  } else if (sent === '0') {
    body = (
      <>
        <h1>{c.badTitle}</h1>
        <p>{c.bad}</p>
        <p>
          <Link href={home}>{c.back}</Link>
        </p>
      </>
    );
  } else if (sent === 'err') {
    body = (
      <>
        <h1>{c.failTitle}</h1>
        <p>{c.err}</p>
        <p>
          <Link href={home}>{c.back}</Link>
        </p>
      </>
    );
  } else if (done === '1') {
    body = (
      <>
        <h1>{c.doneTitle}</h1>
        <p>{c.done}</p>
        <StoreBadges lang={lang} soon={content(lang).hero.soon} />
      </>
    );
  } else if (t && validToken(t) && done !== '0') {
    body = (
      <>
        <h1>{c.askTitle}</h1>
        <p>{c.ask}</p>
        <form method="post" action={`/email/join?t=${encodeURIComponent(t)}${suffix}`}>
          <button type="submit" className="open-app">
            {c.askButton}
          </button>
        </form>
      </>
    );
  } else {
    body = (
      <>
        <h1>{c.failTitle}</h1>
        <p>{c.fail}</p>
        <p>
          <Link href={home}>{c.back}</Link>
        </p>
      </>
    );
  }
  return (
    <Shell lang={lang}>
      <section className="wrap doc">{body}</section>
    </Shell>
  );
}
