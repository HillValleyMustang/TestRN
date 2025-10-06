/**
 * Workout Screen (Redesigned)
 * Simplified workout tracking with new design system
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Alert, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../_contexts/auth-context';
import { useData } from '../_contexts/data-context';
import { useWorkoutFlow } from '../_contexts/workout-flow-context';
import { ExerciseCard, RestTimer, WorkoutHeader, EmptyWorkout } from '../../components/workout';
import { getExerciseById } from '@data/exercises';
import { Colors, Spacing } from '../../constants/Theme';

interface ExerciseSet {
  weight: string;
  reps: string;
  isCompleted: boolean;
  isPR?: boolean;
}

interface WorkoutExercise {
  exerciseId: string;
  sets: ExerciseSet[];
}

export default function WorkoutScreen() {
  const { userId } = useAuth();
  const { addWorkoutSession, addSetLog, getPersonalRecord, getTemplate, getTPath } = useData();
  const { startSession, completeSession, setHasUnsavedChanges } = useWorkoutFlow();
  const router = useRouter();
  const params = useLocalSearchParams<{
    selectedExerciseId?: string;
    templateId?: string;
    tPathId?: string;
  }>();

  const [workoutName, setWorkoutName] = useState('Quick Workout');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [startTime] = useState(new Date());
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<Record<string, number>>({});
  const [loadedTPathId, setLoadedTPathId] = useState<string | null>(null);

  const loadTemplate = useCallback(async (templateId: string) => {
    try {
      const template = await getTemplate(templateId);
      if (!template) {
        Alert.alert('Error', 'Template not found');
        return;
      }

      setWorkoutName(template.name);
      const loadedExercises: WorkoutExercise[] = template.exercises.map(ex => ({
        exerciseId: ex.exercise_id,
        sets: Array(ex.default_sets).fill(null).map(() => ({
          weight: ex.default_weight_kg?.toString() || '',
          reps: ex.default_reps?.toString() || '',
          isCompleted: false,
        })),
      }));

      setExercises(loadedExercises);
      setHasUnsavedChanges(false);

      for (const ex of template.exercises) {
        if (userId) {
          const pr = await getPersonalRecord(userId, ex.exercise_id);
          setPersonalRecords(prev => ({ ...prev, [ex.exercise_id]: pr }));
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to load template');
    }
  }, [getPersonalRecord, getTemplate, setHasUnsavedChanges, userId]);

  const loadTPath = useCallback(async (tPathId: string) => {
    try {
      const tPath = await getTPath(tPathId);
      if (!tPath) {
        Alert.alert('Error', 'Workout program not found');
        return;
      }

      setWorkoutName(tPath.template_name);
      setLoadedTPathId(tPathId);

      const loadedExercises: WorkoutExercise[] = tPath.exercises
        .filter(ex => !ex.is_bonus_exercise)
        .map(ex => ({
          exerciseId: ex.exercise_id,
          sets: Array(ex.target_sets || 3).fill(null).map(() => ({
            weight: '',
            reps: ex.target_reps_min?.toString() || '',
            isCompleted: false,
          })),
        }));

      setExercises(loadedExercises);
      setHasUnsavedChanges(false);

      for (const ex of tPath.exercises) {
        if (userId) {
          const pr = await getPersonalRecord(userId, ex.exercise_id);
          setPersonalRecords(prev => ({ ...prev, [ex.exercise_id]: pr }));
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to load workout program');
    }
  }, [getPersonalRecord, getTPath, setHasUnsavedChanges, userId]);

  const addExercise = useCallback(async (exerciseId: string) => {
    setExercises(prev => {
      if (prev.some(ex => ex.exerciseId === exerciseId)) {
        Alert.alert('Already Added', 'This exercise is already in your workout');
        return prev;
      }
      return [...prev, {
        exerciseId,
        sets: [{ weight: '', reps: '', isCompleted: false }],
      }];
    });
    setHasUnsavedChanges(true);

    if (userId) {
      const pr = await getPersonalRecord(userId, exerciseId);
      setPersonalRecords(prev => ({ ...prev, [exerciseId]: pr }));
    }
  }, [getPersonalRecord, setHasUnsavedChanges, userId]);

  useEffect(() => {
    startSession(params.templateId ?? params.tPathId ?? null);
    return () => {
      completeSession();
      setHasUnsavedChanges(false);
    };
  }, [completeSession, params.templateId, params.tPathId, setHasUnsavedChanges, startSession]);

  useEffect(() => {
    if (params.selectedExerciseId) {
      addExercise(params.selectedExerciseId);
    }
  }, [params.selectedExerciseId, addExercise]);

  useEffect(() => {
    if (params.templateId && userId) {
      loadTemplate(params.templateId);
    }
  }, [params.templateId, userId, loadTemplate]);

  useEffect(() => {
    if (params.tPathId && userId) {
      loadTPath(params.tPathId);
    }
  }, [params.tPathId, userId, loadTPath]);

  const handleAddExercise = useCallback(() => {
    router.push('/exercise-picker');
  }, [router]);

  const handleSetChange = useCallback((
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exerciseIndex].sets[setIndex][field] = value;
      return updated;
    });
    setHasUnsavedChanges(true);
  }, [setHasUnsavedChanges]);

  const handleToggleSetComplete = useCallback(async (
    exerciseIndex: number,
    setIndex: number
  ) => {
    setExercises(prev => {
      const updated = [...prev];
      const set = updated[exerciseIndex].sets[setIndex];
      
      if (!set.isCompleted && (!set.weight || !set.reps)) {
        Alert.alert('Missing Data', 'Please enter weight and reps');
        return prev;
      }

      set.isCompleted = !set.isCompleted;

      if (set.isCompleted) {
        const exerciseId = updated[exerciseIndex].exerciseId;
        const weight = parseFloat(set.weight);
        const pr = personalRecords[exerciseId] || 0;
        
        if (weight > pr) {
          set.isPR = true;
          setPersonalRecords(p => ({ ...p, [exerciseId]: weight }));
        }
        
        setShowRestTimer(true);
      }

      return updated;
    });
    setHasUnsavedChanges(true);
  }, [personalRecords, setHasUnsavedChanges]);

  const handleAddSet = useCallback((exerciseIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
      updated[exerciseIndex].sets.push({
        weight: lastSet?.weight || '',
        reps: lastSet?.reps || '',
        isCompleted: false,
      });
      return updated;
    });
    setHasUnsavedChanges(true);
  }, [setHasUnsavedChanges]);

  const handleRemoveExercise = useCallback((exerciseIndex: number) => {
    Alert.alert(
      'Remove Exercise',
      'Are you sure you want to remove this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setExercises(prev => prev.filter((_, i) => i !== exerciseIndex));
            setHasUnsavedChanges(true);
          },
        },
      ]
    );
  }, [setHasUnsavedChanges]);

  const handleFinishWorkout = useCallback(async () => {
    if (exercises.length === 0) {
      Alert.alert('No Exercises', 'Add at least one exercise to save workout');
      return;
    }

    const hasCompletedSets = exercises.some(ex => 
      ex.sets.some(set => set.isCompleted)
    );

    if (!hasCompletedSets) {
      Alert.alert('No Completed Sets', 'Complete at least one set to save workout');
      return;
    }

    Alert.alert(
      'Finish Workout',
      'Save this workout to your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            if (!userId) return;

            try {
              const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const now = new Date().toISOString();

              await addWorkoutSession({
                id: sessionId,
                user_id: userId,
                session_date: now,
                template_name: workoutName,
                completed_at: now,
                rating: null,
                duration_string: null,
                t_path_id: loadedTPathId,
                created_at: now,
              });

              let prCount = 0;
              for (const exercise of exercises) {
                for (const set of exercise.sets) {
                  if (set.isCompleted && set.weight && set.reps) {
                    await addSetLog({
                      id: `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      session_id: sessionId,
                      exercise_id: exercise.exerciseId,
                      weight_kg: parseFloat(set.weight),
                      reps: parseInt(set.reps, 10),
                      reps_l: null,
                      reps_r: null,
                      time_seconds: null,
                      is_pb: set.isPR || false,
                      created_at: now,
                    });
                    if (set.isPR) prCount++;
                  }
                }
              }

              const message = prCount > 0
                ? `Workout saved! 🎉 ${prCount} new PR${prCount > 1 ? 's' : ''}!`
                : 'Workout saved successfully!';

              Alert.alert('Success', message);
              setExercises([]);
              setHasUnsavedChanges(false);
              completeSession();
              router.push('/(tabs)/dashboard');
            } catch (error) {
              Alert.alert('Error', 'Failed to save workout');
            }
          },
        },
      ]
    );
  }, [exercises, workoutName, userId, loadedTPathId, addWorkoutSession, addSetLog, setHasUnsavedChanges, completeSession, router]);

  if (exercises.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyWorkout
          onAddExercise={handleAddExercise}
          onSelectProgram={() => router.push('/templates')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WorkoutHeader
        workoutName={workoutName}
        startTime={startTime}
        onFinish={handleFinishWorkout}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {showRestTimer && (
          <RestTimer
            duration={90}
            onComplete={() => setShowRestTimer(false)}
            onDismiss={() => setShowRestTimer(false)}
          />
        )}

        {exercises.map((exercise, exerciseIndex) => {
          const exerciseData = getExerciseById(exercise.exerciseId);
          const isCompleted = exercise.sets.every(s => s.isCompleted);

          return (
            <ExerciseCard
              key={exerciseIndex}
              exerciseName={exerciseData?.name || exercise.exerciseId}
              muscleGroup={exerciseData?.muscle_group}
              sets={exercise.sets}
              isCompleted={isCompleted}
              onSetChange={(setIndex, field, value) => 
                handleSetChange(exerciseIndex, setIndex, field, value)
              }
              onToggleSetComplete={(setIndex) => 
                handleToggleSetComplete(exerciseIndex, setIndex)
              }
              onRemove={() => handleRemoveExercise(exerciseIndex)}
              onAddSet={() => handleAddSet(exerciseIndex)}
            />
          );
        })}
      </ScrollView>
    </View>
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
    padding: Spacing.lg,
    gap: Spacing.md,
  },
});
