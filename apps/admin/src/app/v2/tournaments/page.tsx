import { v2Configured } from '@/lib/v2/env';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { Nav } from '../Nav';
import { SignOut } from '../SignOut';
import { ui } from '../ui';
import { Tournaments } from './Tournaments';

export const dynamic = 'force-dynamic';

/** Tournaments: add a tournament once, its sheets are read 3 times a day; only the unclear things need the admin. */
export default async function TournamentsPage() {
  if (!v2Configured) {
    return (
      <main className="v2-page">
        <h1 style={ui.h1}>v2 admin is not configured</h1>
      </main>
    );
  }
  const client = await createV2ServerClient();
  const staff = await getStaff(client);
  if (!staff) {
    return (
      <main className="v2-page">
        <h1 style={ui.h1}>No access</h1>
        <p style={ui.muted}>This account is not an admin or editor on v2.</p>
        <SignOut />
      </main>
    );
  }
  return (
    <div className="v2-shell">
      <Nav here="tournaments" staff={staff} />
      <main className="v2-page narrow">
        <Tournaments />
      </main>
    </div>
  );
}
