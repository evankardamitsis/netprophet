import { v2Configured } from '@/lib/v2/env';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { Nav } from '../../Nav';
import { SignOut } from '../../SignOut';
import { ui } from '../../ui';
import { Duplicates } from './Duplicates';

export const dynamic = 'force-dynamic';

/** «Διπλοί παίκτες»: one person under two roster rows (api.admin_duplicates, admin_merge_duplicates). */
export default async function DuplicatesPage() {
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
      <Nav here="players" staff={staff} />
      <main className="v2-page">
        <Duplicates />
      </main>
    </div>
  );
}
