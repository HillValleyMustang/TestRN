/**
 * SimpleVolumeChart Component
 * Displays weekly volume as simple bar chart with Y-axis values and workout type colors
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';


interface VolumeData {
  date: string;
  volume: number;
  workoutType?: string; // Added for color mapping
}

interface SimpleVolumeChartProps {
  data: VolumeData[];
}

// Color mapping for different workout types using exact pre-defined colors
const getWorkoutColor = (workoutType?: string): string => {
  switch (workoutType?.toLowerCase()) {
    case 'push':
      return '#3B82F6'; // Blue for Push workouts
    case 'pull':
      return '#10B981'; // Green for Pull workouts
    case 'legs':
      return '#F59E0B'; // Orange for Legs workouts
    case 'upper body a':
    case 'upper a':
      return '#1e3a8a'; // Dark Blue for Upper Body A
    case 'upper body b':
    case 'upper b':
      return '#EF4444'; // Red for Upper Body B
    case 'lower body a':
    case 'lower a':
      return '#0891b2'; // Cyan for Lower Body A
    case 'lower body b':
    case 'lower b':
      return '#6b21a8'; // Purple for Lower Body B
    case 'bonus':
      return '#F59E0B'; // Orange for Bonus (same as Legs)
    case 'ad hoc workout':
      return '#64748B'; // Slate for Ad Hoc
    default:
      return '#8E8E93'; // Gray for unknown/other workouts
  }
};

export function SimpleVolumeChart({ data }: SimpleVolumeChartProps) {
  // Use the data prop directly - no internal state needed
  // This ensures the chart always shows the latest data from the parent
  const chartData = data;

  // Memoize maxVolume calculation to prevent recalculation on every render
  const maxVolume = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map(d => d.volume), 1);
  }, [chartData]);

  // Debug logging removed - too verbose

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
          {/* Y-axis labels with improved positioning */}
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
                        backgroundColor: (point.volume > 0 && point.workoutType) ? getWorkoutColor(point.workoutType) : Colors.muted,
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

      {chartData.length === 0 && (
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
    width: 50, // Increased width to accommodate larger numbers and 0 label
    marginRight: Spacing.sm,
  },
  yAxisTitle: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontSize: 10,
    textAlign: 'right',
    marginBottom: 4,
    fontWeight: '600',
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
