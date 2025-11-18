/**
 * Dashboard Screen
 * Main dashboard showing workout overview and quick actions
 * Reference: MOBILE_SPEC_02_DASHBOARD.md
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
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
import {
  useData,
  type DashboardProfile,
  type DashboardProgram,
  type DashboardVolumePoint,
  type DashboardWeeklySummary,
  type DashboardWorkoutSummary,
} from '../_contexts/data-context';
import type { Gym } from '@data/storage/models';
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

export default function DashboardScreen() {
  const { session, userId, loading: authLoading } = useAuth();
  const { loadDashboardSnapshot, deleteWorkoutSession, setActiveGym, isSyncing, queueLength, isOnline, forceRefreshProfile } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !session) {
      console.log('[Dashboard] No session, redirecting to login');
      router.replace('/login');
      return;
    }
  }, [session, authLoading, router]);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasFetchedDataRef = useRef(false);
  const lastRefreshRef = useRef<number>(0);

  // Dashboard data state
  const [userProfile, setUserProfile] = useState<DashboardProfile | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);

  const [weeklySummary, setWeeklySummary] = useState<DashboardWeeklySummary>({
    completed_workouts: [],
    goal_total: 3,
    programme_type: 'ppl',
    total_sessions: 0,
  });
  const [activeGym, setActiveGymState] = useState<Gym | null>(null);
  const [activeTPath, setActiveTPath] = useState<DashboardProgram | null>(null);
  const [tpathWorkouts, setTpathWorkouts] = useState<DashboardProgram[]>([]);
  const [volumeData, setVolumeData] = useState<DashboardVolumePoint[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<
    DashboardWorkoutSummary[]
  >([]);
  const [nextWorkout, setNextWorkout] = useState<DashboardProgram | null>(null);

  

  const fetchDashboardData = useCallback(async () => {
    if (!userId || isRefreshing) return;

    try {
      if (isInitialLoad) {
        setLoading(true);
      }

      console.log('[Dashboard] Fetching dashboard data...');
      const snapshot = await loadDashboardSnapshot();
      console.log('[Dashboard] Dashboard data fetched:', {
        profile: snapshot.profile,
        onboarding_completed: snapshot.profile?.onboarding_completed
      });

      // Update individual state variables
      setUserProfile(snapshot.profile);
      setGyms(snapshot.gyms);
      console.log('[Dashboard] Setting gyms state:', snapshot.gyms.length, 'gyms');
      setWeeklySummary(snapshot.weeklySummary);
      console.log('[Dashboard] Setting activeGym state:', snapshot.activeGym);
      setActiveGymState(snapshot.activeGym);
      setActiveTPath(snapshot.activeTPath);
      setTpathWorkouts(snapshot.tPathWorkouts);
      setVolumeData(snapshot.volumeHistory);
      setRecentWorkouts(snapshot.recentWorkouts);
      setNextWorkout(snapshot.nextWorkout);
    } catch (error) {
      console.error('[Dashboard] Failed to load data', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  }, [userId, isRefreshing]);

  // Initial data load effect - only run once
  useEffect(() => {
    if (!authLoading && session && userId && !hasFetchedDataRef.current) {
      hasFetchedDataRef.current = true;
      fetchDashboardData();
    }
  }, [session, userId, authLoading, fetchDashboardData]);

  // Onboarding check effect - only runs once per profile state
  useEffect(() => {
    if (!authLoading && session && userId && userProfile && userProfile.onboarding_completed !== undefined) {
      const needsOnboarding = !userProfile.onboarding_completed;
      console.log('[Dashboard] Onboarding check - userProfile:', userProfile, 'needsOnboarding:', needsOnboarding);
      if (needsOnboarding) {
        console.log('[Dashboard] User needs onboarding, redirecting...');
        router.replace('/onboarding');
        return;
      } else {
        console.log('[Dashboard] User has completed onboarding, showing dashboard');
      }
    }
  }, [session, authLoading, userId, userProfile?.onboarding_completed, router]);

  // Debounced refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Dashboard] Dashboard screen focused - userProfile:', userProfile, 'onboarding_completed:', userProfile?.onboarding_completed);
      if (userProfile?.onboarding_completed) {
        const now = Date.now();
        // Prevent multiple refreshes within 2 seconds
        if (now - lastRefreshRef.current > 2000 && !isRefreshing) {
          console.log('[Dashboard] Dashboard focused, refreshing data...');
          setIsRefreshing(true);
          fetchDashboardData().finally(() => {
            setIsRefreshing(false);
            lastRefreshRef.current = now;
          });
        } else {
          console.log('[Dashboard] Skipping refresh - too soon or already refreshing');
        }
      }
    }, [userProfile?.onboarding_completed, isRefreshing])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Force clear any cached data and refresh using the data context
      console.log('[Dashboard] Manual refresh triggered - forcing data context refresh');
      forceRefreshProfile();
      
      // Small delay to let the cache clear, then fetch fresh data
      setTimeout(() => {
        fetchDashboardData();
        console.log('[Dashboard] Refresh completed');
      }, 200);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData, forceRefreshProfile]);

  const userName =
    userProfile?.full_name ||
    userProfile?.first_name ||
    session?.user?.user_metadata?.first_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'Athlete';

  const accountCreatedAt = session?.user?.created_at;

  const handleViewSummary = useCallback(
    (sessionId: string) => {
      router.push({ pathname: '/workout-detail', params: { id: sessionId } });
    },
    [router]
  );

  const handleDeleteWorkout = useCallback(
    async (sessionId: string, templateName: string) => {
      try {
        await deleteWorkoutSession(sessionId);
        // Refresh dashboard data after deletion
        await fetchDashboardData();
      } catch (error) {
        console.error('Failed to delete workout session:', error);
        Alert.alert('Error', 'Failed to delete workout session');
      }
    },
    [deleteWorkoutSession, fetchDashboardData]
  );

  

  // Show loading screen while checking onboarding status or data is being fetched
  if (!authLoading && session && userId && (!userProfile || loading)) {
    console.log('[Dashboard] Profile loading or data fetching, showing loading screen...');
    return (
      <View style={styles.loadingContainer}>
        <BackgroundRoot />
        {/* Loading state while profile loads */}
      </View>
    );
  }

  // Show loading screen if we have profile but no dashboard data yet
  if (!authLoading && session && userId && userProfile && !userProfile.onboarding_completed) {
    console.log('[Dashboard] User needs onboarding, redirecting...');
    return (
      <View style={styles.loadingContainer}>
        <BackgroundRoot />
        {/* Loading state while redirecting to onboarding */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Aurora Background with 3 animated blobs */}
      <BackgroundRoot />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
            completedWorkouts={weeklySummary.completed_workouts}
            goalTotal={weeklySummary.goal_total}
            programmeType={weeklySummary.programme_type}
            totalSessions={weeklySummary.total_sessions}
            onViewCalendar={() => router.push('/workout-history')}
            onViewWorkoutSummary={handleViewSummary}
            loading={loading}
          />
        </View>

        {/* 3. Action Hub */}
        <View>
          <ActionHubWidget
            onLogActivity={() => {}}
            onAICoach={() => {}}
            onWorkoutLog={() => {}}
            onConsistencyCalendar={() => {}}
          />
        </View>

        {/* 4. Gym Toggle (only show if 2+ gyms) */}
        {gyms.length > 1 && (
          <View>
            <GymToggle
              gyms={gyms}
              activeGym={activeGym}
              onGymChange={async (gymId: string, newActiveGym: Gym | null) => {
                if (userId) {
                  // Update dashboard state immediately for UI consistency
                  setActiveGymState(newActiveGym);
                  
                  // Update the database
                  await setActiveGym(userId, gymId);
                  
                  // Trigger a data refresh to sync all components
                  setTimeout(() => {
                    fetchDashboardData();
                  }, 100);
                }
              }}
            />
          </View>
        )}

        {/* 5. Next Workout Card */}
        <View>
          <NextWorkoutCard
            workoutId={nextWorkout?.id}
            workoutName={nextWorkout?.template_name}
            estimatedDuration={
              userProfile?.preferred_session_length || '45 minutes'
            }
            loading={loading}
            noActiveGym={!activeGym}
            noActiveTPath={!activeTPath}
          />
        </View>

        {/* 6. All Workouts Quick Start */}
        <View>
          <AllWorkoutsQuickStart
            programName={activeTPath?.template_name}
            workouts={tpathWorkouts}
            loading={loading}
          />
        </View>

        {/* 7. Weekly Volume Chart */}
        <View>
          <SimpleVolumeChart data={volumeData} />
        </View>

        {/* 8. Previous Workouts */}
        <View>
          <PreviousWorkoutsWidget
            workouts={recentWorkouts.map(workout => ({
              id: workout.id,
              sessionId: workout.id,
              template_name: workout.template_name || 'Ad Hoc Workout',
              completed_at: workout.completed_at || workout.session_date,
              exercise_count: workout.exercise_count,
              duration_string: workout.duration_string ?? undefined,
            }))}
            onViewSummary={handleViewSummary}
            onDelete={handleDeleteWorkout}
            loading={loading}
          />
        </View>

        {/* Debug: Force Refresh Button */}
        <View style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
          <Pressable 
            onPress={onRefresh}
            style={{ padding: 10, backgroundColor: '#007AFF', borderRadius: 6 }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
              🔄 Force Refresh Data
            </Text>
          </Pressable>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 5, textAlign: 'center' }}>
            Debug: Force refresh to apply workout progression fix
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

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
  },
});
