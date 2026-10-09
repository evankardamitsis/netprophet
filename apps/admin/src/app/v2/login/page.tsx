'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createV2BrowserClient } from '@/lib/v2/browser';
import { v2Configured } from '@/lib/v2/env';
import { ui } from '../ui';

/** v2 admin sign-in: the same 6-digit email code as the app. Staff role is checked on the next page. */
export default function V2Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!v2Configured) {
    return (
      <main style={ui.main}>
        <h1 style={ui.h1}>v2 admin is not configured</h1>
        <p style={ui.muted}>Set NEXT_PUBLIC_V2_SUPABASE_URL and NEXT_PUBLIC_V2_SUPABASE_ANON_KEY.</p>
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
      const { error: err } = await createV2BrowserClient().auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false },
      });
      if (err) throw err;
      setStep('code');
    });

  const verify = () =>
    run(async () => {
      const { error: err } = await createV2BrowserClient().auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: 'email',
      });
      if (err) throw err;
      router.replace('/v2/results');
      router.refresh();
    });

  return (
    <main style={{ ...ui.main, maxWidth: 420 }}>
      <h1 style={ui.h1}>NetProphet v2 admin</h1>
      <p style={ui.muted}>
        {step === 'email' ? 'Sign in with your staff email. You get a 6-digit code.' : `Code sent to ${email}.`}
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
          {busy ? '…' : step === 'email' ? 'Send code' : 'Sign in'}
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
