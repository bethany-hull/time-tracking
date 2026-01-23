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

const NOTIFICATION_IDENTIFIER_PREFIX = 'time-tracking-reminder-';

// Helper to generate notification times within the allowed window
function generateNotificationTimes(
  startHour: number,
  endHour: number,
  intervalMinutes: number
): { hour: number; minute: number }[] {
  const times: { hour: number; minute: number }[] = [];
  
  let currentHour = startHour;
  let currentMinute = 0;
  
  while (currentHour < endHour || (currentHour === endHour && currentMinute === 0)) {
    times.push({ hour: currentHour, minute: currentMinute });
    
    currentMinute += intervalMinutes;
    while (currentMinute >= 60) {
      currentMinute -= 60;
      currentHour += 1;
    }
  }
  
  // iOS has a limit of ~64 scheduled notifications
  // If we exceed this, increase the effective interval
  if (times.length > 60) {
    console.warn(`Too many notifications (${times.length}), limiting to 60`);
    return times.slice(0, 60);
  }
  
  return times;
}

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
  
  // Check existing notifications
  const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const existingReminders = existingNotifications.filter(
    (n) => n.identifier.startsWith(NOTIFICATION_IDENTIFIER_PREFIX)
  );

  // If notifications are disabled, cancel any existing ones
  if (!settings.notificationEnabled) {
    for (const reminder of existingReminders) {
      await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
    }
    return;
  }

  // Generate the expected notification times
  const notificationTimes = generateNotificationTimes(
    settings.notificationStartHour,
    settings.notificationEndHour,
    settings.notificationInterval
  );

  // Check if existing notifications match current settings (avoid unnecessary rescheduling)
  if (!forceReschedule && existingReminders.length === notificationTimes.length) {
    const existingTimes = existingReminders.map((n) => {
      const trigger = n.trigger as { dateComponents?: { hour?: number; minute?: number } } | null;
      return {
        hour: trigger?.dateComponents?.hour ?? -1,
        minute: trigger?.dateComponents?.minute ?? -1,
      };
    }).sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

    const expectedTimes = [...notificationTimes].sort(
      (a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)
    );

    const timesMatch = existingTimes.every(
      (t, i) => t.hour === expectedTimes[i].hour && t.minute === expectedTimes[i].minute
    );

    if (timesMatch) {
      console.log('Notifications already scheduled with correct times, keeping existing');
      return;
    }
  }

  // Cancel all existing reminders and reschedule
  await cancelAllNotifications();

  // Schedule a notification for each time slot
  for (let i = 0; i < notificationTimes.length; i++) {
    const { hour, minute } = notificationTimes[i];
    
    await Notifications.scheduleNotificationAsync({
      identifier: `${NOTIFICATION_IDENTIFIER_PREFIX}${i}`,
      content: {
        title: '⏰ Time Check!',
        body: 'What have you been working on? Tap to record.',
        data: { action: 'record' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      },
    });
  }
  
  const formatTime = (h: number, m: number) => 
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  
  console.log(
    `Scheduled ${notificationTimes.length} daily notifications from ` +
    `${formatTime(settings.notificationStartHour, 0)} to ${formatTime(settings.notificationEndHour, 0)} ` +
    `every ${settings.notificationInterval} minutes`
  );
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
