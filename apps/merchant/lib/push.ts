/**
 * Push notifications (Expo) for the Merchant app.
 * No-op in Expo Go — needs a real EAS build to receive remote push.
 */
import { Platform } from 'react-native';

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

export async function registerForPush(): Promise<string | null> {
  if (!Notifications) return null;
  try {
    if (Device && Device.isDevice === false) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'New orders',
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
        lightColor: '#00D16B',
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const tokenResp = await Notifications.getExpoPushTokenAsync();
    return tokenResp?.data ?? null;
  } catch {
    return null;
  }
}
