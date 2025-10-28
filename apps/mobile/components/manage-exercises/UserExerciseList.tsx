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
  Modal,
  ScrollView,
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
    pro_tip?: string;
    video_url?: string;
    movement_type?: string;
    movement_pattern?: string;
  }) => void;
  loading: boolean;
}

const AddExerciseForm: React.FC<AddExerciseFormProps> = ({ onAddExercise, loading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [proTip, setProTip] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [movementType, setMovementType] = useState('');
  const [movementPattern, setMovementPattern] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState<'muscle' | 'type' | 'category' | 'movementType' | 'movementPattern' | null>(null);
  const [youtubeInfoModalVisible, setYoutubeInfoModalVisible] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!name.trim() || selectedMuscles.length === 0 || !type) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    onAddExercise({
      name: name.trim(),
      main_muscle: selectedMuscles.join(', '),
      type,
      ...(category.trim() && { category: category.trim() }),
      ...(description.trim() && { description: description.trim() }),
      ...(proTip.trim() && { pro_tip: proTip.trim() }),
      ...(videoUrl.trim() && { video_url: videoUrl.trim() }),
      ...(movementType && { movement_type: movementType }),
      ...(movementPattern && { movement_pattern: movementPattern }),
    });

    // Reset form
    setName('');
    setSelectedMuscles([]);
    setType('');
    setCategory('');
    setDescription('');
    setProTip('');
    setVideoUrl('');
    setMovementType('');
    setMovementPattern('');
    setIsExpanded(false);
  }, [name, selectedMuscles, type, category, description, proTip, videoUrl, movementType, movementPattern, onAddExercise]);

  const handleDropdownToggle = useCallback((type: 'muscle' | 'type' | 'category' | 'movementType' | 'movementPattern') => {
    setDropdownVisible(dropdownVisible === type ? null : type);
  }, [dropdownVisible]);

  const handleDropdownSelect = useCallback((type: 'muscle' | 'type' | 'category' | 'movementType' | 'movementPattern', value: string) => {
    if (type === 'muscle') {
      // For muscle selection, toggle in the array
      setSelectedMuscles(prev =>
        prev.includes(value)
          ? prev.filter(m => m !== value)
          : [...prev, value]
      );
    } else if (type === 'type') {
      setType(value);
    } else if (type === 'category') {
      setCategory(value);
    } else if (type === 'movementType') {
      setMovementType(value);
    } else if (type === 'movementPattern') {
      setMovementPattern(value);
    }
    setDropdownVisible(null);
  }, []);

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

      {/* Required Fields Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Required Information</Text>

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
          <Text style={styles.fieldLabel}>Main Muscles *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => handleDropdownToggle('muscle')}
          >
            <Text style={styles.dropdownButtonText}>
              {selectedMuscles.length > 0 ? selectedMuscles.join(', ') : 'Select muscle groups'}
            </Text>
            <Ionicons
              name={dropdownVisible === 'muscle' ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Type *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => handleDropdownToggle('type')}
          >
            <Text style={styles.dropdownButtonText}>
              {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Select type'}
            </Text>
            <Ionicons
              name={dropdownVisible === 'type' ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Optional Fields Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Optional Information</Text>

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Category</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => handleDropdownToggle('category')}
          >
            <Text style={styles.dropdownButtonText}>
              {category || 'Select category'}
            </Text>
            <Ionicons
              name={dropdownVisible === 'category' ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Movement Type</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => handleDropdownToggle('movementType')}
          >
            <Text style={styles.dropdownButtonText}>
              {movementType ? movementType.charAt(0).toUpperCase() + movementType.slice(1) : 'Select movement type'}
            </Text>
            <Ionicons
              name={dropdownVisible === 'movementType' ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Movement Pattern</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => handleDropdownToggle('movementPattern')}
          >
            <Text style={styles.dropdownButtonText}>
              {movementPattern || 'Select movement pattern'}
            </Text>
            <Ionicons
              name={dropdownVisible === 'movementPattern' ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.mutedForeground}
            />
          </TouchableOpacity>
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

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Pro Tip</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={proTip}
            onChangeText={setProTip}
            placeholder="Optional pro tip or instruction"
            placeholderTextColor={Colors.mutedForeground}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.formField}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldLabel}>Video URL</Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setYoutubeInfoModalVisible(true)}
            >
              <Ionicons name="information-circle-outline" size={16} color={Colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.textInput}
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="Optional YouTube embed URL"
            placeholderTextColor={Colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
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

      {/* Custom Dropdown Modal */}
      <Modal
        visible={dropdownVisible !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(null)}
      >
        <View style={styles.dropdownModal}>
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>
                {dropdownVisible === 'muscle' ? 'Select Muscle Group' : 'Select Type'}
              </Text>
              <TouchableOpacity
                onPress={() => setDropdownVisible(null)}
                style={styles.dropdownCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={
                dropdownVisible === 'muscle'
                  ? [
                      { label: 'Pectorals', value: 'Pectorals' },
                      { label: 'Deltoids', value: 'Deltoids' },
                      { label: 'Lats', value: 'Lats' },
                      { label: 'Traps', value: 'Traps' },
                      { label: 'Biceps', value: 'Biceps' },
                      { label: 'Triceps', value: 'Triceps' },
                      { label: 'Quadriceps', value: 'Quadriceps' },
                      { label: 'Hamstrings', value: 'Hamstrings' },
                      { label: 'Glutes', value: 'Glutes' },
                      { label: 'Calves', value: 'Calves' },
                      { label: 'Abdominals', value: 'Abdominals' },
                      { label: 'Core', value: 'Core' },
                      { label: 'Full Body', value: 'Full Body' },
                    ].sort((a, b) => a.label.localeCompare(b.label))
                  : dropdownVisible === 'type'
                  ? [
                      { label: 'Weight', value: 'weight' },
                      { label: 'Timed', value: 'timed' },
                      { label: 'Bodyweight', value: 'bodyweight' },
                    ]
                  : dropdownVisible === 'category'
                  ? [
                      { label: 'Unilateral', value: 'Unilateral' },
                      { label: 'Bilateral', value: 'Bilateral' },
                    ]
                  : dropdownVisible === 'movementType'
                  ? [
                      { label: 'Compound', value: 'compound' },
                      { label: 'Isolation', value: 'isolation' },
                    ]
                  : dropdownVisible === 'movementPattern'
                  ? [
                      { label: 'Push', value: 'Push' },
                      { label: 'Pull', value: 'Pull' },
                      { label: 'Legs', value: 'Legs' },
                      { label: 'Core', value: 'Core' },
                    ]
                  : []
              }
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected =
                  dropdownVisible === 'muscle'
                    ? selectedMuscles.includes(item.value)
                    : dropdownVisible === 'type'
                    ? type === item.value
                    : dropdownVisible === 'category'
                    ? category === item.value
                    : dropdownVisible === 'movementType'
                    ? movementType === item.value
                    : dropdownVisible === 'movementPattern'
                    ? movementPattern === item.value
                    : false;

                return (
                  <TouchableOpacity
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                    onPress={() => handleDropdownSelect(dropdownVisible!, item.value)}
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.dropdownCheckmark}>
                        <Ionicons name="checkmark" size={12} color={Colors.primaryForeground} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* YouTube Embed Info Modal */}
      <Modal
        visible={youtubeInfoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setYoutubeInfoModalVisible(false)}
      >
        <View style={styles.youtubeModal}>
          <View style={styles.youtubeContainer}>
            <View style={styles.youtubeHeader}>
              <View style={styles.youtubeTitleRow}>
                <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                <Text style={styles.youtubeTitle}>YouTube Embed Link Info</Text>
              </View>
              <TouchableOpacity
                onPress={() => setYoutubeInfoModalVisible(false)}
                style={styles.youtubeCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.youtubeScrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.youtubeDescription}>
                To ensure videos play correctly within the app, please use a YouTube embed link.
              </Text>

              <View style={styles.youtubeSection}>
                <Text style={styles.youtubeSectionTitle}>What is an embed link?</Text>
                <Text style={styles.youtubeSectionText}>
                  An embed link is a special URL format that allows a YouTube video to be displayed directly on another website. It looks different from the regular video link you see in your browser's address bar.
                </Text>
              </View>

              <View style={styles.youtubeSection}>
                <Text style={styles.youtubeSectionTitle}>How to get a YouTube embed link:</Text>
                <View style={styles.youtubeStepsList}>
                  <Text style={styles.youtubeStep}>1. Go to the YouTube video you want to use</Text>
                  <Text style={styles.youtubeStep}>2. Click the "Share" button below the video</Text>
                  <Text style={styles.youtubeStep}>3. Click the "Embed" option</Text>
                  <Text style={styles.youtubeStep}>4. Look for the src attribute within the iframe tag</Text>
                  <Text style={styles.youtubeStep}>5. Copy only the URL inside the src attribute</Text>
                  <Text style={styles.youtubeStep}>6. Paste this embed URL into the Video URL field</Text>
                </View>
              </View>

              <View style={styles.youtubeSection}>
                <Text style={styles.youtubeSectionTitle}>Example:</Text>
                <View style={styles.youtubeExample}>
                  <Text style={styles.youtubeExampleLabel}>Regular Link:</Text>
                  <Text style={styles.youtubeExampleUrl}>https://www.youtube.com/watch?v=dQw4w9WgXcQ</Text>
                </View>
                <View style={styles.youtubeExample}>
                  <Text style={styles.youtubeExampleLabel}>Embed Link:</Text>
                  <Text style={styles.youtubeExampleUrl}>https://www.youtube.com/embed/dQw4w9WgXcQ</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.youtubeGotItButton}
              onPress={() => setYoutubeInfoModalVisible(false)}
            >
              <Text style={styles.youtubeGotItButtonText}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  const handleAddExercise = useCallback(async (exerciseData: any) => {
    // This would be implemented to call the add function from useExerciseData
    console.log('Add exercise:', exerciseData);
    // TODO: Implement actual exercise creation logic
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontFamily: 'Poppins_600SemiBold',
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: Spacing.md,
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  formField: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
    fontFamily: 'Poppins_500Medium',
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  infoButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  youtubeModal: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '80%',
    width: '90%',
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  youtubeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  youtubeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  youtubeTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.foreground,
  },
  youtubeCloseButton: {
    padding: Spacing.xs,
  },
  youtubeScrollContent: {
    padding: Spacing.lg,
    maxHeight: 400,
  },
  youtubeDescription: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  youtubeSection: {
    marginBottom: Spacing.lg,
  },
  youtubeSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  youtubeSectionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  youtubeStepsList: {
    gap: Spacing.xs,
  },
  youtubeStep: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  youtubeExample: {
    marginBottom: Spacing.sm,
  },
  youtubeExampleLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  youtubeExampleUrl: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.mutedForeground,
    backgroundColor: Colors.card,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  youtubeGotItButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    margin: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  youtubeGotItButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.primaryForeground,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    ...TextStyles.body,
    color: Colors.foreground,
    fontFamily: 'Poppins_400Regular',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownButtonText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: Colors.foreground,
    flex: 1,
  },
  dropdownModal: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '60%',
    width: '80%',
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.foreground,
  },
  dropdownCloseButton: {
    padding: Spacing.xs,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: Colors.foreground,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.muted,
  },
  dropdownItemTextSelected: {
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  dropdownCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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