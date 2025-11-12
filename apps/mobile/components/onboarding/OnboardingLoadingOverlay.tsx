/**
 * OnboardingLoadingOverlay Component
 * Provides loading states for API calls and transitions during onboarding
 * Shows progress, messages, and prevents user interaction during operations
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface OnboardingLoadingOverlayProps {
  visible: boolean;
  message?: string;
  progress?: number; // 0-100
  showProgress?: boolean;
  type?: 'spinner' | 'pulse' | 'dots';
  backdropOpacity?: number;
  children?: React.ReactNode;
}

export const OnboardingLoadingOverlay: React.FC<OnboardingLoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  progress,
  showProgress = false,
  type = 'spinner',
  backdropOpacity = 0.7,
  children,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  if (!visible) return null;

  const renderLoadingIndicator = () => {
    switch (type) {
      case 'pulse':
        return <View style={styles.pulseIndicator} />;
      case 'dots':
        return <View style={styles.dotsIndicator} />;
      case 'spinner':
      default:
        return (
          <ActivityIndicator
            size="large"
            color={Colors.success}
            style={styles.spinner}
          />
        );
    }
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        {renderLoadingIndicator()}

        <Text style={styles.message}>{message}</Text>

        {showProgress && progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}

        {children}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  spinner: {
    marginBottom: Spacing.md,
  },
  pulseIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success,
    marginBottom: Spacing.md,
    opacity: 0.7,
  },
  dotsIndicator: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  message: {
    ...TextStyles.body,
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.full,
  },
  progressText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
});