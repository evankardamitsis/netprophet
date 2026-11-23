import { useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '@netprophet/copy';
import type { rpc } from '@netprophet/db';
import { startLocale, useLocaleState } from '../i18n';
import { LOCALE_KEY, parseChoice, type LocaleChoice } from './locale';

function save(choice: LocaleChoice): void {
  const write = choice === 'auto' ? AsyncStorage.removeItem(LOCALE_KEY) : AsyncStorage.setItem(LOCALE_KEY, choice);
  write.catch(() => undefined);
}

let started: Promise<void> | null = null;
let loaded = false;

/** read the saved pick once; nothing saved, or a failed read, is Greek */
function start(): Promise<void> {
  started ??= AsyncStorage.getItem(LOCALE_KEY)
    .catch(() => null)
    .then((stored) => {
      startLocale(parseChoice(stored), save);
      loaded = true;
    });
  return started;
}

/**
 * Above everything that shows words: children wait (`ready` false) until the language is known, so the first screen
 * never flashes in the wrong one. The read is one AsyncStorage key and runs under the loading logo.
 */
export function LocaleProvider({ children }: { children: (ready: boolean) => ReactNode }) {
  const [ready, setReady] = useState(loaded);
  useEffect(() => {
    let live = true;
    void start().then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  // subscribing here re-renders the tree under a switch
  useLocaleState();
  return <>{children(ready)}</>;
}

/** the last locale told to the server while the app runs, per account */
let sent: string | null = null;

/**
 * The server learns the language (core.profiles.locale, through update_profile), so what it writes for this account
 * can follow. Once per account and language while the app runs; a failure is tried again at the next change.
 */
export function syncProfileLocale(api: ReturnType<typeof rpc>, userId: string, locale: Locale): void {
  const key = `${userId}:${locale}`;
  if (sent === key) return;
  sent = key;
  api.updateProfile({ locale }).catch(() => {
    if (sent === key) sent = null;
  });
}
