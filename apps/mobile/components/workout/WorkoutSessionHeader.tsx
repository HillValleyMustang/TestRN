import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useWorkoutFlow } from '../../app/_contexts/workout-flow-context';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface WorkoutSessionHeaderProps {
  workoutName: string;
  startTime: Date | null;
  savedMessage?: string | null;
  onSavedMessageDismiss?: () => void;
}

export const WorkoutSessionHeader: React.FC<WorkoutSessionHeaderProps> = ({
  workoutName,
  startTime,
  savedMessage,
  onSavedMessageDismiss,
}) => {
  const router = useRouter();
  const { finishWorkout, requestNavigation, hasUnsavedChanges } = useWorkoutFlow();
  const [elapsedTime, setElapsedTime] = useState('00:00');

  // Debug logging
  React.useEffect(() => {
    if (savedMessage) {
      console.log('WorkoutSessionHeader received savedMessage:', savedMessage);
    }
  }, [savedMessage]);

  // Update elapsed time every second
  useEffect(() => {
    if (!startTime) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = now.getTime() - startTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      requestNavigation(() => router.back());
    } else {
      router.back();
    }
  };

  const handleFinish = async () => {
    try {
      const sessionId = await finishWorkout();
      if (sessionId) {
        router.replace({
          pathname: '/workout-summary',
          params: { sessionId }
        });
      }
    } catch (error) {
      console.error('Failed to finish workout:', error);
    }
  };

  return (
    <View style={styles.container}>
      {savedMessage && (
        <View style={styles.savedMessageContainer}>
          <Text style={styles.savedMessageText}>{savedMessage}</Text>
          <Pressable
            style={styles.savedMessageDismiss}
            onPress={onSavedMessageDismiss}
          >
            <X size={16} color={Colors.white} />
          </Pressable>
        </View>
      )}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.cancelButtonPressed,
          ]}
          onPress={handleCancel}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <View style={styles.centerContent}>
          <Text style={styles.workoutName} numberOfLines={1}>
            {workoutName}
          </Text>
          <Text style={styles.timer}>
            {elapsedTime}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.finishButton,
            pressed && styles.finishButtonPressed,
          ]}
          onPress={handleFinish}
        >
          <Text style={styles.finishText}>Finish</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 60,
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 6,
  },
  cancelButtonPressed: {
    backgroundColor: Colors.muted,
  },
  cancelText: {
    ...TextStyles.button,
    color: Colors.mutedForeground,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  workoutName: {
    ...TextStyles.h4,
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: 2,
  },
  timer: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontVariant: ['tabular-nums'], // Monospace numbers for timer
  },
  finishButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.success,
    borderRadius: 6,
  },
  finishButtonPressed: {
    backgroundColor: Colors.success,
    opacity: 0.8,
  },
  finishText: {
    ...TextStyles.button,
    color: Colors.white,
    fontWeight: '600',
  },
  savedMessageContainer: {
    backgroundColor: Colors.success,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedMessageText: {
    ...TextStyles.body,
    color: Colors.white,
    fontWeight: '600',
    flex: 1,
  },
  savedMessageDismiss: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});