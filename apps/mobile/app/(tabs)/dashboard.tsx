import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, RefreshControl, View, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../_contexts/auth-context";
import { useData } from "../_contexts/data-context";
import { WelcomeHeader } from "../_components/dashboard/WelcomeHeader";
import { ActionHub } from "../_components/dashboard/ActionHub";
import { NextWorkoutCard } from "../_components/dashboard/NextWorkoutCard";
import { PreviousWorkoutsCard } from "../_components/dashboard/PreviousWorkoutsCard";
import { WeeklyVolumeChart } from "../_components/dashboard/WeeklyVolumeChart";
import { QuickStartWorkouts } from "../_components/dashboard/QuickStartWorkouts";
import { Colors, Spacing } from "../../constants/design-system";
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [volumePoints, setVolumePoints] = useState<VolumePoint[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) {
      return;
    }
    setLoading(true);
    try {
      const [sessionData, volumeData, templateData] = await Promise.all([
        data.getWorkoutSessions(userId),
        data.getVolumeHistory(userId, 28),
        data.getTemplates(userId),
      ]);
      const sortedSessions = [...sessionData].sort((a, b) => {
        const dateA = new Date(a.completed_at ?? a.session_date).getTime();
        const dateB = new Date(b.completed_at ?? b.session_date).getTime();
        return dateB - dateA;
      });
      const latestVolume = volumeData.slice(-7);
      setSessions(sortedSessions);
      setVolumePoints(latestVolume);
      setTemplates(templateData);
    } catch (error) {
      console.error("[Dashboard] Failed to load data", error);
    } finally {
      setLoading(false);
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

  const nextWorkout = useMemo(() => {
    if (templates.length === 0) {
      return null;
    }
    return templates[0];
  }, [templates]);

  const nextWorkoutLastCompleted = useMemo(() => {
    if (!nextWorkout) {
      return null;
    }
    const matchingSession = sessions.find(
      (sessionItem) => sessionItem.t_path_id === nextWorkout.id,
    );
    return formatDate(
      matchingSession?.completed_at ?? matchingSession?.session_date ?? null,
    );
  }, [nextWorkout, sessions]);

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

  const actionItems = useMemo(
    () => [
      {
        title: "Start workout",
        subtitle: "Jump straight into your next session",
        icon: "play-circle",
        onPress: () => router.push("/(tabs)/workout"),
        variant: "primary" as const,
      },
      {
        title: "Log measurement",
        subtitle: "Track your body metrics",
        icon: "fitness",
        onPress: () => router.push("/measurements"),
        variant: "outline" as const,
      },
      {
        title: "Manage templates",
        subtitle: "Adjust your training plans",
        icon: "construct",
        onPress: () => router.push("/templates"),
        variant: "outline" as const,
      },
    ],
    [router],
  );

  const handleStartTemplate = useCallback(
    (templateId: string) => {
      router.push({ pathname: "/(tabs)/workout", params: { templateId } });
    },
    [router],
  );

  const userName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email ||
    "Athlete";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.foreground}
        />
      }
    >
      <WelcomeHeader name={userName} subtitle={welcomeSubtitle || undefined} />

      <View style={styles.section}>
        <ActionHub actions={actionItems} />
      </View>

      <View style={styles.section}>
        <NextWorkoutCard
          loading={loading}
          workoutName={nextWorkout?.name}
          lastCompletedAt={nextWorkoutLastCompleted}
          estimatedDuration={null}
          onStart={() => router.push("/(tabs)/workout")}
        />
      </View>

      <View style={styles.section}>
        <QuickStartWorkouts
          templates={templates.map((template) => ({
            id: template.id,
            name: template.name,
            description: template.description,
          }))}
          onStartTemplate={handleStartTemplate}
          onCreateTemplate={() => router.push("/templates")}
        />
      </View>

      <View style={styles.section}>
        <WeeklyVolumeChart data={volumePoints} loading={loading} />
      </View>

      <View style={styles.section}>
        <PreviousWorkoutsCard
          sessions={recentSessions}
          onViewAll={() => router.push("/history")}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing["2xl"],
    gap: Spacing["2xl"],
  },
  section: {
    gap: Spacing.lg,
  },
});
