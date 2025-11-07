import { supabase } from '../supabase/client-mobile';
import { trainingContextTracker, TrainingLoadMetrics } from './training-context-tracker';

export type PeriodizationPhase = 'accumulation' | 'intensification' | 'realization' | 'deload';

export interface PeriodizationCycle {
  id: string;
  userId: string;
  startDate: string;
  currentPhase: PeriodizationPhase;
  phaseStartDate: string;
  phaseDurationWeeks: number;
  totalDurationWeeks: number;
  completedPhases: PeriodizationPhase[];
  nextPhase: PeriodizationPhase | null;
  progressPercentage: number;
}

export interface PhaseCharacteristics {
  phase: PeriodizationPhase;
  volumeMultiplier: number; // 0.7-1.3
  intensityMultiplier: number; // 0.8-1.1
  repRangeAdjustment: number; // -2 to +2 reps
  restPeriodAdjustment: number; // -10 to +10 seconds
  focus: string;
  durationWeeks: number;
  transitionTriggers: string[];
}

export interface PeriodizationRecommendation {
  recommendedPhase: PeriodizationPhase;
  reasoning: string[];
  expectedBenefits: string[];
  transitionTimeline: string;
  riskLevel: 'low' | 'medium' | 'high';
  alternativePhases?: Array<{
    phase: PeriodizationPhase;
    reasoning: string;
    suitability: number;
  }>;
}

class PeriodizationManagerService {
  private readonly PHASE_CHARACTERISTICS: Record<PeriodizationPhase, PhaseCharacteristics> = {
    accumulation: {
      phase: 'accumulation',
      volumeMultiplier: 1.2,
      intensityMultiplier: 0.85,
      repRangeAdjustment: 2,
      restPeriodAdjustment: -5,
      focus: 'Build work capacity and technique',
      durationWeeks: 4,
      transitionTriggers: [
        'Volume tolerance reached',
        'Technique improvements plateau',
        'Ready for intensity increase'
      ]
    },
    intensification: {
      phase: 'intensification',
      volumeMultiplier: 0.9,
      intensityMultiplier: 1.05,
      repRangeAdjustment: -1,
      restPeriodAdjustment: 5,
      focus: 'Increase loading and strength',
      durationWeeks: 3,
      transitionTriggers: [
        'Strength gains slowing',
        'Recovery becoming challenging',
        'Peak competition approaching'
      ]
    },
    realization: {
      phase: 'realization',
      volumeMultiplier: 0.75,
      intensityMultiplier: 1.1,
      repRangeAdjustment: -2,
      restPeriodAdjustment: 10,
      focus: 'Peak performance and maximal strength',
      durationWeeks: 2,
      transitionTriggers: [
        'Peak performance achieved',
        'Competition completed',
        'Recovery needs increasing'
      ]
    },
    deload: {
      phase: 'deload',
      volumeMultiplier: 0.6,
      intensityMultiplier: 0.8,
      repRangeAdjustment: 1,
      restPeriodAdjustment: -10,
      focus: 'Recovery and regeneration',
      durationWeeks: 1,
      transitionTriggers: [
        'Recovery complete',
        'Motivation restored',
        'Ready to rebuild'
      ]
    }
  };

  private readonly PHASE_SEQUENCE: PeriodizationPhase[] = [
    'accumulation', 'intensification', 'realization', 'deload'
  ];

  /**
   * Get current periodization cycle for user
   */
  async getCurrentCycle(userId: string): Promise<PeriodizationCycle | null> {
    // In a real implementation, this would be stored in the database
    // For now, we'll generate based on recent training history
    return await this.generateCurrentCycle(userId);
  }

  /**
   * Generate periodization recommendation
   */
  async generatePeriodizationRecommendation(
    userId: string,
    currentCycle?: PeriodizationCycle
  ): Promise<PeriodizationRecommendation> {
    const trainingLoad = await trainingContextTracker.calculateTrainingLoad(userId, 4);
    const recoveryAnalysis = await trainingContextTracker.analyzeRestPeriods(userId, 8);

    const cycle = currentCycle || (await this.getCurrentCycle(userId)) || undefined;
    const recommendedPhase = this.determineRecommendedPhase(trainingLoad, recoveryAnalysis, cycle);

    const reasoning = this.generatePhaseReasoning(recommendedPhase, trainingLoad, recoveryAnalysis);
    const expectedBenefits = this.getPhaseBenefits(recommendedPhase);
    const transitionTimeline = this.calculateTransitionTimeline(recommendedPhase, cycle || undefined);
    const riskLevel = this.assessTransitionRisk(recommendedPhase, trainingLoad, recoveryAnalysis);

    const alternativePhases = this.generateAlternativePhases(
      recommendedPhase,
      trainingLoad,
      recoveryAnalysis
    );

    return {
      recommendedPhase,
      reasoning,
      expectedBenefits,
      transitionTimeline,
      riskLevel,
      alternativePhases: alternativePhases.length > 0 ? alternativePhases : undefined
    };
  }

  /**
   * Apply periodization adjustments to progression recommendations
   */
  applyPeriodizationAdjustments(
    baseRecommendation: any,
    currentPhase: PeriodizationPhase
  ): any {
    const phaseChars = this.PHASE_CHARACTERISTICS[currentPhase];

    // Adjust rep ranges based on phase
    const adjustedReps = Math.max(1, baseRecommendation.suggestedReps + phaseChars.repRangeAdjustment);

    // Adjust progression rate based on phase multipliers
    const adjustedWeightIncrease = baseRecommendation.suggestedWeight *
      (1 + (phaseChars.intensityMultiplier - 1) * 0.5); // Moderate intensity adjustment

    return {
      ...baseRecommendation,
      suggestedReps: adjustedReps,
      suggestedWeight: Math.round(adjustedWeightIncrease * 4) / 4, // Round to nearest 0.25kg
      periodizationAdjustments: {
        phase: currentPhase,
        volumeMultiplier: phaseChars.volumeMultiplier,
        intensityMultiplier: phaseChars.intensityMultiplier,
        focus: phaseChars.focus
      }
    };
  }

  /**
   * Check if phase transition is needed
   */
  async shouldTransitionPhase(userId: string, currentCycle: PeriodizationCycle): Promise<boolean> {
    const phaseChars = this.PHASE_CHARACTERISTICS[currentCycle.currentPhase];
    const phaseAgeWeeks = this.getPhaseAgeWeeks(currentCycle);

    // Time-based transition
    if (phaseAgeWeeks >= phaseChars.durationWeeks) {
      return true;
    }

    // Performance-based transition triggers
    const trainingLoad = await trainingContextTracker.calculateTrainingLoad(userId, 2);

    switch (currentCycle.currentPhase) {
      case 'accumulation':
        return trainingLoad.loadTrend === 'stable' && trainingLoad.currentLoad > 80;
      case 'intensification':
        return trainingLoad.recoveryDemand > 70 || trainingLoad.overtrainingRisk !== 'low';
      case 'realization':
        return trainingLoad.overtrainingRisk === 'high' || trainingLoad.overtrainingRisk === 'critical';
      case 'deload':
        return trainingLoad.recoveryDemand < 40 && trainingLoad.loadTrend === 'increasing';
      default:
        return false;
    }
  }

  // Helper methods

  private async generateCurrentCycle(userId: string): Promise<PeriodizationCycle> {
    const sessions = await this.getRecentSessions(userId, 12);
    const cycleStart = this.determineCycleStart(sessions);
    const currentPhase = this.determineCurrentPhase(sessions, cycleStart);

    const phaseStart = this.determinePhaseStart(currentPhase, sessions);
    const phaseAgeWeeks = Math.floor((Date.now() - new Date(phaseStart).getTime()) / (7 * 24 * 60 * 60 * 1000));

    const completedPhases = this.determineCompletedPhases(currentPhase);
    const nextPhase = this.determineNextPhase(currentPhase);

    const totalDurationWeeks = this.PHASE_SEQUENCE.length * 4; // Rough estimate
    const progressPercentage = (completedPhases.length / this.PHASE_SEQUENCE.length) * 100;

    return {
      id: `cycle_${userId}_${cycleStart}`,
      userId,
      startDate: cycleStart,
      currentPhase,
      phaseStartDate: phaseStart,
      phaseDurationWeeks: this.PHASE_CHARACTERISTICS[currentPhase].durationWeeks,
      totalDurationWeeks,
      completedPhases,
      nextPhase,
      progressPercentage
    };
  }

  private determineRecommendedPhase(
    trainingLoad: TrainingLoadMetrics,
    recoveryAnalysis: any,
    currentCycle?: PeriodizationCycle
  ): PeriodizationPhase {
    // High overtraining risk -> Deload
    if (trainingLoad.overtrainingRisk === 'critical') {
      return 'deload';
    }

    // Poor recovery -> Deload or Accumulation
    if (recoveryAnalysis.averageRestDays < 3) {
      return trainingLoad.currentLoad > 70 ? 'deload' : 'accumulation';
    }

    // Low training load -> Accumulation
    if (trainingLoad.currentLoad < 50) {
      return 'accumulation';
    }

    // Moderate load with good recovery -> Intensification
    if (trainingLoad.currentLoad >= 50 && trainingLoad.currentLoad <= 80 &&
        recoveryAnalysis.restConsistency > 70) {
      return 'intensification';
    }

    // High load with excellent recovery -> Realization
    if (trainingLoad.currentLoad > 80 && recoveryAnalysis.restConsistency > 80) {
      return 'realization';
    }

    // Default to accumulation for safety
    return 'accumulation';
  }

  private generatePhaseReasoning(
    phase: PeriodizationPhase,
    trainingLoad: TrainingLoadMetrics,
    recoveryAnalysis: any
  ): string[] {
    const reasoning: string[] = [];
    const phaseChars = this.PHASE_CHARACTERISTICS[phase];

    reasoning.push(phaseChars.focus);

    switch (phase) {
      case 'accumulation':
        if (trainingLoad.currentLoad < 50) {
          reasoning.push('Current training load is below optimal levels');
        }
        if (recoveryAnalysis.restConsistency < 70) {
          reasoning.push('Recovery patterns need stabilization before intensity increases');
        }
        break;

      case 'intensification':
        if (trainingLoad.currentLoad >= 50 && trainingLoad.currentLoad <= 80) {
          reasoning.push('Training load is at optimal level for progressive overload');
        }
        if (recoveryAnalysis.restConsistency > 70) {
          reasoning.push('Recovery capacity supports increased training intensity');
        }
        break;

      case 'realization':
        if (trainingLoad.currentLoad > 80) {
          reasoning.push('High training load indicates readiness for peak performance phase');
        }
        if (recoveryAnalysis.restConsistency > 80) {
          reasoning.push('Excellent recovery capacity supports maximal training intensity');
        }
        break;

      case 'deload':
        if (trainingLoad.overtrainingRisk === 'high' || trainingLoad.overtrainingRisk === 'critical') {
          reasoning.push('Overtraining risk requires recovery period');
        }
        if (recoveryAnalysis.averageRestDays < 3) {
          reasoning.push('Insufficient recovery time between sessions detected');
        }
        break;
    }

    return reasoning;
  }

  private getPhaseBenefits(phase: PeriodizationPhase): string[] {
    switch (phase) {
      case 'accumulation':
        return [
          'Build work capacity and technique',
          'Improve recovery efficiency',
          'Establish consistent training habits',
          'Minimize injury risk during base building'
        ];
      case 'intensification':
        return [
          'Increase maximal strength',
          'Improve neural adaptations',
          'Enhance work capacity at higher intensities',
          'Build confidence with heavier loads'
        ];
      case 'realization':
        return [
          'Achieve peak performance',
          'Maximize strength gains',
          'Optimize for competition or testing',
          'Demonstrate training progress'
        ];
      case 'deload':
        return [
          'Restore recovery capacity',
          'Reduce accumulated fatigue',
          'Prevent overtraining syndrome',
          'Maintain motivation and consistency'
        ];
    }
  }

  private calculateTransitionTimeline(phase: PeriodizationPhase, cycle?: PeriodizationCycle): string {
    if (!cycle) {
      return 'Start immediately - no current cycle detected';
    }

    const phaseAgeWeeks = this.getPhaseAgeWeeks(cycle);
    const recommendedDuration = this.PHASE_CHARACTERISTICS[cycle.currentPhase].durationWeeks;

    if (phaseAgeWeeks < recommendedDuration * 0.75) {
      return `Continue current phase for ${Math.ceil(recommendedDuration * 0.75 - phaseAgeWeeks)} more weeks`;
    } else if (phaseAgeWeeks < recommendedDuration) {
      return 'Transition at end of current phase (1-2 weeks)';
    } else {
      return 'Transition immediately - current phase duration exceeded';
    }
  }

  private assessTransitionRisk(
    phase: PeriodizationPhase,
    trainingLoad: TrainingLoadMetrics,
    recoveryAnalysis: any
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Risk factors for transitions
    if (phase === 'realization' && trainingLoad.overtrainingRisk !== 'low') {
      riskScore += 40; // High risk transitioning to peak when already fatigued
    }

    if (phase === 'deload' && trainingLoad.currentLoad < 30) {
      riskScore += 20; // Unnecessary deload when load is already low
    }

    if (recoveryAnalysis.restConsistency < 50) {
      riskScore += 30; // Poor recovery consistency increases transition risk
    }

    if (trainingLoad.loadTrend === 'decreasing' && phase !== 'deload') {
      riskScore += 25; // Declining performance suggests deload needed
    }

    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private generateAlternativePhases(
    recommendedPhase: PeriodizationPhase,
    trainingLoad: TrainingLoadMetrics,
    recoveryAnalysis: any
  ): Array<{ phase: PeriodizationPhase; reasoning: string; suitability: number }> {
    const alternatives: Array<{ phase: PeriodizationPhase; reasoning: string; suitability: number }> = [];

    // Generate contextually appropriate alternatives
    if (recommendedPhase === 'realization' && trainingLoad.overtrainingRisk !== 'low') {
      alternatives.push({
        phase: 'deload',
        reasoning: 'Overtraining risk suggests deload instead of peak phase',
        suitability: 80
      });
    }

    if (recommendedPhase === 'intensification' && recoveryAnalysis.restConsistency < 60) {
      alternatives.push({
        phase: 'accumulation',
        reasoning: 'Poor recovery consistency suggests continuing base building',
        suitability: 70
      });
    }

    if (recommendedPhase === 'deload' && trainingLoad.currentLoad < 40) {
      alternatives.push({
        phase: 'accumulation',
        reasoning: 'Training load already low, focus on quality volume instead',
        suitability: 65
      });
    }

    return alternatives;
  }

  private async getRecentSessions(userId: string, weeks: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('session_date, completed_at')
      .eq('user_id', userId)
      .gte('session_date', cutoffDate.toISOString())
      .not('completed_at', 'is', null)
      .order('session_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private determineCycleStart(sessions: any[]): string {
    if (sessions.length === 0) return new Date().toISOString();

    // Find the start of the most recent 10-week period with consistent training
    const sortedSessions = sessions.sort((a, b) =>
      new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
    );

    // Look for periods of consistent training (at least 3 sessions in 4 weeks)
    for (let i = 0; i < Math.max(0, sortedSessions.length - 6); i++) {
      const periodSessions = sortedSessions.slice(i, i + 6);
      const periodSpan = (new Date(periodSessions[periodSessions.length - 1].session_date).getTime() -
                         new Date(periodSessions[0].session_date).getTime()) / (7 * 24 * 60 * 60 * 1000);

      if (periodSpan <= 8 && periodSessions.length >= 4) {
        return periodSessions[0].session_date;
      }
    }

    // Default to 8 weeks ago
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    return eightWeeksAgo.toISOString();
  }

  private determineCurrentPhase(sessions: any[], cycleStart: string): PeriodizationPhase {
    const cycleAgeWeeks = Math.floor((Date.now() - new Date(cycleStart).getTime()) / (7 * 24 * 60 * 60 * 1000));

    // Simple phase determination based on cycle age
    if (cycleAgeWeeks < 4) return 'accumulation';
    if (cycleAgeWeeks < 7) return 'intensification';
    if (cycleAgeWeeks < 9) return 'realization';
    return 'deload';
  }

  private determinePhaseStart(phase: PeriodizationPhase, sessions: any[]): string {
    // Simplified - would need more sophisticated logic in production
    const phaseIndex = this.PHASE_SEQUENCE.indexOf(phase);
    const weeksIntoCycle = phaseIndex * 3; // Rough estimate

    const phaseStart = new Date();
    phaseStart.setDate(phaseStart.getDate() - (weeksIntoCycle * 7));
    return phaseStart.toISOString();
  }

  private determineCompletedPhases(currentPhase: PeriodizationPhase): PeriodizationPhase[] {
    const currentIndex = this.PHASE_SEQUENCE.indexOf(currentPhase);
    return this.PHASE_SEQUENCE.slice(0, currentIndex);
  }

  private determineNextPhase(currentPhase: PeriodizationPhase): PeriodizationPhase | null {
    const currentIndex = this.PHASE_SEQUENCE.indexOf(currentPhase);
    return currentIndex < this.PHASE_SEQUENCE.length - 1 ?
           this.PHASE_SEQUENCE[currentIndex + 1] : null;
  }

  private getPhaseAgeWeeks(cycle: PeriodizationCycle): number {
    return Math.floor((Date.now() - new Date(cycle.phaseStartDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
  }
}

export const periodizationManager = new PeriodizationManagerService();