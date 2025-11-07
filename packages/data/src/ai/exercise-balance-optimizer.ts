import { supabase } from '../supabase/client-mobile';
import { trainingContextTracker, TrainingLoadMetrics } from './training-context-tracker';

export interface MuscleGroupBalance {
  muscleGroup: string;
  currentVolume: number;
  targetVolume: number;
  balanceRatio: number; // 0-200 (100 = optimal)
  lastTrained: string;
  recoveryStatus: 'fresh' | 'optimal' | 'fatigued' | 'overtrained';
  priority: 'high' | 'medium' | 'low';
}

export interface ExerciseRecommendation {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: string[];
  priority: number; // 0-100
  reasoning: string[];
  expectedBenefit: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OvertrainingRisk {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskFactors: string[];
  muscleGroupRisks: Array<{
    muscleGroup: string;
    risk: 'low' | 'moderate' | 'high';
    indicators: string[];
  }>;
  recommendedActions: string[];
  recoveryTimeframe: string;
}

class ExerciseBalanceOptimizerService {
  private readonly MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
    'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'
  ];

  private readonly MUSCLE_GROUP_MAPPING: Record<string, string[]> = {
    // Chest exercises
    'Bench Press': ['Chest', 'Triceps', 'Shoulders'],
    'Incline Bench Press': ['Chest', 'Triceps', 'Shoulders'],
    'Decline Bench Press': ['Chest', 'Triceps'],
    'Chest Flyes': ['Chest'],
    'Push-ups': ['Chest', 'Triceps', 'Shoulders'],

    // Back exercises
    'Deadlift': ['Back', 'Hamstrings', 'Glutes'],
    'Pull-ups': ['Back', 'Biceps'],
    'Bent-over Rows': ['Back', 'Biceps'],
    'Lat Pulldowns': ['Back', 'Biceps'],
    'Face Pulls': ['Back', 'Shoulders'],

    // Shoulder exercises
    'Overhead Press': ['Shoulders', 'Triceps'],
    'Lateral Raises': ['Shoulders'],
    'Front Raises': ['Shoulders'],
    'Rear Delt Flyes': ['Back', 'Shoulders'],

    // Arm exercises
    'Bicep Curls': ['Biceps'],
    'Tricep Extensions': ['Triceps'],
    'Hammer Curls': ['Biceps', 'Forearms'],
    'Tricep Dips': ['Triceps', 'Chest'],

    // Leg exercises
    'Squats': ['Quads', 'Glutes', 'Hamstrings'],
    'Lunges': ['Quads', 'Glutes', 'Hamstrings'],
    'Leg Press': ['Quads', 'Glutes', 'Hamstrings'],
    'Leg Extensions': ['Quads'],
    'Leg Curls': ['Hamstrings'],
    'Calf Raises': ['Calves'],

    // Core exercises
    'Planks': ['Core'],
    'Russian Twists': ['Core'],
    'Crunches': ['Core'],
    'Dead Bugs': ['Core']
  };

  /**
   * Analyze muscle group balance for a user
   */
  async analyzeMuscleGroupBalance(
    userId: string,
    weeks: number = 4
  ): Promise<MuscleGroupBalance[]> {
    const sessions = await this.getRecentSessions(userId, weeks);

    if (sessions.length === 0) {
      return this.getDefaultBalance();
    }

    const muscleGroupVolumes = this.calculateMuscleGroupVolumes(sessions);
    const targetVolumes = this.calculateTargetVolumes(userId, weeks);

    return this.MUSCLE_GROUPS.map(muscleGroup => {
      const currentVolume = muscleGroupVolumes[muscleGroup] || 0;
      const targetVolume = targetVolumes[muscleGroup] || 100;
      const balanceRatio = targetVolume > 0 ? (currentVolume / targetVolume) * 100 : 100;

      const lastTrained = this.getLastTrainedDate(muscleGroup, sessions);
      const recoveryStatus = this.assessRecoveryStatus(muscleGroup, lastTrained, currentVolume);
      const priority = this.calculatePriority(balanceRatio, recoveryStatus);

      return {
        muscleGroup,
        currentVolume,
        targetVolume,
        balanceRatio: Math.round(balanceRatio),
        lastTrained,
        recoveryStatus,
        priority
      };
    });
  }

  /**
   * Generate exercise recommendations based on balance analysis
   */
  async generateExerciseRecommendations(
    userId: string,
    availableExercises: Array<{ id: string; name: string; muscle_groups?: string[] }>,
    currentWorkoutExercises: string[] = []
  ): Promise<ExerciseRecommendation[]> {
    const balanceAnalysis = await this.analyzeMuscleGroupBalance(userId);
    const overtrainingRisk = await this.assessOvertrainingRisk(userId);

    const recommendations: ExerciseRecommendation[] = [];

    for (const exercise of availableExercises) {
      // Skip if already in current workout
      if (currentWorkoutExercises.includes(exercise.id)) {
        continue;
      }

      const muscleGroups = this.getExerciseMuscleGroups(exercise);
      const priority = this.calculateExercisePriority(
        exercise,
        muscleGroups,
        balanceAnalysis,
        overtrainingRisk
      );

      if (priority > 20) { // Only recommend exercises with meaningful priority
        const reasoning = this.generateExerciseReasoning(
          exercise,
          muscleGroups,
          balanceAnalysis,
          overtrainingRisk
        );

        const expectedBenefit = this.calculateExpectedBenefit(
          muscleGroups,
          balanceAnalysis
        );

        const riskLevel = this.assessExerciseRisk(
          exercise,
          muscleGroups,
          overtrainingRisk
        );

        recommendations.push({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          muscleGroups,
          priority: Math.round(priority),
          reasoning,
          expectedBenefit,
          riskLevel
        });
      }
    }

    // Sort by priority and return top recommendations
    return recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);
  }

  /**
   * Assess overtraining risk across muscle groups
   */
  async assessOvertrainingRisk(userId: string): Promise<OvertrainingRisk> {
    const balanceAnalysis = await this.analyzeMuscleGroupBalance(userId);
    const trainingLoad = await trainingContextTracker.calculateTrainingLoad(userId, 4);

    const riskFactors: string[] = [];
    const muscleGroupRisks: Array<{
      muscleGroup: string;
      risk: 'low' | 'moderate' | 'high';
      indicators: string[];
    }> = [];

    let overallRiskScore = 0;

    for (const muscle of balanceAnalysis) {
      const indicators: string[] = [];
      let muscleRiskScore = 0;

      // Volume imbalance risk
      if (muscle.balanceRatio > 150) {
        indicators.push('overtrained');
        muscleRiskScore += 30;
        riskFactors.push(`${muscle.muscleGroup} overtrained (${muscle.balanceRatio}% of target)`);
      } else if (muscle.balanceRatio < 50) {
        indicators.push('undertrained');
        muscleRiskScore += 10;
      }

      // Recovery status risk
      if (muscle.recoveryStatus === 'overtrained') {
        indicators.push('poor recovery');
        muscleRiskScore += 40;
        riskFactors.push(`${muscle.muscleGroup} showing poor recovery`);
      } else if (muscle.recoveryStatus === 'fatigued') {
        indicators.push('fatigued');
        muscleRiskScore += 20;
      }

      // Training load integration
      if (trainingLoad.overtrainingRisk === 'high' || trainingLoad.overtrainingRisk === 'critical') {
        muscleRiskScore += 25;
        riskFactors.push('High overall training load detected');
      }

      overallRiskScore += muscleRiskScore;

      const risk: 'low' | 'moderate' | 'high' = muscleRiskScore >= 60 ? 'high' :
                                                  muscleRiskScore >= 30 ? 'moderate' : 'low';

      if (indicators.length > 0) {
        muscleGroupRisks.push({
          muscleGroup: muscle.muscleGroup,
          risk,
          indicators
        });
      }
    }

    // Determine overall risk
    const overallRisk: 'low' | 'moderate' | 'high' | 'critical' =
      overallRiskScore >= 200 ? 'critical' :
      overallRiskScore >= 120 ? 'high' :
      overallRiskScore >= 60 ? 'moderate' : 'low';

    // Generate recommended actions
    const recommendedActions = this.generateRiskMitigationActions(
      overallRisk,
      riskFactors,
      trainingLoad
    );

    // Estimate recovery timeframe
    const recoveryTimeframe = this.estimateRecoveryTimeframe(overallRisk, trainingLoad);

    return {
      overallRisk,
      riskFactors,
      muscleGroupRisks,
      recommendedActions,
      recoveryTimeframe
    };
  }

  // Helper methods

  private async getRecentSessions(userId: string, weeks: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));

    const { data, error } = await supabase
      .from('workout_sessions')
      .select(`
        id,
        session_date,
        set_logs(
          exercise_id,
          weight_kg,
          reps,
          exercise_definitions!inner(name)
        )
      `)
      .eq('user_id', userId)
      .gte('session_date', cutoffDate.toISOString())
      .not('completed_at', 'is', null)
      .order('session_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private getDefaultBalance(): MuscleGroupBalance[] {
    return this.MUSCLE_GROUPS.map(muscleGroup => ({
      muscleGroup,
      currentVolume: 0,
      targetVolume: 100,
      balanceRatio: 0,
      lastTrained: new Date(0).toISOString(),
      recoveryStatus: 'fresh' as const,
      priority: 'low' as const
    }));
  }

  private calculateMuscleGroupVolumes(sessions: any[]): Record<string, number> {
    const volumes: Record<string, number> = {};

    for (const session of sessions) {
      for (const setLog of session.set_logs || []) {
        const exerciseName = setLog.exercise_definitions?.name;
        if (!exerciseName) continue;

        const muscleGroups = this.getExerciseMuscleGroups({ name: exerciseName });
        const volume = (setLog.weight_kg || 0) * (setLog.reps || 0);

        for (const muscleGroup of muscleGroups) {
          volumes[muscleGroup] = (volumes[muscleGroup] || 0) + volume;
        }
      }
    }

    return volumes;
  }

  private calculateTargetVolumes(userId: string, weeks: number): Record<string, number> {
    // Simplified target calculation - could be enhanced with user profile data
    const baseTargets: Record<string, number> = {
      'Chest': 2000,
      'Back': 2500,
      'Shoulders': 1500,
      'Biceps': 800,
      'Triceps': 1000,
      'Quads': 3000,
      'Hamstrings': 1500,
      'Glutes': 2000,
      'Calves': 600,
      'Core': 1000
    };

    // Adjust based on training frequency (would be calculated from actual data)
    const frequencyMultiplier = 1.0; // Placeholder

    return Object.fromEntries(
      Object.entries(baseTargets).map(([muscle, volume]) => [
        muscle,
        volume * weeks * frequencyMultiplier
      ])
    );
  }

  private getLastTrainedDate(muscleGroup: string, sessions: any[]): string {
    for (const session of sessions) {
      for (const setLog of session.set_logs || []) {
        const exerciseName = setLog.exercise_definitions?.name;
        if (!exerciseName) continue;

        const muscleGroups = this.getExerciseMuscleGroups({ name: exerciseName });
        if (muscleGroups.includes(muscleGroup)) {
          return session.session_date;
        }
      }
    }
    return new Date(0).toISOString(); // Never trained
  }

  private assessRecoveryStatus(
    muscleGroup: string,
    lastTrained: string,
    currentVolume: number
  ): 'fresh' | 'optimal' | 'fatigued' | 'overtrained' {
    const daysSinceTrained = (Date.now() - new Date(lastTrained).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceTrained > 7) return 'fresh';
    if (daysSinceTrained > 4) return 'optimal';
    if (daysSinceTrained > 2) return 'fatigued';
    return 'overtrained';
  }

  private calculatePriority(
    balanceRatio: number,
    recoveryStatus: string
  ): 'high' | 'medium' | 'low' {
    if (balanceRatio < 50 && recoveryStatus === 'fresh') return 'high';
    if (balanceRatio < 75 || recoveryStatus === 'fatigued') return 'medium';
    return 'low';
  }

  private getExerciseMuscleGroups(exercise: { name: string; muscle_groups?: string[] }): string[] {
    // First check if exercise has explicit muscle groups
    if (exercise.muscle_groups && exercise.muscle_groups.length > 0) {
      return exercise.muscle_groups;
    }

    // Fall back to mapping
    return this.MUSCLE_GROUP_MAPPING[exercise.name] || ['Full Body'];
  }

  private calculateExercisePriority(
    exercise: any,
    muscleGroups: string[],
    balanceAnalysis: MuscleGroupBalance[],
    overtrainingRisk: OvertrainingRisk
  ): number {
    let priority = 0;

    for (const muscleGroup of muscleGroups) {
      const balance = balanceAnalysis.find(b => b.muscleGroup === muscleGroup);
      if (!balance) continue;

      // Base priority from balance ratio
      if (balance.balanceRatio < 75) {
        priority += (100 - balance.balanceRatio) * 0.5;
      }

      // Bonus for high priority muscle groups
      if (balance.priority === 'high') {
        priority += 20;
      } else if (balance.priority === 'medium') {
        priority += 10;
      }

      // Recovery status consideration
      if (balance.recoveryStatus === 'fresh') {
        priority += 15;
      } else if (balance.recoveryStatus === 'fatigued') {
        priority -= 10;
      } else if (balance.recoveryStatus === 'overtrained') {
        priority -= 20;
      }
    }

    // Risk adjustment
    if (overtrainingRisk.overallRisk === 'high') {
      priority *= 0.7;
    } else if (overtrainingRisk.overallRisk === 'critical') {
      priority *= 0.4;
    }

    return Math.max(0, Math.min(100, priority));
  }

  private generateExerciseReasoning(
    exercise: any,
    muscleGroups: string[],
    balanceAnalysis: MuscleGroupBalance[],
    overtrainingRisk: OvertrainingRisk
  ): string[] {
    const reasoning: string[] = [];

    for (const muscleGroup of muscleGroups) {
      const balance = balanceAnalysis.find(b => b.muscleGroup === muscleGroup);
      if (!balance) continue;

      if (balance.balanceRatio < 75) {
        reasoning.push(`${muscleGroup} needs more volume (${balance.balanceRatio}% of target)`);
      }

      if (balance.recoveryStatus === 'fresh') {
        reasoning.push(`${muscleGroup} has recovered well since last training`);
      }
    }

    if (overtrainingRisk.overallRisk !== 'low') {
      reasoning.push('Consider current overtraining risk when adding this exercise');
    }

    return reasoning;
  }

  private calculateExpectedBenefit(
    muscleGroups: string[],
    balanceAnalysis: MuscleGroupBalance[]
  ): string {
    const undertrainedGroups = muscleGroups.filter(muscle => {
      const balance = balanceAnalysis.find(b => b.muscleGroup === muscle);
      return balance && balance.balanceRatio < 75;
    });

    if (undertrainedGroups.length > 0) {
      return `Improves balance for ${undertrainedGroups.join(', ')}`;
    }

    return 'Maintains overall muscle group balance';
  }

  private assessExerciseRisk(
    exercise: any,
    muscleGroups: string[],
    overtrainingRisk: OvertrainingRisk
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Check if exercise targets overtrained muscle groups
    const overtrainedGroups = overtrainingRisk.muscleGroupRisks
      .filter(mg => mg.risk === 'high')
      .map(mg => mg.muscleGroup);

    const targetsOvertrained = muscleGroups.some(mg => overtrainedGroups.includes(mg));
    if (targetsOvertrained) {
      riskScore += 40;
    }

    // Overall risk consideration
    if (overtrainingRisk.overallRisk === 'high') {
      riskScore += 30;
    } else if (overtrainingRisk.overallRisk === 'critical') {
      riskScore += 50;
    }

    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private generateRiskMitigationActions(
    overallRisk: string,
    riskFactors: string[],
    trainingLoad: TrainingLoadMetrics
  ): string[] {
    const actions: string[] = [];

    if (overallRisk === 'critical') {
      actions.push('Take 1-2 weeks deload period');
      actions.push('Reduce training frequency by 50%');
      actions.push('Focus on light technique work only');
    } else if (overallRisk === 'high') {
      actions.push('Reduce training volume by 40-60%');
      actions.push('Increase rest days between sessions');
      actions.push('Prioritize recovery activities (sleep, nutrition)');
    } else if (overallRisk === 'moderate') {
      actions.push('Reduce volume by 20-30% for next 1-2 weeks');
      actions.push('Add extra rest days');
      actions.push('Monitor fatigue levels closely');
    }

    if (trainingLoad.loadIntensity === 'very_high') {
      actions.push('Implement periodized deload every 4-6 weeks');
    }

    return actions;
  }

  private estimateRecoveryTimeframe(overallRisk: string, trainingLoad: TrainingLoadMetrics): string {
    switch (overallRisk) {
      case 'critical': return '2-4 weeks';
      case 'high': return '1-2 weeks';
      case 'moderate': return '3-7 days';
      default: return 'No recovery period needed';
    }
  }
}

export const exerciseBalanceOptimizer = new ExerciseBalanceOptimizerService();