import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import {
  Colors,
  Spacing,
  BorderRadius,
} from '../../../constants/design-system';
import { Skeleton } from '../ui/Skeleton';

interface VolumePoint {
  date: string;
  volume: number;
}

interface Props {
  data: VolumePoint[];
  loading?: boolean;
}

const formatLabel = (date: string) => {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export const WeeklyVolumeChart: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton height={120} />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <Text style={styles.emptyText}>
            Log some workouts to see your training volume.
          </Text>
        </CardContent>
      </Card>
    );
  }

  const maxVolume = Math.max(...data.map(d => d.volume), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Volume</CardTitle>
      </CardHeader>
      <CardContent>
        <View style={styles.chartRow}>
          {data.map(point => {
            const heightPercent = Math.max(point.volume / maxVolume, 0.05);
            return (
              <View key={point.date} style={styles.barContainer}>
                <View style={[styles.bar, { flex: heightPercent }]} />
                <Text style={styles.barLabel}>{formatLabel(point.date)}</Text>
              </View>
            );
          })}
        </View>
      </CardContent>
    </Card>
  );
};

export default WeeklyVolumeChart;

const styles = StyleSheet.create({
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
    minHeight: 160,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '60%',
    backgroundColor: Colors.actionPrimary,
    borderRadius: BorderRadius.md,
  },
  barLabel: {
    marginTop: Spacing.sm,
    color: Colors.gray500,
    fontSize: 12,
  },
  emptyText: {
    color: Colors.gray400,
    fontSize: 14,
  },
});
