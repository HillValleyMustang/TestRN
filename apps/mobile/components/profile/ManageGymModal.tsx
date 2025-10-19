import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  FlatList,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../app/_contexts/auth-context';
import { useData } from '../../app/_contexts/data-context';
import { getExerciseById } from '@data/exercises';
import { supabase, fetchExerciseDefinitions, type FetchedExerciseDefinition } from '../../app/_lib/supabase';
import ExerciseInfoSheet from '../workout/ExerciseInfoSheet';

const { width } = Dimensions.get('window');

interface ManageGymModalProps {
  visible: boolean;
  onClose: () => void;
  gym: {
    id: string;
    name: string;
    user_id: string;
  } | null;
}

interface WorkoutWithExercises {
  id: string;
  template_name: string;
  exercises: Array<{
    id: string;
    exercise_id: string;
    order_index: number;
    is_bonus_exercise: boolean;
    exercise_name: string;
    muscle_group?: string;
    exerciseDefinition?: FetchedExerciseDefinition;
  }>;
}

export function ManageGymModal({ visible, onClose, gym }: ManageGymModalProps) {
  console.log('🏠 ManageGymModal RENDERED with:', { visible, gym });

  const { userId } = useAuth();
  const { getTPaths, getTPathExercises } = useData();

  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<FetchedExerciseDefinition | null>(null);

  const loadGymWorkouts = useCallback(async () => {
    if (!gym || !userId) {
      console.log('ManageGymModal: Missing gym or userId', { gym: !!gym, userId });
      return;
    }

    console.log('ManageGymModal: Starting loadGymWorkouts for gym:', gym.name);
    setLoading(true);

    try {
      // Get T-Paths for this user
      console.log('ManageGymModal: Fetching T-Paths...');
      const tPaths = await getTPaths(userId);
      console.log('ManageGymModal: T-Paths data:', tPaths);

      // For now, show all T-Paths (we'll enhance gym association later)
      const gymTPaths = tPaths.filter(tp => tp.is_main_program);
      console.log('ManageGymModal: Main program T-Paths:', gymTPaths);

      if (gymTPaths.length === 0) {
        console.log('ManageGymModal: No main program T-Paths found');
        setWorkouts([]);
        setLoading(false);
        return;
      }

      // Load exercises for each T-Path
      const workoutsWithExercises: WorkoutWithExercises[] = [];
      console.log('ManageGymModal: Loading exercises for', gymTPaths.length, 'T-Paths');

      for (const tPath of gymTPaths) {
        console.log('ManageGymModal: Loading exercises for T-Path:', tPath.template_name);
        const exercises = await getTPathExercises(tPath.id);
        console.log('ManageGymModal: Exercises for', tPath.template_name, ':', exercises);

        // Collect all exercise IDs to fetch from Supabase
        const exerciseIds = exercises.map(ex => ex.exercise_id);
        console.log('ManageGymModal: Fetching exercise definitions for IDs:', exerciseIds);

        // Fetch exercise definitions from Supabase
        const exerciseDefinitions = await fetchExerciseDefinitions(exerciseIds);
        console.log('ManageGymModal: Fetched exercise definitions:', exerciseDefinitions);

        // Create a map for quick lookup
        const exerciseDefMap = new Map(exerciseDefinitions.map(def => [def.id, def]));

        const exercisesWithDetails = exercises.map(exercise => {
          const exerciseDef = exerciseDefMap.get(exercise.exercise_id);
          const result = {
            id: exercise.id,
            exercise_id: exercise.exercise_id,
            order_index: exercise.order_index,
            is_bonus_exercise: exercise.is_bonus_exercise,
            exercise_name: exerciseDef?.name || 'Unknown Exercise',
            muscle_group: exerciseDef?.main_muscle || undefined,
            exerciseDefinition: exerciseDef || undefined,
          };
          console.log('ManageGymModal: Processed exercise:', result);
          return result;
        });

        workoutsWithExercises.push({
          id: tPath.id,
          template_name: tPath.template_name,
          exercises: exercisesWithDetails.sort((a, b) => a.order_index - b.order_index),
        });
      }

      console.log('ManageGymModal: Final workouts with exercises:', workoutsWithExercises);
      setWorkouts(workoutsWithExercises);

      // Auto-select first workout if available
      if (workoutsWithExercises.length > 0 && !selectedWorkoutId) {
        console.log('ManageGymModal: Auto-selecting first workout:', workoutsWithExercises[0].template_name);
        setSelectedWorkoutId(workoutsWithExercises[0].id);
      }
    } catch (error) {
      console.error('ManageGymModal: Error loading gym workouts:', error);
      Alert.alert('Error', 'Failed to load gym workouts');
    } finally {
      setLoading(false);
    }
  }, [gym, userId, getTPaths, getTPathExercises]);

  useEffect(() => {
    if (visible && gym) {
      loadGymWorkouts();
    } else {
      setWorkouts([]);
      setSelectedWorkoutId(null);
      setHasUnsavedChanges(false);
    }
  }, [visible, gym]);

  const selectedWorkout = workouts.find(w => w.id === selectedWorkoutId);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const renderWorkoutSelector = () => {
    if (workouts.length === 0) {
      return (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Ionicons name="construct" size={48} color={Colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No Workout Program</Text>
            <Text style={styles.emptyText}>
              This gym doesn't have an active workout program yet. Create a program first to manage exercises.
            </Text>
          </View>
        </Card>
      );
    }

    return (
      <Card style={styles.workoutSelector}>
        <Text style={styles.sectionTitle}>Select Workout</Text>
        <View style={styles.workoutTabs}>
          {workouts.map((workout) => (
            <Pressable
              key={workout.id}
              style={[
                styles.workoutTab,
                selectedWorkoutId === workout.id && styles.workoutTabSelected,
              ]}
              onPress={() => setSelectedWorkoutId(workout.id)}
            >
              <Text style={[
                styles.workoutTabText,
                selectedWorkoutId === workout.id && styles.workoutTabTextSelected,
              ]}>
                {workout.template_name}
              </Text>
              <Text style={[
                styles.workoutCount,
                selectedWorkoutId === workout.id && styles.workoutCountSelected,
              ]}>
                {workout.exercises.length} exercises
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
    );
  };

  const renderExerciseList = () => {
    console.log('ManageGymModal: renderExerciseList called');
    console.log('ManageGymModal: selectedWorkout:', selectedWorkout);

    if (!selectedWorkout) {
      console.log('ManageGymModal: No selectedWorkout');
      return null;
    }

    const coreExercises = selectedWorkout.exercises.filter(ex => !ex.is_bonus_exercise);
    const bonusExercises = selectedWorkout.exercises.filter(ex => ex.is_bonus_exercise);

    console.log('ManageGymModal: Core exercises count:', coreExercises.length);
    console.log('ManageGymModal: Bonus exercises count:', bonusExercises.length);
    console.log('ManageGymModal: Core exercises:', coreExercises);
    console.log('ManageGymModal: Bonus exercises:', bonusExercises);

    return (
      <View style={styles.exerciseContainer}>
        {/* Core Exercises */}
        {coreExercises.length > 0 && (
          <Text style={styles.sectionTitle}>Core Exercises</Text>
        )}
        <Card style={styles.exerciseSection}>
          {coreExercises.length === 0 ? (
            <Text style={styles.emptyExerciseText}>No core exercises</Text>
          ) : (
            <View style={styles.exerciseList}>
              {coreExercises.map((exercise, index) => {
                console.log('ManageGymModal: Rendering core exercise:', exercise.exercise_name);
                return (
                  <View key={exercise.id} style={styles.exerciseItem}>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName} numberOfLines={2}>{exercise.exercise_name}</Text>
                      {exercise.muscle_group && (
                        <Text style={styles.exerciseMuscle}>{exercise.muscle_group}</Text>
                      )}
                    </View>
                    <View style={styles.exerciseActions}>
                       <Text style={styles.orderBadge}>{index + 1}</Text>
                       <Pressable
                          style={styles.actionIcon}
                          onPress={() => setSelectedExerciseForInfo(exercise.exerciseDefinition || null)}
                        >
                          <View style={styles.infoIconContainer}>
                            <Ionicons name="information-circle-outline" size={18} color="#666666" />
                          </View>
                        </Pressable>
                      </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Bonus Exercises */}
        {bonusExercises.length > 0 && (
          <Text style={styles.sectionTitle}>Bonus Exercises</Text>
        )}
        <Card style={styles.exerciseSection}>
          {bonusExercises.length === 0 ? (
            <Text style={styles.emptyExerciseText}>No bonus exercises</Text>
          ) : (
            <View style={styles.exerciseList}>
              {bonusExercises.map((exercise, index) => {
                console.log('ManageGymModal: Rendering bonus exercise:', exercise.exercise_name);
                return (
                  <View key={exercise.id} style={styles.exerciseItem}>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName} numberOfLines={2}>{exercise.exercise_name}</Text>
                      {exercise.muscle_group && (
                        <Text style={styles.exerciseMuscle}>{exercise.muscle_group}</Text>
                      )}
                    </View>
                    <View style={styles.exerciseActions}>
                       <Text style={styles.orderBadge}>{index + 1}</Text>
                       <Pressable
                          style={styles.actionIcon}
                          onPress={() => setSelectedExerciseForInfo(exercise.exerciseDefinition || null)}
                        >
                          <View style={styles.infoIconContainer}>
                            <Ionicons name="information-circle-outline" size={18} color="#666666" />
                          </View>
                        </Pressable>
                      </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </View>
    );
  };

  if (!gym) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <View style={styles.modalContainer}>
          <Pressable onPress={(e: any) => e.stopPropagation()} style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Manage Workouts</Text>
              <Text style={styles.subtitle}>{gym.name}</Text>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </Pressable>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading workouts...</Text>
                </View>
              ) : (
                <>
                  {renderWorkoutSelector()}
                  {renderExerciseList()}
                </>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Button
                onPress={handleClose}
                style={styles.closeModalButton}
              >
                Close
              </Button>
            </View>
          </Pressable>
        </View>
      </Pressable>

      {/* Exercise Info Sheet */}
      <ExerciseInfoSheet
        visible={!!selectedExerciseForInfo}
        onClose={() => setSelectedExerciseForInfo(null)}
        exercise={selectedExerciseForInfo}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay, // Global modal overlay setting
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxWidth: 600,
    maxHeight: '75%',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    flex: 1,
    margin: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    maxHeight: '75%',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: Spacing.lg,
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.mutedForeground,
  },
  emptyCard: {
    marginBottom: Spacing.lg,
  },
  emptyContent: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  workoutSelector: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  workoutTabs: {
    gap: Spacing.md,
  },
  workoutTab: {
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workoutTabSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  workoutTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.foreground,
  },
  workoutTabTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  workoutCount: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  workoutCountSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  exerciseContainer: {
    gap: Spacing.lg,
  },
  exerciseSection: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.md,
  },
  exerciseList: {
    gap: Spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    color: Colors.foreground,
    flex: 1,
  },
  exerciseMuscle: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  orderBadge: {
    backgroundColor: Colors.primary,
    color: Colors.primaryForeground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  actionIcon: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.mutedForeground,
    backgroundColor: Colors.background,
  },
  infoIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.foreground,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyExerciseText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    padding: Spacing.lg,
    fontStyle: 'italic',
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  closeModalButton: {
    width: '100%',
  },
});