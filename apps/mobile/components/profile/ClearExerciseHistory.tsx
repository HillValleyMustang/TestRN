/**
 * ClearExerciseHistory Component
 * A modal dialog for clearing exercise history
 * Features: FlatList, multi-select, search, time filtering, data preview, confirmation dialog
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { useAuth } from '../../app/_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface ExerciseItem {
  id: string;
  name: string;
  main_muscle: string;
  total_sets: number;
  last_workout: string;
  pb_weight?: number;
  pb_reps?: number;
  selected: boolean;
}

interface DataPreview {
  workoutsCount: number;
  exercisesCount: number;
  prsCount: number;
}

interface ClearExerciseHistoryProps {
  visible: boolean;
  onClose: () => void;
  onDataCleared?: () => void;
}

const TIME_PERIODS = [
  { key: 'all', label: 'All Time' },
  { key: '2weeks', label: '2 Weeks' },
  { key: '1month', label: '1 Month' },
  { key: '3months', label: '3 Months' },
  { key: '6months', label: '6 Months' },
  { key: '1year', label: '1 Year' },
  { key: '2years', label: '2 Years' },
];

export const ClearExerciseHistory: React.FC<ClearExerciseHistoryProps> = ({ visible, onClose, onDataCleared }) => {
  const { userId, supabase } = useAuth();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // State
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timePeriod, setTimePeriod] = useState('all');
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // Load exercises on mount
  useEffect(() => {
    loadExercises();
  }, []);

  // Update preview when selections change
  useEffect(() => {
    if (exercises.length > 0) {
      calculateDataPreview();
    }
  }, [exercises, timePeriod]);

  const loadExercises = async () => {
    if (!userId) {
      console.log('[ClearExerciseHistory] No userId, returning');
      return;
    }

    try {
      setIsLoading(true);
      console.log('[ClearExerciseHistory] Loading exercises for user:', userId);

      // Get all exercise IDs the user has worked out
      const { data: exerciseIdsData, error: idsError } = await supabase
        .from('set_logs')
        .select('exercise_id, workout_sessions!inner(user_id)')
        .eq('workout_sessions.user_id', userId);

      if (idsError) {
        console.error('[ClearExerciseHistory] Error fetching exercise IDs:', idsError);
        throw idsError;
      }

      console.log('[ClearExerciseHistory] Found exercise IDs data:', exerciseIdsData?.length);

      if (!exerciseIdsData?.length) {
        console.log('[ClearExerciseHistory] No exercise data found');
        setExercises([]);
        return;
      }

      // Get unique exercise IDs
      const exerciseIds = [...new Set(exerciseIdsData.map(log => log.exercise_id))];
      console.log('[ClearExerciseHistory] Unique exercise IDs:', exerciseIds);

      // Fetch exercise details and stats
      const exercisesWithStats = await Promise.all(
        exerciseIds.map(async (exerciseId) => {
          console.log('[ClearExerciseHistory] Processing exercise:', exerciseId);

          // Get exercise details
          const { data: exercise, error: exerciseError } = await supabase
            .from('exercise_definitions')
            .select('id, name, main_muscle')
            .eq('id', exerciseId)
            .single();

          if (exerciseError) {
            console.error('[ClearExerciseHistory] Error fetching exercise details:', exerciseError);
            return null;
          }

          if (!exercise) {
            console.log('[ClearExerciseHistory] No exercise found for ID:', exerciseId);
            return null;
          }

          console.log('[ClearExerciseHistory] Exercise details:', exercise);

          // Get workout stats
          const { data: setsData, error: setsError } = await supabase
            .from('set_logs')
            .select('id, weight_kg, reps, is_pb, workout_sessions!inner(created_at)')
            .eq('exercise_id', exerciseId)
            .eq('workout_sessions.user_id', userId)
            .order('created_at', { ascending: false });

          if (setsError) {
            console.error('[ClearExerciseHistory] Error fetching sets data:', setsError);
            return null;
          }

          const totalSets = setsData?.length || 0;
          const lastWorkout = (setsData?.[0] as any)?.workout_sessions?.created_at || '';

          console.log('[ClearExerciseHistory] Sets data for exercise:', exerciseId, setsData);

          // Find PB (highest weight for most reps)
          const pbRecord = setsData
            ?.filter(set => set.is_pb)
            ?.sort((a, b) => {
              if (a.weight_kg !== b.weight_kg) return (b.weight_kg || 0) - (a.weight_kg || 0);
              return (b.reps || 0) - (a.reps || 0);
            })?.[0];

          console.log('[ClearExerciseHistory] PB record for exercise:', exerciseId, pbRecord);

          const exerciseItem = {
            id: exercise.id,
            name: exercise.name,
            main_muscle: exercise.main_muscle,
            total_sets: totalSets,
            last_workout: lastWorkout,
            pb_weight: pbRecord?.weight_kg,
            pb_reps: pbRecord?.reps,
            selected: false,
          };

          console.log('[ClearExerciseHistory] Created exercise item:', exerciseItem);
          return exerciseItem;
        })
      );

      const filteredExercises = exercisesWithStats.filter(Boolean) as ExerciseItem[];
      console.log('[ClearExerciseHistory] Final exercises list:', filteredExercises);
      setExercises(filteredExercises);
    } catch (error) {
      console.error('[ClearExerciseHistory] Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDataPreview = async () => {
    const selectedExercises = exercises.filter(ex => ex.selected);
    if (selectedExercises.length === 0) {
      setDataPreview({ workoutsCount: 0, exercisesCount: 0, prsCount: 0 });
      return;
    }

    try {
      const selectedIds = selectedExercises.map(ex => ex.id);
      const cutoffDate = timePeriod !== 'all' ? getCutoffDate(timePeriod) : null;

      // Count affected workouts
      let workoutQuery = supabase
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (cutoffDate) {
        workoutQuery = workoutQuery.lt('created_at', cutoffDate);
      }

      // Get session IDs that contain selected exercises
      const { data: sessionIds } = await supabase
        .from('set_logs')
        .select('session_id')
        .in('exercise_id', selectedIds);

      if (sessionIds?.length) {
        const uniqueSessionIds = [...new Set(sessionIds.map(s => s.session_id))];
        workoutQuery = workoutQuery.in('id', uniqueSessionIds);
      } else {
        setDataPreview({ workoutsCount: 0, exercisesCount: selectedExercises.length, prsCount: 0 });
        return;
      }

      // Count PRs
      let prQuery = supabase
        .from('set_logs')
        .select('id', { count: 'exact', head: true })
        .in('exercise_id', selectedIds)
        .eq('is_pb', true);

      if (cutoffDate) {
        prQuery = prQuery.lt('created_at', cutoffDate);
      }

      const [workoutsRes, prsRes] = await Promise.all([
        workoutQuery,
        prQuery,
      ]);

      setDataPreview({
        workoutsCount: workoutsRes.count || 0,
        exercisesCount: selectedExercises.length,
        prsCount: prsRes.count || 0,
      });
    } catch (error) {
      console.error('[ClearExerciseHistory] Error calculating preview:', error);
    }
  };

  const getCutoffDate = (period: string): string => {
    const now = new Date();
    switch (period) {
      case '2weeks': now.setDate(now.getDate() - 14); break;
      case '1month': now.setMonth(now.getMonth() - 1); break;
      case '3months': now.setMonth(now.getMonth() - 3); break;
      case '6months': now.setMonth(now.getMonth() - 6); break;
      case '1year': now.setFullYear(now.getFullYear() - 1); break;
      case '2years': now.setFullYear(now.getFullYear() - 2); break;
    }
    return now.toISOString();
  };

  const filteredExercises = useMemo(() => {
    const filtered = exercises.filter(exercise =>
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.main_muscle.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log('[ClearExerciseHistory] Filtered exercises:', filtered.length, 'from', exercises.length);
    return filtered;
  }, [exercises, searchQuery]);

  const selectedCount = exercises.filter(ex => ex.selected).length;
  const allSelected = exercises.length > 0 && selectedCount === exercises.length;

  const toggleExerciseSelection = (exerciseId: string) => {
    setExercises(prev => prev.map(ex =>
      ex.id === exerciseId ? { ...ex, selected: !ex.selected } : ex
    ));
  };

  const toggleSelectAll = () => {
    const newSelected = !allSelected;
    setExercises(prev => prev.map(ex => ({ ...ex, selected: newSelected })));
  };

  const handleClearData = async () => {
    const selectedExercises = exercises.filter(ex => ex.selected);
    if (selectedExercises.length === 0) {
      Alert.alert('No Selection', 'Please select at least one exercise to clear.');
      return;
    }

    const exerciseNames = selectedExercises.map(ex => ex.name).join(', ');
    const timeText = timePeriod !== 'all' ? ` from the last ${TIME_PERIODS.find(p => p.key === timePeriod)?.label.toLowerCase()}` : '';

    Alert.alert(
      'Confirm Data Clearing',
      `This will permanently delete all workout data for ${selectedExercises.length} exercise${selectedExercises.length !== 1 ? 's' : ''}${timeText}: ${exerciseNames}.\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: performDataClearing,
        },
      ]
    );
  };

  const performDataClearing = async () => {
    const selectedIds = exercises.filter(ex => ex.selected).map(ex => ex.id);
    if (selectedIds.length === 0) return;

    try {
      setIsClearing(true);
      const cutoffDate = timePeriod !== 'all' ? getCutoffDate(timePeriod) : null;

      // Get all session IDs that contain the selected exercises
      let sessionQuery = supabase
        .from('set_logs')
        .select('session_id')
        .in('exercise_id', selectedIds);

      if (cutoffDate) {
        sessionQuery = sessionQuery.lt('created_at', cutoffDate);
      }

      const { data: sessionsWithExercises } = await sessionQuery;
      if (!sessionsWithExercises?.length) return;

      const sessionIds = [...new Set(sessionsWithExercises.map(s => s.session_id))];

      // For each session, check if it contains only selected exercises
      for (const sessionId of sessionIds) {
        const { data: allSetsInSession } = await supabase
          .from('set_logs')
          .select('exercise_id')
          .eq('session_id', sessionId);

        if (!allSetsInSession) continue;

        const exercisesInSession = [...new Set(allSetsInSession.map(s => s.exercise_id))];
        const onlySelectedExercises = exercisesInSession.every(exId => selectedIds.includes(exId));

        if (onlySelectedExercises) {
          // Delete entire session
          await supabase.from('set_logs').delete().eq('session_id', sessionId);
          await supabase.from('workout_sessions').delete().eq('id', sessionId);
        } else {
          // Delete only selected exercises from session
          await supabase
            .from('set_logs')
            .delete()
            .eq('session_id', sessionId)
            .in('exercise_id', selectedIds);
        }
      }

      Alert.alert('Success', 'Exercise history has been cleared successfully.');
      onDataCleared?.();

      // Reset selections and reload
      setExercises(prev => prev.map(ex => ({ ...ex, selected: false })));
      setSearchQuery('');
      await loadExercises();
    } catch (error) {
      console.error('[ClearExerciseHistory] Error clearing data:', error);
      Alert.alert('Error', 'Failed to clear exercise history. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const renderExerciseItem = ({ item }: { item: ExerciseItem }) => (
    <TouchableOpacity
      style={[styles.exerciseItem, item.selected && styles.exerciseItemSelected]}
      onPress={() => toggleExerciseSelection(item.id)}
    >
      <View style={styles.checkboxContainer}>
        {item.selected ? (
          <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
        ) : (
          <View style={styles.checkboxEmpty} />
        )}
      </View>

      <View style={styles.exerciseContent}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseDetails}>
          Last: {item.last_workout ? new Date(item.last_workout).toLocaleDateString() : 'Never'}
          {item.pb_weight && item.pb_reps && (
            <Text style={styles.pbText}> • PB: {item.pb_weight}kg × {item.pb_reps}</Text>
          )}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading exercises...</Text>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Content */}
        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Close Button */}
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Ionicons name="barbell" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Clear Exercise History</Text>
            <Text style={styles.heroSubtitle}>
              Select exercises to permanently remove from your workout data
            </Text>
          </View>

          {/* Time Period Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Period</Text>
            <Text style={styles.sectionSubtitle}>Limit clearing to specific time ranges</Text>
            <View style={styles.timePeriodGrid}>
              {TIME_PERIODS.map((period) => (
                <TouchableOpacity
                  key={period.key}
                  style={[styles.timePeriodButton, timePeriod === period.key && styles.timePeriodButtonActive]}
                  onPress={() => setTimePeriod(period.key)}
                >
                  <Text style={[styles.timePeriodText, timePeriod === period.key && styles.timePeriodTextActive]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Search and Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Find Exercises</Text>
            <View style={styles.controlsContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search exercises..."
                placeholderTextColor={Colors.mutedForeground}
              />
              <TouchableOpacity style={styles.selectAllButton} onPress={toggleSelectAll}>
                <Text style={styles.selectAllText}>
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Selection Summary */}
          {selectedCount > 0 && (
            <View style={styles.selectionSummary}>
              <View style={styles.selectionIcon}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
              </View>
              <Text style={styles.selectionText}>
                {selectedCount} of {filteredExercises.length} selected
              </Text>
            </View>
          )}

          {/* Exercise List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Exercises</Text>
            <Text style={styles.sectionSubtitle}>Tap to select exercises for clearing</Text>

            <View style={styles.exerciseList}>
              {filteredExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[styles.exerciseItem, exercise.selected && styles.exerciseItemSelected]}
                  onPress={() => toggleExerciseSelection(exercise.id)}
                >
                  <View style={styles.checkboxContainer}>
                    {exercise.selected ? (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                    ) : (
                      <View style={styles.checkboxEmpty} />
                    )}
                  </View>
                  <View style={styles.exerciseContent}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.main_muscle} • {exercise.total_sets} sets • Last: {exercise.last_workout ? new Date(exercise.last_workout).toLocaleDateString() : 'Never'}
                      {exercise.pb_weight && exercise.pb_reps && (
                        <Text style={styles.pbText}> • PB: {exercise.pb_weight}kg × {exercise.pb_reps}</Text>
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {filteredExercises.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="barbell" size={48} color={Colors.mutedForeground} />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No exercises match your search' : 'No exercises found'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Data Preview */}
          {dataPreview && selectedCount > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data Impact</Text>
              <Text style={styles.sectionSubtitle}>Review what will be cleared</Text>

              <View style={styles.previewContainer}>
                <View style={styles.previewStats}>
                  {dataPreview.workoutsCount > 0 && (
                    <View style={styles.previewStat}>
                      <Ionicons name="fitness" size={20} color={Colors.mutedForeground} />
                      <Text style={styles.previewStatText}>
                        {dataPreview.workoutsCount} workout{dataPreview.workoutsCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                  <View style={styles.previewStat}>
                    <Ionicons name="barbell" size={20} color={Colors.mutedForeground} />
                    <Text style={styles.previewStatText}>
                      {dataPreview.exercisesCount} exercise{dataPreview.exercisesCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  {dataPreview.prsCount > 0 && (
                    <View style={styles.previewStat}>
                      <Ionicons name="trophy" size={20} color={Colors.mutedForeground} />
                      <Text style={styles.previewStatText}>
                        {dataPreview.prsCount} personal record{dataPreview.prsCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.clearButton, (selectedCount === 0 || isClearing) && styles.clearButtonDisabled]}
              onPress={handleClearData}
              disabled={selectedCount === 0 || isClearing}
            >
              {isClearing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.clearButtonText}>
                    Clear {selectedCount > 0 ? `${selectedCount} Exercise${selectedCount !== 1 ? 's' : ''}` : 'Selected Data'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionText: {
    ...TextStyles.body,
    color: Colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    marginLeft: Spacing.sm,
  },
  actionSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  closeButtonContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginTop: Spacing.md,
    fontFamily: 'Poppins_400Regular',
  },
  filterContainer: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  filterLabel: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  timePeriodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timePeriodButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 1,
    elevation: 1,
  },
  timePeriodButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timePeriodText: {
    ...TextStyles.caption,
    color: Colors.foreground,
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  timePeriodTextActive: {
    color: Colors.white,
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    ...TextStyles.body,
    color: Colors.foreground,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  selectAllButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
  },
  selectAllText: {
    ...TextStyles.buttonSmall,
    color: Colors.primary,
    fontFamily: 'Poppins_500Medium',
  },
  summaryContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  exerciseList: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.card,
    marginBottom: Spacing.sm,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 60,
  },
  exerciseItemSelected: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  checkboxContainer: {
    marginRight: Spacing.md,
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: 2,
    fontFamily: 'Poppins_600SemiBold',
  },
  exerciseDetails: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  pbText: {
    ...TextStyles.caption,
    color: Colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontFamily: 'Poppins_400Regular',
  },
  previewContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  previewTitle: {
    ...TextStyles.h6,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    fontFamily: 'Poppins_600SemiBold',
  },
  previewStats: {
    gap: Spacing.sm,
  },
  previewStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewStatText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.destructive,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  clearButtonText: {
    ...TextStyles.buttonSmall,
    color: Colors.white,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalContent: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    ...TextStyles.h3,
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontFamily: 'Poppins_600SemiBold',
  },
  heroSubtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    ...TextStyles.h6,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
    fontFamily: 'Poppins_600SemiBold',
  },
  sectionSubtitle: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginBottom: Spacing.sm,
    fontFamily: 'Poppins_400Regular',
  },
});