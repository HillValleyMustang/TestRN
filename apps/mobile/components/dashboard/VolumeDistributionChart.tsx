import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TouchableOpacity as TouchableOpacityComponent } from 'react-native';
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

interface VolumeDistribution {
  [muscleGroup: string]: number;
}

interface VolumeDistributionChartProps {
  weeklyVolumeTotals: VolumeDistribution;
  weeklySetsTotals: VolumeDistribution;
  totalWeeklyVolume: number;
  selectedTab: 'upper' | 'lower';
  onTabChange: (tab: 'upper' | 'lower') => void;
  workoutName?: string;
}

export const VolumeDistributionChart: React.FC<VolumeDistributionChartProps> = ({
  weeklyVolumeTotals,
  weeklySetsTotals,
  totalWeeklyVolume,
  selectedTab,
  onTabChange,
  workoutName = 'performance'
}) => {
  const [selectedMuscle, setSelectedMuscle] = React.useState<string | null>(null);
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
    .sort(([,a], [,b]) => b - a); // Sort by volume descending

  const handleMuscleLongPress = (muscle: string) => {
    setSelectedMuscle(selectedMuscle === muscle ? null : muscle);
  };

  // Calculate some stats for the current tab
  const tabVolume = filteredData.reduce((sum, [, volume]) => sum + volume, 0);
  const tabPercentage = totalWeeklyVolume > 0 ? (tabVolume / totalWeeklyVolume) * 100 : 0;

  return (
    <Card style={styles.distributionCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Weekly Volume Distribution</Text>
        <Text style={styles.cardSubtitle}>
          {selectedTab === 'upper' ? 'Upper' : 'Lower'} Body • {tabVolume.toFixed(0)}kg ({tabPercentage.toFixed(1)}% of total)
        </Text>
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
            const percentage = totalWeeklyVolume > 0 ? ((volume / totalWeeklyVolume) * 100) : 0;
            const sets = weeklySetsTotals[muscle] || 0;
            const isSelected = selectedMuscle === muscle;

            return (
              <TouchableOpacity
                key={muscle}
                style={styles.volumeBarRow}
                onLongPress={() => handleMuscleLongPress(muscle)}
                activeOpacity={0.7}
              >
                <View style={styles.volumeBarLabel}>
                  <Text style={styles.volumeBarMuscle}>{muscle}</Text>
                  <View style={styles.volumeBarValues}>
                    <Text style={styles.volumeBarValue}>
                      {volume.toFixed(0)}kg • {percentage.toFixed(1)}%
                    </Text>
                    <Text style={styles.volumeBarSets}>
                      {sets} sets
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.muscleDetails}>
                      <Text style={styles.muscleDetailText}>
                        Avg: {(volume / Math.max(sets, 1)).toFixed(0)}kg/set
                      </Text>
                      <Text style={styles.muscleDetailText}>
                        {sets > 0 ? `${(sets / 7).toFixed(1)} sets/day` : 'No recent sets'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.volumeBarBackground}>
                  {volume > 0 && percentage > 0 && (
                    <View
                      style={[
                        styles.volumeBarFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: getWorkoutColor(workoutName).main
                        }
                      ]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            Total Weekly Volume: {totalWeeklyVolume.toFixed(0)}kg
          </Text>
          <Text style={styles.hintText}>
            Long press muscle groups for details
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = {
  distributionCard: {
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
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    textAlign: 'center' as const,
  },
  cardContent: {
    flex: 1,
  },
  volumeTabsContainer: {
    flexDirection: 'row' as const,
    marginBottom: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: 2,
  },
  volumeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center' as const,
    borderRadius: 6,
  },
  volumeTabLeft: {
    marginRight: 1,
  },
  volumeTabRight: {
    marginLeft: 1,
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
    marginBottom: Spacing.md,
  },
  volumeBarRow: {
    marginBottom: Spacing.sm,
  },
  volumeBarLabel: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.xs,
  },
  volumeBarMuscle: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '500' as const,
  },
  volumeBarValues: {
    flexDirection: 'column' as const,
    gap: 2,
  },
  volumeBarValue: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  volumeBarSets: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    opacity: 0.8,
  },
  muscleDetails: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary,
  },
  muscleDetailText: {
    ...TextStyles.small,
    color: Colors.foreground,
    opacity: 0.9,
  },
  volumeBarBackground: {
    height: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  volumeBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  summaryContainer: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary,
    alignItems: 'center' as const,
  },
  summaryText: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    fontWeight: '500' as const,
  },
  hintText: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    opacity: 0.7,
    marginTop: Spacing.xs,
  },
};