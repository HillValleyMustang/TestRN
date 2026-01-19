import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { FetchedExerciseDefinition } from '../../../../packages/data/src/types/exercise';
import { getWorkoutColor } from '../../lib/workout-colors';
import ExerciseInfoModal from './ExerciseInfoModal';
import AddToTPathModal from './AddToTPathModal';

interface GlobalExerciseListProps {
  exercises: FetchedExerciseDefinition[];
  totalCount: number;
  loading: boolean;
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void;
  onAddToWorkout: (exercise: FetchedExerciseDefinition) => void;
  onInfoPress: (exercise: FetchedExerciseDefinition) => void;
  onManageGyms: (exercise: FetchedExerciseDefinition) => void;
  onRefreshData?: () => void;
}

interface ExerciseItemProps {
  exercise: FetchedExerciseDefinition;
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void;
  onAddToWorkout: (exercise: FetchedExerciseDefinition) => void;
  onInfoPress: (exercise: FetchedExerciseDefinition) => void;
  onManageGyms: (exercise: FetchedExerciseDefinition) => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({
  exercise,
  exerciseWorkoutsMap,
  onToggleFavorite,
  onAddToWorkout,
  onInfoPress,
  onManageGyms,
}) => {
  return (
    <View style={styles.exerciseItem}>
      <View style={styles.exerciseContent}>
        <View style={styles.exerciseMain}>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <View style={styles.exerciseMuscleRow}>
              <Text style={styles.exerciseMuscle}>{exercise.main_muscle}</Text>
              <View style={styles.exerciseActions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => onInfoPress(exercise)}
                >
                  <Ionicons name="information-circle-outline" size={20} color={Colors.mutedForeground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => onToggleFavorite(exercise)}
                >
                  <Ionicons
                    name={exercise.is_favorited_by_current_user ? "heart" : "heart-outline"}
                    size={20}
                    color={exercise.is_favorited_by_current_user ? "#ef4444" : Colors.mutedForeground}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => onAddToWorkout(exercise)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={Colors.mutedForeground} />
                </TouchableOpacity>

                <Menu>
                  <MenuTrigger>
                    <View style={styles.iconButton}>
                      <Ionicons name="ellipsis-vertical" size={20} color={Colors.mutedForeground} />
                    </View>
                  </MenuTrigger>
                  <MenuOptions customStyles={menuStyles}>
                    <MenuOption onSelect={() => onManageGyms(exercise)}>
                      <View style={styles.menuOption}>
                        <Ionicons name="business" size={16} color={Colors.foreground} />
                        <Text style={styles.menuOptionText}>Manage Gyms</Text>
                      </View>
                    </MenuOption>
                  </MenuOptions>
                </Menu>
              </View>
            </View>
          </View>
        </View>

        {/* Exercise metadata row */}
        <View style={styles.exerciseMeta}>
          {/* Workout tags */}
          {exerciseWorkoutsMap && exerciseWorkoutsMap[exercise.id as string] && exerciseWorkoutsMap[exercise.id as string].length > 0 && (
            <View style={styles.exerciseWorkouts}>
              {exerciseWorkoutsMap[exercise.id as string].slice(0, 2).map((workout, index) => {
                const workoutColor = getWorkoutColor(workout.name);
                return (
                  <View key={index} style={[styles.exerciseWorkoutTag, { backgroundColor: workoutColor.main }]}>
                    <Text style={styles.exerciseWorkoutTagText}>{workout.name}</Text>
                  </View>
                );
              })}
              {exerciseWorkoutsMap[exercise.id as string].length > 2 && (
                <View style={styles.exerciseWorkoutTag}>
                  <Text style={styles.exerciseWorkoutTagText}>
                    +{exerciseWorkoutsMap[exercise.id as string].length - 2}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

      </View>
    </View>
  );
};

export const GlobalExerciseList: React.FC<GlobalExerciseListProps> = ({
  exercises,
  totalCount,
  loading,
  exerciseWorkoutsMap,
  onToggleFavorite,
  onAddToWorkout,
  onInfoPress,
  onManageGyms,
  onRefreshData,
}) => {
  const [selectedExercise, setSelectedExercise] = useState<FetchedExerciseDefinition | null>(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [addToTPathModalVisible, setAddToTPathModalVisible] = useState(false);
  const [exerciseToAdd, setExerciseToAdd] = useState<FetchedExerciseDefinition | null>(null);

  if (__DEV__) {
    console.log('GlobalExerciseList render:', { exercises: exercises?.length, totalCount, loading });
  }

  const handleInfoPress = useCallback((exercise: FetchedExerciseDefinition) => {
    setSelectedExercise(exercise);
    setInfoModalVisible(true);
  }, []);

  const handleCloseInfoModal = useCallback(() => {
    setInfoModalVisible(false);
    setSelectedExercise(null);
  }, []);

  const handleAddToWorkout = useCallback((exercise: FetchedExerciseDefinition) => {
    if (__DEV__) {
      console.log('GlobalExerciseList: Opening AddToTPathModal for exercise:', exercise.name);
    }
    setExerciseToAdd(exercise);
    setAddToTPathModalVisible(true);
  }, []);

  const handleCloseAddToTPathModal = useCallback(() => {
    setAddToTPathModalVisible(false);
    setExerciseToAdd(null);
  }, []);

  const renderExercise = useCallback(({ item }: { item: FetchedExerciseDefinition }) => (
    <ExerciseItem
      exercise={item}
      exerciseWorkoutsMap={exerciseWorkoutsMap}
      onToggleFavorite={onToggleFavorite}
      onAddToWorkout={onAddToWorkout}
      onInfoPress={handleInfoPress}
      onManageGyms={onManageGyms}
    />
  ), [exerciseWorkoutsMap, onToggleFavorite, onAddToWorkout, handleInfoPress, onManageGyms]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="library-outline" size={48} color={Colors.mutedForeground} />
      <Text style={styles.emptyTitle}>No exercises found</Text>
      <Text style={styles.emptySubtitle}>
        {loading ? 'Loading exercises...' : 'Try adjusting your search or filters'}
      </Text>
    </View>
  ), [loading]);

  const renderHeader = useCallback(() => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderText}>
        Showing {exercises.length} of {totalCount} global exercises
      </Text>
    </View>
  ), [exercises.length, totalCount]);

  if (loading && exercises.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading global exercises...</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      <FlatList
        data={exercises}
        renderItem={renderExercise}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
        contentContainerStyle={styles.listContent}
      />

      <ExerciseInfoModal
        visible={infoModalVisible}
        onClose={handleCloseInfoModal}
        exercise={selectedExercise}
      />

      <AddToTPathModal
        visible={addToTPathModalVisible}
        onClose={handleCloseAddToTPathModal}
        exercise={exerciseToAdd}
        exerciseWorkoutsMap={exerciseWorkoutsMap}
        onAddSuccess={onRefreshData || (() => {})}
      />
    </View>
  );
};

const menuStyles = {
  optionsContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    minWidth: 150,
  },
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.md,
  },
  listHeader: {
    marginBottom: Spacing.md,
  },
  listHeaderText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  exerciseItem: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginHorizontal: Spacing.md,
  },
  exerciseContent: {
    padding: Spacing.md,
  },
  exerciseMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
    fontSize: 16,
  },
  exerciseMuscle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  exerciseMuscleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  exerciseWorkouts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  exerciseWorkoutTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  exerciseWorkoutTagText: {
    ...TextStyles.bodySmall,
    color: Colors.primaryForeground,
    fontWeight: '500',
  },
  exerciseType: {
    backgroundColor: Colors.muted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  exerciseTypeText: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  exerciseCategory: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  exerciseCategoryText: {
    ...TextStyles.bodySmall,
    color: Colors.secondaryForeground,
    fontWeight: '500',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  menuOptionText: {
    ...TextStyles.body,
    color: Colors.foreground,
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...TextStyles.h3,
    color: Colors.foreground,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginTop: Spacing.md,
  },
});