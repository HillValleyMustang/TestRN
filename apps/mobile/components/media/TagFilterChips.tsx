/**
 * TagFilterChips Component
 * Horizontal scrolling tag chips for filtering media posts
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface TagFilterChipsProps {
  availableTags: string[];
  selectedTags: string[];
  onSelectionChange: (tags: string[]) => void;
}

export function TagFilterChips({
  availableTags,
  selectedTags,
  onSelectionChange,
}: TagFilterChipsProps) {
  const handleTagPress = (tag: string) => {
    if (tag === 'All') {
      onSelectionChange([]);
      return;
    }

    const newSelection = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];

    onSelectionChange(newSelection);
  };

  const isAllSelected = selectedTags.length === 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* "All" chip */}
      <Pressable
        style={[
          styles.chip,
          isAllSelected && styles.chipActive,
        ]}
        onPress={() => handleTagPress('All')}
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

      {/* Individual tag chips */}
      {availableTags.map((tag) => {
        const isSelected = selectedTags.includes(tag);

        return (
          <Pressable
            key={tag}
            style={[
              styles.chip,
              isSelected && styles.chipActive,
            ]}
            onPress={() => handleTagPress(tag)}
          >
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextActive,
              ]}
            >
              {tag}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_500Medium',
  },
  chipTextActive: {
    color: 'white',
  },
});
