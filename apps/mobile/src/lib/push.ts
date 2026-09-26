import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

// Push notifications for order updates. The server side lives in
// supabase/migrations/0005_push_notifications.sql: every `notifications` row
// (written on each order status change) is pushed to the customer's phones.
//
// Permission is asked only after the customer has a reason to want it (right
// after their first booking, via an in-app explainer), never on launch.

const PROMPT_SEEN_KEY = 'push-prompt-seen-v1';
const TOKEN_KEY = 'push-token-v1';
export const ORDER_UPDATES_CHANNEL = 'order-updates';

/** Push only works in a real iOS/Android build — not web, not simulators. */
export function pushSupported(): boolean {
  return Platform.OS !== 'web' && Device.isDevice;
}

// e2e only (npm run e2e): the web "phone" can't receive pushes, so this flag
// lets the checks exercise the explainer card flow without a real device.
const PREVIEW = Platform.OS === 'web' && process.env.EXPO_PUBLIC_PUSH_PREVIEW === '1';

// Show order updates as a banner even while the app is open.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ORDER_UPDATES_CHANNEL, {
    name: 'Order updates',
    description: 'When your pair is received, being cleaned, and ready for pickup.',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

function easProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Fetch this phone's Expo push token and attach it to the signed-in customer. */
async function registerToken(): Promise<boolean> {
  const projectId = easProjectId();
  if (!projectId) {
    // Set by `eas init` (writes extra.eas.projectId to app.json).
    console.warn('[push] no EAS projectId configured; skipping push registration');
    return false;
  }
  await ensureAndroidChannel();
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
  if (error) {
    console.warn('[push] could not save token', error);
    return false;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return true;
}

export type PushStatus = 'unsupported' | 'granted' | 'denied' | 'undetermined';

export async function pushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status as PushStatus;
}

/** Ask the OS for permission (call after the in-app explainer), then register. */
export async function enablePush(): Promise<PushStatus> {
  await AsyncStorage.setItem(PROMPT_SEEN_KEY, '1');
  if (PREVIEW) return 'granted';
  if (!pushSupported()) return 'unsupported';
  await ensureAndroidChannel(); // Android 13+ shows the OS prompt only once a channel exists
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') await registerToken();
  return status as PushStatus;
}

/** On launch / sign-in: if already allowed, refresh the token (they can rotate). */
export async function syncPushTokenIfAllowed(): Promise<void> {
  try {
    if ((await pushStatus()) === 'granted') await registerToken();
  } catch (e) {
    console.warn('[push] sync failed', e);
  }
}

/** On sign-out: detach this phone so the next person here doesn't get their updates. */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await supabase.rpc('unregister_push_token', { p_token: token });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.warn('[push] unregister failed', e);
  }
}

/** Whether to show the "get a heads-up when your pair is ready" explainer. */
export async function shouldOfferPush(): Promise<boolean> {
  if (!PREVIEW && (await pushStatus()) !== 'undetermined') return false;
  return (await AsyncStorage.getItem(PROMPT_SEEN_KEY)) !== '1';
}

export async function dismissPushOffer(): Promise<void> {
  await AsyncStorage.setItem(PROMPT_SEEN_KEY, '1');
}

/** Route taps on an order-update notification to the Orders tab. */
export function onPushTap(navigate: (url: string) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const open = (response: Notifications.NotificationResponse | null) => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) navigate(url);
  };
  // App opened from a killed state by tapping the notification.
  Notifications.getLastNotificationResponseAsync().then(open);
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
