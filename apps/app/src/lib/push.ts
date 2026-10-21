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
 * A route a push carries itself (`data.url`, e.g. the Pro pushes): an app path only, «/results» or
 * «/tournament/abc?draw=M», never another site («//x.com», «https:», «javascript:») nor a path with a backslash.
 */
export function safeAppPath(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const u = url.trim();
  if (!u.startsWith('/') || u.startsWith('//') || u.includes('\\') || /^\/[^?#]*:/.test(u)) return null;
  return u;
}

const id = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

/**
 * Where a tapped push opens (founder, 21 Oct: "the dedicated place"). `data.url` first, so a new kind of push can
 * carry its own place; else by `data.type`:
 * results          Αποτελέσματα
 * reaction         Αποτελέσματα on the match's tournament (a friendly: Αποτελέσματα)
 * claim            Εγώ, where the player now shows (or the claim can be asked again)
 * draw             the tournament, on that draw
 * schedule, entry  the tournament (entry with no tournament: Τουρνουά)
 * reminder         your match's tournament (a friendly: Σήμερα, where «Το ματς σου» leads)
 * Anything else stays where the app opens.
 */
export function pushRoute(data: Record<string, unknown> | undefined | null): string | null {
  if (!data) return null;
  const own = safeAppPath(data.url);
  if (own) return own;
  const tournament = id(data.tournament_id);
  switch (data.type) {
    case 'results':
      return '/results';
    case 'reaction':
      return tournament ? `/results?tournament=${encodeURIComponent(tournament)}` : '/results';
    case 'claim':
      return '/me';
    case 'draw':
      if (!tournament) return '/tournaments';
      return `/tournament/${encodeURIComponent(tournament)}${typeof data.tab === 'string' ? `?draw=${encodeURIComponent(data.tab)}` : ''}`;
    case 'schedule':
    case 'entry':
      return tournament ? `/tournament/${encodeURIComponent(tournament)}` : '/tournaments';
    case 'reminder':
      return tournament ? `/tournament/${encodeURIComponent(tournament)}` : '/';
    default:
      return null;
  }
}

/** taps already handled: the launch tap is read again on every subscribe, and must open its screen once */
const handled = new Set<string>();

/**
 * A push was tapped (also the one that launched the app): `open` gets its route once. The caller holds the route
 * until the screens are mounted (a cold start opens on the logo and the sign-in check). Returns the unsubscribe.
 */
export function listenForPushTaps(open: (route: string) => void): () => void {
  const Notifications = notifications();
  if (!Notifications) return () => undefined;
  const go = (r: { notification: { request: { identifier: string; content: { data?: unknown } } } } | null | undefined) => {
    if (!r) return;
    const key = r.notification.request.identifier;
    if (handled.has(key)) return;
    handled.add(key);
    const data = r.notification.request.content.data as Record<string, unknown> | undefined;
    const route = pushRoute(data);
    if (route) open(route);
    // opened from «Βγήκαν αποτελέσματα»: the other result pushes of the day go too
    if (data?.type === 'results') void clearSeenResultPushes();
  };
  void Notifications.getLastNotificationResponseAsync()
    .then(go)
    .catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener(go);
  return () => sub.remove();
}
