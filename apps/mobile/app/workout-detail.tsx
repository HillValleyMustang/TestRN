import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from './_contexts/auth-context';
import { useData } from './_contexts/data-context';
import type { WorkoutSession, SetLog } from '@data/storage/models';
import { getExerciseById } from '@data/exercises';
import { formatWeight } from '@data/utils/unit-conversions';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const { getWorkoutSessions, getSetLogs } = useData();
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<SetLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkoutDetail = useCallback(async () => {
    if (!id || !userId) {
      return;
    }

    try {
      const allSessions = await getWorkoutSessions(userId);
      const foundSession = allSessions.find(s => s.id === id);

      if (foundSession) {
        setSession(foundSession);
        const setLogs = await getSetLogs(id);
        setSets(setLogs);
      }
    } catch (error) {
      console.error('Failed to load workout detail:', error);
      Alert.alert('Error', 'Failed to load workout details');
    } finally {
      setLoading(false);
    }
  }, [getSetLogs, getWorkoutSessions, id, userId]);

  useEffect(() => {
    loadWorkoutDetail();
  }, [loadWorkoutDetail]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Workout not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const date = new Date(session.session_date);
  const groupedSets = sets.reduce(
    (acc, set) => {
      if (!acc[set.exercise_id]) {
        acc[set.exercise_id] = [];
      }
      acc[set.exercise_id].push(set);
      return acc;
    },
    {} as Record<string, SetLog[]>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {session.template_name || 'Unnamed Workout'}
        </Text>
        <Text style={styles.date}>
          {date.toLocaleDateString()} at {date.toLocaleTimeString()}
        </Text>
        {session.duration_string && (
          <Text style={styles.duration}>
            Duration: {session.duration_string}
          </Text>
        )}
        {session.rating && (
          <Text style={styles.rating}>
            Rating: {'⭐'.repeat(session.rating)}
          </Text>
        )}
      </View>

      <View style={styles.exercisesSection}>
        <Text style={styles.sectionTitle}>Exercises</Text>
        {Object.entries(groupedSets).map(([exerciseId, exerciseSets]) => {
          const exercise = getExerciseById(exerciseId);
          return (
            <View key={exerciseId} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>
                {exercise?.name || exerciseId}
              </Text>
              {exercise?.category && (
                <Text style={styles.exerciseCategory}>{exercise.category}</Text>
              )}

              <View style={styles.setsTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.setCol]}>
                    Set
                  </Text>
                  <Text style={[styles.tableHeaderText, styles.weightCol]}>
                    Weight
                  </Text>
                  <Text style={[styles.tableHeaderText, styles.repsCol]}>
                    Reps
                  </Text>
                </View>
                {exerciseSets.map((set, index) => (
                  <View key={set.id} style={styles.tableRow}>
                    <Text style={[styles.tableText, styles.setCol]}>
                      {index + 1}
                    </Text>
                    <Text style={[styles.tableText, styles.weightCol]}>
                      {set.weight_kg
                        ? `${formatWeight(set.weight_kg, 'kg')} kg`
                        : '-'}
                    </Text>
                    <Text style={[styles.tableText, styles.repsCol]}>
                      {set.reps || '-'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      {sets.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No exercises logged</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  errorText: {
    color: '#f00',
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    padding: 20,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  duration: {
    color: '#0a0',
    fontSize: 14,
    marginTop: 4,
  },
  rating: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
  exercisesSection: {
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exerciseCategory: {
    color: '#0a0',
    fontSize: 14,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  setsTable: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  tableText: {
    color: '#fff',
    fontSize: 16,
  },
  setCol: {
    width: 50,
  },
  weightCol: {
    flex: 1,
  },
  repsCol: {
    width: 60,
    textAlign: 'right',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});
