import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { FetchedExerciseDefinition } from '../../../../packages/data/src/types/exercise';
import ExerciseInfoModal from './ExerciseInfoModal';
import EditExerciseModal from './EditExerciseModal';
import AddToTPathModal from './AddToTPathModal';
import ManageGymsModal from './ManageGymsModal';
import DeleteExerciseModal from './DeleteExerciseModal';

interface UserExerciseListProps {
  exercises: FetchedExerciseDefinition[];
  totalCount: number;
  loading: boolean;
  userGyms: any[]; // TODO: Define proper type
  exerciseGymsMap: Record<string, string[]>;
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void;
  onDeleteExercise: (exercise: FetchedExerciseDefinition) => void;
  onAddToWorkout: (exercise: FetchedExerciseDefinition) => void;
  onEditExercise: (exercise: FetchedExerciseDefinition) => void;
  onInfoPress: (exercise: FetchedExerciseDefinition) => void;
  onManageGyms: (exercise: FetchedExerciseDefinition) => void;
  onRefreshData: () => void;
}

interface ExerciseItemProps {
  exercise: FetchedExerciseDefinition;
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void;
  onDeleteExercise: (exercise: FetchedExerciseDefinition) => void;
  onAddToWorkout: (exercise: FetchedExerciseDefinition) => void;
  onEditExercise: (exercise: FetchedExerciseDefinition) => void;
  onInfoPress: (exercise: FetchedExerciseDefinition) => void;
  onManageGyms: (exercise: FetchedExerciseDefinition) => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({
  exercise,
  onToggleFavorite,
  onDeleteExercise,
  onAddToWorkout,
  onEditExercise,
  onInfoPress,
  onManageGyms,
}) => {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const handleDeletePress = useCallback(() => {
    setDeleteModalVisible(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDeleteExercise(exercise);
    setDeleteModalVisible(false);
  }, [exercise, onDeleteExercise]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalVisible(false);
  }, []);

  return (
    <View style={styles.exerciseItem}>
      <View style={styles.exerciseContent}>
        <View style={styles.exerciseMain}>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseMuscle}>{exercise.main_muscle}</Text>
          </View>

          <View style={styles.exerciseActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => onInfoPress(exercise)}
            >
              <Ionicons name="information-circle-outline" size={24} color={Colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => onToggleFavorite(exercise)}
            >
              <Ionicons
                name={exercise.is_favorite || exercise.is_favorited_by_current_user ? "heart" : "heart-outline"}
                size={24}
                color={exercise.is_favorite || exercise.is_favorited_by_current_user ? Colors.primary : Colors.mutedForeground}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => onAddToWorkout(exercise)}
            >
              <Ionicons name="add-circle-outline" size={24} color={Colors.mutedForeground} />
            </TouchableOpacity>

            <Menu>
              <MenuTrigger>
                <View style={styles.iconButton}>
                  <Ionicons name="ellipsis-vertical" size={24} color={Colors.mutedForeground} />
                </View>
              </MenuTrigger>
              <MenuOptions customStyles={menuStyles}>
                <MenuOption onSelect={() => onEditExercise(exercise)}>
                  <View style={styles.menuOption}>
                    <Ionicons name="pencil" size={16} color={Colors.foreground} />
                    <Text style={styles.menuOptionText}>Edit</Text>
                  </View>
                </MenuOption>
                <MenuOption onSelect={() => onManageGyms(exercise)}>
                  <View style={styles.menuOption}>
                    <Ionicons name="business" size={16} color={Colors.foreground} />
                    <Text style={styles.menuOptionText}>Manage Gyms</Text>
                  </View>
                </MenuOption>
                <MenuOption onSelect={handleDeletePress}>
                  <View style={styles.menuOption}>
                    <Ionicons name="trash" size={16} color="#ef4444" />
                    <Text style={[styles.menuOptionText, styles.deleteText]}>Delete</Text>
                  </View>
                </MenuOption>
              </MenuOptions>
            </Menu>
          </View>
        </View>

        {/* Exercise metadata row */}
        <View style={styles.exerciseMeta}>
          <View style={styles.exerciseType}>
            <Text style={styles.exerciseTypeText}>{exercise.type || 'strength'}</Text>
          </View>
          {exercise.category && (
            <View style={styles.exerciseCategory}>
              <Text style={styles.exerciseCategoryText}>{exercise.category}</Text>
            </View>
          )}
        </View>
      </View>

      <DeleteExerciseModal
        visible={deleteModalVisible}
        onClose={handleDeleteCancel}
        exercise={exercise}
        onConfirmDelete={handleDeleteConfirm}
      />
    </View>
  );
};

interface AddExerciseFormProps {
  onAddExercise: (exerciseData: {
    name: string;
    main_muscle: string;
    type: string;
    category?: string;
    description?: string;
  }) => void;
  loading: boolean;
}

const AddExerciseForm: React.FC<AddExerciseFormProps> = ({ onAddExercise, loading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState('');
  const [mainMuscle, setMainMuscle] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = useCallback(() => {
    if (!name.trim() || !mainMuscle || !type) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    onAddExercise({
      name: name.trim(),
      main_muscle: mainMuscle,
      type,
      ...(category.trim() && { category: category.trim() }),
      ...(description.trim() && { description: description.trim() }),
    });

    // Reset form
    setName('');
    setMainMuscle('');
    setType('');
    setCategory('');
    setDescription('');
    setIsExpanded(false);
  }, [name, mainMuscle, type, category, description, onAddExercise]);

  if (!isExpanded) {
    return (
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsExpanded(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={20} color={Colors.mutedForeground} />
        <Text style={styles.addButtonText}>Add New Exercise</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.addForm}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Add New Exercise</Text>
        <TouchableOpacity onPress={() => setIsExpanded(false)}>
          <Ionicons name="close" size={24} color={Colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Name *</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="Exercise name"
          placeholderTextColor={Colors.mutedForeground}
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Main Muscle *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={mainMuscle}
            onValueChange={setMainMuscle}
            style={styles.picker}
          >
            <Picker.Item label="Select muscle group" value="" />
            <Picker.Item label="Chest" value="Chest" />
            <Picker.Item label="Back" value="Back" />
            <Picker.Item label="Shoulders" value="Shoulders" />
            <Picker.Item label="Biceps" value="Biceps" />
            <Picker.Item label="Triceps" value="Triceps" />
            <Picker.Item label="Quadriceps" value="Quadriceps" />
            <Picker.Item label="Hamstrings" value="Hamstrings" />
            <Picker.Item label="Glutes" value="Glutes" />
            <Picker.Item label="Core" value="Core" />
          </Picker>
        </View>
      </View>

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Type *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={type}
            onValueChange={setType}
            style={styles.picker}
          >
            <Picker.Item label="Select type" value="" />
            <Picker.Item label="Strength" value="strength" />
            <Picker.Item label="Cardio" value="cardio" />
            <Picker.Item label="Flexibility" value="flexibility" />
          </Picker>
        </View>
      </View>

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Category</Text>
        <TextInput
          style={styles.textInput}
          value={category}
          onChangeText={setCategory}
          placeholder="Optional category"
          placeholderTextColor={Colors.mutedForeground}
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          placeholderTextColor={Colors.mutedForeground}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primaryForeground} />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color={Colors.primaryForeground} />
            <Text style={styles.submitButtonText}>Add Exercise</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export const UserExerciseList: React.FC<UserExerciseListProps> = ({
  exercises,
  totalCount,
  loading,
  userGyms,
  exerciseGymsMap,
  onToggleFavorite,
  onDeleteExercise,
  onAddToWorkout,
  onEditExercise,
  onInfoPress,
  onManageGyms,
  onRefreshData,
}) => {
  const [selectedExercise, setSelectedExercise] = useState<FetchedExerciseDefinition | null>(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addToTPathModalVisible, setAddToTPathModalVisible] = useState(false);
  const [manageGymsModalVisible, setManageGymsModalVisible] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<FetchedExerciseDefinition | null>(null);
  const [exerciseToAdd, setExerciseToAdd] = useState<FetchedExerciseDefinition | null>(null);
  const [exerciseToManageGyms, setExerciseToManageGyms] = useState<FetchedExerciseDefinition | null>(null);

  const handleAddExercise = useCallback((exerciseData: any) => {
    // This would be implemented to call the add function from useExerciseData
    console.log('Add exercise:', exerciseData);
  }, []);

  const handleInfoPress = useCallback((exercise: FetchedExerciseDefinition) => {
    setSelectedExercise(exercise);
    setInfoModalVisible(true);
  }, []);

  const handleCloseInfoModal = useCallback(() => {
    setInfoModalVisible(false);
    setSelectedExercise(null);
  }, []);

  const handleEditExercise = useCallback((exercise: FetchedExerciseDefinition) => {
    setExerciseToEdit(exercise);
    setEditModalVisible(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditModalVisible(false);
    setExerciseToEdit(null);
  }, []);

  const handleAddToWorkout = useCallback((exercise: FetchedExerciseDefinition) => {
    setExerciseToAdd(exercise);
    setAddToTPathModalVisible(true);
  }, []);

  const handleCloseAddToTPathModal = useCallback(() => {
    setAddToTPathModalVisible(false);
    setExerciseToAdd(null);
  }, []);

  const handleManageGyms = useCallback((exercise: FetchedExerciseDefinition) => {
    setExerciseToManageGyms(exercise);
    setManageGymsModalVisible(true);
  }, []);

  const handleCloseManageGymsModal = useCallback(() => {
    setManageGymsModalVisible(false);
    setExerciseToManageGyms(null);
  }, []);

  const handleManageGymsSuccess = useCallback(() => {
    onRefreshData();
  }, [onRefreshData]);

  const renderExercise = useCallback(({ item }: { item: FetchedExerciseDefinition }) => (
    <ExerciseItem
      exercise={item}
      onToggleFavorite={onToggleFavorite}
      onDeleteExercise={onDeleteExercise}
      onAddToWorkout={onAddToWorkout}
      onEditExercise={handleEditExercise}
      onInfoPress={handleInfoPress}
      onManageGyms={handleManageGyms}
    />
  ), [onToggleFavorite, onDeleteExercise, onAddToWorkout, handleEditExercise, handleInfoPress, handleManageGyms]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="barbell-outline" size={48} color={Colors.mutedForeground} />
      <Text style={styles.emptyTitle}>No exercises found</Text>
      <Text style={styles.emptySubtitle}>
        {loading ? 'Loading exercises...' : 'Add your first exercise to get started'}
      </Text>
    </View>
  ), [loading]);

  const renderHeader = useCallback(() => (
    <>
      <AddExerciseForm onAddExercise={handleAddExercise} loading={false} />
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          Showing {exercises.length} of {totalCount} exercises
        </Text>
      </View>
    </>
  ), [exercises.length, totalCount, handleAddExercise]);

  if (loading && exercises.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading exercises...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flatList}>
      {renderHeader()}
      {exercises.length === 0 ? renderEmpty() : exercises.map((exercise) => (
        <ExerciseItem
          key={exercise.id}
          exercise={exercise}
          onToggleFavorite={onToggleFavorite}
          onDeleteExercise={onDeleteExercise}
          onAddToWorkout={handleAddToWorkout}
          onEditExercise={handleEditExercise}
          onInfoPress={handleInfoPress}
          onManageGyms={handleManageGyms}
        />
      ))}

      <ExerciseInfoModal
        visible={infoModalVisible}
        onClose={handleCloseInfoModal}
        exercise={selectedExercise}
      />

      <AddToTPathModal
        visible={addToTPathModalVisible}
        onClose={handleCloseAddToTPathModal}
        exercise={exerciseToAdd}
        onAddSuccess={() => {
          // Refresh data or show success message
        }}
      />

      <EditExerciseModal
        visible={editModalVisible}
        onClose={handleCloseEditModal}
        exercise={exerciseToEdit}
        onSaveSuccess={onRefreshData}
      />

      <ManageGymsModal
        visible={manageGymsModalVisible}
        onClose={handleCloseManageGymsModal}
        exercise={exerciseToManageGyms}
        userGyms={userGyms}
        initialSelectedGymIds={new Set(exerciseToManageGyms?.id ? exerciseGymsMap[exerciseToManageGyms.id] || [] : [])}
        onSaveSuccess={handleManageGymsSuccess}
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'center',
    width: '80%',
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  addButtonText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginLeft: Spacing.sm,
    fontSize: 14,
  },
  addForm: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  formTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
  },
  formField: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    ...TextStyles.body,
    color: Colors.foreground,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
  },
  picker: {
    color: Colors.foreground,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...TextStyles.bodyBold,
    color: Colors.primaryForeground,
    marginLeft: Spacing.sm,
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
  },
  exerciseMuscle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
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
  exerciseBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
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
  deleteText: {
    color: '#ef4444',
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