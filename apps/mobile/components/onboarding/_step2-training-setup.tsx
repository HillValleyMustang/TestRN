import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { validateStep2, showValidationAlert } from '../../lib/onboardingValidation';
import {
  announceStepProgress,
  generateAccessibleLabel,
  generateAccessibleHint,
} from '../../lib/accessibilityHelpers';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface Step2Data {
  tPathType: 'ppl' | 'ulul' | null;
  experience: 'beginner' | 'intermediate' | null;
}

interface Step2Props {
  data: Step2Data;
  onDataChange: (data: Step2Data) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2TrainingSetup({
  data,
  onDataChange,
  onNext,
  onBack,
}: Step2Props) {
  const isValid = data.tPathType && data.experience;

  const handleNext = () => {
    const validation = validateStep2(data);
    if (!validation.isValid) {
      showValidationAlert(validation, 'Please Complete Selection');
      return;
    }

    // Announce step progress
    announceStepProgress(2, 5, 'Training Setup');
    onNext();
  };

  const splitOptions = [
    {
      id: 'ppl' as const,
      title: '3-Day Push/Pull/Legs',
      subtitle: 'PPL',
      frequency: '3 days per week',
      pros: ['Time efficient', 'Better recovery', 'Logical grouping'],
      color: '#10B981',
    },
    {
      id: 'ulul' as const,
      title: '4-Day Upper/Lower',
      subtitle: 'ULUL',
      frequency: '4 days per week',
      pros: ['Higher frequency', 'Muscle growth', 'Flexible scheduling'],
      color: '#3B82F6',
    },
  ];

  const experienceOptions = [
    {
      id: 'beginner' as const,
      title: 'Beginner',
      description: 'New to structured training or returning after a long break',
    },
    {
      id: 'intermediate' as const,
      title: 'Intermediate',
      description: 'Some experience with structured training programs',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Training Setup</Text>
      <Text style={styles.subtitle}>
        Select the workout structure and your experience level
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workout Split</Text>
        {splitOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.card,
              data.tPathType === option.id && styles.activeCard,
            ]}
            onPress={() => onDataChange({ ...data, tPathType: option.id })}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={[styles.cardSubtitle, { color: option.color }]}>
                  {option.subtitle}
                </Text>
              </View>
              {data.tPathType === option.id && (
                <View
                  style={[styles.checkmark, { backgroundColor: option.color }]}
                >
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.frequency}>{option.frequency}</Text>
            <View style={styles.prosContainer}>
              {option.pros.map((pro, idx) => (
                <Text key={idx} style={styles.proText}>
                  ✓ {pro}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experience Level</Text>
        {experienceOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.experienceCard,
              data.experience === option.id && styles.experienceCardActive,
            ]}
            onPress={() => onDataChange({ ...data, experience: option.id })}
          >
            <View style={styles.experienceHeader}>
              <Text
                style={[
                  styles.experienceTitle,
                  data.experience === option.id && styles.experienceTitleActive,
                ]}
              >
                {option.title}
              </Text>
              {data.experience === option.id && (
                <View style={styles.experienceCheckmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.experienceDesc,
                data.experience === option.id && styles.experienceDescActive,
              ]}
            >
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
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
  card: {
    backgroundColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  activeCard: {
    borderColor: Colors.success,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    ...TextStyles.bodyMedium,
    fontWeight: '600',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: Colors.white,
    ...TextStyles.smallMedium,
    fontWeight: 'bold',
  },
  frequency: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginBottom: Spacing.md,
  },
  prosContainer: {
    gap: Spacing.xs,
  },
  proText: {
    ...TextStyles.caption,
    color: Colors.success,
  },
  experienceCard: {
    backgroundColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  experienceCardActive: {
    borderColor: Colors.success,
    borderWidth: 2,
    backgroundColor: Colors.secondary,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  experienceTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
  },
  experienceTitleActive: {
    color: Colors.success,
  },
  experienceCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  experienceDesc: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
  },
  experienceDescActive: {
    color: Colors.success,
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
