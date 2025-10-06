/**
 * EmptyWorkout Component
 * Displayed when no workout is active
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface EmptyWorkoutProps {
  onAddExercise: () => void;
  onSelectProgram?: () => void;
}

export function EmptyWorkout({ onAddExercise, onSelectProgram }: EmptyWorkoutProps) {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Ionicons name="barbell-outline" size={64} color={Colors.mutedForeground} />
        <Text style={styles.title}>No Active Workout</Text>
        <Text style={styles.subtitle}>
          Start by adding exercises or selecting a program
        </Text>
        
        <View style={styles.actions}>
          <Pressable onPress={onAddExercise} style={styles.primaryButton}>
            <Ionicons name="add-circle" size={20} color={Colors.card} />
            <Text style={styles.primaryButtonText}>Add Exercise</Text>
          </Pressable>
          
          {onSelectProgram && (
            <Pressable onPress={onSelectProgram} style={styles.secondaryButton}>
              <Ionicons name="list" size={20} color={Colors.actionPrimary} />
              <Text style={styles.secondaryButtonText}>Select Program</Text>
            </Pressable>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    width: '100%',
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
  },
  subtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.actionPrimary,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  primaryButtonText: {
    ...TextStyles.body,
    color: Colors.card,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.muted,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  secondaryButtonText: {
    ...TextStyles.body,
    color: Colors.actionPrimary,
    fontWeight: '600',
  },
});
