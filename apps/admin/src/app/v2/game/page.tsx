import { v2Configured } from '@/lib/v2/env';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { Nav } from '../Nav';
import { SignOut } from '../SignOut';
import { ui } from '../ui';
import { Game } from './Game';

export const dynamic = 'force-dynamic';

/** Game settings, read-only (api.admin_game_config), and the month close dry run and close (api.admin_league_preview, admin_league_close). */
export default async function GamePage() {
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
      <Nav here="game" staff={staff} />
      <main className="v2-page">
        <Game />
      </main>
    </div>
  );
}
