import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync('timetracking.db');
  await initializeDatabase();
  return db;
}

async function initializeDatabase(): Promise<void> {
  if (!db) return;

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  // Create tables
  await db.execAsync(CREATE_TABLES_SQL);
  
  // Seed default categories if empty
  const categoryCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );
  
  if (categoryCount?.count === 0) {
    for (const category of DEFAULT_CATEGORIES) {
      await db.runAsync(
        'INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
        [category.id, category.name, category.color, category.icon]
      );
    }
  } else {
    // Migrate old Ionicon names to emojis
    await migrateIconsToEmojis();
  }

  // Seed default settings if empty
  const settingsCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM settings'
  );

  if (settingsCount?.count === 0) {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    }
  }
}

// Migration: Convert old Ionicon names to emojis
async function migrateIconsToEmojis(): Promise<void> {
  if (!db) return;
  
  const iconToEmoji: Record<string, string> = {
    'briefcase': '💼',
    'person': '🏠',
    'fitness': '💪',
    'book': '📚',
    'people': '👥',
    'cafe': '☕',
    'ellipsis-horizontal': '📌',
    'folder': '📁',
    'home': '🏠',
    'car': '🚗',
    'airplane': '✈️',
    'heart': '❤️',
    'musical-notes': '🎵',
    'game-controller': '🎮',
    'code-slash': '💻',
    'call': '📞',
    'mail': '✉️',
    'cart': '🛒',
    'medkit': '🏥',
    'restaurant': '🍽️',
    'bed': '😴',
    'school': '🎓',
    'camera': '📸',
    'brush': '🎨',
    'construct': '🛠️',
    'bicycle': '🚴',
    'walk': '🏃',
  };
  
  for (const [iconName, emoji] of Object.entries(iconToEmoji)) {
    await db.runAsync(
      'UPDATE categories SET icon = ? WHERE icon = ?',
      [emoji, iconName]
    );
  }
  
  // Add new categories if they don't exist
  const newCategories = [
    { id: 'commute', name: 'Commute & Travel', color: '#0ea5e9', icon: '🚗' },
    { id: 'meals', name: 'Meals & Cooking', color: '#f97316', icon: '🍳' },
    { id: 'chores', name: 'Chores & Housework', color: '#a855f7', icon: '🧹' },
    { id: 'family', name: 'Family & Childcare', color: '#ec4899', icon: '👨‍👩‍👧' },
    { id: 'self-care', name: 'Self Care & Grooming', color: '#14b8a6', icon: '✨' },
    { id: 'errands', name: 'Errands & Admin', color: '#64748b', icon: '📋' },
    { id: 'tv-gaming', name: 'TV & Gaming', color: '#84cc16', icon: '🎮' },
    { id: 'screen-time', name: 'Social Media & Phone', color: '#6366f1', icon: '📱' },
  ];
  
  for (const category of newCategories) {
    const exists = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM categories WHERE id = ?',
      [category.id]
    );
    
    if (!exists) {
      await db.runAsync(
        'INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
        [category.id, category.name, category.color, category.icon]
      );
    }
  }
  
  // Remove ATV category (was added by mistake)
  await db.runAsync('DELETE FROM categories WHERE id = ?', ['atv']);
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
