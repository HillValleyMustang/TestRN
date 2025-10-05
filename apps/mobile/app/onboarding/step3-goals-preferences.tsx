import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';

interface Step3Data {
  goalFocus: string;
  preferredMuscles: string;
  constraints: string;
  sessionLength: string;
}

interface Step3Props {
  data: Step3Data;
  onDataChange: (data: Step3Data) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3GoalsPreferences({ data, onDataChange, onNext, onBack }: Step3Props) {
  const isValid = data.goalFocus && data.sessionLength;

  const goals = [
    { id: 'muscle_gain', icon: '💪', text: 'Muscle Gain' },
    { id: 'fat_loss', icon: '🏃', text: 'Fat Loss' },
    { id: 'strength_increase', icon: '🏋️', text: 'Strength Increase' },
  ];

  const muscles = ['Arms', 'Chest', 'Legs', 'Core', 'Back', 'Shoulders'];

  const sessionLengths = [
    { id: '15-30', label: 'Quick Sessions', desc: '15-30 min' },
    { id: '30-45', label: 'Balanced', desc: '30-45 min' },
    { id: '45-60', label: 'Full Workouts', desc: '45-60 min' },
    { id: '60-90', label: 'Extended', desc: '60-90 min' },
  ];

  const selectedMuscles = data.preferredMuscles ? data.preferredMuscles.split(',').map(m => m.trim()) : [];

  const toggleMuscle = (muscle: string) => {
    const current = new Set(selectedMuscles);
    if (current.has(muscle)) {
      current.delete(muscle);
    } else {
      current.add(muscle);
    }
    onDataChange({ ...data, preferredMuscles: Array.from(current).join(', ') });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Goals & Session Preferences</Text>
      <Text style={styles.subtitle}>Tell us what you want to achieve and how long you like to train</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Primary Goal *</Text>
        <View style={styles.goalGrid}>
          {goals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.goalCard,
                data.goalFocus === goal.id && styles.goalCardActive,
              ]}
              onPress={() => onDataChange({ ...data, goalFocus: goal.id })}
            >
              <Text style={styles.goalIcon}>{goal.icon}</Text>
              <Text style={[styles.goalText, data.goalFocus === goal.id && styles.goalTextActive]}>
                {goal.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Focus Muscles (Optional)</Text>
        <View style={styles.muscleGrid}>
          {muscles.map((muscle) => (
            <TouchableOpacity
              key={muscle}
              style={[
                styles.muscleChip,
                selectedMuscles.includes(muscle) && styles.muscleChipActive,
              ]}
              onPress={() => toggleMuscle(muscle)}
            >
              <Text
                style={[
                  styles.muscleText,
                  selectedMuscles.includes(muscle) && styles.muscleTextActive,
                ]}
              >
                {muscle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Length *</Text>
        <View style={styles.sessionGrid}>
          {sessionLengths.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={[
                styles.sessionCard,
                data.sessionLength === session.id && styles.sessionCardActive,
              ]}
              onPress={() => onDataChange({ ...data, sessionLength: session.id })}
            >
              <Text style={[styles.sessionLabel, data.sessionLength === session.id && styles.sessionLabelActive]}>
                {session.label}
              </Text>
              <Text style={[styles.sessionDesc, data.sessionLength === session.id && styles.sessionDescActive]}>
                {session.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Notes / Constraints (Optional)</Text>
        <TextInput
          style={styles.textArea}
          value={data.constraints}
          onChangeText={(text) => onDataChange({ ...data, constraints: text })}
          placeholder="Any injuries, limitations, or health notes..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!isValid}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  goalCardActive: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#0a1a14',
  },
  goalIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  goalTextActive: {
    color: '#10B981',
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleChip: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  muscleChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  muscleText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  muscleTextActive: {
    color: '#000',
  },
  sessionGrid: {
    gap: 12,
  },
  sessionCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sessionCardActive: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#0a1a14',
  },
  sessionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  sessionLabelActive: {
    color: '#10B981',
  },
  sessionDesc: {
    fontSize: 13,
    color: '#888',
  },
  sessionDescActive: {
    color: '#10B981',
  },
  textArea: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    minHeight: 100,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
