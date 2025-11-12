/**
 * OnboardingUnitToggle Component - Enhanced unit toggle switch
 * Provides smooth animations and better visual feedback for unit conversions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface OnboardingUnitToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  disabled?: boolean;
}

export const OnboardingUnitToggle: React.FC<OnboardingUnitToggleProps> = ({
  value,
  onValueChange,
  leftLabel,
  rightLabel,
  disabled = false,
}) => {
  const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const togglePosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 42], // Position for left (2) and right (42) alignment
  });

  const leftTextOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
  });

  const rightTextOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toggleContainer, disabled && styles.disabled]}
        onPress={() => !disabled && onValueChange(!value)}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.toggleBackground,
            {
              backgroundColor: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [Colors.success, Colors.success],
              }),
            },
          ]}
        />

        <Animated.View
          style={[
            styles.toggleSlider,
            {
              transform: [{ translateX: togglePosition }],
            },
          ]}
        />

        <View style={styles.labelsContainer}>
          <Animated.Text
            style={[
              styles.label,
              styles.leftLabel,
              { opacity: leftTextOpacity },
            ]}
          >
            {leftLabel}
          </Animated.Text>

          <Animated.Text
            style={[
              styles.label,
              styles.rightLabel,
              { opacity: rightTextOpacity },
            ]}
          >
            {rightLabel}
          </Animated.Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  toggleContainer: {
    width: 80,
    height: 36,
    borderRadius: BorderRadius.full,
    position: 'relative',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  toggleBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.success,
  },
  toggleSlider: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    top: 2,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    width: '100%',
  },
  label: {
    ...TextStyles.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  leftLabel: {
    color: Colors.white,
  },
  rightLabel: {
    color: Colors.white,
  },
});