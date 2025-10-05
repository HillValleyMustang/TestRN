import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { useAuth } from "./_contexts/auth-context";
import { useData } from "./_contexts/data-context";
import { useRouter } from "expo-router";
import { getExerciseById } from "@data/exercises";
import type { WorkoutTemplate } from "@data/storage/models";

export default function TemplatesScreen() {
  const { userId } = useAuth();
  const { getTemplates, deleteTemplate } = useData();
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    if (!userId) {
      return;
    }
    setLoading(true);
    try {
      const data = await getTemplates(userId);
      setTemplates(data);
    } catch (error) {
      Alert.alert("Error", "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [userId]);

  const handleDelete = (template: WorkoutTemplate) => {
    Alert.alert(
      "Delete Template",
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTemplate(template.id);
              await loadTemplates();
              Alert.alert("Success", "Template deleted");
            } catch (error) {
              Alert.alert("Error", "Failed to delete template");
            }
          },
        },
      ],
    );
  };

  const handleStartWorkout = (template: WorkoutTemplate) => {
    router.push({
      pathname: "/workout",
      params: { templateId: template.id },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Templates</Text>
        <Text style={styles.subtitle}>
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading templates...</Text>
        </View>
      ) : templates.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No templates yet</Text>
          <Text style={styles.emptySubtext}>
            Save a workout as a template to reuse it later
          </Text>
        </View>
      ) : (
        templates.map((template) => (
          <View key={template.id} style={styles.templateCard}>
            <View style={styles.templateHeader}>
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                {template.description && (
                  <Text style={styles.templateDescription}>
                    {template.description}
                  </Text>
                )}
                <Text style={styles.templateMeta}>
                  {template.exercises.length} exercise
                  {template.exercises.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>

            <View style={styles.exercisesList}>
              {template.exercises.map((ex, idx) => {
                const exerciseData = getExerciseById(ex.exercise_id);
                return (
                  <View key={idx} style={styles.exerciseItem}>
                    <Text style={styles.exerciseBullet}>•</Text>
                    <Text style={styles.exerciseText}>
                      {exerciseData?.name || ex.exercise_id}
                    </Text>
                    <Text style={styles.exerciseSets}>
                      {ex.default_sets} sets
                      {ex.default_weight_kg && ` × ${ex.default_weight_kg}kg`}
                      {ex.default_reps && ` × ${ex.default_reps} reps`}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.templateActions}>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => handleStartWorkout(template)}
              >
                <Text style={styles.startButtonText}>Start Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(template)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    color: "#888",
    fontSize: 16,
  },
  emptyState: {
    padding: 48,
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  emptyText: {
    color: "#888",
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
  templateCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  templateHeader: {
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  templateDescription: {
    color: "#888",
    fontSize: 14,
    marginBottom: 4,
  },
  templateMeta: {
    color: "#0a0",
    fontSize: 14,
    fontWeight: "600",
  },
  exercisesList: {
    marginBottom: 16,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  exerciseBullet: {
    color: "#0a0",
    fontSize: 16,
    marginRight: 8,
  },
  exerciseText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  exerciseSets: {
    color: "#888",
    fontSize: 12,
  },
  templateActions: {
    flexDirection: "row",
    gap: 12,
  },
  startButton: {
    flex: 1,
    backgroundColor: "#0a0",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "#222",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f00",
    paddingHorizontal: 20,
  },
  deleteButtonText: {
    color: "#f00",
    fontSize: 16,
    fontWeight: "bold",
  },
});
