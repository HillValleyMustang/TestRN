/**
 * WeeklyTargetWidget Component
 * Shows weekly workout targets with circular color-coded pills
 * Reference: MOBILE_SPEC_02_DASHBOARD.md Section 3
 * 
 * Uses reactive hooks to fetch data automatically.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';
import { WorkoutSelectorModal } from './WorkoutSelectorModal';
import { useWeeklySummary, useUserProfile } from '../../hooks/data';
import { useAuth } from '../../app/_contexts/auth-context';
import { createTaggedLogger } from '../../lib/logger';

const log = createTaggedLogger('WeeklyTargetWidget');

interface WeeklyTargetWidgetProps {
  /** Callback when calendar icon is pressed */
  onViewCalendar?: () => void;
  /** Callback when a workout summary is requested */
  onViewWorkoutSummary?: (sessionId: string) => void;
  /** Callback when activities link is pressed */
  onViewActivities?: () => void;
}

export function WeeklyTargetWidget({
  onViewCalendar,
  onViewWorkoutSummary,
  onViewActivities,
}: WeeklyTargetWidgetProps) {
  // Get userId for reactive hooks
  const { userId } = useAuth();
  
  // Reactive data hooks
  const { data: profileData, loading: profileLoading, error: profileError } = useUserProfile(userId);
  
  const programmeType = profileData?.programme_type || 'ppl';
    
  const { 
    data: weeklySummaryData, 
    sessionsByWorkoutType: hookSessionsByWorkoutType,
    loading: summaryLoading, 
    error: summaryError 
  } = useWeeklySummary(userId, programmeType);
  
  // Data derived from hooks
  const completedWorkouts = useMemo(() => {
    if (weeklySummaryData) {
      return weeklySummaryData.completed_workouts.map(w => ({
        id: w.id,
        name: w.name,
        sessionId: w.sessionId,
        completedAt: null,
      }));
    }
    return [];
  }, [weeklySummaryData]);
  
  const sessionsByWorkoutType = useMemo(() => {
    if (hookSessionsByWorkoutType) {
      const transformed: Record<string, Array<{ id: string; name: string; completedAt: string | null }>> = {};
      for (const [key, sessions] of Object.entries(hookSessionsByWorkoutType)) {
        transformed[key] = sessions.map(s => ({
          id: s.id,
          name: s.template_name || key,
          completedAt: s.completed_at,
        }));
      }
      return transformed;
    }
    return {};
  }, [hookSessionsByWorkoutType]);
  
  const goalTotal = weeklySummaryData?.goal_total || (programmeType === 'ulul' ? 4 : 3);
  const totalSessions = weeklySummaryData?.total_sessions || 0;
  const loading = profileLoading || summaryLoading;
  const error = profileError?.message || summaryError?.message;
  
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorWorkoutName, setSelectorWorkoutName] = useState('');
  const [selectorSessions, setSelectorSessions] = useState<Array<{ id: string; name: string; completedAt: string | null }>>([]);

  // Use a ref to track the previous completedWorkouts IDs for comparison
  const workoutIds = useMemo(() => completedWorkouts.map(w => w.id).sort().join(','), [completedWorkouts]);
  const prevWorkoutIdsRef = useRef<string>(workoutIds);
  const [renderKey, setRenderKey] = useState(0);

  // Force re-render when completedWorkouts IDs change
  useEffect(() => {
    if (prevWorkoutIdsRef.current !== workoutIds) {
      prevWorkoutIdsRef.current = workoutIds;
      setRenderKey(prev => prev + 1);
    }
  }, [workoutIds]);

  // Construct progress text safely
  const progressText = useMemo(() => {
    const baseText = `${completedWorkouts.length} / ${goalTotal} T-Path Workouts Completed This Week`;
    if (totalSessions > completedWorkouts.length) {
      return `${baseText} (${totalSessions} sessions)`;
    }
    return baseText;
  }, [completedWorkouts.length, goalTotal, totalSessions]);

  // Memoize workoutTypes to prevent unnecessary recalculations
  const workoutTypes = useMemo(() => 
    programmeType === 'ulul'
      ? ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B']
      : ['Push', 'Pull', 'Legs']
  , [programmeType]);

  // Memoize getInitial to prevent unnecessary function recreation
  const getInitial = useMemo(() => (workoutName: string): string => {
    const name = workoutName.toLowerCase();
    if (name.includes('upper')) return 'U';
    if (name.includes('lower')) return 'L';
    if (name.includes('push')) return 'P';
    if (name.includes('pull')) return 'P';
    if (name.includes('leg')) return 'L';
    return workoutName.charAt(0).toUpperCase();
  }, []);

  const isWeekComplete = completedWorkouts.length >= goalTotal;

  if (error) {
    return (
      <Card style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={Colors.destructive} />
          <Text style={styles.errorText}>Failed to load weekly target.</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container} testID="weekly-target-widget">
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="barbell" size={20} color={Colors.foreground} />
          <Text style={styles.title}>Weekly Target</Text>
          {isWeekComplete && (
            <View style={styles.weeklyCompletionBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
              <Text style={styles.weeklyCompletionText}>Complete</Text>
            </View>
          )}
        </View>
        {onViewCalendar && (
          <Pressable onPress={onViewCalendar} hitSlop={10}>
            <Ionicons name="calendar" size={16} color={Colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={[
        styles.circlesContainer,
        { justifyContent: 'center' }
      ]}>
        {(() => {
          const coreWorkouts = workoutTypes.slice(0, goalTotal);

          return coreWorkouts.map((workoutType, index) => {
            const matchingWorkout = completedWorkouts.find(workout =>
              workout.name.toLowerCase() === workoutType.toLowerCase()
            );
            
            const isCompleted = !!matchingWorkout;
            const colors = getWorkoutColor(workoutType);

            if (isCompleted && matchingWorkout) {
              return (
                <Pressable
                  key={`core-${index}`}
                  testID={`core-circle-${index}`}
                  style={[
                    styles.circle,
                    styles.completedCircle,
                    { backgroundColor: colors.main }
                  ]}
                  onPress={() => {
                    const key = workoutType.toLowerCase();
                    const rawSessions = sessionsByWorkoutType?.[key] || [];
                    
                    if (rawSessions.length > 1) {
                      const mappedSessions = rawSessions.map((s: any) => ({
                        id: s.id || s.sessionId,
                        name: s.name || s.template_name,
                        completedAt: s.completedAt || s.completed_at || s.session_date
                      }));
                      
                      setSelectorWorkoutName(workoutType);
                      setSelectorSessions(mappedSessions);
                      setSelectorVisible(true);
                    } else {
                      const sessionId = rawSessions.length === 1 
                        ? (rawSessions[0].id || (rawSessions[0] as any).sessionId)
                        : (matchingWorkout.sessionId || matchingWorkout.id);
                      if (sessionId) {
                        onViewWorkoutSummary?.(sessionId);
                      }
                    }
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </Pressable>
              );
            }

            return (
              <View
                key={`core-${index}`}
                testID={`core-circle-incomplete-${index}`}
                style={[
                  styles.circle,
                  styles.incompleteCircle,
                  { borderColor: colors.main }
                ]}
              >
                <Text style={[styles.circleText, { color: colors.main }]}>
                  {getInitial(workoutType)}
                </Text>
              </View>
            );
          });
        })()}
      </View>

      <Text style={styles.progressText}>
        {progressText}
      </Text>

      <WorkoutSelectorModal
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        workoutName={selectorWorkoutName}
        sessions={selectorSessions}
        onSelect={(sessionId) => {
          onViewWorkoutSummary?.(sessionId);
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weeklyCompletionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 195, 125, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(142, 195, 125, 0.3)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
    marginLeft: Spacing.xs,
  },
  weeklyCompletionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: Colors.success,
    fontWeight: '500',
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
  },
  circlesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCircle: {
    borderWidth: 0,
  },
  incompleteCircle: {
    borderWidth: 1,
    backgroundColor: Colors.card,
  },
  circleText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
  },
  progressText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.destructive,
  },
});
