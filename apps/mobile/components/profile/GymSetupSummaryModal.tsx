/**
 * Gym Setup Summary Modal
 * Shows detected exercises, t-path breakdown, and equipment scenarios
 * Similar to OnboardingSummaryModal but customized for gym setup flow
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { FontFamily } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';

interface DetectedExercise {
  name: string;
  main_muscle: string;
  type: string;
  is_bonus_exercise?: boolean;
  duplicate_status?: 'none' | 'global' | 'my-exercises';
}

interface Workout {
  id: string;
  template_name: string;
  exercises?: DetectedExercise[];
}

interface GymSetupSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  gymName: string;
  mainTPath: {
    id: string;
    template_name: string;
  } | null;
  childWorkouts: Workout[];
  confirmedExerciseNames: Set<string>;
  totalEquipmentDetected: number;
}

export const GymSetupSummaryModal: React.FC<GymSetupSummaryModalProps> = ({
  visible,
  onClose,
  gymName,
  mainTPath,
  childWorkouts,
  confirmedExerciseNames,
  totalEquipmentDetected,
}) => {
  const router = useRouter();

  const handleContinue = () => {
    console.log('[GymSetupSummaryModal] Continue clicked');
    onClose();
    // Navigation to dashboard is handled by parent component
  };

  const renderGymSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Gym Setup</Text>
      <View style={styles.gymDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="business" size={20} color={Colors.success} />
          <Text style={styles.detailLabel}>Gym Name:</Text>
          <Text style={styles.detailValue}>{gymName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cube" size={20} color={Colors.success} />
          <Text style={styles.detailLabel}>Equipment Detected:</Text>
          <Text style={styles.detailValue}>{totalEquipmentDetected} types</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="barbell" size={20} color={Colors.success} />
          <Text style={styles.detailLabel}>Exercises Added from AI:</Text>
          <Text style={styles.detailValue}>{confirmedExerciseNames.size}</Text>
        </View>
      </View>
    </View>
  );

  const renderWorkoutPlanSummary = () => {
    if (!mainTPath) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Workout Plan</Text>
        <Text style={styles.planDescription}>
          Your Transformation Path "<Text style={styles.planName}>{mainTPath.template_name}</Text>" has been created with the following workouts:
        </Text>

        <View style={styles.workoutsContainer}>
          {childWorkouts.map((workout, workoutIndex) => {
            const workoutColor = getWorkoutColor(workout.template_name);
            return (
              <View key={workout.id} style={[styles.workoutCard, { borderColor: workoutColor.main }]}>
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutTitle}>{workout.template_name}</Text>
                  {workout.exercises && (
                    <Text style={styles.workoutCount}>
                      {workout.exercises.length} exercise{workout.exercises.length > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>

                {workout.exercises && workout.exercises.length > 0 ? (
                  <View style={styles.exercisesList}>
                    {workout.exercises.map((exercise, exerciseIndex) => (
                      <View key={exerciseIndex} style={styles.exerciseRow}>
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                        <View style={styles.exerciseBadges}>
                          {exercise.is_bonus_exercise && (
                            <View style={styles.bonusBadge}>
                              <Text style={styles.bonusBadgeText}>Bonus</Text>
                            </View>
                          )}
                          {confirmedExerciseNames.has(exercise.name) && (
                            <View style={styles.aiBadge}>
                              <Ionicons name="sparkles" size={10} color={Colors.white} />
                              <Text style={styles.aiBadgeText}>AI Identified</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noExercisesText}>
                    No exercises assigned for this session length.
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderEquipmentScenarios = () => {
    let scenarioMessage = '';
    let scenarioType: 'success' | 'warning' | 'info' = 'success';

    const totalExercises = confirmedExerciseNames.size;

    if (totalExercises < 5) {
      scenarioType = 'warning';
      scenarioMessage = `Your gym has limited equipment (${totalEquipmentDetected} types detected). We've generated a workout plan with ${totalExercises} exercises. You can add more exercises manually or analyse more photos later to expand your options.`;
    } else if (totalExercises > 20) {
      scenarioType = 'info';
      scenarioMessage = `Your gym has extensive equipment (${totalEquipmentDetected} types detected) with ${totalExercises} exercises identified! We've prioritised the most effective exercises for your workout plan. You can manage all exercises in the T-Path Management page.`;
    } else {
      scenarioType = 'success';
      scenarioMessage = `Perfect! Your gym has a balanced range of equipment (${totalEquipmentDetected} types) with ${totalExercises} exercises. Your workout plan is optimised for your available equipment.`;
    }

    const iconName = scenarioType === 'success' ? 'checkmark-circle' : scenarioType === 'warning' ? 'warning' : 'information-circle';
    const iconColor = scenarioType === 'success' ? Colors.success : scenarioType === 'warning' ? '#f59e0b' : Colors.primary;

    return (
      <View style={styles.section}>
        <View style={[styles.scenarioCard, styles[`scenarioCard_${scenarioType}`]]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
          <Text style={styles.scenarioText}>{scenarioMessage}</Text>
        </View>
      </View>
    );
  };

  const renderHowItWorks = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>How Your Plan Was Built</Text>
      <Text style={styles.explanationText}>
        Your workout plan was generated based on your session length preference, prioritising exercises from your confirmed gym equipment, then your custom exercises, and finally a selection of effective bodyweight and common gym exercises from our global library.
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
              <Text style={styles.headerTitle}>Your Gym is Ready!</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          <Text style={styles.headerSubtitle}>
            Here's a summary of your gym setup.
          </Text>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {renderGymSummary()}
            {renderEquipmentScenarios()}
            {renderWorkoutPlanSummary()}
            {renderHowItWorks()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Continue to Dashboard</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    width: '90%',
    maxWidth: 500,
    height: '90%', // Changed from maxHeight to height for consistent size
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl, // Extra padding at bottom for better scrolling
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  gymDetails: {
    backgroundColor: Colors.muted,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: Colors.mutedForeground,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
    flex: 1,
    textAlign: 'right',
  },
  scenarioCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  scenarioCard_success: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  scenarioCard_warning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  scenarioCard_info: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  scenarioText: {
    flex: 1,
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  planDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  planName: {
    fontWeight: '600',
    color: Colors.foreground,
  },
  workoutsContainer: {
    gap: Spacing.md,
  },
  workoutCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  workoutTitle: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
  },
  workoutCount: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
  },
  exercisesList: {
    gap: Spacing.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    color: Colors.foreground,
  },
  exerciseBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  bonusBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  bonusBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    color: '#fff',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  aiBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    color: Colors.white,
  },
  noExercisesText: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
    fontStyle: 'italic',
  },
  explanationText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
