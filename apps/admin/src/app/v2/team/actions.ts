'use server';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { createV2ServiceClient, staffByEmail, type Rpc } from '@/lib/v2/service';
import { inviteEmail, looksLikeEmail, normaliseEmail, type TeamRole } from '@/lib/v2/staffInvite';

/** one admin or editor as api.admin_team returns it */
export interface TeamMember {
  user_id: string;
  email: string | null;
  name: string | null;
  role: 'admin' | 'editor' | 'user';
  last_sign_in_at: string | null;
  added_at: string | null;
  added_by: string | null;
  is_me: boolean;
}

export type TeamResult = { ok: true; member: TeamMember; changed: boolean } | { ok: false; message: string };
export type InviteResult =
  | { ok: true; member: TeamMember; changed: boolean; created: boolean; emailed: boolean; emailProblem?: string }
  | { ok: false; message: string };

/** the signed-in admin's rpc and name; every action checks it again (and the database does too) */
async function adminRpc(): Promise<{ rpc: Rpc; name: string }> {
  const client = await createV2ServerClient();
  const staff = await getStaff(client);
  if (!staff || staff.role !== 'admin') throw new Error('forbidden');
  return { rpc: client.rpc.bind(client) as unknown as Rpc, name: staff.name };
}

const fail = (e: unknown) => ({ ok: false as const, message: e instanceof Error ? e.message : 'failed' });

export async function loadTeam(): Promise<TeamMember[]> {
  const { rpc } = await adminRpc();
  const { data, error } = await rpc('admin_team', {});
  if (error) throw new Error(error.message);
  return (data ?? []) as TeamMember[];
}

async function setRole(rpc: Rpc, userId: string, role: TeamRole | 'user'): Promise<{ member: TeamMember; changed: boolean }> {
  const { data, error } = await rpc('admin_set_staff_role', { p_user: userId, p_role: role });
  if (error) throw new Error(error.message);
  const row = data as TeamMember & { changed: boolean };
  return { member: row, changed: row.changed };
}

/** admin <-> editor */
export async function changeRole(userId: string, role: TeamRole): Promise<TeamResult> {
  try {
    const { rpc } = await adminRpc();
    return { ok: true, ...(await setRole(rpc, userId, role)) };
  } catch (e) {
    return fail(e);
  }
}

/** off the team: the account stays, its role goes back to 'user' */
export async function removeFromTeam(userId: string): Promise<TeamResult> {
  try {
    const { rpc } = await adminRpc();
    return { ok: true, ...(await setRole(rpc, userId, 'user')) };
  } catch (e) {
    return fail(e);
  }
}

async function sendInvite(to: string, role: TeamRole, inviter: string): Promise<{ emailed: boolean; emailProblem?: string }> {
  const resend = process.env.RESEND_API_KEY;
  if (!resend) return { emailed: false, emailProblem: 'RESEND_API_KEY is not set' };
  const mail = inviteEmail({ role, inviter });
  try {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'NetProphet <noreply@netprophetapp.com>', to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
    });
    return sent.ok ? { emailed: true } : { emailed: false, emailProblem: `Resend answered ${sent.status}` };
  } catch (e) {
    return { emailed: false, emailProblem: e instanceof Error ? e.message : 'Resend could not be reached' };
  }
}

/**
 * Invite: an existing account gets the role; a new email gets an account first (confirmed, no password: they sign
 * in with a code), then the role. Then a short email says so. The role change runs as the signed-in admin, so the
 * database checks it and writes who did it.
 */
export async function inviteToTeam(rawEmail: string, role: TeamRole): Promise<InviteResult> {
  try {
    const { rpc, name } = await adminRpc();
    if (role !== 'admin' && role !== 'editor') return { ok: false, message: 'invalid_role' };
    const email = normaliseEmail(rawEmail);
    if (!looksLikeEmail(email)) return { ok: false, message: 'bad_email' };
    const service = createV2ServiceClient();
    if (!service) return { ok: false, message: 'no_service_key' };

    let found = await staffByEmail(service.rpc, email);
    let created = false;
    if (!found) {
      const { data, error } = await service.client.auth.admin.createUser({ email, email_confirm: true });
      if (error || !data.user) {
        // someone made the account a moment ago: look again
        found = await staffByEmail(service.rpc, email);
        if (!found) return { ok: false, message: `create_failed: ${error?.message ?? 'no user returned'}` };
      } else {
        found = { user_id: data.user.id, role: 'user' };
        created = true;
      }
    }
    let set: { member: TeamMember; changed: boolean };
    try {
      set = await setRole(rpc, found.user_id, role);
    } catch (e) {
      const m = e instanceof Error ? e.message : 'failed';
      return { ok: false, message: created ? `created_not_staff: ${m}` : m };
    }
    if (!set.changed) return { ok: true, ...set, created, emailed: false };
    return { ok: true, ...set, created, ...(await sendInvite(email, role, name)) };
  } catch (e) {
    return fail(e);
  }
}
