/**
 * Workout History Management Component
 * Allows users to clear workout history with different scope options
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../../app/_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { ClearExerciseHistory } from './ClearExerciseHistory';

interface ClearingOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const CLEARING_OPTIONS: ClearingOption[] = [
  {
    id: 'time-based',
    title: 'Clear Old Data',
    description: 'Remove workouts older than a selected time period',
    icon: 'time',
    color: '#3B82F6',
  },
  {
    id: 'exercise-specific',
    title: 'Clear Exercise History',
    description: 'Remove all data for specific exercises',
    icon: 'barbell',
    color: '#EC4899',
  },
  {
    id: 'reset-prs',
    title: 'Reset Personal Records',
    description: 'Remove PR flags while keeping workout logs',
    icon: 'trophy',
    color: '#F59E0B',
  },
  {
    id: 'complete-reset',
    title: 'Complete Reset',
    description: 'Remove all workout history and personal records',
    icon: 'trash',
    color: '#EF4444',
  },
];

interface DataPreview {
  workoutsCount: number;
  exercisesCount: number;
  prsCount: number;
  oldestWorkout?: string;
}

interface ExerciseOption {
  id: string;
  name: string;
  main_muscle: string;
  total_sets: number;
  last_workout: string;
  pb_weight?: number;
  pb_reps?: number;
  selected: boolean;
}



export const WorkoutHistoryManagement: React.FC = () => {
  const { userId, supabase } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  const [timePeriod, setTimePeriod] = useState<string>('6months');
  const [exerciseTimePeriod, setExerciseTimePeriod] = useState<string>('all');
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [showClearExerciseModal, setShowClearExerciseModal] = useState(false);

  useEffect(() => {
    if (selectedOption === 'exercise-specific') {
      fetchExercises();
    }
  }, [selectedOption]);

  const handleOptionSelect = async (optionId: string) => {
    setSelectedOption(optionId);
    setIsLoading(true);

    try {
      if (optionId === 'exercise-specific') {
        // Open modal directly when selecting exercise-specific option
        setShowClearExerciseModal(true);
        setIsLoading(false);
        return;
      } else {
        const preview = await fetchDataPreview(optionId);
        setDataPreview(preview);
      }
    } catch (error) {
      console.error('[WorkoutHistoryManagement] Error fetching preview:', error);
      Alert.alert('Error', 'Failed to load data preview');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExercises = async () => {
    if (!userId) return;

    setIsLoadingExercises(true);
    try {
      // Get all exercise IDs the user has worked out
      const { data: exerciseIdsData, error: idsError } = await supabase
        .from('set_logs')
        .select('exercise_id, workout_sessions!inner(user_id)')
        .eq('workout_sessions.user_id', userId);

      if (idsError) throw idsError;

      if (!exerciseIdsData?.length) {
        setExercises([]);
        setIsLoadingExercises(false);
        return;
      }

      // Get unique exercise IDs
      const exerciseIds = [...new Set(exerciseIdsData?.map(log => log.exercise_id) || [])];

      // Fetch exercise details
      const { data: exerciseDetails, error: detailsError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle')
        .in('id', exerciseIds);

      if (detailsError) throw detailsError;

      // Get stats for each exercise including PB records
      const exercisesWithStats: ExerciseOption[] = await Promise.all(
        exerciseDetails?.map(async (exercise) => {
          const { data: setsData } = await supabase
            .from('set_logs')
            .select('id, weight_kg, reps, is_pb, workout_sessions!inner(created_at)')
            .eq('exercise_id', exercise.id)
            .eq('workout_sessions.user_id', userId)
            .order('workout_sessions.created_at', { ascending: false });

          const totalSets = setsData?.length || 0;
          const lastWorkout = (setsData?.[0] as any)?.workout_sessions?.created_at || '';

          // Find the PB record (highest weight for the most reps)
          const pbRecord = setsData
            ?.filter(set => set.is_pb)
            ?.sort((a, b) => {
              if (a.weight_kg !== b.weight_kg) return (b.weight_kg || 0) - (a.weight_kg || 0);
              return (b.reps || 0) - (a.reps || 0);
            })?.[0];

          return {
            id: exercise.id,
            name: exercise.name,
            main_muscle: exercise.main_muscle,
            total_sets: totalSets,
            last_workout: lastWorkout,
            pb_weight: pbRecord?.weight_kg,
            pb_reps: pbRecord?.reps,
            selected: false,
          };
        }) || []
      );

      setExercises(exercisesWithStats);
    } catch (error) {
      console.error('[WorkoutHistoryManagement] Error fetching exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setIsLoadingExercises(false);
    }
  };

  const fetchDataPreview = async (optionId: string): Promise<DataPreview> => {
    if (!userId) throw new Error('No user ID');

    switch (optionId) {
      case 'time-based':
        return await fetchTimeBasedPreview();
      case 'exercise-specific':
        return { workoutsCount: 0, exercisesCount: 0, prsCount: 0 }; // Preview calculated in modal
      case 'reset-prs':
        return await fetchPRsPreview();
      case 'complete-reset':
        return await fetchCompleteResetPreview();
      default:
        throw new Error('Invalid option');
    }
  };

  const fetchTimeBasedPreview = async (): Promise<DataPreview> => {
    const cutoffDate = getCutoffDate(timePeriod);

    const [workoutsRes, prsRes] = await Promise.all([
      supabase
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .lt('created_at', cutoffDate),

      supabase
        .from('set_logs')
        .select('id', { count: 'exact', head: true })
        .eq('workout_sessions.user_id', userId)
        .eq('is_pb', true)
        .lt('workout_sessions.created_at', cutoffDate),
    ]);

    return {
      workoutsCount: workoutsRes.count || 0,
      exercisesCount: new Set((await supabase
        .from('set_logs')
        .select('exercise_id')
        .eq('workout_sessions.user_id', userId)
        .lt('workout_sessions.created_at', cutoffDate)).data?.map(s => s.exercise_id) || []).size,
      prsCount: prsRes.count || 0,
    };
  };



  const fetchPRsPreview = async (): Promise<DataPreview> => {
    const prsRes = await supabase
      .from('set_logs')
      .select('id', { count: 'exact', head: true })
      .eq('workout_sessions.user_id', userId)
      .eq('is_pb', true);

    return {
      workoutsCount: 0,
      exercisesCount: 0,
      prsCount: prsRes.count || 0,
    };
  };

  const fetchCompleteResetPreview = async (): Promise<DataPreview> => {
    const { count: completedWorkoutsCount } = await supabase
      .from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const [prsRes, oldestRes] = await Promise.all([
      supabase
        .from('set_logs')
        .select('id', { count: 'exact', head: true })
        .eq('workout_sessions.user_id', userId)
        .eq('is_pb', true),

      supabase
        .from('workout_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1),
    ]);

    return {
      workoutsCount: completedWorkoutsCount || 0,
      exercisesCount: new Set((await supabase
        .from('set_logs')
        .select('exercise_id')
        .eq('workout_sessions.user_id', userId)).data?.map(s => s.exercise_id) || []).size,
      prsCount: prsRes.count || 0,
      oldestWorkout: oldestRes.data?.[0]?.created_at,
    };
  };

  const getCutoffDate = (period: string): string => {
    const now = new Date();
    switch (period) {
      case '2weeks':
        now.setDate(now.getDate() - 14);
        break;
      case '1month':
        now.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        now.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        now.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        now.setFullYear(now.getFullYear() - 1);
        break;
      case '2years':
        now.setFullYear(now.getFullYear() - 2);
        break;
    }
    return now.toISOString();
  };

  const handleExportData = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises (name)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let csvContent = 'Date,Workout Name,Exercise,Sets,Reps,Weight,Notes\n';

      workouts?.forEach((workout) => {
        const workoutDate = new Date(workout.created_at).toLocaleDateString();
        const workoutName = workout.name || 'Unnamed Workout';

        workout.workout_exercises?.forEach((we: any) => {
          const exerciseName = we.exercise?.name || 'Unknown Exercise';
          const sets = we.sets || '';
          const reps = we.reps || '';
          const weight = we.weight || '';
          const notes = (workout.notes || '').replace(/"/g, '""');

          csvContent += `"${workoutDate}","${workoutName}","${exerciseName}","${sets}","${reps}","${weight}","${notes}"\n`;
        });
      });

      const fileName = `fitness_backup_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Backup Workout Data',
        });
      } else {
        Alert.alert('Success', `Backup saved to: ${fileUri}`);
      }
    } catch (error) {
      console.error('[WorkoutHistoryManagement] Export error:', error);
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!selectedOption || !dataPreview) return;

    const confirmMessage = getConfirmMessage(selectedOption, dataPreview);

    Alert.alert(
      'Confirm Data Clearing',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await performDataClearing(selectedOption);
              Alert.alert(
                'Success',
                'Your workout history has been cleared. You have 24 hours to restore it if needed.',
                [{ text: 'OK' }]
              );
              setSelectedOption(null);
              setDataPreview(null);
              setExercises(prev => prev.map(ex => ({ ...ex, selected: false })));
              setExerciseSearch('');
            } catch (error) {
              console.error('[WorkoutHistoryManagement] Clearing error:', error);
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const getConfirmMessage = (optionId: string, preview: DataPreview): string => {
    switch (optionId) {
      case 'time-based':
        return `This will permanently delete ${preview.workoutsCount} workouts and ${preview.prsCount} personal records older than the selected period. This action cannot be undone.`;
      case 'exercise-specific':
        return `This will permanently delete all workout data for the selected exercises. This action cannot be undone.`;
      case 'reset-prs':
        return `This will remove ${preview.prsCount} personal record flags while keeping your workout logs. This action cannot be undone.`;
      case 'complete-reset':
        return `This will permanently delete all ${preview.workoutsCount} workouts, ${preview.exercisesCount} exercises, and ${preview.prsCount} personal records. This action cannot be undone.`;
      default:
        return 'This action cannot be undone.';
    }
  };

  const performDataClearing = async (optionId: string) => {
    if (!userId) throw new Error('No user ID');

    switch (optionId) {
      case 'time-based':
        await clearTimeBasedData();
        break;
      case 'exercise-specific':
        // Handled by the ClearExerciseHistory component
        break;
      case 'reset-prs':
        await clearPRs();
        break;
      case 'complete-reset':
        await clearAllData();
        break;
    }
  };


  const clearTimeBasedData = async () => {
    const cutoffDate = getCutoffDate(timePeriod);

    const { data: oldSessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .lt('created_at', cutoffDate);

    if (oldSessions?.length) {
      const sessionIds = oldSessions.map(s => s.id);

      await supabase
        .from('set_logs')
        .delete()
        .in('session_id', sessionIds);

      await supabase
        .from('workout_sessions')
        .delete()
        .in('id', sessionIds);
    }
  };

  const clearPRs = async () => {
    await supabase
      .from('set_logs')
      .update({ is_pb: false })
      .eq('workout_sessions.user_id', userId)
      .eq('is_pb', true);
  };

  const clearAllData = async () => {
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId);

    if (sessions?.length) {
      const sessionIds = sessions.map(s => s.id);

      await supabase
        .from('set_logs')
        .delete()
        .in('session_id', sessionIds);

      await supabase
        .from('workout_sessions')
        .delete()
        .in('id', sessionIds);
    }
  };


  const renderTimePeriodSelector = () => (
    <View style={styles.timePeriodContainer}>
      <Text style={styles.timePeriodLabel}>Time Period:</Text>
      <View style={styles.timePeriodButtons}>
        {[
          { key: '2weeks', label: '2 Weeks' },
          { key: '1month', label: '1 Month' },
          { key: '3months', label: '3 Months' },
          { key: '6months', label: '6 Months' },
          { key: '1year', label: '1 Year' },
          { key: '2years', label: '2 Years' },
        ].map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.timePeriodButton,
              timePeriod === period.key && styles.timePeriodButtonActive,
            ]}
            onPress={() => setTimePeriod(period.key)}
          >
            <Text
              style={[
                styles.timePeriodButtonText,
                timePeriod === period.key && styles.timePeriodButtonTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );


  const renderDataPreview = () => {
    if (!dataPreview) return null;

    return (
      <View style={styles.previewContainer}>
        <Text style={styles.previewTitle}>Data to be cleared:</Text>
        <View style={styles.previewStats}>
          {dataPreview.workoutsCount > 0 && (
            <View style={styles.previewStat}>
              <Ionicons name="fitness" size={20} color={Colors.mutedForeground} />
              <Text style={styles.previewStatText}>
                {dataPreview.workoutsCount} workout{dataPreview.workoutsCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {dataPreview.exercisesCount > 0 && (
            <View style={styles.previewStat}>
              <Ionicons name="barbell" size={20} color={Colors.mutedForeground} />
              <Text style={styles.previewStatText}>
                {dataPreview.exercisesCount} exercise{dataPreview.exercisesCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {dataPreview.prsCount > 0 && (
            <View style={styles.previewStat}>
              <Ionicons name="trophy" size={20} color={Colors.mutedForeground} />
              <Text style={styles.previewStatText}>
                {dataPreview.prsCount} personal record{dataPreview.prsCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportData}
            disabled={isLoading}
          >
            <Ionicons name="download" size={20} color={Colors.primary} />
            <Text style={styles.exportButtonText}>Export Backup First</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.clearButton, isLoading && styles.clearButtonDisabled]}
            onPress={handleClearData}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.clearButtonText}>Clear Data</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Ionicons name="time" size={24} color={Colors.foreground} />
          <Text style={styles.title}>Manage Workout History</Text>
        </View>

        <Text style={styles.description}>
          Take control of your workout data. Choose how you want to clear or reset your fitness history.
        </Text>

        <View style={styles.optionsContainer}>
          {CLEARING_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedOption === option.id && styles.optionCardSelected,
              ]}
              onPress={() => handleOptionSelect(option.id)}
            >
              <View style={styles.optionHeader}>
                <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                  <Ionicons name={option.icon} size={20} color="#fff" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
              </View>
              {selectedOption === option.id && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {selectedOption === 'time-based' && renderTimePeriodSelector()}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Analyzing your data...</Text>
          </View>
        )}

        {dataPreview && renderDataPreview()}

        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <Text style={styles.warningText}>
            <Text style={styles.warningBold}>Important:</Text> Cleared data cannot be recovered.
            Consider exporting a backup first.
          </Text>
        </View>
      </ScrollView>


      <ClearExerciseHistory
        visible={showClearExerciseModal}
        onClose={() => setShowClearExerciseModal(false)}
        onDataCleared={() => {
          // Refresh data preview after clearing
          setSelectedOption(null);
          setDataPreview(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  title: {
    ...TextStyles.h4,
    color: Colors.foreground,
  },
  description: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  optionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardSelected: {
    borderColor: Colors.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  optionDescription: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  timePeriodContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  timePeriodLabel: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  timePeriodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timePeriodButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  timePeriodButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timePeriodButtonText: {
    ...TextStyles.body,
    color: Colors.foreground,
  },
  timePeriodButtonTextActive: {
    color: Colors.white,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginTop: Spacing.md,
  },
  previewContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  previewTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  previewStats: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  previewStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewStatText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  actionButtons: {
    gap: Spacing.md,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exportButtonText: {
    ...TextStyles.buttonSmall,
    color: Colors.primary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.destructive,
    borderRadius: BorderRadius.md,
  },
  clearButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  clearButtonText: {
    ...TextStyles.buttonSmall,
    color: Colors.white,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: '#FFFBEB',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    ...TextStyles.caption,
    color: Colors.foreground,
    flex: 1,
    lineHeight: 18,
  },
  warningBold: {
    fontWeight: '700',
  },
  exerciseSelectorContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  exerciseControls: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    ...TextStyles.body,
    color: Colors.foreground,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectAllButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
  },
  selectAllText: {
    ...TextStyles.buttonSmall,
    color: Colors.primary,
  },
  exerciseList: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 400,
  },
  exerciseListContent: {
    padding: Spacing.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseCheckbox: {
    marginRight: Spacing.md,
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: 2,
  },
  exerciseDetails: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyStateText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  exerciseListHeader: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseListTitle: {
    ...TextStyles.h6,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  exerciseListSubtitle: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  selectExercisesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectExercisesButtonText: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    flex: 1,
    marginLeft: Spacing.md,
  },
});