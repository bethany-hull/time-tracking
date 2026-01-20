import { useEffect, useState, useCallback } from 'react';
import { getDatabase } from '../database';
import { getAllEntries, getEntriesByDateRange, getEntriesPaginated, TimeEntry } from '../database/entries';
import { getAllCategories, Category } from '../database/categories';
import { getAllSettings, AppSettings } from '../database/settings';

const PAGE_SIZE = 30;

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await getDatabase();
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize database'));
      }
    }
    init();
  }, []);

  return { isReady, error };
}

export function useEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getEntriesPaginated(PAGE_SIZE, 0);
      setEntries(result.entries);
      setHasMore(result.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load entries'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const result = await getEntriesPaginated(PAGE_SIZE, entries.length);
      // Filter out any entries that already exist to prevent duplicates
      setEntries(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const newEntries = result.entries.filter(e => !existingIds.has(e.id));
        return [...prev, ...newEntries];
      });
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Failed to load more entries:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [entries.length, loadingMore, hasMore]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, loadingMore, hasMore, error, refresh, loadMore };
}

export function useEntriesInRange(startDate: number, endDate: number) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEntriesByDateRange(startDate, endDate);
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load entries'));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, error, refresh };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load categories'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { categories, loading, error, refresh };
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllSettings();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { settings, loading, error, refresh };
}
