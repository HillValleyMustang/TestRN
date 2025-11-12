/**
 * Workout Launcher Screen
 * Interactive workout selector showing expandable workouts with exercises
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight, Play, Dumbbell } from 'lucide-react-native';
import { useWorkoutFlow } from '../_contexts/workout-flow-context';
import { useWorkoutLauncherData } from '../../hooks/useWorkoutLauncherData';
import { ScreenContainer, ScreenHeader } from '../../components/layout';
import { GymToggle } from '../../components/dashboard/GymToggle';
import { BackgroundRoot } from '../../components/BackgroundRoot';
import { useData } from '../_contexts/data-context';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { ExerciseCard } from '../../components/workout/ExerciseCard';
import { ExerciseInfoModal } from '../../components/workout/ExerciseInfoModal';
import { ExerciseSwapModal } from '../../components/workout/ExerciseSwapModal';
import { WorkoutPill } from '../../components/workout-launcher';
import { WorkoutProgressBar } from '../../components/workout/WorkoutProgressBar';
import WorkoutSummaryModal from '../workout-summary';

interface WorkoutItemProps {
  workout: any;
  exercises: any[];
  isExpanded: boolean;
  onToggle: () => void;
  onStartWorkout: () => void;
}

const WorkoutItem: React.FC<WorkoutItemProps> = ({
  workout,
  exercises,
  isExpanded,
  onToggle,
  onStartWorkout,
}) => {
  return (
    <View style={styles.workoutItem}>
      {/* Workout Header */}
      <Pressable style={styles.workoutHeader} onPress={onToggle}>
        <View style={styles.workoutHeaderLeft}>
          {isExpanded ? (
            <ChevronDown size={20} color={Colors.foreground} />
          ) : (
            <ChevronRight size={20} color={Colors.foreground} />
          )}
          <Text style={styles.workoutName}>{workout.template_name}</Text>
        </View>
        <Text style={styles.exerciseCount}>
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </Text>
      </Pressable>

      {/* Expanded Exercises */}
      {isExpanded && (
        <View style={styles.exercisesContainer}>
          {exercises.map((exercise, index) => (
            <View key={exercise.id || index} style={styles.exercisePreview}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseMuscle}>
                  {exercise.main_muscle?.charAt(0).toUpperCase() + exercise.main_muscle?.slice(1)}
                </Text>
              </View>
              <View style={styles.exerciseTarget}>
                <Text style={styles.targetText}>
                  {exercise.target_sets || 3} sets × {exercise.target_reps_min || 8}-{exercise.target_reps_max || 12} reps
                </Text>
              </View>
            </View>
          ))}

          {/* Start Workout Button */}
          <Pressable
            style={({ pressed }) => [
              styles.startWorkoutButton,
              pressed && styles.startWorkoutButtonPressed,
            ]}
            onPress={onStartWorkout}
          >
            <Play size={16} color={Colors.white} />
            <Text style={styles.startWorkoutText}>Start Workout</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default function WorkoutLauncherScreen() {
  const router = useRouter();
  const {
    selectWorkout,
    selectAndStartWorkout,
    startWorkout,
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    removeExerciseFromSession,
    substituteExercise,
    finishWorkout,
    completedExercises,
    currentSessionId,
    resetWorkoutSession,
    confirmLeave,
  } = useWorkoutFlow();
  const { profile, activeTPath, childWorkouts, adhocWorkouts, workoutExercisesCache, lastCompletedDates, loading, error, refresh } = useWorkoutLauncherData();
  const { getGyms, setActiveGym } = useData();
  const [userGyms, setUserGyms] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [isWorkoutActiveInline, setIsWorkoutActiveInline] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [currentExerciseId, setCurrentExerciseId] = useState<string>('');
  const [showWorkoutSummary, setShowWorkoutSummary] = useState(false);
  const [finishedSessionId, setFinishedSessionId] = useState<string | null>(null);
  const [hasJustReset, setHasJustReset] = useState(false);
  const [userHasSelectedWorkout, setUserHasSelectedWorkout] = useState(false);

  // Auto-select the first Push workout on component mount for better UX
  // Only run this when we first load the component and have no workout state
  // Don't run if we've just reset due to discarding changes or if user has manually selected
  useEffect(() => {
    if (childWorkouts.length > 0 && !selectedWorkout && profile?.id && !isWorkoutActiveInline && !showWorkoutSummary && !activeWorkout && !hasJustReset && !userHasSelectedWorkout) {
      console.log('[WorkoutScreen] Auto-selecting workout on mount - conditions met');
      // Find the first Push workout to auto-select
      const pushWorkout = childWorkouts.find(workout =>
        workout.template_name.toLowerCase().includes('push')
      );
      if (pushWorkout) {
        console.log('[WorkoutScreen] Auto-selecting Push workout:', pushWorkout.id);
        setSelectedWorkout(pushWorkout.id);
        // Just select the workout (don't start session yet)
        selectWorkout(pushWorkout.id).then(() => {
          setIsWorkoutActiveInline(true);
          // Scroll to top after workout is loaded
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          }, 100);
        }).catch((error) => {
          console.error('Failed to select workout:', error);
        });
      }
    }
  }, [childWorkouts, selectedWorkout, profile?.id, isWorkoutActiveInline, showWorkoutSummary, activeWorkout, hasJustReset, userHasSelectedWorkout, selectWorkout]);

  // Workouts now run inline in this tab - no redirect needed

  // Reset workout UI state when context is reset (e.g., after discarding changes)
  useEffect(() => {
    if (!activeWorkout && !currentSessionId) {
      console.log('[WorkoutScreen] Resetting workout UI state');
      setIsWorkoutActiveInline(false);
      setSelectedWorkout(null);
      setHasJustReset(true);
      setUserHasSelectedWorkout(false); // Reset user selection flag
      // Clear the reset flag immediately since we're not auto-selecting anymore
      setTimeout(() => {
        console.log('[WorkoutScreen] Clearing hasJustReset flag');
        setHasJustReset(false);
      }, 100);
    }
  }, [activeWorkout, currentSessionId]);

  // Refresh data when tab is focused (only once per focus)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we don't have data yet
      if (!profile) {
        refresh();
      }
    }, [refresh, profile])
  );

  // Load gyms for toggle
  useEffect(() => {
    const loadGyms = async () => {
      if (profile?.id) {
        try {
          const gyms = await getGyms(profile.id);
          setUserGyms(gyms);
        } catch (error) {
          console.error('Error loading gyms:', error);
        }
      }
    };
    loadGyms();
  }, [profile?.id, getGyms]);

  const handleToggleWorkout = (workoutId: string) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId);
      } else {
        newSet.add(workoutId);
      }
      return newSet;
    });
  };

  const handleSelectWorkout = async (workoutId: string) => {
    console.log('[WorkoutScreen] handleSelectWorkout called with:', workoutId, 'current selected:', selectedWorkout);

    // If we're switching to a different workout, reset the current session first
    if (selectedWorkout && selectedWorkout !== workoutId) {
      console.log('[WorkoutScreen] Switching workouts, resetting current session first');
      await resetWorkoutSession();
    }

    const newSelectedWorkout = workoutId === selectedWorkout ? null : workoutId;
    setSelectedWorkout(newSelectedWorkout);

    // Mark that user has manually selected a workout
    setUserHasSelectedWorkout(true);

    // Just select workout when selected (don't start session)
    if (newSelectedWorkout && newSelectedWorkout !== selectedWorkout) {
      try {
        console.log('Selecting workout:', newSelectedWorkout);
        setLoadingExercises(true);
        await selectWorkout(newSelectedWorkout);
        console.log('Workout selected successfully');
        setIsWorkoutActiveInline(true);
      } catch (error) {
        console.error('Failed to select workout:', error);
        Alert.alert('Error', 'Failed to load workout. Please try again.');
        setSelectedWorkout(null);
      } finally {
        setLoadingExercises(false);
      }
    } else if (!newSelectedWorkout) {
      // Deselecting workout - reset state
      setIsWorkoutActiveInline(false);
      setSelectedWorkout(null);
      // Reset workout session when deselecting
      await resetWorkoutSession();
    }
  };

  const handleStartWorkout = async (workoutId: string | null) => {
    try {
      console.log('Starting workout with ID:', workoutId);
      await selectWorkout(workoutId);
      console.log('Workout selected, starting session...');
      // Start the workout session with current timestamp
      await startWorkout(new Date().toISOString());
      console.log('Workout session started, staying inline...');
      // Stay on the same page and show the workout inline
      setIsWorkoutActiveInline(true);
    } catch (error) {
      console.error('Failed to start workout:', error);
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
  };

  // const handleStartWorkoutInline = async (workoutId: string | null) => {
  //   try {
  //     console.log('Starting inline workout with ID:', workoutId);
  //     await selectWorkout(workoutId);
  //     console.log('Workout selected, starting inline session...');
  //     // Start the workout session with current timestamp
  //     await startWorkout(new Date().toISOString());
  //     console.log('Inline workout session started, staying on page...');
  //     // Don't navigate - stay on the same page and show the workout inline
  //     setIsWorkoutActiveInline(true);
  //   } catch (error) {
  //     console.error('Failed to start inline workout:', error);
  //     Alert.alert('Error', 'Failed to start workout. Please try again.');
  //   }
  // };

  const handleInfoPress = (exerciseId: string) => {
    const exercise = exercisesForSession.find(ex => ex.id === exerciseId);
    if (exercise) {
      setSelectedExercise(exercise);
      setInfoModalVisible(true);
    }
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    await removeExerciseFromSession(exerciseId);
  };

  const handleSubstituteExercise = (exerciseId: string) => {
    setCurrentExerciseId(exerciseId);
    setSwapModalVisible(true);
  };

  // const handleExerciseSelected = async (newExercise: any) => {
  //   await substituteExercise(currentExerciseId, newExercise);
  //   setSwapModalVisible(false);
  //   setCurrentExerciseId('');
  // };

  // const handleStartAdHocWorkout = () => {
  //   handleStartWorkout('ad-hoc');
  // };

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Start Workout" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Start Workout" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load workouts</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundRoot />
      <View style={styles.innerContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
        >
          <ScreenHeader
            title="Start Workout"
            style={{
              backgroundColor: 'transparent',
              borderBottomColor: 'transparent',
            }}
          />

          <View style={styles.descriptionContainer}>
            <Text style={[styles.descriptionText, { textAlign: 'center' }]}>
              Select a workout or start an ad-hoc session
            </Text>
          </View>

          {/* Gym Toggle - only show if user has more than one gym */}
          {userGyms.length > 1 && (
            <View style={styles.gymToggleContainer}>
              <GymToggle
                gyms={userGyms}
                activeGym={userGyms.find(g => g.is_active) || null}
                onGymChange={async (gymId, newActiveGym) => {
                  // Handle gym change for workout context
                  try {
                    if (profile?.id) {
                      await setActiveGym(profile.id, gymId);
                      // Update local state
                      setUserGyms(prev => prev.map(g => ({
                        ...g,
                        is_active: g.id === gymId
                      })));
                    }
                  } catch (error) {
                    console.error('Error changing active gym:', error);
                  }
                }}
              />
            </View>
          )}

          {activeTPath && (
            <View style={styles.programHeader}>
              <Dumbbell size={20} color={Colors.foreground} />
              <Text style={[styles.programTitle, { textAlign: 'center' }]}>{activeTPath.template_name}</Text>
            </View>
          )}
        {/* Program Workouts Section */}
        {childWorkouts.length > 0 && (
          <View style={styles.workoutsScroll}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.workoutButtonsContainer, { paddingLeft: -Spacing.lg }]}
            >
              {childWorkouts
                .sort((a, b) => {
                  // Sort by category priority: Push, Pull, Legs (for Push-Pull-Legs programs)
                  // or Upper, Lower (for Upper-Lower programs)
                  const aLower = a.template_name.toLowerCase();
                  const bLower = b.template_name.toLowerCase();
                  const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');

                  if (isUpperLowerSplit) {
                    // Upper-Lower split: Upper first, then Lower
                    if (aLower.includes('upper') && bLower.includes('lower')) return -1;
                    if (aLower.includes('lower') && bLower.includes('upper')) return 1;
                  } else {
                    // Push-Pull-Legs: Push, Pull, Legs order
                    const categoryOrder = { 'push': 1, 'pull': 2, 'legs': 3 };
                    const aCategory = aLower.includes('push') ? 'push' : aLower.includes('pull') ? 'pull' : aLower.includes('legs') ? 'legs' : 'push';
                    const bCategory = bLower.includes('push') ? 'push' : bLower.includes('pull') ? 'pull' : bLower.includes('legs') ? 'legs' : 'push';
                    return categoryOrder[aCategory] - categoryOrder[bCategory];
                  }
                  return 0;
                })
                .map((workout) => {
                  // Determine workout type and category based on name (matching web app logic)
                  const lowerTitle = workout.template_name.toLowerCase();
                  const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');
                  const workoutType: 'push-pull-legs' | 'upper-lower' = isUpperLowerSplit ? 'upper-lower' : 'push-pull-legs';

                  let category: 'push' | 'pull' | 'legs' | 'upper' | 'lower';

                  if (isUpperLowerSplit) {
                    if (lowerTitle.includes('upper')) category = 'upper';
                    else if (lowerTitle.includes('lower')) category = 'lower';
                    else category = 'upper';
                  } else {
                    if (lowerTitle.includes('push')) category = 'push';
                    else if (lowerTitle.includes('pull')) category = 'pull';
                    else if (lowerTitle.includes('legs')) category = 'legs';
                    else category = 'push';
                  }

                  const isSelected = selectedWorkout === workout.id;
                  const completedAt = lastCompletedDates[workout.id] || null;

                  return (
                    <WorkoutPill
                      key={workout.id}
                      id={workout.id}
                      title={workout.template_name}
                      category={category}
                      completedAt={completedAt}
                      isSelected={isSelected}
                      onClick={handleSelectWorkout}
                    />
                  );
                })}
              {/* Ad-hoc Workout Pill */}
              <WorkoutPill
                key="ad-hoc"
                id="ad-hoc"
                title="Ad-hoc"
                category="ad-hoc"
                completedAt={null}
                isSelected={selectedWorkout === 'ad-hoc'}
                onClick={() => {
                  handleSelectWorkout('ad-hoc');
                }}
              />
            </ScrollView>
          </View>
        )}

        {/* Workout Controls - Only show when workout is active */}
        {(isWorkoutActiveInline && selectedWorkout) || loadingExercises ? (
          <View style={styles.contentArea}>
            {loadingExercises ? (
              <View style={styles.loadingExercisesContainer}>
                <Text style={styles.loadingExercisesText}>Loading workout...</Text>
              </View>
            ) : (
              <>
                {/* Workout Title Pill */}
                {selectedWorkout && (
                  <View style={styles.workoutTitleContainer}>
                    <WorkoutPill
                      id={selectedWorkout}
                      title={activeWorkout?.template_name || 'Workout'}
                      category={(() => {
                        const workout = childWorkouts.find(w => w.id === selectedWorkout);
                        if (workout) {
                          const lowerTitle = workout.template_name.toLowerCase();
                          const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');

                          if (isUpperLowerSplit) {
                            if (lowerTitle.includes('upper')) return 'upper';
                            else if (lowerTitle.includes('lower')) return 'lower';
                          } else {
                            if (lowerTitle.includes('push')) return 'push';
                            else if (lowerTitle.includes('pull')) return 'pull';
                            else if (lowerTitle.includes('legs')) return 'legs';
                          }
                        }
                        return 'push';
                      })()}
                      completedAt={null}
                      isSelected={true}
                      onClick={() => {}}
                      hideLastCompleted={true}
                    />
                  </View>
                )}

                {/* Interactive Exercise Cards */}
                {exercisesForSession.length > 0 && (
                  <View style={styles.exercisesList}>
                    {exercisesForSession.map((exercise, index) => {
                      const exerciseSets = exercisesWithSets[exercise.id!] || [];
                      return (
                        <ExerciseCard
                          key={exercise.id!}
                          exercise={{
                            id: exercise.id!,
                            name: exercise.name || 'Unknown Exercise',
                            main_muscle: exercise.main_muscle || 'Unknown',
                            type: exercise.type || 'Unknown',
                            category: exercise.category,
                            description: exercise.description,
                            pro_tip: exercise.pro_tip,
                            video_url: exercise.video_url,
                            equipment: exercise.equipment,
                            user_id: null,
                            library_id: null,
                            created_at: exercise.created_at,
                            is_favorite: null,
                            icon_url: (exercise as any).icon_url || null,
                            is_bonus_exercise: exercise.is_bonus_exercise || false,
                          }}
                          sets={exerciseSets}
                          exerciseNumber={index + 1}
                          accentColor={(() => {
                            // Get the workout category color for the accent
                            const workout = childWorkouts.find(w => w.id === selectedWorkout);
                            if (workout) {
                              const lowerTitle = workout.template_name.toLowerCase();
                              const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');

                              if (isUpperLowerSplit) {
                                if (lowerTitle.includes('upper')) return '#8B5CF6'; // Purple
                                else if (lowerTitle.includes('lower')) return '#EF4444'; // Red
                              } else {
                                if (lowerTitle.includes('push')) return '#3B82F6'; // Blue
                                else if (lowerTitle.includes('pull')) return '#10B981'; // Green
                                else if (lowerTitle.includes('legs')) return '#F59E0B'; // Amber
                              }
                            }
                            return undefined;
                          })()}
                          onInfoPress={() => handleInfoPress(exercise.id!)}
                          onRemoveExercise={() => handleRemoveExercise(exercise.id!)}
                          onSubstituteExercise={() => handleSubstituteExercise(exercise.id!)}
                          onExerciseSaved={(exerciseName, setCount) => {
                            // Exercise saved - toast notification is handled in ExerciseCard
                          }}
                        />
                      );
                    })}
                  </View>
                )}

                <View style={styles.workoutActionButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelWorkoutButton,
                      pressed && styles.cancelWorkoutButtonPressed,
                    ]}
                    onPress={() => {
                      Alert.alert(
                        'Cancel Workout',
                        'Are you sure you want to cancel this workout? All progress will be lost.',
                        [
                          { text: 'Keep Working', style: 'cancel' },
                          {
                            text: 'Cancel Workout',
                            style: 'destructive',
                            onPress: () => {
                              // Reset workout state without saving
                              setIsWorkoutActiveInline(false);
                              setSelectedWorkout(null);
                            }
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.cancelWorkoutText}>Cancel Workout</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelWorkoutButton, // Use same style as cancel button for consistency
                      { backgroundColor: Colors.primary }, // Override background color
                      pressed && styles.cancelWorkoutButtonPressed,
                    ]}
                    onPress={async () => {
                      const sessionId = await finishWorkout();
                      if (sessionId) {
                        console.log('Workout finished, showing summary modal for session:', sessionId);
                        setFinishedSessionId(sessionId);
                        setShowWorkoutSummary(true);
                      } else {
                        console.log('Workout finish failed - no sessionId returned');
                      }
                    }}
                  >
                    <Text style={[styles.cancelWorkoutText, { color: Colors.white }]}>Finish Workout</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ) : null}

        {/* Ad-hoc Workouts Section */}
        {adhocWorkouts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Ad-hoc Workouts</Text>
            </View>
            {adhocWorkouts.map((workout) => {
              const exercises = workoutExercisesCache[workout.id] || [];
              const isExpanded = expandedWorkouts.has(workout.id);

              return (
                <WorkoutItem
                  key={workout.id}
                  workout={workout}
                  exercises={exercises}
                  isExpanded={isExpanded}
                  onToggle={() => handleToggleWorkout(workout.id)}
                  onStartWorkout={() => handleStartWorkout(workout.id)}
                />
              );
            })}
          </>
        )}

        {/* Empty State */}
        {childWorkouts.length === 0 && adhocWorkouts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No workouts available</Text>
            <Text style={styles.emptySubtext}>
              Create your first workout program to get started
            </Text>
          </View>
        )}


        </ScrollView>
      {/* Modals */}
        <ExerciseInfoModal
          exercise={selectedExercise}
          visible={infoModalVisible}
          onClose={() => {
            setInfoModalVisible(false);
            setSelectedExercise(null);
          }}
        />

        <ExerciseSwapModal
          visible={swapModalVisible}
          onClose={() => {
            setSwapModalVisible(false);
            setCurrentExerciseId('');
          }}
          onSelectExercise={async (newExercise) => {
            if (currentExerciseId) {
              await substituteExercise(currentExerciseId, newExercise);
            }
            setSwapModalVisible(false);
            setCurrentExerciseId('');
          }}
          currentExerciseId={currentExerciseId}
        />

        {/* Workout Progress Bar - Only show after user has saved at least one exercise */}
        {completedExercises.size > 0 && (
          <WorkoutProgressBar
            exercisesForSession={exercisesForSession}
            completedExercises={completedExercises}
            isWorkoutSessionStarted={!!currentSessionId}
            activeWorkout={activeWorkout}
          />
        )}

        {/* Workout Summary Modal */}
        <WorkoutSummaryModal
          visible={showWorkoutSummary}
          sessionId={finishedSessionId}
          onClose={() => {
            setShowWorkoutSummary(false);
            // Reset workout state when modal is closed via X button
            resetWorkoutSession();
            setIsWorkoutActiveInline(false);
            setSelectedWorkout(null);
            setFinishedSessionId(null);
            // Scroll to top after reset
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }, 100);
          }}
          onDone={() => {
            setShowWorkoutSummary(false);
            // Reset workout state and navigate back to dashboard
            resetWorkoutSession();
            // Reset local state to show workout selector again
            setIsWorkoutActiveInline(false);
            setSelectedWorkout(null);
            setFinishedSessionId(null);
            router.replace('/(tabs)/dashboard');
          }}
          onStartAnother={() => {
            setShowWorkoutSummary(false);
            // Reset workout state and stay on workout tab
            resetWorkoutSession();
            // Reset local state to show workout selector again
            setIsWorkoutActiveInline(false);
            setSelectedWorkout(null);
            setFinishedSessionId(null);
            // Scroll to top after reset
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }, 100);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    ...TextStyles.h3,
    color: Colors.destructive,
    marginBottom: Spacing.sm,
  },
  errorSubtext: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  programTitle: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  sectionTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 120, // Add padding at bottom so buttons are visible when scrolled to bottom
  },
  workoutItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  workoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutName: {
    ...TextStyles.h4,
    color: Colors.foreground,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  exerciseCount: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  exercisesContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.lg,
  },
  exercisePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '500',
  },
  exerciseMuscle: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  exerciseTarget: {
    alignItems: 'flex-end',
  },
  targetText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'right',
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    minHeight: 48, // Ensure consistent height
  },
  startWorkoutButtonPressed: {
    backgroundColor: Colors.primary,
    opacity: 0.8,
  },
  startWorkoutText: {
    ...TextStyles.button,
    color: Colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 280,
  },
  adHocContainer: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  adHocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  adHocButtonPressed: {
    backgroundColor: Colors.muted,
  },
  adHocButtonText: {
    ...TextStyles.button,
    color: Colors.foreground,
    fontWeight: '600',
  },
  descriptionContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  descriptionText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  gymToggleContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  workoutButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingLeft: 0,
    paddingRight: Spacing.xl * 3,
    paddingVertical: Spacing.sm,
  },
  workoutButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  workoutButtonSelected: {
    opacity: 0.8,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  workoutButtonPressed: {
    opacity: 0.7,
  },
  workoutButtonText: {
    ...TextStyles.button,
    color: Colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedWorkoutContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedWorkoutTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  contentArea: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginHorizontal: Spacing.sm,
    marginTop: 0,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contentTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  workoutListContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  exerciseCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  exerciseHeader: {
    padding: Spacing.lg,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.lg,
  },
  setHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  headerText: {
    ...TextStyles.captionMedium,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  setColumn: {
    width: 30,
  },
  prevColumn: {
    flex: 1,
  },
  weightColumn: {
    width: 80,
  },
  repsColumn: {
    width: 60,
  },
  doneColumn: {
    width: 32,
    marginLeft: Spacing.sm,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  addSetButtonPressed: {
    backgroundColor: Colors.muted,
  },
  addSetText: {
    ...TextStyles.buttonSmall,
    color: Colors.primary,
  },
  exercisesList: {
    paddingBottom: Spacing.xl,
  },
  workoutControls: {
    marginTop: Spacing.lg,
  },
  startWorkoutContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  workoutActionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  cancelWorkoutButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mutedForeground,
    backgroundColor: Colors.secondary,
    minHeight: 48, // Ensure consistent height
  },
  cancelWorkoutButtonPressed: {
    backgroundColor: Colors.muted,
  },
  cancelWorkoutText: {
    ...TextStyles.button,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
  workoutsScroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 0,
  },
  noExercisesText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  workoutTitleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  loadingExercisesContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingExercisesText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
