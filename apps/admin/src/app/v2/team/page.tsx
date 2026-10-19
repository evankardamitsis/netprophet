import { v2Configured } from '@/lib/v2/env';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { Nav } from '../Nav';
import { SignOut } from '../SignOut';
import { ui } from '../ui';
import { Team } from './Team';

export const dynamic = 'force-dynamic';

/** Who runs the admin: invite, change role, remove (admins only; api.admin_team, api.admin_set_staff_role). */
export default async function TeamPage() {
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
      <Nav here="team" staff={staff} />
      <main className="v2-page">
        {staff.role === 'admin' ? (
          <Team />
        ) : (
          <>
            <h1 style={ui.h1}>Admins only</h1>
            <p style={ui.muted}>Only an admin can see and change the team. Ask an admin if you need someone added.</p>
          </>
        )}
      </main>
    </div>
  );
}
