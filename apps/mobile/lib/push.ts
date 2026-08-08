import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { upsertProfile } from './api';

/**
 * Best-effort push registration. Remote push requires a development build
 * with an EAS projectId; in Expo Go this quietly no-ops.
 */
export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return; // Expo Go / no EAS project yet
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await upsertProfile({ expo_push_token: token.data });
  } catch {
    // push is a nice-to-have; never block the app on it
  }
}
