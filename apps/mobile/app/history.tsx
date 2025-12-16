import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from './_contexts/auth-context';
import { useData } from './_contexts/data-context';
import { useRouter } from 'expo-router';
import type { WorkoutSession } from '@data/storage/models';
import { formatTimeAgo } from '@data/utils/workout-helpers';
import { getExerciseById } from '@data/exercises';
import { WorkoutSummaryModal } from '../components/workout/WorkoutSummaryModal';

export default function HistoryScreen() {
  const { userId } = useAuth();
  const { getWorkoutSessions, getSetLogs } = useData();
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Workout summary modal state
  const [workoutSummaryModalVisible, setWorkoutSummaryModalVisible] = useState(false);
  const [selectedSessionData, setSelectedSessionData] = useState<{
    exercises: any[];
    workoutName: string;
    startTime: Date;
  } | null>(null);

  const loadWorkouts = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      const sessions = await getWorkoutSessions(userId);
      setWorkouts(sessions);
    } catch (error) {
      console.error('Failed to load workouts:', error);
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

  const handleViewSummary = useCallback(
    async (sessionId: string) => {
      if (!userId) return;

      try {
        // Load session data
        const allSessions = await getWorkoutSessions(userId);
        const foundSession = allSessions.find(s => s.id === sessionId);

        if (foundSession) {
          // Load set logs
          const setLogs = await getSetLogs(sessionId);

          // Transform data to modal format
          const exerciseMap = new Map();
          setLogs.forEach((set: any) => {
            const exercise = getExerciseById(set.exercise_id);
            const exerciseName = exercise?.name || `Exercise ${set.exercise_id?.slice(-4) || `Ex`}`;

            if (!exerciseMap.has(set.exercise_id)) {
              exerciseMap.set(set.exercise_id, {
                exerciseId: set.exercise_id,
                exerciseName,
                muscleGroup: exercise?.category || 'Unknown',
                sets: [],
              });
            }

            const exerciseData = exerciseMap.get(set.exercise_id);
            exerciseData.sets.push({
              weight: set.weight_kg?.toString() || '0',
              reps: set.reps?.toString() || '0',
              isCompleted: true, // Assume completed since it's saved
              isPR: set.is_pb || false,
            });
          });

          const exercises = Array.from(exerciseMap.values());
          const startTime = new Date(foundSession.session_date);

          setSelectedSessionData({
            exercises,
            workoutName: foundSession.template_name || 'Workout',
            startTime,
          });

          setWorkoutSummaryModalVisible(true);
        }
      } catch (error) {
        console.error('Failed to load workout summary:', error);
      }
    },
    [userId, getWorkoutSessions, getSetLogs]
  );

  const renderWorkout = ({ item }: { item: WorkoutSession }) => {
    const date = new Date(item.session_date);
    const timeAgo = formatTimeAgo(date);

    return (
      <TouchableOpacity
        style={styles.workoutCard}
        onPress={() => handleViewSummary(item.id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.workoutName}>
            {item.template_name || 'Unnamed Workout'}
          </Text>
          {item.rating && (
            <Text style={styles.rating}>{'⭐'.repeat(item.rating)}</Text>
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
          onPress={() => router.push('/workout')}
        >
          <Text style={styles.addButtonText}>+ Log First Workout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <FlatList
          data={workouts}
          renderItem={renderWorkout}
          keyExtractor={item => item.id}
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

      {/* Workout Summary Modal */}
      <WorkoutSummaryModal
        visible={workoutSummaryModalVisible}
        onClose={() => setWorkoutSummaryModalVisible(false)}
        exercises={selectedSessionData?.exercises || []}
        workoutName={selectedSessionData?.workoutName || ''}
        startTime={selectedSessionData?.startTime || new Date()}
        onSaveWorkout={async () => {
          // Since this is a view-only modal for past workouts, we don't need to save anything
          setWorkoutSummaryModalVisible(false);
        }}
        onRateWorkout={(rating) => {
          // Could implement rating functionality here if needed
          console.log('Workout rated:', rating);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContent: {
    padding: 16,
  },
  workoutCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  rating: {
    fontSize: 14,
  },
  cardDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  detailText: {
    color: '#888',
    fontSize: 14,
  },
  duration: {
    color: '#0a0',
    fontSize: 14,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  addButton: {
    backgroundColor: '#0a0',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
