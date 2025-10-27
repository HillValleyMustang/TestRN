// Re-export exercise-related API functions from web app
// For now, we'll create wrapper functions that match the web API

import { SupabaseClient } from '@supabase/supabase-js';
import { FetchedExerciseDefinition } from '../types/exercise';

export interface ExercisesApi {
  fetchExercises: (supabase: SupabaseClient) => Promise<FetchedExerciseDefinition[]>;
  searchExercises: (query: string, supabase: SupabaseClient) => Promise<FetchedExerciseDefinition[]>;
  getExerciseById: (id: string, supabase: SupabaseClient) => Promise<FetchedExerciseDefinition | null>;
}

// Basic implementation - can be expanded to match web API exactly
export const exercisesApi: ExercisesApi = {
  fetchExercises: async (supabase: SupabaseClient) => {
    const { data, error } = await supabase
      .from('exercise_definitions')
      .select('*')
      .order('name');

    if (error) throw error;

    return (data || []).map(ex => ({
      ...ex,
      id: ex.id,
      is_favorited_by_current_user: false, // This would need user context
      movement_type: ex.movement_type,
      movement_pattern: ex.movement_pattern,
    }));
  },

  searchExercises: async (query: string, supabase: SupabaseClient) => {
    const { data, error } = await supabase
      .from('exercise_definitions')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name');

    if (error) throw error;

    return (data || []).map(ex => ({
      ...ex,
      id: ex.id,
      is_favorited_by_current_user: false,
      movement_type: ex.movement_type,
      movement_pattern: ex.movement_pattern,
    }));
  },

  getExerciseById: async (id: string, supabase: SupabaseClient) => {
    const { data, error } = await supabase
      .from('exercise_definitions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return {
      ...data,
      id: data.id,
      is_favorited_by_current_user: false,
      movement_type: data.movement_type,
      movement_pattern: data.movement_pattern,
    };
  },
};