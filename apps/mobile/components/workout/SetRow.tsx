/**
 * SetRow Component
 * Individual set input for tracking reps, weight, and completion
 */

import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface SetRowProps {
  setNumber: number;
  reps: string;
  weight: string;
  isCompleted: boolean;
  isPR?: boolean;
  onRepsChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  onToggleComplete: () => void;
}

export function SetRow({
  setNumber,
  reps,
  weight,
  isCompleted,
  isPR,
  onRepsChange,
  onWeightChange,
  onToggleComplete,
}: SetRowProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.setNumber}>{setNumber}</Text>
      
      <TextInput
        style={[styles.input, isCompleted && styles.inputCompleted]}
        value={weight}
        onChangeText={onWeightChange}
        keyboardType="decimal-pad"
        placeholder="kg"
        placeholderTextColor={Colors.mutedForeground}
        editable={!isCompleted}
      />
      
      <Text style={styles.separator}>×</Text>
      
      <TextInput
        style={[styles.input, isCompleted && styles.inputCompleted]}
        value={reps}
        onChangeText={onRepsChange}
        keyboardType="number-pad"
        placeholder="reps"
        placeholderTextColor={Colors.mutedForeground}
        editable={!isCompleted}
      />
      
      <Pressable
        onPress={onToggleComplete}
        style={({ pressed }) => [
          styles.checkButton,
          isCompleted && styles.checkButtonCompleted,
          isPR && styles.checkButtonPR,
          pressed && styles.checkButtonPressed,
        ]}
      >
        {isCompleted && (
          <Ionicons 
            name="checkmark" 
            size={20} 
            color={isPR ? Colors.card : Colors.card} 
          />
        )}
      </Pressable>
      
      {isPR && (
        <View style={styles.prBadge}>
          <Text style={styles.prText}>PR</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  setNumber: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
  },
  input: {
    ...TextStyles.body,
    flex: 1,
    height: 40,
    backgroundColor: Colors.muted,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    color: Colors.foreground,
    textAlign: 'center',
  },
  inputCompleted: {
    backgroundColor: Colors.muted,
    opacity: 0.6,
  },
  separator: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  checkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  checkButtonCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkButtonPR: {
    backgroundColor: Colors.chart4,
    borderColor: Colors.chart4,
  },
  checkButtonPressed: {
    opacity: 0.8,
  },
  prBadge: {
    position: 'absolute',
    right: 35,
    top: -4,
    backgroundColor: Colors.chart4,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  prText: {
    ...TextStyles.caption,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.card,
  },
});
