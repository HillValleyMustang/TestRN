/**
 * OnboardingSummaryModal Component - Mobile
 * Displays comprehensive summary of user's onboarding completion
 * Matches web app's OnboardingSummaryModal design and functionality
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { WorkoutBadge } from '../ui/WorkoutBadge';

const { width, height } = Dimensions.get('window');

interface Profile {
  full_name: string;
  height_cm?: number | undefined;
  weight_kg?: number | undefined;
  body_fat_pct?: number | undefined;
  primary_goal?: string | undefined;
  preferred_muscles?: string | undefined;
  health_notes?: string | undefined;
  preferred_session_length?: string | number | undefined;
}

interface TPath {
  id: string;
  template_name: string;
}

interface Exercise {
  id: string;
  name: string;
  is_bonus_exercise?: boolean;
}

interface ChildWorkout extends TPath {
  exercises: Exercise[];
}

interface OnboardingSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  profile: Profile;
  mainTPath: TPath;
  childWorkouts: ChildWorkout[];
  confirmedExerciseNames: Set<string>;
}

export function OnboardingSummaryModal({
  visible,
  onClose,
  profile,
  mainTPath,
  childWorkouts,
  confirmedExerciseNames,
}: OnboardingSummaryModalProps) {
  const router = useRouter();

  console.log('[OnboardingSummaryModal] Props received:', {
    visible,
    hasProfile: !!profile,
    mainTPath: mainTPath?.template_name,
    childWorkoutsCount: childWorkouts?.length || 0,
    // FIXED: Removed massive data dump that was causing truncated debug message
    // childWorkoutsData: childWorkouts, // <-- This was causing the issue!
    confirmedExerciseNamesSize: confirmedExerciseNames?.size || 0
  });

  // FIXED: Detailed workout analysis without massive data dump
  if (childWorkouts && childWorkouts.length > 0) {
    console.log('[OnboardingSummaryModal] WORKOUT DETAILS ANALYSIS:');
    console.log('[OnboardingSummaryModal] Total workouts received:', childWorkouts.length);
    console.log('[OnboardingSummaryModal] Workout names:', childWorkouts.map(w => w.template_name));
  }

  console.log('[OnboardingSummaryModal] Modal VISIBLE state:', visible);
  console.log('[OnboardingSummaryModal] About to render modal, visible =', visible);

  // Helper function to format session length for display
  const formatSessionLength = (sessionLength: string | number | undefined): string => {
    if (!sessionLength) return '';
    
    // If it's a number, map to the label
    if (typeof sessionLength === 'number') {
      const sessionLengthMap: Record<number, string> = {
        30: '15-30 mins',
        45: '30-45 mins',
        60: '45-60 mins',
        90: '60-90 mins',
      };
      return sessionLengthMap[sessionLength] || `${sessionLength} mins`;
    }
    
    // If it's already a string, return it (for backward compatibility)
    return sessionLength;
  };

  const handleStartTraining = async () => {
    console.log('[OnboardingSummaryModal] Start Training pressed');

    // Close modal first to trigger database update
    console.log('[OnboardingSummaryModal] Closing modal to trigger database update');
    onClose();

    // NOTE: Navigation is now handled by the onboarding.tsx file after the complete
    // gym creation and sync process finishes. This prevents the "no active gym" error.
    console.log('[OnboardingSummaryModal] Modal closed - onboarding process will handle navigation');
  };

  const renderProfileSummary = () => {
    console.log('[Modal] Rendering profile summary for:', profile?.full_name);
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Profile</Text>
        <View style={styles.profileDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>{profile.full_name}</Text>
          </View>
          {profile.height_cm && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Height:</Text>
              <Text style={styles.detailValue}>{profile.height_cm} cm</Text>
            </View>
          )}
          {profile.weight_kg && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Weight:</Text>
              <Text style={styles.detailValue}>{profile.weight_kg} kg</Text>
            </View>
          )}
          {profile.body_fat_pct && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Body Fat:</Text>
              <Text style={styles.detailValue}>{profile.body_fat_pct}%</Text>
            </View>
          )}
          {profile.primary_goal && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Goal:</Text>
              <Text style={styles.detailValue}>
                {profile.primary_goal.replace(/_/g, ' ')}
              </Text>
            </View>
          )}
          {profile.preferred_muscles && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Focus Muscles:</Text>
              <Text style={styles.detailValue}>{profile.preferred_muscles}</Text>
            </View>
          )}
          {profile.health_notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Health Notes:</Text>
              <Text style={styles.detailValue}>{profile.health_notes}</Text>
            </View>
          )}
          {profile.preferred_session_length && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Session Length:</Text>
              <Text style={styles.detailValue}>{formatSessionLength(profile.preferred_session_length)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderWorkoutPlanSummary = () => {
    console.log('[Modal] Rendering workout plan summary with', childWorkouts?.length || 0, 'workouts');
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Workout Plan</Text>
        <Text style={styles.planDescription}>
          Your new Transformation Path, "<Text style={styles.planName}>{mainTPath.template_name}</Text>", has been created with the following workouts:
        </Text>

        <View style={styles.workoutsContainer}>
          {childWorkouts.map((workout, workoutIndex) => {
            console.log(`[Modal] Rendering workout ${workoutIndex + 1}:`, workout.template_name, 'with', workout.exercises?.length || 0, 'exercises');
            return (
            <View key={workout.id} style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutTitle}>{workout.template_name}</Text>
              </View>

              {workout.exercises && workout.exercises.length > 0 ? (
                <View style={styles.exercisesList}>
                    {workout.exercises.map((exercise, exerciseIndex) => {
                      console.log(`[Modal] Rendering exercise ${exerciseIndex + 1}:`, exercise.name, 'is_bonus:', exercise.is_bonus_exercise);
                      return (
                        <View key={exercise.id} style={styles.exerciseRow}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <View style={styles.exerciseBadges}>
                            {exercise.is_bonus_exercise && (
                              <WorkoutBadge workoutName="Bonus" size="sm" />
                            )}
                            {confirmedExerciseNames.has(exercise.name) && (
                              <View style={styles.aiBadge}>
                                <Ionicons name="sparkles" size={10} color={Colors.white} />
                                <Text style={styles.aiBadgeText}>AI Identified</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
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

  const renderHowItWorks = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>How Your Plan Was Built</Text>
      <Text style={styles.explanationText}>
        Your workout plan was generated based on your session length preference, prioritizing exercises from your confirmed gym equipment, then your custom exercises, and finally a selection of effective bodyweight and common gym exercises from our global library.
      </Text>
    </View>
  );

  console.log('[OnboardingSummaryModal] Starting render - visible =', visible);
  
  // Fallback: Always show a basic modal if the complex one fails
  if (!visible) {
    console.log('[OnboardingSummaryModal] VISIBLE IS FALSE - showing fallback modal');
    return (
      <Modal visible={true} transparent={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'red' }}>
          <Text style={{ fontSize: 30, color: 'white', fontWeight: 'bold' }}>
            MODAL VISIBLE = FALSE
          </Text>
          <Text style={{ fontSize: 20, color: 'white' }}>
            Data: {childWorkouts?.length || 0} workouts
          </Text>
          <Text style={{ fontSize: 20, color: 'white' }}>
            Profile: {profile?.full_name || 'None'}
          </Text>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 20, padding: 10, backgroundColor: 'blue' }}>
            <Text style={{ color: 'white' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

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
              <Text style={styles.headerTitle}>Your Plan is Ready!</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          <Text style={styles.headerSubtitle}>
            Here's a summary of your personalised setup.
          </Text>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderProfileSummary()}
            {renderWorkoutPlanSummary()}
            {renderHowItWorks()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.startButton} onPress={handleStartTraining}>
              <Text style={styles.startButtonText}>Start Training</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: height * 0.95,
    minHeight: 600, // Ensure minimum height for content
    ...Shadows.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    ...TextStyles.h3,
    color: Colors.foreground,
    marginLeft: Spacing.sm,
  },
  headerSubtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileDetails: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  detailLabel: {
    ...TextStyles.bodyMedium,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  detailValue: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
  },
  planDescription: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  planName: {
    fontWeight: '600',
    color: Colors.primary,
  },
  workoutsContainer: {
    gap: Spacing.md,
  },
  workoutCard: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workoutHeader: {
    marginBottom: Spacing.sm,
  },
  workoutTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
  },
  exercisesList: {
    gap: Spacing.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  exerciseName: {
    ...TextStyles.body,
    color: Colors.foreground,
    flex: 1,
  },
  exerciseBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  aiBadge: {
    backgroundColor: Colors.blue500,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  aiBadgeText: {
    ...TextStyles.small,
    color: Colors.white,
    fontWeight: '600',
  },
  noExercisesText: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    fontStyle: 'italic',
  },
  explanationText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  startButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  startButtonText: {
    ...TextStyles.button,
    color: Colors.white,
  },
});