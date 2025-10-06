import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useAuth } from "./_contexts/auth-context";
import { useData } from "./_contexts/data-context";
import { useRouter } from "expo-router";
import type { WorkoutSession } from "@data/storage/models";
import { formatTimeAgo } from "@data/utils/workout-helpers";

export default function HistoryScreen() {
  const { userId } = useAuth();
  const { getWorkoutSessions } = useData();
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      const sessions = await getWorkoutSessions(userId);
      setWorkouts(sessions);
    } catch (error) {
      console.error("Failed to load workouts:", error);
    }
  }, [getWorkoutSessions, userId]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  };

  const renderWorkout = ({ item }: { item: WorkoutSession }) => {
    const date = new Date(item.session_date);
    const timeAgo = formatTimeAgo(date);

    return (
      <TouchableOpacity
        style={styles.workoutCard}
        onPress={() => router.push(`/workout-detail?id=${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.workoutName}>
            {item.template_name || "Unnamed Workout"}
          </Text>
          {item.rating && (
            <Text style={styles.rating}>{"⭐".repeat(item.rating)}</Text>
          )}
        </View>
        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>📅 {date.toLocaleDateString()}</Text>
          <Text style={styles.detailText}>🕐 {timeAgo}</Text>
        </View>
        {item.duration_string && (
          <Text style={styles.duration}>Duration: {item.duration_string}</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (workouts.length === 0 && !refreshing) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No workouts yet</Text>
        <Text style={styles.emptySubtext}>
          Start logging your workouts to see them here!
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/workout")}
        >
          <Text style={styles.addButtonText}>+ Log First Workout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        renderItem={renderWorkout}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0a0"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  listContent: {
    padding: 16,
  },
  workoutCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  workoutName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  rating: {
    fontSize: 14,
  },
  cardDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 4,
  },
  detailText: {
    color: "#888",
    fontSize: 14,
  },
  duration: {
    color: "#0a0",
    fontSize: 14,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 32,
  },
  emptyText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  addButton: {
    backgroundColor: "#0a0",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
