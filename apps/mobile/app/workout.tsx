import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from './contexts/auth-context';
import { useData } from './contexts/data-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getExerciseById } from '@data/exercises';

export default function WorkoutScreen() {
  const { userId } = useAuth();
  const { addWorkoutSession, addSetLog, isSyncing, queueLength, isOnline } = useData();
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedExerciseId?: string }>();
  
  const [templateName, setTemplateName] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('bench_press');
  const [sets, setSets] = useState<Array<{ weight: string; reps: string }>>([{ weight: '', reps: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.selectedExerciseId) {
      setSelectedExerciseId(params.selectedExerciseId);
    }
  }, [params.selectedExerciseId]);

  const addSet = () => {
    setSets([...sets, { weight: '', reps: '' }]);
  };

  const updateSet = (index: number, field: 'weight' | 'reps', value: string) => {
    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  const saveWorkout = async () => {
    if (!userId) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
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
        t_path_id: null,
        created_at: now,
      };

      await addWorkoutSession(session);

      const exerciseId = selectedExerciseId;
      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        if (set.weight && set.reps) {
          const setLog = {
            id: `set_${sessionId}_${i}`,
            session_id: sessionId,
            exercise_id: exerciseId,
            weight_kg: parseFloat(set.weight) || null,
            reps: parseInt(set.reps) || null,
            reps_l: null,
            reps_r: null,
            time_seconds: null,
            is_pb: false,
            created_at: now,
          };
          await addSetLog(setLog);
        }
      }

      Alert.alert('Success', `Workout saved! ${queueLength + 1} items in sync queue`);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save workout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.syncStatus}>
        <Text style={styles.syncText}>
          {isOnline ? '🟢 Online' : '🔴 Offline'} • {isSyncing ? 'Syncing...' : `Queue: ${queueLength}`}
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
        <Text style={styles.label}>Exercise</Text>
        <TouchableOpacity 
          style={styles.exerciseSelector}
          onPress={() => router.push('/exercise-picker')}
        >
          <Text style={styles.exerciseName}>
            {getExerciseById(selectedExerciseId)?.name || 'Select Exercise'}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Sets</Text>
        {sets.map((set, index) => (
          <View key={index} style={styles.setRow}>
            <Text style={styles.setNumber}>#{index + 1}</Text>
            <TextInput
              style={[styles.input, styles.setInput]}
              placeholder="Weight (kg)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={set.weight}
              onChangeText={(value) => updateSet(index, 'weight', value)}
            />
            <TextInput
              style={[styles.input, styles.setInput]}
              placeholder="Reps"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={set.reps}
              onChangeText={(value) => updateSet(index, 'reps', value)}
            />
          </View>
        ))}
        
        <TouchableOpacity style={styles.addSetButton} onPress={addSet}>
          <Text style={styles.addSetText}>+ Add Set</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
        onPress={saveWorkout}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Workout'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  syncStatus: {
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  syncText: {
    color: '#0a0',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  setNumber: {
    color: '#888',
    fontSize: 16,
    width: 32,
  },
  setInput: {
    flex: 1,
  },
  addSetButton: {
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addSetText: {
    color: '#0a0',
    fontSize: 14,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#0a0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseSelector: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  arrow: {
    color: '#888',
    fontSize: 24,
    fontWeight: '300',
  },
});
