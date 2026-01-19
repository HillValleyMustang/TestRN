/**
 * Global Exercise Service - Fallback for when AI photo analysis doesn't provide enough exercises
 * Provides access to the global exercise library for workout generation
 */

import { supabase } from '../../../packages/data/src/supabase/client-mobile';
import { createTaggedLogger } from './logger';

const log = createTaggedLogger('GlobalExerciseService');

export interface GlobalExercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment_type: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  description?: string;
  instructions?: string;
}

export interface ExerciseAugmentationResult {
  primaryExercises: GlobalExercise[];
  bonusExercises: GlobalExercise[];
  totalAvailable: number;
}

export class GlobalExerciseService {
  /**
   * Get exercises by muscle groups and equipment preferences
   */
  static async getExercisesByMuscleGroups(
    muscleGroups: string[],
    equipmentTypes: string[],
    experienceLevel: 'beginner' | 'intermediate' | 'advanced',
    limit: number = 50
  ): Promise<GlobalExercise[]> {
    try {
      log.debug('[GlobalExerciseService] Fetching exercises for:', {
        muscleGroups,
        equipmentTypes,
        experienceLevel,
        limit,
      });

      let query = supabase
        .from('exercise_definitions')
        .select('*')
        .in('main_muscle', muscleGroups)
        .in('type', equipmentTypes)
        .eq('user_id', null)
        .limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error('[GlobalExerciseService] Error fetching exercises:', error);
        throw error;
      }

      console.log(`[GlobalExerciseService] Found ${data?.length || 0} exercises`);
      return data || [];
    } catch (error) {
      console.error('[GlobalExerciseService] Failed to fetch exercises:', error);
      return [];
    }
  }

  /**
   * Augment AI-detected exercises with global library exercises
   */
  static async augmentExercises(
    aiDetectedExercises: any[],
    preferredMuscles: string[],
    equipmentTypes: string[],
    experienceLevel: 'beginner' | 'intermediate' | 'advanced',
    sessionLength: string
  ): Promise<ExerciseAugmentationResult> {
    try {
      log.debug('[GlobalExerciseService] Augmenting exercises:', {
        aiDetectedCount: aiDetectedExercises.length,
        preferredMuscles,
        equipmentTypes,
        experienceLevel,
        sessionLength,
      });

      // Parse session length to determine exercise counts
      const sessionMinutes = this.parseSessionLength(sessionLength);
      const targetPrimaryExercises = this.getTargetExerciseCount(sessionMinutes, 'primary');
      const targetBonusExercises = this.getTargetExerciseCount(sessionMinutes, 'bonus');

      // Convert AI-detected exercises to our format
      const aiExercises = aiDetectedExercises.map(ex => ({
        id: ex.id || ex.exercise_id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        equipment_type: ex.type || 'bodyweight',
        difficulty_level: experienceLevel,
      }));

      // Fill gaps with global exercises
      const neededPrimary = Math.max(0, targetPrimaryExercises - aiExercises.length);
      const neededBonus = targetBonusExercises;

      let primaryExercises = [...aiExercises];
      let bonusExercises: GlobalExercise[] = [];

      if (neededPrimary > 0 || neededBonus > 0) {
        // Get additional exercises from global library
        const globalExercises = await this.getExercisesByMuscleGroups(
          preferredMuscles,
          equipmentTypes,
          experienceLevel,
          neededPrimary + neededBonus + 10 // Extra buffer
        );

        // Filter out exercises we already have from AI
        const existingIds = new Set(aiExercises.map(ex => ex.id));
        const newExercises = globalExercises.filter(ex => !existingIds.has(ex.id));

        // Distribute exercises between primary and bonus
        if (neededPrimary > 0) {
          primaryExercises.push(...newExercises.slice(0, neededPrimary));
        }

        if (neededBonus > 0) {
          bonusExercises = newExercises.slice(neededPrimary, neededPrimary + neededBonus);
        }
      }

      const result: ExerciseAugmentationResult = {
        primaryExercises,
        bonusExercises,
        totalAvailable: aiExercises.length + (await this.getExercisesByMuscleGroups(
          preferredMuscles,
          equipmentTypes,
          experienceLevel,
          1000
        )).length,
      };

      log.debug('[GlobalExerciseService] Augmentation complete:', {
        primaryCount: result.primaryExercises.length,
        bonusCount: result.bonusExercises.length,
        totalAvailable: result.totalAvailable,
      });

      return result;
    } catch (error) {
      console.error('[GlobalExerciseService] Exercise augmentation failed:', error);
      return {
        primaryExercises: aiDetectedExercises.map(ex => ({
          id: ex.id || ex.exercise_id,
          name: ex.name,
          muscle_group: ex.muscle_group,
          equipment_type: ex.type || 'bodyweight',
          difficulty_level: experienceLevel,
        })),
        bonusExercises: [],
        totalAvailable: aiDetectedExercises.length,
      };
    }
  }

  /**
   * Parse session length string to minutes
   */
  private static parseSessionLength(sessionLength: string): number {
    switch (sessionLength) {
      case '15-30': return 22; // Average
      case '30-45': return 37;
      case '45-60': return 52;
      case '60-90': return 75;
      default: return 45;
    }
  }

  /**
   * Get target exercise count based on session length and type
   */
  private static getTargetExerciseCount(sessionMinutes: number, type: 'primary' | 'bonus'): number {
    if (type === 'primary') {
      // Primary exercises: 3-6 based on session length
      if (sessionMinutes <= 30) return 3;
      if (sessionMinutes <= 45) return 4;
      if (sessionMinutes <= 60) return 5;
      return 6;
    } else {
      // Bonus exercises: 1-3 based on session length
      if (sessionMinutes <= 30) return 1;
      if (sessionMinutes <= 45) return 1;
      if (sessionMinutes <= 60) return 2;
      return 3;
    }
  }

  /**
   * Get equipment types from gym equipment list
   */
  static extractEquipmentTypes(equipmentList: string[]): string[] {
    const equipmentMap: Record<string, string[]> = {
      'barbell': ['barbell', 'ez_bar', 'trap_bar'],
      'dumbbell': ['dumbbell'],
      'kettlebell': ['kettlebell'],
      'cable_machine': ['cable_machine', 'lat_pulldown', 'cable_crossover'],
      'machine': ['leg_press', 'leg_extension', 'chest_press_machine'],
      'bodyweight': ['bodyweight'],
    };

    const equipmentTypes: string[] = [];

    for (const equipment of equipmentList) {
      for (const [type, variants] of Object.entries(equipmentMap)) {
        if (variants.includes(equipment.toLowerCase())) {
          if (!equipmentTypes.includes(type)) {
            equipmentTypes.push(type);
          }
          break;
        }
      }
    }

    // Always include bodyweight as fallback
    if (!equipmentTypes.includes('bodyweight')) {
      equipmentTypes.push('bodyweight');
    }

    return equipmentTypes;
  }
}