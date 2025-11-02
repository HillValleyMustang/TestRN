import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { X, Search } from 'lucide-react-native';
import { useExerciseData } from '../../hooks/useExerciseData';
import { useAuth } from '../../app/_contexts/auth-context';
import { supabase } from '../../app/_lib/supabase';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface ExerciseSwapModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: any) => void;
  currentExerciseId?: string;
}

export const ExerciseSwapModal: React.FC<ExerciseSwapModalProps> = ({
  visible,
  onClose,
  onSelectExercise,
  currentExerciseId,
}) => {
  const { userId } = useAuth();
  const { globalExercises, userExercises, loading } = useExerciseData({ supabase });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('');

  const allExercises = useMemo(() => {
    const combined = [...(globalExercises || []), ...(userExercises || [])];
    // Remove current exercise from list
    return combined.filter(ex => ex.id !== currentExerciseId);
  }, [globalExercises, userExercises, currentExerciseId]);

  const muscleGroups = useMemo(() => {
    const groups = new Set<string>();
    allExercises.forEach(exercise => {
      if (exercise.main_muscle) {
        groups.add(exercise.main_muscle);
      }
    });
    return Array.from(groups).sort();
  }, [allExercises]);

  const filteredExercises = useMemo(() => {
    let filtered = allExercises;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(query) ||
        exercise.main_muscle?.toLowerCase().includes(query)
      );
    }

    // Filter by muscle group
    if (selectedMuscleGroup) {
      filtered = filtered.filter(exercise =>
        exercise.main_muscle === selectedMuscleGroup
      );
    }

    return filtered;
  }, [allExercises, searchQuery, selectedMuscleGroup]);

  const handleSelectExercise = (exercise: any) => {
    onSelectExercise(exercise);
    onClose();
  };

  const renderExerciseItem = ({ item }: { item: any }) => (
    <Pressable
      style={({ pressed }) => [
        styles.exerciseItem,
        pressed && styles.exerciseItemPressed,
      ]}
      onPress={() => handleSelectExercise(item)}
    >
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseMuscle}>
          {item.main_muscle?.charAt(0).toUpperCase() + item.main_muscle?.slice(1)}
        </Text>
      </View>
      <Text style={styles.exerciseType}>
        {item.user_id ? 'Custom' : 'Global'}
      </Text>
    </Pressable>
  );

  const renderMuscleGroupFilter = () => (
    <View style={styles.filterContainer}>
      <Pressable
        style={[
          styles.filterChip,
          !selectedMuscleGroup && styles.filterChipActive,
        ]}
        onPress={() => setSelectedMuscleGroup('')}
      >
        <Text
          style={[
            styles.filterChipText,
            !selectedMuscleGroup && styles.filterChipTextActive,
          ]}
        >
          All
        </Text>
      </Pressable>
      {muscleGroups.map(group => (
        <Pressable
          key={group}
          style={[
            styles.filterChip,
            selectedMuscleGroup === group && styles.filterChipActive,
          ]}
          onPress={() => setSelectedMuscleGroup(group)}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedMuscleGroup === group && styles.filterChipTextActive,
            ]}
          >
            {group.charAt(0).toUpperCase() + group.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Swap Exercise</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {renderMuscleGroupFilter()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading exercises...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id || `exercise-${Math.random()}`}
            renderItem={renderExerciseItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    ...TextStyles.body,
    color: Colors.foreground,
    paddingVertical: Spacing.sm,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  filterChipTextActive: {
    color: Colors.primaryForeground,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  listContent: {
    padding: Spacing.lg,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    marginBottom: Spacing.xs,
  },
  exerciseItemPressed: {
    backgroundColor: Colors.muted,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...TextStyles.body,
    color: Colors.foreground,
    marginBottom: 2,
  },
  exerciseMuscle: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  exerciseType: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
});