import { supabase } from '../supabase/client-mobile';
import { performanceAnalytics, ExercisePerformanceData } from './performance-analytics';

export interface PlateauAnalysis {
  exerciseId: string;
  exerciseName: string;
  plateauRisk: number; // 0-1 scale
  plateauLevel: 'none' | 'early_warning' | 'moderate' | 'severe' | 'critical';
  primaryFactors: PlateauFactor[];
  secondaryFactors: PlateauFactor[];
  timeToPlateau: number | null; // weeks until likely plateau
  recommendedActions: PlateauRecommendation[];
  confidence: number; // 0-1
  analysis: string; // User-friendly explanation
  detailedAnalysis: string; // Technical breakdown for advanced users
}

export interface PlateauFactor {
  factor: string;
  severity: number; // 0-1
  description: string;
  impact: 'low' | 'moderate' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  data: any; // Raw data for the factor
}

export interface PlateauRecommendation {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeframe: 'immediate' | 'this_week' | 'next_session' | 'this_month';
  rationale: string;
  expectedOutcome: string;
  alternatives?: string[];
}

export interface DeloadRecommendation {
  type: 'volume_reduction' | 'weight_reduction' | 'frequency_reduction' | 'complete_deloading';
  duration: number; // weeks
  volumeReduction: number; // percentage 0-100
  weightReduction: number; // percentage 0-100
  frequencyAdjustment: number | null; // new sessions per week
  rationale: string;
  expectedRecovery: string;
  monitoring: string[];
}

class PlateauAnalyzerService {
  /**
   * Comprehensive plateau analysis for an exercise
   */
  async analysePlateau(
    userId: string,
    exerciseId: string,
    recentSessions: number = 8
  ): Promise<PlateauAnalysis | null> {
    try {
      // Get comprehensive exercise analytics
      const analytics = await performanceAnalytics.getExerciseAnalytics(userId, exerciseId, recentSessions * 3);
      if (!analytics || analytics.totalSessions < 3) return null;

      // Analyze multiple plateau factors
      const factors = await this.analysePlateauFactors(userId, exerciseId, analytics);

      // Calculate overall plateau risk
      const plateauRisk = this.calculatePlateauRisk(factors);
      const plateauLevel = this.determinePlateauLevel(plateauRisk);

      // Generate recommendations
      const recommendedActions = this.generatePlateauRecommendations(factors, plateauLevel, analytics);

      // Estimate time to plateau
      const timeToPlateau = this.estimateTimeToPlateau(analytics, factors);

      // Create user-friendly analysis
      const analysis = this.createUserFriendlyAnalysis(plateauLevel, factors, analytics);
      const detailedAnalysis = this.createDetailedAnalysis(factors, analytics);

      return {
        exerciseId,
        exerciseName: analytics.exerciseName,
        plateauRisk,
        plateauLevel,
        primaryFactors: factors.filter(f => f.impact === 'high' || f.impact === 'critical'),
        secondaryFactors: factors.filter(f => f.impact === 'moderate' || f.impact === 'low'),
        timeToPlateau,
        recommendedActions,
        confidence: this.calculateAnalysisConfidence(analytics, factors),
        analysis,
        detailedAnalysis
      };
    } catch (error) {
      console.error('Error analyzing plateau:', error);
      return null;
    }
  }

  /**
   * Analyse multiple factors that contribute to plateaus
   */
  private async analysePlateauFactors(
    userId: string,
    exerciseId: string,
    analytics: ExercisePerformanceData
  ): Promise<PlateauFactor[]> {
    const factors: PlateauFactor[] = [];

    // Factor 1: Progression Velocity Decline
    factors.push(await this.analyseProgressionVelocity(analytics));

    // Factor 2: Volume Stagnation
    factors.push(this.analyseVolumeStagnation(analytics));

    // Factor 3: Recovery Indicators
    factors.push(this.analyseRecoveryIndicators(analytics));

    // Factor 4: Consistency Breakdown
    factors.push(this.analyseConsistencyBreakdown(analytics));

    // Factor 5: Fatigue Accumulation
    factors.push(this.analyseFatigueAccumulation(analytics));

    // Factor 6: Periodization Context
    factors.push(await this.analysePeriodizationContext(userId, analytics));

    // Factor 7: Training Age & Adaptation
    factors.push(this.analyseTrainingAge(analytics));

    return factors;
  }

  /**
   * Analyse progression velocity decline
   */
  private async analyseProgressionVelocity(analytics: ExercisePerformanceData): Promise<PlateauFactor> {
    const { progressionMetrics, strengthCurve } = analytics;

    // Calculate velocity trend over recent sessions
    const recentSessions = strengthCurve.slice(-6); // Last 6 data points
    if (recentSessions.length < 3) {
      return {
        factor: 'Progression Velocity',
        severity: 0,
        description: 'Not enough data to analyze progression velocity',
        impact: 'low',
        trend: 'stable',
        data: { sessions: recentSessions.length }
      };
    }

    // Calculate recent vs earlier velocity
    const midpoint = Math.floor(recentSessions.length / 2);
    const earlyPeriod = recentSessions.slice(0, midpoint);
    const latePeriod = recentSessions.slice(midpoint);

    const earlyVelocity = this.calculatePeriodVelocity(earlyPeriod);
    const lateVelocity = this.calculatePeriodVelocity(latePeriod);

    let severity = 0;
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    let description = '';

    if (lateVelocity < earlyVelocity * 0.5) {
      severity = 0.8;
      trend = 'declining';
      description = `Progress slowed significantly (from ${earlyVelocity.toFixed(2)}kg/week to ${lateVelocity.toFixed(2)}kg/week)`;
    } else if (lateVelocity < earlyVelocity * 0.75) {
      severity = 0.6;
      trend = 'declining';
      description = `Progress slowing down (from ${earlyVelocity.toFixed(2)}kg/week to ${lateVelocity.toFixed(2)}kg/week)`;
    } else if (lateVelocity > earlyVelocity * 1.2) {
      severity = 0.1;
      trend = 'improving';
      description = `Progress accelerating (from ${earlyVelocity.toFixed(2)}kg/week to ${lateVelocity.toFixed(2)}kg/week)`;
    } else {
      severity = 0.2;
      trend = 'stable';
      description = `Progress stable at ${lateVelocity.toFixed(2)}kg/week`;
    }

    const impact = severity > 0.7 ? 'critical' : severity > 0.5 ? 'high' : severity > 0.3 ? 'moderate' : 'low';

    return {
      factor: 'Progression Velocity',
      severity,
      description,
      impact: impact as any,
      trend,
      data: { earlyVelocity, lateVelocity, change: ((lateVelocity - earlyVelocity) / earlyVelocity) * 100 }
    };
  }

  /**
   * Analyse volume stagnation
   */
  private analyseVolumeStagnation(analytics: ExercisePerformanceData): PlateauFactor {
    const { volumeProgression } = analytics;

    if (volumeProgression.length < 3) {
      return {
        factor: 'Volume Stagnation',
        severity: 0,
        description: 'Not enough volume data to analyze',
        impact: 'low',
        trend: 'stable',
        data: { weeks: volumeProgression.length }
      };
    }

    // Check if volume has stagnated in recent weeks
    const recentWeeks = volumeProgression.slice(-4);
    const avgRecentVolume = recentWeeks.reduce((sum, w) => sum + w.totalVolume, 0) / recentWeeks.length;

    const earlierWeeks = volumeProgression.slice(-8, -4);
    const avgEarlierVolume = earlierWeeks.length > 0
      ? earlierWeeks.reduce((sum, w) => sum + w.totalVolume, 0) / earlierWeeks.length
      : avgRecentVolume;

    const volumeChange = ((avgRecentVolume - avgEarlierVolume) / avgEarlierVolume) * 100;

    let severity = 0;
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    let description = '';

    if (volumeChange < -10) {
      severity = 0.7;
      trend = 'declining';
      description = `Volume decreased by ${Math.abs(volumeChange).toFixed(1)}% in recent weeks`;
    } else if (volumeChange < 5) {
      severity = 0.4;
      trend = 'stable';
      description = `Volume stable with only ${volumeChange.toFixed(1)}% change`;
    } else {
      severity = 0.1;
      trend = 'improving';
      description = `Volume increasing by ${volumeChange.toFixed(1)}%`;
    }

    const impact = severity > 0.6 ? 'high' : severity > 0.3 ? 'moderate' : 'low';

    return {
      factor: 'Volume Stagnation',
      severity,
      description,
      impact: impact as any,
      trend,
      data: { avgRecentVolume, avgEarlierVolume, changePercent: volumeChange }
    };
  }

  /**
   * Analyse recovery indicators
   */
  private analyseRecoveryIndicators(analytics: ExercisePerformanceData): PlateauFactor {
    const { recoveryIndicators, workoutFrequency } = analytics;

    // Analyze rest periods
    const avgRestDays = recoveryIndicators.averageRestBetweenSessions;
    const targetRestDays = this.getOptimalRestDays(workoutFrequency.averageSessionsPerWeek);

    let severity = 0;
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    let description = '';

    if (avgRestDays > targetRestDays * 1.5) {
      severity = 0.8;
      trend = 'declining';
      description = `Taking ${avgRestDays.toFixed(1)} days rest (optimal: ${targetRestDays.toFixed(1)} days) - recovery needs increased`;
    } else if (avgRestDays > targetRestDays * 1.2) {
      severity = 0.5;
      trend = 'stable';
      description = `Rest periods slightly extended to ${avgRestDays.toFixed(1)} days`;
    } else if (avgRestDays < targetRestDays * 0.8) {
      severity = 0.3;
      trend = 'improving';
      description = `Recovering well with ${avgRestDays.toFixed(1)} day rest periods`;
    } else {
      severity = 0.2;
      trend = 'stable';
      description = `Rest periods at optimal ${avgRestDays.toFixed(1)} days`;
    }

    // Factor in performance after rest
    const avgPerformanceAfterRest = recoveryIndicators.performanceAfterRest.reduce((sum, p) => sum + p, 0) / recoveryIndicators.performanceAfterRest.length;
    if (avgPerformanceAfterRest < 0.95) {
      severity += 0.2; // Additional severity for poor recovery
      description += ` - performance dropping ${((1 - avgPerformanceAfterRest) * 100).toFixed(1)}% after rest`;
    }

    const impact = severity > 0.7 ? 'critical' : severity > 0.5 ? 'high' : severity > 0.3 ? 'moderate' : 'low';

    return {
      factor: 'Recovery Indicators',
      severity: Math.min(1, severity),
      description,
      impact: impact as any,
      trend,
      data: { avgRestDays, targetRestDays, avgPerformanceAfterRest }
    };
  }

  /**
   * Analyse consistency breakdown
   */
  private analyseConsistencyBreakdown(analytics: ExercisePerformanceData): PlateauFactor {
    const { workoutFrequency, totalSessions } = analytics;

    if (totalSessions < 5) {
      return {
        factor: 'Consistency Breakdown',
        severity: 0,
        description: 'Not enough sessions to analyze consistency',
        impact: 'low',
        trend: 'stable',
        data: { totalSessions }
      };
    }

    const consistencyScore = workoutFrequency.consistencyPattern === 'regular' ? 0.9 :
                           workoutFrequency.consistencyPattern === 'increasing' ? 0.7 :
                           workoutFrequency.consistencyPattern === 'irregular' ? 0.4 : 0.2;

    let severity = 0;
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    let description = '';

    if (consistencyScore < 0.4) {
      severity = 0.6;
      trend = 'declining';
      description = 'Training consistency has declined - irregular workout schedule';
    } else if (consistencyScore < 0.7) {
      severity = 0.3;
      trend = 'stable';
      description = 'Training schedule is somewhat irregular';
    } else {
      severity = 0.1;
      trend = 'improving';
      description = 'Maintaining consistent training schedule';
    }

    const impact = severity > 0.5 ? 'high' : severity > 0.3 ? 'moderate' : 'low';

    return {
      factor: 'Consistency Breakdown',
      severity,
      description,
      impact: impact as any,
      trend,
      data: { consistencyScore, pattern: workoutFrequency.consistencyPattern }
    };
  }

  /**
   * Analyse fatigue accumulation
   */
  private analyseFatigueAccumulation(analytics: ExercisePerformanceData): PlateauFactor {
    const { recoveryIndicators } = analytics;

    if (recoveryIndicators.fatiguePatterns.length < 3) {
      return {
        factor: 'Fatigue Accumulation',
        severity: 0,
        description: 'Not enough data to analyze fatigue patterns',
        impact: 'low',
        trend: 'stable',
        data: { patterns: recoveryIndicators.fatiguePatterns.length }
      };
    }

    // Analyze fatigue trend
    const recentFatigue = recoveryIndicators.fatiguePatterns.slice(-3);
    const avgRecentFatigue = recentFatigue.reduce((sum, p) => sum + p.fatigueScore, 0) / recentFatigue.length;

    const earlierFatigue = recoveryIndicators.fatiguePatterns.slice(-6, -3);
    const avgEarlierFatigue = earlierFatigue.length > 0
      ? earlierFatigue.reduce((sum, p) => sum + p.fatigueScore, 0) / earlierFatigue.length
      : avgRecentFatigue;

    const fatigueIncrease = ((avgRecentFatigue - avgEarlierFatigue) / avgEarlierFatigue) * 100;

    let severity = 0;
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    let description = '';

    if (fatigueIncrease > 30) {
      severity = 0.8;
      trend = 'declining';
      description = `Fatigue increased ${fatigueIncrease.toFixed(1)}% - volume rising faster than recovery`;
    } else if (fatigueIncrease > 15) {
      severity = 0.5;
      trend = 'declining';
      description = `Fatigue building up (${fatigueIncrease.toFixed(1)}% increase)`;
    } else if (fatigueIncrease < -15) {
      severity = 0.1;
      trend = 'improving';
      description = `Fatigue levels improving (${Math.abs(fatigueIncrease).toFixed(1)}% decrease)`;
    } else {
      severity = 0.2;
      trend = 'stable';
      description = 'Fatigue levels stable';
    }

    const impact = severity > 0.6 ? 'high' : severity > 0.3 ? 'moderate' : 'low';

    return {
      factor: 'Fatigue Accumulation',
      severity,
      description,
      impact: impact as any,
      trend,
      data: { avgRecentFatigue, avgEarlierFatigue, increasePercent: fatigueIncrease }
    };
  }

  /**
   * Analyse periodization context
   */
  private async analysePeriodizationContext(userId: string, analytics: ExercisePerformanceData): Promise<PlateauFactor> {
    // Get user's overall training context
    const userSummary = await performanceAnalytics.getUserAnalyticsSummary(userId);

    if (!userSummary) {
      return {
        factor: 'Periodization Context',
        severity: 0.3,
        description: 'Unable to determine training phase context',
        impact: 'moderate',
        trend: 'stable',
        data: { context: 'unknown' }
      };
    }

    const { periodizationPhase, totalWorkouts } = userSummary;
    const { progressionMetrics } = analytics;

    let severity = 0;
    let description = '';

    // Different plateau risks based on training phase
    switch (periodizationPhase) {
      case 'accumulation':
        if (totalWorkouts > 8) {
          severity = 0.4;
          description = 'In accumulation phase - consider moving to intensification soon';
        } else {
          severity = 0.1;
          description = 'Early accumulation phase - building volume appropriately';
        }
        break;
      case 'intensification':
        if (progressionMetrics.consistencyScore < 0.6) {
          severity = 0.6;
          description = 'In intensification phase but consistency declining - high plateau risk';
        } else {
          severity = 0.3;
          description = 'In intensification phase - monitor for overtraining';
        }
        break;
      case 'realization':
        if (progressionMetrics.plateauRisk > 0.5) {
          severity = 0.7;
          description = 'In realization phase with high plateau risk - deload needed';
        } else {
          severity = 0.2;
          description = 'In realization phase - pushing limits appropriately';
        }
        break;
      case 'deload':
        severity = 0.1;
        description = 'In deload phase - recovery period active';
        break;
    }

    const impact = severity > 0.6 ? 'high' : severity > 0.4 ? 'moderate' : 'low';

    return {
      factor: 'Periodization Context',
      severity,
      description,
      impact: impact as any,
      trend: 'stable',
      data: { phase: periodizationPhase, totalWorkouts }
    };
  }

  /**
   * Analyse training age and adaptation limits
   */
  private analyseTrainingAge(analytics: ExercisePerformanceData): PlateauFactor {
    const { totalSessions, progressionMetrics } = analytics;

    // Estimate training age for this exercise
    const estimatedTrainingAge = Math.max(1, totalSessions / 2); // Rough estimate: 2 sessions per week

    let severity = 0;
    let description = '';

    // Different expectations based on training age
    if (estimatedTrainingAge < 4) {
      severity = 0.1;
      description = 'New to this exercise - still in adaptation phase';
    } else if (estimatedTrainingAge < 12) {
      if (progressionMetrics.progressionVelocity < 0.1) {
        severity = 0.5;
        description = 'Intermediate training age - progress should be steady';
      } else {
        severity = 0.2;
        description = 'Intermediate training age - progressing well';
      }
    } else {
      if (progressionMetrics.progressionVelocity < 0.05) {
        severity = 0.7;
        description = 'Advanced training age - very slow progress indicates plateau';
      } else {
        severity = 0.3;
        description = 'Advanced training age - maintaining progress takes more effort';
      }
    }

    const impact = severity > 0.6 ? 'high' : severity > 0.4 ? 'moderate' : 'low';

    return {
      factor: 'Training Age & Adaptation',
      severity,
      description,
      impact: impact as any,
      trend: 'stable',
      data: { estimatedTrainingAge, progressionVelocity: progressionMetrics.progressionVelocity }
    };
  }

  /**
   * Calculate overall plateau risk from all factors
   */
  private calculatePlateauRisk(factors: PlateauFactor[]): number {
    if (factors.length === 0) return 0;

    // Weight factors by their impact level
    const weights = {
      critical: 3,
      high: 2,
      moderate: 1,
      low: 0.5
    };

    let weightedSum = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      const weight = weights[factor.impact];
      weightedSum += factor.severity * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.min(1, weightedSum / totalWeight) : 0;
  }

  /**
   * Determine plateau level from risk score
   */
  private determinePlateauLevel(risk: number): 'none' | 'early_warning' | 'moderate' | 'severe' | 'critical' {
    if (risk < 0.2) return 'none';
    if (risk < 0.4) return 'early_warning';
    if (risk < 0.6) return 'moderate';
    if (risk < 0.8) return 'severe';
    return 'critical';
  }

  /**
   * Generate recommendations based on plateau analysis
   */
  private generatePlateauRecommendations(
    factors: PlateauFactor[],
    plateauLevel: string,
    analytics: ExercisePerformanceData
  ): PlateauRecommendation[] {
    const recommendations: PlateauRecommendation[] = [];

    // Sort factors by severity
    const sortedFactors = factors.sort((a, b) => b.severity - a.severity);

    switch (plateauLevel) {
      case 'critical':
        recommendations.push({
          action: 'Take an immediate deload week',
          priority: 'urgent',
          timeframe: 'immediate',
          rationale: 'Multiple critical factors indicate imminent plateau',
          expectedOutcome: 'Reset recovery and restore progression capacity'
        });
        break;

      case 'severe':
        recommendations.push({
          action: 'Reduce training volume by 40-60% for 1-2 weeks',
          priority: 'high',
          timeframe: 'this_week',
          rationale: 'High plateau risk requires immediate intervention',
          expectedOutcome: 'Prevent complete stagnation and restore strength gains'
        });
        break;

      case 'moderate':
        recommendations.push({
          action: 'Add an extra rest day between sessions',
          priority: 'medium',
          timeframe: 'next_session',
          rationale: 'Recovery needs have increased - more rest will help',
          expectedOutcome: 'Improve recovery and maintain progression'
        });
        break;

      case 'early_warning':
        recommendations.push({
          action: 'Monitor progress closely and consider technique review',
          priority: 'low',
          timeframe: 'this_week',
          rationale: 'Early signs of slowing progress',
          expectedOutcome: 'Catch issues before they become major problems'
        });
        break;
    }

    // Add specific recommendations based on top factors
    const topFactor = sortedFactors[0];
    if (topFactor) {
      switch (topFactor.factor) {
        case 'Progression Velocity':
          if (topFactor.trend === 'declining') {
            recommendations.push({
              action: 'Focus on progressive overload technique',
              priority: 'medium',
              timeframe: 'next_session',
              rationale: 'Ensure proper form and gradual weight increases',
              expectedOutcome: 'Restore progression momentum'
            });
          }
          break;

        case 'Recovery Indicators':
          recommendations.push({
            action: 'Increase rest periods between training this exercise',
            priority: 'high',
            timeframe: 'immediate',
            rationale: 'Your body needs more recovery time',
            expectedOutcome: 'Better performance and reduced injury risk'
          });
          break;

        case 'Fatigue Accumulation':
          recommendations.push({
            action: 'Reduce volume or add a deload week',
            priority: 'high',
            timeframe: 'this_week',
            rationale: 'Training volume exceeding recovery capacity',
            expectedOutcome: 'Reset fatigue and restore strength gains'
          });
          break;
      }
    }

    return recommendations;
  }

  /**
   * Estimate time until plateau
   */
  private estimateTimeToPlateau(analytics: ExercisePerformanceData, factors: PlateauFactor[]): number | null {
    const { progressionMetrics } = analytics;

    if (progressionMetrics.progressionVelocity <= 0) return 0; // Already at plateau

    // Find the most severe declining factor
    const decliningFactors = factors.filter(f => f.trend === 'declining');
    if (decliningFactors.length === 0) return null;

    const mostSevereFactor = decliningFactors.reduce((max, current) =>
      current.severity > max.severity ? current : max
    );

    // Estimate based on severity and current velocity
    const baseWeeks = 4; // Default assumption
    const severityMultiplier = 1 - mostSevereFactor.severity; // Higher severity = shorter time
    const velocityMultiplier = Math.max(0.5, progressionMetrics.progressionVelocity / 0.2); // Normalize velocity

    return Math.round(baseWeeks * severityMultiplier * velocityMultiplier);
  }

  /**
   * Calculate analysis confidence
   */
  private calculateAnalysisConfidence(analytics: ExercisePerformanceData, factors: PlateauFactor[]): number {
    let confidence = 0.5; // Base confidence

    // More sessions = higher confidence
    if (analytics.totalSessions > 10) confidence += 0.2;
    else if (analytics.totalSessions > 5) confidence += 0.1;

    // More factors analyzed = higher confidence
    confidence += Math.min(0.2, factors.length * 0.05);

    // Consistent data = higher confidence
    if (analytics.progressionMetrics.consistencyScore > 0.7) confidence += 0.1;

    return Math.min(1, confidence);
  }

  /**
   * Create user-friendly analysis message
   */
  private createUserFriendlyAnalysis(
    plateauLevel: string,
    factors: PlateauFactor[],
    analytics: ExercisePerformanceData
  ): string {
    const primaryFactor = factors.find(f => f.impact === 'critical') || factors.find(f => f.impact === 'high');

    switch (plateauLevel) {
      case 'critical':
        return `🚨 Your progress has stalled significantly. Multiple factors indicate you need a rest week immediately to get back on track.`;

      case 'severe':
        return `⚠️ Your progress is slowing down considerably. Consider reducing volume by 40-60% for 1-2 weeks to reset and continue getting stronger.`;

      case 'moderate':
        return `🟡 Your progress has slowed recently. Adding an extra rest day and monitoring closely will help you keep improving.`;

      case 'early_warning':
        return `🟢 Early signs of slowing progress. Keep training consistently and consider reviewing your technique to maintain momentum.`;

      default:
        return `✅ Your progress looks healthy. Keep up the great work!`;
    }
  }

  /**
   * Create detailed technical analysis
   */
  private createDetailedAnalysis(factors: PlateauFactor[], analytics: ExercisePerformanceData): string {
    const primaryFactors = factors.filter(f => f.impact === 'high' || f.impact === 'critical');
    const plateauRiskPercent = Math.round(analytics.progressionMetrics.plateauRisk * 100);

    let analysis = `Plateau Risk: ${plateauRiskPercent}%\n\n`;

    if (primaryFactors.length > 0) {
      analysis += `Primary Factors:\n`;
      primaryFactors.forEach(factor => {
        analysis += `• ${factor.factor}: ${factor.description} (${Math.round(factor.severity * 100)}% severity)\n`;
      });
      analysis += `\n`;
    }

    analysis += `Progression Metrics:\n`;
    analysis += `• Velocity: ${analytics.progressionMetrics.progressionVelocity.toFixed(2)}kg/week\n`;
    analysis += `• Consistency: ${Math.round(analytics.progressionMetrics.consistencyScore * 100)}%\n`;
    analysis += `• Sessions: ${analytics.totalSessions} total\n`;

    return analysis;
  }

  /**
   * Generate deload recommendations
   */
  async generateDeloadRecommendation(
    userId: string,
    exerciseId: string
  ): Promise<DeloadRecommendation | null> {
    const analysis = await this.analysePlateau(userId, exerciseId);
    if (!analysis || analysis.plateauLevel === 'none' || analysis.plateauLevel === 'early_warning') {
      return null;
    }

    const severity = analysis.plateauRisk;

    // Determine deload type based on severity and factors
    let deloadType: DeloadRecommendation['type'];
    let duration: number;
    let volumeReduction: number;
    let weightReduction: number;

    if (severity > 0.8) {
      deloadType = 'complete_deloading';
      duration = 2;
      volumeReduction = 70;
      weightReduction = 20;
    } else if (severity > 0.6) {
      deloadType = 'volume_reduction';
      duration = 2;
      volumeReduction = 50;
      weightReduction = 10;
    } else {
      deloadType = 'volume_reduction';
      duration = 1;
      volumeReduction = 30;
      weightReduction = 5;
    }

    const rationale = this.createDeloadRationale(analysis);
    const expectedRecovery = this.createRecoveryExpectation(analysis, duration);
    const monitoring = this.createMonitoringGuidelines(analysis);

    return {
      type: deloadType,
      duration,
      volumeReduction,
      weightReduction,
      frequencyAdjustment: null, // Could be adjusted based on analysis
      rationale,
      expectedRecovery,
      monitoring
    };
  }

  // Helper methods

  private calculatePeriodVelocity(sessions: Array<{ date: string; maxWeight: number }>): number {
    if (sessions.length < 2) return 0;

    const firstWeight = sessions[0].maxWeight;
    const lastWeight = sessions[sessions.length - 1].maxWeight;
    const daysDiff = (new Date(sessions[sessions.length - 1].date).getTime() - new Date(sessions[0].date).getTime()) / (1000 * 60 * 60 * 24);
    const weeksDiff = daysDiff / 7;

    return weeksDiff > 0 ? (lastWeight - firstWeight) / weeksDiff : 0;
  }

  private getOptimalRestDays(sessionsPerWeek: number): number {
    if (sessionsPerWeek <= 2) return 5; // 2 sessions/week = ~3.5 days between
    if (sessionsPerWeek <= 4) return 2.5; // 4 sessions/week = 1.75 days between
    return 1.5; // 6+ sessions/week = 1.17 days between
  }

  private createDeloadRationale(analysis: PlateauAnalysis): string {
    const primaryFactor = analysis.primaryFactors[0];
    if (!primaryFactor) return 'Multiple factors indicate recovery is needed to restore progression.';

    switch (primaryFactor.factor) {
      case 'Recovery Indicators':
        return 'Your body is showing signs of needing more recovery time between sessions.';
      case 'Fatigue Accumulation':
        return 'Training volume has exceeded your recovery capacity, leading to accumulated fatigue.';
      case 'Progression Velocity':
        return 'Rate of strength gains has declined significantly, indicating a need for recovery.';
      default:
        return 'Analysis shows multiple indicators that a deload period will restore progression capacity.';
    }
  }

  private createRecoveryExpectation(analysis: PlateauAnalysis, duration: number): string {
    const severity = analysis.plateauRisk;
    const weeks = duration === 1 ? 'week' : 'weeks';

    if (severity > 0.8) {
      return `After ${duration} ${weeks}, expect to return to 90-95% of previous performance levels with renewed progression capacity.`;
    } else if (severity > 0.6) {
      return `After ${duration} ${weeks}, expect to return to 95-100% of previous performance levels with restored strength gains.`;
    } else {
      return `After ${duration} ${weeks}, expect to return to near-peak performance with improved recovery and consistency.`;
    }
  }

  private createMonitoringGuidelines(analysis: PlateauAnalysis): string[] {
    const guidelines = [
      'Track how you feel during deload - energy levels should improve',
      'Monitor sleep quality and recovery markers',
      'Note any changes in workout enjoyment and motivation'
    ];

    if (analysis.primaryFactors.some(f => f.factor === 'Recovery Indicators')) {
      guidelines.push('Pay attention to rest periods - they should feel sufficient');
    }

    if (analysis.primaryFactors.some(f => f.factor === 'Fatigue Accumulation')) {
      guidelines.push('Volume should feel manageable, not challenging');
    }

    return guidelines;
  }
}

export const plateauAnalyzer = new PlateauAnalyzerService();