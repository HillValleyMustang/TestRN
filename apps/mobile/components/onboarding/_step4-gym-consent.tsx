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
import { validateStep4, showValidationAlert } from '../../lib/onboardingValidation';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface Step4Data {
  gymName: string;
  equipmentMethod: 'photo' | 'skip' | null;
  consentGiven: boolean;
}

interface Step4Props {
  data: Step4Data;
  onDataChange: (data: Step4Data) => void;
  onNext: () => void;
  onBack: () => void;
  onSkipPhoto: () => void;
}

export default function Step4GymConsent({
  data,
  onDataChange,
  onNext,
  onBack,
  onSkipPhoto,
}: Step4Props) {
  const isValid =
    (data.gymName && data.gymName.trim() !== '') && data.equipmentMethod && data.consentGiven;

  const handleContinue = () => {
    console.log('[Step4] Continue pressed with data:', data);
    const validation = validateStep4(data);
    console.log('[Step4] Validation result:', validation);
    if (!validation.isValid) {
      showValidationAlert(validation, 'Please Complete Setup');
      return;
    }

    if (data.equipmentMethod === 'photo') {
      console.log('[Step4] Going to photo step');
      onNext();
    } else {
      console.log('[Step4] Skipping photo, completing onboarding');
      onSkipPhoto();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Gym Setup & Consent</Text>
      <Text style={styles.subtitle}>
        Let's set up your gym equipment and confirm your consent
      </Text>

      <View style={styles.section}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>1</Text>
        </View>
        <Text style={styles.sectionTitle}>Your Gym's Name *</Text>
        <TextInput
          style={styles.input}
          value={data.gymName}
          onChangeText={text => onDataChange({ ...data, gymName: text })}
          placeholder="e.g., Home Gym, Fitness First"
          placeholderTextColor="#666"
        />
        <Text style={styles.hint}>Give your primary gym a name</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>2</Text>
        </View>
        <Text style={styles.sectionTitle}>Equipment Setup *</Text>
        <Text style={styles.description}>
          How would you like to set up your gym equipment?
        </Text>

        <TouchableOpacity
          style={[
            styles.methodCard,
            data.equipmentMethod === 'photo' && styles.methodCardActive,
          ]}
          onPress={() => onDataChange({ ...data, equipmentMethod: 'photo' })}
        >
          <View style={styles.methodHeader}>
            <Text style={styles.methodIcon}>📸</Text>
            <View style={styles.methodContent}>
              <Text
                style={[
                  styles.methodTitle,
                  data.equipmentMethod === 'photo' && styles.methodTitleActive,
                ]}
              >
                AI-Powered Photo Analysis
              </Text>
              <Text style={styles.methodDesc}>
                Upload photos, let AI identify your equipment
              </Text>
            </View>
            {data.equipmentMethod === 'photo' && (
              <View style={styles.radioSelected} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodCard,
            data.equipmentMethod === 'skip' && styles.methodCardActive,
          ]}
          onPress={() => onDataChange({ ...data, equipmentMethod: 'skip' })}
        >
          <View style={styles.methodHeader}>
            <Text style={styles.methodIcon}>⏭️</Text>
            <View style={styles.methodContent}>
              <Text
                style={[
                  styles.methodTitle,
                  data.equipmentMethod === 'skip' && styles.methodTitleActive,
                ]}
              >
                Skip for Now
              </Text>
              <Text style={styles.methodDesc}>
                Use standard equipment, customize later
              </Text>
            </View>
            {data.equipmentMethod === 'skip' && (
              <View style={styles.radioSelected} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>3</Text>
        </View>
        <Text style={styles.sectionTitle}>Data Consent *</Text>
        <TouchableOpacity
          style={styles.consentRow}
          onPress={() =>
            onDataChange({ ...data, consentGiven: !data.consentGiven })
          }
        >
          <View
            style={[
              styles.checkbox,
              data.consentGiven && styles.checkboxActive,
            ]}
          >
            {data.consentGiven && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.consentText}>
            I consent to storing my data for personalized fitness
            recommendations
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
        >
          <Text style={styles.nextButtonText}>
            {data.equipmentMethod === 'photo' ? 'Next' : 'Finish'}
          </Text>
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
    marginBottom: Spacing['3xl'],
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  numberText: {
    color: Colors.white,
    ...TextStyles.bodyLarge,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.input,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...TextStyles.body,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  hint: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontStyle: 'italic',
  },
  description: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
  },
  methodCard: {
    backgroundColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  methodCardActive: {
    borderColor: Colors.success,
    borderWidth: 2,
    backgroundColor: Colors.secondary,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    fontSize: 32,
    marginRight: Spacing.lg,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    ...TextStyles.bodyLarge,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  methodTitleActive: {
    color: Colors.success,
  },
  methodDesc: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    color: Colors.white,
    ...TextStyles.bodyMedium,
  },
  consentText: {
    flex: 1,
    ...TextStyles.bodySmall,
    color: Colors.foreground,
    lineHeight: 20,
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
