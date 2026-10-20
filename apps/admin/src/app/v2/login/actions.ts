'use server';
import { createV2AnonClient, createV2ServiceClient, staffByEmail } from '@/lib/v2/service';
import { looksLikeEmail, normaliseEmail } from '@/lib/v2/staffInvite';

export type SendCodeResult = { ok: true } | { ok: false; message: string };

/** Every call takes at least this long from its start, so the response time never tells staff from everyone else. */
const MIN_RESPONSE_MS = 900;

async function padTo(startedAt: number): Promise<void> {
  const left = MIN_RESPONSE_MS - (Date.now() - startedAt);
  if (left > 0) await new Promise((resolve) => setTimeout(resolve, left));
}

/**
 * «Send code» on the admin login. A code goes only to staff (admin or editor); everyone else gets nothing. The answer
 * is the same either way, so the form never tells who is staff. Only a missing server setup is said out loud: that
 * is the same for every email. The OTP call runs only for staff, so every path is padded to the same minimum time.
 */
export async function sendAdminCode(rawEmail: string): Promise<SendCodeResult> {
  const startedAt = Date.now();
  try {
    return await sendAdminCodeNow(rawEmail);
  } finally {
    await padTo(startedAt);
  }
}

async function sendAdminCodeNow(rawEmail: string): Promise<SendCodeResult> {
  const email = normaliseEmail(rawEmail);
  if (!looksLikeEmail(email)) return { ok: false, message: 'Type a full email address.' };
  const service = createV2ServiceClient();
  if (!service) return { ok: false, message: 'Admin sign-in is not configured on this server (V2_SUPABASE_SECRET_KEY).' };
  try {
    const found = await staffByEmail(service.rpc, email);
    if (found && (found.role === 'admin' || found.role === 'editor')) {
      const { error } = await createV2AnonClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) console.error('v2 admin login: the code was not sent:', error.message);
    }
  } catch (e) {
    console.error('v2 admin login: staff lookup failed:', e instanceof Error ? e.message : e);
  }
  return { ok: true };
}
