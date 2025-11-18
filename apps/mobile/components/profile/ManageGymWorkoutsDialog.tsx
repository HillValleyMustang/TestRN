/**
 * Manage Gym Workouts Dialog
 * Matches web version exactly with proper workout management
 * Design reference: Web app gym management interface
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  PanResponder,
  Animated,
  Pressable,
  TouchableWithoutFeedback, // Keep it if used elsewhere, but remove from main modal structure
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { Typography } from '../../constants/design-system';
import { useAuth } from '../../app/_contexts/auth-context';
import Dropdown from '../../app/_components/ui/Dropdown';
import ExerciseInfoSheet from '../workout/ExerciseInfoSheet';

// Constants for workout ordering
const PPL_ORDER = ['Push', 'Pull', 'Legs'];
const ULUL_ORDER = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];

interface Exercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  order_index: number;
  is_bonus_exercise: boolean;
  muscle_group?: string;
}

interface Workout {
  id: string;
  template_name: string;
}

interface ManageGymWorkoutsDialogProps {
  visible: boolean;
  gymId: string;
  gymName: string;
  onClose: () => void;
}

export function ManageGymWorkoutsDialog({
  visible,
  gymId,
  gymName,
  onClose,
}: ManageGymWorkoutsDialogProps) {

  const { supabase, userId } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [coreExercises, setCoreExercises] = useState<Exercise[]>([]);
  const [bonusExercises, setBonusExercises] = useState<Exercise[]>([]);
  const [originalCoreExercises, setOriginalCoreExercises] = useState<Exercise[]>([]);
  const [originalBonusExercises, setOriginalBonusExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [exercisesLoaded, setExercisesLoaded] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('All Muscle Groups');
  const [showMuscleGroupDropdown, setShowMuscleGroupDropdown] = useState(false);
  const [exerciseLibraryTab, setExerciseLibraryTab] = useState<'my' | 'global'>('my');
  const [selectedExerciseType, setSelectedExerciseType] = useState<'core' | 'bonus'>('core');
  const [availableMuscles, setAvailableMuscles] = useState<string[]>([]);
  const pagerRef = useRef<PagerView>(null);
  const tabIndex = exerciseLibraryTab === 'my' ? 0 : 1;
  const [exercisesCache, setExercisesCache] = useState<{ [key: string]: any[] }>({});
  const [musclesCache, setMusclesCache] = useState<{ [key: string]: string[] }>({});
  const [categoriesCache, setCategoriesCache] = useState<{ [key: string]: string[] }>({});

  const setTab = (key: 'my' | 'global') => {
    setExerciseLibraryTab(key);
    pagerRef.current?.setPage(key === 'my' ? 0 : 1);
    Haptics.selectionAsync(); // optional subtle feedback
  };
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ exercise: Exercise; isBonus: boolean; index: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [dropIndicatorSection, setDropIndicatorSection] = useState<'core' | 'bonus' | null>(null);
  const [showDragOptions, setShowDragOptions] = useState(false);
  const [showExerciseInfo, setShowExerciseInfo] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<any>(null);

  useEffect(() => {
    if (visible && gymId) {
      setSelectedWorkoutId('');
      setCoreExercises([]);
      setBonusExercises([]);
      setOriginalCoreExercises([]);
      setOriginalBonusExercises([]);
      setWorkouts([]);
      setHasChanges(false);
      loadWorkouts();
    }
  }, [visible, gymId]);

  useEffect(() => {
    if (selectedWorkoutId) {
      setExercisesLoaded(false);
      loadExercises();
    } else {
      setCoreExercises([]);
      setBonusExercises([]);
      setOriginalCoreExercises([]);
      setOriginalBonusExercises([]);
      setHasChanges(false);
      setExercisesLoaded(false);
    }
  }, [selectedWorkoutId]);


  // Enhanced drag and drop logic with PanResponder
  useEffect(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        return true; // Always capture touch events
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return true; // Always capture move events
      },

      onPanResponderGrant: (evt, gestureState) => {
        // Starting drag detection
      },

      onPanResponderMove: (evt, gestureState) => {
        // If we have a dragged item, update its position
        if (draggedItem) {
          setDragOffset({
            x: gestureState.dx,
            y: gestureState.dy,
          });

          // Calculate drop position based on Y coordinate
          const currentY = evt.nativeEvent.pageY;
          const itemHeight = 60; // Approximate height of each exercise item
          const totalExercises = coreExercises.length + bonusExercises.length;

          if (totalExercises > 0) {
            // Calculate which section and index based on Y position
            const estimatedGlobalIndex = Math.floor(Math.abs(gestureState.dy) / itemHeight);

            if (estimatedGlobalIndex < coreExercises.length) {
              setDropIndicatorIndex(estimatedGlobalIndex);
              setDropIndicatorSection('core');
            } else {
              setDropIndicatorIndex(estimatedGlobalIndex - coreExercises.length);
              setDropIndicatorSection('bonus');
            }
          }
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        // Reset drag state
        setDraggedItem(null);
        setDragOffset({ x: 0, y: 0 });
        setDropIndicatorIndex(null);
        setDropIndicatorSection(null);
      },

      onPanResponderTerminate: () => {
        // Reset drag state if gesture is terminated
        setDraggedItem(null);
        setDragOffset({ x: 0, y: 0 });
        setDropIndicatorIndex(null);
        setDropIndicatorSection(null);
      },
    });

  }, [draggedItem, dropIndicatorIndex, dropIndicatorSection, coreExercises.length, bonusExercises.length]);

  // PanResponder to capture all touch events on the modal overlay and prevent them from passing through
  const modalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Do nothing, just capture the event
      },
      onPanResponderMove: () => {
        // Do nothing, just capture the event
      },
      onPanResponderRelease: () => {
        // Do nothing, just capture the event
      },
      onPanResponderTerminate: () => {
        // Do nothing, just capture the event
      },
    })
  ).current;


  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter exercises based on search, muscles, categories, and exclude already added exercises
  useEffect(() => {
    let filtered = availableExercises;

    // First, exclude exercises already in the current workout
    const currentWorkoutExerciseIds = [...coreExercises, ...bonusExercises].map(ex => ex.exercise_id);
    filtered = filtered.filter(ex => !currentWorkoutExerciseIds.includes(ex.id));

    // Apply search filter (case-insensitive)
    if (debouncedSearchQuery.trim()) {
      const searchTerm = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.name?.toLowerCase().includes(searchTerm) ||
        ex.main_muscle?.toLowerCase().includes(searchTerm) ||
        ex.category?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply muscle filter (AND within attribute)
    if (selectedMuscles.length > 0) {
      filtered = filtered.filter(ex => selectedMuscles.includes(ex.main_muscle));
    }

    // Apply category filter (AND within attribute)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(ex => selectedCategories.includes(ex.category));
    }

    setFilteredExercises(filtered);
  }, [availableExercises, debouncedSearchQuery, selectedMuscles, selectedCategories, coreExercises, bonusExercises]);

  const loadWorkouts = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);

    try {
      // Get user's profile to find active T-Path
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('active_t_path_id')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw profileError;
      }

      if (!profile?.active_t_path_id) {
        Alert.alert('No Active Program', 'Please set up a workout program first');
        setLoading(false);
        return;
      }

      // Get the active T-Path to determine type (PPL or ULUL)
      const { data: activeTPath, error: tPathError } = await supabase
        .from('t_paths')
        .select('id, settings')
        .eq('id', profile.active_t_path_id)
        .single();

      if (tPathError) {
        console.error('T-Path fetch error:', tPathError);
        throw tPathError;
      }

      // Load child workouts from the active T-Path
      const { data, error } = await supabase
        .from('t_paths')
        .select('id, template_name')
        .eq('parent_t_path_id', profile.active_t_path_id)
        .order('template_name');

      if (error) {
        console.error('Child workouts fetch error:', error);
        throw error;
      }

      let sortedWorkouts = data || [];

      // Sort workouts based on T-Path type
      const tPathSettings = activeTPath?.settings as { tPathType?: string } | null;
      const tPathType = tPathSettings?.tPathType;

      if (tPathType === 'ppl') {
        sortedWorkouts.sort((a, b) => PPL_ORDER.indexOf(a.template_name) - PPL_ORDER.indexOf(b.template_name));
      } else if (tPathType === 'ulul') {
        sortedWorkouts.sort((a, b) => ULUL_ORDER.indexOf(a.template_name) - ULUL_ORDER.indexOf(b.template_name));
      }

      setWorkouts(sortedWorkouts);

      // Set default workout based on T-Path type
      if (sortedWorkouts.length > 0) {
        let defaultWorkout = sortedWorkouts[0];

        if (tPathType === 'ppl') {
          const pushWorkout = sortedWorkouts.find(w => w.template_name === 'Push');
          if (pushWorkout) {
            defaultWorkout = pushWorkout;
          }
        } else if (tPathType === 'ulul') {
          const upperAWorkout = sortedWorkouts.find(w => w.template_name === 'Upper Body A');
          if (upperAWorkout) {
            defaultWorkout = upperAWorkout;
          }
        }

        setSelectedWorkoutId(defaultWorkout.id);
      }
    } catch (error) {
      console.error('[ManageGymWorkouts] Error loading workouts:', error);
      Alert.alert('Error', 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  const loadExercises = useCallback(async () => {
    if (!selectedWorkoutId) {
      return;
    }

    setLoading(true);
    setHasChanges(false);

    try {
      const { data, error } = await supabase
        .from('t_path_exercises')
        .select(`
          id,
          exercise_id,
          order_index,
          is_bonus_exercise,
          exercise_definitions (
            name
          )
        `)
        .eq('template_id', selectedWorkoutId)
        .order('order_index');

      if (error) {
        console.error('Exercise fetch error:', error);
        throw error;
      }

      const formattedExercises = (data || []).map((ex: any) => {
        return {
          id: ex.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_definitions?.name || 'Unknown Exercise',
          order_index: ex.order_index,
          is_bonus_exercise: ex.is_bonus_exercise,
        };
      });

      const core = formattedExercises.filter((ex) => !ex.is_bonus_exercise);
      const bonus = formattedExercises.filter((ex) => ex.is_bonus_exercise);

      setCoreExercises(core);
      setBonusExercises(bonus);
      setOriginalCoreExercises(core);
      setOriginalBonusExercises(bonus);
      setExercisesLoaded(true);

      setCoreExercises(core);
      setBonusExercises(bonus);
      setOriginalCoreExercises(core);
      setOriginalBonusExercises(bonus);
      setExercisesLoaded(true);
    } catch (error) {
      console.error('[ManageGymWorkouts] Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }, [selectedWorkoutId, supabase]);

  const loadAvailableExercises = async (libraryType: 'my' | 'global', reset: boolean = true, muscleFilter: string = selectedMuscleGroup) => {
    if (!userId || !gymId) return;

    // Check cache first (unless reset is true)
    if (!reset && exercisesCache[libraryType]) {
      setAvailableExercises(exercisesCache[libraryType]);
      if (musclesCache[libraryType]) setAvailableMuscles(musclesCache[libraryType]);
      if (categoriesCache[libraryType]) setAvailableCategories(categoriesCache[libraryType]);
      return;
    }

    try {
      setLoading(true);


      let exercises: any[] = [];
      let muscles: string[] = [];
      let categories: string[] = [];
      let errorFetch = null;

      if (libraryType === 'my') {
        // Get exercises created by the user
        const { data, error } = await supabase
          .from('exercise_definitions')
          .select('id, name, category, main_muscle, type')
          .eq('user_id', userId) // Only exercises created by this user
          .order('name');

        if (error) errorFetch = error;
        exercises = data || [];

      } else {
        // For now, fall back to showing all exercises since gym_exercises might not be populated
        const { data, error } = await supabase
          .from('exercise_definitions')
          .select('id, name, category, main_muscle, type')
          .order('name');

        if (error) errorFetch = error;
        exercises = data || [];
      }

      if (errorFetch) {
        console.error('❌ Exercise fetch error:', errorFetch);
        throw errorFetch;
      }


      // Filter based on newly added muscle group dropdown
       if (muscleFilter && muscleFilter !== 'All Muscle Groups') {
         exercises = exercises.filter(ex => {
           // Handle exercises with multiple main muscles (comma-separated)
           const exerciseMuscles = ex.main_muscle?.split(',').map((m: string) => m.trim()) || [];
           return exerciseMuscles.includes(muscleFilter);
         });
       }


      // Extract unique muscle groups from the actual exercise data
      const allMuscles = exercises.flatMap(ex =>
        ex.main_muscle?.split(',').map((m: string) => m.trim()) || []
      );
      muscles = [...new Set(allMuscles)].sort();

      categories = [...new Set(exercises.map(ex => ex.category).filter(Boolean))].sort();

      // Cache the results
      setExercisesCache(prev => ({ ...prev, [libraryType]: exercises }));
      setMusclesCache(prev => ({ ...prev, [libraryType]: muscles }));
      setCategoriesCache(prev => ({ ...prev, [libraryType]: categories }));

      setAvailableExercises(exercises);
      setAvailableMuscles(muscles);
      setAvailableCategories(categories);

    } catch (error) {
      console.error('[ManageGymWorkouts] Error in loadAvailableExercises:', error);
      Alert.alert('Error', 'Failed to load available exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExercisePicker = async (type: 'core' | 'bonus') => {
    setSelectedExerciseType(type);

    // For now, default to Global tab since gym_exercises table structure is unclear
    // TODO: Update when gym_exercises table structure is confirmed
    const defaultTab = 'global';
    setExerciseLibraryTab(defaultTab);

    // Pre-load both tabs to prevent delay when swiping
    await Promise.all([
      loadAvailableExercises('my', true, selectedMuscleGroup),
      loadAvailableExercises('global', true, selectedMuscleGroup)
    ]);

    // Clear previous selections when opening
    setSelectedExercises(new Set());
    setSearchQuery('');
    setSelectedMuscles([]);
    setSelectedCategories([]);
    // Keep selectedMuscleGroup as is - don't reset it

    setShowExercisePicker(true);
  };

  const toggleExerciseSelection = (exerciseId: string) => {
    setSelectedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const handleAddSelectedExercises = async () => {
    if (selectedExercises.size === 0) return;

    try {
      // Get current max order_index for the workout
      const { data: existingExercises, error: fetchError } = await supabase
        .from('t_path_exercises')
        .select('order_index')
        .eq('template_id', selectedWorkoutId)
        .order('order_index', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const nextOrderIndex = existingExercises && existingExercises.length > 0
        ? existingExercises[0].order_index + 1
        : 0;

      // Prepare exercises for insertion
      const exercisesToAdd = Array.from(selectedExercises).map((exerciseId, index) => ({
        template_id: selectedWorkoutId,
        exercise_id: exerciseId,
        order_index: nextOrderIndex + index,
        is_bonus_exercise: selectedExerciseType === 'bonus',
      }));

      // Bulk insert
      const { error: insertError } = await supabase
        .from('t_path_exercises')
        .insert(exercisesToAdd);

      if (insertError) throw insertError;

      // Clear selection and close picker
      setSelectedExercises(new Set());
      setShowExercisePicker(false);

      // Reload exercises to show the newly added ones
      await loadExercises();
    } catch (error) {
      console.error('Error adding exercises:', error);
      Alert.alert('Error', 'Failed to add exercises to workout');
    }
  };

  const moveExercise = (index: number, direction: 'up' | 'down', isBonus: boolean) => {
    const exercises = isBonus ? [...bonusExercises] : [...coreExercises];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= exercises.length) return;

    const temp = exercises[index];
    exercises[index] = exercises[newIndex];
    exercises[newIndex] = temp;

    if (isBonus) {
      setBonusExercises(exercises);
    } else {
      setCoreExercises(exercises);
    }
    setHasChanges(true);
  };

  const handleDragStart = (exercise: Exercise, index: number, isBonus: boolean) => {
    setDraggedItem({ exercise, isBonus, index });
    setShowDragOptions(true);
  };

  const handleDragMoveUp = () => {
    if (!draggedItem) return;

    const { isBonus, index } = draggedItem;
    moveExercise(index, 'up', isBonus);
    setShowDragOptions(false);
    setDraggedItem(null);
  };

  const handleDragMoveDown = () => {
    if (!draggedItem) return;

    const { isBonus, index } = draggedItem;
    moveExercise(index, 'down', isBonus);
    setShowDragOptions(false);
    setDraggedItem(null);
  };

  const handleDragMoveToCore = () => {
    if (!draggedItem) return;

    const { exercise, isBonus: sourceIsBonus, index: sourceIndex } = draggedItem;

    if (sourceIsBonus) {
      // Move from bonus to core
      setBonusExercises(bonusExercises.filter((_, i) => i !== sourceIndex));
      const newExercise = { ...exercise, is_bonus_exercise: false };
      setCoreExercises([...coreExercises, newExercise]);
      setHasChanges(true);
    }

    setShowDragOptions(false);
    setDraggedItem(null);
  };

  const handleDragMoveToBonus = () => {
    if (!draggedItem) return;

    const { exercise, isBonus: sourceIsBonus, index: sourceIndex } = draggedItem;

    if (!sourceIsBonus) {
      // Move from core to bonus
      setCoreExercises(coreExercises.filter((_, i) => i !== sourceIndex));
      const newExercise = { ...exercise, is_bonus_exercise: true };
      setBonusExercises([...bonusExercises, newExercise]);
      setHasChanges(true);
    }

    setShowDragOptions(false);
    setDraggedItem(null);
  };

  const handleDragCancel = () => {
    setShowDragOptions(false);
    setDraggedItem(null);
  };

  const toggleExerciseType = (exerciseId: string, currentIsBonus: boolean) => {
    const exercise = currentIsBonus
      ? bonusExercises.find(ex => ex.id === exerciseId)
      : coreExercises.find(ex => ex.id === exerciseId);

    if (!exercise) return;

    if (currentIsBonus) {
      // Move from Bonus to Core
      setBonusExercises(bonusExercises.filter(ex => ex.id !== exerciseId));
      setCoreExercises([...coreExercises, { ...exercise, is_bonus_exercise: false }]);
    } else {
      // Move from Core to Bonus
      setCoreExercises(coreExercises.filter(ex => ex.id !== exerciseId));
      setBonusExercises([...bonusExercises, { ...exercise, is_bonus_exercise: true }]);
    }

    setHasChanges(true);
  };

  const handleDeleteExercise = async (exerciseId: string, exerciseName: string, isBonus: boolean) => {
    try {
      // Delete from database immediately
      const { error } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) throw error;

      // Update local state
      if (isBonus) {
        setBonusExercises(bonusExercises.filter(ex => ex.id !== exerciseId));
      } else {
        setCoreExercises(coreExercises.filter(ex => ex.id !== exerciseId));
      }
      setHasChanges(true);
    } catch (error) {
      console.error('[ManageGymWorkouts] Error deleting exercise:', error);
      Alert.alert('Error', 'Failed to delete exercise');
    }
  };

  const handleExerciseInfo = async (exercise: Exercise) => {
    try {
      // Fetch detailed exercise information from the database
      const { data: exerciseDetails, error } = await supabase
        .from('exercise_definitions')
        .select(`
          name,
          description,
          category,
          main_muscle,
          type,
          pro_tip,
          video_url
        `)
        .eq('id', exercise.exercise_id)
        .single();

      if (error) {
        console.error('❌ Exercise details fetch error:', error);
        throw error;
      }

      // Set the exercise data for the info sheet
      setSelectedExerciseForInfo(exerciseDetails);
      setShowExerciseInfo(true);
    } catch (error) {
      console.error('❌ Error fetching exercise details:', error);
      Alert.alert(
        'Error',
        'Failed to load exercise details. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const allOriginal = [...originalCoreExercises, ...originalBonusExercises];
      
      // Recalculate order_index for all current exercises
      const updatedCoreExercises = coreExercises.map((ex, index) => ({
        ...ex,
        order_index: index,
      }));
      const updatedBonusExercises = bonusExercises.map((ex, index) => ({
        ...ex,
        order_index: index,
      }));
      const allCurrent = [...updatedCoreExercises, ...updatedBonusExercises];

      // Delete removed exercises
      const removedIds = allOriginal
        .filter(orig => !allCurrent.find(curr => curr.id === orig.id))
        .map(ex => ex.id);

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('t_path_exercises')
          .delete()
          .in('id', removedIds);

        if (deleteError) throw deleteError;
      }

      // Add new exercises (temp IDs) with correct order_index
      const newExercises = allCurrent.filter(ex => ex.id.startsWith('temp-'));
      if (newExercises.length > 0) {
        const inserts = newExercises.map(ex => ({
          template_id: selectedWorkoutId,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          is_bonus_exercise: ex.is_bonus_exercise,
        }));

        const { error: insertError } = await supabase
          .from('t_path_exercises')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      // Update existing exercises (order and bonus status might have changed)
      const existingExercises = allCurrent.filter(ex => !ex.id.startsWith('temp-'));
      for (const exercise of existingExercises) {
        const { error } = await supabase
          .from('t_path_exercises')
          .update({ 
            order_index: exercise.order_index,
            is_bonus_exercise: exercise.is_bonus_exercise
          })
          .eq('id', exercise.id);

        if (error) throw error;
      }

      Alert.alert('Success', 'Changes saved successfully');
      setHasChanges(false);
      await loadExercises();
    } catch (error) {
      console.error('[ManageGymWorkouts] Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const renderExercise = (exercise: Exercise, index: number, isBonus: boolean, total: number) => {
    const handleReorder = (direction: 'up' | 'down') => {
      moveExercise(index, direction, isBonus);
    };

    const isDragging = draggedItem?.exercise.id === exercise.id;
    const showDropIndicatorAbove = dropIndicatorIndex === index && dropIndicatorSection === (isBonus ? 'bonus' : 'core');
    const showDropIndicatorBelow = dropIndicatorIndex === index + 1 && dropIndicatorSection === (isBonus ? 'bonus' : 'core');

    // Simplified drag handler - just use TouchableOpacity for now
    const handleDragStartSimple = () => {
      handleDragStart(exercise, index, isBonus);
    };

    return (
      <View key={exercise.id}>
        {/* Drop Indicator Above */}
        {showDropIndicatorAbove && (
          <View style={styles.dropIndicator} />
        )}

        <TouchableOpacity
          style={[
            styles.exerciseItem,
            isDragging && styles.exerciseItemDragging,
          ]}
          onLongPress={handleDragStartSimple}
          activeOpacity={0.7}
        >
          {/* Drag Handle */}
          <TouchableOpacity
            style={styles.dragHandle}
            onLongPress={handleDragStartSimple}
          >
            <Ionicons name="menu" size={16} color={Colors.mutedForeground} />
          </TouchableOpacity>

          {/* Exercise Name */}
          <Text style={styles.exerciseName} numberOfLines={2}>{exercise.exercise_name}</Text>

          {/* Info Button */}
          <TouchableOpacity
            onPress={() => handleExerciseInfo(exercise)}
            style={styles.iconButton}
          >
            <Ionicons name="information-circle-outline" size={18} color="#666666" />
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            onPress={() => handleDeleteExercise(exercise.id, exercise.exercise_name, isBonus)}
            style={styles.iconButton}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Drop Indicator Below */}
        {showDropIndicatorBelow && (
          <View style={styles.dropIndicator} />
        )}
      </View>
    );
  };

  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      {/* Outer Pressable for overlay, closes modal on outside click */}
      <Pressable style={styles.overlay} onPress={handleClose}>
        {/* Inner Pressable for dialog content, stops propagation of clicks inside the dialog
            Also includes PanResponder for drag functionality on the dialog itself */}
        {/* Remove modalPanResponder from here to allow child Pressables to function */}
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <Ionicons name="barbell-outline" size={24} color={Colors.foreground} />
                <Text style={styles.title}>Manage Workouts for "{gymName}"</Text>
              </View>
              <Text style={styles.subtitle}>
                Select a workout to add, remove, or reorder exercises.
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeIcon}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Workout Dropdown */}
          <View style={styles.dropdownContainer}>
            <Dropdown
              items={workouts.map(workout => ({
                label: workout.template_name,
                value: workout.id,
              }))}
              selectedValue={selectedWorkoutId}
              onSelect={(value) => {
                setSelectedWorkoutId(value);
              }}
              placeholder="Select Workout"
              disabled={loading || isSaving}
            />
          </View>

          {/* Add Exercises Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setSelectedExerciseType('core'); // Default to core
              setExerciseLibraryTab('my'); // Default to My Exercises
              loadAvailableExercises('my');
              setShowExercisePicker(true);
            }}
            disabled={!selectedWorkoutId || loading || isSaving}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Exercises</Text>
          </TouchableOpacity>

          {/* Total Exercise Count */}
          {exercisesLoaded && (coreExercises.length > 0 || bonusExercises.length > 0) && (
            <Text style={styles.totalExerciseCount}>
              {coreExercises.length + bonusExercises.length} exercises in this workout!
            </Text>
          )}

          {/* Exercise Lists */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.foreground} />
              <Text style={styles.loadingText}>Loading workouts...</Text>
            </View>
          ) : !exercisesLoaded && selectedWorkoutId ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.foreground} />
              <Text style={styles.loadingText}>Loading exercises...</Text>
            </View>
          ) : (
            <ScrollView style={styles.exerciseList} showsVerticalScrollIndicator={false}>
              {coreExercises.length > 0 && (
                <View key="core-header">
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Core Exercises</Text>
                    <Text style={styles.sectionCount}>
                      {coreExercises.length} / {coreExercises.length + bonusExercises.length}
                    </Text>
                  </View>
                  <View style={styles.exerciseCard}>
                    <View style={styles.exerciseListContainer}>
                      {coreExercises.map((exercise, index) => {
                        return renderExercise(exercise, index, false, coreExercises.length);
                      })}
                    </View>
                  </View>
                </View>
              )}

              {bonusExercises.length > 0 && (
                <View key="bonus-header">
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Bonus Exercises</Text>
                    <Text style={styles.sectionCount}>
                      {bonusExercises.length} / {coreExercises.length + bonusExercises.length}
                    </Text>
                  </View>
                  <View style={styles.exerciseCard}>
                    <View style={styles.exerciseListContainer}>
                      {bonusExercises.map((exercise, index) => {
                        return renderExercise(exercise, index, true, bonusExercises.length);
                      })}
                    </View>
                  </View>
                </View>
              )}

              {coreExercises.length === 0 && bonusExercises.length === 0 && selectedWorkoutId && (
                <View key="empty" style={styles.emptyState}>
                  <Text style={styles.emptyText}>No exercises in this workout</Text>
                  <Text style={styles.emptySubtext}>Tap "Add Exercises" to get started</Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSaving}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>

      {/* Workout Picker Modal */}
        {showWorkoutPicker && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Select Workout</Text>
              <ScrollView style={styles.pickerList}>
                {workouts.map((workout) => (
                  <TouchableOpacity
                    key={workout.id}
                    style={[
                      styles.pickerItem,
                      selectedWorkoutId === workout.id && styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedWorkoutId(workout.id);
                      setShowWorkoutPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedWorkoutId === workout.id && styles.pickerItemTextSelected,
                      ]}
                    >
                      {workout.template_name}
                    </Text>
                    {selectedWorkoutId === workout.id && (
                      <Ionicons name="checkmark" size={20} color={Colors.foreground} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => setShowWorkoutPicker(false)}
              >
                <Text style={styles.pickerCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Drag Options Modal */}
        {showDragOptions && draggedItem && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Move "{draggedItem?.exercise.exercise_name}"</Text>
              <Text style={styles.pickerSubtitle}>Choose where to move this exercise:</Text>

              <View style={styles.dragOptionsContainer}>
                <TouchableOpacity
                  style={styles.dragOptionButton}
                  onPress={handleDragMoveUp}
                >
                  <Ionicons name="chevron-up" size={20} color="#fff" />
                  <Text style={styles.dragOptionText}>Move Up</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dragOptionButton}
                  onPress={handleDragMoveDown}
                >
                  <Ionicons name="chevron-down" size={20} color="#fff" />
                  <Text style={styles.dragOptionText}>Move Down</Text>
                </TouchableOpacity>

                {draggedItem?.isBonus ? (
                  <TouchableOpacity
                    style={styles.dragOptionButton}
                    onPress={handleDragMoveToCore}
                  >
                    <Ionicons name="arrow-up" size={20} color="#fff" />
                    <Text style={styles.dragOptionText}>Move to Core</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.dragOptionButton}
                    onPress={handleDragMoveToBonus}
                  >
                    <Ionicons name="arrow-down" size={20} color="#fff" />
                    <Text style={styles.dragOptionText}>Move to Bonus</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.dragOptionButton, styles.dragOptionCancel]}
                  onPress={handleDragCancel}
                >
                  <Ionicons name="close" size={20} color={Colors.foreground} />
                  <Text style={[styles.dragOptionText, styles.dragOptionCancelText]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Exercise Picker Modal - Web Version */}
        {showExercisePicker && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              {/* Header */}
              <View style={styles.pickerHeader}>
                <View style={styles.pickerTitleContainer}>
                  <Ionicons name="add-circle-outline" size={20} color={Colors.foreground} />
                  <Text style={styles.pickerTitle}>Add Exercises</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeIcon}>
                  <Ionicons name="close" size={24} color={Colors.foreground} />
                </TouchableOpacity>
              </View>

              <Text style={styles.pickerSubtitle}>
                Select exercises to add to the current workout template.
              </Text>

              {/* Library Tabs */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                {(['my', 'global'] as const).map((key) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setTab(key)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor:
                        exerciseLibraryTab === key ? Colors.foreground : Colors.muted,
                      marginHorizontal: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '600',
                        color:
                          exerciseLibraryTab === key
                            ? Colors.background
                            : Colors.mutedForeground,
                      }}
                    >
                      {key === 'my' ? 'My Exercises' : 'Global'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Search Input */}
              <View style={styles.webSearchContainer}>
                <Ionicons name="search" size={18} color={Colors.mutedForeground} style={styles.webSearchIcon} />
                <TextInput
                  style={styles.webSearchInput}
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Muscle Group Dropdown for filtering */}
              <View style={styles.filterDropdownContainer}>
                <Dropdown
                  items={[{ label: 'All Muscle Groups', value: 'All Muscle Groups' }, ...availableMuscles.map(muscle => ({ label: muscle, value: muscle }))]}
                  selectedValue={selectedMuscleGroup}
                  onSelect={async (value) => {
                    setSelectedMuscleGroup(value);
                    await loadAvailableExercises(exerciseLibraryTab, false, value);
                  }}
                  placeholder="Filter by Muscle Group"
                />
              </View>


              {/* Exercise List */}
              <PagerView
                ref={pagerRef}
                style={{ flex: 1 }}
                initialPage={tabIndex}
                onPageSelected={(e) => {
                  const newTab = e.nativeEvent.position === 0 ? 'my' : 'global';
                  setExerciseLibraryTab(newTab);
                  // Use cached exercises - no delay since they're pre-loaded
                  loadAvailableExercises(newTab, false, selectedMuscleGroup);
                }}
              >
                <View key="my">
                  <ScrollView style={styles.webExerciseList} showsVerticalScrollIndicator={false}>
                    {filteredExercises.length === 0 && !loading ? (
                      <View style={styles.webEmptyState}>
                        <Text style={styles.webEmptyText}>
                          No custom exercises yet
                        </Text>
                        <Text style={styles.webEmptySubtext}>
                          Create custom exercises in your library
                        </Text>
                      </View>
                    ) : (
                      filteredExercises.map((exercise) => {
                        const alreadyAdded = [...coreExercises, ...bonusExercises].some(
                          ex => ex.exercise_id === exercise.id
                        );

                        return (
                          <TouchableOpacity
                            key={exercise.id}
                            style={[
                              styles.webExerciseItem,
                              alreadyAdded && styles.webExerciseItemDisabled,
                            ]}
                            onPress={() => {
                              if (!alreadyAdded) {
                                toggleExerciseSelection(exercise.id);
                              }
                            }}
                            disabled={alreadyAdded}
                          >
                            <TouchableOpacity
                              onPress={() => handleExerciseInfo({ id: exercise.id, exercise_id: exercise.id, exercise_name: exercise.name, order_index: 0, is_bonus_exercise: false })}
                              style={styles.iconButton}
                            >
                              <Ionicons name="information-circle-outline" size={18} color={Colors.mutedForeground} />
                            </TouchableOpacity>
                            <View style={styles.webExerciseInfo}>
                              <Text
                                style={[
                                  styles.webExerciseName,
                                  alreadyAdded && styles.webExerciseNameDisabled,
                                ]}
                              >
                                {exercise.name}
                              </Text>
                            </View>
                            <View style={[
                              styles.selectionButton,
                              selectedExercises.has(exercise.id) && styles.selectionButtonSelected,
                            ]}>
                              <Text style={[
                                styles.selectionButtonText,
                                selectedExercises.has(exercise.id) && styles.selectionButtonTextSelected,
                              ]}>
                                {selectedExercises.has(exercise.id) ? 'Added' : 'Add'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>

                <View key="global">
                  <ScrollView style={styles.webExerciseList} showsVerticalScrollIndicator={false}>
                    {filteredExercises.length === 0 && !loading ? (
                      <View style={styles.webEmptyState}>
                        <Text style={styles.webEmptyText}>
                          No exercises found
                        </Text>
                        <Text style={styles.webEmptySubtext}>
                          Try adjusting your search or filters
                        </Text>
                      </View>
                    ) : (
                      filteredExercises.map((exercise) => {
                        const alreadyAdded = [...coreExercises, ...bonusExercises].some(
                          ex => ex.exercise_id === exercise.id
                        );

                        return (
                          <TouchableOpacity
                            key={exercise.id}
                            style={[
                              styles.webExerciseItem,
                              alreadyAdded && styles.webExerciseItemDisabled,
                            ]}
                            onPress={() => {
                              if (!alreadyAdded) {
                                toggleExerciseSelection(exercise.id);
                              }
                            }}
                            disabled={alreadyAdded}
                          >
                            <TouchableOpacity
                              onPress={() => handleExerciseInfo({ id: exercise.id, exercise_id: exercise.id, exercise_name: exercise.name, order_index: 0, is_bonus_exercise: false })}
                              style={styles.iconButton}
                            >
                              <Ionicons name="information-circle-outline" size={18} color={Colors.mutedForeground} />
                            </TouchableOpacity>
                            <View style={styles.webExerciseInfo}>
                              <Text
                                style={[
                                  styles.webExerciseName,
                                  alreadyAdded && styles.webExerciseNameDisabled,
                                ]}
                              >
                                {exercise.name}
                              </Text>
                            </View>
                            <View style={[
                              styles.selectionButton,
                              selectedExercises.has(exercise.id) && styles.selectionButtonSelected,
                            ]}>
                              <Text style={[
                                styles.selectionButtonText,
                                selectedExercises.has(exercise.id) && styles.selectionButtonTextSelected,
                              ]}>
                                {selectedExercises.has(exercise.id) ? 'Added' : 'Add'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              </PagerView>

              {/* Sticky Footer */}
              {selectedExercises.size > 0 && (
                <View style={styles.stickyFooter}>
                  <Text style={styles.selectionCount}>
                    {selectedExercises.size} selected
                  </Text>
                  <TouchableOpacity
                    style={styles.addToWorkoutButton}
                    onPress={handleAddSelectedExercises}
                  >
                    <Text style={styles.addToWorkoutText}>Add to Workout</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          </View>
        )}

        {/* Exercise Info Sheet */}
        <ExerciseInfoSheet
          visible={showExerciseInfo}
          onClose={() => {
            setShowExerciseInfo(false);
            setSelectedExerciseForInfo(null);
          }}
          exercise={selectedExerciseForInfo}
        />
      </Modal>
    );
  }

export default ManageGymWorkoutsDialog;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay, // Global modal overlay setting
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    width: '96%',
    height: '90%',
    maxHeight: '90%',
    margin: Spacing.lg,
    marginTop: Spacing['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.foreground,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  closeIcon: {
    padding: Spacing.xs,
  },
  dropdownContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.foreground,
  },
  filterContainer: {
    marginBottom: Spacing.md,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  muscleGroupList: {
    maxHeight: 40,
  },
  muscleGroupChip: {
    backgroundColor: Colors.muted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  muscleGroupChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  muscleGroupChipText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  muscleGroupChipTextSelected: {
    color: Colors.primaryForeground,
  },
  muscleGroupDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  muscleGroupDropdownText: {
    fontSize: 16,
    color: Colors.foreground,
  },
  muscleGroupDropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
    maxHeight: 200,
  },
  muscleGroupDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  muscleGroupDropdownItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  muscleGroupDropdownItemText: {
    fontSize: 16,
    color: Colors.foreground,
  },
  muscleGroupDropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionsText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    lineHeight: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: '#1F2937',
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  exerciseList: {
    flex: 1,
    marginTop: Spacing.md,
    maxHeight: 500,
    minHeight: 200,
  },
  exerciseCard: {
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    paddingTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.foreground,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  exerciseCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  exerciseListContainer: {
    backgroundColor: 'transparent',
  },
  totalExerciseCount: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 50,
  },
  exerciseItemDragging: {
    opacity: 0.8,
    transform: [{ scale: 1.02 }],
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  reorderControls: {
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  reorderButton: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  dropIndicator: {
    height: 2,
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.xs,
    marginVertical: Spacing.xs / 2,
  },
  dragOptionsContainer: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  dragOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: '#1F2937',
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dragOptionCancel: {
    backgroundColor: Colors.muted,
  },
  dragOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dragOptionCancelText: {
    color: Colors.foreground,
  },
  exerciseName: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    color: Colors.foreground,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  closeButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  saveButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: '#1F2937',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  pickerContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    width: '96%',
    height: '90%',
    maxHeight: '90%',
    margin: Spacing.lg,
    marginTop: Spacing['2xl'],
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  oldPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.muted,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#1F2937',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  tabTextActive: {
    color: '#fff',
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemSelected: {
    backgroundColor: Colors.muted,
  },
  pickerItemText: {
    fontSize: 15,
    color: Colors.foreground,
  },
  pickerItemTextSelected: {
    fontWeight: '600',
  },
  pickerItemTextDisabled: {
    color: Colors.mutedForeground,
  },
  exerciseInfo: {
    flex: 1,
  },
  muscleText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  alreadyAddedBadge: {
    fontSize: 12,
    color: Colors.mutedForeground,
    backgroundColor: Colors.muted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  emptyPickerState: {
    paddingVertical: Spacing.xl * 2,
    alignItems: 'center',
  },
  pickerCloseButton: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  pickerCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  circularCloseButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  circularCloseText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Web Version Modal Styles
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pickerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  pickerSubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
  },
  webTabContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.sm,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  webTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  webTabActive: {
    backgroundColor: Colors.foreground,
    borderColor: Colors.foreground,
  },
  webTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  webTabTextActive: {
    color: Colors.background,
  },
  webSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    marginHorizontal: 0,
  },
  webSearchIcon: {
    marginRight: Spacing.sm,
  },
  webSearchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.foreground,
  },
  filterDropdownContainer: {
    marginBottom: Spacing.md,
  },
  webFilterDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  webFilterText: {
    fontSize: 16,
    color: Colors.foreground,
  },
  webFilterDropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
    maxHeight: 200,
    marginBottom: Spacing.md,
  },
  webFilterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  webFilterItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  webFilterItemText: {
    fontSize: 16,
    color: Colors.foreground,
  },
  webFilterItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  webExerciseList: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  webEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  webEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  webEmptySubtext: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  webExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    marginVertical: Spacing.xs,
    marginHorizontal: 0,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  webExerciseItemDisabled: {
    opacity: 0.5,
  },
  webRadioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webRadioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  webExerciseInfo: {
    flex: 1,
  },
  webExerciseName: {
    fontSize: 16,
    color: Colors.foreground,
    fontWeight: '500',
  },
  webExerciseNameDisabled: {
    color: Colors.mutedForeground,
  },
  webExerciseMuscle: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  webAlreadyAddedBadge: {
    fontSize: 12,
    color: Colors.mutedForeground,
    backgroundColor: Colors.muted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  webFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  webCancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  webCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  webAddButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  webAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  // Filter Chips
  filterChipsContainer: {
    maxHeight: 60,
    marginBottom: Spacing.lg,
  },
  filterChipsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    backgroundColor: Colors.muted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: Colors.primaryForeground,
  },
  // Sticky Footer
  stickyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  addToWorkoutButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  addToWorkoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primaryForeground,
  },
  // Selection Button in Exercise List
  selectionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectionButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  selectionButtonTextSelected: {
    color: Colors.primaryForeground,
  },
});
