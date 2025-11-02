import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface WorkoutButtonProps {
  workoutName: string;
  onPress: () => void;
  disabled?: boolean;
}

export const WorkoutButton: React.FC<WorkoutButtonProps> = ({
  workoutName,
  onPress,
  disabled = false,
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.content}>
        <Dumbbell size={24} color={disabled ? Colors.mutedForeground : Colors.primary} />
        <Text
          style={[
            styles.workoutName,
            disabled && styles.disabledText,
          ]}
          numberOfLines={2}
        >
          {workoutName}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
  },
  pressed: {
    backgroundColor: Colors.muted,
    borderColor: Colors.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  workoutName: {
    ...TextStyles.body,
    fontWeight: '600',
    color: Colors.foreground,
    flex: 1,
  },
  disabledText: {
    color: Colors.mutedForeground,
  },
});