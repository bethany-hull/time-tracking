import { getDatabase } from './index';

export interface AppSettings {
  notificationInterval: number; // minutes
  notificationEnabled: boolean;
  geminiApiKey: string;
  maxRecordingDuration: number; // seconds
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

  return {
    notificationInterval: parseInt(settingsMap.get('notificationInterval') || '30', 10),
    notificationEnabled: settingsMap.get('notificationEnabled') === 'true',
    geminiApiKey: settingsMap.get('geminiApiKey') || '',
    maxRecordingDuration: parseInt(settingsMap.get('maxRecordingDuration') || '60', 10),
  };
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<void> {
  if (settings.notificationInterval !== undefined) {
    await setSetting('notificationInterval', settings.notificationInterval.toString());
  }
  if (settings.notificationEnabled !== undefined) {
    await setSetting('notificationEnabled', settings.notificationEnabled.toString());
  }
  if (settings.geminiApiKey !== undefined) {
    await setSetting('geminiApiKey', settings.geminiApiKey);
  }
  if (settings.maxRecordingDuration !== undefined) {
    await setSetting('maxRecordingDuration', settings.maxRecordingDuration.toString());
  }
}
