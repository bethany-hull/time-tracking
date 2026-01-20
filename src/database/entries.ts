import { getDatabase } from './index';
import { generateId } from '../utils/helpers';

export interface TimeEntry {
  id: string;
  recorded_at: number;
  duration: number;
  transcript: string | null;
  summary: string | null;
  category_id: string | null;
  tags: string[];
  audio_uri: string | null;
  processed: boolean;
  created_at: number;
  updated_at: number;
}

export interface CreateEntryInput {
  recorded_at?: number;
  duration?: number;
  transcript?: string;
  summary?: string;
  category_id?: string;
  tags?: string[];
  audio_uri?: string;
}

export interface UpdateEntryInput {
  transcript?: string;
  summary?: string;
  category_id?: string;
  tags?: string[];
  processed?: boolean;
}

// Transform database row to TimeEntry
function rowToEntry(row: any): TimeEntry {
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    processed: Boolean(row.processed),
  };
}

export async function createEntry(input: CreateEntryInput): Promise<TimeEntry> {
  const db = await getDatabase();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  
  // Mark as processed if we have summary and category (fully categorized)
  const isProcessed = !!(input.summary && input.category_id);

  await db.runAsync(
    `INSERT INTO entries (id, recorded_at, duration, transcript, summary, category_id, tags, audio_uri, processed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.recorded_at || now,
      input.duration || 0,
      input.transcript || null,
      input.summary || null,
      input.category_id || null,
      JSON.stringify(input.tags || []),
      input.audio_uri || null,
      isProcessed ? 1 : 0,
      now,
      now,
    ]
  );

  const entry = await getEntryById(id);
  if (!entry) throw new Error('Failed to create entry');
  return entry;
}

export async function getEntryById(id: string): Promise<TimeEntry | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM entries WHERE id = ?', [id]);
  return row ? rowToEntry(row) : null;
}

export async function getAllEntries(): Promise<TimeEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM entries ORDER BY recorded_at DESC');
  return rows.map(rowToEntry);
}

export async function getEntriesPaginated(
  limit: number = 30,
  offset: number = 0
): Promise<{ entries: TimeEntry[]; hasMore: boolean }> {
  const db = await getDatabase();
  // Fetch one extra to check if there are more
  const rows = await db.getAllAsync(
    'SELECT * FROM entries ORDER BY recorded_at DESC LIMIT ? OFFSET ?',
    [limit + 1, offset]
  );
  
  const hasMore = rows.length > limit;
  const entries = rows.slice(0, limit).map(rowToEntry);
  
  return { entries, hasMore };
}

export async function getEntriesByDateRange(
  startDate: number,
  endDate: number
): Promise<TimeEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM entries WHERE recorded_at >= ? AND recorded_at <= ? ORDER BY recorded_at DESC',
    [startDate, endDate]
  );
  return rows.map(rowToEntry);
}

export async function getEntriesByCategory(categoryId: string): Promise<TimeEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM entries WHERE category_id = ? ORDER BY recorded_at DESC',
    [categoryId]
  );
  return rows.map(rowToEntry);
}

export async function getUnprocessedEntries(): Promise<TimeEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM entries WHERE processed = 0 ORDER BY recorded_at ASC'
  );
  return rows.map(rowToEntry);
}

export async function updateEntry(id: string, input: UpdateEntryInput): Promise<TimeEntry | null> {
  const db = await getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (input.transcript !== undefined) {
    updates.push('transcript = ?');
    values.push(input.transcript);
  }
  if (input.summary !== undefined) {
    updates.push('summary = ?');
    values.push(input.summary);
  }
  if (input.category_id !== undefined) {
    updates.push('category_id = ?');
    values.push(input.category_id);
  }
  if (input.tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(input.tags));
  }
  if (input.processed !== undefined) {
    updates.push('processed = ?');
    values.push(input.processed ? 1 : 0);
  }

  if (updates.length === 0) return getEntryById(id);

  updates.push('updated_at = ?');
  values.push(Math.floor(Date.now() / 1000));
  values.push(id);

  await db.runAsync(
    `UPDATE entries SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  return getEntryById(id);
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
}

// Analytics queries
export async function getTimeByCategory(
  startDate: number,
  endDate: number
): Promise<{ category_id: string | null; category_name: string; total_duration: number; color: string }[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT 
      e.category_id,
      COALESCE(c.name, 'Uncategorized') as category_name,
      COALESCE(c.color, '#6b7280') as color,
      SUM(e.duration) as total_duration
    FROM entries e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE e.recorded_at >= ? AND e.recorded_at <= ?
    GROUP BY e.category_id
    ORDER BY total_duration DESC`,
    [startDate, endDate]
  );
  return rows;
}

export async function getDailyTotals(
  startDate: number,
  endDate: number
): Promise<{ date: string; total_duration: number }[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT 
      date(recorded_at, 'unixepoch', 'localtime') as date,
      SUM(duration) as total_duration
    FROM entries
    WHERE recorded_at >= ? AND recorded_at <= ?
    GROUP BY date
    ORDER BY date ASC`,
    [startDate, endDate]
  );
  return rows;
}
