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
import { useAuth } from '../../app/_contexts/auth-context';
import { getWorkoutColor } from '../../lib/workout-colors';
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
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
  availableMuscleGroups: string[];
  supabase: any;
  userId: string | null;
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
  exerciseGymsMap: Record<string, string[]>;
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void;
  onDeleteExercise: (exercise: FetchedExerciseDefinition) => void;
  onAddToWorkout: (exercise: FetchedExerciseDefinition) => void;
  onEditExercise: (exercise: FetchedExerciseDefinition) => void;
  onInfoPress: (exercise: FetchedExerciseDefinition) => void;
  onManageGyms: (exercise: FetchedExerciseDefinition) => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({
  exercise,
  exerciseGymsMap,
  exerciseWorkoutsMap,
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
                    name={exercise.is_favorite || exercise.is_favorited_by_current_user ? "heart" : "heart-outline"}
                    size={20}
                    color={exercise.is_favorite || exercise.is_favorited_by_current_user ? "#ef4444" : Colors.mutedForeground}
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

          {/* Gym tags */}
          {exerciseGymsMap && exerciseGymsMap[exercise.id as string] && exerciseGymsMap[exercise.id as string].length > 0 && (
            <View style={styles.exerciseGyms}>
              {exerciseGymsMap[exercise.id as string].map((gymName, index) => (
                <View key={index} style={styles.exerciseGymTag}>
                  <Ionicons name="business" size={12} color={Colors.secondaryForeground} />
                  <Text style={styles.exerciseGymTagText}>{gymName}</Text>
                </View>
              ))}
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
  availableMuscleGroups: string[];
}

const AddExerciseForm: React.FC<AddExerciseFormProps> = ({ onAddExercise, loading, availableMuscleGroups }) => {
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
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalMessage, setInfoModalMessage] = useState('');

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

  const showInfoModal = useCallback((title: string, message: string) => {
    setInfoModalTitle(title);
    setInfoModalMessage(message);
    setInfoModalVisible(true);
  }, []);

  const hideInfoModal = useCallback(() => {
    setInfoModalVisible(false);
    setInfoModalTitle('');
    setInfoModalMessage('');
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
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="add-circle" size={28} color={Colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.formTitle}>Create Exercise</Text>
            <Text style={styles.formSubtitle}>Build your personal exercise library</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={() => setIsExpanded(false)}>
          <Ionicons name="close" size={24} color={Colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        {/* Essential Info Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderCentered}>
            <Ionicons name="star" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Essential Information</Text>
          </View>

          <View style={styles.formField}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Exercise Name *</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Bench Press, Squat, Deadlift"
              placeholderTextColor={Colors.mutedForeground}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Target Muscles *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => handleDropdownToggle('muscle')}
            >
              <Text style={[styles.dropdownButtonText, selectedMuscles.length === 0 && styles.placeholderText]}>
                {selectedMuscles.length > 0 ? `${selectedMuscles.length} selected` : 'Select primary muscle groups'}
              </Text>
              <Ionicons
                name={dropdownVisible === 'muscle' ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Exercise Type *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => handleDropdownToggle('type')}
            >
              <Text style={[styles.dropdownButtonText, !type && styles.placeholderText]}>
                {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Choose exercise category'}
              </Text>
              <Ionicons
                name={dropdownVisible === 'type' ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Advanced Details Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderCentered}>
            <Ionicons name="bulb-outline" size={18} color={Colors.foreground} />
            <Text style={styles.sectionTitle}>Advanced Details</Text>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formField, styles.halfField]}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => showInfoModal('Category', 'Choose whether this exercise is performed with one limb (unilateral) or both limbs together (bilateral).')}
                >
                  <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => handleDropdownToggle('category')}
              >
                <Text style={[styles.dropdownButtonText, !category && styles.placeholderText]}>
                  {category || 'Category'}
                </Text>
                <Ionicons
                  name={dropdownVisible === 'category' ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={Colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.formField, styles.halfField]}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>Movement</Text>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => showInfoModal('Movement Type', 'Compound exercises work multiple joints and muscle groups. Isolation exercises target a single muscle group.')}
                >
                  <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => handleDropdownToggle('movementType')}
              >
                <Text style={[styles.dropdownButtonText, !movementType && styles.placeholderText]}>
                  {movementType ? movementType.charAt(0).toUpperCase() + movementType.slice(1) : 'Type'}
                </Text>
                <Ionicons
                  name={dropdownVisible === 'movementType' ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={Colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Movement Pattern</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => handleDropdownToggle('movementPattern')}
            >
              <Text style={[styles.dropdownButtonText, !movementPattern && styles.placeholderText]}>
                {movementPattern || 'Select movement pattern'}
              </Text>
              <Ionicons
                name={dropdownVisible === 'movementPattern' ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content & Media Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="videocam-outline" size={18} color={Colors.foreground} />
            <Text style={styles.sectionTitle}>Content & Media</Text>
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the exercise, form cues, or execution tips"
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
              placeholder="Share a professional tip or common mistake to avoid"
              placeholderTextColor={Colors.mutedForeground}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.formField}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Demo Video</Text>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setYoutubeInfoModalVisible(true)}
              >
                <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="YouTube embed URL for demonstration"
              placeholderTextColor={Colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.iconCancelButton]}
            onPress={() => setIsExpanded(false)}
          >
            <Ionicons name="close" size={24} color={Colors.mutedForeground} />
          </TouchableOpacity>

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
                <Text style={styles.submitButtonText}>Create Exercise</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

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
                {dropdownVisible === 'muscle' ? 'Select Muscle Group(s)' : 'Select Type'}
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
                  ? availableMuscleGroups.map(muscle => ({ label: muscle, value: muscle })).sort((a, b) => a.label.localeCompare(b.label))
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

      {/* Custom Info Modal */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={hideInfoModal}
      >
        <View style={styles.infoModal}>
          <View style={styles.infoContainer}>
            <View style={styles.infoHeader}>
              <View style={styles.infoIcon}>
                <Ionicons name="information-circle" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.infoTitle}>{infoModalTitle}</Text>
              <TouchableOpacity
                onPress={hideInfoModal}
                style={styles.infoCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.infoMessage}>{infoModalMessage}</Text>

            <TouchableOpacity
              style={styles.infoGotItButton}
              onPress={hideInfoModal}
            >
              <Text style={styles.infoGotItButtonText}>Got it</Text>
            </TouchableOpacity>
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
  exerciseWorkoutsMap,
  availableMuscleGroups,
  supabase,
  userId,
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
    try {
      if (!userId) {
        Alert.alert('Error', 'You must be logged in to create exercises.');
        return;
      }

      const exercisePayload = {
        name: exerciseData.name,
        main_muscle: exerciseData.main_muscle,
        type: exerciseData.type,
        category: exerciseData.category || null,
        description: exerciseData.description || null,
        pro_tip: exerciseData.pro_tip || null,
        video_url: exerciseData.video_url || null,
        movement_type: exerciseData.movement_type || null,
        movement_pattern: exerciseData.movement_pattern || null,
        user_id: userId,
        library_id: null,
        is_favorite: false,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('exercise_definitions')
        .insert([exercisePayload]);

      if (error) {
        console.error('Failed to create exercise:', error);
        Alert.alert('Error', 'Failed to create exercise. Please try again.');
        return;
      }

      Alert.alert('Success', 'Exercise created successfully!');
      onRefreshData();
    } catch (error) {
      console.error('Failed to add exercise:', error);
      Alert.alert('Error', 'Failed to create exercise. Please try again.');
    }
  }, [supabase, userId, onRefreshData]);

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
      exerciseGymsMap={exerciseGymsMap}
      exerciseWorkoutsMap={exerciseWorkoutsMap}
      onToggleFavorite={onToggleFavorite}
      onDeleteExercise={onDeleteExercise}
      onAddToWorkout={onAddToWorkout}
      onEditExercise={handleEditExercise}
      onInfoPress={handleInfoPress}
      onManageGyms={handleManageGyms}
    />
  ), [exerciseGymsMap, exerciseWorkoutsMap, onToggleFavorite, onDeleteExercise, onAddToWorkout, handleEditExercise, handleInfoPress, handleManageGyms]);

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
      <AddExerciseForm onAddExercise={handleAddExercise} loading={false} availableMuscleGroups={availableMuscleGroups} />
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
        onAddSuccess={onRefreshData}
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
  listContent: {
    paddingBottom: Spacing.md,
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
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15', // 15 = 9% opacity
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  formSubtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  closeButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.muted + '30', // 30 = 19% opacity
  },
  formScroll: {
    flex: 1,
  },
  formTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30', // 30 = 19% opacity
    gap: Spacing.sm,
  },
  sectionHeaderCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30', // 30 = 19% opacity
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginLeft: Spacing.sm,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
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
  infoModal: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: '85%',
    width: '85%',
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15', // 15 = 9% opacity
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.foreground,
    flex: 1,
  },
  infoCloseButton: {
    padding: Spacing.xs,
  },
  infoMessage: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: Colors.mutedForeground,
    lineHeight: 24,
    padding: Spacing.lg,
    textAlign: 'center',
  },
  infoGotItButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    margin: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  infoGotItButtonText: {
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
  primaryInput: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primary + '05', // 5% opacity
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
  primaryDropdown: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primary + '05', // 5% opacity
  },
  dropdownButtonText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: Colors.foreground,
    flex: 1,
  },
  placeholderText: {
    color: Colors.mutedForeground,
  },
  centerText: {
    textAlign: 'center',
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
    fontFamily: 'Poppins_600SemiBold',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border + '30', // 30 = 19% opacity
  },
  iconCancelButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    fontFamily: 'Poppins_500Medium',
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
  exerciseGyms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  exerciseGymTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  exerciseGymTagText: {
    ...TextStyles.bodySmall,
    color: Colors.accentForeground,
    fontWeight: '500',
  },
  exerciseBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
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