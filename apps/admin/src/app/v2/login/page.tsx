'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createV2BrowserClient } from '@/lib/v2/browser';
import { v2Configured } from '@/lib/v2/env';
import { ui } from '../ui';
import { sendAdminCode } from './actions';

/**
 * v2 admin sign-in: the same 6-digit email code as the app. The server sends a code only to staff (admin or editor)
 * and says the same thing for every email, so the form never tells who is staff. An account without a staff role is
 * signed out straight away after the code (the middleware checks it on every page too).
 */
const NO_ACCESS = 'This email has no admin access.';
const SENT = 'If this email has admin access, a code is on its way.';

// useSearchParams needs a Suspense boundary for the static build
export default function V2LoginPage() {
  return (
    <Suspense>
      <V2Login />
    </Suspense>
  );
}

function V2Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const denied = useSearchParams().get('denied') === '1';
  const [error, setError] = useState<string | null>(denied ? NO_ACCESS : null);

  if (!v2Configured) {
    return (
      <main className="v2-page">
        <h1 style={ui.h1}>v2 admin is not configured</h1>
        <p style={ui.muted}>Set NEXT_PUBLIC_V2_SUPABASE_URL and NEXT_PUBLIC_V2_SUPABASE_PUBLISHABLE_KEY.</p>
      </main>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      // the server decides; the answer is the same for staff and everyone else
      const r = await sendAdminCode(email);
      if (!r.ok) throw new Error(r.message);
      setCode('');
      setStep('code');
    });

  const verify = () =>
    run(async () => {
      const client = createV2BrowserClient();
      const { error: err } = await client.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: 'email',
      });
      if (err) throw err;
      const { data: me } = await client.rpc('get_me' as never);
      const role = (me as { profile?: { role?: string } } | null)?.profile?.role;
      if (role !== 'admin' && role !== 'editor') {
        await client.auth.signOut();
        setStep('email');
        setCode('');
        throw new Error(NO_ACCESS);
      }
      router.replace('/v2/results');
      router.refresh();
    });

  return (
    <main className="v2-page narrow">
      <h1 style={ui.h1}>NetProphet v2 admin</h1>
      <p style={ui.muted}>
        {step === 'email' ? 'Sign in with your staff email. You get a 6-digit code.' : `${SENT} Check ${email.trim().toLowerCase()}.`}
      </p>
      <form
        style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}
        onSubmit={(e) => {
          e.preventDefault();
          void (step === 'email' ? send() : verify());
        }}
      >
        {step === 'email' ? (
          <input
            style={ui.input}
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
        ) : (
          <input
            style={{ ...ui.input, letterSpacing: 6, textAlign: 'center' }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            aria-label="Code"
            autoFocus
          />
        )}
        {error ? <p style={ui.error}>{error}</p> : null}
        <button style={ui.primary} disabled={busy || (step === 'email' ? !email.includes('@') : code.length !== 6)}>
          {busy ? (step === 'email' ? 'Sending…' : 'Signing in…') : step === 'email' ? 'Send code' : 'Sign in'}
        </button>
        {step === 'code' ? (
          <button type="button" style={ui.link} onClick={() => setStep('email')}>
            ‹ Different email
          </button>
        ) : null}
      </form>
    </main>
  );
}
