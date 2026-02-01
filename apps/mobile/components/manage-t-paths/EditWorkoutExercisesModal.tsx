import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { FontFamily, TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';
import { useAuth } from '../../app/_contexts/auth-context';
import { useData } from '../../app/_contexts/data-context';
import { database } from '../../app/_lib/database';
import { generateUUID } from '../../lib/utils';
import type { TPathExercise, ExerciseDefinition } from '@data/storage/models';

interface WorkoutExerciseWithDetails extends TPathExercise {
  exercise_definition: ExerciseDefinition;
}

interface EditWorkoutExercisesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  workoutName: string;
  onSaveSuccess: () => void;
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
const useEditWorkoutExercises = ({ workoutId, onSaveSuccess, open, setTempStatusMessage }: any) => {
  const { userId } = useAuth();
  const { getTPath, getTPathExercises, addTPathExercise, deleteTPathExercise, supabase, triggerExerciseRefresh } = useData();
  const [exercises, setExercises] = useState<WorkoutExerciseWithDetails[]>([]);
  const [allExerciseDefinitions, setAllExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const hasBonusChangesRef = React.useRef(false);

  // Trigger exercise refresh when modal closes if bonus status was toggled
  useEffect(() => {
    if (!open && hasBonusChangesRef.current) {
      triggerExerciseRefresh();
      hasBonusChangesRef.current = false;
    }
  }, [open, triggerExerciseRefresh]);
  const [addExerciseFilter, setAddExerciseFilter] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('');

  useEffect(() => {
    const fetchAllExerciseDefinitions = async () => {
      if (!open || !userId) return;
      try {
        const { data, error } = await supabase
          .from('exercise_definitions')
          .select('*')
          .eq('user_id', userId)
          .order('name', { ascending: true });

        if (error) throw error;
        setAllExerciseDefinitions(data || []);
      } catch (error) {
        console.error('Error fetching exercise definitions:', error);
      }
    };
    fetchAllExerciseDefinitions();
  }, [open, userId, supabase]);

  const fetchExercises = useCallback(async () => {
    if (!userId || !workoutId || !open) return;
    setLoading(true);
    try {
      const tpath = await getTPath(workoutId);
      if (!tpath) { setExercises([]); return; }
      const tpathExercises = await getTPathExercises(workoutId);

      const exerciseIds = tpathExercises.map(te => te.exercise_id).filter((id): id is string => id !== null);
      const { data: definitions, error: defError } = await supabase
        .from('exercise_definitions')
        .select('*')
        .in('id', exerciseIds);

      if (defError) throw defError;

      const definitionMap = new Map<string, ExerciseDefinition>();
      if (definitions) definitions.forEach(def => definitionMap.set(def.id, def));

      const exercisesWithDetails: WorkoutExerciseWithDetails[] = tpathExercises.map(te => ({
        ...te,
        exercise_definition: definitionMap.get(te.exercise_id || '') || {
          id: te.exercise_id || '',
          name: 'Unknown Exercise',
          user_id: userId,
          library_id: null,
          description: null,
          instructions: null,
          difficulty: null,
          muscle_group: null,
          equipment: null,
          created_at: new Date().toISOString(),
        },
      }));

      setExercises(exercisesWithDetails.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
    } catch (error) {
      console.error('Error fetching workout exercises:', error);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [userId, workoutId, open, getTPath, getTPathExercises, supabase]);

  useEffect(() => { if (open) fetchExercises(); }, [open, fetchExercises]);

  const handleAddExerciseWithBonusStatus = useCallback(async (exercise: ExerciseDefinition, isBonus: boolean) => {
    if (!userId || !workoutId) return;
    setIsSaving(true);
    try {
      const newTPathExercise = {
        id: generateUUID(),
        t_path_id: workoutId,
        exercise_id: exercise.id,
        order_index: exercises.length,
        is_bonus_exercise: isBonus,
        created_at: new Date().toISOString(),
      } as TPathExercise;
      await addTPathExercise(newTPathExercise);
      setTempStatusMessage({ message: `Added ${exercise.name}`, type: 'success' });
      fetchExercises();
    } catch (error) {
      console.error('Error adding exercise:', error);
      Toast.show({ type: 'error', text1: 'Failed to add exercise.' });
    } finally {
      setIsSaving(false);
    }
  }, [userId, workoutId, exercises.length, addTPathExercise, fetchExercises, setTempStatusMessage]);

  const confirmRemoveExercise = useCallback(async (tpathExerciseId: string) => {
    if (!userId || !workoutId) return;
    setIsSaving(true);
    try {
      await deleteTPathExercise(tpathExerciseId);
      setTempStatusMessage({ message: 'Removed exercise', type: 'removed' });
      fetchExercises();
    } catch (error) {
      console.error('Error removing exercise:', error);
      Toast.show({ type: 'error', text1: 'Failed to remove exercise.' });
    } finally {
      setIsSaving(false);
    }
  }, [userId, workoutId, deleteTPathExercise, fetchExercises, setTempStatusMessage]);

  const handleSaveOrder = useCallback(async () => {
    if (!userId || !workoutId) return;
    setIsSaving(true);
    try {
      const updates = exercises.map((exercise, index) => ({
        id: exercise.id,
        order_index: index,
      }));

      // Update local SQLite first (atomic transaction, offline-first)
      await database.batchUpdateTPathExerciseOrder(updates);

      // Update Supabase via batch RPC (single transaction)
      const { error } = await supabase.rpc('update_exercise_order', { updates });
      if (error) throw error;

      triggerExerciseRefresh();
      setTempStatusMessage({ message: 'Order saved!', type: 'success' });
      onSaveSuccess();
    } catch (error) {
      console.error('Error saving order:', error);
      Toast.show({ type: 'error', text1: 'Failed to save order.' });
    } finally {
      setIsSaving(false);
    }
  }, [userId, workoutId, exercises, onSaveSuccess, supabase, triggerExerciseRefresh, setTempStatusMessage]);

  const handleToggleBonusStatus = useCallback(async (tpathExerciseId: string, currentStatus: boolean) => {
    if (!userId || !workoutId) return;
    setIsSaving(true);
    try {
      const newStatus = !currentStatus;

      // Update local SQLite first (offline-first)
      await database.updateTPathExerciseBonusStatus(tpathExerciseId, newStatus);

      // Update Supabase
      const { error } = await supabase
        .from('t_path_exercises')
        .update({ is_bonus_exercise: newStatus })
        .eq('id', tpathExerciseId);
      if (error) throw error;

      setTempStatusMessage({ message: `Marked as ${newStatus ? 'bonus' : 'regular'}`, type: 'success' });

      // Update local state directly to avoid refetch reordering
      setExercises(prev => prev.map(ex =>
        ex.id === tpathExerciseId ? { ...ex, is_bonus_exercise: newStatus } : ex
      ));

      // Defer exercise refresh until modal closes to avoid clunky UI reload
      hasBonusChangesRef.current = true;
    } catch (error) {
      console.error('Error toggling bonus:', error);
    } finally {
      setIsSaving(false);
    }
  }, [userId, workoutId, supabase, setTempStatusMessage]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const arr = [...exercises];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    setExercises(arr);
  }, [exercises]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === exercises.length - 1) return;
    const arr = [...exercises];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    setExercises(arr);
  }, [exercises]);

  const mainMuscleGroups = useMemo(() => {
    const groups = new Set<string>();
    allExerciseDefinitions.forEach(ex => { if ((ex as any).main_muscle) groups.add((ex as any).main_muscle); });
    return Array.from(groups).sort();
  }, [allExerciseDefinitions]);

  const filteredExercisesForDropdown = useMemo(() => {
    return allExerciseDefinitions.filter(ex =>
      ex.name.toLowerCase().includes(addExerciseFilter.toLowerCase()) &&
      (selectedMuscleFilter ? (ex as any).main_muscle === selectedMuscleFilter : true)
    );
  }, [allExerciseDefinitions, addExerciseFilter, selectedMuscleFilter]);

  return {
    exercises, setExercises, filteredExercisesForDropdown, loading, isSaving,
    addExerciseFilter, setAddExerciseFilter, mainMuscleGroups,
    selectedMuscleFilter, setSelectedMuscleFilter,
    handleAddExerciseWithBonusStatus, confirmRemoveExercise,
    handleToggleBonusStatus, handleSaveOrder, handleMoveUp, handleMoveDown,
  };
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const EditWorkoutExercisesModal = ({
  open,
  onOpenChange,
  workoutId,
  workoutName,
  onSaveSuccess,
  setTempStatusMessage,
}: EditWorkoutExercisesModalProps) => {
  const hook = useEditWorkoutExercises({ workoutId, onSaveSuccess, open, setTempStatusMessage });
  const [activeView, setActiveView] = useState<'exercises' | 'add'>('exercises');
  const [showBonusPrompt, setShowBonusPrompt] = useState(false);
  const [pendingExercise, setPendingExercise] = useState<ExerciseDefinition | null>(null);

  const workoutColor = getWorkoutColor(workoutName);
  const existingExerciseIds = useMemo(
    () => new Set(hook.exercises.map(e => e.exercise_id)),
    [hook.exercises]
  );

  // Reset view when modal opens
  useEffect(() => {
    if (open) setActiveView('exercises');
  }, [open]);

  const handleExerciseTap = (exercise: ExerciseDefinition) => {
    if (existingExerciseIds.has(exercise.id)) return;
    setPendingExercise(exercise);
    setShowBonusPrompt(true);
  };

  const handleConfirmAdd = (isBonus: boolean) => {
    if (pendingExercise) {
      hook.handleAddExerciseWithBonusStatus(pendingExercise, isBonus);
    }
    setShowBonusPrompt(false);
    setPendingExercise(null);
  };

  const handleRemove = (exercise: WorkoutExerciseWithDetails) => {
    Alert.alert(
      'Remove Exercise',
      `Remove "${exercise.exercise_definition.name}" from this workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => hook.confirmRemoveExercise(exercise.id) },
      ]
    );
  };

  return (
    <Modal animationType="slide" transparent visible={open} onRequestClose={() => onOpenChange(false)}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* ─── Header ─── */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={[s.headerDot, { backgroundColor: workoutColor.main }]} />
              <View style={s.headerText}>
                <Text style={s.headerTitle} numberOfLines={1}>{workoutName}</Text>
                <Text style={s.headerSubtitle}>
                  {hook.exercises.length} exercise{hook.exercises.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => onOpenChange(false)} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* ─── Tabs ─── */}
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, activeView === 'exercises' && s.tabActive]}
              onPress={() => setActiveView('exercises')}
            >
              <Ionicons name="list" size={16} color={activeView === 'exercises' ? Colors.background : Colors.mutedForeground} />
              <Text style={[s.tabText, activeView === 'exercises' && s.tabTextActive]}>Exercises</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, activeView === 'add' && s.tabActive]}
              onPress={() => setActiveView('add')}
            >
              <Ionicons name="add-circle-outline" size={16} color={activeView === 'add' ? Colors.background : Colors.mutedForeground} />
              <Text style={[s.tabText, activeView === 'add' && s.tabTextActive]}>Add Exercise</Text>
            </TouchableOpacity>
          </View>

          {/* ─── Content ─── */}
          {hook.loading ? (
            <View style={s.centered}>
              <ActivityIndicator size="large" color={Colors.actionPrimary} />
              <Text style={s.centeredText}>Loading exercises...</Text>
            </View>
          ) : activeView === 'exercises' ? (
            /* ─── Current Exercises List ─── */
            <View style={s.listContainer}>
              {hook.exercises.length === 0 ? (
                <View style={s.centered}>
                  <Ionicons name="barbell-outline" size={48} color={Colors.mutedForeground} />
                  <Text style={s.emptyTitle}>No exercises yet</Text>
                  <Text style={s.emptySubtitle}>Tap "Add Exercise" to get started</Text>
                </View>
              ) : (
                <>
                  <ScrollView style={s.exerciseScroll} showsVerticalScrollIndicator={false}>
                    {hook.exercises.map((exercise, index) => (
                      <View key={exercise.id} style={s.exerciseRow}>
                        {/* Reorder Arrows */}
                        <View style={s.arrows}>
                          <TouchableOpacity
                            onPress={() => hook.handleMoveUp(index)}
                            disabled={index === 0}
                            style={s.arrowBtn}
                          >
                            <Ionicons name="chevron-up" size={16} color={index === 0 ? Colors.border : Colors.mutedForeground} />
                          </TouchableOpacity>
                          <Text style={s.orderNum}>{index + 1}</Text>
                          <TouchableOpacity
                            onPress={() => hook.handleMoveDown(index)}
                            disabled={index === hook.exercises.length - 1}
                            style={s.arrowBtn}
                          >
                            <Ionicons name="chevron-down" size={16} color={index === hook.exercises.length - 1 ? Colors.border : Colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>

                        {/* Exercise Info */}
                        <View style={s.exerciseInfo}>
                          <Text style={s.exerciseName} numberOfLines={1}>
                            {exercise.exercise_definition.name}
                          </Text>
                          <View style={s.exerciseMeta}>
                            {(exercise.exercise_definition as any).main_muscle && (
                              <Text style={s.exerciseMuscle}>{(exercise.exercise_definition as any).main_muscle}</Text>
                            )}
                            {exercise.is_bonus_exercise && (
                              <View style={s.bonusChip}>
                                <Ionicons name="star" size={10} color="#D97706" />
                                <Text style={s.bonusChipText}>Bonus</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Actions */}
                        <View style={s.actions}>
                          <TouchableOpacity
                            onPress={() => hook.handleToggleBonusStatus(exercise.id, exercise.is_bonus_exercise)}
                            style={s.actionBtn}
                          >
                            <Ionicons
                              name={exercise.is_bonus_exercise ? 'star' : 'star-outline'}
                              size={18}
                              color={exercise.is_bonus_exercise ? '#D97706' : Colors.mutedForeground}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleRemove(exercise)} style={s.actionBtn}>
                            <Ionicons name="trash-outline" size={18} color={Colors.destructive} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Save Footer */}
                  <View style={s.footer}>
                    <TouchableOpacity
                      style={[s.saveBtn, { backgroundColor: workoutColor.main }]}
                      onPress={hook.handleSaveOrder}
                      disabled={hook.isSaving}
                    >
                      {hook.isSaving ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                          <Text style={s.saveBtnText}>Save Order</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ) : (
            /* ─── Add Exercise View ─── */
            <View style={s.addContainer}>
              {/* Search */}
              <View style={s.searchRow}>
                <Ionicons name="search" size={18} color={Colors.mutedForeground} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search exercises..."
                  placeholderTextColor={Colors.mutedForeground}
                  value={hook.addExerciseFilter}
                  onChangeText={hook.setAddExerciseFilter}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {hook.addExerciseFilter.length > 0 && (
                  <TouchableOpacity onPress={() => hook.setAddExerciseFilter('')}>
                    <Ionicons name="close-circle" size={18} color={Colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Muscle Chips */}
              {hook.mainMuscleGroups.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.chipScroll}
                  contentContainerStyle={s.chipContent}
                >
                  <TouchableOpacity
                    style={[s.chip, !hook.selectedMuscleFilter && s.chipActive]}
                    onPress={() => hook.setSelectedMuscleFilter('')}
                  >
                    <Text style={[s.chipText, !hook.selectedMuscleFilter && s.chipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {hook.mainMuscleGroups.map((muscle: string) => (
                    <TouchableOpacity
                      key={muscle}
                      style={[s.chip, hook.selectedMuscleFilter === muscle && s.chipActive]}
                      onPress={() => hook.setSelectedMuscleFilter(hook.selectedMuscleFilter === muscle ? '' : muscle)}
                    >
                      <Text style={[s.chipText, hook.selectedMuscleFilter === muscle && s.chipTextActive]}>{muscle}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Exercise List */}
              <FlatList
                data={hook.filteredExercisesForDropdown}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.addListContent}
                ListEmptyComponent={
                  <View style={s.centered}>
                    <Ionicons name="search-outline" size={40} color={Colors.mutedForeground} />
                    <Text style={s.emptyTitle}>No exercises found</Text>
                    <Text style={s.emptySubtitle}>Try adjusting your search or filters</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const alreadyAdded = existingExerciseIds.has(item.id);
                  return (
                    <TouchableOpacity
                      style={[s.addItem, alreadyAdded && s.addItemAdded]}
                      onPress={() => handleExerciseTap(item)}
                      disabled={alreadyAdded || hook.isSaving}
                      activeOpacity={0.7}
                    >
                      <View style={s.addItemInfo}>
                        <Text style={[s.addItemName, alreadyAdded && s.addItemNameAdded]}>{item.name}</Text>
                        <Text style={s.addItemMuscle}>
                          {(item as any).main_muscle || 'General'}
                        </Text>
                      </View>
                      <View style={[s.addBtn, alreadyAdded && s.addBtnAdded]}>
                        {alreadyAdded ? (
                          <Ionicons name="checkmark" size={16} color={Colors.primaryForeground} />
                        ) : (
                          <Ionicons name="add" size={16} color={Colors.foreground} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}
        </View>
      </View>

      {/* ─── Bonus Prompt ─── */}
      <Modal visible={showBonusPrompt} transparent animationType="fade" onRequestClose={() => setShowBonusPrompt(false)}>
        <View style={s.promptOverlay}>
          <View style={s.promptCard}>
            <Text style={s.promptTitle}>Add "{pendingExercise?.name}"</Text>
            <Text style={s.promptSubtitle}>How would you like to add this exercise?</Text>
            <TouchableOpacity style={s.promptBtn} onPress={() => handleConfirmAdd(false)}>
              <Ionicons name="barbell-outline" size={18} color={Colors.foreground} />
              <Text style={s.promptBtnText}>Add as Regular</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.promptBtn, s.promptBtnBonus]} onPress={() => handleConfirmAdd(true)}>
              <Ionicons name="star" size={18} color="#D97706" />
              <Text style={[s.promptBtnText, { color: '#D97706' }]}>Add as Bonus</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.promptCancel} onPress={() => setShowBonusPrompt(false)}>
              <Text style={s.promptCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Layout
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    maxHeight: '92%',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    flex: 1,
  },
  headerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  headerText: { flex: 1 },
  headerTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
  },
  headerSubtitle: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.foreground,
    borderColor: Colors.foreground,
  },
  tabText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.mutedForeground,
  },
  tabTextActive: {
    color: Colors.background,
  },

  // Shared
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl * 2,
  },
  centeredText: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
  },
  emptyTitle: {
    ...TextStyles.bodyMedium,
    color: Colors.mutedForeground,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },

  // ─── Exercise List View ───
  listContainer: { flex: 1 },
  exerciseScroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  arrows: {
    alignItems: 'center',
    gap: 0,
    width: 28,
  },
  arrowBtn: { padding: 2 },
  orderNum: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.foreground,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exerciseMuscle: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  bonusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  bonusChipText: {
    fontFamily: FontFamily.semibold,
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionBtn: {
    padding: Spacing.xs + 2,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
  },
  saveBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },

  // ─── Add Exercise View ───
  addContainer: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.foreground,
  },
  chipScroll: {
    maxHeight: 44,
    marginTop: Spacing.md,
  },
  chipContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.foreground,
    borderColor: Colors.foreground,
  },
  chipText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.mutedForeground,
  },
  chipTextActive: {
    color: Colors.background,
  },
  addListContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  addItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addItemAdded: {
    backgroundColor: Colors.foreground + '08',
    borderColor: Colors.foreground + '30',
  },
  addItemInfo: { flex: 1, gap: 2 },
  addItemName: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.foreground,
  },
  addItemNameAdded: {
    color: Colors.mutedForeground,
  },
  addItemMuscle: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  addBtnAdded: {
    backgroundColor: Colors.foreground,
    borderColor: Colors.foreground,
  },

  // ─── Bonus Prompt Modal ───
  promptOverlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  promptCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 340,
    ...Shadows.lg,
  },
  promptTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  promptSubtitle: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
  },
  promptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.muted,
    marginBottom: Spacing.sm,
  },
  promptBtnBonus: {
    backgroundColor: '#FEF3C7',
  },
  promptBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.foreground,
  },
  promptCancel: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  promptCancelText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.mutedForeground,
  },
});
