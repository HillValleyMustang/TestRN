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
  Animated,
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
import { Colors, Spacing } from '../../constants/Theme';
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
  SyncStatusBanner,
} from '../../components/dashboard';

export default function DashboardScreen() {
  const { session, userId, loading: authLoading } = useAuth();
  const { loadDashboardSnapshot, isSyncing, queueLength, isOnline } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
    }
  }, [session, authLoading, router]);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Dashboard data state
  const [userProfile, setUserProfile] = useState<DashboardProfile | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<DashboardWeeklySummary>({
    completed_workouts: [],
    goal_total: 3,
    programme_type: 'ppl',
  });
  const [activeGym, setActiveGym] = useState<Gym | null>(null);
  const [activeTPath, setActiveTPath] = useState<DashboardProgram | null>(null);
  const [tpathWorkouts, setTpathWorkouts] = useState<DashboardProgram[]>([]);
  const [volumeData, setVolumeData] = useState<DashboardVolumePoint[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<
    DashboardWorkoutSummary[]
  >([]);
  const [nextWorkout, setNextWorkout] = useState<DashboardProgram | null>(null);

  // Animation values for staggered entrance (reduced by 1 since we removed RollingStatusBadge from body)
  const fadeAnims = useRef([
    new Animated.Value(0), // Welcome Header - 0.0s
    new Animated.Value(0), // Weekly Target - 0.1s
    new Animated.Value(0), // Action Hub - 0.2s
    new Animated.Value(0), // Gym Toggle - 0.3s
    new Animated.Value(0), // Next Workout - 0.4s
    new Animated.Value(0), // All Workouts - 0.5s
    new Animated.Value(0), // Volume Chart - 0.6s
    new Animated.Value(0), // Previous Workouts - 0.7s
  ]).current;

  const translateYAnims = useRef([
    new Animated.Value(-10),
    new Animated.Value(-10),
    new Animated.Value(-10),
    new Animated.Value(-10),
    new Animated.Value(-10),
    new Animated.Value(-10),
    new Animated.Value(-10),
    new Animated.Value(-10),
  ]).current;

  // Staggered animation on mount
  useEffect(() => {
    const delays = [0, 100, 200, 300, 400, 500, 600, 700]; // milliseconds (0.0s → 0.7s in 0.1s increments)

    const animations = fadeAnims.map((fadeAnim, index) => {
      return Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: delays[index],
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnims[index], {
          toValue: 0,
          duration: 400,
          delay: delays[index],
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(0, animations).start();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;

    try {
      if (isInitialLoad) {
        setLoading(true);
      }

      const snapshot = await loadDashboardSnapshot();
      setUserProfile(snapshot.profile);
      setWeeklySummary(snapshot.weeklySummary);
      setActiveGym(snapshot.activeGym);
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
  }, [userId, loadDashboardSnapshot, isInitialLoad]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData]);

  const userName =
    userProfile?.full_name ||
    userProfile?.first_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.first_name ||
    session?.user?.email?.split('@')[0] ||
    'Athlete';

  const accountCreatedAt = session?.user?.created_at;

  const handleViewSummary = useCallback(
    (sessionId: string) => {
      router.push({ pathname: '/workout-detail', params: { id: sessionId } });
    },
    [router]
  );

  // Component animation wrappers
  const AnimatedView = ({
    index,
    children,
  }: {
    index: number;
    children: React.ReactNode;
  }) => (
    <Animated.View
      style={{
        opacity: fadeAnims[index],
        transform: [{ translateY: translateYAnims[index] }],
      }}
    >
      {children}
    </Animated.View>
  );

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
        <SyncStatusBanner
          isOnline={isOnline}
          isSyncing={isSyncing}
          queueLength={queueLength}
        />

        {/* 1. Welcome Header - 0.0s */}
        <AnimatedView index={0}>
          <WelcomeHeader
            userName={userName}
            accountCreatedAt={accountCreatedAt}
          />
        </AnimatedView>

        {/* 2. Weekly Target - 0.1s */}
        <AnimatedView index={1}>
          <WeeklyTargetWidget
            completedWorkouts={weeklySummary.completed_workouts}
            goalTotal={weeklySummary.goal_total}
            programmeType={weeklySummary.programme_type}
            onViewCalendar={() => router.push('/history')}
            onViewWorkoutSummary={handleViewSummary}
            loading={loading}
          />
        </AnimatedView>

        {/* 3. Action Hub - 0.2s */}
        <AnimatedView index={2}>
          <ActionHubWidget
            onLogActivity={() => console.log('Log activity')}
            onAICoach={() => console.log('AI Coach')}
            onWorkoutLog={() => console.log('Workout log')}
            onConsistencyCalendar={() => console.log('Consistency calendar')}
          />
        </AnimatedView>

        {/* 4. Gym Toggle (conditional) - 0.3s */}
        <AnimatedView index={3}>
          <GymToggle />
        </AnimatedView>

        {/* 5. Next Workout Card - 0.4s */}
        <AnimatedView index={4}>
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
        </AnimatedView>

        {/* 6. All Workouts Quick Start - 0.5s */}
        <AnimatedView index={5}>
          <AllWorkoutsQuickStart
            programName={activeTPath?.template_name}
            workouts={tpathWorkouts}
            loading={loading}
          />
        </AnimatedView>

        {/* 7. Weekly Volume Chart - 0.6s */}
        <AnimatedView index={6}>
          <SimpleVolumeChart data={volumeData} />
        </AnimatedView>

        {/* 8. Previous Workouts - 0.7s */}
        <AnimatedView index={7}>
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
            loading={loading}
          />
        </AnimatedView>
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
});
