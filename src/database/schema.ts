// Database schema definitions for time tracking app

export const CREATE_TABLES_SQL = `
  -- Categories table for organizing time entries
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT DEFAULT 'folder',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );

  -- Time entries from audio recordings
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY NOT NULL,
    recorded_at INTEGER NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0,
    transcript TEXT,
    summary TEXT,
    category_id TEXT,
    tags TEXT DEFAULT '[]',
    audio_uri TEXT,
    processed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  -- Settings table for app configuration
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  -- Create indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_entries_recorded_at ON entries(recorded_at);
  CREATE INDEX IF NOT EXISTS idx_entries_category_id ON entries(category_id);
  CREATE INDEX IF NOT EXISTS idx_entries_processed ON entries(processed);
`;

export const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Work', color: '#3b82f6', icon: '💼' },
  { id: 'personal', name: 'Personal', color: '#10b981', icon: '🏠' },
  { id: 'health', name: 'Health & Fitness', color: '#ef4444', icon: '💪' },
  { id: 'learning', name: 'Learning', color: '#8b5cf6', icon: '📚' },
  { id: 'social', name: 'Social', color: '#f59e0b', icon: '👥' },
  { id: 'rest', name: 'Rest & Leisure', color: '#06b6d4', icon: '☕' },
  { id: 'commute', name: 'Commute & Travel', color: '#0ea5e9', icon: '🚗' },
  { id: 'meals', name: 'Meals & Cooking', color: '#f97316', icon: '🍳' },
  { id: 'chores', name: 'Chores & Housework', color: '#a855f7', icon: '🧹' },
  { id: 'family', name: 'Family & Childcare', color: '#ec4899', icon: '👨‍👩‍👧' },
  { id: 'self-care', name: 'Self Care & Grooming', color: '#14b8a6', icon: '✨' },
  { id: 'errands', name: 'Errands & Admin', color: '#64748b', icon: '📋' },
  { id: 'tv-gaming', name: 'TV & Gaming', color: '#84cc16', icon: '🎮' },
  { id: 'screen-time', name: 'Social Media & Phone', color: '#6366f1', icon: '📱' },
  { id: 'other', name: 'Other', color: '#6b7280', icon: '📌' },
];

export const DEFAULT_SETTINGS = {
  notificationInterval: '30', // minutes
  notificationEnabled: 'true',
  geminiApiKey: '',
  maxRecordingDuration: '60', // seconds
};
