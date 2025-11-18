/**
 * Workout Summary Modal
 * Shows a detailed summary of the completed workout
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
import { useLocalSearchParams } from 'expo-router';
import {
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Star,
  Home,
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
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { TextStyles } from '../constants/Typography';
import { supabase } from './_lib/supabase';
import { database } from './_lib/database';
import { ScreenContainer } from '../components/layout';
import { BackgroundRoot } from '../components/BackgroundRoot';
import { ScreenHeader } from '../components/layout';

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

export default function WorkoutSummaryModal() {
  const { userId } = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();

  // Redirect to workout page if no valid sessionId
  useEffect(() => {
    if (!sessionId || !userId) {
      console.log('[WorkoutSummary] No sessionId or userId, redirecting to workout page');
      router.replace('/(tabs)/workout');
      return;
    }
  }, [sessionId, userId, router]);

  const [summaryData, setSummaryData] = useState<WorkoutSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      setSummaryData(null);
      setRating(null);
    };
  }, []);

  // CRITICAL: Enhanced data loading with user filtering
  const loadWorkoutSummary = useCallback(async (): Promise<void> => {
    if (!sessionId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // ENHANCED: Proper timeout protection that doesn't overwrite real data
    let hasRealData = false;
    const fallbackTimer = setTimeout(() => {
      if (!hasRealData) {
        const fallbackData: WorkoutSummaryData = {
          sessionId: sessionId || 'unknown',
          workoutName: 'Workout',
          workoutCategory: 'ad-hoc',
          duration: 'Completed',
          completedAt: new Date().toISOString(),
          exercises: [],
          totalSets: 0,
          totalVolume: 0,
          personalRecords: 0,
        };
        setSummaryData(fallbackData);
        setLoading(false);
      }
    }, 3000); // 3 second timeout

    try {
      // HYBRID STRATEGY: Local DB first, Supabase as backup
      // Step 1: Try local database (immediate, always available)
      try {
        const localSessions = await database.getWorkoutSessions(userId);

        const foundSession = localSessions.find((s: any) => s.id === sessionId);

        if (foundSession) {
          // Get set logs from local database
          const setLogs = await database.getSetLogs(sessionId);

          if (setLogs && setLogs.length > 0) {
            // Get exercise definitions from local database
            const exerciseDefinitions = await database.getExerciseDefinitions();
            const exerciseMap = new Map();
            exerciseDefinitions.forEach((ex: any) => {
              exerciseMap.set(ex.id, ex.name);
            });

            // Process workout data (same logic as before)
            const exerciseMapResult = new Map();
            let totalSets = setLogs.length;
            let totalVolume = 0;
            let personalRecords = 0;

            setLogs.forEach((set: any, index: number) => {
              const exerciseName = exerciseMap.get(set.exercise_id) || `Exercise ${set.exercise_id?.slice(-4) || `Ex-${index}`}`;

              if (!exerciseMapResult.has(set.exercise_id)) {
                exerciseMapResult.set(set.exercise_id, {
                  id: set.exercise_id,
                  name: exerciseName,
                  sets: [],
                });
              }

              const exercise = exerciseMapResult.get(set.exercise_id);
              const isPR = set.is_pb || false;
              exercise.sets.push({
                weight_kg: set.weight_kg,
                reps: set.reps,
                isPR: isPR,
              });

              if (set.weight_kg && set.reps) {
                totalVolume += set.weight_kg * set.reps;
              }
              if (isPR) {
                personalRecords++;
              }
            });

            const exercises = Array.from(exerciseMapResult.values());

            const workoutName = foundSession.template_name || 'Workout';
            let workoutCategory: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'ad-hoc' = 'ad-hoc';
            const name = workoutName.toLowerCase();
            if (name.includes('push')) workoutCategory = 'push';
            else if (name.includes('pull')) workoutCategory = 'pull';
            else if (name.includes('legs')) workoutCategory = 'legs';
            else if (name.includes('upper')) workoutCategory = 'upper';
            else if (name.includes('lower')) workoutCategory = 'lower';

            const processedData: WorkoutSummaryData = {
              sessionId,
              workoutName,
              workoutCategory,
              duration: foundSession.duration_string || 'Completed',
              completedAt: foundSession.completed_at || new Date().toISOString(),
              exercises,
              totalSets,
              totalVolume,
              personalRecords,
            };

            hasRealData = true;
            clearTimeout(fallbackTimer);
            setSummaryData(processedData);
            return; // SUCCESS - no need to check Supabase
          }
        }
      } catch (localError) {
        // Local database query failed, falling back to Supabase
      }

      // Step 2: Local DB failed or no data - try Supabase as backup
      const dataPromise = Promise.all([
        supabase
          .from('workout_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('set_logs')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
      ]);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase timeout')), 2000)
      );

      const [{ data: sessionData }, { data: setLogs }] = await Promise.race([dataPromise, timeoutPromise]) as any;

      if (setLogs && setLogs.length > 0) {

        // Get exercise definitions from Supabase
        const exerciseDefinitionsPromise = supabase
          .from('exercise_definitions')
          .select('id, name')
          .or(`user_id.eq.${userId},user_id.is.null`);

        const { data: exerciseDefinitions } = await exerciseDefinitionsPromise;

        const exerciseMap = new Map();
        if (exerciseDefinitions) {
          exerciseDefinitions.forEach(ex => {
            exerciseMap.set(ex.id, ex.name);
          });
        }

        // Process workout data (same as local)
        const exerciseMapResult = new Map();
        let totalSets = setLogs.length;
        let totalVolume = 0;
        let personalRecords = 0;

        setLogs.forEach((set: any, index: number) => {
          const exerciseName = exerciseMap.get(set.exercise_id) || `Exercise ${set.exercise_id?.slice(-4) || `Ex-${index}`}`;

          if (!exerciseMapResult.has(set.exercise_id)) {
            exerciseMapResult.set(set.exercise_id, {
              id: set.exercise_id,
              name: exerciseName,
              sets: [],
            });
          }

          const exercise = exerciseMapResult.get(set.exercise_id);
          const isPR = set.is_pb || false;
          exercise.sets.push({
            weight_kg: set.weight_kg,
            reps: set.reps,
            isPR: isPR,
          });

          if (set.weight_kg && set.reps) {
            totalVolume += set.weight_kg * set.reps;
          }
          if (isPR) {
            personalRecords++;
          }
        });

        const exercises = Array.from(exerciseMapResult.values());

        const workoutName = sessionData?.template_name || 'Workout';
        let workoutCategory: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'ad-hoc' = 'ad-hoc';
        const name = workoutName.toLowerCase();
        if (name.includes('push')) workoutCategory = 'push';
        else if (name.includes('pull')) workoutCategory = 'pull';
        else if (name.includes('legs')) workoutCategory = 'legs';
        else if (name.includes('upper')) workoutCategory = 'upper';
        else if (name.includes('lower')) workoutCategory = 'lower';

        const processedData: WorkoutSummaryData = {
          sessionId,
          workoutName,
          workoutCategory,
          duration: sessionData?.duration_string || 'Completed',
          completedAt: sessionData?.completed_at || new Date().toISOString(),
          exercises,
          totalSets,
          totalVolume,
          personalRecords,
        };

        hasRealData = true;
        clearTimeout(fallbackTimer);
        setSummaryData(processedData);
      } else {
        // Check if session exists but set logs haven't synced
        if (sessionData) {
          const basicData: WorkoutSummaryData = {
            sessionId,
            workoutName: sessionData.template_name || 'Workout',
            workoutCategory: (sessionData.template_name || '').toLowerCase().includes('push') ? 'push' : 'ad-hoc',
            duration: sessionData.duration_string || 'Completed',
            completedAt: sessionData.completed_at || new Date().toISOString(),
            exercises: [],
            totalSets: 0,
            totalVolume: 0,
            personalRecords: 0,
          };

          hasRealData = true;
          clearTimeout(fallbackTimer);
          setSummaryData(basicData);
        }
      }
    } catch (error) {
      // Error loading workout data from both sources
    }

    // CRITICAL FIX: Only clear timeout if we have real data
    if (hasRealData) {
      clearTimeout(fallbackTimer);
    }
    
    setLoading(false);
  }, [sessionId, userId]);

  useEffect(() => {
    if (sessionId) {
      loadWorkoutSummary();
    }
  }, [sessionId, loadWorkoutSummary]);

  const handleRating = async (newRating: number) => {
    if (!sessionId || !userId) return;

    try {
      setRating(newRating);

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

  if (loading) {
    return (
      <ScreenContainer>
        <BackgroundRoot />
        <ScreenHeader title="Workout Summary" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading summary...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!summaryData) {
    return (
      <ScreenContainer>
        <BackgroundRoot />
        <ScreenHeader title="Workout Summary" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading workout summary...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <BackgroundRoot />
      <ScreenHeader title="Workout Complete!" />
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>

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
                  <Text style={[styles.statValue, { color: '#FFD700' }]}>{summaryData.personalRecords}</Text>
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
                          <Star size={14} color="#FFD700" style={styles.prIcon} />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Rating Section */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingTitle}>How was your workout?</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Pressable key={star} onPress={() => handleRating(star)} style={styles.starButton}>
                    <Star
                      size={32}
                      color={rating && star <= rating ? '#FFD700' : Colors.mutedForeground}
                      fill={rating && star <= rating ? '#FFD700' : 'transparent'}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
                onPress={() => router.replace('/(tabs)/workout')}
              >
                <Text style={styles.secondaryButtonText}>Start Another Workout</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                onPress={() => router.replace('/(tabs)/dashboard')}
              >
                <Home size={24} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Done</Text>
              </Pressable>
            </View>
          </ScrollView>
      </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    zIndex: 9999,
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
    zIndex: 10000,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    minHeight: 60,
  },
  secondaryButtonPressed: {
    backgroundColor: Colors.secondary,
  },
  secondaryButtonText: {
    ...TextStyles.button,
    color: Colors.foreground,
    fontWeight: '600',
  },
});
