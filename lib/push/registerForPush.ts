import * as Notifications from 'expo-notifications';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const settings = await Notifications.getPermissionsAsync();
  if (!settings.granted) {
    const req = await Notifications.requestPermissionsAsync();
    if (!req.granted) return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

