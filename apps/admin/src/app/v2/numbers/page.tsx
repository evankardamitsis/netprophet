import { v2Configured } from '@/lib/v2/env';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { Nav } from '../Nav';
import { SignOut } from '../SignOut';
import { ui } from '../ui';
import { Numbers } from './Numbers';

export const dynamic = 'force-dynamic';

/** The Numbers desk (founder, 25 Nov 2026): store downloads, accounts, active users, Pro and daily play (admins only). */
export default async function NumbersPage() {
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
      <Nav here="numbers" staff={staff} />
      <main className="v2-page">
        {staff.role === 'admin' ? (
          <Numbers />
        ) : (
          <>
            <h1 style={ui.h1}>Admins only</h1>
            <p style={ui.muted}>Only an admin can see the numbers.</p>
          </>
        )}
      </main>
    </div>
  );
}
