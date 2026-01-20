import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { RecordButton, EntryCard } from '../components';
import { useEntries, useCategories } from '../hooks/useDatabase';
import { TimeEntry } from '../database/entries';
import { formatDate, getStartOfDay, getEndOfDay } from '../utils/helpers';

export function HomeScreen() {
  const { entries, loading, loadingMore, hasMore, refresh, loadMore } = useEntries();
  const { categories } = useCategories();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const getCategoryInfo = useCallback(
    (categoryId: string | null) => {
      if (!categoryId) return { name: 'Uncategorized', color: '#6b7280' };
      const category = categories.find((c) => c.id === categoryId);
      return category
        ? { name: category.name, color: category.color }
        : { name: 'Uncategorized', color: '#6b7280' };
    },
    [categories]
  );

  // Group entries by date
  const groupedEntries = React.useMemo(() => {
    const groups: { date: string; entries: TimeEntry[] }[] = [];
    let currentDate = '';

    entries.forEach((entry) => {
      const date = formatDate(entry.recorded_at);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, entries: [entry] });
      } else {
        groups[groups.length - 1].entries.push(entry);
      }
    });

    return groups;
  }, [entries]);

  const renderEntry = useCallback(
    ({ item }: { item: TimeEntry }) => {
      const { name, color } = getCategoryInfo(item.category_id);
      return <EntryCard entry={item} categoryName={name} categoryColor={color} />;
    },
    [getCategoryInfo]
  );

  const renderDateHeader = (date: string) => (
    <Text style={styles.dateHeader}>{date}</Text>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#6366f1" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  const handleEndReached = () => {
    if (!loadingMore && hasMore) {
      loadMore();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Time Tracker</Text>
        <Text style={styles.subtitle}>What have you been up to?</Text>
      </View>

      <View style={styles.recordSection}>
        <RecordButton onRecordingComplete={refresh} />
      </View>

      <View style={styles.entriesSection}>
        <Text style={styles.sectionTitle}>Recent Entries</Text>
        
        {entries.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the record button to log what you've been doing
            </Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            renderItem={renderEntry}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  recordSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  entriesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    paddingBottom: 100,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});
