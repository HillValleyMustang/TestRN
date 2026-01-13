import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useAuth } from '../../app/_contexts/auth-context';
import { useData } from '../../app/_contexts/data-context';
import type { TPathExercise, ExerciseDefinition, FetchedExerciseDefinition, Gym } from '@data/storage/models';

// Dummy WorkoutExerciseWithDetails type for now
interface WorkoutExerciseWithDetails extends TPathExercise {
  exercise_definition: ExerciseDefinition;
}

interface EditWorkoutExercisesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  workoutName: string;
  onSaveSuccess: () => void;
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void;
}

// --- Placeholder/Simplified Components & Hooks --- //

// Simplified useEditWorkoutExercises hook
const useEditWorkoutExercises = ({ workoutId, onSaveSuccess, open, setTempStatusMessage }: any) => {
  const { userId } = useAuth();
  const { getTPath, getTPathExercises, addTPathExercise, deleteTPathExercise, updateTPath, supabase } = useData();
  const [exercises, setExercises] = useState<WorkoutExerciseWithDetails[]>([]);
  const [allExerciseDefinitions, setAllExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [addExerciseFilter, setAddExerciseFilter] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('');
  const [selectedGymFilter, setSelectedGymFilter] = useState('');
  const [showConfirmRemoveDialog, setShowConfirmRemoveDialog] = useState(false);
  const [exerciseToRemove, setExerciseToRemove] = useState<WorkoutExerciseWithDetails | null>(null);
  const [showAddAsBonusDialog, setShowAddAsBonusDialog] = useState(false);
  const [exerciseToAddDetails, setExerciseToAddDetails] = useState<ExerciseDefinition | null>(null);
  const [showConfirmResetDialog, setShowConfirmResetDialog] = useState(false);

  // Fetch all available exercise definitions (for the Add Exercise section)
  useEffect(() => {
    const fetchAllExerciseDefinitions = async () => {
      if (!open || !userId) return;
      try {
        let query = supabase
          .from('exercise_definitions')
          .select('*')
          .or(`created_by.eq.${userId},is_public.eq.true`); // Fetch user's own or public exercises

        if (selectedMuscleFilter) {
          query = query.contains('muscle_groups', [selectedMuscleFilter]);
        }
        // TODO: Implement gym equipment filtering if Gym context provides equipment list

        const { data, error } = await query;
        if (error) throw error;
        setAllExerciseDefinitions(data || []);
      } catch (error) {
        console.error('Error fetching all exercise definitions:', error);
        Toast.show({ type: 'error', text1: 'Failed to load exercise definitions.' });
      }
    };
    fetchAllExerciseDefinitions();
  }, [open, userId, supabase, selectedMuscleFilter]);

  const fetchExercises = useCallback(async () => {
    if (!userId || !workoutId || !open) return;
    setLoading(true);
    try {
      const tpath = await getTPath(workoutId);
      if (!tpath) {
        setExercises([]);
        return;
      }
      const tpathExercises = await getTPathExercises(workoutId);

      // Fetch corresponding exercise definitions
      const exerciseIds = tpathExercises.map(te => te.exercise_id).filter((id): id is string => id !== null);
      const { data: definitions, error: defError } = await supabase
        .from('exercise_definitions')
        .select('*')
        .in('id', exerciseIds);

      if (defError) throw defError;

      const definitionMap = new Map<string, ExerciseDefinition>();
      if (definitions) {
        definitions.forEach(def => definitionMap.set(def.id, def));
      }

      const exercisesWithDetails: WorkoutExerciseWithDetails[] = tpathExercises.map(te => ({
        ...te,
        exercise_definition: definitionMap.get(te.exercise_id || '') || { // Fallback if definition not found
          id: te.exercise_id || '',
          name: 'Unknown Exercise',
          muscle_groups: [],
          equipment: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: userId,
          description: null,
          image_url: null,
          video_url: null,
        },
      }));

      setExercises(exercisesWithDetails.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
    } catch (error) {
      console.error('Error fetching workout exercises:', error);
      Toast.show({ type: 'error', text1: 'Failed to load exercises.' });
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [userId, workoutId, open, getTPath, getTPathExercises, supabase]);

  useEffect(() => {
    if (open) {
      fetchExercises();
    }
  }, [open, fetchExercises]);

  const handleAddExerciseWithBonusStatus = useCallback(async (exercise: ExerciseDefinition, isBonus: boolean) => {
    if (!userId || !workoutId) return;
    setIsSaving(true);
    try {
      const newTPathExercise: TPathExercise = {
        id: `tpathex-${workoutId}-${exercise.id}-${Date.now()}`,
        t_path_id: workoutId,
        exercise_id: exercise.id,
        user_id: userId,
        order_index: exercises.length, // Add to end
        is_bonus: isBonus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await addTPathExercise(newTPathExercise);
      setTempStatusMessage({ message: `Added ${exercise.name} to workout!`, type: 'success' });
      fetchExercises(); // Re-fetch to update the list
    } catch (error) {
      console.error('Error adding exercise:', error);
      Toast.show({ type: 'error', text1: 'Failed to add exercise.' });
    } finally {
      setIsSaving(false);
    }
  }, [userId, workoutId, exercises.length, addTPathExercise, fetchExercises, setTempStatusMessage]);

  const handleRemoveExerciseClick = useCallback((exercise: WorkoutExerciseWithDetails) => {
    setExerciseToRemove(exercise);
    setShowConfirmRemoveDialog(true);
  }, []);

  const confirmRemoveExercise = useCallback(async (tpathExerciseId: string) => {
    if (!userId || !workoutId) return;
    setIsSaving(true);
    try {
      await deleteTPathExercise(tpathExerciseId);
      setTempStatusMessage({ message: `Removed exercise from workout.`, type: 'removed' });
      fetchExercises(); // Re-fetch to update the list
    } catch (error) {
      console.error('Error removing exercise:', error);
      Toast.show({ type: 'error', text1: 'Failed to remove exercise.' });
    } finally {
      setIsSaving(false);
    }
  }, [userId, workoutId, deleteTPathExercise, fetchExercises, setTempStatusMessage]);

  const handleSaveOrder = useCallback(async () => {
    if (!userId || !workoutId) return;
    setIsSaving(true);
    try {
      // Update the order_index for all exercises in a transaction
      const updates = exercises.map((exercise, index) => ({
        id: exercise.id,
        order_index: index,
      }));

      // Perform a batch update for order_index (Supabase equivalent of `upsert` or multiple `update` calls)
      const { error } = await supabase.from('t_path_exercises').upsert(updates, { onConflict: 'id' });

      if (error) throw error;

      setTempStatusMessage({ message: 'Workout order saved! ', type: 'success' });
      onSaveSuccess(); // Trigger parent refresh
    } catch (error) {
      console.error('Error saving exercise order:', error);
      Toast.show({ type: 'error', text1: 'Failed to save order.' });
    } finally {
      setIsSaving(false);
    }
  }, [userId, workoutId, exercises, onSaveSuccess, supabase, setTempStatusMessage]);

  const handleResetToDefaults = useCallback(async () => {
    if (!userId || !workoutId) return;
    setIsSaving(true);
    try {
      // This is a complex operation: delete existing TPathExercises and re-create defaults.
      // For now, let's simulate this and re-fetch.
      Alert.alert(
        'Reset Workout',
        'Simulating reset to default exercises. This would typically delete all current exercises and add defaults.',
        [
          { text: 'OK', onPress: () => fetchExercises() }, // Re-fetch to simulate reset
        ]
      );
      setTempStatusMessage({ message: 'Simulated reset to defaults.', type: 'info' });
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      Toast.show({ type: 'error', text1: 'Failed to reset to defaults.' });
    } finally {
      setIsSaving(false);
    }
  }, [userId, workoutId, fetchExercises, setTempStatusMessage]);

  const handleToggleBonusStatus = useCallback(async (tpathExerciseId: string, currentStatus: boolean) => {
    if (!userId || !workoutId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('t_path_exercises')
        .update({ is_bonus: !currentStatus })
        .eq('id', tpathExerciseId);

      if (error) throw error;

      setTempStatusMessage({ message: `Exercise marked as ${!currentStatus ? 'bonus' : 'regular'}.`, type: 'info' });
      fetchExercises();
    } catch (error) {
      console.error('Error toggling bonus status:', error);
      Toast.show({ type: 'error', text1: 'Failed to toggle bonus status.' });
    } finally {
      setIsSaving(false);
    }
  }, [userId, workoutId, supabase, fetchExercises, setTempStatusMessage]);

  const handleSelectAndPromptBonus = useCallback((exercise: ExerciseDefinition) => {
    setExerciseToAddDetails(exercise);
    setShowAddAsBonusDialog(true);
  }, []);

  const mainMuscleGroups = useMemo(() => {
    const allGroups = new Set<string>();
    allExerciseDefinitions.forEach(ex => ex.muscle_groups.forEach(group => allGroups.add(group)));
    return Array.from(allGroups).sort();
  }, [allExerciseDefinitions]);

  const filteredExercisesForDropdown = useMemo(() => {
    return allExerciseDefinitions.filter(ex => 
      ex.name.toLowerCase().includes(addExerciseFilter.toLowerCase()) &&
      (selectedMuscleFilter ? ex.muscle_groups.includes(selectedMuscleFilter) : true)
      // TODO: Add gym equipment filtering here if needed
    );
  }, [allExerciseDefinitions, addExerciseFilter, selectedMuscleFilter]);

  return {
    exercises,
    filteredExercisesForDropdown,
    loading,
    isSaving,
    addExerciseFilter,
    setAddExerciseFilter,
    mainMuscleGroups,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    userGyms: [], // Will come from GymContext
    selectedGymFilter,
    setSelectedGymFilter,
    showConfirmRemoveDialog,
    setShowConfirmRemoveDialog,
    exerciseToRemove,
    showAddAsBonusDialog,
    setShowAddAsBonusDialog,
    exerciseToAddDetails,
    showConfirmResetDialog,
    setShowConfirmResetDialog,
    handleDragEnd: (newOrder: any) => {
      setExercises(newOrder);
      setTempStatusMessage({ message: 'Order changed (not yet saved). ', type: 'info' });
    },
    handleAddExerciseWithBonusStatus,
    handleSelectAndPromptBonus,
    handleRemoveExerciseClick,
    confirmRemoveExercise,
    handleToggleBonusStatus,
    handleResetToDefaults,
    handleSaveOrder,
  };
};

// Placeholder ExerciseInfoDialog
const ExerciseInfoDialog = ({ open, onOpenChange, exercise, setTempStatusMessage }: any) => {
  if (!open) return null;
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={open}
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Exercise Info</Text>
          <Text style={styles.modalText}>{exercise?.name || 'N/A'}</Text>
          <Text style={styles.modalText}>Muscle Groups: {exercise?.muscle_groups?.join(', ') || 'N/A'}</Text>
          <TouchableOpacity onPress={() => onOpenChange(false)} style={styles.button}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Placeholder for AddExerciseSection
const AddExerciseSection = ({
  allAvailableExercises,
  exercisesInWorkout,
  addExerciseFilter,
  setAddExerciseFilter,
  handleSelectAndPromptBonus,
  isSaving,
  mainMuscleGroups,
  selectedMuscleFilter,
  setSelectedMuscleFilter,
}: any) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Add Exercise</Text>
    <TextInput
      style={styles.textInput}
      placeholder="Search exercises..." 
      placeholderTextColor={Colors.textMuted}
      value={addExerciseFilter}
      onChangeText={setAddExerciseFilter}
    />

    {/* Muscle Group Filter */}
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Filter by Muscle Group:</Text>
      <View style={styles.picker}>
        <TouchableOpacity onPress={() => console.log('Open muscle group picker')}>
          <Text style={styles.pickerText}>{selectedMuscleFilter || 'All'}</Text>
        </TouchableOpacity>
      </View>
      {/* TODO: Replace with a proper Picker component */}
    </View>

    <ScrollView style={styles.exerciseListContainer}>
      {allAvailableExercises.length > 0 ? (
        allAvailableExercises.map((exercise: ExerciseDefinition) => (
          <TouchableOpacity
            key={exercise.id}
            style={styles.exerciseListItem}
            onPress={() => handleSelectAndPromptBonus(exercise)}
            disabled={isSaving || exercisesInWorkout.some((e:any) => e.exercise_id === exercise.id)}
          >
            <Text style={styles.exerciseListItemText}>{exercise.name}</Text>
            {exercisesInWorkout.some((e:any) => e.exercise_id === exercise.id) && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            )}
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.textMuted}>No exercises found matching criteria.</Text>
      )}
    </ScrollView>
  </View>
);

// Placeholder for SortableExerciseList
const SortableExerciseList = ({
  exercises,
  handleDragEnd,
  handleRemoveExerciseClick,
  handleOpenInfoDialog,
  handleToggleBonusStatus
}: any) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Current Exercises</Text>
    {exercises.length === 0 ? (
      <Text style={styles.textMuted}>No exercises in this workout yet.</Text>
    ) : (
      // This section would ideally use a draggable list component
      exercises.map((exercise: WorkoutExerciseWithDetails, index: number) => (
        <View key={exercise.id} style={styles.workoutItem}>
          <Ionicons name="reorder-three-outline" size={24} color={Colors.textMuted} style={styles.dragHandle} />
          <Text style={styles.workoutName}>{exercise.exercise_definition.name}</Text>
          {exercise.is_bonus && (
            <View style={styles.bonusTag}>
              <Text style={styles.bonusTagText}>Bonus</Text>
            </View>
          )}
          <View style={styles.workoutItemActions}>
            <TouchableOpacity onPress={() => handleOpenInfoDialog(exercise)} style={styles.actionButton}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemoveExerciseClick(exercise)} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleToggleBonusStatus(exercise.id, exercise.is_bonus)} style={styles.actionButton}>
              <Ionicons name={exercise.is_bonus ? "star" : "star-outline"} size={20} color={exercise.is_bonus ? Colors.warning : Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      ))
    )}
    <Text style={styles.textMuted}>Drag and drop reordering will be implemented here (using a library like react-native-draggable-flatlist).</Text>
  </View>
);

// Placeholder for WorkoutActionButtons
const WorkoutActionButtons = ({ handleSaveOrder, handleResetToDefaults, isSaving, setShowConfirmResetDialog }: any) => (
  <View style={styles.cardContent}>
    <TouchableOpacity onPress={handleSaveOrder} style={styles.button} disabled={isSaving}>
      {isSaving ? <ActivityIndicator color={Colors.primaryForeground} /> : <Text style={styles.buttonText}>Save Changes</Text>}
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setShowConfirmResetDialog(true)} style={[styles.button, styles.outlineButton]} disabled={isSaving}>
      <Text style={[styles.buttonText, styles.outlineButtonText]}>Reset to Defaults</Text>
    </TouchableOpacity>
  </View>
);

// Placeholder for ConfirmRemoveExerciseDialog
const ConfirmRemoveExerciseDialog = ({ open, onOpenChange, exerciseToRemove, onConfirm }: any) => {
  if (!open) return null;
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={open}
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Remove Exercise</Text>
          <Text style={styles.modalText}>Are you sure you want to remove {exerciseToRemove?.exercise_definition?.name || 'this exercise'}?</Text>
          <TouchableOpacity onPress={() => {
            onConfirm();
            onOpenChange(false);
          }} style={styles.buttonSecondary}>
            <Text style={styles.buttonSecondaryText}>Remove</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onOpenChange(false)} style={styles.button}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Placeholder for AddAsBonusDialog
const AddAsBonusDialog = ({ open, onOpenChange, exerciseToAddDetails, handleAddExerciseWithBonusStatus, isSaving }: any) => {
  if (!open) return null;
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={open}
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add "{exerciseToAddDetails?.name || 'Exercise'}"</Text>
          <Text style={styles.modalText}>Do you want to add this as a bonus exercise?</Text>
          <TouchableOpacity onPress={() => {
            handleAddExerciseWithBonusStatus(exerciseToAddDetails, true);
            onOpenChange(false);
          }} style={styles.button}>
            <Text style={styles.buttonText}>Add as Bonus</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            handleAddExerciseWithBonusStatus(exerciseToAddDetails, false);
            onOpenChange(false);
          }} style={styles.buttonSecondary}>
            <Text style={styles.buttonSecondaryText}>Add as Regular</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Placeholder for ConfirmResetDialog
const ConfirmResetDialog = ({ open, onOpenChange, workoutName, onConfirm }: any) => {
  if (!open) return null;
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={open}
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Reset "{workoutName}"</Text>
          <Text style={styles.modalText}>Are you sure you want to reset all exercises in this workout to its default state? This action cannot be undone.</Text>
          <TouchableOpacity onPress={() => {
            onConfirm();
            onOpenChange(false);
          }} style={styles.buttonSecondary}>
            <Text style={styles.buttonSecondaryText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onOpenChange(false)} style={styles.button}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const EditWorkoutExercisesModal = ({
  open,
  onOpenChange,
  workoutId,
  workoutName,
  onSaveSuccess,
  setTempStatusMessage,
}: EditWorkoutExercisesModalProps) => {
  const {
    exercises,
    filteredExercisesForDropdown,
    loading,
    isSaving,
    addExerciseFilter,
    setAddExerciseFilter,
    mainMuscleGroups,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    userGyms,
    selectedGymFilter,
    setSelectedGymFilter,
    showConfirmRemoveDialog,
    setShowConfirmRemoveDialog,
    exerciseToRemove,
    showAddAsBonusDialog,
    setShowAddAsBonusDialog,
    exerciseToAddDetails,
    showConfirmResetDialog,
    setShowConfirmResetDialog,
    handleDragEnd,
    handleAddExerciseWithBonusStatus,
    handleSelectAndPromptBonus,
    handleRemoveExerciseClick,
    confirmRemoveExercise,
    handleToggleBonusStatus,
    handleResetToDefaults,
    handleSaveOrder,
  } = useEditWorkoutExercises({ workoutId, onSaveSuccess, open, setTempStatusMessage });

  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<FetchedExerciseDefinition | null>(null);

  const handleOpenInfoDialog = (exercise: WorkoutExerciseWithDetails) => {
    setSelectedExerciseForInfo(exercise.exercise_definition as FetchedExerciseDefinition);
    setIsInfoDialogOpen(true);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={open}
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.fullScreenModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage Exercises for {workoutName}</Text>
            <TouchableOpacity onPress={() => onOpenChange(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.textMuted}>Loading exercises...</Text>
              </View>
            ) : (
              <View style={styles.contentContainer}>
                <AddExerciseSection 
                  allAvailableExercises={filteredExercisesForDropdown}
                  exercisesInWorkout={exercises}
                  handleSelectAndPromptBonus={handleSelectAndPromptBonus}
                  isSaving={isSaving}
                  addExerciseFilter={addExerciseFilter}
                  setAddExerciseFilter={setAddExerciseFilter}
                  mainMuscleGroups={mainMuscleGroups}
                  selectedMuscleFilter={selectedMuscleFilter}
                  setSelectedMuscleFilter={setSelectedMuscleFilter}
                  userGyms={userGyms}
                  selectedGymFilter={selectedGymFilter}
                  setSelectedGymFilter={setSelectedGymFilter}
                  setTempStatusMessage={setTempStatusMessage}
                />
                <SortableExerciseList
                  exercises={exercises}
                  handleDragEnd={handleDragEnd}
                  handleRemoveExerciseClick={handleRemoveExerciseClick}
                  handleOpenInfoDialog={handleOpenInfoDialog}
                  handleToggleBonusStatus={handleToggleBonusStatus}
                />
                <WorkoutActionButtons
                  handleSaveOrder={handleSaveOrder}
                  handleResetToDefaults={handleResetToDefaults}
                  isSaving={isSaving}
                  setShowConfirmResetDialog={setShowConfirmResetDialog}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {selectedExerciseForInfo && (
        <ExerciseInfoDialog
          open={isInfoDialogOpen}
          onOpenChange={setIsInfoDialogOpen}
          exercise={selectedExerciseForInfo}
          setTempStatusMessage={setTempStatusMessage}
        />
      )}

      {/* Confirmation Dialogs */}
      <ConfirmRemoveExerciseDialog
        open={showConfirmRemoveDialog}
        onOpenChange={setShowConfirmRemoveDialog}
        exerciseToRemove={exerciseToRemove}
        onConfirm={() => {
          confirmRemoveExercise(exerciseToRemove?.id || '');
          setShowConfirmRemoveDialog(false);
        }}
      />

      <AddAsBonusDialog
        open={showAddAsBonusDialog}
        onOpenChange={setShowAddAsBonusDialog}
        exerciseToAddDetails={exerciseToAddDetails}
        handleAddExerciseWithBonusStatus={handleAddExerciseWithBonusStatus}
        isSaving={isSaving}
      />

      <ConfirmResetDialog
        open={showConfirmResetDialog}
        onOpenChange={setShowConfirmResetDialog}
        workoutName={workoutName}
        onConfirm={() => {
          handleResetToDefaults();
          setShowConfirmResetDialog(false);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  fullScreenModalContent: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalBody: {
    flex: 1,
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  textMuted: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  contentContainer: {
    gap: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  exerciseListContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  exerciseListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseListItemText: {
    color: Colors.foreground,
    fontSize: 16,
  },
  pickerContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pickerLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  picker: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  pickerText: {
    color: Colors.foreground,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: Colors.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  outlineButtonText: {
    color: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonSecondaryText: {
    color: Colors.secondaryForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.foreground,
  },
  workoutItemActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  info: {
    color: Colors.info,
  },
  error: {
    color: Colors.error,
  },
  warning: {
    color: Colors.warning,
  },
  bonusTag: {
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    marginLeft: Spacing.xs,
  },
  bonusTagText: {
    color: Colors.warningForeground,
    fontSize: 10,
    fontWeight: 'bold',
  },
  dragHandle: {
    marginRight: Spacing.xs,
  },
});
