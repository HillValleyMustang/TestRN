import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutFlow } from './_contexts/workout-flow-context';
import { WorkoutSessionHeader } from '../components/workout/WorkoutSessionHeader';
import { ExerciseCard } from '../components/workout/ExerciseCard';
import { ExerciseInfoModal } from '../components/workout/ExerciseInfoModal';
import { ExerciseSwapModal } from '../components/workout/ExerciseSwapModal';
import { Colors, Spacing } from '../constants/Theme';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const {
    isWorkoutActive,
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    sessionStartTime,
    removeExerciseFromSession,
    substituteExercise,
  } = useWorkoutFlow();

  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [currentExerciseId, setCurrentExerciseId] = useState<string>('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Redirect to launcher if no active workout
  useEffect(() => {
    if (!isWorkoutActive) {
      router.replace('/(tabs)/workout');
    }
  }, [isWorkoutActive, router]);

  const handleInfoPress = (exerciseId: string) => {
    const exercise = exercisesForSession.find(ex => ex.id === exerciseId);
    if (exercise) {
      setSelectedExercise(exercise);
      setInfoModalVisible(true);
    }
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    await removeExerciseFromSession(exerciseId);
  };

  const handleSubstituteExercise = (exerciseId: string) => {
    setCurrentExerciseId(exerciseId);
    setSwapModalVisible(true);
  };

  const handleExerciseSelected = async (newExercise: any) => {
    await substituteExercise(currentExerciseId, newExercise);
    setSwapModalVisible(false);
    setCurrentExerciseId('');
  };

  const handleExerciseSaved = (exerciseName: string, setCount: number) => {
    setSavedMessage('Saved!');
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setSavedMessage(null);
    }, 3000);
  };

  const handleSavedMessageDismiss = () => {
    setSavedMessage(null);
  };

  const renderExercise = ({ item: exercise }: { item: any }) => {
    const exerciseSets = exercisesWithSets[exercise.id] || [];

    return (
      <ExerciseCard
        exercise={exercise}
        sets={exerciseSets}
        onInfoPress={() => handleInfoPress(exercise.id)}
        onRemoveExercise={() => handleRemoveExercise(exercise.id)}
        onSubstituteExercise={() => handleSubstituteExercise(exercise.id)}
        onExerciseSaved={handleExerciseSaved}
      />
    );
  };

  if (!isWorkoutActive || !activeWorkout) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white', textAlign: 'center', marginTop: 50 }}>
          Loading workout session...
        </Text>
      </View>
    );
  }

  if (exercisesForSession.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white', textAlign: 'center', marginTop: 50 }}>
          No exercises found for this workout.
        </Text>
        <Text style={{ color: 'white', textAlign: 'center', marginTop: 20 }}>
          Active workout: {activeWorkout?.template_name || 'None'}
        </Text>
        <Text style={{ color: 'white', textAlign: 'center', marginTop: 10 }}>
          Exercises count: {exercisesForSession.length}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WorkoutSessionHeader
        workoutName={activeWorkout.template_name}
        startTime={sessionStartTime}
        savedMessage={savedMessage}
        onSavedMessageDismiss={handleSavedMessageDismiss}
      />

      <FlatList
        data={exercisesForSession}
        keyExtractor={(item) => item.id!}
        renderItem={renderExercise}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <ExerciseInfoModal
        exercise={selectedExercise}
        visible={infoModalVisible}
        onClose={() => {
          setInfoModalVisible(false);
          setSelectedExercise(null);
        }}
      />

      <ExerciseSwapModal
        visible={swapModalVisible}
        onClose={() => {
          setSwapModalVisible(false);
          setCurrentExerciseId('');
        }}
        onSelectExercise={handleExerciseSelected}
        currentExerciseId={currentExerciseId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2, // Extra space at bottom
  },
});
