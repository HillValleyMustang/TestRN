import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getWorkoutColor } from '../../lib/workout-colors';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

// Categorize muscle groups into upper/lower body
const categorizeMuscleGroups = (muscleGroups: string[]) => {
  const upperBodyGroups = new Set();
  const lowerBodyGroups = new Set();

  muscleGroups.forEach(group => {
    const lowerGroup = group.toLowerCase();

    // Upper body muscles
    if (lowerGroup.includes('chest') || lowerGroup.includes('pectorals') ||
        lowerGroup.includes('shoulders') || lowerGroup.includes('deltoids') ||
        lowerGroup.includes('back') || lowerGroup.includes('lats') ||
        lowerGroup.includes('biceps') || lowerGroup.includes('triceps') ||
        lowerGroup.includes('traps') || lowerGroup.includes('rear delts')) {
      upperBodyGroups.add(group);
    }
    // Lower body muscles
    else if (lowerGroup.includes('quad') || lowerGroup.includes('hamstring') ||
             lowerGroup.includes('glutes') || lowerGroup.includes('calves') ||
             lowerGroup.includes('inner thighs') || lowerGroup.includes('outer glutes')) {
      lowerBodyGroups.add(group);
    }
    // Core muscles - could go in either, but let's put in upper for now
    else if (lowerGroup.includes('abs') || lowerGroup.includes('abdominals') ||
             lowerGroup.includes('core')) {
      upperBodyGroups.add(group);
    }
    // Default to upper body for unknown groups
    else {
      upperBodyGroups.add(group);
    }
  });

  return {
    upper: Array.from(upperBodyGroups) as string[],
    lower: Array.from(lowerBodyGroups) as string[]
  };
};

// Utility function to get start of week
const getStartOfWeek = (date: Date): Date => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

interface WeeklyVolumeData {
  [muscleGroup: string]: number;
}

interface WeeklyVolumeChartProps {
  weeklyVolumeTotals: WeeklyVolumeData;
  selectedTab: 'upper' | 'lower';
  onTabChange: (tab: 'upper' | 'lower') => void;
  workoutName?: string;
  weeklyVolumeData?: WeeklyVolumeData;
  startTime?: Date;
  title?: string;
}

export const WeeklyVolumeChart: React.FC<WeeklyVolumeChartProps> = ({
  weeklyVolumeTotals,
  selectedTab,
  onTabChange,
  workoutName = 'default',
  weeklyVolumeData,
  startTime,
  title = 'Weekly Muscle Volume'
}) => {
  // Get all muscle groups from the data
  const allMuscleGroups = Object.keys(weeklyVolumeTotals);

  // Categorize muscle groups
  const { upper: upperBodyMuscles, lower: lowerBodyMuscles } = categorizeMuscleGroups(allMuscleGroups);

  // Filter data based on selected tab
  const filteredData = Object.entries(weeklyVolumeTotals)
    .filter(([muscle]) => {
      if (selectedTab === 'upper') {
        return upperBodyMuscles.includes(muscle);
      } else {
        return lowerBodyMuscles.includes(muscle);
      }
    })
    .sort(([,a], [,b]) => b - a);

  // Memoize maxVolume calculation to prevent O(n²) operation inside map
  // This was being recalculated for each item in filteredData.map()
  const maxVolume = useMemo(() => {
    if (filteredData.length === 0) return 1;
    return Math.max(...filteredData.map(([, vol]) => typeof vol === 'number' && !isNaN(vol) ? vol : 0), 1);
  }, [filteredData]);

  return (
    <Card style={styles.progressCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {weeklyVolumeData ? title : 'Current Week Volume'}
        </Text>
        {weeklyVolumeData && startTime && (
          <Text style={styles.cardSubtitle}>
            Weekly totals - Week of {getStartOfWeek(startTime).toLocaleDateString()}
          </Text>
        )}
        {!weeklyVolumeData && (
          <Text style={styles.cardSubtitle}>
            Dynamic calculation - showing current week totals
          </Text>
        )}
      </View>
      <View style={styles.cardContent}>
        {/* Upper/Lower Body Tabs */}
        <View style={styles.volumeTabsContainer}>
          <TouchableOpacity
            style={[
              styles.volumeTab,
              styles.volumeTabLeft,
              (selectedTab === 'upper') && { backgroundColor: getWorkoutColor(workoutName).main }
            ]}
            onPress={() => onTabChange('upper')}
            accessibilityState={{ selected: selectedTab === 'upper' }}
          >
            <Text style={[
              styles.volumeTabText,
              selectedTab === 'upper' && styles.volumeTabTextActive
            ]}>
              Upper Body
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.volumeTab,
              styles.volumeTabRight,
              (selectedTab === 'lower') && { backgroundColor: getWorkoutColor(workoutName).main }
            ]}
            onPress={() => onTabChange('lower')}
            accessibilityState={{ selected: selectedTab === 'lower' }}
          >
            <Text style={[
              styles.volumeTabText,
              selectedTab === 'lower' && styles.volumeTabTextActive
            ]}>
              Lower Body
            </Text>
          </TouchableOpacity>
        </View>

        {/* Volume Distribution Chart */}
        <View style={styles.volumeChartContainer}>
          {filteredData.map(([muscle, volume]) => {
            const safeVolume = typeof volume === 'number' && !isNaN(volume) ? volume : 0;
            const percentage = (safeVolume / maxVolume) * 100;

            return (
              <View key={muscle} style={styles.volumeBarRow}>
                <View style={styles.volumeBarLabel}>
                  <Text style={styles.volumeBarMuscle}>{muscle}</Text>
                  <Text style={styles.volumeBarValue}>
                    {safeVolume.toFixed(0)}kg • {percentage.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.volumeBarBackground}>
                  <View
                    style={[
                      styles.volumeBarFill,
                      { width: `${percentage}%`, backgroundColor: getWorkoutColor(workoutName).main }
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
};

const styles = {
  progressCard: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  cardHeader: {
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  cardTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    textAlign: 'center' as const,
  },
  cardContent: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  cardSubtitle: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    textAlign: 'center' as const,
    marginTop: Spacing.xs,
  },
  volumeTabsContainer: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: 2,
    marginBottom: Spacing.md,
  },
  volumeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 6,
    alignItems: 'center' as const,
  },
  volumeTabLeft: {
    marginRight: 2,
  },
  volumeTabRight: {
    marginLeft: 2,
  },
  volumeTabText: {
    ...TextStyles.smallMedium,
    color: Colors.mutedForeground,
    fontWeight: '500' as const,
  },
  volumeTabTextActive: {
    color: Colors.white,
  },
  volumeChartContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  volumeBarRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  volumeBarLabel: {
    flex: 1,
    minWidth: 100,
  },
  volumeBarMuscle: {
    ...TextStyles.smallMedium,
    color: Colors.foreground,
    fontWeight: '600' as const,
  },
  volumeBarValue: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  volumeBarBackground: {
    flex: 2,
    height: 12,
    backgroundColor: Colors.secondary,
    borderRadius: 6,
    overflow: 'hidden' as const,
  },
  volumeBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
};