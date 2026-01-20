import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { calculatePercentage, formatMinutes } from '../utils/helpers';

interface CategoryData {
  category_id: string | null;
  category_name: string;
  total_duration: number;
  color: string;
}

interface CategoryChartProps {
  data: CategoryData[];
  title?: string;
}

export function CategoryChart({ data, title = 'Time by Category' }: CategoryChartProps) {
  const totalDuration = data.reduce((sum, item) => sum + item.total_duration, 0);
  const screenWidth = Dimensions.get('window').width - 64;

  if (data.length === 0 || totalDuration === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data to display</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {/* Bar chart */}
      <View style={styles.barContainer}>
        {data.map((item, index) => {
          const percentage = calculatePercentage(item.total_duration, totalDuration);
          const barWidth = (percentage / 100) * screenWidth;
          
          return (
            <View
              key={item.category_id || index}
              style={[
                styles.bar,
                {
                  width: Math.max(barWidth, 4),
                  backgroundColor: item.color,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {data.map((item, index) => {
          const percentage = calculatePercentage(item.total_duration, totalDuration);
          
          return (
            <View key={item.category_id || index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendName}>{item.category_name}</Text>
                <Text style={styles.legendValue}>
                  {formatMinutes(item.total_duration)} ({percentage}%)
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Total */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total Time</Text>
        <Text style={styles.totalValue}>{formatMinutes(totalDuration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  barContainer: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  bar: {
    height: '100%',
  },
  legend: {
    marginTop: 16,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendName: {
    fontSize: 14,
    color: '#374151',
  },
  legendValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
