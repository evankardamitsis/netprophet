import type { Metadata } from 'next';
import { Shell } from '../../src/Shell';
import { StoreBadges } from '../../src/StoreBadges';
import { OpenApp } from './OpenApp';

export const metadata: Metadata = { title: 'Άνοιξε το NetProphet', robots: { index: false } };

/**
 * Where every email button lands (17 Nov 2026). Build 1.0.0 has no Universal Links, so this page opens the app by
 * its scheme and, if nothing happens, shows the store badges.
 */
export default function Page() {
  return (
    <Shell lang="el">
      <section className="wrap doc">
        <h1>Άνοιξε το NetProphet</h1>
        <p>Αν δεν άνοιξε μόνο του, πάτα το κουμπί ή κατέβασέ το από το κατάστημα.</p>
        <OpenApp label="Άνοιξε την εφαρμογή" />
        <StoreBadges lang="el" soon="Έρχεται στο App Store και στο Google Play" />
      </section>
    </Shell>
  );
}
