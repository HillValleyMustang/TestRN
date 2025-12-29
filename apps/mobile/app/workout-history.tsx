/**
 * Workout History Page
 * Shows detailed workout history with grid layout and calendar modal
 * Matches web version design and functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useWorkoutHistory from './_hooks/useWorkoutHistory';
import { useAuth } from './_contexts/auth-context';
import { useData } from './_contexts/data-context';
import { database } from './_lib/database';
import { WorkoutHistoryCard } from '../components/ui/WorkoutHistoryCard';
import { ConsistencyCalendarModal } from '../components/dashboard/ConsistencyCalendarModal';
import { WorkoutSummaryModal } from '../components/workout/WorkoutSummaryModal';
import { AppHeader } from '../components/AppHeader';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { getExerciseById } from '@data/exercises';

export default function WorkoutHistoryPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { supabase } = useAuth();
  const { deleteWorkoutSession, getSetLogs } = useData();
  const { sessions, isLoading, error, refresh, removeSession } = useWorkoutHistory();
  const [refreshing, setRefreshing] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Workout summary modal state
  const [workoutSummaryModalVisible, setWorkoutSummaryModalVisible] = useState(false);
  const [selectedSessionData, setSelectedSessionData] = useState<{
    exercises: any[];
    workoutName: string;
    startTime: Date;
    duration?: string;
    rating?: number;
  } | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleViewSummary = async (sessionId: string) => {
    if (!userId) return;

    try {
      // Load session data
      const allSessions = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (allSessions.error || !allSessions.data) {
        Alert.alert('Error', 'This workout session no longer exists.');
        await refresh();
        return;
      }

      const foundSession = allSessions.data;

      // Load set logs
      const setLogs = await getSetLogs(sessionId);

      // Load exercise definitions from Supabase to get proper names
      let exerciseDefinitions: any[] = [];
      try {
        const { data, error } = await supabase
          .from('exercise_definitions')
          .select('id, name, category, icon_url')
          .or(`user_id.eq.${userId},user_id.is.null`); // Get user's exercises + global exercises

        if (error) {
          console.error('[WorkoutHistory] Failed to load exercise definitions from Supabase:', error);
        } else {
          exerciseDefinitions = data || [];
        }
      } catch (error) {
        console.error('[WorkoutHistory] Failed to load exercise definitions:', error);
      }
      const exerciseLookup = new Map();
      exerciseDefinitions.forEach((ex: any) => {
        exerciseLookup.set(ex.id, ex);
      });

      // Helper function to map exercise names to muscle groups
      const getMuscleGroupFromExercise = (ex: any, staticEx: any): string => {
        const name = (ex?.name || staticEx?.name || '').toLowerCase();
        
        // Chest exercises
        if (name.includes('bench') || name.includes('press') || name.includes('fly') ||
            name.includes('push up') || name.includes('dip') || name.includes('pec')) {
          return 'Chest';
        }
        
        // Back exercises
        if (name.includes('row') || name.includes('pull') || name.includes('lat') ||
            name.includes('deadlift') || name.includes('shrug') || name.includes('face pull')) {
          return 'Back';
        }
        
        // Legs exercises
        if (name.includes('squat') || name.includes('lunge') || name.includes('leg') ||
            name.includes('deadlift') || name.includes('hip') || name.includes('calf')) {
          return 'Legs';
        }
        
        // Shoulders exercises
        if (name.includes('shoulder') || name.includes('overhead') || name.includes('raise') ||
            name.includes('arnold') || name.includes('upright')) {
          return 'Shoulders';
        }
        
        // Arms exercises
        if (name.includes('curl') || name.includes('extension') || name.includes('tricep') ||
            name.includes('bicep') || name.includes('hammer')) {
          return 'Arms';
        }
        
        // Core exercises
        if (name.includes('crunch') || name.includes('plank') || name.includes('sit') ||
            name.includes('leg raise') || name.includes('Russian twist')) {
          return 'Core';
        }
        
        // Default to Unknown if we can't determine
        return 'Unknown';
      };

      // Transform data to modal format
      const exerciseMap = new Map();
      setLogs.forEach((set: any) => {
        // Try database exercise first, then fallback to static exercises
        const dbExercise = exerciseLookup.get(set.exercise_id);
        const staticExercise = getExerciseById(set.exercise_id);
        const exercise = dbExercise || staticExercise;
        const exerciseName = exercise?.name || `Exercise ${set.exercise_id?.slice(-4) || `Ex`}`;

        if (!exerciseMap.has(set.exercise_id)) {
          exerciseMap.set(set.exercise_id, {
            exerciseId: set.exercise_id,
            exerciseName,
            muscleGroup: getMuscleGroupFromExercise(exercise, staticExercise),
            iconUrl: exercise?.icon_url,
            sets: [],
          });
        }

        const exerciseData = exerciseMap.get(set.exercise_id);
        exerciseData.sets.push({
          weight: set.weight_kg?.toString() || '0',
          reps: set.reps?.toString() || '0',
          isCompleted: true, // Assume completed since it's saved
          isPR: set.is_pb || false,
        });
      });

      const exercises = Array.from(exerciseMap.values());
      const startTime = new Date(foundSession.session_date);

      setSelectedSessionData({
        exercises,
        workoutName: foundSession.template_name || 'Workout',
        startTime,
        duration: foundSession.duration_string || 'Completed',
        rating: foundSession.rating || 0,
      });

      setWorkoutSummaryModalVisible(true);
    } catch (error) {
      console.error('Failed to load workout summary:', error);
      Alert.alert('Error', 'Failed to load workout summary');
    }
  };

  const handleDeleteSession = async (sessionId: string, templateName: string | null) => {
    if (!userId) return;

    try {
      console.log('Deleting session:', sessionId);

      // Actually delete the workout session from the database
      const { error: sessionError } = await supabase.from('workout_sessions').delete().eq('id', sessionId).eq('user_id', userId);
      if (sessionError) throw sessionError;

      // Also delete associated set logs
      const { error: setsError } = await supabase.from('set_logs').delete().eq('session_id', sessionId);
      if (setsError) throw setsError;

      console.log('Successfully deleted from database');

      Alert.alert(
        'Success',
        `"${templateName || 'Ad Hoc Workout'}" has been deleted.`,
        [{ text: 'OK' }]
      );

      // Immediately remove from hook state to update UI
      removeSession(sessionId);

      console.log('Removed from UI state');

      // Also delete from local database to ensure consistency
      try {
        await deleteWorkoutSession(sessionId);
        console.log('Deleted from local database');
      } catch (localError) {
        console.warn('Failed to delete from local database:', localError);
        console.log('deleteWorkoutSession function:', typeof deleteWorkoutSession);
        // Don't fail the whole operation if local delete fails
      }

    } catch (err) {
      console.error('Failed to delete workout session:', err);
      Alert.alert('Error', 'Failed to delete workout session');
    }
  };

  const renderWorkoutCard = ({ item }: { item: any }) => (
    <WorkoutHistoryCard
      session={item}
      onViewSummary={handleViewSummary}
      onDelete={handleDeleteSession}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Workouts Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start logging your workouts to see your history here!
      </Text>
      <TouchableOpacity
        style={styles.startWorkoutButton}
        onPress={() => router.push('/workout-launcher')}
      >
        <Text style={styles.startWorkoutText}>Start Your First Workout</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color={Colors.destructive} />
      <Text style={styles.errorTitle}>Failed to Load History</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={refresh}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading workout history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      {/* Page Title */}
      <View style={styles.pageTitle}>
        <Text style={styles.pageTitleText}>Workout History</Text>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          Total Workouts: <Text style={styles.statsNumber}>{sessions.length}</Text>
        </Text>
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => setIsCalendarOpen(true)}
        >
          <Ionicons name="calendar-outline" size={16} color={Colors.actionPrimary} />
          <Text style={styles.calendarButtonText}>Calendar</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {error ? (
        renderError()
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderWorkoutCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.actionPrimary}
            />
          }
          showsVerticalScrollIndicator={false}
          key={sessions.length} // Force re-render when data length changes
        />
      )}

      {/* Modals */}
      <ConsistencyCalendarModal
        open={isCalendarOpen}
        onOpenChange={setIsCalendarOpen}
      />

      <WorkoutSummaryModal
        visible={workoutSummaryModalVisible}
        onClose={() => setWorkoutSummaryModalVisible(false)}
        exercises={selectedSessionData?.exercises || []}
        workoutName={selectedSessionData?.workoutName || ''}
        startTime={selectedSessionData?.startTime || new Date()}
        {...(selectedSessionData?.duration && { duration: selectedSessionData.duration })}
        {...(selectedSessionData?.rating !== undefined && { historicalRating: selectedSessionData.rating })}
        showActions={false}
        showSyncStatus={false}
        onSaveWorkout={async () => {
          // Since this is a view-only modal for past workouts, we don't need to save anything
          setWorkoutSummaryModalVisible(false);
        }}
        onRateWorkout={(rating) => {
          // Could implement rating functionality here if needed
          console.log('Workout rated:', rating);
        }}
      />
    </View>
  );
}

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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statsText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  statsNumber: {
    fontWeight: '600',
    color: Colors.actionPrimary,
    fontFamily: 'Poppins_600SemiBold',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarButtonText: {
    fontSize: 12,
    color: Colors.actionPrimary,
    fontFamily: 'Poppins_500Medium',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  listContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
  },
  startWorkoutButton: {
    backgroundColor: Colors.actionPrimary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  startWorkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.destructive,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    fontFamily: 'Poppins_600SemiBold',
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontFamily: 'Poppins_400Regular',
  },
  retryButton: {
    backgroundColor: Colors.actionPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  spacer: {
    width: 40,
  },
  pageTitle: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  pageTitleText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
});