/**
 * AdHocGeneratorDialog Component
 * Dialog to generate a timed workout with AI based on user preferences
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { OnboardingSlider } from '../ui/OnboardingSlider';
import { useAuth } from '../../app/_contexts/auth-context';
import type { ExerciseDefinition } from '@data/types/exercise';

interface AdHocGeneratorDialogProps {
  visible: boolean;
  onClose: () => void;
  onWorkoutGenerated: (exercises: any[]) => void;
  activeGymName: string | null;
}

type WorkoutFocus = 'Full Body' | 'Upper Body' | 'Lower Body';

export function AdHocGeneratorDialog({
  visible,
  onClose,
  onWorkoutGenerated,
  activeGymName,
}: AdHocGeneratorDialogProps) {
  const { session } = useAuth();
  const [timeInMinutes, setTimeInMinutes] = useState(30);
  const [workoutFocus, setWorkoutFocus] = useState<WorkoutFocus>('Full Body');
  const [useGymEquipment, setUseGymEquipment] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!session?.access_token) {
      Alert.alert('Error', 'You must be logged in to generate a workout.');
      return;
    }

    setLoading(true);
    try {
      const SUPABASE_PROJECT_ID = 'mgbfevrzrbjjiajkqpti';
      const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-adhoc-workout`;

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          time_in_minutes: timeInMinutes,
          workout_focus: workoutFocus,
          use_gym_equipment: useGymEquipment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workout.');
      }

      if (data.workout && data.workout.length > 0) {
        onWorkoutGenerated(data.workout);
        onClose();
      } else {
        Alert.alert(
          'No Workout Generated',
          'Could not generate a workout with the selected options. Try a longer duration.'
        );
      }
    } catch (error: any) {
      console.error('[AdHocGeneratorDialog] Error generating workout:', error);
      Alert.alert('Error', `Failed to generate workout: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const focusOptions: WorkoutFocus[] = ['Full Body', 'Upper Body', 'Lower Body'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Ionicons name="sparkles" size={24} color={Colors.primary} />
                <Text style={styles.title}>Generate Workout</Text>
              </View>
              <TouchableOpacity onPress={onClose} disabled={loading}>
                <Ionicons name="close" size={24} color={Colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.description}>
                Select your preferences and let the AI build a quick workout for you.
              </Text>

              {/* Duration Slider */}
              <View style={styles.section}>
                <OnboardingSlider
                  label="Duration"
                  value={timeInMinutes}
                  min={15}
                  max={90}
                  step={5}
                  unit="minutes"
                  onValueChange={setTimeInMinutes}
                />
              </View>

              {/* Workout Focus */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Workout Focus</Text>
                <View style={styles.focusContainer}>
                  {focusOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.focusButton,
                        workoutFocus === option && styles.focusButtonActive,
                      ]}
                      onPress={() => setWorkoutFocus(option)}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.focusButtonText,
                          workoutFocus === option && styles.focusButtonTextActive,
                        ]}
                      >
                        {option === 'Full Body' ? 'Full Body' : option.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Equipment Toggle */}
              <View style={styles.section}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextContainer}>
                    <Text style={styles.toggleLabel}>
                      Use Equipment from "{activeGymName || 'Your Active Gym'}"
                    </Text>
                    <Text style={styles.toggleSublabel}>
                      If off, exercises from the global library will be used.
                    </Text>
                  </View>
                  <Switch
                    value={useGymEquipment}
                    onValueChange={setUseGymEquipment}
                    trackColor={{ false: Colors.muted, true: Colors.primary }}
                    thumbColor={Colors.white}
                    disabled={loading}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.generateButton, loading && styles.generateButtonDisabled]}
                onPress={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color={Colors.white} />
                    <Text style={styles.generateButtonText}>Generate Workout</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  dialog: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
  },
  content: {
    padding: Spacing.lg,
  },
  description: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    ...TextStyles.label,
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  focusContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  focusButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  focusButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  focusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  focusButtonTextActive: {
    color: Colors.white,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 4,
  },
  toggleSublabel: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 16,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
