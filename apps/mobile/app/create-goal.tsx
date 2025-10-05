import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from './contexts/auth-context';
import { useData, type Goal } from './contexts/data-context';
import { useUnitConversion } from './hooks/use-unit-conversion';
import { EXERCISES } from '@data/exercise-library';

export default function CreateGoalScreen() {
  const { userId } = useAuth();
  const { saveGoal } = useData();
  const { displayWeight, parseWeight, weightUnit } = useUnitConversion();

  const [goalType, setGoalType] = useState<string>('');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exerciseId, setExerciseId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const goalTypes = [
    { id: 'weight_loss', label: 'Weight Loss', requiresExercise: false },
    { id: 'weight_gain', label: 'Weight Gain', requiresExercise: false },
    { id: 'strength', label: 'Strength Goal', requiresExercise: true },
    { id: 'workout_frequency', label: 'Workout Frequency', requiresExercise: false },
    { id: 'body_fat', label: 'Body Fat %', requiresExercise: false },
  ];

  const strengthExercises = EXERCISES.filter(e =>
    ['chest', 'back', 'legs', 'shoulders', 'arms'].includes(e.category)
  );

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    if (!goalType) {
      Alert.alert('Missing Information', 'Please select a goal type');
      return;
    }

    if (!targetValue || isNaN(parseFloat(targetValue))) {
      Alert.alert('Missing Information', 'Please enter a valid target value');
      return;
    }

    const selectedGoalType = goalTypes.find(g => g.id === goalType);
    if (selectedGoalType?.requiresExercise && !exerciseId) {
      Alert.alert('Missing Information', 'Please select an exercise for this goal');
      return;
    }

    setSaving(true);
    try {
      let targetValueParsed = parseFloat(targetValue);

      if (goalType === 'weight_loss' || goalType === 'weight_gain' || goalType === 'strength') {
        targetValueParsed = parseWeight(targetValue);
      }

      const newGoal: Goal = {
        id: `goal_${Date.now()}`,
        user_id: userId,
        goal_type: goalType,
        target_value: targetValueParsed,
        current_value: undefined,
        start_date: new Date().toISOString(),
        target_date: targetDate?.toISOString(),
        status: 'active',
        exercise_id: exerciseId || undefined,
        notes: notes || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveGoal(newGoal);
      Alert.alert('Success', 'Goal created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert('Error', 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const getTargetValuePlaceholder = (): string => {
    switch (goalType) {
      case 'weight_loss':
      case 'weight_gain':
        return `Target weight (${weightUnit})`;
      case 'strength':
        return `Target weight (${weightUnit})`;
      case 'workout_frequency':
        return 'Number of workouts per week';
      case 'body_fat':
        return 'Target body fat %';
      default:
        return 'Target value';
    }
  };

  const selectedGoalType = goalTypes.find(g => g.id === goalType);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Goal</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.label}>Goal Type *</Text>
          <View style={styles.goalTypeContainer}>
            {goalTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.goalTypeButton,
                  goalType === type.id && styles.goalTypeButtonActive,
                ]}
                onPress={() => {
                  setGoalType(type.id);
                  setExerciseId('');
                }}
              >
                <Text
                  style={[
                    styles.goalTypeText,
                    goalType === type.id && styles.goalTypeTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {selectedGoalType?.requiresExercise && (
          <View style={styles.section}>
            <Text style={styles.label}>Exercise *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {strengthExercises.map(exercise => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseButton,
                    exerciseId === exercise.id && styles.exerciseButtonActive,
                  ]}
                  onPress={() => setExerciseId(exercise.id)}
                >
                  <Text
                    style={[
                      styles.exerciseText,
                      exerciseId === exercise.id && styles.exerciseTextActive,
                    ]}
                  >
                    {exercise.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Target Value *</Text>
          <TextInput
            style={styles.input}
            placeholder={getTargetValuePlaceholder()}
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={targetValue}
            onChangeText={setTargetValue}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Target Date (Optional)</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {targetDate
                ? targetDate.toLocaleDateString()
                : 'Select target date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={targetDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any notes about this goal..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Create Goal'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    color: '#60a5fa',
    fontSize: 16,
    marginRight: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  goalTypeContainer: {
    gap: 8,
  },
  goalTypeButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
  },
  goalTypeButtonActive: {
    borderColor: '#60a5fa',
    backgroundColor: '#1a2942',
  },
  goalTypeText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  goalTypeTextActive: {
    color: '#60a5fa',
  },
  exerciseButton: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#333',
  },
  exerciseButtonActive: {
    borderColor: '#60a5fa',
    backgroundColor: '#1a2942',
  },
  exerciseText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseTextActive: {
    color: '#60a5fa',
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#60a5fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
