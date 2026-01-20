import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimeEntry } from '../database/entries';
import { formatRelativeTime, formatTime, formatMinutes } from '../utils/helpers';

interface EntryCardProps {
  entry: TimeEntry;
  categoryColor?: string;
  categoryName?: string;
  onPress?: () => void;
}

export function EntryCard({ entry, categoryColor = '#6b7280', categoryName = 'Uncategorized', onPress }: EntryCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.categoryIndicator, { backgroundColor: categoryColor }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.time}>{formatTime(entry.recorded_at)}</Text>
          <View style={styles.headerRight}>
            {entry.duration > 0 && (
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={12} color="#6366f1" />
                <Text style={styles.durationText}>{formatMinutes(entry.duration)}</Text>
              </View>
            )}
            <Text style={styles.relativeTime}>{formatRelativeTime(entry.recorded_at)}</Text>
          </View>
        </View>
        
        <Text style={styles.summary} numberOfLines={2}>
          {entry.summary || entry.transcript || 'Processing...'}
        </Text>
        
        <View style={styles.footer}>
          <View style={styles.categoryBadge}>
            <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
            <Text style={styles.categoryText}>{categoryName}</Text>
          </View>
          
          {entry.tags.length > 0 && (
            <View style={styles.tags}>
              {entry.tags.slice(0, 3).map((tag, index) => (
                <Text key={index} style={styles.tag}>#{tag}</Text>
              ))}
              {entry.tags.length > 3 && (
                <Text style={styles.moreTag}>+{entry.tags.length - 3}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {!entry.processed && (
        <View style={styles.processingBadge}>
          <Ionicons name="time-outline" size={14} color="#f59e0b" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  categoryIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366f1',
  },
  relativeTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  summary: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#6b7280',
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    fontSize: 11,
    color: '#6366f1',
  },
  moreTag: {
    fontSize: 11,
    color: '#9ca3af',
  },
  processingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
