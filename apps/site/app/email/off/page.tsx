import type { Metadata } from 'next';
import { listPages } from '../../../src/content';
import { Shell } from '../../../src/Shell';

export const metadata: Metadata = { title: 'Διαγραφή από τα email · NetProphet', robots: { index: false } };

/**
 * The «Διαγραφή» link in the emails. It asks first (a button), so a mail scanner that opens links never turns
 * anything off; the button posts to /email/unsubscribe, which writes the same switch as the app. A website list
 * link (k=list) has no account behind it, so its page says so and its button turns off the list instead.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; k?: string; l?: string }> }) {
  const { t, done, k, l } = await searchParams;
  if (k === 'list') return <ListOff t={t} done={done} lang={l === 'en' ? 'en' : 'el'} />;
  return (
    <Shell lang="el">
      <section className="wrap doc">
        {done === '1' ? (
          <>
            <h1>Έγινε</h1>
            <p>Δεν θα σου στέλνουμε πια email για το παιχνίδι. Τα email για τον λογαριασμό σου (π.χ. ο κωδικός σύνδεσης) θα συνεχίσουν να έρχονται.</p>
          </>
        ) : done === '0' || !t ? (
          <>
            <h1>Κάτι δεν πήγε καλά</h1>
            <p>Ο σύνδεσμος δεν ισχύει πια. Γράψε μας στο hello@monadlabs.gr και σε βγάζουμε εμείς από τη λίστα.</p>
          </>
        ) : (
          <>
            <h1>Δεν θες άλλα email;</h1>
            <p>Θα σταματήσουμε τα email για το παιχνίδι (σερί, Κατάταξη, εβδομαδιαία σύνοψη). Τα email για τον λογαριασμό σου θα συνεχίσουν να έρχονται.</p>
            <form method="post" action={`/email/unsubscribe?t=${encodeURIComponent(t)}&from=page`}>
              <button type="submit" className="open-app">
                Ναι, σταμάτα τα
              </button>
            </form>
          </>
        )}
      </section>
    </Shell>
  );
}

function ListOff({ t, done, lang }: { t?: string; done?: string; lang: 'el' | 'en' }) {
  const c = listPages[lang];
  const l = lang === 'en' ? '&l=en' : '';
  return (
    <Shell lang={lang}>
      <section className="wrap doc">
        {done === '1' ? (
          <>
            <h1>{c.offDoneTitle}</h1>
            <p>{c.offDone}</p>
          </>
        ) : done === '0' || !t ? (
          <>
            <h1>{c.failTitle}</h1>
            <p>{c.offFail}</p>
          </>
        ) : (
          <>
            <h1>{c.offTitle}</h1>
            <p>{c.off}</p>
            <form method="post" action={`/email/unsubscribe?t=${encodeURIComponent(t)}&k=list&from=page${l}`}>
              <button type="submit" className="open-app">
                {c.offButton}
              </button>
            </form>
          </>
        )}
      </section>
    </Shell>
  );
}
