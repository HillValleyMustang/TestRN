import { supabase } from '@data/supabase/client-mobile';

export { supabase };

export default supabase;

// Mobile-specific types for exercise definitions
export interface ExerciseDefinitionsRow {
  id: string;
  name: string;
  main_muscle: string | null;
  type: string | null;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  equipment: string | null;
  movement_type: string | null;
  movement_pattern: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FetchedExerciseDefinition
  extends Omit<ExerciseDefinitionsRow, 'id'> {
  id: string | null;
  is_favorited_by_current_user?: boolean;
  duplicate_status?: 'none' | 'global' | 'my-exercises';
  existing_id?: string | null;
}

// Function to fetch exercise definitions from Supabase
export const fetchExerciseDefinitions = async (
  exerciseIds: string[]
): Promise<FetchedExerciseDefinition[]> => {
  if (exerciseIds.length === 0) return [];

  const { data, error } = await supabase
    .from('exercise_definitions')
    .select('*')
    .in('id', exerciseIds);

  if (error) {
    console.error('Error fetching exercise definitions:', error);
    return [];
  }

  return data || [];
};
