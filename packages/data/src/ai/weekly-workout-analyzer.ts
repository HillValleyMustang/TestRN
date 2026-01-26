/**
 * Weekly Workout Analyzer
 * Analyzes completed workouts and determines next workout recommendations
 * based on weekly target completion and program structure.
 */

export interface CompletedWorkout {
  id: string;
  name: string;
  sessionId?: string;
}

export interface WeeklyCompletionStatus {
  completedWorkouts: string[];
  missingWorkouts: string[];
  isWeekComplete: boolean;
  nextRecommendedWorkout?: string;
  recommendationReason: 'weekly_completion' | 'normal_cycling';
}

export interface WorkoutRecommendationPreferences {
  prioritizeWeeklyCompletion: boolean; // Whether to suggest missing workouts before cycling
  allowEarlyCycling: boolean; // Allow normal cycling even if week isn't complete
  maxSuggestionsPerWeek: number; // Maximum weekly-aware suggestions per week
  strictMode: boolean; // If true, always prioritize weekly completion
  adaptiveMode: boolean; // Learn from user behavior over time
}

// Program-specific workout orders
const PPL_ORDER = ['Push', 'Pull', 'Legs'];
const ULUL_ORDER = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];

export class WeeklyWorkoutAnalyzer {
  /**
   * Analyzes weekly completion status for a given program type
   */
  static analyzeWeeklyCompletion(
    programmeType: 'ppl' | 'ulul',
    completedWorkoutsThisWeek: CompletedWorkout[],
    preferences: WorkoutRecommendationPreferences = {
      prioritizeWeeklyCompletion: true,
      allowEarlyCycling: false,
      maxSuggestionsPerWeek: 7,
      strictMode: false,
      adaptiveMode: false
    }
  ): WeeklyCompletionStatus {
    const workoutOrder = programmeType === 'ppl' ? PPL_ORDER : ULUL_ORDER;
    const completedNames = completedWorkoutsThisWeek.map(w => w.name.toLowerCase());

    // Enhanced filtering: identify program workouts vs ad-hoc/custom workouts
    const programCompletedWorkouts = completedNames.filter(completedName =>
      workoutOrder.some(programWorkout =>
        this.isWorkoutTypeMatch(completedName, programWorkout)
      )
    );

    // Find missing workouts with better matching logic
    const missingWorkouts = workoutOrder.filter(workoutName =>
      !programCompletedWorkouts.some(completed =>
        this.isWorkoutTypeMatch(completed, workoutName)
      )
    );

    const isWeekComplete = missingWorkouts.length === 0;

    // Determine recommendation logic with edge case handling
    let nextRecommendedWorkout: string | undefined;
    let recommendationReason: 'weekly_completion' | 'normal_cycling';

    if (preferences.strictMode && missingWorkouts.length > 0) {
      // Strict mode: Always prioritize weekly completion
      nextRecommendedWorkout = missingWorkouts[0];
      recommendationReason = 'weekly_completion';
    } else if (preferences.prioritizeWeeklyCompletion && missingWorkouts.length > 0 && !isWeekComplete) {
      // Standard mode: Suggest missing workouts if week isn't complete
      nextRecommendedWorkout = missingWorkouts[0];
      recommendationReason = 'weekly_completion';
    } else if (isWeekComplete || preferences.allowEarlyCycling) {
      // Week complete or early cycling allowed - use normal progression
      recommendationReason = 'normal_cycling';
    } else {
      // Fallback to normal cycling
      recommendationReason = 'normal_cycling';
    }

    console.log(`[WeeklyWorkoutAnalyzer] Weekly completion analysis:`, {
      programmeType,
      completedWorkoutsThisWeek: completedWorkoutsThisWeek.map(w => w.name),
      completedProgramWorkouts: programCompletedWorkouts,
      totalProgramWorkouts: workoutOrder.length,
      missingWorkouts,
      nextRecommended: nextRecommendedWorkout,
      recommendationReason,
      isWeekComplete,
      preferences: {
        strictMode: preferences.strictMode,
        prioritizeWeeklyCompletion: preferences.prioritizeWeeklyCompletion,
        allowEarlyCycling: preferences.allowEarlyCycling
      }
    });

    return {
      completedWorkouts: programCompletedWorkouts,
      missingWorkouts,
      isWeekComplete,
      nextRecommendedWorkout,
      recommendationReason
    };
  }

  /**
   * Determines the next workout using weekly-aware logic
   */
  static determineNextWorkoutWeeklyAware(
    programmeType: 'ppl' | 'ulul',
    recentWorkouts: any[],
    tPathWorkouts: any[],
    completedWorkoutsThisWeek: CompletedWorkout[],
    preferences: WorkoutRecommendationPreferences = {
      prioritizeWeeklyCompletion: true,
      allowEarlyCycling: false,
      maxSuggestionsPerWeek: 7,
      strictMode: false,
      adaptiveMode: false
    }
  ): any {
    if (tPathWorkouts.length === 0) return null;

    console.log(`[WeeklyWorkoutAnalyzer] determineNextWorkoutWeeklyAware called:`, {
      programmeType,
      completedWorkoutsThisWeek: completedWorkoutsThisWeek.map(w => ({ id: w.id, name: w.name })),
      tPathWorkouts: tPathWorkouts.map(w => w.template_name)
    });

    // Analyze weekly completion
    const weeklyStatus = this.analyzeWeeklyCompletion(
      programmeType,
      completedWorkoutsThisWeek,
      preferences
    );

    // If we have a weekly completion recommendation, find the matching workout
    if (weeklyStatus.nextRecommendedWorkout) {
      const recommendedWorkout = this.findWorkoutByType(tPathWorkouts, weeklyStatus.nextRecommendedWorkout);
      if (recommendedWorkout) {
        console.log(`[WeeklyWorkoutAnalyzer] Weekly completion recommendation: ${recommendedWorkout.template_name} (reason: ${weeklyStatus.recommendationReason})`);
        return {
          id: recommendedWorkout.id,
          template_name: recommendedWorkout.template_name,
          description: recommendedWorkout.description,
          parent_t_path_id: recommendedWorkout.parent_t_path_id,
          recommendationReason: weeklyStatus.recommendationReason
        };
      } else {
        console.warn(`[WeeklyWorkoutAnalyzer] Could not find workout matching recommendation: ${weeklyStatus.nextRecommendedWorkout}`);
      }
    }

    // Fall back to normal cycling logic
    console.log(`[WeeklyWorkoutAnalyzer] Using normal cycling logic (no weekly recommendation)`);
    const normalResult = this.determineNextWorkoutNormal(programmeType, recentWorkouts, tPathWorkouts);
    console.log(`[WeeklyWorkoutAnalyzer] Normal cycling result: ${normalResult?.template_name}`);
    return normalResult;
  }

  /**
   * Legacy normal cycling logic (extracted from existing implementations)
   */
  private static determineNextWorkoutNormal(
    programmeType: 'ppl' | 'ulul',
    recentWorkouts: any[],
    tPathWorkouts: any[]
  ): any {
    const sortedRecentWorkouts = recentWorkouts
      .filter(({ session }) => session.completed_at)
      .sort((a, b) => {
        const dateA = new Date(a.session.completed_at || a.session.session_date);
        const dateB = new Date(b.session.completed_at || b.session.session_date);
        return dateB.getTime() - dateA.getTime();
      });

    if (sortedRecentWorkouts.length === 0) {
      // No workout history, start with first workout
      return {
        id: tPathWorkouts[0].id,
        template_name: tPathWorkouts[0].template_name,
        description: tPathWorkouts[0].description,
        parent_t_path_id: tPathWorkouts[0].parent_t_path_id,
      };
    }

    // Simple progression logic based on last workout
    const lastWorkout = sortedRecentWorkouts[0].session;
    const lastWorkoutType = lastWorkout.template_name?.toLowerCase() || '';

    if (programmeType === 'ppl') {
      if (lastWorkoutType.includes('push')) {
        return this.findWorkoutByType(tPathWorkouts, 'pull') || tPathWorkouts[0];
      } else if (lastWorkoutType.includes('pull')) {
        return this.findWorkoutByType(tPathWorkouts, 'leg') || tPathWorkouts[0];
      } else {
        return this.findWorkoutByType(tPathWorkouts, 'push') || tPathWorkouts[0];
      }
    } else if (programmeType === 'ulul') {
      if (lastWorkoutType.includes('upper') && lastWorkoutType.includes('a')) {
        // Upper A → Lower A
        return this.findWorkoutByType(tPathWorkouts, 'lower', 'a') || tPathWorkouts[0];
      } else if (lastWorkoutType.includes('lower') && lastWorkoutType.includes('a')) {
        // Lower A → Upper B
        return this.findWorkoutByType(tPathWorkouts, 'upper', 'b') || tPathWorkouts[0];
      } else if (lastWorkoutType.includes('upper') && lastWorkoutType.includes('b')) {
        // Upper B → Lower B
        return this.findWorkoutByType(tPathWorkouts, 'lower', 'b') || tPathWorkouts[0];
      } else if (lastWorkoutType.includes('lower') && lastWorkoutType.includes('b')) {
        // Lower B → Upper A (cycle restart)
        return this.findWorkoutByType(tPathWorkouts, 'upper', 'a') || tPathWorkouts[0];
      } else {
        // Unknown workout type, default to Upper A
        return this.findWorkoutByType(tPathWorkouts, 'upper', 'a') || tPathWorkouts[0];
      }
    }

    return tPathWorkouts[0];
  }

  /**
   * Finds a workout by type and optional variant
   */
  private static findWorkoutByType(workouts: any[], type: string, variant?: string): any {
    return workouts.find(workout => {
      const name = workout.template_name.toLowerCase();
      const matchesType = name.includes(type);
      const matchesVariant = !variant || name.includes(variant);
      return matchesType && matchesVariant;
    });
  }

  /**
   * Checks if a completed workout name matches a program workout type
   * Handles various naming conventions and edge cases
   */
  private static isWorkoutTypeMatch(completedName: string, programWorkoutName: string): boolean {
    const completed = completedName.toLowerCase().trim();
    const program = programWorkoutName.toLowerCase().trim();

    // Direct substring match (most common case)
    if (completed.includes(program)) return true;

    // Handle PPL program variations
    if (program === 'push') {
      return completed.includes('push') ||
             (completed.includes('chest') && completed.includes('shoulder') && completed.includes('triceps'));
    }
    if (program === 'pull') {
      return completed.includes('pull') ||
             (completed.includes('back') && completed.includes('biceps'));
    }
    if (program === 'legs') {
      return completed.includes('leg') ||
             completed.includes('lower body') ||
             (completed.includes('quad') && completed.includes('hamstring'));
    }

    // Handle ULUL program variations
    if (program === 'upper body a') {
      return (completed.includes('upper') && completed.includes('a')) ||
             (completed.includes('upper body') && completed.includes('a'));
    }
    if (program === 'lower body a') {
      return (completed.includes('lower') && completed.includes('a')) ||
             (completed.includes('lower body') && completed.includes('a'));
    }
    if (program === 'upper body b') {
      return (completed.includes('upper') && completed.includes('b')) ||
             (completed.includes('upper body') && completed.includes('b'));
    }
    if (program === 'lower body b') {
      return (completed.includes('lower') && completed.includes('b')) ||
             (completed.includes('lower body') && completed.includes('b'));
    }

    // Handle abbreviated forms (Upper A, Lower A, etc.)
    const isUpper = program.includes('upper');
    const isLower = program.includes('lower');
    const isA = program.includes('a');
    const isB = program.includes('b');

    const compUpper = completed.includes('upper');
    const compLower = completed.includes('lower');
    const compA = completed.includes('a');
    const compB = completed.includes('b');

    // Strict matching for A/B variants to prevent cross-matching
    if (isUpper && isA) return compUpper && compA;
    if (isLower && isA) return compLower && compA;
    if (isUpper && isB) return compUpper && compB;
    if (isLower && isB) return compLower && compB;

    if (isUpper && compUpper) return true;
    if (isLower && compLower) return true;

    // Handle workout names with extra qualifiers (e.g., "Push - Beginner", "Upper Body A (Modified)")
    const programWords = program.split(' ');
    const allWordsMatch = programWords.every(word => completed.includes(word));
    if (allWordsMatch) return true;

    return false;
  }

  /**
   * Gets the expected weekly workout count for a program type
   */
  static getWeeklyWorkoutGoal(programmeType: 'ppl' | 'ulul'): number {
    return programmeType === 'ppl' ? 3 : 4;
  }
}