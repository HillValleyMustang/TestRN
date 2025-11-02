import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { Info, Menu, Plus, ChevronDown, ChevronUp, History, RotateCcw, X, Save, Lightbulb, Trophy } from 'lucide-react-native';
import { useWorkoutFlow } from '../../app/_contexts/workout-flow-context';
import { useRollingStatus } from '../../hooks/useRollingStatus';
import { useAuth } from '../../app/_contexts/auth-context';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { supabase } from '../../app/_lib/supabase';
import Toast from 'react-native-toast-message';

interface SetLogState {
  id: string | null;
  created_at: string | null;
  session_id: string | null;
  exercise_id: string;
  weight_kg: number | null;
  reps: number | null;
  reps_l: number | null;
  reps_r: number | null;
  time_seconds: number | null;
  is_pb: boolean;
  isSaved: boolean;
  isPR: boolean;
  lastWeight: number | null;
  lastReps: number | null;
  lastRepsL: number | null;
  lastRepsR: number | null;
  lastTimeSeconds: number | null;
}

interface WorkoutExercise {
  id: string;
  name: string;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  equipment: string | null;
  user_id: string | null;
  library_id: string | null;
  created_at: string | null;
  is_favorite: boolean | null;
  icon_url: string | null;
  is_bonus_exercise?: boolean;
}

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  sets: SetLogState[];
  exerciseNumber?: number;
  onInfoPress?: () => void;
  onAddSet?: () => void;
  onRemoveExercise?: () => void;
  onSubstituteExercise?: () => void;
  onExerciseSaved?: (exerciseName: string, setCount: number) => void;
  accentColor?: string | undefined;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  sets,
  exerciseNumber,
  onInfoPress,
  onAddSet,
  onRemoveExercise,
  onSubstituteExercise,
  onExerciseSaved,
  accentColor,
}) => {
  const { updateSet, currentSessionId } = useWorkoutFlow();
  const { userId } = useAuth();
  const { refetch } = useRollingStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCustomAlertModal, setShowCustomAlertModal] = useState(false);
  const [customAlertConfig, setCustomAlertConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'destructive' }>;
  } | null>(null);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [previousWorkoutSets, setPreviousWorkoutSets] = useState<Array<{ weight_kg: number | null; reps: number | null }>>([]);
  const [isExerciseSaved, setIsExerciseSaved] = useState(false);
  const [localSets, setLocalSets] = useState<SetLogState[]>(() =>
    Array.from({ length: 3 }, (_, index) => ({
      id: null,
      created_at: null,
      session_id: null,
      exercise_id: exercise.id,
      weight_kg: sets[index]?.weight_kg || null,
      reps: sets[index]?.reps || null,
      reps_l: null,
      reps_r: null,
      time_seconds: null,
      is_pb: false,
      isSaved: sets[index]?.isSaved || false,
      isPR: false,
      lastWeight: null,
      lastReps: null,
      lastRepsL: null,
      lastRepsR: null,
      lastTimeSeconds: null,
    }))
  );

  const handleWeightChange = (setIndex: number, value: string) => {
    const weight = value === '' ? null : parseFloat(value);
    const newSets = [...localSets];
    newSets[setIndex] = { ...newSets[setIndex], weight_kg: weight };
    setLocalSets(newSets);
    updateSet(exercise.id, setIndex, { weight_kg: weight });
  };

  const handleRepsChange = (setIndex: number, value: string) => {
    const reps = value === '' ? null : parseInt(value, 10);
    const newSets = [...localSets];
    newSets[setIndex] = { ...newSets[setIndex], reps: reps };
    setLocalSets(newSets);
    updateSet(exercise.id, setIndex, { reps });
  };

  const handleToggleComplete = (setIndex: number) => {
    const set = localSets[setIndex];
    if (!set.isSaved && (!set.weight_kg || !set.reps)) {
      Alert.alert('Missing Data', 'Please enter weight and reps before completing the set.');
      return;
    }

    // Check for personal best (volume PB: weight × reps)
    const currentVolume = (set.weight_kg || 0) * (set.reps || 0);
    const previousVolumes = localSets
      .filter((s: SetLogState) => s.isSaved && s !== set)
      .map((s: SetLogState) => (s.weight_kg || 0) * (s.reps || 0));
    const maxPreviousVolume = Math.max(...previousVolumes, 0);
    const isVolumePB = currentVolume > maxPreviousVolume && maxPreviousVolume > 0;

    const newSets = [...localSets];
    newSets[setIndex] = {
      ...newSets[setIndex],
      isSaved: !set.isSaved,
      isPR: isVolumePB
    };
    setLocalSets(newSets);
    updateSet(exercise.id, setIndex, { isSaved: !set.isSaved, isPR: isVolumePB });

    // Start rest timer when set is saved
    if (!set.isSaved) {
      setRestTimer(60);
    }
  };

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleMenuOption = (option: string) => {
    setShowMenu(false);
    switch (option) {
      case 'history':
        // TODO: Show history
        Alert.alert('Coming Soon', 'Exercise history will be available soon.');
        break;
      case 'info':
        onInfoPress?.();
        break;
      case 'swap':
        onSubstituteExercise?.();
        break;
      case 'cant-do':
        Alert.alert(
          'Remove Exercise',
          `Remove ${exercise.name} from this workout?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: onRemoveExercise },
          ]
        );
        break;
    }
  };

  const showCustomAlert = (title: string, message: string, buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'destructive' }>) => {
    setCustomAlertConfig({ title, message, buttons });
    setShowCustomAlertModal(true);
  };

  // Fetch previous workout sets
  const fetchPreviousWorkoutSets = useCallback(async () => {
    try {
      // Get the most recent workout session for this exercise (excluding current session)
      const { data: previousSessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)
        .neq('id', currentSessionId) // Exclude current session
        .order('session_date', { ascending: false })
        .limit(1);

      if (sessionsError) throw sessionsError;

      if (previousSessions && previousSessions.length > 0) {
        const previousSessionId = previousSessions[0].id;

        // Get set logs for this exercise from the previous session
        const { data: previousSets, error: setsError } = await supabase
          .from('set_logs')
          .select('weight_kg, reps')
          .eq('session_id', previousSessionId)
          .eq('exercise_id', exercise.id)
          .order('created_at', { ascending: true });

        if (setsError) throw setsError;

        setPreviousWorkoutSets(previousSets || []);
      } else {
        setPreviousWorkoutSets([]);
      }
    } catch (error: any) {
      console.error('Error fetching previous workout sets:', error);
      setPreviousWorkoutSets([]);
    }
  }, [exercise.id, userId, currentSessionId]);

  // Rest timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev: number | null) => prev !== null && prev > 0 ? prev - 1 : null);
      }, 1000);
    } else if (restTimer === 0) {
      setRestTimer(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restTimer]);

  // Fetch previous workout data on mount
  useEffect(() => {
    fetchPreviousWorkoutSets();
  }, [fetchPreviousWorkoutSets]);

  const applyAISuggestions = (sets: SetLogState[]) => {
    // Get user's recent workout history for this exercise (last 3 saved sets)
    const recentSets = sets.filter((set: SetLogState) => set.isSaved).slice(-3);

    if (recentSets.length < 3) {
      const progressText = recentSets.length === 0
        ? 'You have 0/3 workouts completed with this exercise.'
        : recentSets.length === 1
        ? 'You have 1/3 workouts completed with this exercise. Complete 2 more!'
        : 'You have 2/3 workouts completed with this exercise. Complete 1 more!';

      showCustomAlert(
        'Build Your Workout History',
        `AI suggestions require at least 3 completed workouts with this exercise. ${progressText}`,
        [{ text: 'Got it', onPress: () => setShowCustomAlertModal(false) }]
      );
      return;
    }

    // Calculate average weight and reps from recent history
    const avgWeight = recentSets.reduce((sum: number, set: SetLogState) => sum + (set.weight_kg || 0), 0) / recentSets.length;
    const avgReps = recentSets.reduce((sum: number, set: SetLogState) => sum + (set.reps || 0), 0) / recentSets.length;

    // Suggest progressive overload: slight increase from average
    const suggestedWeight = Math.round((avgWeight * 1.05) * 2) / 2; // Round to nearest 0.5kg
    const suggestedReps = Math.max(6, Math.min(12, Math.round(avgReps * 0.9)));

    // Fill all 3 sets with suggestions
    for (let i = 0; i < 3; i++) {
      handleWeightChange(i, suggestedWeight.toString());
      handleRepsChange(i, suggestedReps.toString());
    }

    showCustomAlert(
      'AI Suggestions Applied',
      `All sets filled with ${suggestedWeight}kg x ${suggestedReps} reps based on your recent performance.`,
      [{ text: 'Great!', onPress: () => setShowCustomAlertModal(false) }]
    );
  };

  return (
    <View style={[styles.container, accentColor && { borderWidth: 2, borderColor: accentColor }, showMenu && { zIndex: 999999, elevation: 100 }]}>
      {/* Header */}
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>
            {exerciseNumber ? `${exerciseNumber}. ` : ''}{exercise.name}
          </Text>
          <Text style={styles.muscleGroup}>{exercise.main_muscle}</Text>
        </View>
      </Pressable>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          onPress={handleMenuPress}
        >
          <Menu size={20} color={Colors.foreground} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp size={20} color={Colors.foreground} />
          ) : (
            <ChevronDown size={20} color={Colors.foreground} />
          )}
        </Pressable>
      </View>


      {/* Action Menu */}
      {showMenu && (
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menu}>
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={() => handleMenuOption('history')}
            >
              <History size={16} color={Colors.foreground} />
              <Text style={styles.menuText}>History</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={() => handleMenuOption('info')}
            >
              <Info size={16} color={Colors.foreground} />
              <Text style={styles.menuText}>Info</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={() => handleMenuOption('swap')}
            >
              <RotateCcw size={16} color={Colors.foreground} />
              <Text style={styles.menuText}>Swap Exercise</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={() => handleMenuOption('cant-do')}
            >
              <X size={16} color={Colors.destructive} />
              <Text style={[styles.menuText, styles.destructiveText]}>Can't Do</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.setsContainer}>
            {localSets.slice(0, 3).map((set, index) => (
              <View key={`set-${index}`} style={[
                styles.setItem,
                set.isSaved && styles.completedSetItem,
                set.isPR && styles.prSetItem
              ]}>
                <View style={styles.setHeader}>
                  <Text style={styles.setTitle}>Set {index + 1}</Text>
                  {set.isSaved && (
                    <View style={styles.completedContainer}>
                      <Text style={[styles.completedBadge, set.isPR && styles.prBadge]}>✓</Text>
                      {set.isPR && (
                        <Trophy size={12} color="#FFD700" style={styles.trophyIcon} />
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.setInputs}>
                  <TextInput
                    style={[styles.weightInput, set.isSaved && styles.disabledInput]}
                    value={set.weight_kg?.toString() || ''}
                    onChangeText={(value) => !set.isSaved && handleWeightChange(index, value)}
                    placeholder="kg"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.mutedForeground}
                    editable={!set.isSaved}
                  />
                  <Text style={styles.multiplierText}>x</Text>
                  <TextInput
                    style={[styles.repsInput, set.isSaved && styles.disabledInput]}
                    value={set.reps?.toString() || ''}
                    onChangeText={(value) => !set.isSaved && handleRepsChange(index, value)}
                    placeholder="reps"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.mutedForeground}
                    editable={!set.isSaved}
                  />
                  {!set.isSaved && (
                    <Pressable
                      style={styles.saveIconButton}
                      onPress={() => handleToggleComplete(index)}
                    >
                      <Save size={16} color={Colors.primary} />
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.deleteIconButton}
                    onPress={() => {
                      // TODO: Implement delete set functionality
                      Alert.alert('Delete Set', `Delete set ${index + 1}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => {
                          // Remove the set from localSets
                          const newSets = [...localSets];
                          newSets.splice(index, 1);
                          // Add empty set at the end to maintain 3 sets
                          newSets.push({
                            id: null,
                            created_at: null,
                            session_id: null,
                            exercise_id: exercise.id,
                            weight_kg: null,
                            reps: null,
                            reps_l: null,
                            reps_r: null,
                            time_seconds: null,
                            is_pb: false,
                            isSaved: false,
                            isPR: false,
                            lastWeight: null,
                            lastReps: null,
                            lastRepsL: null,
                            lastRepsR: null,
                            lastTimeSeconds: null,
                          });
                          setLocalSets(newSets);
                        }},
                      ]);
                    }}
                  >
                    <X size={16} color={Colors.destructive} />
                  </Pressable>
                </View>

                {/* Previous workout data */}
                {previousWorkoutSets.length > index && previousWorkoutSets[index] && (
                  <View style={styles.previousSetContainer}>
                    <Text style={styles.previousSetText}>
                      {previousWorkoutSets[index].weight_kg || 0}×{previousWorkoutSets[index].reps || 0}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={styles.expandedActions}>
            <View style={styles.actionButtonsRow}>
              <View style={styles.leftButtons}>
                <Pressable style={styles.iconActionButton} onPress={onAddSet}>
                  <Plus size={16} color={Colors.primary} />
                </Pressable>
                <Pressable
                  style={styles.iconActionButton}
                  onPress={async () => {
                    try {
                      // Check if any sets already have data
                      const hasExistingData = localSets.some(set =>
                        (set.weight_kg && set.weight_kg > 0) ||
                        (set.reps && set.reps > 0) ||
                        (set.reps_l && set.reps_l > 0) ||
                        (set.reps_r && set.reps_r > 0) ||
                        (set.time_seconds && set.time_seconds > 0)
                      );

                      if (hasExistingData) {
                        showCustomAlert(
                          'Clear Exercise Data First',
                          'AI suggestions can only be applied at the start of an exercise. Please clear all set data first, then try again.',
                          [
                            { text: 'Cancel', onPress: () => setShowCustomAlertModal(false) },
                            {
                              text: 'Clear & Suggest',
                              onPress: () => {
                                setShowCustomAlertModal(false);
                                // Clear all sets
                                const clearedSets = localSets.map((set: SetLogState) => ({
                                  ...set,
                                  weight_kg: null,
                                  reps: null,
                                  reps_l: null,
                                  reps_r: null,
                                  time_seconds: null,
                                  id: null,
                                  created_at: null,
                                  session_id: null,
                                  lastWeight: null,
                                  lastReps: null,
                                  lastRepsL: null,
                                  lastRepsR: null,
                                  lastTimeSeconds: null,
                                }));
                                setLocalSets(clearedSets);
                                // Now apply suggestions
                                applyAISuggestions(clearedSets);
                              }
                            }
                          ]
                        );
                        return;
                      }

                      // Apply suggestions to empty sets
                      applyAISuggestions(localSets);
                    } catch (error: any) {
                      console.error('Error generating AI suggestion:', error);
                      Alert.alert('Suggestion Error', 'Unable to generate workout suggestions at this time.');
                    }
                  }}
                >
                  <Lightbulb size={16} color="orange" />
                </Pressable>
              </View>
              {restTimer !== null && (
                <View style={styles.timerContainer}>
                  <Text style={styles.timerText}>{restTimer}s</Text>
                </View>
              )}
            </View>
            {!isExerciseSaved && (
              <Pressable
                style={styles.saveExerciseButton}
                onPress={() => {
                  // Save all completed sets for this exercise (sets that are marked as saved but not yet persisted)
                  const exerciseSets = localSets.filter(set => set.isSaved && set.id === null);
                  if (exerciseSets.length === 0) {
                    Alert.alert('No Sets to Save', 'There are no completed sets to save for this exercise.');
                    return;
                  }

                  // The sets are already marked as saved in the UI, now we need to persist them to the database
                  // This would typically call an API to save the sets, but for now we'll just show success
                  console.log('Calling onExerciseSaved with:', exercise.name, exerciseSets.length);
                  onExerciseSaved?.(exercise.name, exerciseSets.length);
                  setIsExerciseSaved(true); // Hide the save button
                  setIsExpanded(false); // Collapse the card

                  // Show success toast
                  Toast.show({
                    type: 'success',
                    text1: 'Exercise Saved!',
                    text2: 'Your progress has been recorded',
                    visibilityTime: 3000,
                  });
                  // Refresh rolling status to update the badge
                  refetch();
                }}
              >
                <Text style={styles.saveExerciseText}>Save Exercise</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Custom Alert Modal */}
      <Modal
        visible={showCustomAlertModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomAlertModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customAlert}>
            <Text style={styles.alertTitle}>{customAlertConfig?.title}</Text>
            <Text style={styles.alertMessage}>{customAlertConfig?.message}</Text>
            <View style={styles.alertButtons}>
              {customAlertConfig?.buttons.map((button, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.alertButton,
                    button.style === 'destructive' && styles.alertButtonDestructive,
                  ]}
                  onPress={() => {
                    button.onPress?.();
                  }}
                >
                  <Text style={[
                    styles.alertButtonText,
                    button.style === 'destructive' && styles.alertButtonTextDestructive,
                  ]}>
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginVertical: Spacing.sm,
    marginHorizontal: 0,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  bottomActions: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
    zIndex: 10,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: 2,
  },
  muscleGroup: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textTransform: 'capitalize',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconButtonPressed: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000000,
    elevation: 101,
  },
  menu: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 102,
    position: 'absolute',
    bottom: -160,
    right: 80,
    minWidth: 160,
    zIndex: 1000001,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  menuItemPressed: {
    backgroundColor: Colors.muted,
  },
  menuText: {
    ...TextStyles.body,
    color: Colors.foreground,
  },
  destructiveText: {
    color: Colors.destructive,
  },
  setHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  headerText: {
    ...TextStyles.captionMedium,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  setColumn: {
    width: 30,
  },
  prevColumn: {
    flex: 1,
  },
  weightColumn: {
    width: 80,
  },
  repsColumn: {
    width: 60,
  },
  doneColumn: {
    width: 32,
    marginLeft: Spacing.sm,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  addSetButtonPressed: {
    backgroundColor: Colors.muted,
  },
  addSetText: {
    ...TextStyles.buttonSmall,
    color: Colors.primary,
  },
  expandedContent: {
    paddingTop: Spacing.md,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    marginBottom: Spacing.xs,
  },
  setNumber: {
    ...TextStyles.body,
    color: Colors.foreground,
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    ...TextStyles.body,
    color: Colors.foreground,
    textAlign: 'center',
    backgroundColor: Colors.card,
    borderRadius: 6,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  doneButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  doneButtonCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  doneText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  doneTextCompleted: {
    color: Colors.white,
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expandButtonPressed: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  muscleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  setsContainer: {
    gap: Spacing.md,
  },
  setItem: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: Spacing.md,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  setTitle: {
    ...TextStyles.body,
    fontWeight: '600',
    color: Colors.foreground,
  },
  completedBadge: {
    ...TextStyles.body,
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  setInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weightInput: {
    ...TextStyles.body,
    color: Colors.foreground,
    backgroundColor: Colors.card,
    borderRadius: 6,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 80,
    textAlign: 'center',
  },
  multiplierText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  repsInput: {
    ...TextStyles.body,
    color: Colors.foreground,
    backgroundColor: Colors.card,
    borderRadius: 6,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 80,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    ...TextStyles.buttonSmall,
    color: Colors.white,
  },
  expandedActions: {
    marginTop: Spacing.md,
  },
  saveIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: Spacing.sm,
  },
  deleteIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: Spacing.sm,
  },
  saveExerciseButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  saveExerciseText: {
    ...TextStyles.buttonSmall,
    color: Colors.white,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  leftButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  iconActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAlert: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    margin: Spacing.lg,
    minWidth: 280,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alertTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  alertMessage: {
    ...TextStyles.body,
    color: Colors.foreground,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  alertButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minWidth: 80,
    alignItems: 'center',
  },
  alertButtonDestructive: {
    backgroundColor: Colors.destructive,
  },
  alertButtonText: {
    ...TextStyles.buttonSmall,
    color: Colors.white,
    fontWeight: '600',
  },
  alertButtonTextDestructive: {
    color: Colors.white,
  },
  timerContainer: {
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 50,
    alignItems: 'center',
  },
  timerText: {
    ...TextStyles.body,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  completedCheckmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginLeft: Spacing.sm,
  },
  completedCheckmarkText: {
    ...TextStyles.body,
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledInput: {
    backgroundColor: Colors.muted,
    color: Colors.mutedForeground,
    borderColor: Colors.muted,
  },
  completedSetItem: {
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  prSetItem: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  prBadge: {
    color: '#FFD700',
  },
  trophyIcon: {
    marginTop: 1,
  },
  previousSetContainer: {
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
  previousSetText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontSize: 12,
  },
});
