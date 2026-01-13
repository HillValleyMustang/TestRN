import React, { useState } from 'react';
import { View, Modal, Text, Dimensions, StyleSheet, ScrollView } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import { HapticPressable } from '../HapticPressable';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';
import { VolumeDistributionChart } from './VolumeDistributionChart';
import { RecentSessionsList } from './RecentSessionsList';
import { useWorkoutPerformanceData } from '../../hooks/useWorkoutPerformanceData';
import { useData } from '../../app/_contexts/data-context';

const { width } = Dimensions.get('window');

interface WorkoutPerformanceModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WorkoutPerformanceModal: React.FC<WorkoutPerformanceModalProps> = ({
  visible,
  onClose,
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [distributionTab, setDistributionTab] = useState<'upper' | 'lower'>('upper');

  const { deleteWorkoutSession } = useData();
  const {
    weeklyVolumeTotals,
    weeklySetsTotals,
    dailyVolumeData,
    recentSessions,
    totalWeeklyVolume,
    totalWeeklySets,
    weeklyWorkoutCount,
    weeklyPRCount,
    isLoading,
    error
  } = useWorkoutPerformanceData();

  const routes = [
    { key: 'overview', title: 'Overview' },
    { key: 'sessions', title: 'Sessions' },
    { key: 'trends', title: 'Trends' },
  ];

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteWorkoutSession(sessionId);
      // The hook will automatically refetch data
    } catch (error) {
      console.error('[WorkoutPerformanceModal] Failed to delete session:', error);
    }
  };

  const OverviewTab = () => (
    <ScrollView
      style={styles.tabScrollView}
      contentContainerStyle={styles.tabScrollViewContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      bounces={true}
    >
      {/* Weekly Stats Summary */}
      <Card style={styles.statsCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>This Week</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getWorkoutColor('performance').main }]}>
                {totalWeeklyVolume.toFixed(0)}kg
              </Text>
              <Text style={styles.statLabel}>Total Volume</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getWorkoutColor('performance').main }]}>
                {weeklyWorkoutCount}
              </Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getWorkoutColor('performance').main }]}>
                {totalWeeklySets}
              </Text>
              <Text style={styles.statLabel}>Total Sets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getWorkoutColor('performance').main }]}>
                {weeklyPRCount}
              </Text>
              <Text style={styles.statLabel}>PRs</Text>
            </View>
          </View>
        </View>
      </Card>

      <VolumeDistributionChart
        weeklyVolumeTotals={weeklyVolumeTotals}
        weeklySetsTotals={weeklySetsTotals}
        totalWeeklyVolume={totalWeeklyVolume}
        selectedTab={distributionTab}
        onTabChange={setDistributionTab}
        workoutName="performance"
      />
    </ScrollView>
  );

  const SessionsTab = () => (
    <View style={styles.tabContent}>
      <RecentSessionsList
        sessions={recentSessions}
        onDeleteSession={(sessionId, _templateName) => handleDeleteSession(sessionId)}
        loading={isLoading}
        maxItems={15}
      />
    </View>
  );

  const TrendsTab = () => (
    <ScrollView
      style={styles.tabScrollView}
      contentContainerStyle={styles.tabScrollViewContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      bounces={true}
    >
      {/* Weekly Volume Trend Chart */}
      <Card style={styles.trendsCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Weekly Volume Trend</Text>
          <Text style={styles.cardSubtitle}>Daily volume for current week</Text>
        </View>
        <View style={styles.cardContent}>
          {!isLoading && dailyVolumeData && dailyVolumeData.length > 0 ? (
            <View style={styles.trendChartContainer}>
              {/* Bar chart showing actual daily volumes */}
              <Text style={styles.trendChartTitle}>Volume by Day</Text>
              <View style={styles.trendBarsContainer}>
                {dailyVolumeData.map((dayData) => {
                  const maxVolume = Math.max(...dailyVolumeData.map(d => d.volume), 100); // At least 100 for scaling
                  const percentage = maxVolume > 0 ? (dayData.volume / maxVolume) * 100 : 0;

                  return (
                    <View key={dayData.day} style={styles.trendBarColumn}>
                      <View style={styles.trendBarContainer}>
                        <View
                          style={[
                            styles.trendBarFill,
                            {
                              height: `${percentage}%`,
                              backgroundColor: dayData.volume > 0 ? getWorkoutColor('performance').main : Colors.mutedForeground
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.trendBarLabel}>{dayData.day}</Text>
                      <Text style={styles.trendBarValue}>{dayData.volume}kg</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {isLoading ? 'Loading trend data...' : 'No workout data available for this week'}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </ScrollView>
  );

  const renderTabBar = (props: any) => (
    <View style={styles.tabBarContainer}>
      <TabBar
        {...props}
        style={styles.tabBar}
        indicatorStyle={styles.tabIndicator}
        activeColor={Colors.primary}
        inactiveColor={Colors.mutedForeground}
        labelStyle={styles.tabLabel}
      />
    </View>
  );

  if (error) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Error Loading Data</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <HapticPressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </HapticPressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons name="bar-chart" size={24} color={Colors.primary} />
              <Text style={styles.title}>Workout Performance</Text>
            </View>
            <HapticPressable
              style={styles.closeIcon}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </HapticPressable>
          </View>

          {/* Tab View Container */}
          <View style={styles.tabViewContainer}>
            <TabView
              navigationState={{ index: tabIndex, routes }}
              renderScene={SceneMap({
                overview: OverviewTab,
                sessions: SessionsTab,
                trends: TrendsTab,
              })}
              onIndexChange={setTabIndex}
              initialLayout={{ width }}
              swipeEnabled={true}
              animationEnabled={true}
              renderTabBar={renderTabBar}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xl,
    maxHeight: '85%',
    minHeight: 400, // Add minimum height
    width: width - (Spacing.md * 2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    flex: 1, // Add flex to allow content to expand
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...TextStyles.h4,
    color: Colors.foreground,
    fontWeight: '600',
  },
  closeIcon: {
    padding: Spacing.xs,
  },
  tabBarContainer: {
    backgroundColor: Colors.card,
  },
  tabBar: {
    backgroundColor: Colors.card,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabIndicator: {
    backgroundColor: Colors.primary,
    height: 3,
  },
  tabLabel: {
    ...TextStyles.smallMedium,
    fontWeight: '500',
  },
  tabViewContainer: {
    flex: 1,
  },
  tabScrollView: {
    flex: 1,
  },
  tabScrollViewContent: {
    padding: Spacing.md,
  },
  tabContent: {
    flex: 1,
    padding: Spacing.md,
  },
  errorContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    margin: Spacing.lg,
    alignItems: 'center',
    maxWidth: 300,
  },
  errorTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  closeButtonText: {
    ...TextStyles.button,
    color: Colors.white,
  },
  // Weekly stats card styles
  statsCard: {
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
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.sm,
  },
  statItem: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center' as const,
    paddingVertical: Spacing.sm,
  },
  statValue: {
    ...TextStyles.h4,
    fontWeight: 'bold' as const,
    marginBottom: 2,
  },
  statLabel: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    textAlign: 'center' as const,
  },
  // Trends tab styles
  trendsCard: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  trendChartContainer: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  trendChartTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    marginBottom: Spacing.xl,
    textAlign: 'center' as const,
  },
  trendBarsContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-end' as const,
    height: 160,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.lg,
  },
  trendBarColumn: {
    alignItems: 'center' as const,
    flex: 1,
  },
  trendBarContainer: {
    width: 24,
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 4,
    justifyContent: 'flex-end' as const,
    marginBottom: Spacing.xs,
  },
  trendBarFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  trendBarLabel: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    marginBottom: Spacing.xs,
  },
  trendBarValue: {
    ...TextStyles.smallMedium,
    color: Colors.foreground,
    fontWeight: '500' as const,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center' as const,
  },
  emptyStateText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center' as const,
  },
});