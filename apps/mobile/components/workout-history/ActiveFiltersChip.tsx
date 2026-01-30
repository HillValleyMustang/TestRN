import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface ActiveFiltersChipProps {
  filterCount: number;
  onClearAll: () => void;
}

export function ActiveFiltersChip({ filterCount, onClearAll }: ActiveFiltersChipProps) {
  if (filterCount === 0) return null;

  return (
    <Pressable style={styles.container} onPress={onClearAll}>
      <Text style={styles.text}>
        {filterCount} Filter{filterCount > 1 ? 's' : ''}
      </Text>
      <Ionicons name="close-circle" size={18} color={Colors.actionPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.blue50,
    borderWidth: 1,
    borderColor: Colors.actionPrimary,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.actionPrimary,
  },
});
