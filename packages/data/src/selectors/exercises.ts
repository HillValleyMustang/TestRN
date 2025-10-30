// Exercise selectors - filter/search helpers copied from web
import { FetchedExerciseDefinition } from '../types/exercise';

export interface ExerciseFilters {
  muscleGroup?: string;
  equipment?: string;
  difficulty?: string;
  searchTerm?: string;
  favoritesOnly?: boolean;
  gymId?: string;
}

export const filterExercises = (
  exercises: FetchedExerciseDefinition[],
  filters: ExerciseFilters
): FetchedExerciseDefinition[] => {
  return exercises.filter(exercise => {
    // Muscle group filter
    if (filters.muscleGroup && filters.muscleGroup !== 'all') {
      if (exercise.main_muscle !== filters.muscleGroup) {
        return false;
      }
    }

    // Equipment filter
    if (filters.equipment && filters.equipment !== 'all') {
      // This would need to be implemented based on equipment mapping
      // For now, just check if equipment is mentioned in name or category
      const equipmentLower = filters.equipment.toLowerCase();
      if (!exercise.name.toLowerCase().includes(equipmentLower) &&
          !exercise.category?.toLowerCase().includes(equipmentLower)) {
        return false;
      }
    }

    // Difficulty filter
    if (filters.difficulty && filters.difficulty !== 'all') {
      // This would need difficulty classification logic
      // For now, skip this filter
    }

    // Search term filter
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      if (!exercise.name.toLowerCase().includes(searchLower) &&
          !exercise.main_muscle.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Favorites filter
    if (filters.favoritesOnly) {
      if (!exercise.is_favorited_by_current_user && !exercise.is_favorite) {
        return false;
      }
    }

    // Gym filter
    if (filters.gymId && filters.gymId !== 'all') {
      // This would need gym association data - for now, skip this filter
      // The gym filtering should be handled at the component level using exerciseGymsMap
    }

    return true;
  });
};

export const sortExercises = (
  exercises: FetchedExerciseDefinition[],
  sortBy: 'name' | 'muscle' | 'category' = 'name'
): FetchedExerciseDefinition[] => {
  return [...exercises].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'muscle':
        return a.main_muscle.localeCompare(b.main_muscle);
      case 'category':
        const catA = a.category || '';
        const catB = b.category || '';
        return catA.localeCompare(catB);
      default:
        return 0;
    }
  });
};

export const getUniqueMuscleGroups = (exercises: FetchedExerciseDefinition[]): string[] => {
  const muscles = new Set();
  exercises.forEach(ex => {
    // Only include muscle groups that don't contain commas (single muscle groups)
    if (!ex.main_muscle.includes(',')) {
      muscles.add(ex.main_muscle.trim());
    }
  });
  return Array.from(muscles).sort() as string[];
};

export const getUniqueCategories = (exercises: FetchedExerciseDefinition[]): string[] => {
  const categories = new Set(exercises.map(ex => ex.category).filter(Boolean));
  return Array.from(categories).sort() as string[];
};