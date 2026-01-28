/**
 * Workout Launcher Screen
 * Interactive workout selector showing expandable workouts with exercises
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Pressable, KeyboardAvoidingView, Platform, Keyboard, TextInput, Dimensions, Modal, Animated, ActivityIndicator, LayoutAnimation, UIManager } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight, Play, Dumbbell } from 'lucide-react-native';
import { useWorkoutFlow } from '../_contexts/workout-flow-context';
import { useWorkoutLauncherData } from '../../hooks/useWorkoutLauncherData';
import { ScreenContainer, ScreenHeader } from '../../components/layout';
import { GymToggle } from '../../components/dashboard/GymToggle';
import { BackgroundRoot } from '../../components/BackgroundRoot';
import { useData } from '../_contexts/data-context';
import { useAuth } from '../_contexts/auth-context';
import { database, addToSyncQueue } from '../_lib/database';
import { supabase, fetchExerciseDefinitions } from '../_lib/supabase';
import type { Gym } from '@data/storage/models';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { ExerciseCard } from '../../components/workout/ExerciseCard';
import { ExerciseInfoModal } from '../../components/workout/ExerciseInfoModal';
import { ExerciseSwapModal } from '../../components/workout/ExerciseSwapModal';
import { WorkoutSummaryModal } from '../../components/workout/WorkoutSummaryModal';
import { WorkoutPill } from '../../components/workout-launcher';
import { WorkoutProgressBar } from '../../components/workout/WorkoutProgressBar';
import { getWorkoutColor } from '../../lib/workout-colors';
import { createTaggedLogger } from '../../lib/logger';
import { WeeklyWorkoutAnalyzer } from '@data/ai/weekly-workout-analyzer';

const log = createTaggedLogger('WorkoutScreen');

// Workout order constants for sorting
const ULUL_ORDER = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
const PPL_ORDER = ['Push', 'Pull', 'Legs'];

// Helper function to get display name for workout buttons
const getWorkoutDisplayName = (workoutName: string, isULUL: boolean): string => {
  if (!isULUL) {
    return workoutName; // Keep PPL names as-is
  }
  
  // Transform ULUL workout names to shorter format
  const lowerName = workoutName.toLowerCase();
  if (lowerName.includes('upper body a') || lowerName === 'upper body a') {
    return 'Upper A';
  } else if (lowerName.includes('lower body a') || lowerName === 'lower body a') {
    return 'Lower A';
  } else if (lowerName.includes('upper body b') || lowerName === 'upper body b') {
    return 'Upper B';
  } else if (lowerName.includes('lower body b') || lowerName === 'lower body b') {
    return 'Lower B';
  }
  
  // Fallback: return original name if no match
  return workoutName;
};

interface WorkoutItemProps {
  workout: any;
  exercises: any[];
  isExpanded: boolean;
  onToggle: () => void;
  onStartWorkout: () => void;
}

const WorkoutItem: React.FC<WorkoutItemProps> = ({
  workout,
  exercises,
  isExpanded,
  onToggle,
  onStartWorkout,
}) => {
  return (
    <View style={styles.workoutItem}>
      {/* Workout Header */}
      <Pressable style={styles.workoutHeader} onPress={onToggle}>
        <View style={styles.workoutHeaderLeft}>
          {isExpanded ? (
            <ChevronDown size={20} color={Colors.foreground} />
          ) : (
            <ChevronRight size={20} color={Colors.foreground} />
          )}
          <Text style={styles.workoutName}>{workout.template_name}</Text>
        </View>
        <Text style={styles.exerciseCount}>
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </Text>
      </Pressable>

      {/* Expanded Exercises */}
      {isExpanded && (
        <View style={styles.exercisesContainer}>
          {exercises.map((exercise, index) => (
            <View key={exercise.id || index} style={styles.exercisePreview}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseMuscle}>
                  {exercise.main_muscle?.charAt(0).toUpperCase() + exercise.main_muscle?.slice(1)}
                </Text>
              </View>
              <View style={styles.exerciseTarget}>
                <Text style={styles.targetText}>
                  {exercise.target_sets || 3} sets × {exercise.target_reps_min || 8}-{exercise.target_reps_max || 12} reps
                </Text>
              </View>
            </View>
          ))}

          {/* Start Workout Button */}
          <Pressable
            style={({ pressed }) => [
              styles.startWorkoutButton,
              pressed && styles.startWorkoutButtonPressed,
            ]}
            onPress={onStartWorkout}
          >
            <Play size={16} color={Colors.white} />
            <Text style={styles.startWorkoutText}>Start Workout</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default function WorkoutLauncherScreen() {
  const router = useRouter();
  const {
    selectWorkout,
    selectAndStartWorkout,
    startWorkout,
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    sessionStartTime,
    removeExerciseFromSession,
    substituteExercise,
    finishWorkout,
    completedExercises,
    currentSessionId,
    resetWorkoutSession,
    confirmLeave,
    loadSavedWorkoutState,
    resumeWorkout,
  } = useWorkoutFlow();
  const { profile, activeTPath, childWorkouts, adhocWorkouts, workoutExercisesCache, lastCompletedDates, loading, refreshing, error, refresh } = useWorkoutLauncherData();
  const { forceRefresh } = useData();
  
  // Use refs for profile and activeTPath to reduce recreations of ensureWorkoutSelected
  const profileRef = useRef(profile);
  const activeTPathRef = useRef(activeTPath);
  useEffect(() => {
    profileRef.current = profile;
    activeTPathRef.current = activeTPath;
  }, [profile, activeTPath]);

  // Disable LayoutAnimation on Android to prevent automatic animations
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(false);
    }
  }, []);

  // Slide animation for loading indicator
  const indicatorTranslateY = useRef(new Animated.Value(-50)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      // Slide down and fade in
      Animated.parallel([
        Animated.timing(indicatorTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(indicatorOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide up and fade out
      Animated.parallel([
        Animated.timing(indicatorTranslateY, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(indicatorOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [refreshing, indicatorTranslateY, indicatorOpacity]);
  
  // Track last known T-path to detect changes and reset workout state
  const lastTPathIdRef = useRef<string | null>(null);
  
  // Track manually selected workout name to preserve it across gym changes
  const manuallySelectedWorkoutNameRef = useRef<string | null>(null);
  // Track previous childWorkouts IDs to detect when they change unnecessarily
  const previousChildWorkoutIdsRef = useRef<string[]>([]);
  // Track if selection is currently in progress to prevent race conditions
  const isSelectingRef = useRef<boolean>(false);
  // Track if gym change is in progress to prevent cleanup effect from running during gym toggle
  const isGymChangeInProgressRef = useRef<boolean>(false);
  
  // Helper function to find default workout (Push for PPL, Upper Body A for ULUL)
  const getDefaultWorkout = useCallback((workouts: typeof childWorkouts, isULUL: boolean) => {
    if (workouts.length === 0) return null;
    
    if (isULUL) {
      // For ULUL, find Upper Body A or Upper A
      const defaultWorkout = workouts.find(workout => {
        const lowerName = workout.template_name.toLowerCase();
        return (lowerName.includes('upper') && lowerName.includes('a')) || 
               lowerName === 'upper a' || 
               lowerName === 'upper body a';
      });
      if (defaultWorkout) {
        log.debug('[WorkoutScreen] Found default ULUL workout:', defaultWorkout.template_name);
        return defaultWorkout;
      } else {
        console.warn('[WorkoutScreen] ULUL program detected but Upper Body A workout not found:', workouts.map(w => w.template_name));
      }
    } else {
      // For PPL, find Push workout
      const defaultWorkout = workouts.find(workout =>
        workout.template_name.toLowerCase().includes('push')
      );
      if (defaultWorkout) {
        log.debug('[WorkoutScreen] Found default PPL workout:', defaultWorkout.template_name);
        return defaultWorkout;
      } else {
        console.warn('[WorkoutScreen] PPL program detected but Push workout not found:', workouts.map(w => w.template_name));
      }
    }
    
    // Fallback to first workout if default not found
    return workouts[0] || null;
  }, []);
  
  // Unified function to ensure a workout is selected
  // Handles: preserved workout re-selection, auto-select default, error handling
  const ensureWorkoutSelected = useCallback(async () => {
    console.log('[WorkoutScreen] === ensureWorkoutSelected called ===');
    
    // Prevent race conditions - don't run if already selecting
    if (isSelectingRef.current) {
      console.log('[WorkoutScreen] Selection already in progress, skipping');
      return;
    }
    
    // Use refs for profile/activeTPath to reduce recreations
    const currentProfile = profileRef.current;
    const currentActiveTPath = activeTPathRef.current;
    
    console.log('[WorkoutScreen] Checking conditions - childWorkouts:', childWorkouts.length, 'profile:', !!currentProfile, 'activeWorkout:', !!activeWorkout, 'selectedWorkout:', selectedWorkout);
    
    // Early exits - don't select if:
    if (!childWorkouts.length || !currentProfile?.id) {
      console.log('[WorkoutScreen] Early exit: no workouts or no profile');
      isSelectingRef.current = false;
      return; // No workouts or no profile
    }
    if (activeWorkout || currentSessionId) {
      console.log('[WorkoutScreen] Early exit: active workout/session in progress');
      isSelectingRef.current = false;
      return; // Active workout/session takes priority
    }
    if (selectedWorkout) {
      console.log('[WorkoutScreen] Early exit: workout already selected:', selectedWorkout);
      isSelectingRef.current = false;
      return; // Already selected
    }
    
    console.log('[WorkoutScreen] Proceeding with selection...');
    console.log('[WorkoutScreen] Setting isSelectingRef = true');
    isSelectingRef.current = true;
    
    try {
      // Try to re-select preserved workout first (selection from previous gym)
      const preservedWorkoutName = manuallySelectedWorkoutNameRef.current;
      console.log('[WorkoutScreen] Preserved workout name:', preservedWorkoutName);
      
      if (preservedWorkoutName) {
        console.log('[WorkoutScreen] Looking for preserved workout in', childWorkouts.length, 'workouts:', childWorkouts.map(w => w.template_name));
        const workoutToReselect = childWorkouts.find(w => 
          w.template_name.toLowerCase() === preservedWorkoutName.toLowerCase()
        );
        
        if (workoutToReselect) {
          console.log('[WorkoutScreen] ✓ Found preserved workout, re-selecting:', workoutToReselect.template_name);
          try {
            setSelectedWorkout(workoutToReselect.id);
            await selectWorkout(workoutToReselect.id);
            setIsWorkoutActiveInline(true);
            setUserHasSelectedWorkout(true);
            console.log('[WorkoutScreen] ✓ Successfully re-selected preserved workout');
            console.log('[WorkoutScreen] After re-selection - selectedWorkout:', workoutToReselect.id, 'activeWorkout:', activeWorkout?.id, 'isGymChangeInProgress:', isGymChangeInProgressRef.current);
            return; // Successfully re-selected
          } catch (error) {
            console.error('[WorkoutScreen] ✗ Failed to re-select preserved workout:', error);
            // On error, clear the preserved workout and fall through to auto-select
            manuallySelectedWorkoutNameRef.current = null;
            setUserHasSelectedWorkout(false);
          }
        } else {
          console.log('[WorkoutScreen] ✗ Preserved workout not found in current gym, will auto-select default');
          manuallySelectedWorkoutNameRef.current = null;
          setUserHasSelectedWorkout(false);
          // Fall through to auto-select
        }
      } else {
        console.log('[WorkoutScreen] No preserved workout, will auto-select default');
      }
      
      // Auto-select default workout (Push for PPL, Upper Body A for ULUL)
      const isULUL = currentProfile?.programme_type === 'ulul' || 
                     currentActiveTPath?.template_name?.toLowerCase().includes('upper/lower');
      console.log('[WorkoutScreen] Program type - isULUL:', isULUL, 'profile.programme_type:', currentProfile?.programme_type, 'tpath:', currentActiveTPath?.template_name);
      
      const defaultWorkout = getDefaultWorkout(childWorkouts, isULUL);
      console.log('[WorkoutScreen] Default workout selected by getDefaultWorkout:', defaultWorkout?.template_name);
      
      if (defaultWorkout) {
        // Verify workout exists in childWorkouts before selecting
        const workoutExists = childWorkouts.some(w => w.id === defaultWorkout.id);
        if (!workoutExists) {
          console.error('[WorkoutScreen] ✗ Default workout not found in childWorkouts:', defaultWorkout.id);
          return;
        }
        
        console.log('[WorkoutScreen] ✓ Auto-selecting default workout:', defaultWorkout.template_name);
        try {
          setSelectedWorkout(defaultWorkout.id);
          await selectWorkout(defaultWorkout.id);
          setIsWorkoutActiveInline(true);
          // IMPORTANT: Preserve auto-selected workout for gym toggles
          manuallySelectedWorkoutNameRef.current = defaultWorkout.template_name;
          setUserHasSelectedWorkout(true);
          console.log('[WorkoutScreen] ✓ Auto-select successful, preserved for future gym toggles');
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          }, 100);
        } catch (error) {
          console.error('[WorkoutScreen] ✗ Failed to auto-select workout:', error);
          // Reset state on error to allow retry
          console.log('[WorkoutScreen] ⚠️ Auto-select error: Clearing selectedWorkout');
          setSelectedWorkout(null);
          setIsWorkoutActiveInline(false);
          manuallySelectedWorkoutNameRef.current = null;
          setUserHasSelectedWorkout(false);
        }
      } else {
        console.warn('[WorkoutScreen] ✗ No default workout found to auto-select. childWorkouts:', childWorkouts.map(w => w.template_name));
      }
    } finally {
      console.log('[WorkoutScreen] Clearing isSelectingRef = false');
      isSelectingRef.current = false;
    }
  }, [childWorkouts, selectedWorkout, activeWorkout, currentSessionId, selectWorkout, getDefaultWorkout]);
  
  // Reset workout when T-path changes
  useEffect(() => {
    const currentTPathId = activeTPath?.id || profile?.active_t_path_id || null;
    const tPathSource = activeTPath?.id ? 'activeTPath.id' : (profile?.active_t_path_id ? 'profile.active_t_path_id' : 'null');
    console.log('[Workout] T-path effect running - currentTPathId:', currentTPathId, 'lastTPathId:', lastTPathIdRef.current, 'willClear:', currentTPathId && currentTPathId !== lastTPathIdRef.current && lastTPathIdRef.current !== null, 'source:', tPathSource, 'isGymChangeInProgress:', isGymChangeInProgressRef.current);
    
    if (currentTPathId && currentTPathId !== lastTPathIdRef.current && lastTPathIdRef.current !== null) {
      // BLOCK T-path change effect during gym switches - T-path should NOT change when switching gyms
      if (isGymChangeInProgressRef.current) {
        console.log('[Workout] ⚠️ T-PATH CHANGE DETECTED during gym switch - BLOCKED (T-path should not change)');
        // Still update the ref to prevent this from triggering again, but don't clear state
        lastTPathIdRef.current = currentTPathId;
        return;
      }
      
      console.log('[Workout] ⚠️ T-PATH CHANGE DETECTED - This should NOT happen during gym switch!');
      log.debug('[Workout] T-path changed detected, resetting workout state and clearing selection:', {
        oldTPathId: lastTPathIdRef.current,
        newTPathId: currentTPathId,
        selectedWorkout,
        childWorkoutIds: childWorkouts.map(w => w.id),
        childWorkoutNames: childWorkouts.map(w => w.template_name)
      });
      // CRITICAL: Always clear selected workout when T-path changes
      // The selected workout belongs to the old T-path, so it must be cleared
      setSelectedWorkout(null);
      setIsWorkoutActiveInline(false);
      resetWorkoutSession();
      // Clear ALL flags so auto-select can run for new T-path
      setUserHasSelectedWorkout(false);
      setHasJustReset(false);
      log.debug('[Workout] T-path changed - cleared all flags to allow auto-select for new T-path');
    }
    if (currentTPathId) {
      lastTPathIdRef.current = currentTPathId;
    }
  }, [activeTPath?.id, profile?.active_t_path_id, resetWorkoutSession, selectedWorkout, childWorkouts]);
  const { getGyms, setActiveGym, shouldRefreshDashboard, setShouldRefreshDashboard, setLastWorkoutCompletionTime, invalidateAllCaches } = useData();
  const { userId } = useAuth();
  const [userGyms, setUserGyms] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [isWorkoutActiveInline, setIsWorkoutActiveInline] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryModalData, setSummaryModalData] = useState<{
    exercises: any[];
    workoutName: string;
    startTime: Date;
    duration?: string | undefined;
    historicalWorkout?: any;
    weeklyVolumeData?: any;
    allAvailableMuscleGroups?: string[];
    nextWorkoutSuggestion?: any;
    isOnTPath?: boolean;
    historicalRating?: number;
    sessionId?: string;
  } | null>(null);
  // Track if user explicitly closed the modal to prevent it from reappearing during sync
  const summaryModalWasClosedRef = useRef<boolean>(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [currentExerciseId, setCurrentExerciseId] = useState<string>('');
  const [hasJustReset, setHasJustReset] = useState(false);
  const [userHasSelectedWorkout, setUserHasSelectedWorkout] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedWorkoutState, setSavedWorkoutState] = useState<any>(null);

  // Unified effect to ensure a workout is selected
  // Handles all selection scenarios: preserved workout re-selection, auto-select default
  // CRITICAL: Also depend on childWorkouts to trigger auto-select when T-path changes
  useEffect(() => {
    console.log('[Workout] Selection effect triggered - childWorkouts:', childWorkouts.length, 'selectedWorkout:', selectedWorkout);
    ensureWorkoutSelected();
  }, [ensureWorkoutSelected, childWorkouts.length]);

  // Track childWorkouts changes to detect unnecessary reloads
  useEffect(() => {
    const currentIds = childWorkouts.map(w => w.id).sort().join(',');
    const prevIds = previousChildWorkoutIdsRef.current.sort().join(',');
    const idsChanged = currentIds !== prevIds;
    if (idsChanged || previousChildWorkoutIdsRef.current.length === 0) {
      log.debug('[WorkoutScreen] childWorkouts IDs changed:', {
        previousNames: previousChildWorkoutIdsRef.current.map(id => 
          childWorkouts.find(w => w.id === id)?.template_name || 'unknown'
        ),
        currentNames: childWorkouts.map(w => w.template_name),
        idsChanged
      });
      previousChildWorkoutIdsRef.current = childWorkouts.map(w => w.id);
    }
  }, [childWorkouts]);

  // Track previous sorted array to maintain stable reference
  const previousSortedWorkoutsRef = useRef<any[]>([]);
  const previousWorkoutIdsKeyRef = useRef<string>('');
  const previousProgramTypeRef = useRef<string | undefined>(undefined);
  
  // Create stable key for workout IDs - recalculated every render but only used for comparison
  const workoutIdsKey = childWorkouts.map(w => w.id).sort().join(',');
  
  // Memoize sorted workouts to prevent unnecessary re-renders and animations
  // Only recalculate when workout IDs or program type actually changes
  
  const sortedWorkouts = useMemo(() => {
    if (childWorkouts.length === 0) {
      previousSortedWorkoutsRef.current = [];
      previousWorkoutIdsKeyRef.current = workoutIdsKey;
      previousProgramTypeRef.current = activeTPath?.template_name;
      return [];
    }
    
    // If IDs and program type haven't changed, return previous array to maintain reference stability
    if (workoutIdsKey === previousWorkoutIdsKeyRef.current && 
        activeTPath?.template_name === previousProgramTypeRef.current &&
        previousSortedWorkoutsRef.current.length > 0) {
            return previousSortedWorkoutsRef.current;
    }
    
    // Create a stable sorted copy (don't mutate original)
    const sorted = [...childWorkouts].sort((a, b) => {
      const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');

      if (isUpperLowerSplit) {
        // Use ULUL_ORDER for proper sorting: Upper Body A, Lower Body A, Upper Body B, Lower Body B
        const indexA = ULUL_ORDER.indexOf(a.template_name);
        const indexB = ULUL_ORDER.indexOf(b.template_name);
        // If workout not found in order, put it at the end
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      } else {
        // PPL sorting
        const indexA = PPL_ORDER.indexOf(a.template_name);
        const indexB = PPL_ORDER.indexOf(b.template_name);
        // If workout not found in order, put it at the end
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      }
    });
    
    // Store for next comparison
    previousSortedWorkoutsRef.current = sorted;
    previousWorkoutIdsKeyRef.current = workoutIdsKey;
    previousProgramTypeRef.current = activeTPath?.template_name;
    
        
    return sorted;
  }, [
    // Only recalculate when workout IDs change (stable key) or program type changes
    workoutIdsKey,
    activeTPath?.template_name,
    childWorkouts // Need this for the actual data, but we check IDs to prevent unnecessary recreation
  ]);

  // Memoize ScrollView contentContainerStyle to prevent re-renders
  const scrollViewContentStyle = useMemo(() => [styles.workoutButtonsContainer, { paddingLeft: -Spacing.lg }], []);

  const handleSelectWorkout = useCallback(async (workoutId: string) => {
    log.debug('[WorkoutScreen] handleSelectWorkout called with:', workoutId, 'current selected:', selectedWorkout);

    // Close resume dialog if open (user is starting a new workout)
    if (showResumeDialog) {
      setShowResumeDialog(false);
      setSavedWorkoutState(null);
      // Clear saved state since user is starting a new workout
      if (userId) {
        try {
          const { clearWorkoutState } = await import('../../lib/workoutStorage');
          await clearWorkoutState(userId);
        } catch (error) {
          console.error('[WorkoutScreen] Error clearing workout state:', error);
        }
      }
    }

    // For ad-hoc, skip validation
    if (workoutId !== 'ad-hoc') {
      // Validate workout exists in childWorkouts before selecting
      const workoutExists = childWorkouts.some(w => w.id === workoutId);
      if (!workoutExists) {
        console.error('[WorkoutScreen] Workout not found in childWorkouts:', workoutId, 'Available workouts:', childWorkouts.map(w => w.id));
        Alert.alert('Error', 'Selected workout not found. Please try again.');
        return;
      }
    }

    if (selectedWorkout && selectedWorkout !== workoutId) {
      log.debug('[WorkoutScreen] Switching workouts, resetting current session first');
      await resetWorkoutSession();
    }

    const newSelectedWorkout = workoutId === selectedWorkout ? null : workoutId;
    setSelectedWorkout(newSelectedWorkout);
    
    // Track manually selected workout name for preservation across gym changes
    if (newSelectedWorkout && workoutId !== 'ad-hoc') {
      const workout = childWorkouts.find(w => w.id === workoutId);
      if (workout) {
        manuallySelectedWorkoutNameRef.current = workout.template_name;
        setUserHasSelectedWorkout(true);
      }
    } else {
      manuallySelectedWorkoutNameRef.current = null;
      setUserHasSelectedWorkout(false);
    }

    if (newSelectedWorkout && newSelectedWorkout !== selectedWorkout) {
      // Set flag to prevent auto-select from interfering
      console.log('[WorkoutScreen] Manual selection - setting isSelectingRef = true');
      isSelectingRef.current = true;
      
      try {
        log.debug('Selecting workout:', newSelectedWorkout);
        setLoadingExercises(true);
        await selectWorkout(newSelectedWorkout);
        log.debug('Workout selected successfully');
        setIsWorkoutActiveInline(true);
      } catch (error) {
        console.error('Failed to select workout:', error);
        Alert.alert('Error', 'Failed to load workout. Please try again.');
        console.log('[WorkoutScreen] ⚠️ Manual selection error: Clearing selectedWorkout');
        setSelectedWorkout(null);
        setIsWorkoutActiveInline(false);
      } finally {
        setLoadingExercises(false);
        console.log('[WorkoutScreen] Manual selection complete - clearing isSelectingRef = false');
        isSelectingRef.current = false;
      }
    } else if (!newSelectedWorkout) {
      console.log('[WorkoutScreen] ⚠️ Deselecting workout: Clearing selectedWorkout');
      setIsWorkoutActiveInline(false);
      setSelectedWorkout(null);
      await resetWorkoutSession();
    }
  }, [selectedWorkout, childWorkouts, showResumeDialog, userId, resetWorkoutSession, selectWorkout, setUserHasSelectedWorkout]);

  // Memoize ad-hoc onClick handler
  const handleAdHocClick = useCallback(() => {
    handleSelectWorkout('ad-hoc');
  }, [handleSelectWorkout]);

  // Memoize workout pills array to prevent recreation on every render
  const workoutPills = useMemo(() => {
    const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');
    return sortedWorkouts.map((workout) => {
      const lowerTitle = workout.template_name.toLowerCase();
      let category: 'push' | 'pull' | 'legs' | 'upper' | 'lower';

      if (isUpperLowerSplit) {
        if (lowerTitle.includes('upper')) category = 'upper';
        else if (lowerTitle.includes('lower')) category = 'lower';
        else category = 'upper';
      } else {
        if (lowerTitle.includes('push')) category = 'push';
        else if (lowerTitle.includes('pull')) category = 'pull';
        else if (lowerTitle.includes('legs')) category = 'legs';
        else category = 'push';
      }

      const isSelected = selectedWorkout === workout.id;
      const completedAt = lastCompletedDates[workout.id] || null;
      const displayName = getWorkoutDisplayName(workout.template_name, isUpperLowerSplit);

            return (
        <WorkoutPill
          key={workout.id}
          id={workout.id}
          title={displayName}
          category={category}
          completedAt={completedAt}
          isSelected={isSelected}
          onClick={handleSelectWorkout}
        />
      );
    });
  }, [sortedWorkouts, activeTPath?.template_name, selectedWorkout, lastCompletedDates, handleSelectWorkout]);

  // Check for saved workout state on mount (resume functionality)
  useEffect(() => {
    const checkForSavedWorkout = async () => {
      // Only check if there's no active workout and no current session
      if (currentSessionId || activeWorkout || !userId) {
        return;
      }

      // Wait for initial load to complete
      if (loading) {
        return;
      }

      try {
        const savedState = await loadSavedWorkoutState();
        if (savedState && savedState.activeWorkout) {
          log.debug('[WorkoutScreen] Found saved workout state:', savedState.activeWorkout.template_name);
          setSavedWorkoutState(savedState);
          setShowResumeDialog(true);
        }
      } catch (error) {
        console.error('[WorkoutScreen] Error checking for saved workout state:', error);
      }
    };

    // Only check after initial load is complete and we have workouts
    if (!loading && childWorkouts.length > 0) {
      checkForSavedWorkout();
    }
  }, [loading, childWorkouts.length, currentSessionId, activeWorkout, userId, loadSavedWorkoutState]);

  // Reset workout UI state when context is reset (but don't interfere with T-path change auto-select)
  // Only reset if there was previously an active workout/session, not on initial load or T-path change
  const hadActiveWorkoutRef = useRef<boolean>(false);
  useEffect(() => {
    console.log('[WorkoutScreen] activeWorkout/session tracking effect - activeWorkout:', activeWorkout?.id, 'currentSessionId:', currentSessionId, 'hadActiveWorkout:', hadActiveWorkoutRef.current);
    if (activeWorkout || currentSessionId) {
      hadActiveWorkoutRef.current = true;
      console.log('[WorkoutScreen] Set hadActiveWorkoutRef = true');
    }
  }, [activeWorkout, currentSessionId]);

  useEffect(() => {
    // Only reset if we previously had an active workout/session and now we don't
    // This prevents interference with auto-select after T-path changes
    // CRITICAL: Don't run if we're currently selecting a workout (isSelectingRef)
    // During re-selection, selectWorkout() temporarily clears activeWorkout which would trigger this
    // CRITICAL: Don't run during gym changes - they cause activeWorkout to change but we're re-selecting
    console.log('[WorkoutScreen] Cleanup effect triggered - checking conditions:', {
      activeWorkout: !!activeWorkout,
      currentSessionId: !!currentSessionId,
      hadActiveWorkout: hadActiveWorkoutRef.current,
      isSelecting: isSelectingRef.current,
      isGymChangeInProgress: isGymChangeInProgressRef.current
    });
    
    // Log why we're skipping if conditions aren't met
    if (activeWorkout) {
      console.log('[WorkoutScreen] ✗ Cleanup blocked: activeWorkout is true');
    } else if (currentSessionId) {
      console.log('[WorkoutScreen] ✗ Cleanup blocked: currentSessionId exists');
    } else if (!hadActiveWorkoutRef.current) {
      console.log('[WorkoutScreen] ✗ Cleanup blocked: hadActiveWorkoutRef is false');
    } else if (isSelectingRef.current) {
      console.log('[WorkoutScreen] ✗ Cleanup blocked: isSelectingRef is true');
    } else if (isGymChangeInProgressRef.current) {
      console.log('[WorkoutScreen] ✗ Cleanup blocked: isGymChangeInProgressRef is true');
    }
    
    if (!activeWorkout && !currentSessionId && hadActiveWorkoutRef.current && !isSelectingRef.current && !isGymChangeInProgressRef.current) {
      console.log('[WorkoutScreen] ✓ ALL CONDITIONS MET - Running cleanup (clearing selectedWorkout)');
      log.debug('[WorkoutScreen] Resetting workout UI state after active workout/session ended');
      console.log('[WorkoutScreen] ⚠️ Cleanup effect: Clearing selectedWorkout');
            setIsWorkoutActiveInline(false);
      setSelectedWorkout(null);
      setHasJustReset(true);
      setUserHasSelectedWorkout(false);
      // ENFORCEMENT: Clear hasJustReset faster to allow auto-select sooner
      setTimeout(() => {
        log.debug('[WorkoutScreen] Clearing hasJustReset flag');
                setHasJustReset(false);
        hadActiveWorkoutRef.current = false;
      }, 50); // Reduced from 100ms to 50ms for faster auto-select
    }
  }, [activeWorkout, currentSessionId]);

  // Refresh data when tab is focused or when T-Path was regenerated
  useFocusEffect(
    useCallback(() => {
      // Always refresh when shouldRefreshDashboard is true (T-path change)
      // Also refresh if profile is missing
      if (shouldRefreshDashboard || !profile) {
        log.debug('[Workout] Refreshing workout data - profile:', !!profile, 'shouldRefresh:', shouldRefreshDashboard);
        refresh();
        // Reset the flag after refreshing workout data
        if (shouldRefreshDashboard) {
          // Small delay to ensure the refresh completes before clearing the flag
          setTimeout(() => {
            setShouldRefreshDashboard(false);
          }, 500);
        }
      }
      
      // The unified selection effect will handle selection automatically
      // No need to call it directly here - it will run when dependencies change
    }, [refresh, profile, shouldRefreshDashboard, setShouldRefreshDashboard, ensureWorkoutSelected])
  );
  
  // Also watch for shouldRefreshDashboard changes even when not focused
  // This ensures immediate refresh when T-path changes from profile page
  useEffect(() => {
    console.log('[Workout] shouldRefreshDashboard effect running - shouldRefreshDashboard:', shouldRefreshDashboard);
    if (shouldRefreshDashboard) {
      console.log('[Workout] ⚠️ shouldRefreshDashboard flag detected - This should NOT be set during gym switch!');
      console.log('[Workout] Current state before refresh - selectedWorkout:', selectedWorkout, 'preserved:', manuallySelectedWorkoutNameRef.current);
      
      // Clear selected workout ID but keep preserved name for re-selection after refresh
      console.log('[Workout] ⚠️ shouldRefreshDashboard: Clearing selectedWorkout');
      setSelectedWorkout(null);
      setIsWorkoutActiveInline(false);
      resetWorkoutSession();
      setHasJustReset(false);
      
      // DO NOT clear userHasSelectedWorkout or manuallySelectedWorkoutNameRef here
      // They should be preserved for re-selection after refresh completes
      
      // CRITICAL: Clear the preserved workout name to force auto-select of default workout
      manuallySelectedWorkoutNameRef.current = null;
      setUserHasSelectedWorkout(false);
      
      refresh().then(() => {
        console.log('[Workout] Refresh completed, triggering auto-select');
        // After refresh completes, trigger auto-select by calling ensureWorkoutSelected
        ensureWorkoutSelected();
      });
      
      console.log('[Workout] Refresh triggered, selection will happen after refresh completes');
      
      // Reset the flag after a delay
      setTimeout(() => {
        setShouldRefreshDashboard(false);
      }, 500);
    }
  }, [shouldRefreshDashboard, refresh, setShouldRefreshDashboard, resetWorkoutSession, ensureWorkoutSelected]);

  // Handle keyboard show to scroll focused input into view
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      const focusedInput = TextInput.State.currentlyFocusedInput();
      if (focusedInput && scrollViewRef.current) {
        (scrollViewRef.current as any).measure((scrollX: number, scrollY: number, scrollWidth: number, scrollHeight: number, scrollPageX: number, scrollPageY: number) => {
          focusedInput.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
            const keyboardHeight = e.endCoordinates.height;
            const screenHeight = Dimensions.get('window').height;
            const visibleArea = screenHeight - keyboardHeight - 50;
            const contentY = pageY - scrollPageY;
            const inputBottom = contentY + height;

            if (inputBottom > visibleArea) {
              const scrollToY = Math.max(0, contentY - (visibleArea - height - 50));
              scrollViewRef.current?.scrollTo({ y: scrollToY, animated: true });
            }
          });
        });
      }
    });

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  // Load gyms for toggle - reload when forceRefresh changes to ensure fresh gym list
  useEffect(() => {
    // #region agent log
    console.log('[DEBUG-GYM] Gym loading effect TRIGGERED - profileId:', profile?.id, 'forceRefresh:', forceRefresh, 'hasProfile:', !!profile);
    // #endregion
    const loadGyms = async () => {
      log.debug('[Workout] Loading gyms with profile:', { profileId: profile?.id, activeGymId: profile?.active_gym_id, forceRefresh });
      // #region agent log
      console.log('[DEBUG-GYM] loadGyms function CALLED - profileId:', profile?.id, 'forceRefresh:', forceRefresh);
      // #endregion
      if (profile?.id) {
        try {
          const allGyms = await getGyms(profile.id);
          // #region agent log
          console.log('[DEBUG-GYM] getGyms RETURNED - gymCount:', allGyms.length, 'gyms:', allGyms.map(g => g.name), 'forceRefresh:', forceRefresh);
          // #endregion
          log.debug('[Workout] Loaded gyms from DB:', allGyms.length, allGyms.map(g => ({ id: g.id, name: g.name, is_active: g.is_active })));
          
          // Deduplicate gyms by name - keep only one gym per unique name
          // Prefer the active gym, or the first one if none are active
          const uniqueGymsMap = new Map<string, Gym>();
          allGyms.forEach(gym => {
            const existing = uniqueGymsMap.get(gym.name);
            if (!existing) {
              // No gym with this name yet, add it
              uniqueGymsMap.set(gym.name, gym);
            } else if (gym.is_active && !existing.is_active) {
              // Replace with active gym if current one isn't active
              uniqueGymsMap.set(gym.name, gym);
            }
            // Otherwise keep the existing gym (already added first)
          });
          
          // Sort to ensure consistent order: active first, then alphabetical by name
          const uniqueGyms = Array.from(uniqueGymsMap.values());
          uniqueGyms.sort((a, b) => {
            if (a.is_active && !b.is_active) return -1;
            if (!a.is_active && b.is_active) return 1;
            return a.name.localeCompare(b.name);
          });
          
          log.debug('[Workout] Deduplicated gyms:', uniqueGyms.length, uniqueGyms.map(g => ({ id: g.id, name: g.name, is_active: g.is_active })));
          
          // Use the is_active flag from the database - it's already correct
          // The database sets is_active based on the profiles.active_gym_id
          // #region agent log
          console.log('[DEBUG-GYM] SETTING userGyms - count:', uniqueGyms.length, 'willShowSwitcher:', uniqueGyms.length > 1, 'gyms:', uniqueGyms.map(g => g.name));
          // #endregion
          setUserGyms(uniqueGyms);
        } catch (error) {
          console.error('[Workout] Error loading gyms:', error);
        }
      } else {
        log.debug('[Workout] No profile available, skipping gym load');
      }
    };
    loadGyms();
  }, [profile?.id, getGyms, forceRefresh]);

  // Watch forceRefresh counter to refresh workout data when global refresh is triggered
  // This ensures workout page updates after gym copy, T-path regeneration, etc.
  useEffect(() => {
    // #region agent log
    console.log('[DEBUG-GYM] forceRefresh effect TRIGGERED - forceRefresh:', forceRefresh, 'willRefresh:', forceRefresh > 0);
    // #endregion
    if (forceRefresh > 0) {
      log.debug('[Workout] forceRefresh counter changed:', forceRefresh, '- triggering workout data refresh');
      refresh();
    }
  }, [forceRefresh, refresh]);

  const handleToggleWorkout = (workoutId: string) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId);
      } else {
        newSet.add(workoutId);
      }
      return newSet;
    });
  };

  const handleStartWorkout = async (workoutId: string | null) => {
    try {
      log.debug('Starting workout with ID:', workoutId);
      await selectWorkout(workoutId);
      log.debug('Workout selected, starting session...');
      await startWorkout(new Date().toISOString());
      log.debug('Workout session started, staying inline...');
      setIsWorkoutActiveInline(true);
    } catch (error) {
      console.error('Failed to start workout:', error);
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
  };

  const handleInfoPress = (exerciseId: string) => {
    const exercise = exercisesForSession.find(ex => ex.id === exerciseId);
    if (exercise) {
      setSelectedExercise(exercise);
      setInfoModalVisible(true);
    }
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    await removeExerciseFromSession(exerciseId);
  };

  const handleSubstituteExercise = (exerciseId: string) => {
    setCurrentExerciseId(exerciseId);
    setSwapModalVisible(true);
  };

  // Helper function to get historical workout for comparison
  const getHistoricalWorkout = async (workoutName: string): Promise<any | null> => {
    if (!userId || !workoutName) return null;

    try {
      log.debug('[Workout] Fetching historical workout for:', workoutName, 'userId:', userId);
      log.debug('[Workout] getHistoricalWorkout function called');
      
      // Check if Supabase client is available
      if (!supabase) {
        console.error('[Workout] Supabase client not available');
        return null;
      }
      
      // Check if user is authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('[Workout] Auth error:', authError);
        return null;
      }
      if (!session) {
        console.error('[Workout] No active session found');
        return null;
      }
      
      // Get previous workouts of the same type from Supabase
      const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          session_date,
          duration_string,
          rating,
          set_logs (
            exercise_id,
            weight_kg,
            reps,
            is_pb
          )
        `)
        .eq('user_id', userId)
        .eq('template_name', workoutName)
        .order('session_date', { ascending: false })
        .limit(2); // Get current + previous

      if (error) {
        console.error('[Workout] Error fetching historical workouts:', error);
        console.error('[Workout] Query details - userId:', userId, 'workoutName:', workoutName);
        console.error('[Workout] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      if (!sessions) {
        log.debug('[Workout] No sessions found for historical query');
        return null;
      }
      
      // Additional validation
      if (!Array.isArray(sessions)) {
        console.error('[Workout] Invalid sessions data type:', typeof sessions);
        return null;
      }

      log.debug('[Workout] Historical sessions fetched:', sessions?.length || 0);

      if (sessions && sessions.length > 1) {
        const previousSession = sessions[1]; // Skip current session
        const previousSets = previousSession.set_logs || [];
        
        log.debug('[Workout] Previous session sets:', previousSets.length);
        
        // Group sets by exercise
        const exerciseMap = new Map();
        previousSets.forEach((set: any) => {
          if (!exerciseMap.has(set.exercise_id)) {
            exerciseMap.set(set.exercise_id, {
              exerciseId: set.exercise_id,
              exerciseName: `Exercise ${set.exercise_id?.slice(-4) || 'Ex'}`,
              sets: [],
            });
          }
          
          const exerciseData = exerciseMap.get(set.exercise_id);
          exerciseData.sets.push({
            weight: set.weight_kg?.toString() || '0',
            reps: set.reps?.toString() || '0',
            isCompleted: true,
            isPR: set.is_pb || false,
          });
        });

        const exercises = Array.from(exerciseMap.values());
        const totalVolume = exercises.flatMap(ex => ex.sets).reduce((total, set) => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps, 10) || 0;
          return total + (weight * reps);
        }, 0);

        const result = {
          exercises,
          duration: previousSession.duration_string || '45:00',
          totalVolume,
          prCount: exercises.flatMap(ex => ex.sets).filter(set => set.isPR).length,
          date: new Date(previousSession.session_date),
          workoutName: workoutName, // Include workout name for display
        };
        
        log.debug('[Workout] Historical workout result:', result);
        return result;
      } else {
        log.debug('[Workout] No historical data found - sessions:', sessions?.length || 0);
      }
    } catch (error) {
      console.error('Error getting historical workout:', error);
    }
    
    return null;
  };

  // Helper function to get weekly volume data
  const getWeeklyVolumeData = async (): Promise<any> => {
    if (!userId) return {};

    try {
      log.debug('[Workout] Fetching weekly volume data for userId:', userId);
      
      // Get the start of the current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
      const startOfWeek = new Date(now);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      log.debug('[Workout] Calculating weekly volume from:', startOfWeek.toISOString());
      
      // Fetch all workout sessions for the current week from LOCAL database
      const allSessions = await database.getWorkoutSessions(userId);
      const weekSessions = allSessions.filter(session => {
        const sessionDate = new Date(session.session_date);
        return sessionDate >= startOfWeek && sessionDate <= now;
      });
      
      log.debug('[Workout] Found', weekSessions.length, 'sessions in current week');
      
      if (weekSessions.length === 0) {
        log.debug('[Workout] No sessions found for current week');
        return {};
      }
      
      // Get all set logs for these sessions by fetching each session's logs
      const weekSetLogs: any[] = [];
      for (const session of weekSessions) {
        const sessionLogs = await database.getSetLogs(session.id);
        weekSetLogs.push(...sessionLogs);
      }
      
      log.debug('[Workout] Found', weekSetLogs.length, 'sets in current week');
      
      if (weekSetLogs.length === 0) {
        log.debug('[Workout] No set logs found for current week');
        return {};
      }
      
      // Get exercise definitions to map to muscle groups (use main_muscle, not category)
      const exerciseIds = Array.from(new Set(weekSetLogs.map(set => set.exercise_id)));
      const exerciseDefinitions = await fetchExerciseDefinitions(exerciseIds);
      
      if (!exerciseDefinitions || exerciseDefinitions.length === 0) {
        log.debug('[Workout] No exercise definitions found');
        return {};
      }
      
      // Create lookup map: exercise_id -> main_muscle
      const exerciseMuscleMap = new Map<string, string>();
      exerciseDefinitions.forEach((ex: any) => {
        if (ex.id && ex.main_muscle) {
          exerciseMuscleMap.set(ex.id, ex.main_muscle);
        }
      });
      
      log.debug('[Workout] Built exercise-to-muscle map with', exerciseMuscleMap.size, 'entries');
      
      // Calculate total volume by primary muscle for the week
      // Initialize with all canonical muscle groups (to ensure they all appear in chart)
      const canonicalMuscles = [
        'Pectorals', 'Deltoids', 'Lats', 'Traps', 'Biceps',
        'Triceps', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves',
        'Abdominals', 'Core', 'Full Body'
      ];
      const muscleVolumeMap: { [muscle: string]: number } = {};
      canonicalMuscles.forEach(muscle => {
        muscleVolumeMap[muscle] = 0;
      });
      
      weekSetLogs.forEach(set => {
        const muscleString = exerciseMuscleMap.get(set.exercise_id);
        if (!muscleString) {
          log.debug('[Workout] No muscle found for exercise:', set.exercise_id);
          return;
        }
        
        const weight = parseFloat(String(set.weight_kg || 0));
        const reps = parseInt(String(set.reps || 0), 10);
        const volume = weight * reps;
        
        if (volume > 0) {
          // Handle comma-separated muscle groups (multi-muscle exercises)
          const muscles = muscleString.split(',').map(m => m.trim());
          const volumePerMuscle = volume / muscles.length; // Distribute volume evenly
          
          muscles.forEach(muscle => {
            if (muscle && muscleVolumeMap.hasOwnProperty(muscle)) {
              muscleVolumeMap[muscle] = (muscleVolumeMap[muscle] || 0) + volumePerMuscle;
            }
          });
        }
      });
      
      log.debug('[Workout] Weekly volume by muscle:', muscleVolumeMap);
      log.debug('[Workout] Muscle groups with data:', Object.keys(muscleVolumeMap).filter(m => muscleVolumeMap[m] > 0));
      
      return muscleVolumeMap;
    } catch (error) {
      console.error('[Workout] Error getting weekly volume data:', error);
      return {};
    }
  };

  // Helper function to get next workout suggestion
  const getNextWorkoutSuggestion = async (currentWorkoutName: string): Promise<any | null> => {
    if (!userId || !activeTPath || !profile) return null;

    try {
      log.debug('[Workout] Fetching next workout suggestion for:', currentWorkoutName, 'T-path:', activeTPath.id);
      
      // Fetch recent workouts (same as useNextWorkout hook)
      const recentWorkouts = await database.getRecentWorkoutSummaries(userId, 50);
      
      // Fetch T-Path workouts (children of active T-Path)
      const rawTPathWorkouts = await database.getTPathsByParent(activeTPath.id);
      
      // Deduplicate by template_name
      const uniqueTPathWorkoutsMap = new Map<string, typeof rawTPathWorkouts[0]>();
      rawTPathWorkouts.forEach(workout => {
        const normalizedName = workout.template_name?.trim().toLowerCase();
        if (normalizedName && !uniqueTPathWorkoutsMap.has(normalizedName)) {
          uniqueTPathWorkoutsMap.set(normalizedName, workout);
        }
      });
      const tPathWorkouts = Array.from(uniqueTPathWorkoutsMap.values());
      
      // Calculate week boundaries (same as useNextWorkout hook)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(now.getDate() - daysToSubtract);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      // Filter to current week and sort by date descending
      const currentWeekWorkouts = recentWorkouts
        .filter(({ session }) => {
          const workoutDate = new Date(session.completed_at || session.session_date);
          return workoutDate >= startOfWeek && workoutDate <= endOfWeek;
        })
        .sort((a, b) => {
          const dateA = new Date(a.session.completed_at || a.session.session_date);
          const dateB = new Date(b.session.completed_at || b.session.session_date);
          return dateB.getTime() - dateA.getTime();
        });
      
      // Deduplicate by workout type
      const workoutTypeMap = new Map<string, typeof recentWorkouts[0]>();
      currentWeekWorkouts.forEach((workout) => {
        const workoutType = workout.session.template_name?.toLowerCase() || 'ad-hoc';
        if (!workoutTypeMap.has(workoutType)) {
          workoutTypeMap.set(workoutType, workout);
        }
      });
      
      const uniqueWorkouts = Array.from(workoutTypeMap.values());
      const completedWorkoutsThisWeek = uniqueWorkouts.map(({ session }) => ({
        id: session.id,
        name: session.template_name ?? 'Ad Hoc',
        sessionId: session.id,
      }));

      // Use WeeklyWorkoutAnalyzer (same as dashboard)
      const programmeType = profile.programme_type || 'ppl';
      const nextWorkout = WeeklyWorkoutAnalyzer.determineNextWorkoutWeeklyAware(
        programmeType,
        recentWorkouts.map(w => ({
          session: w.session,
          exercise_count: w.exercise_count,
          first_set_at: null,
          last_set_at: null,
        })),
        tPathWorkouts,
        completedWorkoutsThisWeek
      );

      if (!nextWorkout) return null;

      // Calculate ideal next workout date (2 days from now)
      const idealDate = new Date();
      idealDate.setDate(idealDate.getDate() + 2);

      const result = {
        name: nextWorkout.template_name,
        idealDate,
      };
      
      log.debug('[Workout] Next workout suggestion result:', result);
      return result;
    } catch (error) {
      console.error('Error getting next workout suggestion:', error);
      return null;
    }
  };

  const getModalExercises = () => {
    return exercisesForSession
      .filter(exercise => exercise.id)
      .map(exercise => {
        const sets = exercisesWithSets[exercise.id!] || [];
        const modalSets = sets
          .filter(set => set.isSaved)
          .map(set => ({
            weight: set.weight_kg?.toString() || '0',
            reps: set.reps?.toString() || '0',
            isCompleted: set.isSaved,
            isPR: set.isPR,
          }));

        const result: any = {
          exerciseId: exercise.id!,
          exerciseName: exercise.name,
          sets: modalSets,
          iconUrl: (exercise as any).icon_url,
        };

        // Helper function to map exercise names to muscle groups
        const getMuscleGroupFromExercise = (ex: any): string => {
          const name = (ex?.name || '').toLowerCase();
          
          // Chest exercises
          if (name.includes('bench') || name.includes('press') || name.includes('fly') ||
              name.includes('push up') || name.includes('dip') || name.includes('pec')) {
            return 'Chest';
          }
          
          // Back exercises
          if (name.includes('row') || name.includes('pull') || name.includes('lat') ||
              name.includes('deadlift') || name.includes('shrug') || name.includes('face pull')) {
            return 'Back';
          }
          
          // Legs exercises
          if (name.includes('squat') || name.includes('lunge') || name.includes('leg') ||
              name.includes('deadlift') || name.includes('hip') || name.includes('calf')) {
            return 'Legs';
          }
          
          // Shoulders exercises
          if (name.includes('shoulder') || name.includes('overhead') || name.includes('raise') ||
              name.includes('arnold') || name.includes('upright')) {
            return 'Shoulders';
          }
          
          // Arms exercises
          if (name.includes('curl') || name.includes('extension') || name.includes('tricep') ||
              name.includes('bicep') || name.includes('hammer')) {
            return 'Arms';
          }
          
          // Core exercises
          if (name.includes('crunch') || name.includes('plank') || name.includes('sit') ||
              name.includes('leg raise') || name.includes('Russian twist')) {
            return 'Core';
          }
          
          // Default to Unknown if we can't determine
          return 'Unknown';
        };

        result.muscleGroup = getMuscleGroupFromExercise(exercise);
        return result;
      })
      .filter(exercise => exercise.sets.length > 0);
  };

  const handleSaveWorkout = async (rating?: number) => {
        log.debug('[Workout] handleSaveWorkout called with rating:', rating);
    
    // CRITICAL: Capture sessionId BEFORE clearing summaryModalData
    const sessionIdToUse = summaryModalData?.sessionId;
    
    // CRITICAL FIX: Close modal immediately before any other operations
    // This prevents the modal from reappearing on dashboard
    summaryModalWasClosedRef.current = true;
    setSummaryModalVisible(false);
    setSummaryModalData({
      exercises: [],
      workoutName: '',
      startTime: new Date(),
    });
    
    // If a rating was provided, save it before navigating away
    // Note: Rating should already be saved by handleSaveRating in the modal,
    // but we check here as a fallback in case it wasn't
    if (rating && rating > 0 && sessionIdToUse) {
      log.debug('[Workout] Saving rating via handleSaveWorkout (fallback):', rating, 'sessionId:', sessionIdToUse);
      await handleRateWorkout(rating, sessionIdToUse);
    } else {
      log.debug('[Workout] Skipping rating save - missing data or already saved:', { rating, sessionId: sessionIdToUse });
    }
    
    // CRITICAL FIX: Clear auto-select flags before navigation so auto-select works on return
    setHasJustReset(false);
    setUserHasSelectedWorkout(false);
    
    // CRITICAL FIX: Ensure lastWorkoutCompletionTime is set BEFORE navigation
    // This ensures dashboard focus effect detects recent completion
    const completionTime = Date.now();
    setLastWorkoutCompletionTime(completionTime);
    setShouldRefreshDashboard(true);
        log.debug('[Workout] Set lastWorkoutCompletionTime and shouldRefreshDashboard before navigation');
    
    // Trigger dashboard refresh before navigation
    try {
            log.debug('[Workout] Triggering dashboard refresh before navigation');
      // Use the data context's handleWorkoutCompletion method if available
      // This will set the shouldRefreshDashboard flag and lastWorkoutCompletionTime
      if (typeof (global as any).triggerDashboardRefresh === 'function') {
        (global as any).triggerDashboardRefresh();
        log.debug('[Workout] Global triggerDashboardRefresh called successfully');
      }
      
      // CRITICAL FIX: Wait for state updates to propagate before navigating
      // This ensures the dashboard's useFocusEffect sees the updated state
      await new Promise(resolve => setTimeout(resolve, 200));
      log.debug('[Workout] State update delay complete, now navigating to dashboard');
    } catch (error) {
      console.warn('[Workout] Failed to trigger dashboard refresh:', error);
    }
    
        router.replace('/(tabs)/dashboard');
  };

  const handleRateWorkout = async (rating: number, sessionId?: string) => {
    const targetSessionId = sessionId || currentSessionId;
    if (!targetSessionId || !userId) {
      log.debug('[Workout] handleRateWorkout - missing sessionId or userId:', { targetSessionId, userId });
      return;
    }

    try {
      log.debug('[Workout] handleRateWorkout called with rating:', rating, 'sessionId:', targetSessionId);
      
      // Use direct database lookup to ensure we get the session data regardless of cache state
      const existingSession = await database.getWorkoutSessionById(targetSessionId);
      
      log.debug('[Workout] Found existing session:', !!existingSession);
      log.debug('[Workout] Existing session rating:', existingSession?.rating);
      
      if (existingSession) {
        // Update the session with the rating, preserving the original duration
        const updatedSession = {
          ...existingSession,
          rating,
          // Ensure the session is marked as completed
          completed_at: existingSession.completed_at || new Date().toISOString(),
          // Preserve the original duration string to fix regression
          duration_string: existingSession.duration_string || '00:00'
        };
        log.debug('[Workout] Updated session data:', updatedSession);
        await database.addWorkoutSession(updatedSession);
        await addToSyncQueue('update', 'workout_sessions', updatedSession);
        log.debug('[Workout] Rating saved successfully for session:', targetSessionId);
      } else {
        // Session doesn't exist yet, create it with the rating
        // Calculate duration from session start time if available
        const now = new Date();
        const startTime = sessionStartTime ? new Date(sessionStartTime) : now;
        const durationMs = now.getTime() - startTime.getTime();
        const durationSeconds = Math.round(durationMs / 1000);
        
        // Format duration as "X seconds" for consistency
        let durationString = '00:00';
        if (durationSeconds < 60) {
          durationString = `${durationSeconds} seconds`;
        } else if (durationSeconds < 3600) {
          const minutes = Math.floor(durationSeconds / 60);
          const seconds = durationSeconds % 60;
          durationString = `${minutes}m ${seconds}s`;
        } else {
          const hours = Math.floor(durationSeconds / 3600);
          const minutes = Math.floor((durationSeconds % 3600) / 60);
          durationString = `${hours}h ${minutes}m`;
        }
        
        const newSession = {
          id: targetSessionId,
          user_id: userId,
          session_date: startTime.toISOString(),
          template_name: activeWorkout?.template_name || 'Workout',
          rating: rating,
          created_at: startTime.toISOString(),
          completed_at: now.toISOString(),
          duration_string: durationString,
          t_path_id: activeTPath?.id || null,
          sync_status: 'local_only'
        };
        log.debug('[Workout] Creating new session with rating:', newSession);
        await database.addWorkoutSession(newSession);
        await addToSyncQueue('create', 'workout_sessions', newSession);
        log.debug('[Workout] Rating saved successfully for new session:', targetSessionId);
      }
      
      // Verify the rating was saved correctly using direct lookup
      const verifySession = await database.getWorkoutSessionById(targetSessionId);
      log.debug('[Workout] Verification - session rating after save:', verifySession?.rating);
      
    } catch (error) {
      console.error('Error saving rating:', error);
      Alert.alert('Error', 'Failed to save rating. Please try again.');
    }
  };

  const handleSummaryModalClose = useCallback(() => {
        // ENFORCEMENT: Immediately mark as closed and clear data
    summaryModalWasClosedRef.current = true;
    setSummaryModalVisible(false);
    // Clear summary modal data to prevent it from reappearing
    setSummaryModalData({
      exercises: [],
      workoutName: '',
      startTime: new Date(),
    });
    
    // CRITICAL FIX: Clear auto-select flags immediately when modal closes so auto-select can run
    setHasJustReset(false);
    setUserHasSelectedWorkout(false);
        
    log.debug('[WorkoutScreen] ENFORCEMENT: Summary modal closed, preventing reappearance');
  }, [summaryModalVisible, summaryModalData]);

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Start Workout" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Start Workout" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load workouts</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <BackgroundRoot />
        <View style={styles.innerContainer}>
          <View style={{ flex: 1 }}>
            {/* Animated loading indicator when refreshing */}
            {refreshing && (
              <Animated.View
                style={[
                  styles.refreshingIndicator,
                  {
                    transform: [{ translateY: indicatorTranslateY }],
                    opacity: indicatorOpacity,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={Colors.primary} />
              </Animated.View>
            )}
            
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >

              <View style={{flex: 1}}>
                <ScreenHeader
                  title="Start Workout"
                  style={{
                    backgroundColor: 'transparent',
                    borderBottomColor: 'transparent',
                  }}
                />

                <View style={styles.descriptionContainer}>
                  <Text style={[styles.descriptionText, { textAlign: 'center' }]}>
                    Select a workout or start an ad-hoc session
                  </Text>
                </View>

              {/* Gym Toggle */}
              {userGyms.length > 1 && (
                <View style={styles.gymToggleContainer}>
                  <GymToggle
                    gyms={userGyms}
                    activeGym={userGyms.find(g => g.is_active) || null}
                    onGymChange={async (gymId, newActiveGym) => {
                      console.log('[Workout] ===== GYM CHANGE HANDLER CALLED =====');
                      console.log('[Workout] Gym ID:', gymId, 'Gym Name:', newActiveGym?.name);
                      console.log('[Workout] Current selected workout:', selectedWorkout);
                      console.log('[Workout] Preserved workout name:', manuallySelectedWorkoutNameRef.current);
                      console.log('[Workout] User has selected workout:', userHasSelectedWorkout);
                      
                      // Set flag to prevent cleanup effect from running during gym change
                      console.log('[Workout] Setting isGymChangeInProgressRef = true');
                      isGymChangeInProgressRef.current = true;
                      console.log('[Workout] isGymChangeInProgressRef.current is now:', isGymChangeInProgressRef.current);
                      
                      // Save current workout selection to preserve across gym toggle
                      // This works for BOTH auto-selected and manually selected workouts
                      const workoutNameToPreserve = manuallySelectedWorkoutNameRef.current;
                      const shouldPreserveSelection = userHasSelectedWorkout && workoutNameToPreserve;
                      
                      console.log('[Workout] Should preserve selection:', shouldPreserveSelection);
                      
                      // Clear selected workout ID (but preserve the workout name in ref for re-selection)
                      console.log('[Workout] Gym change handler: Clearing selectedWorkout (expected)');
                      setSelectedWorkout(null);
                      setIsWorkoutActiveInline(false);
                      resetWorkoutSession();
                      
                      // Keep the preserved workout name and flag if we have a selection to preserve
                      // Otherwise clear them to allow fresh auto-select
                      if (!shouldPreserveSelection) {
                        console.log('[Workout] No selection to preserve, clearing refs');
                        setUserHasSelectedWorkout(false);
                        manuallySelectedWorkoutNameRef.current = null;
                      } else {
                        console.log('[Workout] Preserving workout selection:', workoutNameToPreserve);
                      }
                      
                      try {
                        if (profile?.id && userId) {
                          // Call the edge function to switch active gym, which also updates active_t_path_id
                          const { data, error } = await supabase.functions.invoke('switch-active-gym', {
                            body: { gymId },
                          });

                          if (error) {
                            throw new Error(error.message || 'Failed to switch active gym');
                          }
                          
                                                    
                          log.debug('[Workout] Active gym switched via edge function');
                          
                          // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
                          setUserGyms(prev => {
                            const updated = prev.map(g => ({
                              ...g,
                              is_active: g.id === gymId
                            }));
                            log.debug('[Workout] Optimistically updated local gym state:', updated.map(g => ({ id: g.id, name: g.name, is_active: g.is_active })));
                            return updated;
                          });
                          
                          // Run background operations in parallel (don't block UI)
                          Promise.all([
                            // Update local database
                            setActiveGym(profile.id, gymId),
                            // Fetch updated profile (for cache invalidation)
                            supabase
                              .from('profiles')
                              .select('active_t_path_id, active_gym_id')
                              .eq('id', userId)
                              .maybeSingle(),
                            // Reload gyms from database
                            getGyms(profile.id)
                          ]).then(([_, updatedProfile, allUpdatedGyms]) => {
                                                        
                            // Deduplicate gyms by name - same logic as loadGyms
                            const uniqueGymsMap = new Map<string, Gym>();
                            allUpdatedGyms.forEach(gym => {
                              const existing = uniqueGymsMap.get(gym.name);
                              if (!existing) {
                                uniqueGymsMap.set(gym.name, gym);
                              } else if (gym.is_active && !existing.is_active) {
                                uniqueGymsMap.set(gym.name, gym);
                              }
                            });
                            
                            // Sort to ensure consistent order: active first, then alphabetical
                            const uniqueGyms = Array.from(uniqueGymsMap.values());
                            const gymsWithActive = uniqueGyms.map(gym => ({
                              ...gym,
                              is_active: gym.id === gymId
                            }));
                            
                            // Sort to ensure consistent order: active first, then alphabetical by name
                            gymsWithActive.sort((a, b) => {
                              if (a.is_active && !b.is_active) return -1;
                              if (!a.is_active && b.is_active) return 1;
                              return a.name.localeCompare(b.name);
                            });
                            
                            log.debug('[Workout] Reloaded gyms:', gymsWithActive.map(g => ({ id: g.id, name: g.name, is_active: g.is_active })));
                            setUserGyms(gymsWithActive);
                          }).catch(error => {
                            console.error('[Workout] Error in background gym update:', error);
                            // On error, still invalidate caches to force refresh
                          });
                          
                          // Invalidate caches in background (don't block UI)
                          invalidateAllCaches();
                          // DON'T call setShouldRefreshDashboard(true) here!
                          // The gym change handler already handles data refresh via refresh() in background
                          // Calling this triggers a duplicate refresh that clears selectedWorkout AFTER we just set it
                          
                          // Refresh workout data in background (don't block UI)
                          log.debug('[Workout] Refreshing workout data for new gym...');
                                                    refresh().then(() => {
                            console.log('[Workout] ✓ refresh() completed - selectedWorkout:', selectedWorkout, 'activeTPath:', activeTPath?.id, 'profile.active_t_path_id:', profile?.active_t_path_id, 'childWorkouts:', childWorkouts.length, 'lastTPathIdRef:', lastTPathIdRef.current);
                            // Clear gym change flag after refresh completes
                            console.log('[Workout] Clearing isGymChangeInProgressRef = false (after refresh completes)');
                            isGymChangeInProgressRef.current = false;
                            console.log('[Workout] isGymChangeInProgressRef.current is now:', isGymChangeInProgressRef.current);
                            console.log('[Workout] After refresh complete - checking if selectedWorkout is still set:', selectedWorkout);
                                                      }).catch(error => {
                            console.error('[Workout] Error refreshing workout data:', error);
                            // Clear flag even on error
                            console.log('[Workout] Clearing isGymChangeInProgressRef = false (on refresh error)');
                            isGymChangeInProgressRef.current = false;
                            console.log('[Workout] isGymChangeInProgressRef.current is now:', isGymChangeInProgressRef.current);
                                                      });
                          
                          log.debug('[Workout] onGymChange complete');
                        } else {
                          log.debug('[Workout] No profile ID or userId available');
                        }
                      } catch (error: any) {
                        console.error('[Workout] Error changing active gym:', error);
                        // Clear flag on error
                        console.log('[Workout] Clearing isGymChangeInProgressRef = false (on gym change error)');
                        isGymChangeInProgressRef.current = false;
                        console.log('[Workout] isGymChangeInProgressRef.current is now:', isGymChangeInProgressRef.current);
                                                Alert.alert('Error', error.message || 'Failed to switch active gym');
                      }
                    }}
                  />
                </View>
              )}

              {activeTPath && (
                <View style={styles.programHeader}>
                  <Dumbbell size={20} color={Colors.foreground} />
                  <Text style={[styles.programTitle, { textAlign: 'center' }]}>{activeTPath.template_name}</Text>
                </View>
              )}

              {/* Program Workouts Section - Always render to prevent unmounting/remounting */}
              <View style={styles.workoutsScroll}>
                {childWorkouts.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={scrollViewContentStyle}
                  >
                    {workoutPills}
                    <WorkoutPill
                      key="ad-hoc"
                      id="ad-hoc"
                      title="Ad-hoc"
                      category="ad-hoc"
                      completedAt={null}
                      isSelected={selectedWorkout === 'ad-hoc'}
                      onClick={handleAdHocClick}
                    />
                  </ScrollView>
                )}
              </View>

              {/* Workout Controls */}
              {(isWorkoutActiveInline && selectedWorkout) || loadingExercises || (childWorkouts.length > 0 && !selectedWorkout && !activeWorkout) ? (
                <View style={styles.contentArea}>
                  {loadingExercises || (!selectedWorkout && childWorkouts.length > 0) ? (
                    <View style={styles.loadingExercisesContainer}>
                      <Text style={styles.loadingExercisesText}>Loading workout...</Text>
                    </View>
                  ) : (
                    <>
                      {selectedWorkout && (
                        <View style={styles.workoutTitleContainer}>
                          <WorkoutPill
                            id={selectedWorkout}
                            title={(() => {
                              const workout = childWorkouts.find(w => w.id === selectedWorkout);
                              const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');
                              const workoutName = activeWorkout?.template_name || workout?.template_name || 'Workout';
                              return getWorkoutDisplayName(workoutName, isUpperLowerSplit);
                            })()}
                            category={(() => {
                              const workout = childWorkouts.find(w => w.id === selectedWorkout);
                              if (workout) {
                                const lowerTitle = workout.template_name.toLowerCase();
                                const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');

                                if (isUpperLowerSplit) {
                                  if (lowerTitle.includes('upper')) return 'upper';
                                  else if (lowerTitle.includes('lower')) return 'lower';
                                } else {
                                  if (lowerTitle.includes('push')) return 'push';
                                  else if (lowerTitle.includes('pull')) return 'pull';
                                  else if (lowerTitle.includes('legs')) return 'legs';
                                }
                              }
                              return 'push';
                            })()}
                            completedAt={null}
                            isSelected={true}
                            onClick={() => {}}
                            hideLastCompleted={true}
                          />
                        </View>
                      )}

                      {exercisesForSession.length > 0 && (
                        <View style={styles.exercisesList}>
                          {exercisesForSession.map((exercise, index) => {
                            const exerciseSets = exercisesWithSets[exercise.id!] || [];
                            return (
                              <ExerciseCard
                                key={exercise.id!}
                                exercise={{
                                  id: exercise.id!,
                                  name: exercise.name || 'Unknown Exercise',
                                  main_muscle: exercise.main_muscle || 'Unknown',
                                  type: exercise.type || 'Unknown',
                                  category: exercise.category,
                                  description: exercise.description,
                                  pro_tip: exercise.pro_tip,
                                  video_url: exercise.video_url,
                                  equipment: exercise.equipment,
                                  user_id: null,
                                  library_id: null,
                                  created_at: exercise.created_at,
                                  is_favorite: null,
                                  icon_url: (exercise as any).icon_url || null,
                                  is_bonus_exercise: exercise.is_bonus_exercise || false,
                                }}
                                sets={exerciseSets}
                                exerciseNumber={index + 1}
                                templateName={activeWorkout?.template_name || null}
                                accentColor={(() => {
                                  const workout = childWorkouts.find(w => w.id === selectedWorkout);
                                  if (workout && workout.template_name) {
                                    const colors = getWorkoutColor(workout.template_name);
                                    return colors.main;
                                  }
                                  // Fallback for ad-hoc workouts
                                  if (selectedWorkout === 'ad-hoc') {
                                    const colors = getWorkoutColor('Ad Hoc Workout');
                                    return colors.main;
                                  }
                                  return undefined;
                                })()}
                                onInfoPress={() => handleInfoPress(exercise.id!)}
                                onRemoveExercise={() => handleRemoveExercise(exercise.id!)}
                                onSubstituteExercise={() => handleSubstituteExercise(exercise.id!)}
                                onExerciseSaved={(exerciseName, setCount) => {}}
                              />
                            );
                          })}
                        </View>
                      )}

                      <View style={styles.workoutActionButtons}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.cancelWorkoutButton,
                            pressed && styles.cancelWorkoutButtonPressed,
                          ]}
                          onPress={() => {
                            Alert.alert(
                              'Cancel Workout',
                              'Are you sure you want to cancel this workout? All progress will be lost.',
                              [
                                { text: 'Keep Working', style: 'cancel' },
                                {
                                  text: 'Cancel Workout',
                                  style: 'destructive',
                                  onPress: async () => {
                                    // Clean up incomplete workout session from database
                                    await resetWorkoutSession();
                                    setIsWorkoutActiveInline(false);
                                    setSelectedWorkout(null);
                                  }
                                },
                              ]
                            );
                          }}
                        >
                          <Text style={styles.cancelWorkoutText}>Cancel Workout</Text>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.cancelWorkoutButton,
                            { backgroundColor: Colors.primary },
                            pressed && styles.cancelWorkoutButtonPressed,
                          ]}
                          onPress={async () => {
                            const sessionId = await finishWorkout();
                            if (sessionId && userId) {
                              // CRITICAL FIX: Reset the modal closed flag at the start of each workout completion
                              // This ensures the summary modal always shows for every completed workout
                              summaryModalWasClosedRef.current = false;
                              
                              // Fetch the completed session data to get duration and rating
                              const sessions = await database.getWorkoutSessions(userId);
                              const completedSession = sessions.find(s => s.id === sessionId);

                              const modalExercises = getModalExercises();
                              const workoutName = activeWorkout?.template_name || 'Workout';
                              const startTime = sessionStartTime || new Date();

                              // Fetch the current session's rating for historical display
                              const currentSessionRating = completedSession?.rating || 0;

                              // Fetch all required data for advanced features
                              log.debug('[Workout] Fetching advanced modal data...');
                              
                              // First, verify Supabase is working
                              try {
                                const { data: { session }, error: authError } = await supabase.auth.getSession();
                                log.debug('[Workout] Supabase auth check:', { hasSession: !!session, authError });
                                
                                if (authError) {
                                  console.error('[Workout] Auth error:', authError);
                                  return;
                                }
                                if (!session) {
                                  console.error('[Workout] No active session found');
                                  return;
                                }
                              } catch (authCheckError) {
                                console.error('[Workout] Auth check failed:', authCheckError);
                                return;
                              }
                              
                              log.debug('[Workout] Starting data fetch calls...');
                              
                              // Call each function individually to see which one fails
                              log.debug('[Workout] Calling getHistoricalWorkout...');
                              const historicalWorkout = await getHistoricalWorkout(workoutName);
                              log.debug('[Workout] getHistoricalWorkout result:', !!historicalWorkout);
                              
                              log.debug('[Workout] Calling getWeeklyVolumeData...');
                              const weeklyVolumeData = await getWeeklyVolumeData();
                              log.debug('[Workout] getWeeklyVolumeData result:', Object.keys(weeklyVolumeData || {}));
                              
                              // Extract all muscle groups that have volume data
                              const allAvailableMuscleGroups = Object.keys(weeklyVolumeData || {});
                              
                              log.debug('[Workout] Calling getNextWorkoutSuggestion...');
                              const nextWorkoutSuggestion = await getNextWorkoutSuggestion(workoutName);
                              log.debug('[Workout] getNextWorkoutSuggestion result:', !!nextWorkoutSuggestion);
                              
                              log.debug('[Workout] Data fetch completed, results:', {
                                historicalWorkout: !!historicalWorkout,
                                weeklyVolumeData: Object.keys(weeklyVolumeData || {}),
                                allAvailableMuscleGroups: allAvailableMuscleGroups,
                                nextWorkoutSuggestion: !!nextWorkoutSuggestion
                              });

                              log.debug('[Workout] Historical workout:', historicalWorkout ? 'Found' : 'Not found');
                              log.debug('[Workout] Weekly volume data keys:', Object.keys(weeklyVolumeData || {}));
                              log.debug('[Workout] Weekly volume data:', weeklyVolumeData);
                              log.debug('[Workout] All available muscle groups:', allAvailableMuscleGroups);
                              log.debug('[Workout] Next workout suggestion:', nextWorkoutSuggestion?.name || 'Not found');
                              log.debug('[Workout] Next workout suggestion data:', nextWorkoutSuggestion);
                              log.debug('[Workout] isOnTPath:', !!activeTPath);

                              // Debug: Check if any data was actually fetched
                              const hasData = !!historicalWorkout || Object.keys(weeklyVolumeData || {}).length > 0 || !!nextWorkoutSuggestion;
                              log.debug('[Workout] Data fetch result - hasData:', hasData);
                              log.debug('[Workout] Historical workout details:', historicalWorkout);
                              log.debug('[Workout] Weekly volume data details:', weeklyVolumeData);
                              log.debug('[Workout] Next workout suggestion details:', nextWorkoutSuggestion);

                              // Debug: Log the data being passed to modal
                              log.debug('[Workout] Setting modal data with:', {
                                exercisesCount: modalExercises.length,
                                workoutName,
                                historicalWorkout: !!historicalWorkout,
                                weeklyVolumeData: Object.keys(weeklyVolumeData || {}),
                                allAvailableMuscleGroups: allAvailableMuscleGroups,
                                nextWorkoutSuggestion: !!nextWorkoutSuggestion,
                                isOnTPath: !!activeTPath,
                              });

                              // Set modal data and show modal - always show for completed workouts
                              setSummaryModalData({
                                exercises: modalExercises,
                                workoutName,
                                startTime,
                                duration: completedSession?.duration_string || undefined,
                                historicalWorkout,
                                weeklyVolumeData,
                                allAvailableMuscleGroups,
                                nextWorkoutSuggestion,
                                isOnTPath: !!activeTPath,
                                historicalRating: currentSessionRating,
                                sessionId: sessionId, // Store session ID for rating saves
                              });
                              
                              log.debug('[Workout] Modal data set, showing modal...');
                              
                              // Reset workout session AFTER setting modal data to prevent race conditions
                              await resetWorkoutSession();
                              setIsWorkoutActiveInline(false);
                              
                              // CRITICAL FIX: Clear auto-select flags immediately so auto-select works after modal closes
                              setHasJustReset(false);
                              setUserHasSelectedWorkout(false);
                              
                              // Set modal visible immediately - don't use setTimeout to avoid race conditions
                              setSummaryModalVisible(true);
                              log.debug('[WorkoutScreen] Showing summary modal for completed workout');
                            }
                          }}
                        >
                          <Text style={[styles.cancelWorkoutText, { color: Colors.white }]}>Finish Workout</Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              ) : null}

              {/* Ad-hoc Workouts Section */}
              {adhocWorkouts.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Ad-hoc Workouts</Text>
                  </View>
                  {adhocWorkouts.map((workout) => {
                    const exercises = workoutExercisesCache[workout.id] || [];
                    const isExpanded = expandedWorkouts.has(workout.id);

                    return (
                      <WorkoutItem
                        key={workout.id}
                        workout={workout}
                        exercises={exercises}
                        isExpanded={isExpanded}
                        onToggle={() => handleToggleWorkout(workout.id)}
                        onStartWorkout={() => handleStartWorkout(workout.id)}
                      />
                    );
                  })}
                </>
              )}

              {/* Empty State */}
              {childWorkouts.length === 0 && adhocWorkouts.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No workouts available</Text>
                  <Text style={styles.emptySubtext}>
                    Create your first workout program to get started
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
          </View>
        </View>
      </View>

      {/* Modals */}
      <ExerciseInfoModal
        exercise={selectedExercise}
        visible={infoModalVisible}
        onClose={() => {
          setInfoModalVisible(false);
          setSelectedExercise(null);
        }}
      />

      <ExerciseSwapModal
        visible={swapModalVisible}
        onClose={() => {
          setSwapModalVisible(false);
          setCurrentExerciseId('');
        }}
        onSelectExercise={async (newExercise) => {
          if (currentExerciseId) {
            await substituteExercise(currentExerciseId, newExercise);
          }
          setSwapModalVisible(false);
          setCurrentExerciseId('');
        }}
        currentExerciseId={currentExerciseId}
      />

      {completedExercises.size > 0 && (
        <WorkoutProgressBar
          exercisesForSession={exercisesForSession}
          completedExercises={completedExercises}
          isWorkoutSessionStarted={!!currentSessionId}
          activeWorkout={activeWorkout}
        />
      )}

      <WorkoutSummaryModal
        visible={summaryModalVisible && !summaryModalWasClosedRef.current && summaryModalData?.exercises && summaryModalData.exercises.length > 0}
        onClose={() => {
                    handleSummaryModalClose();
        }}
        exercises={summaryModalData?.exercises || []}
        workoutName={summaryModalData?.workoutName || 'Workout'}
        startTime={summaryModalData?.startTime || new Date()}
        {...(summaryModalData?.duration && { duration: summaryModalData.duration })}
        {...(summaryModalData?.historicalWorkout && { historicalWorkout: summaryModalData.historicalWorkout })}
        {...(summaryModalData?.weeklyVolumeData && { weeklyVolumeData: summaryModalData.weeklyVolumeData })}
        {...(summaryModalData?.allAvailableMuscleGroups && { allAvailableMuscleGroups: summaryModalData.allAvailableMuscleGroups })}
        {...(summaryModalData?.nextWorkoutSuggestion && { nextWorkoutSuggestion: summaryModalData.nextWorkoutSuggestion })}
        {...(summaryModalData?.isOnTPath !== undefined && { isOnTPath: summaryModalData.isOnTPath })}
        {...(summaryModalData?.historicalRating !== undefined && { historicalRating: summaryModalData.historicalRating })}
        {...(summaryModalData?.sessionId && { sessionId: summaryModalData.sessionId })}
        onSaveWorkout={handleSaveWorkout}
        onRateWorkout={handleRateWorkout}
      />

      {/* Resume Workout Dialog */}
      <Modal
        visible={showResumeDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowResumeDialog(false)}
      >
        <View style={styles.resumeDialogOverlay}>
          <View style={styles.resumeDialogContainer}>
            <Text style={styles.resumeDialogTitle}>Resume Workout?</Text>
            <Text style={styles.resumeDialogMessage}>
              You have an unfinished workout: {savedWorkoutState?.activeWorkout?.template_name || 'Workout'}
            </Text>
            <Text style={styles.resumeDialogSubtext}>
              Would you like to resume where you left off?
            </Text>
            
            <View style={styles.resumeDialogButtons}>
              <Pressable
                style={[styles.resumeDialogButton, styles.resumeDialogButtonPrimary]}
                onPress={async () => {
                  if (savedWorkoutState) {
                    await resumeWorkout(savedWorkoutState);
                    setShowResumeDialog(false);
                    setSavedWorkoutState(null);
                  }
                }}
              >
                <Text style={styles.resumeDialogButtonTextPrimary}>Resume Workout</Text>
              </Pressable>
              
              <Pressable
                style={[styles.resumeDialogButton, styles.resumeDialogButtonSecondary]}
                onPress={async () => {
                  if (userId) {
                    const { clearWorkoutState } = await import('../../lib/workoutStorage');
                    await clearWorkoutState(userId);
                  }
                  setShowResumeDialog(false);
                  setSavedWorkoutState(null);
                }}
              >
                <Text style={styles.resumeDialogButtonTextSecondary}>Start New Workout</Text>
              </Pressable>
              
              <Pressable
                style={[styles.resumeDialogButton, styles.resumeDialogButtonTertiary]}
                onPress={async () => {
                  if (userId) {
                    const { clearWorkoutState } = await import('../../lib/workoutStorage');
                    await clearWorkoutState(userId);
                  }
                  setShowResumeDialog(false);
                  setSavedWorkoutState(null);
                }}
              >
                <Text style={styles.resumeDialogButtonTextTertiary}>Discard</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginTop: Spacing.md,
  },
  refreshingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    marginBottom: Spacing.sm,
  },
  errorSubtext: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  programTitle: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  sectionTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 120,
  },
  workoutItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  workoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutName: {
    ...TextStyles.h4,
    color: Colors.foreground,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  exerciseCount: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  exercisesContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.lg,
  },
  exercisePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '500',
  },
  exerciseMuscle: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  exerciseTarget: {
    alignItems: 'flex-end',
  },
  targetText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'right',
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    minHeight: 48,
  },
  startWorkoutButtonPressed: {
    backgroundColor: Colors.primary,
    opacity: 0.8,
  },
  startWorkoutText: {
    ...TextStyles.button,
    color: Colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 280,
  },
  adHocContainer: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  adHocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  adHocButtonPressed: {
    backgroundColor: Colors.muted,
  },
  adHocButtonText: {
    ...TextStyles.button,
    color: Colors.foreground,
    fontWeight: '600',
  },
  descriptionContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  descriptionText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  gymToggleContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  resumeDialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeDialogContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.xl,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resumeDialogTitle: {
    ...TextStyles.h3,
    color: Colors.foreground,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  resumeDialogMessage: {
    ...TextStyles.body,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  resumeDialogSubtext: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  resumeDialogButtons: {
    gap: Spacing.md,
  },
  resumeDialogButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeDialogButtonPrimary: {
    backgroundColor: Colors.actionPrimary,
  },
  resumeDialogButtonSecondary: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resumeDialogButtonTertiary: {
    backgroundColor: 'transparent',
  },
  resumeDialogButtonTextPrimary: {
    ...TextStyles.button,
    color: Colors.white,
    fontWeight: '600',
  },
  resumeDialogButtonTextSecondary: {
    ...TextStyles.button,
    color: Colors.foreground,
    fontWeight: '600',
  },
  resumeDialogButtonTextTertiary: {
    ...TextStyles.button,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  workoutButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingLeft: 0,
    paddingRight: Spacing.xl * 3,
    paddingVertical: Spacing.sm,
  },
  workoutButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  workoutButtonSelected: {
    opacity: 0.8,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  workoutButtonPressed: {
    opacity: 0.7,
  },
  workoutButtonText: {
    ...TextStyles.button,
    color: Colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedWorkoutContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedWorkoutTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  contentArea: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginHorizontal: Spacing.sm,
    marginTop: 0,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contentTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  workoutListContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  exerciseCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  exerciseHeader: {
    padding: Spacing.lg,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.lg,
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
  exercisesList: {
    paddingBottom: Spacing.xl,
  },
  workoutControls: {
    marginTop: Spacing.lg,
  },
  startWorkoutContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  workoutActionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  cancelWorkoutButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mutedForeground,
    backgroundColor: Colors.secondary,
    minHeight: 48,
  },
  cancelWorkoutButtonPressed: {
    backgroundColor: Colors.muted,
  },
  cancelWorkoutText: {
    ...TextStyles.button,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
  workoutsScroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 0,
  },
  noExercisesText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  workoutTitleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  loadingExercisesContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingExercisesText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
