import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { rpc } from '@netprophet/db';
import { track } from './analytics';

/**
 * Push for results (M1). The app asks once, right after your first vote, when «Μαθαίνεις απόψε» makes the
 * point; later launches only refresh the token if permission is already there. The database sends one push per
 * device per run («Βγήκαν 2 αποτελέσματα») and the reveal stays in the app. Web has no push. Expo Go cannot
 * receive remote push since SDK 53 (Android for sure): getting a token fails there and nothing happens.
 */
type Api = ReturnType<typeof rpc>;
const ASKED_KEY = 'np.pushAsked';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

function projectId(): string | undefined {
  return (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
}

async function register(api: Api): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'NetProphet', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
  await api.registerPushToken(data, Platform.OS === 'ios' ? 'ios' : 'android');
}

/** on launch, signed in: refresh the token when permission was already given; never prompts */
export async function refreshPushToken(api: Api): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') await register(api);
  } catch {
    // Expo Go, no network: try again next launch
  }
}

/** after the first vote: ask once, then register */
export async function askForPushOnce(api: Api): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  try {
    if ((await AsyncStorage.getItem(ASKED_KEY)) === '1') return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    const { status } = await Notifications.requestPermissionsAsync();
    track('push_permission', { granted: status === 'granted' });
    if (status === 'granted') await register(api);
  } catch {
    // the vote already counted; push is a bonus
  }
}
