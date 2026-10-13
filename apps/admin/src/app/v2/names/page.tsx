import { v2Configured } from '@/lib/v2/env';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { Nav } from '../Nav';
import { SignOut } from '../SignOut';
import { ui } from '../ui';
import { Names } from './Names';

export const dynamic = 'force-dynamic';

/** Accent pass for v1 capitalised names (api.admin_name_pass, admin_apply_names, admin_save_spelling). */
export default async function NamesPage() {
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
    <>
      <header style={ui.bar}>
        <Nav here="names" />
        <span style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
          {staff.name} ({staff.role}) <SignOut />
        </span>
      </header>
      <main style={ui.main}>
        <Names />
      </main>
    </>
  );
}
