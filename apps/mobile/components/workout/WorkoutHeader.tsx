/**
 * WorkoutHeader Component
 * Shows workout name, elapsed time, and finish button
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface WorkoutHeaderProps {
  workoutName: string;
  startTime: Date | null;
  onFinish: () => void;
  onBack?: () => void;
}

export function WorkoutHeader({ 
  workoutName, 
  startTime, 
  onFinish,
  onBack,
}: WorkoutHeaderProps) {
  const [elapsedTime, setElapsedTime] = useState('00:00');

  useEffect(() => {
    if (!startTime) return;

    const updateElapsed = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setElapsedTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
          </Pressable>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{workoutName}</Text>
          {startTime && (
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={16} color={Colors.mutedForeground} />
              <Text style={styles.timer}>{elapsedTime}</Text>
            </View>
          )}
        </View>
        <Pressable onPress={onFinish} style={styles.finishButton}>
          <Text style={styles.finishText}>Finish</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
    marginBottom: Spacing.xs / 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  timer: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
  finishButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  finishText: {
    ...TextStyles.body,
    color: Colors.card,
    fontWeight: '600',
  },
});
