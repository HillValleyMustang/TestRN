import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "./_contexts/auth-context";
import { useData } from "./_contexts/data-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getExerciseById } from "@data/exercises";
import type { TPathWithExercises } from "@data/storage/models";

export default function TPathDetailScreen() {
  const { userId } = useAuth();
  const { getTPath, getTPathProgress, updateTPathProgress } = useData();
  const router = useRouter();
  const params = useLocalSearchParams();
  const tPathId = params.tPathId as string;

  const [tPath, setTPath] = useState<TPathWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastAccessed, setLastAccessed] = useState<string | null>(null);

  const loadTPath = useCallback(async () => {
    if (!tPathId || !userId) {
      return;
    }
    setLoading(true);
    try {
      const data = await getTPath(tPathId);
      setTPath(data);

      const progress = await getTPathProgress(userId, tPathId);
      if (progress) {
        setLastAccessed(progress.last_accessed_at);
      }

      await updateTPathProgress({
        id: `${userId}_${tPathId}`,
        user_id: userId,
        t_path_id: tPathId,
        completed_at: progress?.completed_at || null,
        last_accessed_at: new Date().toISOString(),
        total_workouts_completed: progress?.total_workouts_completed || 0,
        created_at: progress?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch {
      Alert.alert("Error", "Failed to load program details");
    } finally {
      setLoading(false);
    }
  }, [getTPath, getTPathProgress, tPathId, updateTPathProgress, userId]);

  useEffect(() => {
    loadTPath();
  }, [tPathId, userId, loadTPath]);

  const handleStartWorkout = () => {
    if (!tPath) {
      return;
    }
    router.push({
      pathname: "/workout",
      params: { tPathId: tPath.id },
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a0" />
          <Text style={styles.loadingText}>Loading program...</Text>
        </View>
      </View>
    );
  }

  if (!tPath) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Program not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{tPath.template_name}</Text>
          {tPath.is_ai_generated && (
            <View style={styles.aiTag}>
              <Text style={styles.aiTagText}>AI Generated</Text>
            </View>
          )}
        </View>
        {tPath.description && (
          <Text style={styles.description}>{tPath.description}</Text>
        )}
        {lastAccessed && (
          <Text style={styles.lastAccessed}>
            Last accessed: {new Date(lastAccessed).toLocaleDateString()}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Exercises ({tPath.exercises.length})
        </Text>
        {tPath.exercises.map((exercise, index) => {
          const exerciseData = getExerciseById(exercise.exercise_id);
          return (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseNumber}>{index + 1}</Text>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>
                    {exerciseData?.name || exercise.exercise_id}
                  </Text>
                  {exercise.is_bonus_exercise && (
                    <View style={styles.bonusTag}>
                      <Text style={styles.bonusTagText}>Bonus</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.exerciseDetails}>
                {exercise.target_sets && (
                  <Text style={styles.exerciseDetail}>
                    Sets: {exercise.target_sets}
                  </Text>
                )}
                {(exercise.target_reps_min || exercise.target_reps_max) && (
                  <Text style={styles.exerciseDetail}>
                    Reps: {exercise.target_reps_min || "?"}-
                    {exercise.target_reps_max || "?"}
                  </Text>
                )}
                {exercise.notes && (
                  <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartWorkout}
        >
          <Text style={styles.startButtonText}>Start This Workout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#888",
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#888",
    marginBottom: 24,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  aiTag: {
    backgroundColor: "#0a0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 12,
  },
  aiTagText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  description: {
    fontSize: 16,
    color: "#aaa",
    lineHeight: 24,
    marginBottom: 12,
  },
  lastAccessed: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0a0",
    marginRight: 12,
    minWidth: 30,
  },
  exerciseInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  bonusTag: {
    backgroundColor: "#fa0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  bonusTagText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "bold",
  },
  exerciseDetails: {
    paddingLeft: 42,
  },
  exerciseDetail: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 4,
  },
  exerciseNotes: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
    marginTop: 8,
  },
  actions: {
    padding: 20,
    paddingBottom: 40,
  },
  startButton: {
    backgroundColor: "#0a0",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  startButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  backButton: {
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "#0a0",
    fontSize: 16,
    fontWeight: "bold",
  },
});
