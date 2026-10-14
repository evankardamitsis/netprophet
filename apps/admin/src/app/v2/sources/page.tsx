import { v2Configured } from '@/lib/v2/env';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { Nav } from '../Nav';
import { SignOut } from '../SignOut';
import { ui } from '../ui';
import { Sources } from './Sources';

export const dynamic = 'force-dynamic';

/** Sources: each tournament's sheet, its scheduled runs, and the review queue the runs leave (M4 part 1). */
export default async function SourcesPage() {
  if (!v2Configured) {
    return (
      <main style={ui.main}>
        <h1 style={ui.h1}>v2 admin is not configured</h1>
      </main>
    );
  }
  const client = await createV2ServerClient();
  const staff = await getStaff(client);
  if (!staff) {
    return (
      <main style={ui.main}>
        <h1 style={ui.h1}>No access</h1>
        <p style={ui.muted}>This account is not an admin or editor on v2.</p>
        <SignOut />
      </main>
    );
  }
  return (
    <div className="v2-shell">
      <Nav here="sources" staff={staff} />
      <main style={{ ...ui.main, maxWidth: 1100 }}>
        <Sources />
      </main>
    </div>
  );
}
