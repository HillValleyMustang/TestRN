import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { usePreferences } from '../../app/_contexts/preferences-context';
import { useWorkoutFlow } from '../../app/_contexts/workout-flow-context';
import type { SetLogState } from '../../types/workout';

interface SetRowProps {
  setNumber: number;
  setData: SetLogState;
  exerciseId: string;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
  onToggleComplete: () => void;
  disabled?: boolean;
}

export const SetRow: React.FC<SetRowProps> = ({
  setNumber,
  setData,
  exerciseId,
  onWeightChange,
  onRepsChange,
  onToggleComplete,
  disabled = false,
}) => {
  const { unitSystem } = usePreferences();
  const { logSet } = useWorkoutFlow();
  const [weight, setWeight] = useState(setData.weight_kg?.toString() || '');
  const [reps, setReps] = useState(setData.reps?.toString() || '');

  const handleWeightChange = (value: string) => {
    setWeight(value);
    onWeightChange(value);
  };

  const handleRepsChange = (value: string) => {
    setReps(value);
    onRepsChange(value);
  };

  const handleToggleComplete = () => {
    if (!disabled) {
      if (!setData.isSaved && (!weight || !reps)) {
        Alert.alert('Incomplete Set Data', 'Please enter both weight and reps before completing the set.');
        return;
      }
      const repsNum = parseInt(reps, 10);
      const weightNum = parseFloat(weight);
      logSet(exerciseId, setData.id!, repsNum, weightNum);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.setNumberContainer}>
        <Text style={[styles.setNumber, disabled && styles.disabledText]}>
          {setNumber}
        </Text>
      </View>

      <View style={styles.prevContainer}>
        <Text style={[styles.prevText, disabled && styles.disabledText]}>
          {setData.lastWeight && setData.lastReps ? `${setData.lastReps} × ${setData.lastWeight}${unitSystem === 'metric' ? 'kg' : 'lbs'}` : '—'}
        </Text>
      </View>

      <View style={styles.inputsContainer}>
        <TextInput
          style={[styles.input, disabled && styles.disabledInput]}
          value={weight}
          onChangeText={handleWeightChange}
          placeholder="0"
          keyboardType="numeric"
          editable={!disabled}
          selectTextOnFocus
        />
        <Text style={[styles.unitText, disabled && styles.disabledText]}>{unitSystem === 'metric' ? 'kg' : 'lbs'}</Text>
      </View>

      <View style={styles.inputsContainer}>
        <TextInput
          style={[styles.input, disabled && styles.disabledInput]}
          value={reps}
          onChangeText={handleRepsChange}
          placeholder="0"
          keyboardType="numeric"
          editable={!disabled}
          selectTextOnFocus
        />
      </View>

      <Pressable
        style={[
          styles.checkbox,
          setData.isSaved && styles.checkboxCompleted,
          disabled && styles.disabledCheckbox,
        ]}
        onPress={handleToggleComplete}
        disabled={disabled}
      >
        {setData.isSaved && (
          <Check size={16} color={Colors.white} />
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: 8,
    marginVertical: 2,
  },
  setNumberContainer: {
    width: 30,
    alignItems: 'center',
  },
  setNumber: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
    fontWeight: '600',
  },
  prevContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  inputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  input: {
    width: 60,
    height: 36,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: Spacing.sm,
    textAlign: 'center',
    ...TextStyles.body,
    color: Colors.foreground,
    backgroundColor: Colors.background,
  },
  unitText: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    marginLeft: Spacing.xs,
    width: 20,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  checkboxCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  disabledText: {
    opacity: 0.5,
  },
  disabledInput: {
    opacity: 0.5,
    backgroundColor: Colors.muted,
  },
  disabledCheckbox: {
    opacity: 0.5,
  },
});
