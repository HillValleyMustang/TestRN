import { supabase } from '../supabase/client-mobile';
import { exerciseBalanceOptimizer } from './exercise-balance-optimizer';
import { overtrainingDetector } from './overtraining-detector';
import { trainingContextTracker } from './training-context-tracker';

export interface InjuryConstraint {
  type: 'injury' | 'limitation' | 'medical_condition';
  severity: 'mild' | 'moderate' | 'severe';
  affectedAreas: string[];
  restrictedMovements: string[];
  allowedExercises: string[];
  restrictedExercises: string[];
  notes: string;
}

export interface ExerciseSubstitution {
  originalExerciseId: string;
  substituteExerciseId: string;
  substitutionReason: 'injury' | 'equipment' | 'availability' | 'progression';
  compatibilityScore: number; // 0-100
  muscleGroupMatch: number; // 0-100
  difficultyMatch: number; // 0-100
  equipmentMatch: number; // 0-100
  reasoning: string[];
}

export interface ProgramUpdateRecommendation {
  tPathId: string;
  changes: Array<{
    workoutIndex: number;
    exerciseIndex: number;
    action: 'replace' | 'remove' | 'add';
    originalExerciseId?: string;
    newExerciseId?: string;
    reasoning: string;
  }>;
  overallImpact: 'minor' | 'moderate' | 'significant';
  userNotification: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
  };
}

export interface RecoveryIntelligenceAlert {
  type: 'recovery_warning' | 'overtraining_risk' | 'fatigue_alert' | 'rest_recommendation';
  severity: 'low' | 'moderate' | 'high' | 'urgent';
  title: string;
  message: string;
  actionable: boolean;
  suggestedActions: string[];
  timeframe: string;
  context: {
    currentLoad: number;
    recoveryDemand: number;
    riskLevel: string;
    lastSessionDate: string;
  };
}

class DynamicProgramManagerService {
  /**
   * Analyze user constraints from profile health notes
   */
  async analyzeUserConstraints(userId: string): Promise<InjuryConstraint[]> {
    // Get user profile health notes
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('health_notes')
      .eq('id', userId)
      .single();

    if (error || !profile?.health_notes) {
      return [];
    }

    return this.parseHealthNotes(profile.health_notes);
  }

  /**
   * Generate exercise substitutions based on constraints and context
   */
  async generateExerciseSubstitutions(
    userId: string,
    exerciseId: string,
    constraints: InjuryConstraint[],
    availableExercises: Array<{ id: string; name: string; muscle_groups?: string[] }>
  ): Promise<ExerciseSubstitution[]> {
    const substitutions: ExerciseSubstitution[] = [];

    // Get original exercise details
    const originalExercise = availableExercises.find(ex => ex.id === exerciseId);
    if (!originalExercise) return substitutions;

    for (const candidate of availableExercises) {
      if (candidate.id === exerciseId) continue;

      const substitution = await this.evaluateSubstitution(
        originalExercise,
        candidate,
        constraints,
        userId
      );

      if (substitution) {
        substitutions.push(substitution);
      }
    }

    // Sort by compatibility score
    return substitutions.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  /**
   * Assess program for constraint compliance and recommend updates
   */
  async assessProgramForConstraints(
    userId: string,
    tPathId: string
  ): Promise<ProgramUpdateRecommendation | null> {
    const constraints = await this.analyzeUserConstraints(userId);
    if (constraints.length === 0) return null;

    // Get current T-Path exercises
    const { data: tPathExercises, error } = await supabase
      .from('t_path_exercises')
      .select(`
        id,
        exercise_id,
        order_index,
        t_path_workouts!inner(order_index)
      `)
      .eq('t_path_id', tPathId)
      .order('t_path_workouts.order_index', { ascending: true })
      .order('order_index', { ascending: true });

    if (error || !tPathExercises) return null;

    const changes: ProgramUpdateRecommendation['changes'] = [];
    let hasSignificantChanges = false;

    // Group exercises by workout
    const workoutGroups: { [key: number]: typeof tPathExercises } = {};
    tPathExercises.forEach(exercise => {
      // Simplify - just use a default grouping for now
      const workoutIndex = 0; // Placeholder - would need proper workout indexing
      if (!workoutGroups[workoutIndex]) {
        workoutGroups[workoutIndex] = [];
      }
      workoutGroups[workoutIndex].push(exercise);
    });

    // Analyze each workout
    for (const [workoutIndex, exercises] of Object.entries(workoutGroups)) {
      for (const [exerciseIndex, exercise] of exercises.entries()) {
        const conflicts = this.checkExerciseConstraints(exercise.exercise_id, constraints);

        if (conflicts.length > 0) {
          // Find suitable substitution
          const availableExercises = await this.getAvailableExercises(userId);
          const substitutions = await this.generateExerciseSubstitutions(
            userId,
            exercise.exercise_id,
            constraints,
            availableExercises
          );

          if (substitutions.length > 0) {
            const bestSubstitution = substitutions[0];
            changes.push({
              workoutIndex: parseInt(workoutIndex),
              exerciseIndex,
              action: 'replace',
              originalExerciseId: exercise.exercise_id,
              newExerciseId: bestSubstitution.substituteExerciseId,
              reasoning: `Exercise conflicts with health constraints: ${conflicts.join(', ')}. Replaced with ${bestSubstitution.reasoning.join(', ')}`
            });
            hasSignificantChanges = true;
          } else {
            // No suitable substitution found
            changes.push({
              workoutIndex: parseInt(workoutIndex),
              exerciseIndex,
              action: 'remove',
              originalExerciseId: exercise.exercise_id,
              reasoning: `Exercise conflicts with health constraints: ${conflicts.join(', ')}. No suitable alternative found.`
            });
            hasSignificantChanges = true;
          }
        }
      }
    }

    if (changes.length === 0) return null;

    const overallImpact = hasSignificantChanges ? 'significant' : 'moderate';

    return {
      tPathId,
      changes,
      overallImpact,
      userNotification: {
        title: 'Program Updated for Safety',
        message: `Your workout program has been adjusted to accommodate your health constraints. ${changes.length} exercise(s) were modified.`,
        type: 'info'
      }
    };
  }

  /**
   * Generate recovery intelligence alerts
   */
  async generateRecoveryAlerts(userId: string): Promise<RecoveryIntelligenceAlert[]> {
    const alerts: RecoveryIntelligenceAlert[] = [];

    // Get current training context
    const context = await trainingContextTracker.generateTrainingContextSummary(userId);
    const overtrainingAssessment = await overtrainingDetector.assessOvertrainingRisk(userId);

    // Recovery demand alert
    if (context.recoveryFactors.currentRecoveryDemand > 70) {
      alerts.push({
        type: 'recovery_warning',
        severity: context.recoveryFactors.currentRecoveryDemand > 85 ? 'high' : 'moderate',
        title: 'High Recovery Demand Detected',
        message: `Your current training load requires ${context.recoveryFactors.currentRecoveryDemand}% recovery capacity. Consider additional rest or lighter sessions.`,
        actionable: true,
        suggestedActions: [
          'Take 1-2 extra rest days this week',
          'Reduce volume by 20% in next session',
          'Prioritize sleep and nutrition'
        ],
        timeframe: 'Next 2-3 days',
        context: {
          currentLoad: context.trainingLoadMetrics.currentLoad,
          recoveryDemand: context.recoveryFactors.currentRecoveryDemand,
          riskLevel: overtrainingAssessment.overallRisk,
          lastSessionDate: context.analysisPeriod.endDate
        }
      });
    }

    // Overtraining risk alert
    if (overtrainingAssessment.overallRisk !== 'low') {
      const severity = overtrainingAssessment.overallRisk === 'critical' ? 'urgent' :
                      overtrainingAssessment.overallRisk === 'high' ? 'high' : 'moderate';

      alerts.push({
        type: 'overtraining_risk',
        severity,
        title: `${overtrainingAssessment.overallRisk.charAt(0).toUpperCase() + overtrainingAssessment.overallRisk.slice(1)} Overtraining Risk`,
        message: overtrainingAssessment.recommendedActions[0]?.action || 'Monitor training load closely',
        actionable: true,
        suggestedActions: overtrainingAssessment.recommendedActions.slice(0, 3).map(a => a.action),
        timeframe: overtrainingAssessment.reassessmentDate,
        context: {
          currentLoad: context.trainingLoadMetrics.currentLoad,
          recoveryDemand: context.recoveryFactors.currentRecoveryDemand,
          riskLevel: overtrainingAssessment.overallRisk,
          lastSessionDate: context.analysisPeriod.endDate
        }
      });
    }

    // Fatigue pattern alert
    const fatiguePatterns = overtrainingAssessment.primaryPatterns || [];
    if (fatiguePatterns.length > 0) {
      const mostSevere = fatiguePatterns.sort((a, b) =>
        (b.severity === 'critical' ? 4 : b.severity === 'high' ? 3 : b.severity === 'moderate' ? 2 : 1) -
        (a.severity === 'critical' ? 4 : a.severity === 'high' ? 3 : a.severity === 'moderate' ? 2 : 1)
      )[0];

      alerts.push({
        type: 'fatigue_alert',
        severity: mostSevere.severity === 'critical' ? 'urgent' :
                 mostSevere.severity === 'high' ? 'high' : 'moderate',
        title: `${mostSevere.pattern.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Detected`,
        message: mostSevere.indicators[0] || 'Fatigue pattern identified in training data',
        actionable: true,
        suggestedActions: ['Reduce training intensity', 'Increase recovery time', 'Monitor symptoms'],
        timeframe: 'Immediate attention required',
        context: {
          currentLoad: context.trainingLoadMetrics.currentLoad,
          recoveryDemand: context.recoveryFactors.currentRecoveryDemand,
          riskLevel: overtrainingAssessment.overallRisk,
          lastSessionDate: context.analysisPeriod.endDate
        }
      });
    }

    return alerts;
  }

  // Helper methods

  private parseHealthNotes(healthNotes: string): InjuryConstraint[] {
    const constraints: InjuryConstraint[] = [];
    const notes = healthNotes.toLowerCase();

    // Parse common injury patterns
    const injuryPatterns = [
      {
        keywords: ['knee', 'knees', 'acl', 'meniscus', 'patellar'],
        affectedAreas: ['knees'],
        restrictedMovements: ['squats', 'lunges', 'jumps', 'deep knee flexion'],
        type: 'injury' as const
      },
      {
        keywords: ['shoulder', 'shoulders', 'rotator cuff', 'impingement'],
        affectedAreas: ['shoulders'],
        restrictedMovements: ['overhead press', 'lateral raises', 'pull-ups'],
        type: 'injury' as const
      },
      {
        keywords: ['back', 'lower back', 'lumbar', 'herniated disc', 'sciatica'],
        affectedAreas: ['lower back'],
        restrictedMovements: ['deadlifts', 'heavy squats', 'overhead movements'],
        type: 'injury' as const
      },
      {
        keywords: ['wrist', 'wrists', 'carpal tunnel'],
        affectedAreas: ['wrists'],
        restrictedMovements: ['push-ups', 'planks', 'heavy gripping'],
        type: 'injury' as const
      },
      {
        keywords: ['elbow', 'elbows', 'tennis elbow', 'golfer elbow'],
        affectedAreas: ['elbows'],
        restrictedMovements: ['pull-ups', 'dips', 'heavy curls'],
        type: 'injury' as const
      }
    ];

    for (const pattern of injuryPatterns) {
      const hasKeywords = pattern.keywords.some(keyword => notes.includes(keyword));
      if (hasKeywords) {
        // Determine severity from context
        let severity: 'mild' | 'moderate' | 'severe' = 'moderate';
        if (notes.includes('severe') || notes.includes('serious')) severity = 'severe';
        if (notes.includes('mild') || notes.includes('minor')) severity = 'mild';

        constraints.push({
          type: pattern.type,
          severity,
          affectedAreas: pattern.affectedAreas,
          restrictedMovements: pattern.restrictedMovements,
          allowedExercises: [], // Would need more sophisticated parsing
          restrictedExercises: [], // Would need exercise database matching
          notes: `Detected ${pattern.affectedAreas.join(', ')} concerns from health notes`
        });
      }
    }

    return constraints;
  }

  private async evaluateSubstitution(
    original: any,
    candidate: any,
    constraints: InjuryConstraint[],
    userId: string
  ): Promise<ExerciseSubstitution | null> {
    // Check if candidate conflicts with constraints
    const conflicts = this.checkExerciseConstraints(candidate.id, constraints);
    if (conflicts.length > 0) return null;

    // Calculate compatibility scores
    const muscleGroupMatch = this.calculateMuscleGroupMatch(original, candidate);
    const difficultyMatch = this.calculateDifficultyMatch(original, candidate);
    const equipmentMatch = await this.calculateEquipmentMatch(candidate, userId);

    // Determine substitution reason
    let substitutionReason: ExerciseSubstitution['substitutionReason'] = 'equipment';
    let reasoning: string[] = [];

    if (constraints.length > 0) {
      substitutionReason = 'injury';
      reasoning.push('Avoids movements conflicting with health constraints');
    } else if (equipmentMatch < 70) {
      reasoning.push('Better matches available equipment');
    } else {
      substitutionReason = 'progression';
      reasoning.push('Provides appropriate progression or regression');
    }

    if (muscleGroupMatch > 80) {
      reasoning.push('Excellent muscle group match');
    } else if (muscleGroupMatch > 60) {
      reasoning.push('Good muscle group match');
    }

    const compatibilityScore = Math.round(
      (muscleGroupMatch * 0.5) +
      (difficultyMatch * 0.3) +
      (equipmentMatch * 0.2)
    );

    return {
      originalExerciseId: original.id,
      substituteExerciseId: candidate.id,
      substitutionReason,
      compatibilityScore,
      muscleGroupMatch,
      difficultyMatch,
      equipmentMatch,
      reasoning
    };
  }

  private checkExerciseConstraints(exerciseId: string, constraints: InjuryConstraint[]): string[] {
    // This would need a comprehensive exercise database with movement patterns
    // For now, return empty array (no conflicts detected)
    // In production, this would check against exercise movement patterns
    return [];
  }

  private calculateMuscleGroupMatch(original: any, candidate: any): number {
    // Simplified muscle group matching
    // In production, would compare detailed muscle activation data
    const originalGroups = original.muscle_groups || [];
    const candidateGroups = candidate.muscle_groups || [];

    if (originalGroups.length === 0 || candidateGroups.length === 0) return 50;

    const overlap = originalGroups.filter((group: string) => candidateGroups.includes(group)).length;
    const maxGroups = Math.max(originalGroups.length, candidateGroups.length);

    return Math.round((overlap / maxGroups) * 100);
  }

  private calculateDifficultyMatch(original: any, candidate: any): number {
    // Simplified difficulty matching
    // In production, would use exercise difficulty ratings
    return 75; // Placeholder
  }

  private async calculateEquipmentMatch(exercise: any, userId: string): Promise<number> {
    // Check if user has required equipment
    // This would query user's gym equipment
    return 85; // Placeholder
  }

  private async getAvailableExercises(userId: string): Promise<Array<{ id: string; name: string; muscle_groups?: string[] }>> {
    // Get user's available exercises
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, muscle_groups')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('is_active', true)
      .order('name');

    if (error) return [];
    return data || [];
  }
}

export const dynamicProgramManager = new DynamicProgramManagerService();