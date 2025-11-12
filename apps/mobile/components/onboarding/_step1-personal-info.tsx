import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { validateStep1, showValidationAlert, getBMICategory } from '../../lib/onboardingValidation';
import { OnboardingTextInput } from '../../components/ui/OnboardingTextInput';
import { OnboardingSlider } from '../../components/ui/OnboardingSlider';
import { OnboardingBMICard } from '../../components/ui/OnboardingBMICard';
import { OnboardingButton } from '../../components/ui/OnboardingButton';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface Step1Data {
  fullName: string;
  heightCm: number | null;
  heightFt: number | null;
  heightIn: number | null;
  weight: number | null;
  bodyFatPct: number | null;
  heightUnit: 'cm' | 'ft';
  weightUnit: 'kg' | 'lbs';
  unitSystem: 'metric' | 'imperial';
}

interface Step1Props {
  data: Step1Data;
  onDataChange: (data: Step1Data) => void;
  onNext: () => void;
}

export default function Step1PersonalInfo({
  data,
  onDataChange,
  onNext,
}: Step1Props) {
  // Add safety check for data prop
  if (!data) {
    console.error('[Step1PersonalInfo] Data prop is null or undefined:', data);
    return null; // Or render a loading/error state
  }

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateData = (field: keyof Step1Data, value: any) => {
    const newData = { ...data, [field]: value };
    onDataChange(newData);
  };

  // Simplified - no automatic conversions to avoid loops

  const validate = () => {
    const validation = validateStep1(data);
    setErrors(validation.errors);

    if (!validation.isValid) {
      showValidationAlert(validation, 'Please Check Your Information');
    }

    return validation.isValid;
  };

  const handleNext = () => {
    if (validate()) {
      let finalHeightCm = data.heightCm;
      let finalWeightKg = data.weight;

      // Simplified - no BMI announcements for now

      onDataChange({
        ...data,
        heightCm: finalHeightCm,
        weight: finalWeightKg,
      });

      onNext();
    }
  };

  const isValid =
    data.fullName.trim() !== '' &&
    data.weight !== null &&
    data.heightCm && data.heightCm >= 100 && data.heightCm <= 250;

  const getBodyFatCategory = (percentage: number) => {
    if (percentage < 6) return { category: 'Very Low', color: Colors.yellow500 };
    if (percentage < 14) return { category: 'Low', color: Colors.success };
    if (percentage < 18) return { category: 'Normal', color: Colors.success };
    if (percentage < 25) return { category: 'High', color: Colors.yellow500 };
    return { category: 'Very High', color: Colors.destructive };
  };

  // Simplified - no haptic feedback for now

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Let's Get to Know You</Text>
      <Text style={styles.subtitle}>
        Your personal details help us tailor your experience
      </Text>

      {/* BMI Calculator - Real-time display */}
      <OnboardingBMICard
        heightCm={data.heightCm}
        weightKg={data.weight}
      />

      {/* Full Name Input */}
      <OnboardingTextInput
        label="Full Name"
        required
        value={data.fullName}
        onChangeText={(text) => updateData('fullName', text)}
        placeholder="Enter your full name"
        error={errors.fullName}
      />

      {/* Height Section with Slider */}
      <View style={styles.section}>
        <OnboardingSlider
          label="Height in cm"
          value={data.heightCm}
          min={100}
          max={250}
          unit="cm"
          onValueChange={(value) => updateData('heightCm', value)}
        />
      </View>

      {/* Weight Section with Slider */}
      <View style={styles.section}>
        <OnboardingSlider
          label="Weight in kg"
          value={data.weight}
          min={30}
          max={150}
          unit="kg"
          onValueChange={(value) => updateData('weight', value)}
        />
      </View>

      {/* Body Fat Percentage with Slider */}
      <View style={styles.section}>
        <OnboardingSlider
          label="Body Fat % (Optional)"
          value={data.bodyFatPct}
          min={5}
          max={50}
          unit="%"
          onValueChange={(value) => updateData('bodyFatPct', value)}
          category={data.bodyFatPct ? getBodyFatCategory(data.bodyFatPct).category : null}
          categoryColor={data.bodyFatPct ? getBodyFatCategory(data.bodyFatPct).color : null}
          showCategory={true}
        />
      </View>

      {/* Next Button */}
      <OnboardingButton
        title="Next"
        onPress={handleNext}
        disabled={!isValid}
        style={styles.nextButton}
      />
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
  },
  heightInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  nextButton: {
    marginTop: Spacing.xl,
  },
  unitDescription: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
});
