import { supabase } from '../supabase/client-mobile';
import { ExperienceLevel, TrainingFrequency } from './progression-engine';

export interface GoalBasedRepRange {
  goal: 'strength_increase' | 'muscle_gain' | 'fat_loss' | 'general_fitness';
  experienceLevel: ExperienceLevel;
  trainingFrequency: TrainingFrequency;
  recommendedRange: {
    min: number;
    max: number;
    optimal: number;
  };
  reasoning: string[];
}

export interface AdaptiveRepRecommendation {
  exerciseId: string;
  currentReps: number;
  recommendedRange: {
    min: number;
    max: number;
    optimal: number;
  };
  goalAlignment: number; // 0-100, how well current reps align with goal
  progressionStrategy: 'maintain' | 'increase_volume' | 'increase_intensity' | 'deload';
  reasoning: string[];
  alternatives?: Array<{
    range: { min: number; max: number; optimal: number };
    reasoning: string;
    suitability: number; // 0-100
  }>;
}

class AdaptiveRepSelectorService {
  /**
   * Get goal-based rep range recommendations
   */
  getGoalBasedRepRanges(
    goal: string,
    experienceLevel: ExperienceLevel,
    trainingFrequency: TrainingFrequency
  ): GoalBasedRepRange {
    const ranges = this.getRepRangeMatrix();

    // Find matching range or use defaults
    const matchingRange = ranges.find(range =>
      range.goal === goal &&
      range.experienceLevel === experienceLevel &&
      range.trainingFrequency === trainingFrequency
    );

    if (matchingRange) {
      return matchingRange;
    }

    // Fallback to general fitness defaults
    return ranges.find(range =>
      range.goal === 'general_fitness' &&
      range.experienceLevel === experienceLevel
    ) || ranges[0];
  }

  /**
   * Generate adaptive rep recommendation for specific exercise
   */
  async generateAdaptiveRepRecommendation(
    userId: string,
    exerciseId: string,
    currentReps: number,
    goal: string | null,
    experienceLevel: ExperienceLevel,
    trainingFrequency: TrainingFrequency
  ): Promise<AdaptiveRepRecommendation> {
    // Get user's goal from profile
    const userGoal = goal || 'general_fitness';

    // Get base recommendation
    const baseRecommendation = this.getGoalBasedRepRanges(
      userGoal,
      experienceLevel,
      trainingFrequency
    );

    // Analyze current performance context
    const contextAnalysis = await this.analyzePerformanceContext(
      userId,
      exerciseId,
      currentReps,
      baseRecommendation
    );

    // Calculate goal alignment
    const goalAlignment = this.calculateGoalAlignment(
      currentReps,
      baseRecommendation.recommendedRange
    );

    // Determine progression strategy
    const progressionStrategy = this.determineProgressionStrategy(
      currentReps,
      baseRecommendation.recommendedRange,
      contextAnalysis,
      goalAlignment
    );

    // Generate reasoning
    const reasoning = this.generateRecommendationReasoning(
      baseRecommendation,
      contextAnalysis,
      goalAlignment,
      progressionStrategy
    );

    // Generate alternatives if needed
    const alternatives = goalAlignment < 70 ?
      this.generateAlternativeRanges(baseRecommendation, contextAnalysis) :
      undefined;

    return {
      exerciseId,
      currentReps,
      recommendedRange: baseRecommendation.recommendedRange,
      goalAlignment,
      progressionStrategy,
      reasoning,
      alternatives
    };
  }

  /**
   * Analyze performance context for adaptive recommendations
   */
  private async analyzePerformanceContext(
    userId: string,
    exerciseId: string,
    currentReps: number,
    baseRecommendation: GoalBasedRepRange
  ) {
    // Get recent performance data
    const recentSessions = await this.getRecentExerciseSessions(userId, exerciseId, 8);

    if (recentSessions.length === 0) {
      return {
        hasHistoricalData: false,
        recentTrend: 'stable',
        consistency: 0,
        fatigueIndicators: [],
        volumeTrend: 'stable'
      };
    }

    // Analyze trends
    const recentTrend = this.analyzeRepTrend(recentSessions);
    const consistency = this.calculateRepConsistency(recentSessions);
    const fatigueIndicators = this.detectFatigueIndicators(recentSessions);
    const volumeTrend = this.analyzeVolumeTrend(recentSessions);

    return {
      hasHistoricalData: true,
      recentTrend,
      consistency,
      fatigueIndicators,
      volumeTrend,
      sessionCount: recentSessions.length,
      averageReps: recentSessions.reduce((sum, s) => sum + s.reps, 0) / recentSessions.length
    };
  }

  /**
   * Calculate how well current reps align with goal-based ranges
   */
  private calculateGoalAlignment(
    currentReps: number,
    recommendedRange: { min: number; max: number; optimal: number }
  ): number {
    const { min, max, optimal } = recommendedRange;

    // Perfect alignment with optimal
    if (currentReps === optimal) return 100;

    // Within range
    if (currentReps >= min && currentReps <= max) {
      // Closer to optimal = higher alignment
      const distanceFromOptimal = Math.abs(currentReps - optimal);
      const rangeSize = max - min;
      return Math.max(70, 100 - (distanceFromOptimal / rangeSize) * 30);
    }

    // Outside range - calculate penalty
    const distanceFromRange = currentReps < min ? min - currentReps : currentReps - max;
    return Math.max(0, 70 - distanceFromRange * 10);
  }

  /**
   * Determine progression strategy based on context
   */
  private determineProgressionStrategy(
    currentReps: number,
    recommendedRange: { min: number; max: number; optimal: number },
    context: any,
    goalAlignment: number
  ): 'maintain' | 'increase_volume' | 'increase_intensity' | 'deload' {
    const { min, max, optimal } = recommendedRange;

    // Check for fatigue indicators
    if (context.fatigueIndicators?.length > 0) {
      return 'deload';
    }

    // If well-aligned and consistent, maintain
    if (goalAlignment >= 80 && context.consistency >= 70) {
      return 'maintain';
    }

    // If below optimal range, increase volume
    if (currentReps < min) {
      return 'increase_volume';
    }

    // If above optimal range, increase intensity
    if (currentReps > max) {
      return 'increase_intensity';
    }

    // Default to maintain if in range
    return 'maintain';
  }

  /**
   * Generate detailed reasoning for recommendations
   */
  private generateRecommendationReasoning(
    baseRecommendation: GoalBasedRepRange,
    context: any,
    goalAlignment: number,
    strategy: string
  ): string[] {
    const reasoning: string[] = [];

    // Base goal reasoning
    reasoning.push(...baseRecommendation.reasoning);

    // Context-based reasoning
    if (context.hasHistoricalData) {
      if (context.consistency >= 80) {
        reasoning.push(`Your rep consistency (${context.consistency.toFixed(0)}%) shows good form and technique.`);
      } else if (context.consistency < 60) {
        reasoning.push(`Your rep consistency (${context.consistency.toFixed(0)}%) suggests focusing on technique before progression.`);
      }

      if (context.fatigueIndicators?.length > 0) {
        reasoning.push('Recent fatigue indicators detected - considering deload period.');
      }
    }

    // Goal alignment reasoning
    if (goalAlignment >= 90) {
      reasoning.push('Current rep range is optimally aligned with your goals.');
    } else if (goalAlignment >= 70) {
      reasoning.push('Current rep range is reasonably aligned with your goals.');
    } else {
      reasoning.push('Current rep range could be better optimized for your goals.');
    }

    return reasoning;
  }

  /**
   * Generate alternative rep ranges if current alignment is poor
   */
  private generateAlternativeRanges(
    baseRecommendation: GoalBasedRepRange,
    context: any
  ): Array<{ range: any; reasoning: string; suitability: number }> {
    const alternatives: Array<{ range: any; reasoning: string; suitability: number }> = [];

    const { recommendedRange } = baseRecommendation;

    // Alternative 1: More conservative range
    if (recommendedRange.max - recommendedRange.min > 4) {
      const conservativeRange = {
        min: Math.max(1, recommendedRange.min - 2),
        max: recommendedRange.max - 2,
        optimal: recommendedRange.optimal - 1
      };
      alternatives.push({
        range: conservativeRange,
        reasoning: 'More conservative range for technique focus or recovery',
        suitability: context.fatigueIndicators?.length > 0 ? 85 : 60
      });
    }

    // Alternative 2: More aggressive range
    if (context.consistency >= 80 && context.fatigueIndicators?.length === 0) {
      const aggressiveRange = {
        min: recommendedRange.min + 1,
        max: recommendedRange.max + 2,
        optimal: recommendedRange.optimal + 1
      };
      alternatives.push({
        range: aggressiveRange,
        reasoning: 'More challenging range for experienced lifters with good consistency',
        suitability: 75
      });
    }

    return alternatives;
  }

  /**
   * Get comprehensive rep range matrix for all combinations
   */
  private getRepRangeMatrix(): GoalBasedRepRange[] {
    return [
      // Strength Focus
      {
        goal: 'strength_increase',
        experienceLevel: 'beginner',
        trainingFrequency: 2,
        recommendedRange: { min: 3, max: 6, optimal: 5 },
        reasoning: [
          'Strength training for beginners emphasizes technique over heavy loads',
          'Lower rep ranges allow focus on form with moderate weights',
          '2x/week frequency supports strength gains with adequate recovery'
        ]
      },
      {
        goal: 'strength_increase',
        experienceLevel: 'beginner',
        trainingFrequency: 3,
        recommendedRange: { min: 4, max: 7, optimal: 6 },
        reasoning: [
          '3x/week training allows slightly higher volume for strength development',
          'Still emphasizes technique with moderate rep ranges',
          'Balanced approach for beginners building strength foundation'
        ]
      },
      {
        goal: 'strength_increase',
        experienceLevel: 'intermediate',
        trainingFrequency: 3,
        recommendedRange: { min: 3, max: 6, optimal: 5 },
        reasoning: [
          'Intermediate lifters can handle lower reps with heavier loads',
          'Focus on maximal strength development',
          '3x/week frequency optimizes strength gains'
        ]
      },
      {
        goal: 'strength_increase',
        experienceLevel: 'intermediate',
        trainingFrequency: 4,
        recommendedRange: { min: 2, max: 5, optimal: 4 },
        reasoning: [
          '4x/week allows more frequent strength work',
          'Very low reps emphasize maximal strength',
          'Requires good recovery management'
        ]
      },
      {
        goal: 'strength_increase',
        experienceLevel: 'advanced',
        trainingFrequency: 4,
        recommendedRange: { min: 1, max: 4, optimal: 3 },
        reasoning: [
          'Advanced lifters use very low reps for maximal strength',
          'Focus on heavy compound movements',
          '4x/week frequency supports elite-level strength training'
        ]
      },

      // Hypertrophy Focus
      {
        goal: 'muscle_gain',
        experienceLevel: 'beginner',
        trainingFrequency: 3,
        recommendedRange: { min: 8, max: 12, optimal: 10 },
        reasoning: [
          'Hypertrophy training requires moderate rep ranges',
          '8-12 rep range optimal for muscle growth in beginners',
          '3x/week frequency provides adequate volume and recovery'
        ]
      },
      {
        goal: 'muscle_gain',
        experienceLevel: 'intermediate',
        trainingFrequency: 4,
        recommendedRange: { min: 8, max: 12, optimal: 10 },
        reasoning: [
          'Intermediate lifters can handle higher volume',
          '8-12 rep range remains optimal for hypertrophy',
          '4x/week allows more frequent muscle group training'
        ]
      },
      {
        goal: 'muscle_gain',
        experienceLevel: 'intermediate',
        trainingFrequency: 5,
        recommendedRange: { min: 9, max: 13, optimal: 11 },
        reasoning: [
          '5x/week training increases total volume capacity',
          'Slightly higher reps to manage fatigue',
          'Focus on muscle group specialization'
        ]
      },
      {
        goal: 'muscle_gain',
        experienceLevel: 'advanced',
        trainingFrequency: 5,
        recommendedRange: { min: 8, max: 12, optimal: 10 },
        reasoning: [
          'Advanced lifters can maintain optimal hypertrophy ranges',
          'High training frequency requires precise periodization',
          'Focus on muscle group balance and recovery'
        ]
      },
      {
        goal: 'muscle_gain',
        experienceLevel: 'advanced',
        trainingFrequency: 6,
        recommendedRange: { min: 9, max: 13, optimal: 11 },
        reasoning: [
          '6x/week elite training requires volume management',
          'Slightly higher reps prevent overtraining',
          'Advanced periodization crucial for sustained growth'
        ]
      },

      // Fat Loss Focus
      {
        goal: 'fat_loss',
        experienceLevel: 'beginner',
        trainingFrequency: 3,
        recommendedRange: { min: 10, max: 15, optimal: 12 },
        reasoning: [
          'Fat loss training combines hypertrophy with metabolic stress',
          'Higher rep ranges increase calorie burn',
          '3x/week frequency supports consistent training during deficit'
        ]
      },
      {
        goal: 'fat_loss',
        experienceLevel: 'intermediate',
        trainingFrequency: 4,
        recommendedRange: { min: 12, max: 16, optimal: 14 },
        reasoning: [
          'Intermediate lifters can handle higher volume for fat loss',
          'Increased metabolic stress from higher reps',
          '4x/week maintains consistency during cutting phase'
        ]
      },

      // General Fitness (Default)
      {
        goal: 'general_fitness',
        experienceLevel: 'beginner',
        trainingFrequency: 3,
        recommendedRange: { min: 8, max: 15, optimal: 12 },
        reasoning: [
          'General fitness benefits from moderate rep ranges',
          'Wide range allows flexibility based on exercise type',
          'Balanced approach for overall conditioning'
        ]
      },
      {
        goal: 'general_fitness',
        experienceLevel: 'intermediate',
        trainingFrequency: 3,
        recommendedRange: { min: 8, max: 15, optimal: 12 },
        reasoning: [
          'Intermediate general fitness maintains moderate ranges',
          'Allows exercise variety and technique work',
          'Balanced volume for overall development'
        ]
      },
      {
        goal: 'general_fitness',
        experienceLevel: 'advanced',
        trainingFrequency: 4,
        recommendedRange: { min: 6, max: 20, optimal: 12 },
        reasoning: [
          'Advanced general fitness allows wide rep range flexibility',
          'Can vary based on training focus and recovery',
          'Supports diverse training methodologies'
        ]
      }
    ];
  }

  // Helper methods
  private async getRecentExerciseSessions(userId: string, exerciseId: string, weeks: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));

    const { data, error } = await supabase
      .from('set_logs')
      .select('reps, created_at')
      .eq('exercise_id', exerciseId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  private analyzeRepTrend(sessions: any[]): 'increasing' | 'stable' | 'decreasing' {
    if (sessions.length < 3) return 'stable';

    const recent = sessions.slice(0, Math.floor(sessions.length / 2));
    const earlier = sessions.slice(Math.floor(sessions.length / 2));

    const recentAvg = recent.reduce((sum, s) => sum + s.reps, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, s) => sum + s.reps, 0) / earlier.length;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateRepConsistency(sessions: any[]): number {
    if (sessions.length < 2) return 100;

    const reps = sessions.map(s => s.reps);
    const mean = reps.reduce((sum, r) => sum + r, 0) / reps.length;
    const variance = reps.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / reps.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation as consistency measure
    const cv = (stdDev / mean) * 100;
    return Math.max(0, Math.min(100, 100 - cv));
  }

  private detectFatigueIndicators(sessions: any[]): string[] {
    const indicators: string[] = [];

    if (sessions.length < 3) return indicators;

    // Check for declining performance
    const recent = sessions.slice(0, 3);
    const earlier = sessions.slice(3, 6);

    if (earlier.length >= 2) {
      const recentAvg = recent.reduce((sum, s) => sum + s.reps, 0) / recent.length;
      const earlierAvg = earlier.reduce((sum, s) => sum + s.reps, 0) / earlier.length;

      if (recentAvg < earlierAvg * 0.9) {
        indicators.push('performance_decline');
      }
    }

    // Check for high variability (inconsistent performance)
    const consistency = this.calculateRepConsistency(sessions);
    if (consistency < 60) {
      indicators.push('inconsistent_performance');
    }

    return indicators;
  }

  private analyzeVolumeTrend(sessions: any[]): 'increasing' | 'stable' | 'decreasing' {
    // Simplified volume trend (could be enhanced with weight data)
    return this.analyzeRepTrend(sessions);
  }
}

export const adaptiveRepSelector = new AdaptiveRepSelectorService();