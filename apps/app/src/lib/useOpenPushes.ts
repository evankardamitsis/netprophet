import { useEffect } from 'react';
import { router } from 'expo-router';
import { onPendingPush, takePendingPush } from './push';

/**
 * Opens the place of a tapped push (push.ts setPendingPush) from the main layout. Mounted only when signed in and past
 * onboarding, so a tap made on a cold start, on sign-in or during onboarding opens once the app is really there; a tap
 * while it is up opens at once. One frame first, so the tab screens under the layout have mounted.
 */
export function useOpenPushes(): void {
  useEffect(() => {
    let frame: number | null = null;
    const open = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        const route = takePendingPush();
        if (route) router.push(route as never);
      });
    };
    const off = onPendingPush(open);
    open();
    return () => {
      off();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);
}
