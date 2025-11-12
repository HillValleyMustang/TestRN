/**
 * OnboardingTextInput Component - Reusable form input for onboarding
 * Matches web design system with consistent styling and validation feedback
 */

import React, { forwardRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface OnboardingTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const OnboardingTextInput = forwardRef<RNTextInput, OnboardingTextInputProps>(
  ({ label, error, hint, containerStyle, required, style, ...props }, ref) => {
    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}
        <RNTextInput
          ref={ref}
          style={[
            styles.input,
            error && styles.inputError,
            style,
          ]}
          placeholderTextColor={Colors.mutedForeground}
          {...props}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
        {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
      </View>
    );
  }
);

OnboardingTextInput.displayName = 'OnboardingTextInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...TextStyles.label,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.destructive,
  },
  input: {
    ...TextStyles.body,
    backgroundColor: Colors.input,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.foreground,
  },
  inputError: {
    borderColor: Colors.destructive,
  },
  errorText: {
    ...TextStyles.small,
    color: Colors.destructive,
    marginTop: Spacing.xs,
  },
  hintText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
  },
});