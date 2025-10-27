import { useState, useEffect, useMemo, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '../app/_contexts/auth-context';
import { FetchedExerciseDefinition } from '../../../packages/data/src/types/exercise';
import { exercisesApi } from '../../../packages/data/src/api/exercises';
import { filterExercises, sortExercises, getUniqueMuscleGroups } from '../../../packages/data/src/selectors/exercises';

interface UseExerciseDataProps {
  supabase: SupabaseClient;
}

interface UseExerciseDataReturn {
  // Data
  userExercises: FetchedExerciseDefinition[];
  globalExercises: FetchedExerciseDefinition[];
  allExercises: FetchedExerciseDefinition[];
  availableMuscleGroups: string[];
  userGyms: any[]; // TODO: Define proper type
  exerciseGymsMap: Record<string, string[]>;
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;

  // State
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedMuscleFilter: string;
  setSelectedMuscleFilter: (filter: string) => void;
  selectedGymFilter: string;
  setSelectedGymFilter: (filter: string) => void;
  editingExercise: FetchedExerciseDefinition | null;
  setEditingExercise: (exercise: FetchedExerciseDefinition | null) => void;

  // Actions
  refreshExercises: () => void;
  handleToggleFavorite: (exercise: FetchedExerciseDefinition) => Promise<void>;
  handleDeleteExercise: (exercise: FetchedExerciseDefinition) => Promise<void>;
  handleAddToWorkout: (exercise: FetchedExerciseDefinition) => void;
  handleRemoveFromWorkout: (workoutId: string, exerciseId: string) => Promise<void>;
}

export const useExerciseData = ({ supabase }: UseExerciseDataProps): UseExerciseDataReturn => {
  const { userId } = useAuth();

  // State
  const [allExercises, setAllExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [userGyms, setUserGyms] = useState<any[]>([]);
  const [exerciseGymsMap, setExerciseGymsMap] = useState<Record<string, string[]>>({});
  const [exerciseWorkoutsMap, setExerciseWorkoutsMap] = useState<Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('all');
  const [selectedGymFilter, setSelectedGymFilter] = useState('all');
  const [editingExercise, setEditingExercise] = useState<FetchedExerciseDefinition | null>(null);

  // Computed data
  const availableMuscleGroups = useMemo(() => getUniqueMuscleGroups(allExercises), [allExercises]);

  const filteredExercises = useMemo(() => {
    const filters = {
      muscleGroup: selectedMuscleFilter === 'all' ? '' : selectedMuscleFilter,
      searchTerm: searchTerm.trim(),
      favoritesOnly: selectedMuscleFilter === 'favorites',
    };
    return filterExercises(allExercises, filters);
  }, [allExercises, selectedMuscleFilter, searchTerm]);

  const userExercises = useMemo(() =>
    filteredExercises.filter(ex => ex.user_id === userId && ex.library_id === null),
    [filteredExercises, userId]
  );

  const globalExercises = useMemo(() =>
    filteredExercises.filter(ex => ex.user_id === null),
    [filteredExercises]
  );

  // Fetch functions
  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching exercises...');
      const exercises = await exercisesApi.fetchExercises(supabase);
      console.log('Fetched exercises:', exercises.length);
      setAllExercises(exercises);
    } catch (err) {
      console.error('Error fetching exercises:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch exercises');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchUserGyms = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setUserGyms(data || []);
    } catch (err) {
      console.error('Error loading gyms:', err);
    }
  }, [supabase, userId]);

  const fetchExerciseGymsMap = useCallback(async () => {
    if (!userId) return;

    try {
      // First get user's gyms
      const { data: userGymsData, error: gymsError } = await supabase
        .from('gyms')
        .select('id, name')
        .eq('user_id', userId);

      if (gymsError) throw gymsError;

      // Then get gym exercises for those gyms
      const gymIds = (userGymsData || []).map(gym => gym.id);
      if (gymIds.length === 0) {
        setExerciseGymsMap({});
        return;
      }

      const { data, error } = await supabase
        .from('gym_exercises')
        .select('exercise_id, gym_id')
        .in('gym_id', gymIds);

      if (error) throw error;

      // Create map of exercise_id -> gym names
      const gymIdToNameMap = new Map(userGymsData?.map(gym => [gym.id, gym.name]) || []);
      const map: Record<string, string[]> = {};

      (data || []).forEach(item => {
        const exerciseId = item.exercise_id;
        const gymName = gymIdToNameMap.get(item.gym_id);
        if (gymName) {
          if (!map[exerciseId]) map[exerciseId] = [];
          map[exerciseId].push(gymName);
        }
      });

      setExerciseGymsMap(map);
    } catch (err) {
      console.error('Failed to fetch exercise gyms map:', err);
    }
  }, [supabase, userId]);

  const fetchExerciseWorkoutsMap = useCallback(async () => {
    if (!userId) return;

    try {
      // This is a simplified version - in real implementation, this would be more complex
      // to match the web app's logic for determining which workouts contain which exercises
      const map: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]> = {};
      setExerciseWorkoutsMap(map);
    } catch (err) {
      console.error('Failed to fetch exercise workouts map:', err);
    }
  }, [userId]);

  // Actions
  const refreshExercises = useCallback(() => {
    fetchExercises();
    fetchUserGyms();
    fetchExerciseGymsMap();
    fetchExerciseWorkoutsMap();
  }, [fetchExercises, fetchUserGyms, fetchExerciseGymsMap, fetchExerciseWorkoutsMap]);

  const handleToggleFavorite = useCallback(async (exercise: FetchedExerciseDefinition) => {
    if (!userId) return;

    try {
      const isUserOwned = exercise.user_id === userId;
      const isCurrentlyFavorited = isUserOwned ? exercise.is_favorite : exercise.is_favorited_by_current_user;
      const newFavoriteStatus = !isCurrentlyFavorited;

      if (isUserOwned) {
        const { error } = await supabase
          .from('exercise_definitions')
          .update({ is_favorite: newFavoriteStatus })
          .eq('id', exercise.id as string)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        if (newFavoriteStatus) {
          const { error } = await supabase
            .from('user_global_favorites')
            .insert({ user_id: userId, exercise_id: exercise.id as string });

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('user_global_favorites')
            .delete()
            .eq('user_id', userId)
            .eq('exercise_id', exercise.id as string);

          if (error) throw error;
        }
      }

      // Update local state
      setAllExercises(prev => prev.map(ex =>
        ex.id === exercise.id
          ? {
              ...ex,
              is_favorite: isUserOwned ? newFavoriteStatus : ex.is_favorite,
              is_favorited_by_current_user: !isUserOwned ? newFavoriteStatus : (ex.is_favorited_by_current_user || false),
            }
          : ex
      ));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      setError('Failed to update favorite status');
    }
  }, [supabase, userId]);

  const handleDeleteExercise = useCallback(async (exercise: FetchedExerciseDefinition) => {
    if (!userId || exercise.user_id !== userId) return;

    try {
      setError(null); // Clear any previous errors
      const { error } = await supabase
        .from('exercise_definitions')
        .delete()
        .eq('id', exercise.id)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setAllExercises(prev => prev.filter(ex => ex.id !== exercise.id));
    } catch (err) {
      console.error('Failed to delete exercise:', err);
      setError('Failed to delete exercise');
      throw err; // Re-throw to allow modal to handle error state
    }
  }, [supabase, userId]);

  const handleAddToWorkout = useCallback((exercise: FetchedExerciseDefinition) => {
    // This would implement adding exercise to workout logic
    console.log('Adding exercise to workout:', { exerciseId: exercise.id });
  }, []);

  const handleRemoveFromWorkout = useCallback(async (workoutId: string, exerciseId: string) => {
    try {
      const { error } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('template_id', workoutId)
        .eq('exercise_id', exerciseId);

      if (error) throw error;

      // Refresh data to update maps
      fetchExerciseWorkoutsMap();
    } catch (err) {
      console.error('Failed to remove exercise from workout:', err);
      setError('Failed to remove exercise from workout');
    }
  }, [supabase, fetchExerciseWorkoutsMap]);

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      refreshExercises();
    }
  }, [userId, refreshExercises]);

  return {
    // Data
    userExercises,
    globalExercises,
    allExercises: filteredExercises,
    availableMuscleGroups,
    userGyms,
    exerciseGymsMap,
    exerciseWorkoutsMap,

    // State
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    selectedGymFilter,
    setSelectedGymFilter,
    editingExercise,
    setEditingExercise,

    // Actions
    refreshExercises,
    handleToggleFavorite,
    handleDeleteExercise,
    handleAddToWorkout,
    handleRemoveFromWorkout,
  };
};