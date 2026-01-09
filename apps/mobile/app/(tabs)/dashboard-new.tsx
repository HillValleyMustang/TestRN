import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  Pressable,
  Text,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../_contexts/auth-context';
import { Spacing } from '../../constants/Theme';
import { BackgroundRoot } from '../../components/BackgroundRoot';
import {
  WelcomeHeader,
  WeeklyTargetWidget,
  ActionHubWidget,
  GymToggle,
  NextWorkoutCard,
  AllWorkoutsQuickStart,
  SimpleVolumeChart,
  PreviousWorkoutsWidget,
} from '../../components/dashboard';
import { WorkoutSummaryModal } from '../../components/workout/WorkoutSummaryModal';
import { ActivityLoggingModal_new as ActivityLoggingModal } from '../../components/dashboard/ActivityLoggingModal_new';

// New React Query and Zustand imports
import { useDashboardData, useWorkoutSessions } from '../_hooks/useWorkoutQueries';
import { useWorkoutLifecycle, useDashboardRefresh } from '../_hooks/useWorkoutLifecycle';
import { useWorkoutSummaryModal, useActivityLoggingModal } from '../_lib/ui-store';
import { useLoadingStates } from '../_lib/ui-store';

// DEVELOPMENT AUTO-LOGIN - Set to true to auto-login during development
const AUTO_LOGIN_FOR_DEVELOPMENT = true;

const DashboardScreen = () => {
  const { session, userId, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Use new React Query hooks for data fetching
  const {
    sessions,
    recentWorkouts,
    workoutStats,
    weeklyVolume,
    workoutFrequency,
    isLoading,
    hasError,
    refetch: refetchDashboardData,
  } = useDashboardData(userId || '');
  
  // Use lifecycle management for workout operations
  const {
    handleWorkoutCompleted,
    handleWorkoutDeleted,
    isCompletingWorkout,
    isDeletingWorkout,
  } = useWorkoutLifecycle(userId || '');
  
  // Use dashboard refresh management
  const {
    refreshDashboard,
    refreshDashboardComponent,
    isRefreshing,
  } = useDashboardRefresh(userId || '');
  
  // Use UI state management
  const workoutSummaryModal = useWorkoutSummaryModal();
  const activityLoggingModal = useActivityLoggingModal();
  
  const { isSavingWorkout, isDeletingWorkout: isDeletingWorkoutUI } = useLoadingStates();
  
  // Selected session data for modal
  const [selectedSessionData, setSelectedSessionData] = React.useState<{
    exercises: any[];
    workoutName: string;
    startTime: Date;
    duration?: string;
    historicalWorkout?: any;
    weeklyVolumeData?: any;
    nextWorkoutSuggestion?: any;
    isOnTPath?: boolean;
    historicalRating?: number | null;
    sessionId?: string;
  } | null>(null);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!authLoading && !session && !AUTO_LOGIN_FOR_DEVELOPMENT) {
      console.log('[Dashboard] No session, redirecting to login');
      router.replace('/login');
      return;
    }
  }, [session, authLoading, router]);

  // Handle manual refresh
  const onRefresh = useCallback(async () => {
    await refreshDashboard();
  }, [refreshDashboard]);

  // Handle workout completion
  const handleWorkoutSave = useCallback(async () => {
    if (!selectedSessionData) return;
    
    try {
      // Close modal first for better UX
      workoutSummaryModal.close();
      
      // Create workout session object from modal data
      const workoutSession = {
        id: selectedSessionData.sessionId || `workout_${Date.now()}`,
        user_id: userId || '',
        session_date: selectedSessionData.startTime.toISOString(),
        template_name: selectedSessionData.workoutName,
        completed_at: new Date().toISOString(),
        rating: selectedSessionData.historicalRating || null,
        duration_string: selectedSessionData.duration || '45:00',
        t_path_id: null, // Add required property
        created_at: new Date().toISOString(),
      };
      
      await handleWorkoutCompleted(workoutSession);
      setSelectedSessionData(null);
      
    } catch (error) {
      console.error('Failed to save workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  }, [selectedSessionData, userId, handleWorkoutCompleted, workoutSummaryModal]);

  // Handle workout deletion
  const handleDeleteWorkout = useCallback(
    async (sessionId: string, templateName: string) => {
      // Show confirmation dialog
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Delete Workout Session',
          `Are you sure you want to delete "${templateName}"? This action cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => resolve(true),
            },
          ]
        );
      });
      
      if (confirmed) {
        await handleWorkoutDeleted(sessionId);
        
        // Force immediate refresh of dashboard components
        await refreshDashboard();
        
        // Additional force refresh for immediate UI updates
        await refreshDashboardComponent('workouts');
        await refreshDashboardComponent('volume');
      }
    },
    [handleWorkoutDeleted, refreshDashboard, refreshDashboardComponent]
  );

  // Handle session rating updates
  const handleSessionRatingUpdate = useCallback(async (sessionId: string, rating: number) => {
    try {
      // Update local data immediately for better UX
      // This will be handled by the lifecycle hook
      
      console.log('[Dashboard] Session rating updated:', sessionId, rating);
    } catch (error) {
      console.error('Failed to update session rating:', error);
      Alert.alert('Error', 'Failed to update workout rating');
    }
  }, []);

  // Handle viewing workout summary
  const handleViewSummary = useCallback(async (sessionId: string) => {
    console.log('[Dashboard] handleViewSummary called with sessionId:', sessionId);
    
    if (!userId) {
      console.log('[Dashboard] No userId, returning');
      return;
    }

    try {
      // Find the session data
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        Alert.alert('Error', 'Workout session not found. Please try again.');
        return;
      }

      // Set modal data (simplified for now - can be enhanced later)
      setSelectedSessionData({
        exercises: [], // This would be populated from set logs
        workoutName: session.template_name || 'Workout',
        startTime: new Date(session.session_date),
        duration: session.duration_string || 'Completed',
        historicalRating: session.rating,
        sessionId: session.id,
      });

      workoutSummaryModal.open();
    } catch (error) {
      console.error('Failed to load workout summary:', error);
      Alert.alert('Error', 'Failed to load workout summary');
    }
  }, [userId, sessions, workoutSummaryModal]);

  // User info
  const userName = session?.user?.user_metadata?.full_name || 
                  session?.user?.user_metadata?.first_name ||
                  session?.user?.email?.split('@')[0] ||
                  'Athlete';

  const accountCreatedAt = session?.user?.created_at;

  // Show loading state
  if (isLoading && !sessions.length) {
    return (
      <View style={styles.loadingContainer}>
        <BackgroundRoot />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <BackgroundRoot />
        <Text style={styles.errorText}>Failed to load dashboard data</Text>
        <Pressable style={styles.retryButton} onPress={refetchDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <BackgroundRoot />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={onRefresh} 
            />
          }
        >
          {/* 1. Welcome Header */}
          <View>
            <WelcomeHeader
              userName={userName}
              accountCreatedAt={accountCreatedAt}
            />
          </View>

          {/* 2. Weekly Target */}
          <View>
            <WeeklyTargetWidget
              completedWorkouts={(recentWorkouts || []).map(w => ({ 
                id: w.session.id, 
                name: w.session.template_name || 'Workout' 
              }))}
              goalTotal={3}
              programmeType="ppl"
              totalSessions={recentWorkouts?.length || 0}
              onViewCalendar={() => router.push('/workout-history')}
              onViewWorkoutSummary={handleViewSummary}
              activitiesCount={0}
              onViewActivities={() => {}}
              loading={isLoading}
            />
          </View>

          {/* 3. Action Hub */}
          <View>
            <ActionHubWidget
              onLogActivity={activityLoggingModal.open}
              onAICoach={() => {}}
              onWorkoutLog={() => {}}
              onConsistencyCalendar={() => {}}
            />
          </View>

          {/* 4. Gym Toggle - simplified for now */}
          {false && ( // Disabled for now since we don't have gym data yet
            <View>
              <GymToggle
                gyms={[]}
                activeGym={null}
                onGymChange={async () => {}}
              />
            </View>
          )}

          {/* 5. Next Workout Card */}
          <View>
            <NextWorkoutCard
              workoutId={undefined}
              workoutName={undefined}
              estimatedDuration="45 minutes"
              loading={false}
              noActiveGym={false}
              noActiveTPath={false}
            />
          </View>

          {/* 6. All Workouts Quick Start */}
          <View>
            <AllWorkoutsQuickStart
              programName={undefined}
              workouts={[]}
            />
          </View>

          {/* 7. Weekly Volume Chart */}
          <View>
            <SimpleVolumeChart data={[]} />
          </View>

          {/* 8. Previous Workouts */}
          <View>
            <PreviousWorkoutsWidget
              workouts={(recentWorkouts || []).map((workout: any) => ({
                id: workout.session?.id || workout.id, // Ensure unique key
                sessionId: workout.session?.id || workout.id,
                template_name: workout.session?.template_name || workout.template_name || 'Ad Hoc Workout',
                completed_at: workout.session?.completed_at || workout.completed_at || workout.session?.session_date,
                exercise_count: workout.exercise_count,
                duration_string: (workout.session?.duration_string || workout.duration_string) ?? undefined,
              }))}
              onViewSummary={handleViewSummary}
              onDelete={handleDeleteWorkout}
              loading={isDeletingWorkout || isDeletingWorkoutUI}
            />
          </View>

          {/* Debug: Force Refresh Button */}
          <View style={styles.debugSection}>
            <Pressable style={styles.debugButton} onPress={onRefresh}>
              <Text style={styles.debugButtonText}>
                🔄 Force Refresh Data
              </Text>
            </Pressable>
            <Text style={styles.debugText}>
              Debug: New React Query + Zustand state management
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Workout Summary Modal */}
      <WorkoutSummaryModal
        visible={workoutSummaryModal.isOpen}
        onClose={() => {
          workoutSummaryModal.close();
          setSelectedSessionData(null);
        }}
        exercises={selectedSessionData?.exercises || []}
        workoutName={selectedSessionData?.workoutName || ''}
        startTime={selectedSessionData?.startTime || new Date()}
        {...(selectedSessionData?.duration && { duration: selectedSessionData.duration })}
        {...(selectedSessionData?.historicalRating !== null && 
            selectedSessionData?.historicalRating !== undefined && 
            { historicalRating: selectedSessionData.historicalRating })}
        showActions={false}
        showSyncStatus={false}
        onSaveWorkout={handleWorkoutSave}
        onRateWorkout={async (rating) => {
          if (!selectedSessionData?.sessionId) return;
          await handleSessionRatingUpdate(selectedSessionData.sessionId, rating);
        }}
      />

      {/* Activity Logging Modal */}
      <ActivityLoggingModal
        visible={activityLoggingModal.isOpen}
        onClose={activityLoggingModal.close}
        onLogActivity={async (activity) => {
          try {
            console.log('[Dashboard] Logging activity:', activity);
            
            // For now, just close the modal
            // TODO: Implement activity logging with React Query
            activityLoggingModal.close();
            
            Alert.alert('Success', 'Activity logged successfully!');
          } catch (error) {
            console.error('Error logging activity:', error);
            Alert.alert('Error', 'Failed to log activity. Please try again.');
          }
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
  },
  debugSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  debugButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  debugButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'Poppins_500Medium',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
});

export default DashboardScreen;