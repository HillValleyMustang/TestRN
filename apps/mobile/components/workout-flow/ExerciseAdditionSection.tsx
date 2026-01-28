/**
 * ExerciseAdditionSection Component
 * UI to search, filter, and add exercises to an ad-hoc workout session
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import Dropdown from '../../app/_components/ui/Dropdown';
import { useExerciseData } from '../../hooks/useExerciseData';
import { AnalyseGymPhotoDialog } from '../profile/AnalyseGymPhotoDialog';
import { ExerciseInfoModal } from '../workout/ExerciseInfoModal';
import { supabase } from '../../app/_lib/supabase';
import Toast from 'react-native-toast-message';
import type { FetchedExerciseDefinition } from '../../app/_lib/supabase';
import type { Gym } from '@data/storage/models';

interface ExerciseAdditionSectionProps {
  onAddExercise: (exercise: any) => Promise<void>;
  onRemoveExercise?: (exerciseId: string) => Promise<void>;
  activeGym: Gym | null;
  existingExerciseIds: Set<string>;
}

export function ExerciseAdditionSection({
  onAddExercise,
  onRemoveExercise,
  activeGym,
  existingExerciseIds,
}: ExerciseAdditionSectionProps) {
  const {
    allExercises,
    userGyms,
    loading,
    searchTerm,
    setSearchTerm,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    selectedGymFilter,
    setSelectedGymFilter,
    availableMuscleGroups,
  } = useExerciseData({ supabase });

  const [libraryTab, setLibraryTab] = useState<'my' | 'global'>('my');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAnalyseDialog, setShowAnalyseDialog] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<FetchedExerciseDefinition | null>(null);

  const filteredExercises = useMemo(() => {
    return allExercises.filter(ex => {
      // Library Tab Filter
      if (libraryTab === 'my') {
        if (ex.user_id === null) return false;
      } else {
        if (ex.user_id !== null) return false;
      }

      // Muscle Filter
      if (selectedMuscleFilter !== 'all' && ex.main_muscle !== selectedMuscleFilter) {
        return false;
      }

      // Favorites Filter
      if (showFavoritesOnly && !ex.is_favorited_by_current_user && !ex.is_favorite) {
        return false;
      }

      // Search Term Filter
      if (searchTerm && !ex.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Gym Filter (if implemented in useExerciseData)
      // Note: useExerciseData already handles gym filtering if selectedGymFilter is set
      
      return true;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allExercises, libraryTab, selectedMuscleFilter, showFavoritesOnly, searchTerm]);

  const handleToggleExercise = async (exercise: FetchedExerciseDefinition) => {
    const isAdded = existingExerciseIds.has(exercise.id!);

    if (isAdded) {
      // Remove exercise
      if (onRemoveExercise) {
        await onRemoveExercise(exercise.id!);
        Toast.show({
          type: 'info',
          text1: 'Exercise Removed',
          text2: `${exercise.name} removed from your workout.`,
        });
      }
    } else {
      // Add exercise
      await onAddExercise(exercise);
      Toast.show({
        type: 'success',
        text1: 'Exercise Added',
        text2: `${exercise.name} added to your workout.`,
      });
    }
  };

  const muscleOptions = useMemo(() => [
    { label: 'All Muscles', value: 'all' },
    ...availableMuscleGroups.map(m => ({ label: m, value: m }))
  ], [availableMuscleGroups]);

  const gymOptions = useMemo(() => [
    { label: 'All Gyms', value: 'all' },
    ...userGyms.map(g => ({ label: g.name, value: g.id }))
  ], [userGyms]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Exercises</Text>
        
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, libraryTab === 'my' && styles.tabActive]}
            onPress={() => setLibraryTab('my')}
          >
            <Text style={[styles.tabText, libraryTab === 'my' && styles.tabTextActive]}>
              My Exercises
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, libraryTab === 'global' && styles.tabActive]}
            onPress={() => setLibraryTab('global')}
          >
            <Text style={[styles.tabText, libraryTab === 'global' && styles.tabTextActive]}>
              Global Library
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.dropdownRow}>
            <View style={styles.dropdownContainer}>
              <Dropdown
                items={muscleOptions}
                selectedValue={selectedMuscleFilter}
                onSelect={setSelectedMuscleFilter}
                placeholder="Muscle Group"
              />
            </View>
            <View style={styles.dropdownContainer}>
              <Dropdown
                items={gymOptions}
                selectedValue={selectedGymFilter}
                onSelect={setSelectedGymFilter}
                placeholder="Gym"
                disabled={userGyms.length === 0}
              />
            </View>
            <TouchableOpacity
              style={[styles.favoriteButton, showFavoritesOnly && styles.favoriteButtonActive]}
              onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Ionicons
                name={showFavoritesOnly ? "heart" : "heart-outline"}
                size={20}
                color={showFavoritesOnly ? Colors.white : Colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={Colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={Colors.mutedForeground}
            />
          </View>
        </View>

        {/* Exercise List */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {filteredExercises.length === 0 ? (
              <Text style={styles.emptyText}>No exercises found matching criteria.</Text>
            ) : (
              filteredExercises.map((item) => {
                const isAdded = existingExerciseIds.has(item.id!);
                return (
                  <View key={item.id} style={[styles.exerciseItem, isAdded && styles.exerciseItemAdded]}>
                    <TouchableOpacity
                      style={styles.exerciseItemTouchable}
                      onPress={() => handleToggleExercise(item)}
                    >
                      <View style={styles.exerciseInfo}>
                        <Text style={[styles.exerciseName, isAdded && styles.exerciseTextDisabled]}>
                          {item.name}
                        </Text>
                        <Text style={styles.exerciseMuscle}>
                          {item.main_muscle}
                        </Text>
                      </View>
                      {isAdded ? (
                        <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                      ) : (
                        <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.infoButton}
                      onPress={() => setSelectedExerciseForInfo(item)}
                    >
                      <Ionicons name="information-circle-outline" size={20} color={Colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Analyze Gym Button */}
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={() => setShowAnalyseDialog(true)}
        >
          <Ionicons name="camera" size={20} color={Colors.primary} />
          <Text style={styles.analyzeButtonText}>Analyze Gym Photo</Text>
        </TouchableOpacity>
      </View>

      <AnalyseGymPhotoDialog
        visible={showAnalyseDialog}
        gymId={activeGym?.id || ''}
        gymName={activeGym?.name || ''}
        onBack={() => setShowAnalyseDialog(false)}
        onFinish={() => setShowAnalyseDialog(false)}
        onExercisesGenerated={(exercises) => {
          // Handle AI identified exercises
          // This would typically show a prompt to add them
          setShowAnalyseDialog(false);
        }}
      />

      <ExerciseInfoModal
        exercise={selectedExerciseForInfo}
        visible={!!selectedExerciseForInfo}
        onClose={() => setSelectedExerciseForInfo(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.md,
    fontFamily: 'Poppins_700Bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_600SemiBold',
  },
  tabTextActive: {
    color: Colors.foreground,
  },
  filtersContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  dropdownContainer: {
    flex: 1,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  favoriteButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 40,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.foreground,
    paddingVertical: 0,
    fontFamily: 'Poppins_400Regular',
  },
  list: {
    maxHeight: 300,
  },
  listContent: {
    paddingBottom: Spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseItemAdded: {
    backgroundColor: Colors.muted,
  },
  exerciseItemTouchable: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  infoButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  exerciseTextDisabled: {
    color: Colors.mutedForeground,
  },
  exerciseMuscle: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.mutedForeground,
    paddingVertical: Spacing.lg,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  loader: {
    paddingVertical: Spacing.xl,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  analyzeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
});
