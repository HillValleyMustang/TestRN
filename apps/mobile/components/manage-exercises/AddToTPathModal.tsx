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
import { Button } from '../ui/Button';
import Toast from 'react-native-toast-message';

interface AddToTPathModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: FetchedExerciseDefinition | null;
  onAddSuccess?: () => void;
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
}) => {
  const { supabase, userId } = useAuth();
  const [userWorkouts, setUserWorkouts] = useState<TPath[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

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
      // 2. Determine the next order_index for the selected workout
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

      // 3. Insert into t_path_exercises, directly linking to the exercise.id
      const { error: insertError } = await supabase
        .from('t_path_exercises')
        .insert({
          template_id: selectedWorkoutId,
          exercise_id: exercise.id,
          order_index: nextOrderIndex,
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation code
          Toast.show({
            type: 'error',
            text1: 'Exercise already in workout',
            text2: 'This exercise is already in the selected workout.',
          });
        } else {
          throw insertError;
        }
      } else {
        Toast.show({
          type: 'success',
          text1: 'Exercise added!',
          text2: `Added "${exercise.name}" to ${workoutName}`,
        });
        onAddSuccess?.();
        onClose();
      }
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

  const renderWorkoutItem = ({ item }: { item: TPath }) => (
    <TouchableOpacity
      style={[
        styles.workoutItem,
        selectedWorkoutId === item.id && styles.workoutItemSelected,
      ]}
      onPress={() => setSelectedWorkoutId(item.id)}
    >
      <View style={styles.workoutItemContent}>
        <Text style={[
          styles.workoutItemText,
          selectedWorkoutId === item.id && styles.workoutItemTextSelected,
        ]}>
          {item.template_name}
        </Text>
        {selectedWorkoutId === item.id && (
          <Ionicons name="checkmark-circle" size={20} color={Colors.actionPrimary} />
        )}
      </View>
    </TouchableOpacity>
  );

  if (!exercise) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Add to Workout</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.exerciseName}>"{exercise.name}"</Text>

            <Text style={styles.description}>
              Select one of your personalised workouts to add this exercise to.
              This will permanently add it to the workout template.
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
                {isAdding ? "Adding..." : "Add to Workout"}
              </Button>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    ...TextStyles.h3,
    color: Colors.foreground,
    flex: 1,
    textAlign: 'center',
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
    ...TextStyles.h2,
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.xl,
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
  },
  workoutItemSelected: {
    borderColor: Colors.actionPrimary,
    backgroundColor: Colors.actionPrimary + '10', // 10% opacity
  },
  workoutItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  workoutItemText: {
    ...TextStyles.body,
    color: Colors.foreground,
    flex: 1,
  },
  workoutItemTextSelected: {
    color: Colors.actionPrimary,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: Spacing.lg,
  },
  addButton: {
    width: '100%',
  },
});

export default AddToTPathModal;