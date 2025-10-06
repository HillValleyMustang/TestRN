/**
 * ExerciseCard Component
 * Displays exercise with sets and completion tracking
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { SetRow } from './SetRow';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface ExerciseSet {
  weight: string;
  reps: string;
  isCompleted: boolean;
  isPR?: boolean;
}

interface ExerciseCardProps {
  exerciseName: string;
  muscleGroup?: string;
  sets: ExerciseSet[];
  isCompleted: boolean;
  onSetChange: (setIndex: number, field: 'weight' | 'reps', value: string) => void;
  onToggleSetComplete: (setIndex: number) => void;
  onRemove?: () => void;
  onAddSet?: () => void;
}

export function ExerciseCard({
  exerciseName,
  muscleGroup,
  sets,
  isCompleted,
  onSetChange,
  onToggleSetComplete,
  onRemove,
  onAddSet,
}: ExerciseCardProps) {
  const completedSets = sets.filter(s => s.isCompleted).length;

  return (
    <Card style={[styles.container, isCompleted && styles.containerCompleted]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.exerciseName}>{exerciseName}</Text>
          {muscleGroup && (
            <Text style={styles.muscleGroup}>{muscleGroup}</Text>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>
              {completedSets}/{sets.length}
            </Text>
          </View>
          {onRemove && (
            <Pressable onPress={onRemove} style={styles.removeButton}>
              <Ionicons name="trash-outline" size={18} color={Colors.destructive} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.setsContainer}>
        <View style={styles.setHeader}>
          <Text style={styles.setHeaderText}>Set</Text>
          <Text style={styles.setHeaderText}>Weight</Text>
          <Text style={styles.setHeaderText}>Reps</Text>
          <Text style={styles.setHeaderText}>Done</Text>
        </View>
        
        {sets.map((set, index) => (
          <SetRow
            key={index}
            setNumber={index + 1}
            reps={set.reps}
            weight={set.weight}
            isCompleted={set.isCompleted}
            isPR={set.isPR}
            onRepsChange={(value) => onSetChange(index, 'reps', value)}
            onWeightChange={(value) => onSetChange(index, 'weight', value)}
            onToggleComplete={() => onToggleSetComplete(index)}
          />
        ))}
      </View>

      {onAddSet && (
        <Pressable onPress={onAddSet} style={styles.addSetButton}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.actionPrimary} />
          <Text style={styles.addSetText}>Add Set</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  containerCompleted: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  exerciseName: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.xs / 2,
  },
  muscleGroup: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressBadge: {
    backgroundColor: Colors.muted,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  progressText: {
    ...TextStyles.caption,
    fontWeight: '600',
    color: Colors.foreground,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  setsContainer: {
    gap: Spacing.xs,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  setHeaderText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addSetText: {
    ...TextStyles.caption,
    color: Colors.actionPrimary,
    fontWeight: '600',
  },
});
