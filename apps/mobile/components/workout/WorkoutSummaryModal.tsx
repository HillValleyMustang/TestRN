import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { HapticPressable } from '../HapticPressable';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

const { width } = Dimensions.get('window');

interface ExerciseSet {
  weight: string;
  reps: string;
  isCompleted: boolean;
  isPR?: boolean;
}

interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string;
  sets: ExerciseSet[];
}

interface WorkoutSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  exercises: WorkoutExercise[];
  workoutName: string;
  startTime: Date;
  onSaveWorkout: () => Promise<void>;
  onRateWorkout?: (rating: number) => void;
}

export function WorkoutSummaryModal({
  visible,
  onClose,
  exercises,
  workoutName,
  startTime,
  onSaveWorkout,
  onRateWorkout
}: WorkoutSummaryModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    if (visible) {
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
  }, [visible, startTime]);

  const completedSets = exercises.flatMap(ex => ex.sets.filter(set => set.isCompleted));
  const totalVolume = completedSets.reduce((total, set) => {
    const weight = parseFloat(set.weight) || 0;
    const reps = parseInt(set.reps, 10) || 0;
    return total + (weight * reps);
  }, 0);

  const prCount = completedSets.filter(set => set.isPR).length;
  const exerciseCount = exercises.length;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveWorkout();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRating = (newRating: number) => {
    setRating(newRating);
    onRateWorkout?.(newRating);
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <HapticPressable
            key={star}
            style={styles.starButton}
            onPress={() => handleRating(star)}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={32}
              color={star <= rating ? Colors.primary : Colors.mutedForeground}
            />
          </HapticPressable>
        ))}
      </View>
    );
  };

  const renderExerciseSummary = () => {
    if (exercises.length === 0) return null;

    return (
      <Card style={styles.exercisesCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Exercises Performed</Text>
        </View>
        <View style={styles.cardContent}>
          {exercises.map((exercise, index) => {
            const completedSets = exercise.sets.filter(set => set.isCompleted);
            const bestSet = completedSets.reduce((best, current) => {
              const currentVolume = (parseFloat(current.weight) || 0) * (parseInt(current.reps, 10) || 0);
              const bestVolume = (parseFloat(best.weight) || 0) * (parseInt(best.reps, 10) || 0);
              return currentVolume > bestVolume ? current : best;
            }, { weight: '0', reps: '0' });

            return (
              <View key={index} style={styles.exerciseRow}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                  <Text style={styles.exerciseMuscle}>{exercise.muscleGroup}</Text>
                </View>
                <View style={styles.exerciseStats}>
                  <Text style={styles.setsText}>{completedSets.length} sets</Text>
                  <Text style={styles.bestSetText}>
                    {parseFloat(bestSet.weight) > 0
                      ? `${bestSet.weight}kg × ${bestSet.reps}`
                      : `${bestSet.reps} reps`
                    }
                  </Text>
                  {completedSets.some(set => set.isPR) && (
                    <Ionicons name="trophy" size={16} color="#F59E0B" />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Card>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalContainer}>
          <Pressable onPress={(e: any) => e.stopPropagation()} style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Workout Summary</Text>
              <HapticPressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </HapticPressable>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Workout Stats */}
              <View style={styles.statsContainer}>
                <Card style={styles.statsCard}>
                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{totalVolume.toFixed(0)}kg</Text>
                      <Text style={styles.statLabel}>Total Volume</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{prCount}</Text>
                      <Text style={styles.statLabel}>PRs</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{exerciseCount}</Text>
                      <Text style={styles.statLabel}>Exercises</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{duration}</Text>
                      <Text style={styles.statLabel}>Duration</Text>
                    </View>
                  </View>
                </Card>
              </View>

              {/* Rating Section */}
              <Card style={styles.ratingCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Rate Your Workout</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.ratingDescription}>
                    How did this workout feel?
                  </Text>
                  {renderStars()}
                </View>
              </Card>

              {/* Exercise Summary */}
              {renderExerciseSummary()}

              {/* Success Message */}
              {prCount > 0 && (
                <Card style={styles.successCard}>
                  <View style={styles.successContent}>
                    <Ionicons name="trophy" size={24} color="#F59E0B" />
                    <Text style={styles.successText}>
                      🎉 {prCount} new PR{prCount > 1 ? 's' : ''} achieved!
                    </Text>
                  </View>
                </Card>
              )}

              {/* Action Button */}
              <View style={styles.actionContainer}>
                <Button
                  onPress={handleSave}
                  disabled={isSaving}
                  style={styles.saveButton}
                >
                  {isSaving ? "Saving..." : "Save Workout"}
                </Button>
              </View>
            </ScrollView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.foreground,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  statsContainer: {
    marginBottom: Spacing.lg,
  },
  statsCard: {
    padding: Spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  ratingCard: {
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
  },
  cardContent: {
    gap: Spacing.md,
  },
  ratingDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  exercisesCard: {
    marginBottom: Spacing.lg,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  exerciseMuscle: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  setsText: {
    fontSize: 14,
    color: Colors.foreground,
  },
  bestSetText: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  successCard: {
    marginBottom: Spacing.lg,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  actionContainer: {
    marginBottom: Spacing.xl,
  },
  saveButton: {
    width: '100%',
  },
});