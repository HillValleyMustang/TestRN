/**
 * useWorkoutSelection
 * Encapsulates all workout selection state, refs, and logic
 * extracted from the WorkoutLauncherScreen component.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ScrollView } from 'react-native';
import { createTaggedLogger } from '../lib/logger';

const log = createTaggedLogger('useWorkoutSelection');

// Workout order constants for sorting
const ULUL_ORDER = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
const PPL_ORDER = ['Push', 'Pull', 'Legs'];

// Local type definitions matching useWorkoutLauncherData's return types
interface TPath {
  id: string;
  user_id: string;
  template_name: string;
  description: string | null;
  is_main_program: boolean;
  parent_t_path_id: string | null;
  order_index: number | null;
  is_ai_generated: boolean;
  ai_generation_params: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown; // Allow extra fields like gym_name
}

interface Profile {
  id: string;
  user_id: string;
  active_t_path_id: string | null;
  active_gym_id: string | null;
  programme_type: string | null;
  preferred_session_length: number | null;
  created_at: string;
  updated_at: string;
}

interface UseWorkoutSelectionParams {
  childWorkouts: TPath[];
  activeTPath: TPath | null;
  profile: Profile | null;
  activeWorkout: TPath | null;
  currentSessionId: string | null;
  selectWorkout: (id: string) => Promise<void>;
  resetWorkoutSession: () => Promise<void>;
  scrollViewRef: React.RefObject<ScrollView>;
}

interface UseWorkoutSelectionReturn {
  selectedWorkout: string | null;
  setSelectedWorkout: (id: string | null) => void;
  isWorkoutActiveInline: boolean;
  setIsWorkoutActiveInline: (v: boolean) => void;
  userHasSelectedWorkout: boolean;
  setUserHasSelectedWorkout: (v: boolean) => void;
  hasJustReset: boolean;
  setHasJustReset: (v: boolean) => void;
  sortedWorkouts: TPath[];
  ensureWorkoutSelected: () => Promise<void>;
  isGymChangeInProgressRef: React.MutableRefObject<boolean>;
  manuallySelectedWorkoutNameRef: React.MutableRefObject<string | null>;
  isSelectingRef: React.MutableRefObject<boolean>;
}

export function useWorkoutSelection({
  childWorkouts,
  activeTPath,
  profile,
  activeWorkout,
  currentSessionId,
  selectWorkout,
  resetWorkoutSession,
  scrollViewRef,
}: UseWorkoutSelectionParams): UseWorkoutSelectionReturn {
  // --- State ---
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [isWorkoutActiveInline, setIsWorkoutActiveInline] = useState(false);
  const [hasJustReset, setHasJustReset] = useState(false);
  const [userHasSelectedWorkout, setUserHasSelectedWorkout] = useState(false);

  // --- Refs ---
  const lastTPathIdRef = useRef<string | null>(null);
  const manuallySelectedWorkoutNameRef = useRef<string | null>(null);
  const previousChildWorkoutIdsRef = useRef<string[]>([]);
  const isSelectingRef = useRef<boolean>(false);
  const isGymChangeInProgressRef = useRef<boolean>(false);

  // Refs for profile/activeTPath to reduce recreations of ensureWorkoutSelected
  const profileRef = useRef(profile);
  const activeTPathRef = useRef(activeTPath);
  useEffect(() => {
    profileRef.current = profile;
    activeTPathRef.current = activeTPath;
  }, [profile, activeTPath]);

  // Refs for sortedWorkouts memoization stability
  const previousSortedWorkoutsRef = useRef<TPath[]>([]);
  const previousWorkoutIdsKeyRef = useRef<string>('');
  const previousProgramTypeRef = useRef<string | undefined>(undefined);

  // --- Callbacks ---

  // Helper function to find default workout (Push for PPL, Upper Body A for ULUL)
  const getDefaultWorkout = useCallback((workouts: TPath[], isULUL: boolean) => {
    if (workouts.length === 0) return null;

    if (isULUL) {
      const defaultWorkout = workouts.find(workout => {
        const lowerName = workout.template_name.toLowerCase();
        return (lowerName.includes('upper') && lowerName.includes('a')) ||
               lowerName === 'upper a' ||
               lowerName === 'upper body a';
      });
      if (defaultWorkout) {
        log.debug('[useWorkoutSelection] Found default ULUL workout:', defaultWorkout.template_name);
        return defaultWorkout;
      } else {
        log.warn('ULUL program detected but Upper Body A workout not found:', workouts.map(w => w.template_name));
      }
    } else {
      const defaultWorkout = workouts.find(workout =>
        workout.template_name.toLowerCase().includes('push')
      );
      if (defaultWorkout) {
        log.debug('[useWorkoutSelection] Found default PPL workout:', defaultWorkout.template_name);
        return defaultWorkout;
      } else {
        log.warn('PPL program detected but Push workout not found:', workouts.map(w => w.template_name));
      }
    }

    // Fallback to first workout if default not found
    return workouts[0] || null;
  }, []);

  // Unified function to ensure a workout is selected
  const ensureWorkoutSelected = useCallback(async () => {
    // Prevent race conditions
    if (isSelectingRef.current) {
      return;
    }
    if (isGymChangeInProgressRef.current) {
      return;
    }

    const currentProfile = profileRef.current;
    const currentActiveTPath = activeTPathRef.current;

    // Early exits
    if (!childWorkouts.length || !currentProfile?.id) {
      isSelectingRef.current = false;
      return;
    }
    if (activeWorkout || currentSessionId) {
      isSelectingRef.current = false;
      return;
    }
    if (selectedWorkout) {
      isSelectingRef.current = false;
      return;
    }

    isSelectingRef.current = true;

    try {
      // Try to re-select preserved workout first
      const preservedWorkoutName = manuallySelectedWorkoutNameRef.current;

      if (preservedWorkoutName) {
        const workoutToReselect = childWorkouts.find(w =>
          w.template_name.toLowerCase() === preservedWorkoutName.toLowerCase()
        );

        if (workoutToReselect) {
          try {
            setSelectedWorkout(workoutToReselect.id);
            await selectWorkout(workoutToReselect.id);
            setIsWorkoutActiveInline(true);
            setUserHasSelectedWorkout(true);
            return;
          } catch (error) {
            log.error('Failed to re-select preserved workout:', error);
            manuallySelectedWorkoutNameRef.current = null;
            setUserHasSelectedWorkout(false);
          }
        } else {
          manuallySelectedWorkoutNameRef.current = null;
          setUserHasSelectedWorkout(false);
        }
      }

      // Auto-select default workout
      const isULUL = currentProfile?.programme_type === 'ulul' ||
                     currentActiveTPath?.template_name?.toLowerCase().includes('upper/lower');

      const defaultWorkout = getDefaultWorkout(childWorkouts, isULUL);

      if (defaultWorkout) {
        const workoutExists = childWorkouts.some(w => w.id === defaultWorkout.id);
        if (!workoutExists) {
          log.error('Default workout not found in childWorkouts:', defaultWorkout.id);
          return;
        }

        try {
          setSelectedWorkout(defaultWorkout.id);
          await selectWorkout(defaultWorkout.id);
          setIsWorkoutActiveInline(true);
          manuallySelectedWorkoutNameRef.current = defaultWorkout.template_name;
          setUserHasSelectedWorkout(true);
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          }, 100);
        } catch (error) {
          log.error('Failed to auto-select workout:', error);
          setSelectedWorkout(null);
          setIsWorkoutActiveInline(false);
          manuallySelectedWorkoutNameRef.current = null;
          setUserHasSelectedWorkout(false);
        }
      } else {
        log.warn('No default workout found to auto-select. childWorkouts:', childWorkouts.map(w => w.template_name));
      }
    } finally {
      isSelectingRef.current = false;
    }
  }, [childWorkouts, selectedWorkout, activeWorkout, currentSessionId, selectWorkout, getDefaultWorkout, scrollViewRef]);

  // --- Effects ---

  // Reset workout when T-path changes
  useEffect(() => {
    const currentTPathId = activeTPath?.id || profile?.active_t_path_id || null;
    if (currentTPathId && currentTPathId !== lastTPathIdRef.current && lastTPathIdRef.current !== null) {
      if (isGymChangeInProgressRef.current) {
        lastTPathIdRef.current = currentTPathId;
        return;
      }
      log.debug('[useWorkoutSelection] T-path changed detected, resetting workout state and clearing selection:', {
        oldTPathId: lastTPathIdRef.current,
        newTPathId: currentTPathId,
        selectedWorkout,
        childWorkoutIds: childWorkouts.map(w => w.id),
        childWorkoutNames: childWorkouts.map(w => w.template_name)
      });
      setSelectedWorkout(null);
      setIsWorkoutActiveInline(false);
      resetWorkoutSession();
      setUserHasSelectedWorkout(false);
      setHasJustReset(false);
      log.debug('[useWorkoutSelection] T-path changed - cleared all flags to allow auto-select for new T-path');
    }
    if (currentTPathId) {
      lastTPathIdRef.current = currentTPathId;
    }
  }, [activeTPath?.id, profile?.active_t_path_id, resetWorkoutSession, selectedWorkout, childWorkouts]);

  // Unified effect to ensure a workout is selected
  useEffect(() => {
    ensureWorkoutSelected();
  }, [ensureWorkoutSelected, childWorkouts.length]);

  // Track childWorkouts changes to detect unnecessary reloads
  useEffect(() => {
    const currentIds = childWorkouts.map(w => w.id).sort().join(',');
    const prevIds = previousChildWorkoutIdsRef.current.sort().join(',');
    const idsChanged = currentIds !== prevIds;
    if (idsChanged || previousChildWorkoutIdsRef.current.length === 0) {
      log.debug('[useWorkoutSelection] childWorkouts IDs changed:', {
        previousNames: previousChildWorkoutIdsRef.current.map(id =>
          childWorkouts.find(w => w.id === id)?.template_name || 'unknown'
        ),
        currentNames: childWorkouts.map(w => w.template_name),
        idsChanged
      });
      previousChildWorkoutIdsRef.current = childWorkouts.map(w => w.id);
    }
  }, [childWorkouts]);

  // --- Memoized values ---

  // Stable key for workout IDs
  const workoutIdsKey = childWorkouts.map(w => w.id).sort().join(',');

  // Memoize sorted workouts to prevent unnecessary re-renders and animations
  const sortedWorkouts = useMemo(() => {
    if (childWorkouts.length === 0) {
      previousSortedWorkoutsRef.current = [];
      previousWorkoutIdsKeyRef.current = workoutIdsKey;
      previousProgramTypeRef.current = activeTPath?.template_name;
      return [];
    }

    if (workoutIdsKey === previousWorkoutIdsKeyRef.current &&
        activeTPath?.template_name === previousProgramTypeRef.current &&
        previousSortedWorkoutsRef.current.length > 0) {
      return previousSortedWorkoutsRef.current;
    }

    const sorted = [...childWorkouts].sort((a, b) => {
      const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');

      if (isUpperLowerSplit) {
        const indexA = ULUL_ORDER.indexOf(a.template_name);
        const indexB = ULUL_ORDER.indexOf(b.template_name);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      } else {
        const indexA = PPL_ORDER.indexOf(a.template_name);
        const indexB = PPL_ORDER.indexOf(b.template_name);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      }
    });

    previousSortedWorkoutsRef.current = sorted;
    previousWorkoutIdsKeyRef.current = workoutIdsKey;
    previousProgramTypeRef.current = activeTPath?.template_name;

    return sorted;
  }, [
    workoutIdsKey,
    activeTPath?.template_name,
    childWorkouts
  ]);

  return {
    selectedWorkout,
    setSelectedWorkout,
    isWorkoutActiveInline,
    setIsWorkoutActiveInline,
    userHasSelectedWorkout,
    setUserHasSelectedWorkout,
    hasJustReset,
    setHasJustReset,
    sortedWorkouts,
    ensureWorkoutSelected,
    isGymChangeInProgressRef,
    manuallySelectedWorkoutNameRef,
    isSelectingRef,
  };
}
