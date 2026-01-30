import React from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { getWorkoutColor } from '../../lib/workout-colors';

interface WorkoutTypeChipsProps {
  availableTypes: string[];
  selectedTypes: string[];
  onSelectionChange: (types: string[]) => void;
}

export function WorkoutTypeChips({
  availableTypes,
  selectedTypes,
  onSelectionChange,
}: WorkoutTypeChipsProps) {
  const handleChipPress = (type: string) => {
    if (selectedTypes.includes(type)) {
      // Remove type from selection
      onSelectionChange(selectedTypes.filter(t => t !== type));
    } else {
      // Add type to selection
      onSelectionChange([...selectedTypes, type]);
    }
  };

  const handleAllPress = () => {
    // Clear all selections (show all workouts)
    onSelectionChange([]);
  };

  const isAllSelected = selectedTypes.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* "All" chip */}
        <Pressable
          style={[
            styles.chip,
            isAllSelected && styles.chipActive,
            isAllSelected && {
              backgroundColor: Colors.actionPrimary,
              borderColor: Colors.actionPrimary,
            },
          ]}
          onPress={handleAllPress}
        >
          <Text
            style={[
              styles.chipText,
              isAllSelected && styles.chipTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>

        {/* Workout type chips */}
        {availableTypes.map(type => {
          const isSelected = selectedTypes.includes(type);
          const workoutColor = getWorkoutColor(type);

          return (
            <Pressable
              key={type}
              style={[
                styles.chip,
                isSelected && styles.chipActive,
                isSelected && {
                  backgroundColor: workoutColor.main,
                  borderColor: workoutColor.main,
                },
              ]}
              onPress={() => handleChipPress(type)}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextActive,
                ]}
              >
                {type}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipActive: {
    borderWidth: 2,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.foreground,
  },
  chipTextActive: {
    color: Colors.white,
    fontFamily: 'Poppins_600SemiBold',
  },
});
