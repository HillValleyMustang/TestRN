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

    // When week is complete but we have workouts this week, use the most recent one to determine next step
    if (isWeekComplete && completedWorkoutsThisWeek.length > 0) {
      // Find the last completed workout from the program this week
      // completedWorkoutsThisWeek is expected to be sorted most-recent-first
      const lastCompletedProgramWorkout = completedWorkoutsThisWeek
        .find(w => workoutOrder.some(p => this.isWorkoutTypeMatch(w.name, p)));
      
      if (lastCompletedProgramWorkout) {
        // Find its index in the program order
        const lastIndex = workoutOrder.findIndex(p => this.isWorkoutTypeMatch(lastCompletedProgramWorkout.name, p));
        const lastWorkoutName = workoutOrder[lastIndex].toLowerCase();
        
        // Smart week reset: alternate muscle groups to avoid consecutive same-type workouts
        if (programmeType === 'ulul') {
          // ULUL: Upper Body A (0), Lower Body A (1), Upper Body B (2), Lower Body B (3)
          if (lastWorkoutName.includes('upper')) {
            // Last was Upper → suggest first Lower workout (Lower Body A)
            nextRecommendedWorkout = workoutOrder[1]; // Lower Body A
          } else if (lastWorkoutName.includes('lower')) {
            // Last was Lower → suggest first Upper workout (Upper Body A)
            nextRecommendedWorkout = workoutOrder[0]; // Upper Body A
          } else {
            // Fallback: cycle to next
            const nextIndex = (lastIndex + 1) % workoutOrder.length;
            nextRecommendedWorkout = workoutOrder[nextIndex];
          }
        } else {
          // PPL: Cycle back to first workout (Push)
          nextRecommendedWorkout = workoutOrder[0];
        }
        recommendationReason = 'weekly_completion';
      } else {
        // No program workouts completed this week, fall back to normal cycling
        recommendationReason = 'normal_cycling';
      }
    } else if ((preferences.strictMode || preferences.prioritizeWeeklyCompletion) && missingWorkouts.length > 0 && !isWeekComplete) {
      // Find the last completed workout from the program this week
      // completedWorkoutsThisWeek is expected to be sorted most-recent-first
      const lastCompletedProgramWorkout = completedWorkoutsThisWeek
        .find(w => workoutOrder.some(p => this.isWorkoutTypeMatch(w.name, p)));
      
      if (lastCompletedProgramWorkout) {
        // Find its index in the program order
        const lastIndex = workoutOrder.findIndex(p => this.isWorkoutTypeMatch(lastCompletedProgramWorkout.name, p));
        
        // Find the next missing workout in the sequence after the last completed one
        // We look ahead from lastIndex + 1
        let nextInSequence = -1;
        for (let i = 1; i <= workoutOrder.length; i++) {
          const checkIndex = (lastIndex + i) % workoutOrder.length;
          const workoutAtPos = workoutOrder[checkIndex];
          if (missingWorkouts.some(m => this.isWorkoutTypeMatch(m, workoutAtPos))) {
            nextInSequence = checkIndex;
            break;
          }
        }
        
        if (nextInSequence !== -1) {
          nextRecommendedWorkout = workoutOrder[nextInSequence];
        } else {
          nextRecommendedWorkout = missingWorkouts[0];
        }
      } else {
        // Nothing completed this week yet, but we should still check the overall last workout
        // to continue the sequence if possible. 
        // We'll return undefined here and let determineNextWorkoutWeeklyAware fall back to determineNextWorkoutNormal
        return {
          completedWorkouts: programCompletedWorkouts,
          missingWorkouts,
          isWeekComplete,
          nextRecommendedWorkout: undefined,
          recommendationReason: 'normal_cycling'
        };
      }
      
      recommendationReason = 'weekly_completion';
    } else {
      // Week complete or early cycling allowed - use normal progression
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
      } else if (lastWorkoutType.includes('upper')) {
        // Generic Upper → Lower A
        return this.findWorkoutByType(tPathWorkouts, 'lower', 'a') || tPathWorkouts[0];
      } else if (lastWorkoutType.includes('lower')) {
        // Generic Lower → Upper B
        return this.findWorkoutByType(tPathWorkouts, 'upper', 'b') || tPathWorkouts[0];
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
    const searchType = type.toLowerCase();
    const searchVariant = variant?.toLowerCase();

    return workouts.find(workout => {
      const name = workout.template_name.toLowerCase();
      const matchesType = name.includes(searchType);
      const matchesVariant = !searchVariant || name.includes(searchVariant);
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

    // Handle ULUL program variations strictly first
    if (program === 'upper body a') {
      return (completed === 'upper body a') || (completed === 'upper a') || 
             (completed.includes('upper') && completed.includes('a') && !completed.includes('b'));
    }
    if (program === 'lower body a') {
      return (completed === 'lower body a') || (completed === 'lower a') ||
             (completed.includes('lower') && completed.includes('a') && !completed.includes('b'));
    }
    if (program === 'upper body b') {
      return (completed === 'upper body b') || (completed === 'upper b') ||
             (completed.includes('upper') && completed.includes('b') && !completed.includes('a'));
    }
    if (program === 'lower body b') {
      return (completed === 'lower body b') || (completed === 'lower b') ||
             (completed.includes('lower') && completed.includes('b') && !completed.includes('a'));
    }

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

    // Handle ad-hoc names with all words matching
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