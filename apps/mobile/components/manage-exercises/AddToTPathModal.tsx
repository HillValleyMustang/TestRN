import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { FetchedExerciseDefinition } from '../../../../packages/data/src/types/exercise';
import { useAuth } from '../../app/_contexts/auth-context';
import { useData } from '../../app/_contexts/data-context';
import { Button } from '../ui/Button';
import Toast from 'react-native-toast-message';
import { getWorkoutColor } from '../../lib/workout-colors';

interface AddToTPathModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: FetchedExerciseDefinition | null;
  onAddSuccess?: () => void;
  exerciseWorkoutsMap?: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
}

interface TPath {
  id: string;
  template_name: string;
  is_bonus: boolean;
  parent_t_path_id: string | null;
}

export const AddToTPathModal: React.FC<AddToTPathModalProps> = ({
  visible,
  onClose,
  exercise,
  onAddSuccess,
  exerciseWorkoutsMap,
}) => {
  const { supabase, userId } = useAuth();
  const { getActiveGym } = useData();
  const [activeGymName, setActiveGymName] = useState<string>('');
  const [userWorkouts, setUserWorkouts] = useState<TPath[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [currentWorkouts, setCurrentWorkouts] = useState<{ id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>([]);

  useEffect(() => {
    const fetchUserWorkouts = async () => {
      if (!userId) return;

      setLoading(true);
      try {
        // First, get the user's active_t_path_id from their profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('active_t_path_id')
          .eq('id', userId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        const activeTPathId = profileData?.active_t_path_id;

        if (!activeTPathId) {
          setUserWorkouts([]);
          Toast.show({
            type: 'error',
            text1: 'No active plan!',
            text2: 'You need an active Transformation Path to add exercises.',
          });
          setLoading(false);
          return;
        }

        // Then, fetch only the child T-Paths (workouts) that belong to the active T-Path
        const { data, error } = await supabase
          .from('t_paths')
          .select('id, template_name, created_at, is_bonus, user_id, version, settings, progression_settings, parent_t_path_id')
          .eq('user_id', userId)
          .eq('is_bonus', true)
          .eq('parent_t_path_id', activeTPathId)
          .order('template_name', { ascending: true });

        if (error) throw error;
        setUserWorkouts(data as TPath[] || []);
      } catch (err: any) {
        console.error("Failed to fetch user workouts:", err);
        Toast.show({
          type: 'error',
          text1: 'Error loading workouts',
          text2: 'Please try again later.',
        });
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      fetchUserWorkouts();
      setSelectedWorkoutId(""); // Reset selection when opening
      // Set current workouts for this exercise
      if (exercise?.id && exerciseWorkoutsMap) {
        setCurrentWorkouts(exerciseWorkoutsMap[exercise.id] || []);
      } else {
        setCurrentWorkouts([]);
      }

      // Load active gym name if user has multiple gyms
      if (userId) {
        getActiveGym(userId).then(gym => {
          if (gym?.name) {
            setActiveGymName(gym.name);
          }
        }).catch(error => {
          console.error('Error loading active gym:', error);
        });
      }
    }
  }, [visible, userId, supabase]);

  const handleAddToWorkout = async () => {
    if (!userId || !selectedWorkoutId || !exercise?.id) {
      Toast.show({
        type: 'error',
        text1: 'Please select a workout',
      });
      return;
    }

    setIsAdding(true);
    let workoutName = userWorkouts.find(w => w.id === selectedWorkoutId)?.template_name || 'Unknown Workout';

    try {
      // Check if exercise is already in this workout
      const { data: existingEntry, error: checkError } = await supabase
        .from('t_path_exercises')
        .select('id')
        .eq('template_id', selectedWorkoutId)
        .eq('exercise_id', exercise.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw checkError;
      }

      if (existingEntry) {
        Toast.show({
          type: 'error',
          text1: 'Exercise already in workout',
          text2: 'This exercise is already in the selected workout.',
        });
        setIsAdding(false);
        return;
      }

      // Determine the next order_index for the selected workout
      const { data: existingExercises, error: fetchExistingError } = await supabase
        .from('t_path_exercises')
        .select('order_index')
        .eq('template_id', selectedWorkoutId)
        .order('order_index', { ascending: false })
        .limit(1);

      if (fetchExistingError) throw fetchExistingError;

      const nextOrderIndex = (existingExercises && existingExercises.length > 0)
        ? (existingExercises[0].order_index || 0) + 1
        : 0;

      // Insert into t_path_exercises, directly linking to the exercise.id
      const { error: insertError } = await supabase
        .from('t_path_exercises')
        .insert({
          template_id: selectedWorkoutId,
          exercise_id: exercise.id,
          order_index: nextOrderIndex,
        });

      if (insertError) throw insertError;

      Toast.show({
        type: 'success',
        text1: 'Exercise added!',
        text2: `Added "${exercise.name}" to ${workoutName}`,
      });
      onAddSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to add exercise to workout:", err);
      Toast.show({
        type: 'error',
        text1: 'Failed to add exercise',
        text2: 'Please try again later.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFromWorkout = async (workoutId: string) => {
    if (!userId || !exercise?.id) return;

    try {
      const { error } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('template_id', workoutId)
        .eq('exercise_id', exercise.id);

      if (error) throw error;

      const workoutName = userWorkouts.find(w => w.id === workoutId)?.template_name || 'Unknown Workout';
      Toast.show({
        type: 'success',
        text1: 'Exercise removed!',
        text2: `Removed "${exercise.name}" from ${workoutName}`,
      });
      onAddSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to remove exercise from workout:", err);
      Toast.show({
        type: 'error',
        text1: 'Failed to remove exercise',
        text2: 'Please try again later.',
      });
    }
  };

  const renderWorkoutItem = ({ item }: { item: TPath }) => {
    const isAlreadyInWorkout = currentWorkouts.some(w => w.id === item.id);

    return (
      <View style={styles.workoutItem}>
        <TouchableOpacity
          style={[
            styles.workoutItemContent,
            selectedWorkoutId === item.id && styles.workoutItemSelected,
          ]}
          onPress={() => setSelectedWorkoutId(item.id)}
        >
          <Text style={[
            styles.workoutItemText,
            selectedWorkoutId === item.id && styles.workoutItemTextSelected,
          ]}>
            {item.template_name}
          </Text>
          {selectedWorkoutId === item.id && (
            <Ionicons name="checkmark-circle" size={20} color={Colors.actionPrimary} />
          )}
        </TouchableOpacity>

        {isAlreadyInWorkout && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveFromWorkout(item.id)}
          >
            <Ionicons name="remove-circle" size={20} color={Colors.destructive} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!exercise) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={Colors.foreground} />
                </TouchableOpacity>
                <Text style={styles.title}>Add or Remove from Workout</Text>
                <View style={styles.headerSpacer} />
              </View>
  
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                  <Text style={styles.exerciseName}>"{exercise.name}"</Text>
                  {activeGymName && (
                    <Text style={styles.gymReference}>
                      Modifying workouts for: {activeGymName}
                    </Text>
                  )}
  
                  {currentWorkouts.length > 0 && (
                    <View style={styles.currentWorkoutsContainer}>
                      <Text style={styles.currentWorkoutsTitle}>Currently in:</Text>
                      <View style={styles.currentWorkoutsList}>
                        {currentWorkouts.map((workout, index) => {
                          const workoutColor = getWorkoutColor(workout.name);
                          return (
                            <View key={index} style={[styles.currentWorkoutTag, { backgroundColor: workoutColor.main }]}>
                              <Text style={styles.currentWorkoutTagText}>{workout.name}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
  
                  <Text style={styles.description}>
                    Add this exercise to a workout or remove it from existing workouts.
                    Changes will be permanently saved to your workout templates.
                  </Text>
  
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={Colors.actionPrimary} />
                      <Text style={styles.loadingText}>Loading your workouts...</Text>
                    </View>
                  ) : userWorkouts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="fitness" size={48} color={Colors.mutedForeground} />
                      <Text style={styles.emptyTitle}>No workouts available</Text>
                      <Text style={styles.emptyText}>
                        You don't have any workouts in your active Transformation Path.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.workoutsContainer}>
                      <Text style={styles.sectionTitle}>Select Workout</Text>
                      <FlatList
                        data={userWorkouts}
                        keyExtractor={(item) => item.id}
                        renderItem={renderWorkoutItem}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={false}
                        style={styles.workoutsList}
                      />
                    </View>
                  )}
  
                  <View style={styles.buttonContainer}>
                    <Button
                      onPress={handleAddToWorkout}
                      disabled={!selectedWorkoutId || isAdding || loading}
                      loading={isAdding}
                      style={styles.addButton}
                    >
                      {isAdding ? "Updating..." : "Add to Workout"}
                    </Button>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  title: {
    ...TextStyles.body,
    color: Colors.foreground,
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  exerciseName: {
    ...TextStyles.h3,
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    ...TextStyles.h3,
    color: Colors.foreground,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
  workoutsContainer: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: Spacing.md,
    fontSize: 16,
  },
  workoutsList: {
    maxHeight: 300,
  },
  workoutItem: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.card,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutItemSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
  },
  workoutItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  removeButton: {
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutItemText: {
    ...TextStyles.body,
    color: Colors.foreground,
    flex: 1,
  },
  workoutItemTextSelected: {
    color: Colors.foreground,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: Spacing.lg,
  },
  addButton: {
    width: '100%',
  },
  currentWorkoutsContainer: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  currentWorkoutsTitle: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    fontSize: 14,
  },
  currentWorkoutsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  currentWorkoutTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  currentWorkoutTagText: {
    ...TextStyles.bodySmall,
    color: Colors.white,
    fontWeight: '500',
  },
  gymReference: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '98%',
    minHeight: 800,
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
  },
});

export default AddToTPathModal;