/**
 * RestTimer Component
 * Enhanced countdown timer for rest periods between sets with notifications
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, AppState, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface RestTimerProps {
  duration: number;
  onComplete: () => void;
  onDismiss: () => void;
}

export function RestTimer({ duration, onComplete, onDismiss }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    setTimeLeft(duration);
    setIsActive(true);
  }, [duration]);

  useEffect(() => {
    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', (nextAppState: any) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came back to foreground - check if timer should still be running
        setIsActive(true);
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - pause timer
        setIsActive(false);
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleTimerComplete();
      return;
    }

    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;

          // 3-second warning (haptic feedback removed)

          if (newTime <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timeLeft, isActive]);

  const handleTimerComplete = async () => {
    try {
      // Show completion alert
      Alert.alert(
        'Rest Complete! 💪',
        'Ready for your next set?',
        [
          { text: 'OK', style: 'default' }
        ]
      );

      onComplete();
    } catch (error) {
      console.error('Error in timer completion:', error);
      onComplete();
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <Card style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="timer" size={24} color={Colors.actionPrimary} />
          <Text style={styles.title}>Rest Time</Text>
          <Pressable onPress={onDismiss} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.foreground} />
          </Pressable>
        </View>

        <Text style={styles.timer}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </Text>

        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${progress}%` },
            ]} 
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => setTimeLeft(prev => Math.min(prev + 15, 300))}
            style={styles.actionButton}
          >
            <Ionicons name="add" size={20} color={Colors.foreground} />
            <Text style={styles.actionText}>+15s</Text>
          </Pressable>

          <Pressable
            onPress={onDismiss}
            style={[styles.actionButton, styles.skipButton]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          <Pressable
            onPress={() => setTimeLeft(prev => Math.max(prev - 15, 0))}
            style={styles.actionButton}
          >
            <Ionicons name="remove" size={20} color={Colors.foreground} />
            <Text style={styles.actionText}>-15s</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderColor: Colors.actionPrimary,
    borderWidth: 2,
  },
  content: {
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...TextStyles.h4,
    color: Colors.foreground,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  timer: {
    ...TextStyles.h1,
    fontSize: 48,
    color: Colors.actionPrimary,
    textAlign: 'center',
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.muted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.actionPrimary,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: Colors.muted,
    borderRadius: 8,
  },
  actionText: {
    ...TextStyles.caption,
    color: Colors.foreground,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: Colors.actionPrimary,
  },
  skipText: {
    ...TextStyles.body,
    color: Colors.card,
    fontWeight: '600',
  },
});
