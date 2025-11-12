/**
 * OnboardingBMICard Component - Real-time BMI calculation and display
 * Shows BMI value, category, and healthy range indicators
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface OnboardingBMICardProps {
  heightCm: number | null;
  weightKg: number | null;
}

export const OnboardingBMICard: React.FC<OnboardingBMICardProps> = ({
  heightCm,
  weightKg,
}) => {
  const calculateBMI = () => {
    if (!heightCm || !weightKg || heightCm <= 0) return null;

    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: Colors.yellow500, range: '< 18.5' };
    if (bmi < 25) return { category: 'Normal', color: Colors.success, range: '18.5 - 24.9' };
    if (bmi < 30) return { category: 'Overweight', color: Colors.yellow500, range: '25 - 29.9' };
    return { category: 'Obese', color: Colors.destructive, range: '≥ 30' };
  };

  const bmi = calculateBMI();
  const bmiInfo = bmi ? getBMICategory(bmi) : null;

  if (!bmi) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>BMI Calculator</Text>
        <Text style={styles.placeholder}>Enter height and weight to see BMI</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: bmiInfo?.color }]}>
      <Text style={styles.title}>BMI Calculator</Text>

      <View style={styles.bmiDisplay}>
        <Text style={[styles.bmiValue, { color: bmiInfo?.color }]}>
          {bmi.toFixed(1)}
        </Text>
        <Text style={styles.bmiUnit}>kg/m²</Text>
      </View>

      <Text style={[styles.category, { color: bmiInfo?.color }]}>
        {bmiInfo?.category}
      </Text>

      <Text style={styles.range}>
        Healthy range: {bmiInfo?.range}
      </Text>

      {/* BMI Scale Visual */}
      <View style={styles.scaleContainer}>
        <View style={styles.scale}>
          <View style={[styles.scaleSegment, { backgroundColor: Colors.yellow500, flex: 1 }]} />
          <View style={[styles.scaleSegment, { backgroundColor: Colors.success, flex: 2 }]} />
          <View style={[styles.scaleSegment, { backgroundColor: Colors.yellow500, flex: 1 }]} />
          <View style={[styles.scaleSegment, { backgroundColor: Colors.destructive, flex: 1 }]} />
        </View>

        {/* BMI Indicator */}
        <View
          style={[
            styles.indicator,
            {
              left: `${Math.min(Math.max((bmi - 15) / (40 - 15) * 100, 0), 100)}%`,
              backgroundColor: bmiInfo?.color,
            },
          ]}
        />
      </View>

      <View style={styles.labels}>
        <Text style={styles.labelText}>Under</Text>
        <Text style={styles.labelText}>Normal</Text>
        <Text style={styles.labelText}>Over</Text>
        <Text style={styles.labelText}>Obese</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  title: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  placeholder: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  bmiDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  bmiValue: {
    ...TextStyles.h1,
    fontWeight: 'bold',
  },
  bmiUnit: {
    ...TextStyles.bodyLarge,
    color: Colors.mutedForeground,
    marginLeft: Spacing.xs,
  },
  category: {
    ...TextStyles.h5,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  range: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  scaleContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  scale: {
    flexDirection: 'row',
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  scaleSegment: {
    height: '100%',
  },
  indicator: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontSize: 10,
  },
});