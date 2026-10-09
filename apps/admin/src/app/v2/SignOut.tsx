'use client';
import { useRouter } from 'next/navigation';
import { createV2BrowserClient } from '@/lib/v2/browser';
import { ui } from './ui';

export function SignOut() {
  const router = useRouter();
  return (
    <button
      style={ui.link}
      onClick={async () => {
        await createV2BrowserClient().auth.signOut();
        router.replace('/v2/login');
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
