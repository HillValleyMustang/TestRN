import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../_contexts/auth-context';
import {
  useData,
  type DashboardProfile,
} from '../_contexts/data-context';
import { database } from '../_lib/database';
import { useReactiveHooksEnabled } from '../../hooks/useFeatureFlag';
import { useUserProfile, useGyms } from '../../hooks/data';

// DEVELOPMENT AUTO-LOGIN - Set to true to auto-login during development
const AUTO_LOGIN_FOR_DEVELOPMENT = true;
import { Spacing, Colors } from '../../constants/Theme';
import { BackgroundRoot } from '../../components/BackgroundRoot';
import {
  WelcomeHeader,
  WeeklyTargetWidget,
  ActionHubWidget,
  NextWorkoutCard,
  AllWorkoutsQuickStart,
  SimpleVolumeChart,
  PreviousWorkoutsWidget,
  WorkoutPerformanceModal,
  SyncStatusBanner,
} from '../../components/dashboard';
import { WorkoutSummaryModal } from '../../components/workout/WorkoutSummaryModal';
import { ActivityLoggingModal_new as ActivityLoggingModal } from '../../components/dashboard/ActivityLoggingModal_new';
import { DeleteWorkoutDialog } from '../../components/ui/DeleteWorkoutDialog';
import { ConsistencyCalendarModal } from '../../components/dashboard/ConsistencyCalendarModal';
import { AICoachModal } from '../../components/dashboard/AICoachModal';
import { createTaggedLogger } from '../../lib/logger';

const log = createTaggedLogger('Dashboard');

export default function DashboardScreen() {
  const { session, userId, loading: authLoading } = useAuth();
  const { deleteWorkoutSession, isSyncing, queueLength, isOnline, lastWorkoutCompletionTime, invalidateAllCaches, invalidateWorkoutCaches } = useData();
  
  const router = useRouter();

  // --- STATE & REFS ---
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [deletionInProgress, setDeletionInProgress] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<{ sessionId: string; templateName: string } | null>(null);
  const [showSyncBox, setShowSyncBox] = useState(false);
  
  const [userProfile, setUserProfile] = useState<DashboardProfile | null>(null);
  const [gyms, setGyms] = useState<any[]>([]);
  const [workoutSummaryModalVisible, setWorkoutSummaryModalVisible] = useState(false);
  const [selectedSessionData, setSelectedSessionData] = useState<{
    exercises: any[];
    workoutName: string;
    startTime: Date;
    duration?: string;
    historicalRating?: number | null;
    sessionId?: string;
    allAvailableMuscleGroups?: string[];
  } | null>(null);
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [workoutPerformanceModalVisible, setWorkoutPerformanceModalVisible] = useState(false);
  const [consistencyCalendarVisible, setConsistencyCalendarVisible] = useState(false);
  const [aiCoachModalVisible, setAiCoachModalVisible] = useState(false);

  const syncBoxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncBoxShownAtRef = useRef<number | null>(null);
  const syncBoxHiddenRef = useRef<boolean>(false);
  const scrollViewRefSecondary = useRef<ScrollView | null>(null);
  const currentScrollY = useRef<number>(0);

  // --- FEATURE FLAGS & HOOKS ---
  const useReactiveHooks = useReactiveHooksEnabled();
  
  const { data: hookProfile, loading: profileLoading } = useUserProfile(
    useReactiveHooks ? userId : null,
    { enabled: useReactiveHooks }
  );
  
  const { data: hookGyms, loading: gymsLoading } = useGyms(
    useReactiveHooks ? userId : null,
    { enabled: useReactiveHooks }
  );

  // --- SYNC LOGIC ---
  useEffect(() => {
    if (useReactiveHooks && hookProfile) {
      setUserProfile(hookProfile as any);
    }
  }, [useReactiveHooks, hookProfile]);

  useEffect(() => {
    if (useReactiveHooks && hookGyms) {
      setGyms(hookGyms);
    }
  }, [useReactiveHooks, hookGyms]);

  useEffect(() => {
    if (useReactiveHooks && isInitialLoad) {
      if (!profileLoading) {
        setLoading(false);
        setIsInitialLoad(false);
        setInitialLoadComplete(true);
      }
    }
  }, [useReactiveHooks, profileLoading, isInitialLoad]);

  useEffect(() => {
    if (!authLoading && !session && !AUTO_LOGIN_FOR_DEVELOPMENT) {
      router.replace('/login');
    }
  }, [session, authLoading, router]);

  useEffect(() => {
    if (!authLoading && session && userId && userProfile && userProfile.onboarding_completed !== undefined) {
      if (!userProfile.onboarding_completed) {
        router.replace('/onboarding');
      }
    }
  }, [session, authLoading, userId, userProfile?.onboarding_completed, router]);

  // Show sync box for 2 seconds after workout completion
  useEffect(() => {
    const timeSinceCompletion = lastWorkoutCompletionTime > 0 ? Date.now() - lastWorkoutCompletionTime : Infinity;
    const recentWorkoutCompletion = timeSinceCompletion < 5000;
    
    if (recentWorkoutCompletion && syncBoxShownAtRef.current === null && !syncBoxHiddenRef.current) {
      syncBoxShownAtRef.current = Date.now();
      setShowSyncBox(true);
      
      if (syncBoxTimeoutRef.current) clearTimeout(syncBoxTimeoutRef.current);
      syncBoxTimeoutRef.current = setTimeout(() => {
        setShowSyncBox(false);
        syncBoxHiddenRef.current = true;
      }, 2000);
    }
    
    return () => {
      if (syncBoxTimeoutRef.current) clearTimeout(syncBoxTimeoutRef.current);
    };
  }, [lastWorkoutCompletionTime]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    invalidateAllCaches();
    setTimeout(() => setRefreshing(false), 1000);
  }, [invalidateAllCaches]);

  const handleViewSummary = useCallback(async (sessionId: string) => {
    try {
      const session = await database.getWorkoutSession(sessionId);
      if (session) {
        const logs = await database.getSetLogs(sessionId);
        setSelectedSessionData({
          exercises: logs,
          workoutName: session.template_name || 'Workout',
          startTime: new Date(session.session_date),
          sessionId: session.id,
          historicalRating: session.rating,
        });
        setWorkoutSummaryModalVisible(true);
      }
    } catch (error) {
      log.error('Failed to load workout summary:', error);
      Alert.alert('Error', 'Failed to load workout summary');
    }
  }, []);

  const handleDeleteWorkout = useCallback((sessionId: string, templateName: string) => {
    setWorkoutToDelete({ sessionId, templateName });
    setDeleteDialogVisible(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!workoutToDelete) return;
    setDeletionInProgress(workoutToDelete.sessionId);
    setDeleteDialogVisible(false);
    
    try {
      await deleteWorkoutSession(workoutToDelete.sessionId);
    } catch (error) {
      log.error('Failed to delete workout:', error);
      Alert.alert('Error', 'Failed to delete workout');
    } finally {
      setDeletionInProgress(null);
      setWorkoutToDelete(null);
    }
  }, [workoutToDelete, deleteWorkoutSession]);

  const handleSessionRatingUpdate = useCallback(async (sessionId: string, rating: number) => {
    try {
      await database.updateWorkoutSession(sessionId, { rating });
      invalidateWorkoutCaches();
    } catch (error) {
      log.error('Failed to update rating:', error);
    }
  }, [invalidateWorkoutCaches]);

  const userName = userProfile?.full_name || userProfile?.first_name || 'Athlete';
  const accountCreatedAt = userProfile?.created_at || new Date().toISOString();

  const isProfileLoading = profileLoading && !userProfile;
  const shouldShowLoading = isProfileLoading && !userProfile;

  if (shouldShowLoading) {
    return (
      <View style={styles.loadingContainer}>
        <BackgroundRoot />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <BackgroundRoot />

        <ScrollView
          ref={scrollViewRefSecondary}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScroll={(event) => {
            currentScrollY.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          <WelcomeHeader userName={userName} accountCreatedAt={accountCreatedAt} />

          {/* SyncStatusBanner hidden per user request */}
          {/* {(!isOnline || showSyncBox) && (
            <SyncStatusBanner
              isOnline={isOnline}
              isSyncing={isSyncing || showSyncBox}
              queueLength={queueLength}
              onManualSync={onRefresh}
            />
          )} */}

          <WeeklyTargetWidget 
            onViewCalendar={() => router.push('/workout-history')}
            onViewWorkoutSummary={handleViewSummary}
          />

          <ActionHubWidget
            onLogActivity={() => setActivityModalVisible(true)}
            onAICoach={() => setAiCoachModalVisible(true)}
            onWorkoutLog={() => setWorkoutPerformanceModalVisible(true)}
            onConsistencyCalendar={() => setConsistencyCalendarVisible(true)}
          />

          <NextWorkoutCard />

          <AllWorkoutsQuickStart />

          <SimpleVolumeChart />

          <PreviousWorkoutsWidget
            onViewSummary={handleViewSummary}
            onDelete={handleDeleteWorkout}
          />
        </ScrollView>
      </View>

      <WorkoutSummaryModal
        visible={workoutSummaryModalVisible && !!selectedSessionData}
        onClose={() => {
          setWorkoutSummaryModalVisible(false);
          setSelectedSessionData(null);
        }}
        exercises={selectedSessionData?.exercises || []}
        workoutName={selectedSessionData?.workoutName || ''}
        startTime={selectedSessionData?.startTime || new Date()}
        historicalRating={selectedSessionData?.historicalRating}
        onRateWorkout={async (rating) => {
          if (selectedSessionData?.sessionId) {
            await handleSessionRatingUpdate(selectedSessionData.sessionId, rating);
          }
        }}
      />

      <ActivityLoggingModal
        visible={activityModalVisible}
        onClose={() => setActivityModalVisible(false)}
        onLogActivity={onRefresh}
      />

      <WorkoutPerformanceModal
        visible={workoutPerformanceModalVisible}
        onClose={() => setWorkoutPerformanceModalVisible(false)}
      />

      <DeleteWorkoutDialog
        visible={deleteDialogVisible}
        workoutName={workoutToDelete?.templateName || 'Workout'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogVisible(false)}
      />

      <ConsistencyCalendarModal
        open={consistencyCalendarVisible}
        onOpenChange={setConsistencyCalendarVisible}
      />

      <AICoachModal
        visible={aiCoachModalVisible}
        onClose={() => setAiCoachModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
