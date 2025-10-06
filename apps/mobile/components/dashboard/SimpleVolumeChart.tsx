/**
 * SimpleVolumeChart Component
 * Displays weekly volume as simple bar chart
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface VolumeData {
  date: string;
  volume: number;
}

interface SimpleVolumeChartProps {
  data: VolumeData[];
}

export function SimpleVolumeChart({ data }: SimpleVolumeChartProps) {
  const maxVolume = Math.max(...data.map(d => d.volume), 1);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bar-chart" size={20} color={Colors.foreground} />
        <Text style={styles.title}>Weekly Volume</Text>
      </View>
      
      <View style={styles.chartContainer}>
        {data.map((point, index) => {
          const heightPercent = (point.volume / maxVolume) * 100;
          
          return (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar,
                    { 
                      height: `${Math.max(heightPercent, 5)}%`,
                      backgroundColor: point.volume > 0 ? Colors.actionPrimary : Colors.muted,
                    },
                  ]}
                />
              </View>
              <Text style={styles.label}>{formatDate(point.date)}</Text>
            </View>
          );
        })}
      </View>
      
      {data.length === 0 && (
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
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 250,
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
