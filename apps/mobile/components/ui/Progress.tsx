/**
 * Progress Component - Mobile
 * Matches web app's Shadcn/Radix UI Progress component
 * Linear and circular variants
 */

import React from 'react';
import { View, ViewStyle, StyleSheet, Text, StyleProp } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import Svg, { Circle } from 'react-native-svg';

interface ProgressProps {
  value: number; // 0-100
  variant?: 'linear' | 'circular';
  color?: string;
  backgroundColor?: string;
  height?: number;
  size?: number; // For circular variant
  strokeWidth?: number; // For circular variant
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Progress({
  value,
  variant = 'linear',
  color = Colors.actionPrimary,
  backgroundColor = Colors.muted,
  height = 8,
  size = 80,
  strokeWidth = 8,
  showLabel = false,
  style,
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  if (variant === 'circular') {
    return (
      <CircularProgress
        value={clampedValue}
        size={size}
        strokeWidth={strokeWidth}
        color={color}
        backgroundColor={backgroundColor}
        showLabel={showLabel}
        style={style}
      />
    );
  }

  return (
    <View style={[styles.linearContainer, { height }, style]}>
      <View style={[styles.linearBackground, { backgroundColor }]}>
        <View
          style={[
            styles.linearFill,
            {
              backgroundColor: color,
              width: `${clampedValue}%`,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.label}>{Math.round(clampedValue)}%</Text>
      )}
    </View>
  );
}

interface CircularProgressProps {
  value: number;
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor: string;
  showLabel: boolean;
  style?: StyleProp<ViewStyle>;
}

function CircularProgress({
  value,
  size,
  strokeWidth,
  color,
  backgroundColor,
  showLabel,
  style,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <View style={[styles.circularContainer, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      
      {showLabel && (
        <View style={styles.circularLabelContainer}>
          <Text style={styles.circularLabel}>{Math.round(value)}%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  linearContainer: {
    position: 'relative',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  linearBackground: {
    flex: 1,
    height: '100%',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  linearFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  label: {
    ...TextStyles.small,
    color: Colors.foreground,
    marginLeft: Spacing.sm,
    minWidth: 40,
  },
  circularContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularLabelContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularLabel: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
  },
});
