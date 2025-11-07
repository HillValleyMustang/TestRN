/**
 * Workout Summary Modal
 * Shows a detailed summary of the completed workout
 * Reference: Web app workout summary functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import {
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Star,
  Home,
  RotateCcw,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Footprints,
  ArrowUp,
  ArrowDown,
  Plus,
  Brain,
  AlertTriangle,
  Zap,
} from 'lucide-react-native';
import { useAuth } from './_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { TextStyles } from '../constants/Typography';
import { supabase } from './_lib/supabase';
import { dynamicProgramManager } from '../../../packages/data/src/ai/dynamic-program-manager';
import { performanceForecaster } from '../../../packages/data/src/ai/performance-forecaster';
import { periodizationManager } from '../../../packages/data/src/ai/periodization-manager';

const getCategoryColor = (category: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'ad-hoc'): string => {
  switch (category) {
    case 'push':
      return '#3B82F6'; // Blue
    case 'pull':
      return '#10B981'; // Green
    case 'legs':
      return '#F59E0B'; // Amber
    case 'upper':
      return '#8B5CF6'; // Purple
    case 'lower':
      return '#EF4444'; // Red
    case 'ad-hoc':
      return '#6B7280'; // Gray
    default:
      return Colors.primary;
  }
};

const getCategoryIcon = (category: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'ad-hoc') => {
  switch (category) {
    case 'push':
      return ArrowDownLeft;
    case 'pull':
      return ArrowUpRight;
    case 'legs':
      return Footprints;
    case 'upper':
      return ArrowUp;
    case 'lower':
      return ArrowDown;
    case 'ad-hoc':
      return Plus;
    default:
      return ArrowUp;
  }
};

interface WorkoutSummaryData {
  sessionId: string;
  workoutName: string;
  workoutCategory: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'ad-hoc';
  duration: string;
  completedAt: string;
  exercises: Array<{
    id: string;
    name: string;
    sets: Array<{
      weight_kg: number | null;
      reps: number | null;
      isPR: boolean;
    }>;
  }>;
  totalSets: number;
  totalVolume: number;
  personalRecords: number;
}

interface WorkoutSummaryModalProps {
  visible: boolean;
  sessionId: string | null;
  onClose: () => void;
  onDone: () => void;
  onStartAnother: () => void;
}

export default function WorkoutSummaryModal({
  visible,
  sessionId,
  onClose,
  onDone,
  onStartAnother,
}: WorkoutSummaryModalProps) {
  const { userId } = useAuth();

  const [summaryData, setSummaryData] = useState<WorkoutSummaryData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSummaryData(null);
      setRating(null);
      setAiInsights(null);
    }
  }, [visible]);

  const loadWorkoutSummary = useCallback(async () => {
    if (!sessionId || !userId) return;

    try {
      setLoading(true);
      setLoadingInsights(true);

      console.log('Loading workout summary for session:', sessionId);

      // Get workout session details - force fresh data
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }) // Force fresh query
        .single();

      if (sessionError) throw sessionError;

      console.log('Session loaded:', session);
      console.log('Session duration_string:', session.duration_string);

      // Get all set logs for this session
      const { data: setLogs, error: setsError } = await supabase
        .from('set_logs')
        .select(
          `
          *,
          exercise:exercise_definitions(name, main_muscle)
        `
        )
        .eq('session_id', sessionId)
        .order('exercise_id', { ascending: true })
        .order('created_at', { ascending: true });

      console.log('Set logs for session:', sessionId, setLogs?.length || 0, 'sets found');

      if (setsError) throw setsError;

      // Group sets by exercise
      const exerciseMap = new Map();
      let totalSets = 0;
      let totalVolume = 0;
      let personalRecords = 0;

      setLogs?.forEach((set: any) => {
        console.log('Processing set:', set);
        console.log('Set is_pb value:', set.is_pb);
        if (!exerciseMap.has(set.exercise_id)) {
          exerciseMap.set(set.exercise_id, {
            id: set.exercise_id,
            name: set.exercise?.name || 'Unknown Exercise',
            sets: [],
          });
        }

        const exercise = exerciseMap.get(set.exercise_id);
        const isPR = set.is_pb || false;
        exercise.sets.push({
          weight_kg: set.weight_kg,
          reps: set.reps,
          isPR: isPR,
        });

        totalSets++;
        if (set.weight_kg && set.reps) {
          totalVolume += set.weight_kg * set.reps;
        }
        if (isPR) {
          personalRecords++;
          console.log('Found PR set:', { exercise: exercise.name, weight: set.weight_kg, reps: set.reps });
        }
      });

      console.log('Exercise map size:', exerciseMap.size);
      console.log('Exercises found:', Array.from(exerciseMap.keys()));

      console.log('Summary data:', {
        totalSets,
        totalVolume,
        personalRecords,
        exercises: Array.from(exerciseMap.values()),
      });

      console.log('Final PR count:', personalRecords);

      const exercises = Array.from(exerciseMap.values());

      // Determine workout category for styling
      const lowerTitle = session.template_name.toLowerCase();
      const isUpperLowerSplit = session.template_name?.toLowerCase().includes('upper/lower');
      let workoutCategory: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'ad-hoc' = 'push';

      if (isUpperLowerSplit) {
        if (lowerTitle.includes('upper')) workoutCategory = 'upper';
        else if (lowerTitle.includes('lower')) workoutCategory = 'lower';
      } else {
        if (lowerTitle.includes('push')) workoutCategory = 'push';
        else if (lowerTitle.includes('pull')) workoutCategory = 'pull';
        else if (lowerTitle.includes('legs')) workoutCategory = 'legs';
      }

      setSummaryData({
        sessionId,
        workoutName: session.template_name,
        workoutCategory,
        duration: session.duration_string || '0 seconds',
        completedAt: session.completed_at,
        exercises,
        totalSets,
        totalVolume,
        personalRecords,
      });

      // Load AI insights in parallel
      try {
        const [recoveryAlerts, periodizationStatus, efficiencyMetrics] = await Promise.all([
          dynamicProgramManager.generateRecoveryAlerts(userId),
          periodizationManager.getCurrentCycle(userId),
          performanceForecaster.analyzeTrainingEfficiency(userId)
        ]);

        setAiInsights({
          recoveryAlerts,
          periodizationStatus,
          efficiencyMetrics,
          sessionVolume: totalVolume,
          sessionDuration: session.duration_string
        });
      } catch (insightsError) {
        console.error('Error loading AI insights:', insightsError);
        // Don't fail the whole summary if insights fail
        setAiInsights(null);
      }
    } catch (error) {
      console.error('Error loading workout summary:', error);
      Alert.alert('Error', 'Failed to load workout summary');
    } finally {
      setLoading(false);
      setLoadingInsights(false);
    }
  }, [sessionId, userId]);

  useEffect(() => {
    if (visible && sessionId) {
      // Add a small delay to ensure the session has been updated with duration
      const timer = setTimeout(() => {
        loadWorkoutSummary();
      }, 2000); // Increased to 2 seconds to be safe
      return () => clearTimeout(timer);
    }
  }, [visible, sessionId, loadWorkoutSummary]);

  const handleRating = async (newRating: number) => {
    if (!sessionId || !userId) return;

    try {
      setRating(newRating);

      // Update session rating
      const { error } = await supabase
        .from('workout_sessions')
        .update({ rating: newRating })
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving rating:', error);
      Alert.alert('Error', 'Failed to save rating');
    }
  };

  const handleDone = () => {
    onDone();
  };

  const handleStartAnotherWorkout = () => {
    onStartAnother();
  };

  if (loading) {
    return (
      <Modal visible={visible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading summary...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!summaryData) {
    return (
      <Modal visible={visible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading workout summary...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent={true} animationType="slide" statusBarTranslucent={true}>
      <View style={[styles.modalOverlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }]}>
        <View style={[styles.modalContent, { zIndex: 10000 }]}>
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Workout Complete!</Text>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <X size={24} color={Colors.foreground} />
              </Pressable>
            </View>

            {/* Success Header */}
            <View style={styles.successHeader}>
              <View style={styles.successIconContainer}>
                <CheckCircle size={64} color={Colors.success} />
                <View style={styles.successGlow} />
              </View>
              <Text style={styles.successTitle}>Workout Complete!</Text>
              <View style={[styles.workoutPill, { backgroundColor: getCategoryColor(summaryData.workoutCategory) }]}>
                <View style={styles.workoutPillContent}>
                  {(() => {
                    const IconComponent = getCategoryIcon(summaryData.workoutCategory);
                    return <IconComponent size={16} color={Colors.white} />;
                  })()}
                  <Text style={styles.workoutPillText}>{summaryData.workoutName}</Text>
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Clock size={28} color={Colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: getCategoryColor(summaryData.workoutCategory), textAlign: 'center' }]}>{summaryData.duration}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Target size={28} color={Colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: getCategoryColor(summaryData.workoutCategory) }]}>{summaryData.totalSets}</Text>
                <Text style={styles.statLabel}>Total Sets</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <TrendingUp size={28} color={Colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: getCategoryColor(summaryData.workoutCategory) }]}>
                  {summaryData.totalVolume.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Total Volume (kg)</Text>
              </View>

              {summaryData.personalRecords > 0 && (
                <View style={[styles.statCard, styles.prStatCard]}>
                  <View style={[styles.statIconContainer, styles.prIconContainer]}>
                    <Star size={28} color="#FFD700" fill="#FFD700" />
                  </View>
                  <Text style={[styles.statValue, { color: '#FFD700' }]}>
                    {summaryData.personalRecords}
                  </Text>
                  <Text style={styles.statLabel}>Personal Records</Text>
                </View>
              )}
            </View>

            {/* Exercise Breakdown */}
            <View style={styles.exercisesSection}>
              <Text style={styles.sectionTitle}>Exercise Breakdown</Text>
              {summaryData.exercises.map((exercise, index) => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>
                    {index + 1}. {exercise.name}
                  </Text>
                  <View style={styles.setsSummary}>
                    {exercise.sets.map((set, setIndex) => (
                      <View key={setIndex} style={styles.setItem}>
                        <Text style={styles.setText}>
                          {set.weight_kg || 0}kg × {set.reps || 0} reps
                        </Text>
                        {set.isPR && (
                          <Star
                            size={14}
                            color="#FFD700"
                            style={styles.prIcon}
                          />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* AI Insights Section */}
            {aiInsights && (
              <View style={styles.aiInsightsSection}>
                <View style={styles.aiInsightsHeader}>
                  <Brain size={20} color={Colors.primary} />
                  <Text style={styles.aiInsightsTitle}>AI Training Insights</Text>
                </View>

                {/* Recovery Alerts */}
                {aiInsights.recoveryAlerts?.length > 0 && (
                  <View style={styles.insightsGroup}>
                    <Text style={styles.insightsGroupTitle}>Recovery Intelligence</Text>
                    {aiInsights.recoveryAlerts.slice(0, 2).map((alert: any, index: number) => (
                      <View key={index} style={[
                        styles.insightCard,
                        alert.severity === 'urgent' && styles.urgentCard,
                        alert.severity === 'high' && styles.highCard,
                        alert.severity === 'moderate' && styles.moderateCard
                      ]}>
                        <View style={styles.insightIcon}>
                          {alert.type === 'overtraining_risk' ? (
                            <AlertTriangle size={16} color={Colors.white} />
                          ) : (
                            <Zap size={16} color={Colors.white} />
                          )}
                        </View>
                        <View style={styles.insightContent}>
                          <Text style={styles.insightTitle}>{alert.title}</Text>
                          <Text style={styles.insightMessage}>{alert.message}</Text>
                          {alert.suggestedActions?.[0] && (
                            <Text style={styles.insightAction}>
                              💡 {alert.suggestedActions[0]}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Periodization Status */}
                {aiInsights.periodizationStatus && (
                  <View style={styles.insightsGroup}>
                    <Text style={styles.insightsGroupTitle}>Periodization Status</Text>
                    <View style={styles.insightCard}>
                      <View style={styles.insightIcon}>
                        <Target size={16} color={Colors.white} />
                      </View>
                      <View style={styles.insightContent}>
                        <Text style={styles.insightTitle}>
                          {aiInsights.periodizationStatus.currentPhase} Phase
                        </Text>
                        <Text style={styles.insightMessage}>
                          {aiInsights.periodizationStatus.phaseDurationWeeks - Math.floor((Date.now() - new Date(aiInsights.periodizationStatus.phaseStartDate).getTime()) / (7 * 24 * 60 * 60 * 1000))} weeks remaining
                        </Text>
                        <Text style={styles.insightAction}>
                          🎯 Progress: {aiInsights.periodizationStatus.progressPercentage}%
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Training Efficiency */}
                {aiInsights.efficiencyMetrics && (
                  <View style={styles.insightsGroup}>
                    <Text style={styles.insightsGroupTitle}>Training Efficiency</Text>
                    <View style={styles.insightCard}>
                      <View style={styles.insightIcon}>
                        <TrendingUp size={16} color={Colors.white} />
                      </View>
                      <View style={styles.insightContent}>
                        <Text style={styles.insightTitle}>
                          Efficiency: {aiInsights.efficiencyMetrics.overallEfficiency}/100
                        </Text>
                        <Text style={styles.insightMessage}>
                          {aiInsights.efficiencyMetrics.recommendations[0] || 'Training efficiency is good'}
                        </Text>
                        <Text style={styles.insightAction}>
                          💪 Strength Rate: +{aiInsights.efficiencyMetrics.strengthGains.toFixed(1)}% monthly
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Rating Section */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingTitle}>How was your workout?</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Pressable
                    key={star}
                    onPress={() => handleRating(star)}
                    style={styles.starButton}
                  >
                    <Star
                      size={32}
                      color={
                        rating && star <= rating
                          ? '#FFD700'
                          : Colors.mutedForeground
                      }
                      fill={
                        rating && star <= rating ? '#FFD700' : 'transparent'
                      }
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}
                onPress={handleDone}
              >
                <Home size={24} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Done</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    height: '90%',
    width: '98%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    fontWeight: '600',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: Spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    ...TextStyles.h3,
    color: Colors.destructive,
    textAlign: 'center',
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  successIconContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  successGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: Colors.success,
    borderRadius: 50,
    opacity: 0.2,
  },
  successTitle: {
    ...TextStyles.h2,
    color: Colors.success,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textAlign: 'center',
    fontWeight: '700',
  },
  workoutName: {
    ...TextStyles.h4,
    color: Colors.foreground,
    textAlign: 'center',
    fontWeight: '600',
  },
  workoutPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginTop: Spacing.sm,
  },
  workoutPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  workoutPillText: {
    ...TextStyles.body,
    color: Colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  prStatCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  prIconContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  statValue: {
    ...TextStyles.h3,
    color: Colors.foreground,
    fontWeight: '700',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  exercisesSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    fontWeight: '600',
    marginBottom: Spacing.lg,
  },
  exerciseCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseName: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  setsSummary: {
    gap: Spacing.sm,
  },
  setItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setText: {
    ...TextStyles.body,
    color: Colors.foreground,
  },
  prIcon: {
    marginLeft: Spacing.sm,
  },
  ratingSection: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  ratingTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    marginBottom: Spacing.lg,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  actionButtons: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    gap: Spacing.sm,
    minHeight: 60,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonPressed: {
    backgroundColor: Colors.primary,
    opacity: 0.8,
  },
  primaryButtonText: {
    ...TextStyles.button,
    color: Colors.white,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    gap: Spacing.sm,
    minHeight: 60,
  },
  secondaryButtonPressed: {
    backgroundColor: Colors.muted,
  },
  secondaryButtonText: {
    ...TextStyles.button,
    color: Colors.primary,
    fontWeight: '600',
  },
  aiInsightsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  aiInsightsTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    fontWeight: '600',
  },
  insightsGroup: {
    marginBottom: Spacing.lg,
  },
  insightsGroupTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  insightCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  urgentCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: Colors.destructive,
    borderWidth: 2,
  },
  highCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  moderateCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  insightMessage: {
    ...TextStyles.caption,
    color: Colors.foreground,
    lineHeight: 16,
    marginBottom: Spacing.xs,
  },
  insightAction: {
    ...TextStyles.caption,
    color: Colors.primary,
    fontWeight: '500',
  },
});
