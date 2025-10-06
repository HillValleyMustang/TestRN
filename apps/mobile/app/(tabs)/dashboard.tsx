/**
 * Dashboard Screen
 * Main dashboard showing workout overview and quick actions
 * Reference: MOBILE_SPEC_02_DASHBOARD.md
 */

import React, { useCallback, useState, useEffect, useRef } from "react";
import { View, ScrollView, RefreshControl, StyleSheet, Animated } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../_contexts/auth-context";
import { useData } from "../_contexts/data-context";
import { Colors, Spacing } from "../../constants/Theme";
import {
  WelcomeHeader,
  RollingStatusBadge,
  WeeklyTargetWidget,
  ActionHubWidget,
  GymToggle,
  NextWorkoutCard,
  AllWorkoutsQuickStart,
  SimpleVolumeChart,
  PreviousWorkoutsWidget,
} from "../../components/dashboard";

interface VolumePoint {
  date: string;
  volume: number;
}

export default function DashboardScreen() {
  const { session, userId, supabase } = useAuth();
  const data = useData();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dashboard data state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  const [activeGym, setActiveGym] = useState<any>(null);
  const [userGyms, setUserGyms] = useState<any[]>([]);
  const [activeTPath, setActiveTPath] = useState<any>(null);
  const [tpathWorkouts, setTpathWorkouts] = useState<any[]>([]);
  const [volumeData, setVolumeData] = useState<VolumePoint[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [nextWorkout, setNextWorkout] = useState<any>(null);

  // Animation values for staggered entrance
  const fadeAnims = useRef([
    new Animated.Value(0), // Welcome Header - 0.0s
    new Animated.Value(0), // Rolling Status Badge - 0.05s
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
    new Animated.Value(-10),
  ]).current;

  // Staggered animation on mount
  useEffect(() => {
    const delays = [0, 100, 200, 300, 400, 500, 600, 700, 800]; // milliseconds (0.0s → 0.8s in 0.1s increments)
    
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
    if (!userId || !supabase) return;

    try {
      setLoading(true);

      // Fetch all dashboard data in parallel
      const [
        profileData,
        gymData,
        activeGymData,
        volumeHistory,
        workoutSessions,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        data.getGyms(userId),
        data.getActiveGym(userId),
        data.getVolumeHistory(userId, 7),
        data.getWorkoutSessions(userId),
      ]);

      if (profileData.data) {
        setUserProfile(profileData.data);
      }

      setUserGyms(gymData);
      setActiveGym(activeGymData);
      setVolumeData(volumeHistory.slice(-7));

      // Sort and get recent workouts
      const sortedSessions = [...workoutSessions].sort((a, b) => {
        const dateA = new Date(a.completed_at ?? a.session_date).getTime();
        const dateB = new Date(b.completed_at ?? b.session_date).getTime();
        return dateB - dateA;
      });

      setRecentWorkouts(sortedSessions.slice(0, 3));

      // Fetch T-Path data if active_t_path_id exists
      if (profileData.data?.active_t_path_id) {
        const { data: tpathData } = await supabase
          .from('t_paths')
          .select('*')
          .eq('id', profileData.data.active_t_path_id)
          .single();

        if (tpathData) {
          setActiveTPath(tpathData);

          // Fetch child workouts
          const { data: childWorkouts } = await supabase
            .from('t_paths')
            .select('*')
            .eq('parent_t_path_id', tpathData.id)
            .order('template_name');

          if (childWorkouts) {
            setTpathWorkouts(childWorkouts);
            
            // Determine next workout based on last completed
            if (childWorkouts.length > 0) {
              setNextWorkout(childWorkouts[0]); // Simple logic: show first workout
            }
          }
        }
      }

      // TODO: Fetch weekly summary (requires backend function)
      setWeeklySummary({
        completed_workouts: sortedSessions.slice(0, 3).map(s => ({
          id: s.id,
          name: s.template_name || 'Ad Hoc',
          sessionId: s.id,
        })),
        goal_total: profileData.data?.programme_type === 'ulul' ? 4 : 3,
        programme_type: profileData.data?.programme_type || 'ppl',
      });

    } catch (error) {
      console.error('[Dashboard] Failed to load data', error);
    } finally {
      setLoading(false);
    }
  }, [data, userId, supabase]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData]),
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
    session?.user?.user_metadata?.full_name || 
    session?.user?.user_metadata?.first_name ||
    session?.user?.email?.split('@')[0] ||
    'Athlete';

  const accountCreatedAt = session?.user?.created_at;

  // Component animation wrappers
  const AnimatedView = ({ index, children }: { index: number; children: React.ReactNode }) => (
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 1. Welcome Header - 0.0s */}
      <AnimatedView index={0}>
        <WelcomeHeader 
          userName={userName} 
          accountCreatedAt={accountCreatedAt}
        />
      </AnimatedView>

      {/* 2. Rolling Status Badge - 0.05s */}
      <AnimatedView index={1}>
        <RollingStatusBadge />
      </AnimatedView>

      {/* 3. Weekly Target - 0.1s */}
      <AnimatedView index={2}>
        <WeeklyTargetWidget
          completedWorkouts={weeklySummary?.completed_workouts || []}
          goalTotal={weeklySummary?.goal_total || 3}
          programmeType={weeklySummary?.programme_type || 'ppl'}
          onViewCalendar={() => console.log('View calendar')}
          onViewWorkoutSummary={(sessionId) => console.log('View summary:', sessionId)}
          loading={loading}
        />
      </AnimatedView>

      {/* 4. Action Hub - 0.2s */}
      <AnimatedView index={3}>
        <ActionHubWidget
          onLogActivity={() => console.log('Log activity')}
          onAICoach={() => console.log('AI Coach')}
          onWorkoutLog={() => console.log('Workout log')}
          onConsistencyCalendar={() => console.log('Consistency calendar')}
        />
      </AnimatedView>

      {/* 5. Gym Toggle (conditional) - 0.3s */}
      <AnimatedView index={4}>
        <GymToggle />
      </AnimatedView>

      {/* 6. Next Workout Card - 0.4s */}
      <AnimatedView index={5}>
        <NextWorkoutCard
          workoutId={nextWorkout?.id}
          workoutName={nextWorkout?.template_name}
          estimatedDuration="45 minutes"
          loading={loading}
          noActiveGym={!activeGym}
          noActiveTPath={!activeTPath}
        />
      </AnimatedView>

      {/* 7. All Workouts Quick Start - 0.5s */}
      <AnimatedView index={6}>
        <AllWorkoutsQuickStart
          programName={activeTPath?.template_name}
          workouts={tpathWorkouts}
          loading={loading}
        />
      </AnimatedView>

      {/* 8. Weekly Volume Chart - 0.6s */}
      <AnimatedView index={7}>
        <SimpleVolumeChart data={volumeData} />
      </AnimatedView>

      {/* 9. Previous Workouts - 0.7s */}
      <AnimatedView index={8}>
        <PreviousWorkoutsWidget
          workouts={recentWorkouts.map(w => ({
            id: w.id,
            sessionId: w.id,
            template_name: w.template_name || 'Ad Hoc Workout',
            completed_at: w.completed_at || w.session_date,
            exercise_count: 0, // TODO: fetch from workout data
            duration_string: 'N/A', // TODO: calculate from workout data
          }))}
          onViewSummary={(sessionId) => console.log('View summary:', sessionId)}
          loading={loading}
        />
      </AnimatedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.sm,
    gap: Spacing.lg,
  },
});
