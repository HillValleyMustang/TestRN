import React from 'react';
import { View, StyleSheet } from 'react-native';
import Dropdown from '../../app/_components/ui/Dropdown';
import { Spacing } from '../../constants/Theme';

type SortOption = 'date-desc' | 'date-asc' | 'volume-desc' | 'duration-desc';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SORT_OPTIONS = [
  { label: 'Date (Newest First)', value: 'date-desc' },
  { label: 'Date (Oldest First)', value: 'date-asc' },
  { label: 'Volume (Highest)', value: 'volume-desc' },
  { label: 'Duration (Longest)', value: 'duration-desc' },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <View style={styles.container}>
      <Dropdown
        items={SORT_OPTIONS}
        selectedValue={value}
        onSelect={(newValue) => onChange(newValue as SortOption)}
        placeholder="Sort by..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
