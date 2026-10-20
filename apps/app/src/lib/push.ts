import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import type { rpc } from '@netprophet/db';
import { track } from './analytics';

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

/** where a tapped push opens: a schedule alert its tournament, results and reactions the Αποτελέσματα tab, a reminder Σήμερα, a claim decision Εγώ */
export function pushRoute(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  if (data.type === 'schedule' && typeof data.tournament_id === 'string') return `/tournament/${data.tournament_id}`;
  if (data.type === 'draw' && typeof data.tournament_id === 'string')
    return `/tournament/${data.tournament_id}${typeof data.tab === 'string' ? `?draw=${encodeURIComponent(data.tab)}` : ''}`;
  if (data.type === 'results') return '/results';
  // someone reacted to your match: Αποτελέσματα, on its tournament when it has one
  if (data.type === 'reaction')
    return typeof data.tournament_id === 'string' ? `/results?tournament=${encodeURIComponent(data.tournament_id)}` : '/results';
  // a match reminder: Σήμερα, where «Το ματς σου» leads
  if (data.type === 'reminder') return '/';
  // entries close in two days: Τουρνουά, where «Το επόμενο τουρνουά για σένα» lists it
  if (data.type === 'entry') return '/tournaments';
  // staff decided your roster claim: Εγώ, where the player now shows (or the claim can be asked again)
  if (data.type === 'claim') return '/me';
  return null;
}

/** open the right screen when a push is tapped (also the one that launched the app); returns the unsubscribe */
export function listenForPushTaps(open: (route: string) => void): () => void {
  const Notifications = notifications();
  if (!Notifications) return () => undefined;
  const go = (data: Record<string, unknown> | undefined) => {
    const route = pushRoute(data);
    if (route) open(route);
  };
  void Notifications.getLastNotificationResponseAsync()
    .then((r) => go(r?.notification.request.content.data as Record<string, unknown> | undefined))
    .catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener((r) => go(r.notification.request.content.data as Record<string, unknown> | undefined));
  return () => sub.remove();
}
