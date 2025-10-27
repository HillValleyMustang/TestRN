// Define ExerciseDefinition locally to avoid web dependencies
export interface ExerciseDefinition {
  id: string;
  name: string;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  user_id: string | null;
  library_id: string | null;
  created_at: string | null;
  is_favorite: boolean | null;
  icon_url: string | null;
  movement_type: string | null;
  movement_pattern: string | null;
}

// Define FetchedExerciseDefinition for consistency
export interface FetchedExerciseDefinition extends Omit<ExerciseDefinition, 'id'> {
  id: string | null; // Override id to be nullable
  is_favorited_by_current_user?: boolean; // For global exercises favorited by user
  duplicate_status?: 'none' | 'global' | 'my-exercises'; // Add duplicate status
  existing_id?: string | null; // ID of the duplicate exercise if found
}