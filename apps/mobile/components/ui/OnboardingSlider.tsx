/**
 * OnboardingSlider Component - Interactive slider for height, weight, and body fat inputs
 * Provides visual feedback with real-time calculations and category displays
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent, PanGestureHandlerStateChangeEvent, State } from 'react-native-gesture-handler';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface OnboardingSliderProps {
  label: string;
  value: number | null;
  min: number;
  max: number;
  unit: string;
  onValueChange: (value: number) => void;
  category?: string | null;
  categoryColor?: string | null;
  showCategory?: boolean;
  step?: number;
}

export const OnboardingSlider: React.FC<OnboardingSliderProps> = ({
  label,
  value,
  min,
  max,
  unit,
  onValueChange,
  category,
  categoryColor,
  showCategory = false,
  step = 1,
}) => {
  const sliderWidth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const getPercentage = (val: number) => {
    return ((val - min) / (max - min)) * 100;
  };

  const getValueFromPosition = (position: number, containerWidth: number) => {
    const percentage = Math.max(0, Math.min(1, position / containerWidth));
    const rawValue = min + (percentage * (max - min));
    return Math.round(rawValue / step) * step;
  };

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    if (!isDragging) return;

    const { x } = event.nativeEvent;
    const newValue = getValueFromPosition(x, sliderWidth.current);
    onValueChange(newValue);
  };

  const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.BEGAN) {
      setIsDragging(true);
    } else if (event.nativeEvent.state === State.END) {
      setIsDragging(false);
    }
  };

  const percentage = value ? getPercentage(value) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* Value Display */}
      <View style={styles.valueContainer}>
        <Text style={styles.value}>
          {value !== null ? `${value} ${unit}` : '--'}
        </Text>
        {showCategory && category && (
          <Text style={[styles.category, { color: categoryColor || Colors.foreground }]}>
            {category}
          </Text>
        )}
      </View>

      {/* Slider */}
      <View
        style={styles.sliderContainer}
        onLayout={(event) => {
          sliderWidth.current = event.nativeEvent.layout.width;
        }}
      >
        <View style={styles.sliderTrack}>
          <View
            style={[
              styles.sliderFill,
              { width: `${percentage}%` },
            ]}
          />
        </View>

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <View
            style={[
              styles.sliderThumb,
              { left: `${percentage}%` },
              isDragging && styles.sliderThumbActive,
            ]}
          />
        </PanGestureHandler>
      </View>

      {/* Min/Max Labels */}
      <View style={styles.labelsContainer}>
        <Text style={styles.minMaxLabel}>{min}</Text>
        <Text style={styles.minMaxLabel}>{max}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...TextStyles.label,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  value: {
    ...TextStyles.h2,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  category: {
    ...TextStyles.bodyMedium,
    fontWeight: '600',
  },
  sliderContainer: {
    position: 'relative',
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  sliderThumb: {
    position: 'absolute',
    top: '50%',
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 4,
    borderColor: Colors.primary,
    transform: [{ translateY: -16 }, { translateX: -16 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderThumbActive: {
    transform: [{ translateY: -18 }, { translateX: -16 }, { scale: 1.1 }],
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  minMaxLabel: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
});