/**
 * Manage Gym Workouts Dialog
 * Allows users to select a workout and add, remove, or reorder exercises
 * Design reference: profile s8 image
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
  const [originalCoreExercises, setOriginalCoreExercises] = useState<Exercise[]>([]);
  const [originalBonusExercises, setOriginalBonusExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [selectedExerciseType, setSelectedExerciseType] = useState<'core' | 'bonus'>('core');

  useEffect(() => {
    if (visible) {
      setSelectedWorkoutId('');
      setCoreExercises([]);
      setBonusExercises([]);
      setOriginalCoreExercises([]);
      setOriginalBonusExercises([]);
      setWorkouts([]);
      setHasChanges(false);
      loadWorkouts();
    }
  }, [visible, gymId]);

  useEffect(() => {
    if (selectedWorkoutId) {
      loadExercises();
    } else {
      setCoreExercises([]);
      setBonusExercises([]);
      setOriginalCoreExercises([]);
      setOriginalBonusExercises([]);
      setHasChanges(false);
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
      if (data && data.length > 0) {
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
    setHasChanges(false);
    try {
      const { data, error } = await supabase
        .from('t_path_exercises')
        .select(`
          id,
          exercise_id,
          order_index,
          is_bonus_exercise,
          exercise_definitions (
            name
          )
        `)
        .eq('template_id', selectedWorkoutId)
        .order('order_index');

      if (error) throw error;

      const formattedExercises = (data || []).map((ex: any) => ({
        id: ex.id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_definitions?.name || 'Unknown Exercise',
        order_index: ex.order_index,
        is_bonus_exercise: ex.is_bonus_exercise,
      }));

      const core = formattedExercises.filter((ex) => !ex.is_bonus_exercise);
      const bonus = formattedExercises.filter((ex) => ex.is_bonus_exercise);

      setCoreExercises(core);
      setBonusExercises(bonus);
      setOriginalCoreExercises(core);
      setOriginalBonusExercises(bonus);
    } catch (error) {
      console.error('[ManageGymWorkouts] Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableExercises = async () => {
    try {
      const { data: gymExercises, error } = await supabase
        .from('gym_exercises')
        .select(`
          exercise_id,
          exercise_definitions (
            id,
            name,
            category
          )
        `)
        .eq('gym_id', gymId);

      if (error) throw error;

      const exercises = (gymExercises || [])
        .map((ge: any) => ge.exercise_definitions)
        .filter(Boolean);

      setAvailableExercises(exercises);
    } catch (error) {
      console.error('[ManageGymWorkouts] Error loading available exercises:', error);
      Alert.alert('Error', 'Failed to load available exercises');
    }
  };

  const handleOpenExercisePicker = (type: 'core' | 'bonus') => {
    setSelectedExerciseType(type);
    loadAvailableExercises();
    setShowExercisePicker(true);
  };

  const handleAddExercise = async (exerciseId: string, exerciseName: string) => {
    const newExercise: Exercise = {
      id: `temp-${Date.now()}`,
      exercise_id: exerciseId,
      exercise_name: exerciseName,
      order_index: selectedExerciseType === 'core' ? coreExercises.length : bonusExercises.length,
      is_bonus_exercise: selectedExerciseType === 'bonus',
    };

    if (selectedExerciseType === 'core') {
      setCoreExercises([...coreExercises, newExercise]);
    } else {
      setBonusExercises([...bonusExercises, newExercise]);
    }

    setHasChanges(true);
    setShowExercisePicker(false);
  };

  const moveExercise = (index: number, direction: 'up' | 'down', isBonus: boolean) => {
    const exercises = isBonus ? [...bonusExercises] : [...coreExercises];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= exercises.length) return;

    const temp = exercises[index];
    exercises[index] = exercises[newIndex];
    exercises[newIndex] = temp;

    if (isBonus) {
      setBonusExercises(exercises);
    } else {
      setCoreExercises(exercises);
    }
    setHasChanges(true);
  };

  const handleDeleteExercise = (exerciseId: string, exerciseName: string, isBonus: boolean) => {
    Alert.alert(
      'Remove Exercise',
      `Remove "${exerciseName}" from this workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (isBonus) {
              setBonusExercises(bonusExercises.filter(ex => ex.id !== exerciseId));
            } else {
              setCoreExercises(coreExercises.filter(ex => ex.id !== exerciseId));
            }
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const handleExerciseInfo = (exercise: Exercise) => {
    Alert.alert(
      exercise.exercise_name,
      `Type: ${exercise.is_bonus_exercise ? 'Bonus Exercise' : 'Core Exercise'}\nOrder: ${exercise.order_index + 1}`,
      [{ text: 'OK' }]
    );
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const allOriginal = [...originalCoreExercises, ...originalBonusExercises];
      
      // Recalculate order_index for all current exercises
      const updatedCoreExercises = coreExercises.map((ex, index) => ({
        ...ex,
        order_index: index,
      }));
      const updatedBonusExercises = bonusExercises.map((ex, index) => ({
        ...ex,
        order_index: index,
      }));
      const allCurrent = [...updatedCoreExercises, ...updatedBonusExercises];

      // Delete removed exercises
      const removedIds = allOriginal
        .filter(orig => !allCurrent.find(curr => curr.id === orig.id))
        .map(ex => ex.id);

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('t_path_exercises')
          .delete()
          .in('id', removedIds);

        if (deleteError) throw deleteError;
      }

      // Add new exercises (temp IDs) with correct order_index
      const newExercises = allCurrent.filter(ex => ex.id.startsWith('temp-'));
      if (newExercises.length > 0) {
        const inserts = newExercises.map(ex => ({
          template_id: selectedWorkoutId,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          is_bonus_exercise: ex.is_bonus_exercise,
        }));

        const { error: insertError } = await supabase
          .from('t_path_exercises')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      // Update order for existing exercises with recalculated order_index
      const existingExercises = allCurrent.filter(ex => !ex.id.startsWith('temp-'));
      for (const exercise of existingExercises) {
        const { error } = await supabase
          .from('t_path_exercises')
          .update({ order_index: exercise.order_index })
          .eq('id', exercise.id);

        if (error) throw error;
      }

      Alert.alert('Success', 'Changes saved successfully');
      setHasChanges(false);
      await loadExercises();
    } catch (error) {
      console.error('[ManageGymWorkouts] Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const renderExercise = (exercise: Exercise, index: number, isBonus: boolean, total: number) => {
    return (
      <View key={exercise.id} style={styles.exerciseItem}>
        {/* Drag Handle */}
        <TouchableOpacity
          style={styles.dragHandle}
          onPress={() => {
            Alert.alert(
              'Reorder',
              `Move "${exercise.exercise_name}"`,
              [
                { text: 'Cancel', style: 'cancel' },
                index > 0 && { text: 'Move Up', onPress: () => moveExercise(index, 'up', isBonus) },
                index < total - 1 && { text: 'Move Down', onPress: () => moveExercise(index, 'down', isBonus) },
              ].filter(Boolean) as any
            );
          }}
        >
          <Ionicons name="reorder-three-outline" size={24} color={Colors.mutedForeground} />
        </TouchableOpacity>

        {/* Exercise Name */}
        <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>

        {/* Info Button */}
        <TouchableOpacity
          onPress={() => handleExerciseInfo(exercise)}
          style={styles.iconButton}
        >
          <Ionicons name="information-circle-outline" size={24} color={Colors.mutedForeground} />
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          onPress={() => handleDeleteExercise(exercise.id, exercise.exercise_name, isBonus)}
          style={styles.iconButton}
        >
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <Ionicons name="barbell-outline" size={24} color={Colors.foreground} />
                <Text style={styles.title}>Manage Workouts for "{gymName}"</Text>
              </View>
              <Text style={styles.subtitle}>
                Select a workout to add, remove, or reorder exercises.
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeIcon}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Workout Dropdown */}
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowWorkoutPicker(true)}
            disabled={loading || isSaving}
          >
            <Text style={styles.dropdownText}>
              {selectedWorkout?.template_name || 'Select Workout'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.mutedForeground} />
          </TouchableOpacity>

          {/* Add Exercises Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              Alert.alert(
                'Add Exercise',
                'Choose exercise type:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Core Exercise', onPress: () => handleOpenExercisePicker('core') },
                  { text: 'Bonus Exercise', onPress: () => handleOpenExercisePicker('bonus') },
                ]
              );
            }}
            disabled={!selectedWorkoutId || loading || isSaving}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Exercises</Text>
          </TouchableOpacity>

          {/* Exercise Lists */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.foreground} />
            </View>
          ) : (
            <ScrollView style={styles.exerciseList} showsVerticalScrollIndicator={false}>
              {/* Core Exercises */}
              {coreExercises.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Core Exercises</Text>
                  {coreExercises.map((exercise, index) =>
                    renderExercise(exercise, index, false, coreExercises.length)
                  )}
                </View>
              )}

              {/* Bonus Exercises */}
              {bonusExercises.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Bonus Exercises</Text>
                  {bonusExercises.map((exercise, index) =>
                    renderExercise(exercise, index, true, bonusExercises.length)
                  )}
                </View>
              )}

              {coreExercises.length === 0 && bonusExercises.length === 0 && selectedWorkoutId && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No exercises in this workout</Text>
                  <Text style={styles.emptySubtext}>Tap "Add Exercises" to get started</Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSaving}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
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
                      <Ionicons name="checkmark" size={20} color={Colors.foreground} />
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

        {/* Exercise Picker Modal */}
        {showExercisePicker && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>
                Add {selectedExerciseType === 'core' ? 'Core' : 'Bonus'} Exercise
              </Text>
              <ScrollView style={styles.pickerList}>
                {availableExercises.length === 0 ? (
                  <View style={styles.emptyPickerState}>
                    <Text style={styles.emptyText}>No exercises available</Text>
                    <Text style={styles.emptySubtext}>
                      Make sure your gym has exercises set up
                    </Text>
                  </View>
                ) : (
                  availableExercises.map((exercise) => {
                    const alreadyAdded = [...coreExercises, ...bonusExercises].some(
                      ex => ex.exercise_id === exercise.id
                    );
                    
                    return (
                      <TouchableOpacity
                        key={exercise.id}
                        style={[
                          styles.pickerItem,
                          alreadyAdded && styles.pickerItemDisabled,
                        ]}
                        onPress={() => {
                          if (!alreadyAdded) {
                            handleAddExercise(exercise.id, exercise.name);
                          }
                        }}
                        disabled={alreadyAdded}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            alreadyAdded && styles.pickerItemTextDisabled,
                          ]}
                        >
                          {exercise.name}
                        </Text>
                        {alreadyAdded && (
                          <Text style={styles.alreadyAddedBadge}>Added</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => setShowExercisePicker(false)}
              >
                <Text style={styles.pickerCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
  },
  closeIcon: {
    padding: Spacing.xs,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.foreground,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: '#1F2937',
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  exerciseList: {
    flex: 1,
    marginTop: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.mutedForeground,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dragHandle: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  exerciseName: {
    flex: 1,
    fontSize: 16,
    color: Colors.foreground,
  },
  iconButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  closeButton: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.muted,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.foreground,
  },
  saveButton: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: '#6B7280',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: '#fff',
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
  },
  pickerCloseButton: {
    padding: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pickerCloseText: {
    fontSize: 16,
    color: Colors.foreground,
    fontWeight: '500',
  },
  emptyPickerState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  pickerItemDisabled: {
    opacity: 0.5,
  },
  pickerItemTextDisabled: {
    color: Colors.mutedForeground,
  },
  alreadyAddedBadge: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
});
