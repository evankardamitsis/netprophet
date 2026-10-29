import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import type { rpc } from '@netprophet/db';
import { track } from './analytics';
import { resultPushIds } from './pushClear';

/**
 * Push for results (M1). The app asks once, right after your first vote, when «Μαθαίνεις απόψε» makes the
 * point; later launches only refresh the token if permission is already there. The database sends one push per
 * device per run («Βγήκαν 2 αποτελέσματα») and the reveal stays in the app. Web has no push. Expo Go cannot
 * receive remote push since SDK 53, and on Android merely importing expo-notifications there throws, so the module
 * loads lazily and never in Android Expo Go.
 */
type Api = ReturnType<typeof rpc>;
const ASKED_KEY = 'np.pushAsked';

type NotificationsModule = typeof import('expo-notifications');
let loaded: NotificationsModule | null = null;

/** expo-notifications where push can work: a real device, not the web, not Android Expo Go */
function notifications(): NotificationsModule | null {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  if (!loaded) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    loaded = require('expo-notifications') as NotificationsModule;
    loaded.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
  }
  return loaded;
}

function projectId(): string | undefined {
  return (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
}

async function register(api: Api, Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'NetProphet', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
  await api.registerPushToken(data, Platform.OS === 'ios' ? 'ios' : 'android');
}

/** on launch, signed in: refresh the token when permission was already given; never prompts */
export async function refreshPushToken(api: Api): Promise<void> {
  const Notifications = notifications();
  if (!Notifications) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') await register(api, Notifications);
  } catch {
    // Expo Go, no network: try again next launch
  }
}

/** after the first vote: ask once, then register */
export async function askForPushOnce(api: Api): Promise<void> {
  const Notifications = notifications();
  if (!Notifications) return;
  try {
    if ((await AsyncStorage.getItem(ASKED_KEY)) === '1') return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    const { status } = await Notifications.requestPermissionsAsync();
    track('push_permission', { granted: status === 'granted' });
    if (status === 'granted') await register(api, Notifications);
  } catch {
    // the vote already counted; push is a bonus
  }
}

/** notifications already allowed on this phone (never prompts); false where there are none */
export async function pushAllowed(): Promise<boolean> {
  const Notifications = notifications();
  if (!Notifications) return false;
  try {
    return (await Notifications.getPermissionsAsync()).status === 'granted';
  } catch {
    return false;
  }
}

/** a button asked for them (the Pro guide): ask now, even if the first-vote ask came before; true when allowed */
export async function askForPush(api: Api): Promise<boolean> {
  const Notifications = notifications();
  if (!Notifications) return false;
  try {
    await AsyncStorage.setItem(ASKED_KEY, '1');
    const { status } = await Notifications.requestPermissionsAsync();
    track('push_permission', { granted: status === 'granted' });
    if (status === 'granted') await register(api, Notifications);
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * You have seen your results: the «Βγήκαν αποτελέσματα» pushes leave the notification centre and the app icon has no
 * number. Other pushes (a claim decision, a reaction) stay. A no-op on the web and the simulator.
 */
export async function clearSeenResultPushes(): Promise<void> {
  const Notifications = notifications();
  if (!Notifications) return;
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(resultPushIds(presented).map((id) => Notifications.dismissNotificationAsync(id)));
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // nothing lost: they go next time
  }
}

/**
 * A route a push carries itself (`data.url`): an app path only, «/results» or «/tournament/abc?draw=M», never another
 * site («//x.com», «https:», «javascript:») nor a path with a backslash.
 */
export function safeAppPath(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const u = url.trim();
  if (!u.startsWith('/') || u.startsWith('//') || u.includes('\\') || /^\/[^?#]*:/.test(u)) return null;
  return u;
}

/** the home opens its results deck on this (Τουρνουά, mockup D) */
export const HOME_RESULTS = '/?results=1';
/** where an unknown or old push opens: the home */
export const HOME = '/';

/**
 * The screens a push may open, by path (no query). Sign-in, onboarding and the opponent link are never a push's place,
 * and a path the app no longer has (an old push in the notification centre) is not on the list.
 */
const PUSH_PLACES: readonly RegExp[] = [
  /^\/$/,
  /^\/(results|ladder|me|tournaments|players|badges|tournament-player|tournament-path|tournament-draw)$/,
  /^\/(tournament|player|scout)\/[^/?#]+$/,
  /^\/(quiz|pro|kudos|season|match-stats|add-match|look|looks|avatars|baller|win-card|share-baller)$/,
];

/** a path the app has, with its query kept; anything else is null */
export function knownAppPath(url: unknown): string | null {
  const u = safeAppPath(url);
  if (!u) return null;
  const path = u.split(/[?#]/)[0] ?? '';
  const seg = path.split('/')[2];
  if (seg === 'undefined' || seg === 'null') return null;
  return PUSH_PLACES.some((re) => re.test(path)) ? u : null;
}

const id = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const q = (v: string) => encodeURIComponent(v);

/**
 * Where a tapped push opens (founder, 25 Oct: "notifications are not landing to the correct place"). `data.url` first,
 * when it is a screen the app has (the server sets it on every push, core.push_url in
 * 20270320000000_push_landing); else by `data.type`, the same table, for pushes sent before that:
 * results    the home, the results card opened full
 * schedule   the tournament on your match (?match=: Σήμερα when it is today, else Πρόγραμμα on its day)
 * draw       the tournament's Ταμπλό on that draw
 * follow     the followed tournament: Ταμπλό on the draw (draw, final) or Πρόγραμμα on the day (tomorrow's schedule)
 * entry      the tournament
 * reminder   «Ο αντίπαλος πριν το ματς» (scout)
 * reaction   Αποτελέσματα on the match's tournament (a friendly: Αποτελέσματα)
 * claim      Εγώ (the server sends Παίκτες when the account holds no player)
 * Anything else, or a place the app no longer has: the home.
 */
export function pushRoute(data: Record<string, unknown> | undefined | null): string {
  if (!data) return HOME;
  const own = knownAppPath(data.url);
  if (own) return own;
  const tournament = id(data.tournament_id);
  const match = id(data.match_id);
  const tab = id(data.tab);
  const day = id(data.day);
  const atTournament = (query: string) => (tournament ? `/tournament/${q(tournament)}${query}` : HOME);
  switch (data.type) {
    case 'results':
      return HOME_RESULTS;
    case 'schedule':
      return atTournament(match ? `?match=${q(match)}` : '');
    case 'draw':
    case 'follow':
    case 'entry':
      return atTournament(day ? `?day=${q(day)}` : tab ? `?draw=${q(tab)}` : '');
    case 'reminder':
      return match ? `/scout/${q(match)}` : atTournament('');
    case 'reaction':
      return tournament ? `/results?tournament=${q(tournament)}` : '/results';
    case 'claim':
      return '/me';
    default:
      return HOME;
  }
}

/**
 * The place a tapped push is waiting to open. The tap can come before any screen can show it: a cold start (the logo,
 * the session restoring), the sign-in screen, onboarding. It waits here, a newer tap replacing it, and the main
 * layout ((tabs)/_layout, mounted only when signed in and past onboarding) takes it once it is up.
 */
let pending: string | null = null;
const waiting = new Set<() => void>();

export function setPendingPush(route: string): void {
  pending = route;
  waiting.forEach((fn) => fn());
}

/** the waiting place, once: a second take is null */
export function takePendingPush(): string | null {
  const r = pending;
  pending = null;
  return r;
}

/** called when a place starts waiting; returns the unsubscribe */
export function onPendingPush(fn: () => void): () => void {
  waiting.add(fn);
  return () => {
    waiting.delete(fn);
  };
}

/** taps already handled: the launch tap can be read again, and must open its screen once */
const handled = new Set<string>();

export interface PushTap {
  notification: { request: { identifier: string; content: { data?: unknown } } };
}

/** one tap: its place waits to open (once per notification), and a results push clears the other result pushes */
export function handlePushTap(r: PushTap | null | undefined): string | null {
  if (!r) return null;
  const key = r.notification.request.identifier;
  if (handled.has(key)) return null;
  handled.add(key);
  const data = r.notification.request.content.data as Record<string, unknown> | undefined;
  const route = pushRoute(data);
  setPendingPush(route);
  // opened from «Βγήκαν αποτελέσματα»: the other result pushes of the day go too
  if (data?.type === 'results') void clearSeenResultPushes();
  return route;
}

/**
 * Listen for push taps from the start, signed in or not: the push that launched a killed app (cold start), a tap
 * while the app is in the background (warm) and a tap on a banner while it is open (foreground). Each tap's place
 * waits in setPendingPush until the main layout can open it. Returns the unsubscribe.
 */
export function listenForPushTaps(): () => void {
  const Notifications = notifications();
  if (!Notifications) return () => undefined;
  const clear = () => {
    try {
      // so a later launch from the icon does not open it again
      Notifications.clearLastNotificationResponse();
    } catch {
      // nothing to clear
    }
  };
  try {
    if (handlePushTap(Notifications.getLastNotificationResponse())) clear();
  } catch {
    // the listener below still hears the taps that come in from now on
  }
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    if (handlePushTap(r)) clear();
  });
  return () => sub.remove();
}
