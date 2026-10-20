import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { currentMe } from './meStore';
import { clearSeenResultPushes } from './push';

/**
 * The result pushes leave once nothing is waiting for you (founder, 20 Oct): at launch and every time the app comes
 * back to the front, get_me is read fresh and, with nothing unseen in your inbox, the «Βγήκαν αποτελέσματα» pushes
 * and the icon's number go. Also when the inbox empties while you are in the app (the result cards played). The
 * cards themselves clear them on Σήμερα too, even while a celebration still waits.
 */
export function useClearSeenPushes(inboxUnseen: number | undefined, refresh: () => Promise<void>): void {
  const refreshNow = useRef(refresh);
  refreshNow.current = refresh;
  useEffect(() => {
    if (inboxUnseen === 0) void clearSeenResultPushes();
  }, [inboxUnseen]);
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    try {
      sub = AppState.addEventListener('change', (phase) => {
        if (phase !== 'active') return;
        // the one held may be from before a push came in: read it again before deciding
        void refreshNow
          .current()
          .then(() => {
            if (currentMe()?.inbox_unseen === 0) void clearSeenResultPushes();
          })
          .catch(() => undefined);
      });
    } catch {
      // no AppState: launch and the inbox effect still clear
    }
    return () => sub?.remove();
  }, []);
}
