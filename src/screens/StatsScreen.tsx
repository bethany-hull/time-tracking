import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { CategoryChart } from '../components';
import { getTimeByCategory } from '../database/entries';
import {
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  formatDate,
} from '../utils/helpers';

type TimeRange = 'today' | 'week' | 'month';

export function StatsScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    
    const now = new Date();
    let startDate: number;
    let endDate: number;

    switch (timeRange) {
      case 'today':
        startDate = getStartOfDay(now);
        endDate = getEndOfDay(now);
        break;
      case 'week':
        startDate = getStartOfWeek(now);
        endDate = getEndOfWeek(now);
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = Math.floor(monthStart.getTime() / 1000);
        endDate = Math.floor(monthEnd.setHours(23, 59, 59, 999) / 1000);
        break;
    }

    try {
      const data = await getTimeByCategory(startDate, endDate);
      setCategoryData(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (timeRange) {
      case 'today':
        return `Today - ${formatDate(Math.floor(Date.now() / 1000))}`;
      case 'week':
        return 'This Week';
      case 'month':
        return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
        <Text style={styles.subtitle}>{getTitle()}</Text>
      </View>

      {/* Time range selector */}
      <View style={styles.rangeSelector}>
        {(['today', 'week', 'month'] as TimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.rangeButton,
              timeRange === range && styles.rangeButtonActive,
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text
              style={[
                styles.rangeButtonText,
                timeRange === range && styles.rangeButtonTextActive,
              ]}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <CategoryChart data={categoryData} title="Time Distribution" />
      </ScrollView>
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
  rangeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  rangeButtonActive: {
    backgroundColor: '#6366f1',
  },
  rangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  rangeButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 32,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});
