/**
 * Push notifications (Expo).
 * NOTE: Remote push does NOT work in Expo Go on a real iPhone — it needs a
 * real build (EAS development/preview/production build). It is a no-op in Expo Go.
 */
import { Platform } from 'react-native';

// Imported lazily/guarded so the app never crashes if the native module is absent.
let Notifications: any = null;
let Device: any = null;
try { Notifications = require('expo-notifications'); } catch {}
try { Device = require('expo-device'); } catch {}

if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Ask for permission and return the Expo push token (or null if unavailable /
 * denied / running in Expo Go). Safe to call anywhere.
 */
export async function registerForPush(): Promise<string | null> {
  if (!Notifications) return null;
  try {
    if (Device && Device.isDevice === false) return null; // simulators can't get a token

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Order updates',
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
        lightColor: '#00D16B',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const tokenResp = await Notifications.getExpoPushTokenAsync();
    return tokenResp?.data ?? null;
  } catch {
    return null;
  }
}
