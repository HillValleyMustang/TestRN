/**
 * ExerciseProgressionChart Component
 * Custom line chart showing exercise progression over last N sessions
 * Built with native React Native components (no external chart library)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface ExerciseProgressionData {
  session_id: string;
  session_date: string;
  total_volume_kg: number;
  max_weight_kg: number;
  total_reps: number;
  set_count: number;
}

interface ExerciseProgressionChartProps {
  data: ExerciseProgressionData[];
  exerciseName: string;
  metric?: 'volume' | 'weight';
}

export function ExerciseProgressionChart({
  data,
  exerciseName,
  metric = 'volume',
}: ExerciseProgressionChartProps) {
  const { width } = Dimensions.get('window');
  const chartWidth = width - Spacing.lg * 4;
  const chartHeight = 200;
  const paddingX = 40;
  const paddingY = 30;

  // Sort data by date (oldest first for left-to-right progression)
  const sortedData = useMemo(() => {
    return [...data].sort(
      (a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
    );
  }, [data]);

  // Calculate chart metrics
  const chartMetrics = useMemo(() => {
    if (sortedData.length === 0) return null;

    const values = sortedData.map((d) =>
      metric === 'volume' ? d.total_volume_kg : d.max_weight_kg
    );
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue;
    const yScale = range > 0 ? (chartHeight - paddingY * 2) / range : 1;
    const xStep =
      sortedData.length > 1
        ? (chartWidth - paddingX * 2) / (sortedData.length - 1)
        : 0;

    // Calculate trend (improving, stable, declining)
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const trendPercent =
      firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    const trend =
      trendPercent > 5 ? 'improving' : trendPercent < -5 ? 'declining' : 'stable';

    return {
      values,
      maxValue,
      minValue,
      range,
      yScale,
      xStep,
      trend,
      trendPercent,
    };
  }, [sortedData, metric, chartHeight, chartWidth]);

  if (!chartMetrics || sortedData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bar-chart-outline" size={32} color={Colors.mutedForeground} />
        <Text style={styles.emptyText}>Not enough data to show progression</Text>
        <Text style={styles.emptySubtext}>Complete at least 3 sessions with {exerciseName}</Text>
      </View>
    );
  }

  // Calculate point positions
  const points = sortedData.map((dataPoint, index) => {
    const value =
      metric === 'volume' ? dataPoint.total_volume_kg : dataPoint.max_weight_kg;
    const x = paddingX + index * chartMetrics.xStep;
    const y =
      chartHeight -
      paddingY -
      (value - chartMetrics.minValue) * chartMetrics.yScale;

    return { x, y, value, date: dataPoint.session_date };
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format trend percentage
  const trendText =
    chartMetrics.trendPercent >= 0
      ? `+${chartMetrics.trendPercent.toFixed(1)}%`
      : `${chartMetrics.trendPercent.toFixed(1)}%`;

  const trendColor =
    chartMetrics.trendPercent > 5
      ? Colors.success
      : chartMetrics.trendPercent < -5
      ? Colors.destructive
      : Colors.mutedForeground;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{exerciseName}</Text>
        <Text style={[styles.trendText, { color: trendColor }]}>{trendText}</Text>
      </View>

      {/* Chart */}
      <View style={[styles.chartContainer, { width: chartWidth, height: chartHeight }]}>
        {/* Y-axis labels */}
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>{chartMetrics.maxValue.toFixed(0)}</Text>
          <Text style={styles.axisLabel}>
            {((chartMetrics.maxValue + chartMetrics.minValue) / 2).toFixed(0)}
          </Text>
          <Text style={styles.axisLabel}>{chartMetrics.minValue.toFixed(0)}</Text>
        </View>

        {/* Grid lines */}
        <View style={styles.gridContainer}>
          <View style={[styles.gridLine, { top: paddingY }]} />
          <View style={[styles.gridLine, { top: chartHeight / 2 }]} />
          <View style={[styles.gridLine, { bottom: paddingY }]} />
        </View>

        {/* Chart with data points only */}
        <View style={styles.chartArea}>
          {/* Draw data points */}
          {points.map((point, index) => (
            <View
              key={`point-${index}`}
              style={[
                styles.dataPoint,
                {
                  left: point.x - 6,
                  top: point.y - 6,
                },
              ]}
            >
              <View style={styles.dataPointInner} />
            </View>
          ))}
        </View>

        {/* X-axis labels */}
        <View style={styles.xAxisLabels}>
          {points.map((point, index) => {
            // Only show first, middle, and last labels to avoid crowding
            const showLabel =
              index === 0 ||
              index === Math.floor(points.length / 2) ||
              index === points.length - 1;

            if (!showLabel) return null;

            return (
              <Text
                key={`x-label-${index}`}
                style={[
                  styles.xAxisLabel,
                  {
                    left: point.x - 30,
                  },
                ]}
              >
                {formatDate(point.date)}
              </Text>
            );
          })}
        </View>
      </View>

      {/* Metric label */}
      <Text style={styles.metricLabel}>
        {metric === 'volume' ? 'Total Volume (kg)' : 'Max Weight (kg)'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  chartContainer: {
    position: 'relative',
    marginVertical: Spacing.md,
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 30,
    bottom: 30,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: 35,
  },
  axisLabel: {
    fontSize: 10,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  gridContainer: {
    position: 'absolute',
    left: 40,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.border,
  },
  chartArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: Colors.actionPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataPointInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.actionPrimary,
  },
  xAxisLabels: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 20,
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: 10,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
    width: 60,
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontFamily: 'Poppins_400Regular',
  },
  emptyContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.mutedForeground,
    marginTop: Spacing.sm,
    fontFamily: 'Poppins_500Medium',
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
});
