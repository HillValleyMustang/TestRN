/**
 * WeeklyTargetWidget Component
 * Shows weekly workout targets with circular color-coded pills
 * Reference: MOBILE_SPEC_02_DASHBOARD.md Section 3
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';

interface CompletedWorkout {
  id: string;
  name: string;
  sessionId?: string;
}

interface WeeklyTargetWidgetProps {
  completedWorkouts: CompletedWorkout[];
  goalTotal: number;
  programmeType: 'ppl' | 'ulul';
  totalSessions?: number;
  onViewCalendar?: () => void;
  onViewWorkoutSummary?: (sessionId: string) => void;
  activitiesCount?: number;
  onViewActivities?: () => void;
  loading?: boolean;
  error?: string;
}

export function WeeklyTargetWidget({
  completedWorkouts = [],
  goalTotal,
  programmeType,
  totalSessions,
  onViewCalendar,
  onViewWorkoutSummary,
  activitiesCount = 0,
  onViewActivities,
  loading,
  error,
}: WeeklyTargetWidgetProps) {
  // Use a ref to track the previous completedWorkouts for deep comparison
  const prevCompletedWorkoutsRef = useRef<string>(JSON.stringify(completedWorkouts.map(w => ({ id: w.id, name: w.name }))));
  const [renderKey, setRenderKey] = useState(0);

  // Force re-render when completedWorkouts changes to ensure fresh data
  // CRITICAL FIX: Use deep comparison instead of just length to detect actual changes
  useEffect(() => {
    const currentWorkoutsKey = JSON.stringify(completedWorkouts.map(w => ({ id: w.id, name: w.name })));
    if (prevCompletedWorkoutsRef.current !== currentWorkoutsKey) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WeeklyTargetWidget.tsx:51',message:'WeeklyTargetWidget detected workout change',data:{oldKey:prevCompletedWorkoutsRef.current,newKey:currentWorkoutsKey,oldLength:JSON.parse(prevCompletedWorkoutsRef.current||'[]').length,newLength:completedWorkouts.length},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (__DEV__) {
        console.log('🔄 WeeklyTargetWidget useEffect triggered:', {
          oldKey: prevCompletedWorkoutsRef.current,
          newKey: currentWorkoutsKey,
          completedWorkouts: completedWorkouts.map(w => ({ id: w.id, name: w.name }))
        });
      }
      prevCompletedWorkoutsRef.current = currentWorkoutsKey;
      // Force a re-render by incrementing the render key
      setRenderKey(prev => prev + 1);
    }
  }, [completedWorkouts]);

  // Construct progress text safely
  const progressText = useMemo(() => {
    const baseText = `${completedWorkouts.length} / ${goalTotal} T-Path Workouts Completed This Week`;
    if (totalSessions && typeof totalSessions === 'number' && totalSessions > completedWorkouts.length) {
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

  if (!programmeType) {
    return (
      <Card style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No programme type set. Complete onboarding or set one in your profile.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="barbell" size={20} color={Colors.foreground} />
          <Text style={styles.title}>Weekly Target</Text>
        </View>
        {onViewCalendar && (
          <Pressable onPress={onViewCalendar} hitSlop={10}>
            <Ionicons name="calendar" size={16} color={Colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={[
        styles.circlesContainer,
        { justifyContent: 'center' } // Always center since additional circles are commented out
      ]}>
        {(() => {
           const hasAdditionalWorkouts = totalSessions ? totalSessions > goalTotal : false;
           const additionalWorkoutsCount = Math.min(
             Math.max(0, (totalSessions || 0) - completedWorkouts.length),
             7 - goalTotal // Max additional circles to reach 7 total
           );
           
           // Debug logging
           if (__DEV__) {
             console.log('WeeklyTargetWidget Debug:', {
               totalSessions,
               completedWorkoutsLength: completedWorkouts.length,
               goalTotal,
               hasAdditionalWorkouts,
               additionalWorkoutsCount,
               maxAdditional: 7 - goalTotal,
             });
           }

          const coreWorkouts = workoutTypes.slice(0, goalTotal);

          // Render core workout circles
          const coreCircles = coreWorkouts.map((workoutType, index) => {
            // Find the completed workout that matches this workout type
            const matchingWorkout = completedWorkouts.find(workout =>
              workout.name.toLowerCase() === workoutType.toLowerCase()
            );
            
            const isCompleted = !!matchingWorkout;
            const colors = getWorkoutColor(workoutType);

            if (isCompleted && matchingWorkout) {
              return (
                <Pressable
                  key={`core-${index}`}
                  style={[
                    styles.circle,
                    styles.completedCircle,
                    { backgroundColor: colors.main }
                  ]}
                  onPress={() => {
                    const sessionId = matchingWorkout.sessionId || matchingWorkout.id;
                    if (__DEV__) {
                      console.log('🎯 Circle pressed:', {
                        index,
                        workoutType,
                        workoutName: matchingWorkout.name,
                        sessionId,
                        completedWorkoutsLength: completedWorkouts.length
                      });
                    }
                    if (sessionId) {
                      onViewWorkoutSummary?.(sessionId);
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

          // TEMPORARILY COMMENTED OUT: Additional circles logic
          // This can be re-enabled later if needed
          /*
          const additionalCircles = [];
          if (hasAdditionalWorkouts && additionalWorkoutsCount > 0) {
            if (__DEV__) {
              console.log('🎯 Creating additional circles:', additionalWorkoutsCount);
            }
            // Add gap between core and additional circles
            additionalCircles.push(
              <View key="gap" style={styles.circleGap} />
            );

            // Get the color of the most completed workout type for additional circles
            const mostCompletedWorkout = completedWorkouts[0]; // Since they're deduplicated, first one represents the type
            const additionalColor = mostCompletedWorkout ? getWorkoutColor(mostCompletedWorkout.name).main : Colors.primary;

            for (let i = 0; i < additionalWorkoutsCount; i++) {
              additionalCircles.push(
                <Pressable
                  key={`additional-${i}`}
                  style={[
                    styles.circle,
                    styles.completedCircle,
                    { backgroundColor: additionalColor }
                  ]}
                  onPress={() => onViewWorkoutSummary?.('')} // Empty string since we don't have specific session IDs for additional workouts
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </Pressable>
              );
            }
          }
          */

          return coreCircles; // Only return core circles, additional circles commented out
        })()}
      </View>

      <Text style={styles.progressText}>
        {progressText}
      </Text>

      {activitiesCount > 0 && onViewActivities && (
        <Pressable onPress={onViewActivities} style={styles.activitiesLink}>
          <Text style={styles.activitiesText}>
            {activitiesCount} {activitiesCount === 1 ? 'Activity' : 'Activities'} Completed This Week
          </Text>
        </Pressable>
      )}
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
  sessionsText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  circleGap: {
    width: Spacing.md,
  },
  activitiesLink: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  activitiesText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    textDecorationLine: 'underline',
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
  emptyContainer: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
});
