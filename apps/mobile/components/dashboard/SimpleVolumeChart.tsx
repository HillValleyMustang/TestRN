/**
 * SimpleVolumeChart Component
 * Displays weekly volume as simple bar chart with Y-axis values and workout type colors
 * 
 * Uses reactive hooks to fetch data automatically.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { useVolumeHistory } from '../../hooks/data';
import { useAuth } from '../../app/_contexts/auth-context';
import { createTaggedLogger } from '../../lib/logger';
import { getWorkoutColor } from '../../lib/workout-colors';

const log = createTaggedLogger('SimpleVolumeChart');

export function SimpleVolumeChart() {
  // Get userId for reactive hooks
  const { userId } = useAuth();
  
  // Reactive data hook
  const { data: chartData = [], loading, error } = useVolumeHistory(userId, 7);
  
  // Memoize maxVolume calculation to prevent recalculation on every render
  const maxVolume = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map(d => d.volume), 1);
  }, [chartData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
  };

  // Generate Y-axis labels with adaptive rounding based on volume range
  const getAdaptiveRound = (value: number) => {
    if (value === 0) return 0;
    if (value <= 10) return Math.ceil(value / 5) * 5; // Round to nearest 5 for small values
    if (value <= 50) return Math.ceil(value / 10) * 10; // Round to nearest 10 for medium values
    if (value <= 200) return Math.ceil(value / 25) * 25; // Round to nearest 25 for larger values
    return Math.ceil(value / 50) * 50; // Round to nearest 50 for very large values
  };

  const yAxisLabels = [
    0, // Start at 0 for proper interpretation
    getAdaptiveRound(maxVolume * 0.25),
    getAdaptiveRound(maxVolume * 0.5),
    getAdaptiveRound(maxVolume * 0.75),
    getAdaptiveRound(maxVolume),
  ].reverse(); // Reverse to show increasing values from bottom to top

  // Format volume with appropriate units and clear labeling
  const formatVolume = (volume: number) => {
    if (volume === 0) {
      return '0';
    }
    if (volume >= 1000) {
      return `${Math.floor(volume / 1000)}k`;
    }
    return volume.toString();
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bar-chart" size={20} color={Colors.foreground} />
        <Text style={styles.title}>Weekly Volume (kg)</Text>
      </View>

      <View style={styles.chartContainer}>
        {/* Y-axis with title and labels */}
        <View style={styles.yAxisContainer}>
          <View style={styles.yAxisLabels}>
            {yAxisLabels.map((label, index) => (
              <View key={index} style={styles.yAxisLabelRow}>
                <Text style={styles.yAxisLabel}>
                  {formatVolume(label)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Chart area */}
        <View style={styles.chartArea}>
          {chartData.map((point, index) => {
            const heightPercent = (point.volume / maxVolume) * 100;

            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(heightPercent, 5)}%`,
                        backgroundColor: (point.volume > 0 && point.workoutType) ? getWorkoutColor(point.workoutType).main : Colors.muted,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.label}>{formatDate(point.date)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {chartData.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No volume data yet</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 250,
  },
  yAxisContainer: {
    width: 50,
    marginRight: Spacing.sm,
  },
  yAxisLabels: {
    flex: 1,
    justifyContent: 'space-between',
  },
  yAxisLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yAxisLabel: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontSize: 10,
    textAlign: 'right',
    flex: 1,
  },
  chartArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  label: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontSize: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
});
