import type { Metadata } from 'next';
import { Shell } from '../../../src/Shell';

export const metadata: Metadata = { title: 'Διαγραφή από τα email · NetProphet', robots: { index: false } };

/**
 * The «Διαγραφή» link in the emails. It asks first (a button), so a mail scanner that opens links never turns
 * anything off; the button posts to /email/unsubscribe, which writes the same switch as the app.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await searchParams;
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
