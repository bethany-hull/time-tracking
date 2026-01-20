import { getDatabase } from './index';
import { generateId } from '../utils/helpers';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: number;
  updated_at: number;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  icon?: string;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const db = await getDatabase();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db.runAsync(
    'INSERT INTO categories (id, name, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.name, input.color || '#6366f1', input.icon || '📁', now, now]
  );

  const category = await getCategoryById(id);
  if (!category) throw new Error('Failed to create category');
  return category;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
  return row || null;
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name ASC');
  return rows;
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category | null> {
  const db = await getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.color !== undefined) {
    updates.push('color = ?');
    values.push(input.color);
  }
  if (input.icon !== undefined) {
    updates.push('icon = ?');
    values.push(input.icon);
  }

  if (updates.length === 0) return getCategoryById(id);

  updates.push('updated_at = ?');
  values.push(Math.floor(Date.now() / 1000));
  values.push(id);

  await db.runAsync(
    `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  return getCategoryById(id);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDatabase();
  // Entries will have category_id set to NULL due to ON DELETE SET NULL
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function getCategoryWithEntryCount(): Promise<(Category & { entry_count: number })[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Category & { entry_count: number }>(
    `SELECT c.*, COUNT(e.id) as entry_count 
     FROM categories c 
     LEFT JOIN entries e ON c.id = e.category_id 
     GROUP BY c.id 
     ORDER BY c.name ASC`
  );
  return rows;
}
