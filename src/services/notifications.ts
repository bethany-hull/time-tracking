import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getAllSettings } from '../database/settings';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NOTIFICATION_IDENTIFIER = 'time-tracking-reminder';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Configure for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Time Tracking Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  return true;
}

export async function scheduleRecurringNotification(forceReschedule = false): Promise<void> {
  const settings = await getAllSettings();
  
  // Check if we already have a notification scheduled
  const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const existingReminder = existingNotifications.find(
    (n) => n.identifier === NOTIFICATION_IDENTIFIER
  );

  // If notifications are disabled, cancel any existing ones
  if (!settings.notificationEnabled) {
    if (existingReminder) {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDENTIFIER);
    }
    return;
  }

  // Check if existing notification matches current settings
  if (existingReminder && !forceReschedule) {
    const existingTrigger = existingReminder.trigger as { seconds?: number } | null;
    const expectedSeconds = settings.notificationInterval * 60;
    
    // If interval matches, keep existing notification (preserves timer after restart)
    if (existingTrigger?.seconds === expectedSeconds) {
      console.log('Notification already scheduled with correct interval, keeping existing');
      return;
    }
  }

  // Cancel and reschedule only if needed
  await cancelAllNotifications();

  const intervalMinutes = settings.notificationInterval;

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDENTIFIER,
    content: {
      title: '⏰ Time Check!',
      body: 'What have you been working on? Tap to record.',
      data: { action: 'record', intervalMinutes },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: intervalMinutes * 60,
      repeats: true,
    },
  });
  
  console.log(`Notification scheduled: every ${intervalMinutes} minutes`);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Listener setup functions
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Send an immediate test notification
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎉 Test Notification',
      body: 'Notifications are working! You will be reminded to track your time.',
      data: { action: 'test' },
    },
    trigger: null,
  });
}
