/**
 * Exercise Selection Dialog
 * Shows detected exercises and allows user to confirm which ones to add to their gym
 * Similar to onboarding Step 5
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { FontFamily } from '../../constants/Typography';

interface DetectedExercise {
  name: string;
  main_muscle: string;
  type: string;
  category?: string;
  description?: string;
  pro_tip?: string;
  video_url?: string;
  movement_type?: string;
  movement_pattern?: string;
  duplicate_status: 'none' | 'global' | 'my-exercises';
  existing_id?: string | null;
}

interface ExerciseSelectionDialogProps {
  visible: boolean;
  gymName: string;
  exercises: DetectedExercise[];
  onBack?: () => void; // Made optional to prevent back navigation
  onConfirm: (confirmedExercises: DetectedExercise[], confirmedNames: Set<string>) => void;
}

export const ExerciseSelectionDialog: React.FC<ExerciseSelectionDialogProps> = ({
  visible,
  gymName,
  exercises,
  onBack,
  onConfirm,
}) => {
  const [confirmedExercises, setConfirmedExercises] = useState<Set<string>>(new Set());

  // Auto-confirm new exercises when exercises prop changes
  useEffect(() => {
    if (exercises.length > 0) {
      const newExercises = exercises.filter(ex => ex.duplicate_status === 'none');
      const newConfirmed = new Set<string>(newExercises.map(ex => ex.name));
      setConfirmedExercises(newConfirmed);
    }
  }, [exercises]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!visible) {
      setConfirmedExercises(new Set());
    }
  }, [visible]);

  const toggleConfirmation = (exerciseName: string) => {
    setConfirmedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseName)) {
        newSet.delete(exerciseName);
      } else {
        newSet.add(exerciseName);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const confirmed = exercises.filter(ex => confirmedExercises.has(ex.name));
    onConfirm(confirmed, confirmedExercises);
  };

  const newExercisesCount = exercises.filter(ex => ex.duplicate_status === 'none').length;
  const confirmedCount = confirmedExercises.size;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {}} // Prevent back button
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Detected Exercises</Text>
              <Text style={styles.subtitle}>
                Our AI identified {exercises.length} exercise{exercises.length > 1 ? 's' : ''} from your gym equipment. 
                Select which ones to add to "{gymName}".
              </Text>
            </View>

            {/* Exercise Count Summary */}
            {newExercisesCount > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>New Exercises:</Text>
                  <Text style={styles.summaryValue}>{newExercisesCount}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Confirmed:</Text>
                  <Text style={styles.summaryValueHighlight}>{confirmedCount}</Text>
                </View>
              </View>
            )}

            {/* Exercises List */}
            {exercises.length > 0 ? (
              <View style={styles.exercisesList}>
                {exercises.map((exercise, index) => {
                const isConfirmed = confirmedExercises.has(exercise.name);
                const isDuplicate = exercise.duplicate_status !== 'none';
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.exerciseCard,
                      isConfirmed && styles.exerciseCardConfirmed,
                      isDuplicate && styles.exerciseCardDuplicate,
                    ]}
                    onPress={() => toggleConfirmation(exercise.name)}
                    disabled={isDuplicate}
                    activeOpacity={isDuplicate ? 1 : 0.7}
                  >
                    <View style={styles.exerciseContent}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <View style={styles.exerciseDetails}>
                        <Text style={styles.exerciseMuscle}>{exercise.main_muscle}</Text>
                        {exercise.movement_pattern && (
                          <Text style={styles.exercisePattern}> • {exercise.movement_pattern}</Text>
                        )}
                      </View>
                      {exercise.description && (
                        <Text style={styles.exerciseDescription} numberOfLines={2}>
                          {exercise.description}
                        </Text>
                      )}
                    </View>

                    <View style={styles.exerciseStatus}>
                      {isDuplicate ? (
                        <View style={styles.duplicateBadge}>
                          <Text style={styles.duplicateText}>
                            {exercise.duplicate_status === 'global' ? 'Global' : 'Exists'}
                          </Text>
                        </View>
                      ) : isConfirmed ? (
                        <View style={styles.confirmedBadge}>
                          <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
                        </View>
                      ) : (
                        <View style={styles.unconfirmedBadge}>
                          <View style={styles.unconfirmedCircle} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="barbell-outline" size={48} color={Colors.mutedForeground} />
                <Text style={styles.emptyStateText}>No exercises detected</Text>
                <Text style={styles.emptyStateSubtext}>Please try again or add exercises manually</Text>
              </View>
            )}

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.mutedForeground} />
              <Text style={styles.infoText}>
                Exercises marked as "Global" or "Exists" are already in your library. 
                Only new exercises can be added to your gym.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                styles.confirmButtonFullWidth,
                confirmedCount === 0 && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={confirmedCount === 0}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>
                {confirmedCount > 0
                  ? `Confirm ${confirmedCount} Exercise${confirmedCount > 1 ? 's' : ''}`
                  : 'Select Exercises'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    width: '90%',
    maxWidth: 500,
    height: '90%', // Changed from maxHeight to height for consistent size
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: Colors.muted,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  summaryValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  exercisesList: {
    marginBottom: Spacing.lg,
    minHeight: 200, // Ensure exercises list is visible
  },
  exerciseCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseCardConfirmed: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  exerciseCardDuplicate: {
    opacity: 0.6,
    backgroundColor: Colors.muted,
  },
  exerciseContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  exerciseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  exerciseMuscle: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: Colors.success,
  },
  exercisePattern: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
  },
  exerciseDescription: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
    lineHeight: 16,
  },
  exerciseStatus: {
    marginLeft: Spacing.sm,
  },
  confirmedBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unconfirmedBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unconfirmedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  duplicateBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  duplicateText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.muted,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.muted,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray900,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  confirmButtonFullWidth: {
    flex: 1,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.muted,
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    marginVertical: Spacing.lg,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
