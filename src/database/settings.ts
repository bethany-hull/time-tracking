import { getDatabase } from './index';

export interface AppSettings {
  notificationInterval: number; // minutes
  notificationEnabled: boolean;
  notificationStartHour: number; // 0-23, hour to start sending notifications
  notificationEndHour: number; // 0-23, hour to stop sending notifications
  geminiApiKey: string;
  maxRecordingDuration: number; // seconds
  lastCheckInTime: number | null; // Unix timestamp of last check-in
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function getAllSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );

  const settingsMap = new Map(rows.map((r) => [r.key, r.value]));

  const lastCheckInStr = settingsMap.get('lastCheckInTime');
  return {
    notificationInterval: parseInt(settingsMap.get('notificationInterval') || '30', 10),
    notificationEnabled: settingsMap.get('notificationEnabled') === 'true',
    notificationStartHour: parseInt(settingsMap.get('notificationStartHour') || '9', 10),
    notificationEndHour: parseInt(settingsMap.get('notificationEndHour') || '21', 10),
    geminiApiKey: settingsMap.get('geminiApiKey') || '',
    maxRecordingDuration: parseInt(settingsMap.get('maxRecordingDuration') || '60', 10),
    lastCheckInTime: lastCheckInStr ? parseInt(lastCheckInStr, 10) : null,
  };
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<void> {
  if (settings.notificationInterval !== undefined) {
    await setSetting('notificationInterval', settings.notificationInterval.toString());
  }
  if (settings.notificationEnabled !== undefined) {
    await setSetting('notificationEnabled', settings.notificationEnabled.toString());
  }
  if (settings.notificationStartHour !== undefined) {
    await setSetting('notificationStartHour', settings.notificationStartHour.toString());
  }
  if (settings.notificationEndHour !== undefined) {
    await setSetting('notificationEndHour', settings.notificationEndHour.toString());
  }
  if (settings.geminiApiKey !== undefined) {
    await setSetting('geminiApiKey', settings.geminiApiKey);
  }
  if (settings.maxRecordingDuration !== undefined) {
    await setSetting('maxRecordingDuration', settings.maxRecordingDuration.toString());
  }
  if (settings.lastCheckInTime !== undefined) {
    await setSetting('lastCheckInTime', settings.lastCheckInTime?.toString() || '');
  }
}
