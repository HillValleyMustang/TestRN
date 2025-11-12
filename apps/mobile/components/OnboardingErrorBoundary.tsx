/**
 * OnboardingErrorBoundary Component
 * Provides error boundary specifically for onboarding flow
 * Handles crashes gracefully and offers recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { TextStyles } from '../constants/Typography';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  onReset?: () => void;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[OnboardingErrorBoundary] Error caught:', error);
    console.error('[OnboardingErrorBoundary] Error info:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Log error for analytics/monitoring
    // TODO: Send to error tracking service
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  handleReset = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will clear all your progress and start over. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            this.setState({ hasError: false, error: null, errorInfo: null });
            this.props.onReset?.();
          },
        },
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = 'Something went wrong',
        fallbackMessage = 'We encountered an unexpected error. You can try again or reset your onboarding progress.',
      } = this.props;

      return (
        <View style={styles.container}>
          <View style={styles.errorContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="warning" size={48} color={Colors.destructive} />
            </View>

            <Text style={styles.errorTitle}>{fallbackTitle}</Text>
            <Text style={styles.errorMessage}>{fallbackMessage}</Text>

            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Info (Dev Mode):</Text>
                <Text style={styles.debugText}>{this.state.error.message}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.debugText}>
                    Component Stack: {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
                <Ionicons name="refresh" size={20} color={Colors.white} />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetButton} onPress={this.handleReset}>
                <Ionicons name="refresh-circle" size={20} color={Colors.destructive} />
                <Text style={styles.resetButtonText}>Reset Onboarding</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  errorIcon: {
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    ...TextStyles.h2,
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  errorMessage: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  debugInfo: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  debugTitle: {
    ...TextStyles.label,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  debugText: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    fontFamily: 'monospace',
    marginBottom: Spacing.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  retryButtonText: {
    ...TextStyles.button,
    color: Colors.white,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.destructive,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  resetButtonText: {
    ...TextStyles.button,
    color: Colors.destructive,
  },
});