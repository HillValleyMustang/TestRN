import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { validateStep3, showValidationAlert } from '../../lib/onboardingValidation';
import {
  announceStepProgress,
  generateAccessibleLabel,
  generateAccessibleHint,
} from '../../lib/accessibilityHelpers';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface Step3Data {
  goalFocus: string;
  preferredMuscles: string;
  constraints: string;
  sessionLength: string | number;
}

interface Step3Props {
  data: Step3Data;
  onDataChange: (data: Step3Data) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3GoalsPreferences({
  data,
  onDataChange,
  onNext,
  onBack,
}: Step3Props) {
  const isValid = data.goalFocus && data.sessionLength;

  const handleNext = () => {
    const validation = validateStep3(data);
    if (!validation.isValid) {
      showValidationAlert(validation, 'Please Complete Required Fields');
      return;
    }

    // Announce step progress
    announceStepProgress(3, 5, 'Goals and Preferences');
    onNext();
  };

  const goals = [
    { id: 'muscle_gain', icon: '💪', text: 'Muscle Gain' },
    { id: 'fat_loss', icon: '🏃', text: 'Fat Loss' },
    { id: 'strength_increase', icon: '🏋️', text: 'Strength Increase' },
  ];

  const muscles = ['Arms', 'Chest', 'Legs', 'Core', 'Back', 'Shoulders'];

  const sessionLengths = [
    { id: 30, label: 'Quick Sessions', desc: '15-30 min' },
    { id: 45, label: 'Balanced', desc: '30-45 min' },
    { id: 60, label: 'Full Workouts', desc: '45-60 min' },
    { id: 90, label: 'Extended', desc: '60-90 min' },
  ];

  const selectedMuscles = data.preferredMuscles
    ? data.preferredMuscles.split(',').map(m => m.trim())
    : [];

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
      <Text style={styles.subtitle}>
        Tell us what you want to achieve and how long you like to train
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Primary Goal *</Text>
        <View style={styles.goalGrid}>
          {goals.map(goal => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.goalCard,
                data.goalFocus === goal.id && styles.goalCardActive,
              ]}
              onPress={() => onDataChange({ ...data, goalFocus: goal.id })}
            >
              <Text style={styles.goalIcon}>{goal.icon}</Text>
              <Text
                style={[
                  styles.goalText,
                  data.goalFocus === goal.id && styles.goalTextActive,
                ]}
              >
                {goal.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Focus Muscles (Optional)</Text>
        <View style={styles.muscleGrid}>
          {muscles.map(muscle => (
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
          {sessionLengths.map(session => (
            <TouchableOpacity
              key={session.id}
              style={[
                styles.sessionCard,
                data.sessionLength === session.id && styles.sessionCardActive,
              ]}
              onPress={() =>
                onDataChange({ ...data, sessionLength: session.id })
              }
            >
              <Text
                style={[
                  styles.sessionLabel,
                  data.sessionLength === session.id &&
                    styles.sessionLabelActive,
                ]}
              >
                {session.label}
              </Text>
              <Text
                style={[
                  styles.sessionDesc,
                  data.sessionLength === session.id && styles.sessionDescActive,
                ]}
              >
                {session.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Health Notes / Constraints (Optional)
        </Text>
        <TextInput
          style={styles.textArea}
          value={data.constraints}
          onChangeText={text => onDataChange({ ...data, constraints: text })}
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
          onPress={handleNext}
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
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    marginBottom: Spacing['3xl'],
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.lg,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  goalCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  goalCardActive: {
    borderColor: Colors.success,
    borderWidth: 2,
    backgroundColor: Colors.secondary,
  },
  goalIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  goalText: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
    textAlign: 'center',
  },
  goalTextActive: {
    color: Colors.success,
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  muscleChip: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  muscleChipActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  muscleText: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
  },
  muscleTextActive: {
    color: Colors.white,
  },
  sessionGrid: {
    gap: Spacing.md,
  },
  sessionCard: {
    backgroundColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sessionCardActive: {
    borderColor: Colors.success,
    borderWidth: 2,
    backgroundColor: Colors.secondary,
  },
  sessionLabel: {
    ...TextStyles.bodyLarge,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  sessionLabelActive: {
    color: Colors.success,
  },
  sessionDesc: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  sessionDescActive: {
    color: Colors.success,
  },
  textArea: {
    backgroundColor: Colors.input,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...TextStyles.body,
    color: Colors.foreground,
    minHeight: 100,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  backButton: {
    flex: 1,
    backgroundColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    color: Colors.foreground,
    ...TextStyles.button,
  },
  nextButton: {
    flex: 1,
    backgroundColor: Colors.success,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: Colors.white,
    ...TextStyles.buttonLarge,
  },
});
