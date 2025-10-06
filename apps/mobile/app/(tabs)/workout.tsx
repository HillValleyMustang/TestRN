import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useAuth } from "../_contexts/auth-context";
import { useData } from "../_contexts/data-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getExerciseById } from "@data/exercises";
import { RestTimer } from "../_components/rest-timer";
import { TemplateSaveModal } from "../_components/template-save-modal";
import { AICoachingCard } from "../_components/ai-coaching-card";
import { useWorkoutFlow } from "../_contexts/workout-flow-context";

interface ExerciseSet {
  weight: string;
  reps: string;
}

interface WorkoutExercise {
  exerciseId: string;
  sets: ExerciseSet[];
}

export default function WorkoutScreen() {
  const { userId } = useAuth();
  const {
    addWorkoutSession,
    addSetLog,
    getPersonalRecord,
    getTemplate,
    getTPath,
    saveTemplate,
    isSyncing,
    queueLength,
    isOnline,
  } = useData();
  const router = useRouter();
  const params = useLocalSearchParams<{
    selectedExerciseId?: string;
    templateId?: string;
    tPathId?: string;
  }>();
  const { startSession, completeSession, setHasUnsavedChanges } =
    useWorkoutFlow();

  const [templateName, setTemplateName] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<
    Record<string, number>
  >({});
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);
  const [loadedTPathId, setLoadedTPathId] = useState<string | null>(null);
  const [currentTemplateDescription, setCurrentTemplateDescription] =
    useState<string>("");

  useEffect(() => {
    startSession(params.templateId ?? params.tPathId ?? null);
    return () => {
      completeSession();
      setHasUnsavedChanges(false);
    };
  }, [
    completeSession,
    params.templateId,
    params.tPathId,
    setHasUnsavedChanges,
    startSession,
  ]);

  useEffect(() => {
    if (params.selectedExerciseId) {
      addExercise(params.selectedExerciseId);
    }
  }, [addExercise, params.selectedExerciseId]);

  useEffect(() => {
    if (params.templateId && userId) {
      loadTemplate(params.templateId);
    }
  }, [loadTemplate, params.templateId, userId]);

  useEffect(() => {
    if (params.tPathId && userId) {
      loadTPath(params.tPathId);
    }
  }, [loadTPath, params.tPathId, userId]);

  const loadTemplate = useCallback(
    async (templateId: string) => {
      try {
        const template = await getTemplate(templateId);
        if (!template) {
          Alert.alert("Error", "Template not found");
          return;
        }

        setTemplateName(template.name);
        setLoadedTemplateId(templateId);
        setCurrentTemplateDescription(template.description || "");

        const loadedExercises: WorkoutExercise[] = template.exercises.map(
          (ex) => ({
            exerciseId: ex.exercise_id,
            sets: Array(ex.default_sets)
              .fill(null)
              .map(() => ({
                weight: ex.default_weight_kg?.toString() || "",
                reps: ex.default_reps?.toString() || "",
              })),
          }),
        );

        setExercises(loadedExercises);
        setHasUnsavedChanges(false);

        for (const ex of template.exercises) {
          if (userId) {
            const pr = await getPersonalRecord(userId, ex.exercise_id);
            setPersonalRecords((prev) => {
              if (prev[ex.exercise_id] !== undefined) {
                return prev;
              }
              return { ...prev, [ex.exercise_id]: pr };
            });
          }
        }
      } catch {
        Alert.alert("Error", "Failed to load template");
      }
    },
    [getPersonalRecord, getTemplate, setHasUnsavedChanges, userId],
  );

  const loadTPath = useCallback(
    async (tPathId: string) => {
      try {
        const tPath = await getTPath(tPathId);
        if (!tPath) {
          Alert.alert("Error", "Workout program not found");
          return;
        }

        setTemplateName(tPath.template_name);
        setLoadedTPathId(tPathId);
        setCurrentTemplateDescription(tPath.description || "");

        const loadedExercises: WorkoutExercise[] = tPath.exercises
          .filter((ex) => !ex.is_bonus_exercise)
          .map((ex) => ({
            exerciseId: ex.exercise_id,
            sets: Array(ex.target_sets || 3)
              .fill(null)
              .map(() => ({
                weight: "",
                reps: ex.target_reps_min?.toString() || "",
              })),
          }));

        setExercises(loadedExercises);
        setHasUnsavedChanges(false);

        for (const ex of tPath.exercises) {
          if (userId) {
            const pr = await getPersonalRecord(userId, ex.exercise_id);
            setPersonalRecords((prev) => {
              if (prev[ex.exercise_id] !== undefined) {
                return prev;
              }
              return { ...prev, [ex.exercise_id]: pr };
            });
          }
        }
      } catch {
        Alert.alert("Error", "Failed to load workout program");
      }
    },
    [getPersonalRecord, getTPath, setHasUnsavedChanges, userId],
  );

  const addExercise = useCallback(
    async (exerciseId: string) => {
      setExercises((prev) => {
        if (prev.some((exercise) => exercise.exerciseId === exerciseId)) {
          Alert.alert(
            "Already Added",
            "This exercise is already in your workout",
          );
          return prev;
        }
        return [
          ...prev,
          {
            exerciseId,
            sets: [{ weight: "", reps: "" }],
          },
        ];
      });
      setHasUnsavedChanges(true);

      if (userId) {
        const pr = await getPersonalRecord(userId, exerciseId);
        setPersonalRecords((prev) => {
          if (prev[exerciseId] !== undefined) {
            return prev;
          }
          return { ...prev, [exerciseId]: pr };
        });
      }
    },
    [getPersonalRecord, setHasUnsavedChanges, userId],
  );

  const removeExercise = (index: number) => {
    const newExercises = exercises.filter((_, i) => i !== index);
    setExercises(newExercises);
    setHasUnsavedChanges(true);
  };

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].sets.push({ weight: "", reps: "" });
    setExercises(newExercises);
    setHasUnsavedChanges(true);
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: "weight" | "reps",
    value: string,
  ) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].sets[setIndex][field] = value;
    setExercises(newExercises);
    setHasUnsavedChanges(true);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...exercises];
    if (newExercises[exerciseIndex].sets.length > 1) {
      newExercises[exerciseIndex].sets = newExercises[
        exerciseIndex
      ].sets.filter((_, i) => i !== setIndex);
      setExercises(newExercises);
      setHasUnsavedChanges(true);
    }
  };

  const saveWorkout = async () => {
    if (!userId) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    if (!templateName.trim()) {
      Alert.alert("Error", "Please enter a workout name");
      return;
    }

    if (exercises.length === 0) {
      Alert.alert("Error", "Please add at least one exercise");
      return;
    }

    setLoading(true);
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const session = {
        id: sessionId,
        user_id: userId,
        session_date: now,
        template_name: templateName,
        completed_at: now,
        rating: null,
        duration_string: null,
        t_path_id: loadedTPathId,
        created_at: now,
      };

      await addWorkoutSession(session);

      let setCounter = 0;
      let newPRs = 0;

      for (const exercise of exercises) {
        let currentPR = personalRecords[exercise.exerciseId] || 0;

        for (const set of exercise.sets) {
          if (set.weight && set.reps) {
            const weight = parseFloat(set.weight);
            const isPR = weight > currentPR;

            if (isPR) {
              newPRs++;
              currentPR = weight;
            }

            const setLog = {
              id: `set_${sessionId}_${setCounter}`,
              session_id: sessionId,
              exercise_id: exercise.exerciseId,
              weight_kg: weight || null,
              reps: parseInt(set.reps, 10) || null,
              reps_l: null,
              reps_r: null,
              time_seconds: null,
              is_pb: isPR,
              created_at: now,
            };
            await addSetLog(setLog);
            setCounter++;
          }
        }
      }

      const message =
        newPRs > 0
          ? `Workout saved! 🎉 ${newPRs} new personal record${newPRs > 1 ? "s" : ""}!`
          : `Workout saved! ${exercises.length} exercises logged`;

      Alert.alert("Success", message);
      setTemplateName("");
      setExercises([]);
      setPersonalRecords({});
      setLoadedTemplateId(null);
      setLoadedTPathId(null);
      setHasUnsavedChanges(false);
      completeSession();
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save workout");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsTemplate = () => {
    if (!userId) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    if (!templateName.trim()) {
      Alert.alert("Error", "Please enter a workout name first");
      return;
    }

    if (exercises.length === 0) {
      Alert.alert("Error", "Please add at least one exercise");
      return;
    }

    setShowTemplateSaveModal(true);
  };

  const handleConfirmSaveTemplate = async (description: string) => {
    try {
      const templateId =
        loadedTemplateId ||
        `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      let existingTemplate = null;
      if (loadedTemplateId) {
        existingTemplate = await getTemplate(loadedTemplateId);
      }

      const template = {
        id: templateId,
        user_id: userId!,
        name: templateName,
        description: description || null,
        exercises: exercises.map((ex, idx) => ({
          exercise_id: ex.exerciseId,
          order_index: idx,
          default_sets: ex.sets.length,
          default_weight_kg: ex.sets[0]?.weight
            ? parseFloat(ex.sets[0].weight)
            : null,
          default_reps: ex.sets[0]?.reps ? parseInt(ex.sets[0].reps, 10) : null,
        })),
        created_at: existingTemplate?.created_at || now,
        updated_at: now,
      };

      await saveTemplate(template);
      setLoadedTemplateId(templateId);
      setCurrentTemplateDescription(
        description || existingTemplate?.description || "",
      );
      Alert.alert("Success", "Template saved!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save template");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.syncStatus}>
        <Text style={styles.syncText}>
          {isOnline ? "🟢 Online" : "🔴 Offline"} •{" "}
          {isSyncing ? "Syncing..." : `Queue: ${queueLength}`}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Workout Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Chest Day"
          placeholderTextColor="#666"
          value={templateName}
          onChangeText={setTemplateName}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Exercises ({exercises.length})</Text>
          <TouchableOpacity
            style={styles.addExerciseButton}
            onPress={() => router.push("/exercise-picker")}
          >
            <Text style={styles.addExerciseText}>+ Add Exercise</Text>
          </TouchableOpacity>
        </View>

        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No exercises added yet</Text>
            <Text style={styles.emptySubtext}>
              Tap "+ Add Exercise" to get started
            </Text>
          </View>
        ) : (
          exercises.map((exercise, exerciseIndex) => {
            const exerciseData = getExerciseById(exercise.exerciseId);
            return (
              <View key={exerciseIndex} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseTitle}>
                      {exerciseData?.name || exercise.exerciseId}
                    </Text>
                    {exerciseData?.category && (
                      <Text style={styles.exerciseCategory}>
                        {exerciseData.category}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeExercise(exerciseIndex)}
                  >
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.setsContainer}>
                  {personalRecords[exercise.exerciseId] > 0 && (
                    <Text style={styles.prHint}>
                      PR: {personalRecords[exercise.exerciseId]} kg
                    </Text>
                  )}
                  {exercise.sets.map((set, setIndex) => {
                    const weight = parseFloat(set.weight);
                    const isPotentialPR =
                      !Number.isNaN(weight) &&
                      weight > (personalRecords[exercise.exerciseId] || 0);

                    return (
                      <View key={setIndex} style={styles.setRow}>
                        <Text style={styles.setNumber}>#{setIndex + 1}</Text>
                        <TextInput
                          style={[
                            styles.input,
                            styles.setInput,
                            isPotentialPR && styles.prInput,
                          ]}
                          placeholder="kg"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={set.weight}
                          onChangeText={(value) =>
                            updateSet(exerciseIndex, setIndex, "weight", value)
                          }
                        />
                        <TextInput
                          style={[styles.input, styles.setInput]}
                          placeholder="reps"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={set.reps}
                          onChangeText={(value) =>
                            updateSet(exerciseIndex, setIndex, "reps", value)
                          }
                        />
                        {isPotentialPR && (
                          <Text style={styles.prBadge}>🎉 PR!</Text>
                        )}
                        {exercise.sets.length > 1 && (
                          <TouchableOpacity
                            onPress={() => removeSet(exerciseIndex, setIndex)}
                          >
                            <Text style={styles.removeSetButton}>−</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}

                  <TouchableOpacity
                    style={styles.addSetButton}
                    onPress={() => addSet(exerciseIndex)}
                  >
                    <Text style={styles.addSetText}>+ Add Set</Text>
                  </TouchableOpacity>
                </View>

                <AICoachingCard
                  exerciseName={exerciseData?.name || exercise.exerciseId}
                  currentSet={
                    exercise.sets.filter((s) => s.weight && s.reps).length + 1
                  }
                  totalSets={exercise.sets.length}
                  targetReps={exercise.sets[0]?.reps}
                />
              </View>
            );
          })
        )}
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.timerButton}
          onPress={() => setShowRestTimer(true)}
        >
          <Text style={styles.timerButtonText}>⏱ Rest Timer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.templateButton}
          onPress={handleSaveAsTemplate}
        >
          <Text style={styles.templateButtonText}>
            {loadedTemplateId ? "💾 Update Template" : "📋 Save as Template"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveWorkout}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Save Workout"}
          </Text>
        </TouchableOpacity>
      </View>

      <RestTimer
        visible={showRestTimer}
        onClose={() => setShowRestTimer(false)}
      />

      <TemplateSaveModal
        visible={showTemplateSaveModal}
        onClose={() => setShowTemplateSaveModal(false)}
        onSave={handleConfirmSaveTemplate}
        isUpdate={!!loadedTemplateId}
        initialDescription={currentTemplateDescription}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  syncStatus: {
    backgroundColor: "#111",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  syncText: {
    color: "#0a0",
    fontSize: 14,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
  },
  addExerciseButton: {
    backgroundColor: "#0a0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  addExerciseText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    color: "#666",
    fontSize: 14,
  },
  exerciseCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  exerciseCategory: {
    color: "#0a0",
    fontSize: 14,
    textTransform: "capitalize",
  },
  removeButton: {
    color: "#f00",
    fontSize: 24,
    fontWeight: "bold",
    paddingHorizontal: 8,
  },
  setsContainer: {
    marginTop: 8,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  setNumber: {
    color: "#888",
    fontSize: 16,
    width: 32,
  },
  setInput: {
    flex: 1,
  },
  removeSetButton: {
    color: "#f00",
    fontSize: 24,
    fontWeight: "bold",
    paddingHorizontal: 4,
  },
  addSetButton: {
    backgroundColor: "#222",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
    marginTop: 4,
  },
  addSetText: {
    color: "#0a0",
    fontSize: 14,
    textAlign: "center",
  },
  bottomButtons: {
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  timerButton: {
    backgroundColor: "#222",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  timerButtonText: {
    color: "#0a0",
    fontSize: 18,
    fontWeight: "bold",
  },
  templateButton: {
    backgroundColor: "#222",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0a0",
  },
  templateButtonText: {
    color: "#0a0",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#0a0",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  prHint: {
    color: "#0a0",
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "bold",
  },
  prInput: {
    borderColor: "#0a0",
    borderWidth: 2,
  },
  prBadge: {
    fontSize: 14,
    marginLeft: 4,
  },
});
