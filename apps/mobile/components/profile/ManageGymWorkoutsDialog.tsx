/**
 * Manage Gym Workouts Dialog
 * Shows workout selector and exercise list management for a specific gym
 * Supports core/bonus exercises with drag/reorder, delete, and info
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useAuth } from '../../app/_contexts/auth-context';

interface Exercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  order_index: number;
  is_bonus_exercise: boolean;
}

interface Workout {
  id: string;
  template_name: string;
}

interface ManageGymWorkoutsDialogProps {
  visible: boolean;
  gymId: string;
  gymName: string;
  onClose: () => void;
}

export function ManageGymWorkoutsDialog({
  visible,
  gymId,
  gymName,
  onClose,
}: ManageGymWorkoutsDialogProps) {
  const { supabase } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>('');
  const [coreExercises, setCoreExercises] = useState<Exercise[]>([]);
  const [bonusExercises, setBonusExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset state when opening or gym changes
      setSelectedWorkoutId('');
      setCoreExercises([]);
      setBonusExercises([]);
      setWorkouts([]);
      loadWorkouts();
    } else {
      // Reset state when closing
      setSelectedWorkoutId('');
      setCoreExercises([]);
      setBonusExercises([]);
      setWorkouts([]);
    }
  }, [visible, gymId]);

  useEffect(() => {
    if (selectedWorkoutId) {
      loadExercises();
    } else {
      setCoreExercises([]);
      setBonusExercises([]);
    }
  }, [selectedWorkoutId]);

  const loadWorkouts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('t_paths')
        .select('id, template_name')
        .eq('gym_id', gymId)
        .order('template_name');

      if (error) throw error;

      setWorkouts(data || []);
      if (data && data.length > 0 && !selectedWorkoutId) {
        setSelectedWorkoutId(data[0].id);
      }
    } catch (error) {
      console.error('[ManageGymWorkouts] Error loading workouts:', error);
      Alert.alert('Error', 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  };

  const loadExercises = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('t_path_exercises')
        .select(`
          id,
          exercise_id,
          order_index,
          is_bonus_exercise,
          exercises (
            name
          )
        `)
        .eq('template_id', selectedWorkoutId)
        .order('order_index');

      if (error) throw error;

      const formattedExercises = (data || []).map((ex: any) => ({
        id: ex.id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercises?.name || 'Unknown Exercise',
        order_index: ex.order_index,
        is_bonus_exercise: ex.is_bonus_exercise,
      }));

      const core = formattedExercises.filter((ex) => !ex.is_bonus_exercise);
      const bonus = formattedExercises.filter((ex) => ex.is_bonus_exercise);

      setCoreExercises(core);
      setBonusExercises(bonus);
    } catch (error) {
      console.error('[ManageGymWorkouts] Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExercise = (exerciseId: string) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to remove this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('t_path_exercises')
                .delete()
                .eq('id', exerciseId);

              if (error) throw error;

              await loadExercises();
            } catch (error) {
              console.error('[ManageGymWorkouts] Error deleting exercise:', error);
              Alert.alert('Error', 'Failed to delete exercise');
            }
          },
        },
      ]
    );
  };

  const handleExerciseInfo = (exercise: Exercise) => {
    Alert.alert(
      exercise.exercise_name,
      `Order: ${exercise.order_index}\nType: ${exercise.is_bonus_exercise ? 'Bonus' : 'Core'}`,
      [{ text: 'OK' }]
    );
  };

  const handleCoreReorder = async (data: Exercise[]) => {
    setCoreExercises(data);
    await saveOrder(data, false);
  };

  const handleBonusReorder = async (data: Exercise[]) => {
    setBonusExercises(data);
    await saveOrder(data, true);
  };

  const saveOrder = async (exercises: Exercise[], isBonus: boolean) => {
    setIsSaving(true);
    try {
      // Update order_index for each exercise
      const updates = exercises.map((exercise, index) => ({
        id: exercise.id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('t_path_exercises')
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('[ManageGymWorkouts] Error saving order:', error);
      Alert.alert('Error', 'Failed to save exercise order');
      // Reload to restore original order
      await loadExercises();
    } finally {
      setIsSaving(false);
    }
  };

  const renderExerciseItem = ({ item, drag, isActive }: RenderItemParams<Exercise>) => {
    return (
      <ScaleDecorator>
        <View style={[styles.exerciseCard, isActive && styles.exerciseCardActive]}>
          <TouchableOpacity
            onLongPress={drag}
            disabled={isActive || isSaving}
            style={styles.dragHandle}
          >
            <Ionicons name="reorder-three" size={24} color={Colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={styles.exerciseName}>{item.exercise_name}</Text>
          <View style={styles.exerciseActions}>
            <TouchableOpacity
              onPress={() => handleExerciseInfo(item)}
              style={styles.actionButton}
              disabled={isSaving}
            >
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteExercise(item.id)}
              style={styles.actionButton}
              disabled={isSaving}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      </ScaleDecorator>
    );
  };

  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Manage Workouts</Text>
                <Text style={styles.subtitle}>{gymName}</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Workout Selector */}
            <TouchableOpacity
              style={styles.workoutSelector}
              onPress={() => setShowWorkoutPicker(true)}
              disabled={isSaving}
            >
              <View style={styles.selectorContent}>
                <Ionicons name="barbell-outline" size={20} color={Colors.primary} />
                <Text style={styles.selectedWorkout}>
                  {selectedWorkout?.template_name || 'Select Workout'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.mutedForeground} />
            </TouchableOpacity>

            {/* Saving Indicator */}
            {isSaving && (
              <View style={styles.savingBanner}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.savingText}>Saving order...</Text>
              </View>
            )}

            {/* Exercise Lists */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : workouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="barbell-outline" size={48} color={Colors.mutedForeground} />
                <Text style={styles.emptyText}>No workouts found for this gym</Text>
                <Text style={styles.emptySubtext}>
                  Create a workout program first to manage exercises
                </Text>
              </View>
            ) : !selectedWorkoutId ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Select a workout to view exercises</Text>
              </View>
            ) : (
              <ScrollView style={styles.exerciseList}>
                {/* Core Exercises */}
                {coreExercises.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Core Exercises</Text>
                    <Text style={styles.sectionHint}>Long press to drag and reorder</Text>
                    <DraggableFlatList
                      data={coreExercises}
                      onDragEnd={({ data }) => handleCoreReorder(data)}
                      keyExtractor={(item) => item.id}
                      renderItem={renderExerciseItem}
                      containerStyle={styles.dragList}
                    />
                  </View>
                )}

                {/* Bonus Exercises */}
                {bonusExercises.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bonus Exercises</Text>
                    <Text style={styles.sectionHint}>Long press to drag and reorder</Text>
                    <DraggableFlatList
                      data={bonusExercises}
                      onDragEnd={({ data }) => handleBonusReorder(data)}
                      keyExtractor={(item) => item.id}
                      renderItem={(params) => (
                        <ScaleDecorator>
                          <View
                            style={[
                              styles.exerciseCard,
                              styles.bonusCard,
                              params.isActive && styles.exerciseCardActive,
                            ]}
                          >
                            <TouchableOpacity
                              onLongPress={params.drag}
                              disabled={params.isActive || isSaving}
                              style={styles.dragHandle}
                            >
                              <Ionicons
                                name="reorder-three"
                                size={24}
                                color={Colors.mutedForeground}
                              />
                            </TouchableOpacity>
                            <Text style={styles.exerciseName}>{params.item.exercise_name}</Text>
                            <View style={styles.exerciseActions}>
                              <TouchableOpacity
                                onPress={() => handleExerciseInfo(params.item)}
                                style={styles.actionButton}
                                disabled={isSaving}
                              >
                                <Ionicons
                                  name="information-circle-outline"
                                  size={20}
                                  color={Colors.primary}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleDeleteExercise(params.item.id)}
                                style={styles.actionButton}
                                disabled={isSaving}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={20}
                                  color={Colors.destructive}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </ScaleDecorator>
                      )}
                      containerStyle={styles.dragList}
                    />
                  </View>
                )}

                {coreExercises.length === 0 && bonusExercises.length === 0 && selectedWorkoutId && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No exercises in this workout</Text>
                    <Text style={styles.emptySubtext}>Add exercises to get started</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>

          {/* Workout Picker Modal */}
          {showWorkoutPicker && (
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerTitle}>Select Workout</Text>
                <ScrollView style={styles.pickerList}>
                  {workouts.map((workout) => (
                    <TouchableOpacity
                      key={workout.id}
                      style={[
                        styles.pickerItem,
                        selectedWorkoutId === workout.id && styles.pickerItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedWorkoutId(workout.id);
                        setShowWorkoutPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedWorkoutId === workout.id && styles.pickerItemTextSelected,
                        ]}
                      >
                        {workout.template_name}
                      </Text>
                      {selectedWorkoutId === workout.id && (
                        <Ionicons name="checkmark" size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.pickerCloseButton}
                  onPress={() => setShowWorkoutPicker(false)}
                >
                  <Text style={styles.pickerCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  workoutSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectedWorkout: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.foreground,
  },
  savingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.sm,
  },
  savingText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  exerciseList: {
    flex: 1,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginBottom: Spacing.md,
  },
  dragList: {
    gap: Spacing.sm,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseCardActive: {
    backgroundColor: Colors.muted,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bonusCard: {
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  dragHandle: {
    paddingRight: Spacing.sm,
  },
  exerciseName: {
    fontSize: 14,
    color: Colors.foreground,
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.foreground,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    width: '80%',
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemSelected: {
    backgroundColor: Colors.muted,
  },
  pickerItemText: {
    fontSize: 16,
    color: Colors.foreground,
  },
  pickerItemTextSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
  pickerCloseButton: {
    padding: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pickerCloseText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
});
