import { supabase } from '../supabase/client-mobile';
import { trainingContextTracker, TrainingContextSummary } from './training-context-tracker';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type TrainingFrequency = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ProgressionFactors {
  baseIncrement: number; // 0.025-0.10 based on experience/frequency
  volumeMultiplier: number; // Reduce increment for high-volume sessions
  recoveryFactor: number; // Based on rest days and session intensity
  plateauAdjustment: number; // Reduce increment during stagnation
}

export interface TrainingContext {
  sessionDuration: number;
  restDaysSinceLast: number;
  weeklyVolume: number;
  currentStreak: number;
  averageIntensity: number;
  lastSessionDate: string | null;
}

export interface ProgressionRecommendation {
  suggestedWeight: number;
  suggestedReps: number;
  confidence: number; // 0-1
  reasoning: string[];
  alternativeOptions?: ProgressionOption[];
  plateauDetected?: boolean;
  deloadRecommended?: boolean;
}

export interface ProgressionOption {
  weight: number;
  reps: number;
  reasoning: string;
}

export interface UserProgressionProfile {
  experienceLevel: ExperienceLevel;
  trainingFrequency: TrainingFrequency;
  primaryGoal: 'muscle_gain' | 'fat_loss' | 'strength_increase' | null;
  preferredSessionLength: number | null;
  bodyMetrics: {
    heightCm: number | null;
    weightKg: number | null;
    bodyFatPct: number | null;
  };
}

class ProgressionEngine {
  /**
   * Calculate progression factors based on user profile and training context
   */
  private calculateProgressionFactors(
    profile: UserProgressionProfile,
    context: TrainingContext
  ): ProgressionFactors {
    // Base increment based on experience and frequency
    let baseIncrement = this.getBaseIncrement(profile.experienceLevel, profile.trainingFrequency);

    // Volume multiplier - reduce increment for high volume sessions
    const volumeMultiplier = Math.max(0.7, Math.min(1.0, 1 - (context.weeklyVolume / 10000) * 0.3));

    // Recovery factor based on rest days
    const recoveryFactor = this.calculateRecoveryFactor(context.restDaysSinceLast, profile.trainingFrequency);

    // Plateau adjustment - reduce increment if progress is stalling
    const plateauAdjustment = 1.0; // Will be enhanced with plateau detection

    return {
      baseIncrement,
      volumeMultiplier,
      recoveryFactor,
      plateauAdjustment
    };
  }

  /**
   * Get base increment percentage based on experience and frequency
   */
  private getBaseIncrement(experience: ExperienceLevel, frequency: TrainingFrequency): number {
    const baseRates: Record<ExperienceLevel, Record<TrainingFrequency, number>> = {
      beginner: {
        1: 0.10, // 10% - very aggressive for infrequent training
        2: 0.08, // 8%
        3: 0.06, // 6%
        4: 0.05, // 5%
        5: 0.04, // 4%
        6: 0.03, // 3%
        7: 0.025 // 2.5%
      },
      intermediate: {
        1: 0.07, // 7%
        2: 0.06, // 6%
        3: 0.05, // 5%
        4: 0.04, // 4%
        5: 0.035, // 3.5%
        6: 0.03, // 3%
        7: 0.025 // 2.5%
      },
      advanced: {
        1: 0.05, // 5%
        2: 0.04, // 4%
        3: 0.035, // 3.5%
        4: 0.03, // 3%
        5: 0.025, // 2.5%
        6: 0.02, // 2%
        7: 0.015 // 1.5%
      }
    };

    return baseRates[experience][frequency] || 0.05;
  }

  /**
   * Calculate recovery factor based on rest days
   */
  private calculateRecoveryFactor(restDays: number, targetFrequency: TrainingFrequency): number {
    if (restDays === 0) return 0.8; // Same day training - conservative
    if (restDays === 1) return 1.0; // Optimal recovery
    if (restDays === 2) return 0.95; // Good recovery
    if (restDays >= 3) return 0.9; // Extended rest - slightly conservative

    // For very infrequent training, be more aggressive
    if (targetFrequency <= 2 && restDays >= 7) return 1.1;

    return 1.0;
  }

  /**
   * Calculate progression factors with comprehensive training context
   */
  private calculateProgressionFactorsWithTrainingContext(
    profile: UserProgressionProfile,
    context: TrainingContext,
    trainingContextSummary: TrainingContextSummary
  ): ProgressionFactors {
    // Base increment based on experience and frequency
    let baseIncrement = this.getBaseIncrement(profile.experienceLevel, profile.trainingFrequency);

    // Volume multiplier - reduce increment for high volume sessions
    const volumeMultiplier = Math.max(0.7, Math.min(1.0, 1 - (context.weeklyVolume / 10000) * 0.3));

    // Enhanced recovery factor based on comprehensive training context
    const recoveryFactor = this.calculateEnhancedRecoveryFactor(
      context.restDaysSinceLast,
      profile.trainingFrequency,
      trainingContextSummary
    );

    // Plateau adjustment based on training context analysis
    const plateauAdjustment = this.calculatePlateauAdjustment(trainingContextSummary);

    return {
      baseIncrement,
      volumeMultiplier,
      recoveryFactor,
      plateauAdjustment
    };
  }

  /**
   * Calculate enhanced recovery factor using comprehensive training context
   */
  private calculateEnhancedRecoveryFactor(
    restDays: number,
    targetFrequency: TrainingFrequency,
    trainingContextSummary: TrainingContextSummary
  ): number {
    let recoveryFactor = this.calculateRecoveryFactor(restDays, targetFrequency);

    // Adjust based on training load intensity
    const loadIntensity = trainingContextSummary.trainingLoadMetrics.loadIntensity;
    if (loadIntensity === 'very_high') {
      recoveryFactor *= 0.9; // More conservative for very high load
    } else if (loadIntensity === 'low') {
      recoveryFactor *= 1.1; // More aggressive for low load
    }

    // Adjust based on recovery health
    const recoveryHealth = trainingContextSummary.recoveryFactors.currentRecoveryDemand;
    if (recoveryHealth > 70) {
      recoveryFactor *= 0.95; // Reduce progression if recovery demand is high
    }

    // Adjust based on overtraining risk
    const overtrainingRisk = trainingContextSummary.trainingLoadMetrics.overtrainingRisk;
    if (overtrainingRisk === 'high' || overtrainingRisk === 'critical') {
      recoveryFactor *= 0.8; // Very conservative if overtraining risk is high
    }

    return Math.max(0.5, Math.min(1.3, recoveryFactor)); // Clamp between 0.5 and 1.3
  }

  /**
   * Calculate plateau adjustment based on training context
   */
  private calculatePlateauAdjustment(trainingContextSummary: TrainingContextSummary): number {
    // Start with neutral adjustment
    let adjustment = 1.0;

    // Reduce progression if overtraining risk is high
    const overtrainingRisk = trainingContextSummary.trainingLoadMetrics.overtrainingRisk;
    if (overtrainingRisk === 'critical') {
      adjustment *= 0.7;
    } else if (overtrainingRisk === 'high') {
      adjustment *= 0.85;
    } else if (overtrainingRisk === 'moderate') {
      adjustment *= 0.95;
    }

    // Reduce progression if recovery demand is very high
    const recoveryDemand = trainingContextSummary.recoveryFactors.currentRecoveryDemand;
    if (recoveryDemand > 80) {
      adjustment *= 0.9;
    }

    // Increase progression if training load is very low (undertraining)
    const loadIntensity = trainingContextSummary.trainingLoadMetrics.loadIntensity;
    if (loadIntensity === 'low') {
      adjustment *= 1.1;
    }

    return Math.max(0.5, Math.min(1.2, adjustment)); // Clamp between 0.5 and 1.2
  }

  /**
   * Build enhanced reasoning with training context insights
   */
  private buildEnhancedReasoning(
    factors: ProgressionFactors,
    profile: UserProgressionProfile,
    context: TrainingContext,
    trainingContextSummary: TrainingContextSummary
  ): string[] {
    const reasoning: string[] = [];

    // Experience and frequency reasoning
    if (profile.trainingFrequency <= 2) {
      reasoning.push(`Low training frequency (${profile.trainingFrequency}x/week) allows for more aggressive progression`);
    } else if (profile.trainingFrequency >= 5) {
      reasoning.push(`High training frequency (${profile.trainingFrequency}x/week) requires conservative progression`);
    }

    // Recovery reasoning with training context
    if (context.restDaysSinceLast >= 3) {
      reasoning.push(`${context.restDaysSinceLast} rest days provide good recovery`);
    } else if (context.restDaysSinceLast === 0) {
      reasoning.push('Same-day training detected - being conservative');
    }

    // Training load insights
    const loadIntensity = trainingContextSummary.trainingLoadMetrics.loadIntensity;
    if (loadIntensity === 'very_high') {
      reasoning.push('High training load detected - reducing progression to prevent overtraining');
    } else if (loadIntensity === 'low') {
      reasoning.push('Low training load detected - can be more aggressive with progression');
    }

    // Recovery health insights
    const recoveryDemand = trainingContextSummary.recoveryFactors.currentRecoveryDemand;
    if (recoveryDemand > 70) {
      reasoning.push(`High recovery demand (${recoveryDemand}% of capacity) - being conservative`);
    }

    // Overtraining risk insights
    const overtrainingRisk = trainingContextSummary.trainingLoadMetrics.overtrainingRisk;
    if (overtrainingRisk === 'high' || overtrainingRisk === 'critical') {
      reasoning.push(`High overtraining risk detected - prioritizing recovery over progression`);
    }

    // Volume reasoning
    if (context.weeklyVolume > 5000) {
      reasoning.push(`High weekly volume (${Math.round(context.weeklyVolume)}kg) reduces progression rate`);
    }

    // Session duration insights
    const avgDuration = trainingContextSummary.sessionMetrics.averageDuration;
    if (avgDuration > 75) {
      reasoning.push(`Long session duration (${avgDuration}min) suggests high work capacity`);
    } else if (avgDuration < 45) {
      reasoning.push(`Short session duration (${avgDuration}min) allows for more frequent training`);
    }

    return reasoning;
  }

  /**
   * Generate alternative progression options based on training context
   */
  private generateAlternativeOptions(
    lastPerformance: { weight: number; reps: number },
    factors: ProgressionFactors,
    trainingContextSummary: TrainingContextSummary
  ): ProgressionOption[] {
    const options: ProgressionOption[] = [];

    // Conservative option (for high load/overtraining risk)
    if (trainingContextSummary.trainingLoadMetrics.overtrainingRisk !== 'low') {
      const conservativeIncrement = factors.baseIncrement * 0.7;
      const conservativeWeight = Math.round((lastPerformance.weight * (1 + conservativeIncrement)) * 4) / 4;
      options.push({
        weight: conservativeWeight,
        reps: lastPerformance.reps,
        reasoning: 'Conservative option for high training load - prioritizes recovery'
      });
    }

    // Aggressive option (for low load/undertraining)
    if (trainingContextSummary.trainingLoadMetrics.loadIntensity === 'low') {
      const aggressiveIncrement = factors.baseIncrement * 1.3;
      const aggressiveWeight = Math.round((lastPerformance.weight * (1 + aggressiveIncrement)) * 4) / 4;
      options.push({
        weight: aggressiveWeight,
        reps: Math.max(6, lastPerformance.reps - 1),
        reasoning: 'Aggressive option for low training load - can push harder'
      });
    }

    // Same weight, higher reps option (for technique focus)
    if (trainingContextSummary.sessionMetrics.averageDuration > 60) {
      options.push({
        weight: lastPerformance.weight,
        reps: Math.min(15, lastPerformance.reps + 2),
        reasoning: 'Focus on technique with same weight, higher reps'
      });
    }

    return options.slice(0, 2); // Limit to 2 alternative options
  }

  /**
   * Calculate confidence score based on factors and training context
   */
  private calculateConfidence(
    factors: ProgressionFactors,
    trainingContextSummary: TrainingContextSummary
  ): number {
    let confidence = 0.8; // Base confidence

    // Increase confidence with more consistent training
    const restConsistency = trainingContextSummary.restPeriodAnalysis.restConsistency;
    confidence += (restConsistency - 50) * 0.001; // Small boost for consistency

    // Decrease confidence with high overtraining risk
    const overtrainingRisk = trainingContextSummary.trainingLoadMetrics.overtrainingRisk;
    if (overtrainingRisk === 'high') confidence -= 0.1;
    if (overtrainingRisk === 'critical') confidence -= 0.2;

    // Increase confidence with good recovery health
    const recoveryEfficiency = trainingContextSummary.recoveryFactors.recoveryEfficiency;
    confidence += (recoveryEfficiency - 50) * 0.0005;

    return Math.max(0.3, Math.min(0.95, confidence)); // Clamp between 0.3 and 0.95
  }

  /**
   * Get user's progression profile from Supabase
   */
  async getUserProgressionProfile(userId: string): Promise<UserProgressionProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          primary_goal,
          preferred_session_length,
          height_cm,
          weight_kg,
          body_fat_pct,
          programme_type
        `)
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      // For now, derive experience level from programme type and other factors
      // This will be enhanced when we add explicit experience level field
      const experienceLevel = this.deriveExperienceLevel(data.programme_type);

      // Estimate training frequency from programme type
      const trainingFrequency = await this.calculateTrainingFrequency(userId);

      return {
        experienceLevel,
        trainingFrequency,
        primaryGoal: data.primary_goal,
        preferredSessionLength: data.preferred_session_length ? parseInt(data.preferred_session_length) : null,
        bodyMetrics: {
          heightCm: data.height_cm,
          weightKg: data.weight_kg,
          bodyFatPct: data.body_fat_pct
        }
      };
    } catch (error) {
      console.error('Error fetching user progression profile:', error);
      return null;
    }
  }

  /**
   * Derive experience level from programme type (temporary until explicit field added)
   */
  private deriveExperienceLevel(programmeType: string | null): ExperienceLevel {
    // Simple heuristic - will be replaced with explicit user selection
    if (!programmeType) return 'beginner';
    if (programmeType.includes('ulul')) return 'intermediate'; // Upper/Lower suggests more experience
    if (programmeType.includes('ppl')) return 'advanced'; // Push/Pull/Legs suggests advanced
    return 'beginner';
  }

  /**
   * Calculate training frequency from actual workout history
   */
  private async calculateTrainingFrequency(userId: string): Promise<TrainingFrequency> {
    try {
      const frequency = await trainingContextTracker.calculateActualTrainingFrequency(userId, 12);
      return frequency as TrainingFrequency;
    } catch (error) {
      console.error('[ProgressionEngine] Error calculating training frequency:', error);
      return 3; // Fallback to 3x/week
    }
  }

  /**
   * Calculate training context from recent workout history
   */
  async getTrainingContext(userId: string, exerciseId: string): Promise<TrainingContext> {
    try {
      // Get recent sessions
      const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select('id, session_date, completed_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('session_date', { ascending: false })
        .limit(10);

      if (error || !sessions || sessions.length === 0) {
        return this.getDefaultTrainingContext();
      }

      const lastSession = sessions[0];
      const lastSessionDate = new Date(lastSession.session_date);
      const now = new Date();
      const restDaysSinceLast = Math.floor((now.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate current streak
      let currentStreak = 0;
      const oneDayMs = 24 * 60 * 60 * 1000;
      let checkDate = new Date(lastSessionDate);

      for (const session of sessions) {
        const sessionDate = new Date(session.session_date);
        const daysDiff = Math.floor((checkDate.getTime() - sessionDate.getTime()) / oneDayMs);

        if (daysDiff <= 1) { // Within 1 day (allows for weekends)
          currentStreak++;
          checkDate = new Date(sessionDate.getTime() - oneDayMs); // Move back one day
        } else {
          break;
        }
      }

      // Calculate weekly volume (last 7 days)
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentSessions = sessions.filter((s: any) => new Date(s.session_date) >= weekAgo);

      let weeklyVolume = 0;
      let averageIntensity = 0;

      for (const session of recentSessions) {
        const { data: sets } = await supabase
          .from('set_logs')
          .select('weight_kg, reps')
          .eq('session_id', session.id);

        if (sets) {
          const sessionVolume = (sets as any[]).reduce((sum: number, set: any) =>
            sum + ((set.weight_kg || 0) * (set.reps || 0)), 0
          );
          weeklyVolume += sessionVolume;
          averageIntensity += sets.length > 0 ? sessionVolume / sets.length : 0;
        }
      }

      averageIntensity = recentSessions.length > 0 ? averageIntensity / recentSessions.length : 0;

      return {
        sessionDuration: 60, // Will be enhanced with actual duration tracking
        restDaysSinceLast: restDaysSinceLast,
        weeklyVolume,
        currentStreak,
        averageIntensity,
        lastSessionDate: lastSession.session_date
      };
    } catch (error) {
      console.error('Error calculating training context:', error);
      return this.getDefaultTrainingContext();
    }
  }

  private getDefaultTrainingContext(): TrainingContext {
    return {
      sessionDuration: 60,
      restDaysSinceLast: 3,
      weeklyVolume: 0,
      currentStreak: 0,
      averageIntensity: 0,
      lastSessionDate: null
    };
  }

  /**
   * Generate progression recommendation for an exercise
   */
  async generateProgressionRecommendation(
    userId: string,
    exerciseId: string,
    lastPerformance: { weight: number; reps: number }
  ): Promise<ProgressionRecommendation> {
    try {
      // Get user profile, training context, and comprehensive training context summary
      const [profile, context, trainingContextSummary] = await Promise.all([
        this.getUserProgressionProfile(userId),
        this.getTrainingContext(userId, exerciseId),
        trainingContextTracker.generateTrainingContextSummary(userId)
      ]);

      if (!profile) {
        return this.getFallbackRecommendation(lastPerformance);
      }

      // Calculate progression factors with enhanced training context
      const factors = this.calculateProgressionFactorsWithTrainingContext(profile, context, trainingContextSummary);

      // Apply all factors to get final increment
      const totalIncrement = factors.baseIncrement *
                            factors.volumeMultiplier *
                            factors.recoveryFactor *
                            factors.plateauAdjustment;

      // Calculate suggested weight
      const suggestedWeight = Math.round((lastPerformance.weight * (1 + totalIncrement)) * 4) / 4; // Round to nearest 0.25kg

      // Calculate suggested reps based on goal and experience
      const suggestedReps = this.calculateSuggestedReps(profile, lastPerformance.reps, totalIncrement);

      // Build enhanced reasoning with training context insights
      const reasoning = this.buildEnhancedReasoning(factors, profile, context, trainingContextSummary);

      // Check for plateau using comprehensive analysis
      const plateauDetected = await this.detectPlateau(userId, exerciseId);

      // Generate alternative progression options
      const alternativeOptions = this.generateAlternativeOptions(
        lastPerformance,
        factors,
        trainingContextSummary
      );

      return {
        suggestedWeight,
        suggestedReps,
        confidence: this.calculateConfidence(factors, trainingContextSummary),
        reasoning,
        alternativeOptions,
        plateauDetected,
        deloadRecommended: plateauDetected
      };
    } catch (error) {
      console.error('Error generating progression recommendation:', error);
      return this.getFallbackRecommendation(lastPerformance);
    }
  }

  /**
   * Calculate suggested reps based on goal and progression
   */
  private calculateSuggestedReps(
    profile: UserProgressionProfile,
    lastReps: number,
    increment: number
  ): number {
    const baseReps = Math.max(6, Math.min(12, lastReps));

    // Adjust reps based on goal
    switch (profile.primaryGoal) {
      case 'strength_increase':
        return Math.max(1, Math.min(6, Math.round(baseReps * 0.8))); // Lower reps for strength
      case 'muscle_gain':
        return Math.max(6, Math.min(12, baseReps)); // Moderate reps for hypertrophy
      case 'fat_loss':
        return Math.max(12, Math.min(20, Math.round(baseReps * 1.2))); // Higher reps for fat loss
      default:
        return baseReps;
    }
  }

  /**
   * Build reasoning for the recommendation
   */
  private buildReasoning(
    factors: ProgressionFactors,
    profile: UserProgressionProfile,
    context: TrainingContext
  ): string[] {
    const reasoning: string[] = [];

    // Experience and frequency reasoning
    if (profile.trainingFrequency <= 2) {
      reasoning.push(`Low training frequency (${profile.trainingFrequency}x/week) allows for more aggressive progression`);
    } else if (profile.trainingFrequency >= 5) {
      reasoning.push(`High training frequency (${profile.trainingFrequency}x/week) requires conservative progression`);
    }

    // Recovery reasoning
    if (context.restDaysSinceLast >= 3) {
      reasoning.push(`${context.restDaysSinceLast} rest days provide good recovery`);
    } else if (context.restDaysSinceLast === 0) {
      reasoning.push('Same-day training detected - being conservative');
    }

    // Volume reasoning
    if (context.weeklyVolume > 5000) {
      reasoning.push(`High weekly volume (${Math.round(context.weeklyVolume)}kg) reduces progression rate`);
    }

    return reasoning;
  }

  /**
   * Basic plateau detection (3+ sessions with <2% improvement)
   */
  private async detectPlateau(userId: string, exerciseId: string): Promise<boolean> {
    try {
      const { data: recentSets, error } = await supabase
        .from('set_logs')
        .select('weight_kg, reps, created_at')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(12); // Last 3-4 sessions worth of sets

      if (error || !recentSets || recentSets.length < 6) return false;

      // Group by session and get best set per session
      const sessionGroups: { [key: string]: Array<{ weight: number; reps: number }> } = {};

      recentSets.forEach((set: any) => {
        const sessionDate = new Date(set.created_at).toDateString();
        if (!sessionGroups[sessionDate]) {
          sessionGroups[sessionDate] = [];
        }
        if (set.weight_kg && set.reps) {
          sessionGroups[sessionDate].push({ weight: set.weight_kg, reps: set.reps });
        }
      });

      const bestSetsPerSession = Object.values(sessionGroups)
        .map(sets => sets.reduce((best, current) =>
          (current.weight * current.reps) > (best.weight * best.reps) ? current : best
        ))
        .slice(0, 4); // Last 4 sessions

      if (bestSetsPerSession.length < 3) return false;

      // Check if last 3 sessions show <2% improvement
      let stagnantCount = 0;
      for (let i = 1; i < Math.min(3, bestSetsPerSession.length); i++) {
        const current = bestSetsPerSession[i];
        const previous = bestSetsPerSession[i - 1];
        const currentVolume = current.weight * current.reps;
        const previousVolume = previous.weight * previous.reps;
        const improvement = (currentVolume - previousVolume) / previousVolume;

        if (improvement < 0.02) { // Less than 2% improvement
          stagnantCount++;
        }
      }

      return stagnantCount >= 2; // 2 out of 3 sessions stagnant
    } catch (error) {
      console.error('Error detecting plateau:', error);
      return false;
    }
  }

  /**
   * Fallback recommendation when profile/context unavailable
   */
  private getFallbackRecommendation(lastPerformance: { weight: number; reps: number }): ProgressionRecommendation {
    const suggestedWeight = Math.round((lastPerformance.weight * 1.05) * 4) / 4;
    const suggestedReps = Math.max(6, Math.min(12, lastPerformance.reps));

    return {
      suggestedWeight,
      suggestedReps,
      confidence: 0.5,
      reasoning: ['Using default 5% progression rate due to limited profile data']
    };
  }
}

export const progressionEngine = new ProgressionEngine();