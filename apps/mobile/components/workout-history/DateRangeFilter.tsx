import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface DateRangeFilterProps {
  dateFrom: Date | null;
  dateTo: Date | null;
  onDateFromChange: (date: Date | null) => void;
  onDateToChange: (date: Date | null) => void;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DateRangeFilterProps) {
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Any';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* From Date */}
      <View style={styles.dateField}>
        <Text style={styles.label}>From:</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowFromPicker(true)}
        >
          <Text style={[styles.dateText, !dateFrom && styles.dateTextPlaceholder]}>
            {formatDate(dateFrom)}
          </Text>
          <Ionicons name="calendar-outline" size={16} color={Colors.mutedForeground} />
        </Pressable>
        {dateFrom && (
          <Pressable
            style={styles.clearButton}
            onPress={() => onDateFromChange(null)}
          >
            <Ionicons name="close-circle" size={20} color={Colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* To Date */}
      <View style={styles.dateField}>
        <Text style={styles.label}>To:</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowToPicker(true)}
        >
          <Text style={[styles.dateText, !dateTo && styles.dateTextPlaceholder]}>
            {formatDate(dateTo)}
          </Text>
          <Ionicons name="calendar-outline" size={16} color={Colors.mutedForeground} />
        </Pressable>
        {dateTo && (
          <Pressable
            style={styles.clearButton}
            onPress={() => onDateToChange(null)}
          >
            <Ionicons name="close-circle" size={20} color={Colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Date Pickers (iOS/Android) */}
      {showFromPicker && (
        <DateTimePicker
          value={dateFrom || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowFromPicker(Platform.OS === 'ios');
            if (selectedDate) onDateFromChange(selectedDate);
          }}
          maximumDate={dateTo || new Date()}
        />
      )}

      {showToPicker && (
        <DateTimePicker
          value={dateTo || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowToPicker(Platform.OS === 'ios');
            if (selectedDate) onDateToChange(selectedDate);
          }}
          minimumDate={dateFrom || undefined}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.mutedForeground,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    minHeight: 36,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.foreground,
  },
  dateTextPlaceholder: {
    color: Colors.mutedForeground,
  },
  clearButton: {
    padding: Spacing.xs,
  },
});
