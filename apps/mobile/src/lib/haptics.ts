import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Feedback on the moments that matter (DESIGN.md §6). Web and devices without
// a Taptic engine just skip it, so callers never need to guard.
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

/** Light tick: add-on toggles, selection chips. */
export function tapLight() {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Success: booking confirmed, order Ready for Pickup. */
export function success() {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
