/**
 * Add Exercise Dialog
 * Scrim + bottom sheet modal for adding exercises to workouts
 * Design reference: Profile > settings > manage my gyms > add exercise
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useAuth } from '../../app/_contexts/auth-context';

interface Exercise {
  id: string;
  name: string;
  category: string | null;
  main_muscle: string | null;
  type: string | null;
}

interface AddExerciseDialogProps {
  visible: boolean;
  gymId: string;
  gymName: string;
  workoutId: string;
  onClose: () => void;
  onExercisesAdded?: (exerciseIds: string[]) => void;
}

type TabType = 'my' | 'global';

export default function AddExerciseDialog({
  visible,
  gymId,
  gymName,
  workoutId,
  onClose,
  onExercisesAdded,
}: AddExerciseDialogProps) {
  const { supabase, userId } = useAuth();

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // data
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [availableMuscles, setAvailableMuscles] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // pagination
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // selection
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());

  // debounce search
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // default tab check
  useEffect(() => {
    if (!visible || !userId) return;
    (async () => {
      try {
        // If the user has any custom exercises in exercise_definitions (scoped by user_id), default to "My"
        const { data, error } = await supabase
          .from('exercise_definitions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .limit(1);

        if (error) throw error;
        setActiveTab((data && data.length > 0) ? 'my' : 'global');
      } catch {
        setActiveTab('global');
      }
    })();
  }, [visible, userId, supabase]);

  // load list (initial + on changes)
  const load = useCallback(
    async (reset: boolean) => {
      if (!visible || !userId) return;

      setLoading(reset);
      setLoadingMore(!reset);

      const pageIndex = reset ? 0 : page + 1;
      try {
        // base query depends on tab
        if (activeTab === 'my') {
          // user's own exercises living in exercise_definitions scoped by user_id
          let q = supabase
            .from('exercise_definitions')
            .select('id, name, category, main_muscle, type')
            .eq('user_id', userId);

          // search
          if (debouncedQ) {
            const like = `%${debouncedQ}%`;
            q = q.or(`name.ilike.${like},main_muscle.ilike.${like},category.ilike.${like}`);
          }
          // filters
          if (selectedMuscles.length) q = q.in('main_muscle', selectedMuscles);
          if (selectedCategories.length) q = q.in('category', selectedCategories);

          // order + pagination by range
          const from = pageIndex * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;
          q = q.order('name', { ascending: true }).range(from, to);

          const { data, error } = await q;
          if (error) throw error;

          const rows = (data ?? []) as Exercise[];

          setExercises((prev) => (reset ? rows : [...prev, ...rows]));
          setHasMore(rows.length === PAGE_SIZE);
          setPage(pageIndex);
          updateFilterOptions(reset ? rows : [...exercises, ...rows]);
        } else {
          // global: gym_exercises → exercise_definitions
          let q = supabase
            .from('gym_exercises')
            .select(
              `
              exercise_definitions (
                id,
                name,
                category,
                main_muscle,
                type
              )
            `
            )
            .eq('gym_id', gymId);

          // search (nested)
          if (debouncedQ) {
            const like = `%${debouncedQ}%`;
            q = q.or(
              `exercise_definitions.name.ilike.${like},exercise_definitions.main_muscle.ilike.${like},exercise_definitions.category.ilike.${like}`
            );
          }
          // filters (nested)
          if (selectedMuscles.length) q = q.in('exercise_definitions.main_muscle', selectedMuscles);
          if (selectedCategories.length) q = q.in('exercise_definitions.category', selectedCategories);

          // We can’t use .range on nested selects reliably; fetch a page then slice
          const { data, error } = await q;
          if (error) throw error;

          const rows = ((data ?? [])
            .map((r: any) => r.exercise_definitions)
            .filter(Boolean)) as Exercise[];

          // do manual “paging”
          const start = pageIndex * PAGE_SIZE;
          const end = start + PAGE_SIZE;
          const paged = rows.slice(start, end);

          setExercises((prev) => (reset ? paged : [...prev, ...paged]));
          setHasMore(end < rows.length);
          setPage(pageIndex);
          updateFilterOptions(reset ? paged : [...exercises, ...paged]);
        }
      } catch (e) {
        console.error('[AddExerciseDialog] load error:', e);
        Alert.alert('Error', 'Failed to load exercises');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      visible,
      userId,
      gymId,
      activeTab,
      debouncedQ,
      selectedMuscles,
      selectedCategories,
      page,
      supabase,
      exercises,
    ]
  );

  useEffect(() => {
    if (!visible) return;
    load(true);
  }, [visible, activeTab, debouncedQ, selectedMuscles, selectedCategories, load]);

  const updateFilterOptions = (rows: Exercise[]) => {
    const muscles = [...new Set(rows.map((r) => r.main_muscle).filter(Boolean) as string[])].sort();
    const cats = [...new Set(rows.map((r) => r.category).filter(Boolean) as string[])].sort();
    setAvailableMuscles(muscles);
    setAvailableCategories(cats);
  };

  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) load(false);
  };

  const toggleExerciseSelection = (id: string) =>
    setSelectedExercises((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleAddExercises = async () => {
    if (!selectedExercises.size) return;

    try {
      // find next order index
      const { data: existing, error: fetchErr } = await supabase
        .from('t_path_exercises')
        .select('order_index')
        .eq('template_id', workoutId)
        .order('order_index', { ascending: false })
        .limit(1);

      if (fetchErr) throw fetchErr;

      const startIndex =
        existing && existing.length > 0 ? (existing[0] as any).order_index + 1 : 0;

      // bulk insert
      const ids = Array.from(selectedExercises);
      const payload = ids.map((exerciseId, i) => ({
        template_id: workoutId,
        exercise_id: exerciseId,
        order_index: startIndex + i,
        is_bonus_exercise: false,
      }));

      const { error: insErr } = await supabase.from('t_path_exercises').insert(payload);
      if (insErr) throw insErr;

      onExercisesAdded?.(ids);
      setSelectedExercises(new Set());
      onClose();
      Alert.alert('Success', `${ids.length} exercise${ids.length > 1 ? 's' : ''} added`);
    } catch (e) {
      console.error('[AddExerciseDialog] add error:', e);
      Alert.alert('Error', 'Failed to add exercises to workout');
    }
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const isSelected = selectedExercises.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.exerciseItem, isSelected && styles.exerciseItemSelected]}
        onPress={() => toggleExerciseSelection(item.id)}
      >
        <View style={styles.exerciseInfo}>
          <Text style={[styles.exerciseName, isSelected && styles.exerciseNameSelected]}>
            {item.name}
          </Text>
          <Text style={styles.exerciseDetails}>
            {(item.main_muscle || 'General') + ' • ' + (item.category || 'Uncategorized')}
          </Text>
        </View>
        <View style={[styles.selectionButton, isSelected && styles.selectionButtonSelected]}>
          <Text style={[styles.selectionButtonText, isSelected && styles.selectionButtonTextSelected]}>
            {isSelected ? 'Added' : 'Add'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const toggleMuscleFilter = (muscle: string) =>
    setSelectedMuscles((prev) => (prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]));

  const toggleCategoryFilter = (cat: string) =>
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <Ionicons name="add-circle-outline" size={24} color={Colors.foreground} />
                <Text style={styles.title}>Add Exercises</Text>
              </View>
              <Text style={styles.subtitle}>Add exercises to "{gymName}" workout</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Source switch */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my' && styles.tabActive]}
              onPress={() => {
                setPage(0);
                setHasMore(true);
                setExercises([]);
                setActiveTab('my');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>My Exercises</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'global' && styles.tabActive]}
              onPress={() => {
                setPage(0);
                setHasMore(true);
                setExercises([]);
                setActiveTab('global');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'global' && styles.tabTextActive]}>Global</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={Colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>

          {/* Filters */}
          {(availableMuscles.length > 0 || availableCategories.length > 0) && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer} contentContainerStyle={styles.filtersContent}>
              {availableMuscles.map((m) => (
                <TouchableOpacity
                  key={`m-${m}`}
                  style={[styles.filterChip, selectedMuscles.includes(m) && styles.filterChipSelected]}
                  onPress={() => toggleMuscleFilter(m)}
                >
                  <Text style={[styles.filterChipText, selectedMuscles.includes(m) && styles.filterChipTextSelected]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
              {availableCategories.map((c) => (
                <TouchableOpacity
                  key={`c-${c}`}
                  style={[styles.filterChip, selectedCategories.includes(c) && styles.filterChipSelected]}
                  onPress={() => toggleCategoryFilter(c)}
                >
                  <Text style={[styles.filterChipText, selectedCategories.includes(c) && styles.filterChipTextSelected]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* List */}
          <View style={styles.exerciseListContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.foreground} />
                <Text style={styles.loadingText}>Loading exercises...</Text>
              </View>
            ) : exercises.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  {activeTab === 'my' ? 'No custom exercises yet' : 'No exercises found'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'my' ? 'Create custom exercises in your library' : 'Try adjusting your search or filters'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={exercises}
                renderItem={renderExerciseItem}
                keyExtractor={(item) => item.id}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator size="small" color={Colors.mutedForeground} />
                    </View>
                  ) : null
                }
              />
            )}
          </View>

          {/* Footer */}
          {selectedExercises.size > 0 && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>{selectedExercises.size} selected</Text>
              <TouchableOpacity style={styles.addButton} onPress={handleAddExercises}>
                <Text style={styles.addButtonText}>Add to Workout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ===== styles (unchanged from your app’s look) =====
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'flex-end',
  },
  dialog: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  closeIcon: { padding: Spacing.xs },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.foreground,
    borderColor: Colors.foreground,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  tabTextActive: { color: Colors.background },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.foreground,
  },
  filtersContainer: { maxHeight: 60, marginBottom: Spacing.lg },
  filtersContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, flexDirection: 'row' },
  filterChip: {
    backgroundColor: Colors.muted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, color: Colors.mutedForeground, fontWeight: '500' },
  filterChipTextSelected: { color: Colors.primaryForeground },
  exerciseListContainer: { flex: 1, paddingHorizontal: Spacing.lg },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseItemSelected: { backgroundColor: Colors.primary + '10', borderColor: Colors.primary },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '500', color: Colors.foreground, marginBottom: 2 },
  exerciseNameSelected: { color: Colors.primary },
  exerciseDetails: { fontSize: 12, color: Colors.mutedForeground },
  selectionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectionButtonSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  selectionButtonText: { fontSize: 12, fontWeight: '600', color: Colors.mutedForeground },
  selectionButtonTextSelected: { color: Colors.primaryForeground },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing.xl * 2,
  },
  loadingText: { marginTop: Spacing.md, fontSize: 16, color: Colors.mutedForeground },
  loadingMoreContainer: { paddingVertical: Spacing.lg, alignItems: 'center' },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingVertical: Spacing.xl * 2, paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 16, fontWeight: '600', color: Colors.mutedForeground, textAlign: 'center', marginBottom: Spacing.sm,
  },
  emptySubtitle: { fontSize: 14, color: Colors.mutedForeground, textAlign: 'center' },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.card,
  },
  footerText: { fontSize: 16, fontWeight: '600', color: Colors.foreground },
  addButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.primary, borderRadius: BorderRadius.md },
  addButtonText: { fontSize: 16, fontWeight: '600', color: Colors.primaryForeground },
});
