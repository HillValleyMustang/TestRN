/**
 * AI Workout Service - Mobile client for AI-powered workout generation
 * Handles communication with Supabase Edge Functions for onboarding completion
 */

// import { supabase } from '../../../packages/data/src/supabase/client-mobile';
import { GlobalExerciseService } from './global-exercise-service';
import { database } from '../app/_lib/database';

// Types for AI service communication
export interface OnboardingPayload {
  fullName: string;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number | null;
  tPathType: 'ppl' | 'ulul';
  experience: 'beginner' | 'intermediate';
  goalFocus: string;
  preferredMuscles: string;
  constraints: string;
  sessionLength: string;
  gymName: string;
  equipmentMethod: 'photo' | 'skip';
  confirmedExercises?: any[];
  unitSystem: 'metric' | 'imperial';
}

export interface AIWorkoutResponse {
  mainTPath: {
    id: string;
    template_name: string;
    description: string;
    t_path_type: 'ppl' | 'ulul';
    experience_level: 'beginner' | 'intermediate';
    session_length: string;
    created_at: string;
  };
  childWorkouts: Array<{
    id: string;
    workout_name: string;
    day_number: number;
    exercises: Array<{
      exercise_id: string;
      exercise_name: string;
      muscle_group: string;
      sets: number;
      reps: string;
      order_index: number;
      is_bonus_exercise: boolean;
    }>;
  }>;
  equipmentAnalysis?: {
    detectedExercises: any[];
    confidence: number;
  };
}

/**
 * Generate dynamic workout structure based on user preferences
 */
export class WorkoutGenerator {
  /**
   * Generate core + bonus exercise structure for a workout
   */
  static generateWorkoutStructure(
    workoutType: 'push' | 'pull' | 'legs' | 'upper' | 'lower',
    experience: 'beginner' | 'intermediate',
    sessionLength: string,
    availableExercises: any[]
  ): Array<{
    exercise_id: string;
    exercise_name: string;
    muscle_group: string;
    sets: number;
    reps: string;
    order_index: number;
    is_bonus_exercise: boolean;
  }> {
    const sessionMinutes = this.parseSessionLength(sessionLength);
    const isBeginner = experience === 'beginner';

    // Determine exercise counts based on session length and experience
    const coreExerciseCount = this.getCoreExerciseCount(sessionMinutes, experience);
    const bonusExerciseCount = this.getBonusExerciseCount(sessionMinutes, experience);

    // Filter exercises by workout type
    const relevantExercises = this.filterExercisesByWorkoutType(
      availableExercises,
      workoutType
    );

    // Sort by relevance (prioritize compound movements)
    const sortedExercises = this.sortExercisesByPriority(relevantExercises);

    const exercises: Array<{
      exercise_id: string;
      exercise_name: string;
      muscle_group: string;
      sets: number;
      reps: string;
      order_index: number;
      is_bonus_exercise: boolean;
    }> = [];

    // Add core exercises
    for (let i = 0; i < Math.min(coreExerciseCount, sortedExercises.length); i++) {
      const exercise = sortedExercises[i];
      exercises.push({
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        muscle_group: exercise.muscle_group,
        sets: this.getSetsForExercise(exercise, experience, false),
        reps: this.getRepsForExercise(exercise, experience, false),
        order_index: i,
        is_bonus_exercise: false,
      });
    }

    // Add bonus exercises
    const remainingExercises = sortedExercises.slice(coreExerciseCount);
    for (let i = 0; i < Math.min(bonusExerciseCount, remainingExercises.length); i++) {
      const exercise = remainingExercises[i];
      exercises.push({
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        muscle_group: exercise.muscle_group,
        sets: this.getSetsForExercise(exercise, experience, true),
        reps: this.getRepsForExercise(exercise, experience, true),
        order_index: coreExerciseCount + i,
        is_bonus_exercise: true,
      });
    }

    return exercises;
  }

  private static parseSessionLength(sessionLength: string): number {
    switch (sessionLength) {
      case '15-30': return 22;
      case '30-45': return 37;
      case '45-60': return 52;
      case '60-90': return 75;
      default: return 45;
    }
  }

  private static getCoreExerciseCount(sessionMinutes: number, experience: string): number {
    if (experience === 'beginner') {
      return sessionMinutes <= 30 ? 3 : sessionMinutes <= 45 ? 4 : 5;
    } else {
      return sessionMinutes <= 30 ? 4 : sessionMinutes <= 45 ? 5 : 6;
    }
  }

  private static getBonusExerciseCount(sessionMinutes: number, experience: string): number {
    if (experience === 'beginner') {
      return sessionMinutes <= 30 ? 1 : sessionMinutes <= 45 ? 1 : 2;
    } else {
      return sessionMinutes <= 30 ? 1 : sessionMinutes <= 45 ? 2 : 3;
    }
  }

  private static filterExercisesByWorkoutType(
    exercises: any[],
    workoutType: 'push' | 'pull' | 'legs' | 'upper' | 'lower'
  ): any[] {
    const muscleGroupMap = {
      push: ['chest', 'shoulders', 'triceps'],
      pull: ['back', 'biceps', 'rear_delts'],
      legs: ['quads', 'hamstrings', 'glutes', 'calves'],
      upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
      lower: ['quads', 'hamstrings', 'glutes', 'calves'],
    };

    const targetMuscles = muscleGroupMap[workoutType];
    return exercises.filter(ex => targetMuscles.includes(ex.muscle_group));
  }

  private static sortExercisesByPriority(exercises: any[]): any[] {
    // Prioritize compound movements over isolation
    const compoundMuscles = ['chest', 'back', 'quads', 'hamstrings'];
    const _isolationMuscles = ['shoulders', 'biceps', 'triceps', 'calves', 'glutes'];

    return exercises.sort((a, b) => {
      const aIsCompound = compoundMuscles.includes(a.muscle_group);
      const bIsCompound = compoundMuscles.includes(b.muscle_group);

      if (aIsCompound && !bIsCompound) return -1;
      if (!aIsCompound && bIsCompound) return 1;

      // Within compound or isolation, sort by equipment priority
      const equipmentPriority = ['barbell', 'dumbbell', 'cable_machine', 'machine', 'bodyweight'];
      const aPriority = equipmentPriority.indexOf(a.equipment_type);
      const bPriority = equipmentPriority.indexOf(b.equipment_type);

      return aPriority - bPriority;
    });
  }

  private static getSetsForExercise(exercise: any, experience: string, isBonus: boolean): number {
    if (isBonus) return 2;

    const isBeginner = experience === 'beginner';
    const isCompound = ['chest', 'back', 'quads', 'hamstrings'].includes(exercise.muscle_group);

    if (isCompound) {
      return isBeginner ? 3 : 4;
    } else {
      return isBeginner ? 3 : 3;
    }
  }

  private static getRepsForExercise(exercise: any, experience: string, isBonus: boolean): string {
    if (isBonus) return '12-15';

    const isBeginner = experience === 'beginner';
    const isCompound = ['chest', 'back', 'quads', 'hamstrings'].includes(exercise.muscle_group);

    if (isCompound) {
      return isBeginner ? '8-12' : '6-10';
    } else {
      return isBeginner ? '10-15' : '8-12';
    }
  }
}

export class AIWorkoutService {
  private static readonly SUPABASE_PROJECT_ID = 'mgbfevrzrbjjiajkqpti';
  private static readonly EDGE_FUNCTION_URL = `https://${this.SUPABASE_PROJECT_ID}.supabase.co/functions/v1/complete-onboarding`;

  /**
   * Generate personalized workout plan using AI
   */
  static async generateWorkoutPlan(
    payload: OnboardingPayload,
    accessToken: string
  ): Promise<AIWorkoutResponse> {
    try {
      console.log('[DEBUG] 🚀 generateWorkoutPlan called');
      console.log('[DEBUG] 📋 Original onboarding payload:', {
        fullName: payload.fullName,
        tPathType: payload.tPathType,
        experience: payload.experience,
        sessionLength: payload.sessionLength,
        equipmentMethod: payload.equipmentMethod
      });

      console.log('[DEBUG] 📡 Sending request to edge function:', this.EDGE_FUNCTION_URL);

      const response = await fetch(this.EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('[DEBUG] 📡 Edge function response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[DEBUG] ❌ Edge function error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('[DEBUG] 📥 Raw edge function response received');

      // COMPREHENSIVE WORKOUT DATA DEBUGGING
      console.log('[DEBUG] 🔍 EDGE FUNCTION RESPONSE ANALYSIS:');
      console.log('[DEBUG] 📊 Main T-Path data:', {
        id: responseData.mainTPath?.id,
        template_name: responseData.mainTPath?.template_name,
        settings_tPathType: responseData.mainTPath?.settings?.tPathType
      });
      
      console.log('[DEBUG] 📊 Child Workouts Analysis:');
      console.log('[DEBUG] 📊 Total childWorkouts count:', responseData.childWorkouts?.length || 0);
      
      if (responseData.childWorkouts && responseData.childWorkouts.length > 0) {
        console.log('[DEBUG] 📋 Individual workout breakdown:');
        responseData.childWorkouts.forEach((workout: any, index: number) => {
          console.log(`[DEBUG]   Workout ${index + 1}:`, {
            id: workout.id,
            template_name: workout.template_name || workout.workout_name,
            exercise_count: workout.t_path_exercises?.length || workout.exercises?.length || 0,
            parent_t_path_id: workout.parent_t_path_id
          });
        });

        console.log('[DEBUG] 🎯 ALL WORKOUT NAMES:', responseData.childWorkouts.map((w: any) =>
          w.template_name || w.workout_name
        ));
      }

      // Map the edge function response to the expected format
      const data: AIWorkoutResponse = {
        mainTPath: responseData.mainTPath,
        childWorkouts: responseData.childWorkouts || [],
        ...(responseData.identifiedExercises && {
          equipmentAnalysis: {
            detectedExercises: responseData.identifiedExercises,
            confidence: 1.0
          }
        })
      };

      // Validate response structure
      if (!data.mainTPath || !data.childWorkouts) {
        console.error('[DEBUG] ❌ Invalid response structure:', responseData);
        throw new Error('Invalid response structure from AI service');
      }

      // FINAL DEBUG SUMMARY
      console.log('[DEBUG] 🎉 SUCCESS: Edge function processed successfully');
      console.log('[DEBUG] 📋 FINAL WORKOUT SUMMARY:');
      console.log('[DEBUG] 📋 Selected program type:', payload.tPathType);
      console.log('[DEBUG] 📋 Expected workouts:', payload.tPathType === 'ppl' ? 3 : 4);
      console.log('[DEBUG] 📋 Actual workouts received:', data.childWorkouts.length);
      console.log('[DEBUG] 📋 Workout names:', data.childWorkouts.map(w => w.workout_name || w.template_name));
      
      console.log('[DEBUG] ✅ Successfully generated workout plan:', {
        tPathId: data.mainTPath.id,
        workoutCount: data.childWorkouts.length,
        totalExercises: data.childWorkouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0),
      });

      return data;
    } catch (error) {
      console.error('[DEBUG] ❌ Workout generation failed:', error);

      if (error instanceof Error) {
        // Re-throw with more context
        throw new Error(`AI workout generation failed: ${error.message}`);
      }

      throw new Error('AI workout generation failed: Unknown error');
    }
  }

  /**
   * Complete onboarding with AI workout generation and equipment augmentation
   */
  static async completeOnboardingWithAI(
    payload: OnboardingPayload,
    accessToken: string,
    userId: string
  ): Promise<AIWorkoutResponse> {
    try {
      console.log('[DEBUG] 🎯 completeOnboardingWithAI started');
      console.log('[DEBUG] 📋 User selection details:', {
        userId,
        tPathType: payload.tPathType,
        experience: payload.experience,
        sessionLength: payload.sessionLength
      });

      console.log('[DEBUG] 🔄 Step 1: Calling edge function to generate workout plan');
      
      // Use the edge function to generate the workout plan
      const aiResponse = await this.generateWorkoutPlan(payload, accessToken);

      console.log('[DEBUG] 🎉 Step 2: Edge function completed successfully');
      console.log('[DEBUG] 📊 RESPONSE ANALYSIS:');
      console.log('[DEBUG] 📊 Main T-Path:', {
        id: aiResponse.mainTPath?.id,
        template_name: aiResponse.mainTPath?.template_name
      });
      console.log('[DEBUG] 📊 Child Workouts Count:', aiResponse.childWorkouts?.length);
      console.log('[DEBUG] 📊 Workout Names:', aiResponse.childWorkouts?.map(w => w.workout_name));
      
      // CRITICAL: Check if we got the right number of workouts
      const expectedWorkouts = payload.tPathType === 'ppl' ? 3 : 4;
      const actualWorkouts = aiResponse.childWorkouts?.length || 0;
      
      console.log('[DEBUG] 🔍 WORKOUT COUNT VALIDATION:');
      console.log('[DEBUG] 🔍 Expected:', expectedWorkouts, 'workouts for', payload.tPathType);
      console.log('[DEBUG] 🔍 Actual:', actualWorkouts, 'workouts received');
      console.log('[DEBUG] 🔍 Match:', expectedWorkouts === actualWorkouts ? '✅ YES' : '❌ NO');

      if (expectedWorkouts !== actualWorkouts) {
        console.error('[DEBUG] 🚨 WORKOUT COUNT MISMATCH DETECTED!');
        console.error('[DEBUG] 🚨 Expected:', expectedWorkouts, 'but got:', actualWorkouts);
        console.error('[DEBUG] 🚨 Workout details:', aiResponse.childWorkouts);
      }

      // Use the T-Path ID from the edge function (it already handles everything)
      const mainTPathId = aiResponse.mainTPath.id;
      console.log('[DEBUG] 🏗️ Using T-Path ID from edge function:', mainTPathId);

      // Use gym name as fallback for gym ID in local storage
      const gymId = payload.gymName;

      console.log('[DEBUG] 💾 Step 3: Saving data to local database');
      console.log('[DEBUG] 💾 Saving profile, T-Path, workouts, and exercises');
      
      // Save profile to local database
      await this.saveProfileLocally(payload, userId, mainTPathId, gymId);
      
      // Save T-Path and workout data locally to SQLite for the workout launcher to access
      console.log('[DEBUG] 💾 Saving T-Path and workouts to local database');
      await this.saveTPathLocally(aiResponse.mainTPath, userId);
      await this.saveWorkoutsLocally(aiResponse.childWorkouts, mainTPathId, userId);
      
      // Save exercises to local database
      await this.saveExercisesLocally(aiResponse, userId);

      // Update the response with the main T-Path ID
      const finalResponse = {
        ...aiResponse,
        mainTPath: {
          ...aiResponse.mainTPath,
          id: mainTPathId
        }
      };

      console.log('[DEBUG] ✅ Step 4: Onboarding completion successful');
      console.log('[DEBUG] ✅ FINAL SUMMARY:');
      console.log('[DEBUG] ✅ User:', payload.fullName);
      console.log('[DEBUG] ✅ Selected:', payload.tPathType);
      console.log('[DEBUG] ✅ Received workouts:', actualWorkouts);
      console.log('[DEBUG] ✅ Workout names:', finalResponse.childWorkouts?.map(w => w.workout_name));
      
      return finalResponse;
    } catch (error) {
      console.error('[DEBUG] ❌ Onboarding completion failed:', error);
      throw error;
    }
  }

  /**
   * Save profile data to local SQLite database
   */
  private static async saveProfileLocally(
    payload: OnboardingPayload,
    userId: string,
    tPathId: string,
    gymId: string
  ): Promise<void> {
    console.log(`[DEBUG] 🚀 saveProfileLocally called for userId: ${userId}`);
    console.log(`[DEBUG] 📋 Original payload:`, JSON.stringify(payload, null, 2));
    console.log(`[DEBUG] 🎯 T-Path ID: ${tPathId}, Gym ID: ${gymId}`);
    
    try {
      console.log(`[DEBUG] 🔧 Constructing profile data...`);

      const nameParts = payload.fullName.split(' ');
      const firstName = nameParts.shift() || '';
      const lastName = nameParts.join(' ') || '';
      
      console.log(`[DEBUG] 👤 Name split - First: "${firstName}", Last: "${lastName}"`);

      const profileData = {
        id: userId,
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        full_name: payload.fullName,
        height_cm: payload.heightCm,
        weight_kg: payload.weightKg,
        body_fat_pct: payload.bodyFatPct || null,
        preferred_muscles: payload.preferredMuscles,
        primary_goal: payload.goalFocus,
        health_notes: payload.constraints,
        default_rest_time_seconds: 60,
        preferred_session_length: payload.sessionLength,
        active_t_path_id: tPathId,
        active_gym_id: gymId,
        programme_type: payload.tPathType,
        onboarding_completed: true,
        t_path_generation_status: 'completed',
        t_path_generation_error: null,
        created_at: new Date().toISOString()
      };
      
      console.log(`[DEBUG] 📊 Constructed profile data:`, JSON.stringify(profileData, null, 2));
      console.log(`[DEBUG] 💾 About to call database.saveProfile...`);
      
      // Add pre-flight check
      console.log(`[DEBUG] 🔍 Performing pre-flight database check...`);
      await database.init(); // Ensure database is initialized
      console.log(`[DEBUG] ✅ Database initialized successfully`);
      
      // Call saveProfile with comprehensive logging
      await database.saveProfile(profileData);
      
      console.log(`[DEBUG] ✅ Profile saved to local database successfully`);
      
      // Post-save verification
      console.log(`[DEBUG] 🔍 Verifying profile was saved...`);
      try {
        const savedProfile = await database.getProfile(userId);
        console.log(`[DEBUG] ✅ Verification successful - profile found:`, savedProfile ? 'YES' : 'NO');
        if (savedProfile) {
          console.log(`[DEBUG] 📋 Saved profile data:`, JSON.stringify(savedProfile, null, 2));
        }
      } catch (verifyError: any) {
        console.warn(`[DEBUG] ⚠️  Profile verification failed:`, verifyError.message);
      }
      
    } catch (error: any) {
      console.error(`[DEBUG] ❌ FAILED to save profile locally`);
      console.error(`[DEBUG] 🚨 Error message:`, error.message);
      console.error(`[DEBUG] 📊 Error code:`, error.code);
      console.error(`[DEBUG] 🔍 Error stack:`, error.stack);
      console.error(`[DEBUG] 📋 Profile data that failed:`, JSON.stringify({
        id: userId,
        full_name: payload.fullName,
        height_cm: payload.heightCm,
        weight_kg: payload.weightKg,
        // Intentionally not logging all fields to avoid sensitive data in logs
      }, null, 2));
      
      // Enhanced error analysis
      if (error.message.includes('no column named target_date')) {
        console.error(`[DEBUG] 🎯 SPECIFIC ERROR IDENTIFIED: target_date column missing`);
        console.error(`[DEBUG] 💡 Root cause: Database schema mismatch - profiles table missing target_date column`);
        console.error(`[DEBUG] 🛠️  This should be fixed by the migration system in database.ts`);
      }
      
      throw error;
    }
  }

  /**
   * Save T-Path data to local SQLite database
   */
  private static async saveTPathLocally(
    tPathData: AIWorkoutResponse['mainTPath'],
    userId: string
  ): Promise<void> {
    try {
      console.log('[AIWorkoutService] Saving T-Path to local database:', tPathData.template_name);

      await database.addTPath({
        id: tPathData.id,
        user_id: userId,
        template_name: tPathData.template_name,
        description: tPathData.description,
        is_main_program: true,
        parent_t_path_id: null,
        order_index: 0,
        is_ai_generated: true,
        ai_generation_params: null,
        created_at: tPathData.created_at,
        updated_at: tPathData.created_at,
      });

      console.log('[AIWorkoutService] T-Path saved to local database');
    } catch (error) {
      console.error('[AIWorkoutService] Failed to save T-Path locally:', error);
      throw error;
    }
  }

  /**
   * Save workout and exercise data to local SQLite database
   */
  private static async saveWorkoutsLocally(
    workouts: AIWorkoutResponse['childWorkouts'],
    tPathId: string,
    userId: string
  ): Promise<void> {
    try {
      console.log('[AIWorkoutService] Saving workouts to local database');

      for (let i = 0; i < workouts.length; i++) {
        const workout = workouts[i];

        // Validate workout name before saving
        if (!workout.workout_name) {
          console.error('[AIWorkoutService] Invalid workout name for local save:', workout.workout_name);
          continue; // Skip invalid workouts
        }

        // Save child T-Path
        const childTPathId = workout.id;
        const now = new Date().toISOString();
        await database.addTPath({
          id: childTPathId,
          user_id: userId,
          template_name: workout.workout_name,
          description: null,
          is_main_program: false,
          parent_t_path_id: tPathId,
          order_index: i,
          is_ai_generated: true,
          ai_generation_params: null,
          created_at: now,
          updated_at: now,
        });

        // Save exercises for this workout
        if (workout.exercises && workout.exercises.length > 0) {
          for (const exercise of workout.exercises) {
            // Handle the actual exercise data structure from the API response
            const exerciseId = (exercise as any).id || (exercise as any).exercise_id;
            if (!exerciseId) {
              console.error('[AIWorkoutService] Skipping exercise without ID:', exercise);
              continue;
            }

            try {
              await database.addTPathExercise({
                id: `${childTPathId}_${exerciseId}_${Date.now()}`, // Generate unique ID
                t_path_id: childTPathId,
                exercise_id: exerciseId,
                order_index: (exercise as any).order_index || 0,
                is_bonus_exercise: Boolean((exercise as any).is_bonus_exercise),
                target_sets: (exercise as any).sets || 3,
                target_reps_min: (exercise as any).reps ? parseInt((exercise as any).reps.split('-')[0]) || null : null,
                target_reps_max: (exercise as any).reps ? parseInt((exercise as any).reps.split('-')[1]) || null : null,
                notes: null,
                created_at: new Date().toISOString(),
              });
            } catch (exerciseError) {
              console.error('[AIWorkoutService] Failed to save exercise:', exerciseId, exerciseError);
              // Continue with next exercise instead of failing the entire workout
            }
          }
        }

        console.log(`[AIWorkoutService] Saved workout ${workout.workout_name} with ${workout.exercises?.length || 0} exercises`);
      }

      console.log('[AIWorkoutService] All workouts saved to local database');
    } catch (error) {
      console.error('[AIWorkoutService] Failed to save workouts locally:', error);
      throw error;
    }
  }

  /**
   * Save exercise definitions to local SQLite database
   */
  private static async saveExercisesLocally(
    aiResponse: AIWorkoutResponse,
    _userId: string
  ): Promise<void> {
    try {
      console.log('[AIWorkoutService] Saving exercise definitions to local database');

      // Extract unique exercises from all workouts
      const exerciseMap = new Map<string, any>();

      for (const workout of aiResponse.childWorkouts) {
        if (workout.exercises) {
          for (const exercise of workout.exercises) {
            if (exercise.exercise_id && !exerciseMap.has(exercise.exercise_id)) {
              exerciseMap.set(exercise.exercise_id, {
                id: exercise.exercise_id,
                user_id: null, // These are global exercises
                library_id: null,
                name: exercise.exercise_name,
                main_muscle: exercise.muscle_group,
                type: null,
                category: null,
                description: null,
                pro_tip: null,
                video_url: null,
                icon_url: null,
                movement_type: null,
                movement_pattern: null,
                created_at: new Date().toISOString()
              });
            }
          }
        }
      }

      // Save all exercises to local database
      for (const exercise of exerciseMap.values()) {
        await database.addExerciseDefinition(exercise);
      }

      console.log(`[AIWorkoutService] Saved ${exerciseMap.size} exercise definitions to local database`);
    } catch (error) {
      console.error('[AIWorkoutService] Failed to save exercises locally:', error);
      throw error;
    }
  }

  /**
   * Augment exercises using global library if AI didn't provide enough
   */
  private static async augmentExercisesIfNeeded(
    aiResponse: AIWorkoutResponse,
    payload: OnboardingPayload
  ): Promise<AIWorkoutResponse> {
    try {
      // Check if we need to augment exercises
      const totalExercises = aiResponse.childWorkouts.reduce(
        (sum, workout) => sum + (workout.exercises?.length || 0),
        0
      );

      // Always augment for "skip" users since they have no confirmed exercises
      // Also augment for photo users if they have fewer than 8 exercises
      if (payload.equipmentMethod === 'skip' || totalExercises < 8) {
        console.log('[AIWorkoutService] Augmenting exercises - only', totalExercises, 'found');

        // Extract equipment types from confirmed exercises
        // For 'skip' method, use default equipment types to get a good variety
        const equipmentTypes = payload.equipmentMethod === 'skip'
          ? ['barbell', 'dumbbell', 'bodyweight', 'machine'] // Default for "skip" users
          : GlobalExerciseService.extractEquipmentTypes(
              payload.confirmedExercises?.map(ex => ex.equipment_type).filter(Boolean) || []
            );

        // Augment each workout
        for (const workout of aiResponse.childWorkouts) {
          if (workout.exercises && workout.exercises.length > 0) {
            const augmentation = await GlobalExerciseService.augmentExercises(
              workout.exercises,
              payload.preferredMuscles.split(',').map(m => m.trim()),
              equipmentTypes,
              payload.experience,
              payload.sessionLength
            );

            // Replace exercises with augmented list
            workout.exercises = [
              ...augmentation.primaryExercises.map(ex => ({
                exercise_id: ex.id,
                exercise_name: ex.name,
                muscle_group: ex.muscle_group,
                sets: 3, // Default sets
                reps: '8-12', // Default reps
                order_index: 0,
                is_bonus_exercise: false,
              })),
              ...augmentation.bonusExercises.map((ex, index) => ({
                exercise_id: ex.id,
                exercise_name: ex.name,
                muscle_group: ex.muscle_group,
                sets: 2, // Fewer sets for bonus
                reps: '10-15', // Higher reps for bonus
                order_index: augmentation.primaryExercises.length + index,
                is_bonus_exercise: true,
              })),
            ];
          }
        }
      }

      return aiResponse;
    } catch (error) {
      console.warn('[AIWorkoutService] Exercise augmentation failed, using original:', error);
      return aiResponse;
    }
  }
}
// Helper functions for saving workout data to local SQLite

const saveTPathToLocal = async (tPath: any, userId: string, parentId?: string): Promise<string> => {
  const { database } = await import('../app/_lib/database');
  const localTPath = {
    id: tPath.id || `local_${Date.now()}`,
    user_id: userId,
    template_name: tPath.template_name,
    description: tPath.description || null,
    is_main_program: !parentId,
    parent_t_path_id: parentId || null,
    order_index: 0,
    is_ai_generated: true,
    ai_generation_params: JSON.stringify({
      source: 'onboarding',
      created_at: new Date().toISOString()
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await database.addTPath(localTPath);
  return localTPath.id;
};

const saveTPathExercisesToLocal = async (tPathId: string, exercises: any[]): Promise<void> => {
  const now = new Date().toISOString();
  
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];
    
    // Save exercise definition to local database first
    await database.addExerciseDefinition({
      id: exercise.id,
      user_id: exercise.user_id || null,
      library_id: exercise.library_id || null,
      name: exercise.name,
      main_muscle: exercise.main_muscle || null,
      type: exercise.type || null,
      category: exercise.category || null,
      description: exercise.description || null,
      pro_tip: exercise.pro_tip || null,
      video_url: exercise.video_url || null,
      icon_url: exercise.icon_url || null,
      movement_type: exercise.movement_type || null,
      movement_pattern: exercise.movement_pattern || null,
      created_at: exercise.created_at || now,
    });

    // Save T-Path exercise link
    const tPathExercise = {
      id: `${tPathId}_${exercise.id}`,
      t_path_id: tPathId,
      exercise_id: exercise.id,
      order_index: i,
      is_bonus_exercise: exercise.is_bonus_exercise || false,
      target_sets: exercise.target_sets || 3,
      target_reps_min: exercise.target_reps_min || 8,
      target_reps_max: exercise.target_reps_max || 12,
      notes: exercise.notes || null,
      created_at: now,
    };

    await database.addTPathExercise(tPathExercise);
  }
};