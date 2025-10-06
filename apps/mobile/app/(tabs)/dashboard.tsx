import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../_contexts/auth-context";
import { useData } from "../_contexts/data-context";
import { ScreenHeader, ScreenContainer } from "../../components/layout";
import { StatCard, QuickActions, WeeklyTarget, RecentWorkouts, SimpleVolumeChart } from "../../components/dashboard";
import { Colors, Spacing } from "../../constants/Theme";
import { TextStyles } from "../../constants/Typography";
import type { WorkoutSession, WorkoutTemplate } from "@data/storage/models";

interface VolumePoint {
  date: string;
  volume: number;
}

const formatDate = (iso?: string | null) => {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export default function DashboardScreen() {
  const { session, userId } = useAuth();
  const data = useData();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [volumePoints, setVolumePoints] = useState<VolumePoint[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      const [sessionData, volumeData] = await Promise.all([
        data.getWorkoutSessions(userId),
        data.getVolumeHistory(userId, 28),
      ]);
      const sortedSessions = [...sessionData].sort((a, b) => {
        const dateA = new Date(a.completed_at ?? a.session_date).getTime();
        const dateB = new Date(b.completed_at ?? b.session_date).getTime();
        return dateB - dateA;
      });
      const latestVolume = volumeData.slice(-7);
      setSessions(sortedSessions);
      setVolumePoints(latestVolume);
    } catch (error) {
      console.error("[Dashboard] Failed to load data", error);
    }
  }, [data, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData]),
  );

  const onRefresh = useCallback(async () => {
    if (!userId) {
      return;
    }
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData, userId]);

  const recentSessions = useMemo(() => {
    return sessions.slice(0, 3).map((sessionItem) => ({
      id: sessionItem.id,
      name: sessionItem.template_name || "Ad Hoc Workout",
      completedAt: formatDate(
        sessionItem.completed_at ?? sessionItem.session_date,
      ),
    }));
  }, [sessions]);


  const welcomeSubtitle = useMemo(() => {
    if (sessions.length === 0) {
      return "Let's get your first workout logged.";
    }
    const lastSession = sessions[0];
    const formatted = formatDate(
      lastSession.completed_at ?? lastSession.session_date,
    );
    return formatted
      ? `Last session on ${formatted}`
      : "Keep the momentum going!";
  }, [sessions]);

  const userName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email ||
    "Athlete";

  const totalWorkouts = sessions.length;
  const currentStreak = 0;
  const totalVolume = volumePoints.reduce((sum, point) => sum + point.volume, 0);

  return (
    <>
      <ScreenHeader 
        title={`Welcome back, ${userName}!`}
        subtitle={welcomeSubtitle || undefined}
      />
      <ScreenContainer 
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <View style={styles.statsGrid}>
          <StatCard 
            icon="barbell" 
            label="Total Workouts" 
            value={totalWorkouts}
            iconColor={Colors.actionPrimary}
            style={styles.statCard}
          />
          <StatCard 
            icon="flame" 
            label="Current Streak" 
            value={`${currentStreak} days`}
            iconColor={Colors.chart2}
            style={styles.statCard}
          />
        </View>

        <WeeklyTarget
          completedCount={2}
          goalCount={3}
          programType="ppl"
          completedWorkouts={[
            { id: '1', name: 'Push' },
            { id: '2', name: 'Pull' },
          ]}
        />

        <QuickActions />

        <SimpleVolumeChart data={volumePoints} />

        <RecentWorkouts
          workouts={recentSessions}
          onViewAll={() => router.push("/history")}
        />
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
  },
});
