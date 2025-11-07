import { supabase } from '../supabase/client-mobile';
import { trainingContextTracker, TrainingLoadMetrics } from './training-context-tracker';

export interface FatiguePattern {
  pattern: 'acute_fatigue' | 'chronic_fatigue' | 'recovery_stall' | 'performance_decline' | 'inconsistent_recovery';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  duration: number; // days
  indicators: string[];
  confidence: number; // 0-100
  firstDetected: string;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface OvertrainingAssessment {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number; // 0-100
  primaryPatterns: FatiguePattern[];
  secondaryIndicators: string[];
  recoveryNeeds: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  recommendedActions: Array<{
    action: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    timeframe: string;
    expectedOutcome: string;
  }>;
  monitoringPoints: string[];
  reassessmentDate: string;
}

export interface RecoveryIntervention {
  type: 'deload' | 'frequency_reduction' | 'volume_reduction' | 'intensity_reduction' | 'active_recovery';
  duration: number; // days
  intensity: number; // 0-100 (0 = complete rest, 100 = maintenance)
  focus: string;
  successMetrics: string[];
  progressionCriteria: string[];
}

class OvertrainingDetectorService {
  /**
   * Comprehensive overtraining risk assessment
   */
  async assessOvertrainingRisk(userId: string): Promise<OvertrainingAssessment> {
    const trainingLoad = await trainingContextTracker.calculateTrainingLoad(userId, 4);
    const recoveryAnalysis = await trainingContextTracker.analyzeRestPeriods(userId, 8);
    const fatiguePatterns = await this.detectFatiguePatterns(userId);

    const riskScore = this.calculateRiskScore(trainingLoad, recoveryAnalysis, fatiguePatterns);
    const overallRisk = this.categorizeRisk(riskScore);

    const primaryPatterns = fatiguePatterns.filter(p => p.severity === 'high' || p.severity === 'critical');
    const secondaryIndicators = this.identifySecondaryIndicators(trainingLoad, recoveryAnalysis);

    const recoveryNeeds = this.determineRecoveryNeeds(overallRisk, fatiguePatterns);
    const recommendedActions = this.generateRecommendedActions(overallRisk, riskScore, fatiguePatterns);
    const monitoringPoints = this.establishMonitoringPoints(overallRisk);
    const reassessmentDate = this.calculateReassessmentDate(overallRisk);

    return {
      overallRisk,
      riskScore,
      primaryPatterns,
      secondaryIndicators,
      recoveryNeeds,
      recommendedActions,
      monitoringPoints,
      reassessmentDate
    };
  }

  /**
   * Detect specific fatigue patterns from training data
   */
  async detectFatiguePatterns(userId: string): Promise<FatiguePattern[]> {
    const sessions = await this.getRecentSessions(userId, 12);
    const patterns: FatiguePattern[] = [];

    if (sessions.length < 4) {
      return patterns; // Need minimum data for pattern detection
    }

    // Acute fatigue detection (recent performance drops)
    const acuteFatigue = this.detectAcuteFatigue(sessions);
    if (acuteFatigue) patterns.push(acuteFatigue);

    // Chronic fatigue detection (persistent low performance)
    const chronicFatigue = this.detectChronicFatigue(sessions);
    if (chronicFatigue) patterns.push(chronicFatigue);

    // Recovery stall detection (failure to recover between sessions)
    const recoveryStall = this.detectRecoveryStall(sessions);
    if (recoveryStall) patterns.push(recoveryStall);

    // Performance decline detection (gradual deterioration)
    const performanceDecline = this.detectPerformanceDecline(sessions);
    if (performanceDecline) patterns.push(performanceDecline);

    // Inconsistent recovery detection (erratic rest periods)
    const inconsistentRecovery = this.detectInconsistentRecovery(sessions);
    if (inconsistentRecovery) patterns.push(inconsistentRecovery);

    return patterns;
  }

  /**
   * Generate recovery intervention plan
   */
  generateRecoveryIntervention(
    assessment: OvertrainingAssessment
  ): RecoveryIntervention {
    switch (assessment.overallRisk) {
      case 'critical':
        return {
          type: 'deload',
          duration: 14,
          intensity: 30,
          focus: 'Complete recovery and regeneration',
          successMetrics: [
            'Improved sleep quality',
            'Reduced perceived fatigue',
            'Restored motivation',
            'Stable resting heart rate'
          ],
          progressionCriteria: [
            'Fatigue score reduced by 60%',
            'Performance tests show improvement',
            'Recovery markers normalized'
          ]
        };

      case 'high':
        return {
          type: 'frequency_reduction',
          duration: 10,
          intensity: 50,
          focus: 'Reduce training frequency while maintaining intensity',
          successMetrics: [
            'Consistent session completion',
            'Maintained or improved performance',
            'Reduced training-related stress'
          ],
          progressionCriteria: [
            '3 consecutive sessions without fatigue indicators',
            'Recovery analysis shows improvement',
            'Energy levels stabilized'
          ]
        };

      case 'moderate':
        return {
          type: 'volume_reduction',
          duration: 7,
          intensity: 70,
          focus: 'Reduce training volume while maintaining frequency',
          successMetrics: [
            'Easier session recovery',
            'Maintained technique quality',
            'Improved workout enjoyment'
          ],
          progressionCriteria: [
            'Volume tolerance restored',
            'No new fatigue patterns detected',
            'Performance trending upward'
          ]
        };

      default:
        return {
          type: 'active_recovery',
          duration: 3,
          intensity: 90,
          focus: 'Light active recovery while monitoring',
          successMetrics: [
            'Maintained training consistency',
            'No worsening fatigue indicators',
            'Stable energy levels'
          ],
          progressionCriteria: [
            'No fatigue pattern escalation',
            'Recovery metrics stable',
            'Performance maintained'
          ]
        };
    }
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
        completed_at,
        set_logs(
          weight_kg,
          reps,
          created_at,
          exercise_id
        )
      `)
      .eq('user_id', userId)
      .gte('session_date', cutoffDate.toISOString())
      .not('completed_at', 'is', null)
      .order('session_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private detectAcuteFatigue(sessions: any[]): FatiguePattern | null {
    if (sessions.length < 3) return null;

    const recentSessions = sessions.slice(0, 3);
    const earlierSessions = sessions.slice(3, 6);

    if (earlierSessions.length < 2) return null;

    // Calculate average performance metrics
    const recentAvgVolume = this.calculateAverageVolume(recentSessions);
    const earlierAvgVolume = this.calculateAverageVolume(earlierSessions);

    const volumeDrop = (earlierAvgVolume - recentAvgVolume) / earlierAvgVolume;

    if (volumeDrop > 0.2) { // 20% drop in recent sessions
      const duration = Math.floor((Date.now() - new Date(recentSessions[0].session_date).getTime()) / (24 * 60 * 60 * 1000));

      return {
        pattern: 'acute_fatigue',
        severity: volumeDrop > 0.4 ? 'high' : 'moderate',
        duration,
        indicators: [
          `Volume drop of ${(volumeDrop * 100).toFixed(0)}% in recent sessions`,
          'Recent performance below personal averages',
          'Potential acute fatigue accumulation'
        ],
        confidence: Math.min(90, 60 + volumeDrop * 100),
        firstDetected: recentSessions[recentSessions.length - 1].session_date,
        trend: 'worsening'
      };
    }

    return null;
  }

  private detectChronicFatigue(sessions: any[]): FatiguePattern | null {
    if (sessions.length < 8) return null;

    // Look for persistent low performance over 4+ weeks
    const recentSessions = sessions.slice(0, 8);
    const baselineSessions = sessions.slice(8, 16);

    if (baselineSessions.length < 4) return null;

    const recentAvgVolume = this.calculateAverageVolume(recentSessions);
    const baselineAvgVolume = this.calculateAverageVolume(baselineSessions);

    const chronicDrop = (baselineAvgVolume - recentAvgVolume) / baselineAvgVolume;

    if (chronicDrop > 0.15) { // 15% sustained drop
      const duration = Math.floor((Date.now() - new Date(recentSessions[recentSessions.length - 1].session_date).getTime()) / (24 * 60 * 60 * 1000));

      return {
        pattern: 'chronic_fatigue',
        severity: chronicDrop > 0.3 ? 'critical' : 'high',
        duration,
        indicators: [
          `Sustained volume drop of ${(chronicDrop * 100).toFixed(0)}% over 4+ weeks`,
          'Persistent performance below baseline',
          'Potential overtraining syndrome'
        ],
        confidence: Math.min(95, 70 + chronicDrop * 100),
        firstDetected: recentSessions[recentSessions.length - 1].session_date,
        trend: chronicDrop > 0.25 ? 'worsening' : 'stable'
      };
    }

    return null;
  }

  private detectRecoveryStall(sessions: any[]): FatiguePattern | null {
    if (sessions.length < 4) return null;

    // Check for failure to recover between consecutive sessions
    const consecutivePairs = [];
    for (let i = 0; i < sessions.length - 1; i++) {
      const current = sessions[i];
      const previous = sessions[i + 1];

      const currentVolume = this.calculateSessionVolume(current);
      const previousVolume = this.calculateSessionVolume(previous);

      const volumeDrop = (previousVolume - currentVolume) / previousVolume;

      if (volumeDrop > 0.15) { // Significant drop between sessions
        consecutivePairs.push({
          drop: volumeDrop,
          date: current.session_date
        });
      }
    }

    if (consecutivePairs.length >= 2) {
      const avgDrop = consecutivePairs.reduce((sum, pair) => sum + pair.drop, 0) / consecutivePairs.length;
      const duration = Math.floor((Date.now() - new Date(consecutivePairs[0].date).getTime()) / (24 * 60 * 60 * 1000));

      return {
        pattern: 'recovery_stall',
        severity: consecutivePairs.length >= 4 ? 'high' : 'moderate',
        duration,
        indicators: [
          `${consecutivePairs.length} consecutive sessions with recovery issues`,
          `Average volume drop of ${(avgDrop * 100).toFixed(0)}% between sessions`,
          'Insufficient recovery between workouts'
        ],
        confidence: Math.min(85, 50 + consecutivePairs.length * 10),
        firstDetected: consecutivePairs[consecutivePairs.length - 1].date,
        trend: 'stable'
      };
    }

    return null;
  }

  private detectPerformanceDecline(sessions: any[]): FatiguePattern | null {
    if (sessions.length < 6) return null;

    // Analyze trend over time using linear regression
    const volumes = sessions.map(s => this.calculateSessionVolume(s));
    const trend = this.calculateLinearTrend(volumes);

    if (trend.slope < -0.05) { // Significant downward trend
      const duration = Math.floor((Date.now() - new Date(sessions[sessions.length - 1].session_date).getTime()) / (24 * 60 * 60 * 1000));

      return {
        pattern: 'performance_decline',
        severity: Math.abs(trend.slope) > 0.1 ? 'high' : 'moderate',
        duration,
        indicators: [
          `Performance declining at ${(Math.abs(trend.slope) * 100).toFixed(1)}% per session`,
          `R² = ${trend.rSquared.toFixed(2)} (trend reliability)`,
          'Gradual deterioration in training capacity'
        ],
        confidence: Math.round(trend.rSquared * 100),
        firstDetected: sessions[sessions.length - 1].session_date,
        trend: 'worsening'
      };
    }

    return null;
  }

  private detectInconsistentRecovery(sessions: any[]): FatiguePattern | null {
    if (sessions.length < 6) return null;

    // Calculate rest periods between sessions
    const restPeriods = [];
    for (let i = 1; i < sessions.length; i++) {
      const currentDate = new Date(sessions[i - 1].session_date);
      const previousDate = new Date(sessions[i].session_date);
      const daysDiff = Math.round((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      restPeriods.push(daysDiff);
    }

    if (restPeriods.length < 4) return null;

    // Calculate coefficient of variation (consistency measure)
    const mean = restPeriods.reduce((sum, period) => sum + period, 0) / restPeriods.length;
    const variance = restPeriods.reduce((sum, period) => sum + Math.pow(period - mean, 2), 0) / restPeriods.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100; // Coefficient of variation as percentage

    if (cv > 60) { // Highly inconsistent rest periods
      const duration = Math.floor((Date.now() - new Date(sessions[sessions.length - 1].session_date).getTime()) / (24 * 60 * 60 * 1000));

      return {
        pattern: 'inconsistent_recovery',
        severity: cv > 80 ? 'moderate' : 'low',
        duration,
        indicators: [
          `Rest period variability: ${cv.toFixed(0)}% (high inconsistency)`,
          'Erratic recovery patterns affecting adaptation',
          'Makes training planning challenging'
        ],
        confidence: Math.min(80, cv),
        firstDetected: sessions[sessions.length - 1].session_date,
        trend: 'stable'
      };
    }

    return null;
  }

  private calculateRiskScore(
    trainingLoad: TrainingLoadMetrics,
    recoveryAnalysis: any,
    fatiguePatterns: FatiguePattern[]
  ): number {
    let score = 0;

    // Training load contribution
    switch (trainingLoad.overtrainingRisk) {
      case 'critical': score += 40; break;
      case 'high': score += 30; break;
      case 'moderate': score += 20; break;
      case 'low': score += 5; break;
    }

    // Recovery analysis contribution
    if (recoveryAnalysis.restConsistency < 50) score += 25;
    else if (recoveryAnalysis.restConsistency < 70) score += 15;

    if (recoveryAnalysis.averageRestDays < 3) score += 20;
    else if (recoveryAnalysis.averageRestDays < 4) score += 10;

    // Fatigue patterns contribution
    fatiguePatterns.forEach(pattern => {
      switch (pattern.severity) {
        case 'critical': score += 25; break;
        case 'high': score += 15; break;
        case 'moderate': score += 8; break;
        case 'low': score += 3; break;
      }
    });

    // Load intensity contribution
    switch (trainingLoad.loadIntensity) {
      case 'very_high': score += 20; break;
      case 'high': score += 10; break;
      case 'moderate': score += 5; break;
    }

    return Math.min(100, score);
  }

  private categorizeRisk(score: number): 'low' | 'moderate' | 'high' | 'critical' {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'moderate';
    return 'low';
  }

  private identifySecondaryIndicators(trainingLoad: TrainingLoadMetrics, recoveryAnalysis: any): string[] {
    const indicators: string[] = [];

    if (trainingLoad.recoveryDemand > 70) {
      indicators.push('High recovery demand detected');
    }

    if (recoveryAnalysis.averageRestDays < 3.5) {
      indicators.push('Below optimal rest periods');
    }

    if (trainingLoad.loadTrend === 'increasing') {
      indicators.push('Rapidly increasing training load');
    }

    return indicators;
  }

  private determineRecoveryNeeds(risk: string, patterns: FatiguePattern[]) {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    switch (risk) {
      case 'critical':
        immediate.push('Complete training cessation for 1-2 weeks');
        immediate.push('Focus on sleep and nutrition recovery');
        shortTerm.push('Gradual return to training with 50% volume');
        longTerm.push('Implement periodized training cycles');
        break;

      case 'high':
        immediate.push('Reduce training volume by 40-60%');
        immediate.push('Increase rest days to 2-3 between sessions');
        shortTerm.push('Monitor fatigue markers daily');
        longTerm.push('Establish consistent recovery protocols');
        break;

      case 'moderate':
        immediate.push('Reduce volume by 20-30% for 1-2 weeks');
        shortTerm.push('Add extra rest days');
        longTerm.push('Improve recovery monitoring habits');
        break;
    }

    // Pattern-specific recovery needs
    patterns.forEach(pattern => {
      switch (pattern.pattern) {
        case 'acute_fatigue':
          immediate.push('Prioritize sleep and stress management');
          break;
        case 'chronic_fatigue':
          longTerm.push('Comprehensive hormonal and metabolic assessment');
          break;
        case 'recovery_stall':
          shortTerm.push('Optimize nutrition and supplementation');
          break;
      }
    });

    return { immediate, shortTerm, longTerm };
  }

  private generateRecommendedActions(risk: string, score: number, patterns: FatiguePattern[]) {
    const actions: Array<{
      action: string;
      priority: 'urgent' | 'high' | 'medium' | 'low';
      timeframe: string;
      expectedOutcome: string;
    }> = [];

    // Risk-based actions
    switch (risk) {
      case 'critical':
        actions.push({
          action: 'Implement immediate deload period (1-2 weeks)',
          priority: 'urgent',
          timeframe: 'Start today',
          expectedOutcome: 'Restore baseline recovery capacity'
        });
        break;

      case 'high':
        actions.push({
          action: 'Reduce training frequency by 40-50%',
          priority: 'urgent',
          timeframe: 'Next 1-2 weeks',
          expectedOutcome: 'Allow accumulated fatigue to dissipate'
        });
        break;

      case 'moderate':
        actions.push({
          action: 'Reduce training volume by 20-30%',
          priority: 'high',
          timeframe: 'Next training cycle',
          expectedOutcome: 'Prevent progression to high risk'
        });
        break;
    }

    // Pattern-specific actions
    patterns.forEach(pattern => {
      switch (pattern.pattern) {
        case 'acute_fatigue':
          actions.push({
            action: 'Focus on sleep quality and stress reduction',
            priority: 'high',
            timeframe: 'Ongoing',
            expectedOutcome: 'Accelerate acute fatigue recovery'
          });
          break;

        case 'chronic_fatigue':
          actions.push({
            action: 'Consult healthcare professional for comprehensive assessment',
            priority: 'urgent',
            timeframe: 'Within 1 week',
            expectedOutcome: 'Identify underlying causes of chronic fatigue'
          });
          break;
      }
    });

    return actions;
  }

  private establishMonitoringPoints(risk: string): string[] {
    const points: string[] = [
      'Daily fatigue levels (1-10 scale)',
      'Sleep quality and duration',
      'Resting heart rate trends',
      'Session RPE (Rate of Perceived Exertion)'
    ];

    if (risk === 'high' || risk === 'critical') {
      points.push('Weekly performance tests');
      points.push('Body weight and composition changes');
      points.push('Mood and motivation levels');
    }

    return points;
  }

  private calculateReassessmentDate(risk: string): string {
    const now = new Date();

    switch (risk) {
      case 'critical': now.setDate(now.getDate() + 7); break;
      case 'high': now.setDate(now.getDate() + 5); break;
      case 'moderate': now.setDate(now.getDate() + 10); break;
      default: now.setDate(now.getDate() + 14); break;
    }

    return now.toISOString().split('T')[0];
  }

  // Utility methods
  private calculateAverageVolume(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    return sessions.reduce((sum, session) => sum + this.calculateSessionVolume(session), 0) / sessions.length;
  }

  private calculateSessionVolume(session: any): number {
    if (!session.set_logs) return 0;
    return session.set_logs.reduce((sum: number, log: any) =>
      sum + ((log.weight_kg || 0) * (log.reps || 0)), 0);
  }

  private calculateLinearTrend(values: number[]): { slope: number; rSquared: number } {
    const n = values.length;
    if (n < 3) return { slope: 0, rSquared: 0 };

    const x = Array.from({ length: n }, (_, i) => i);
    const y = values.reverse(); // Most recent first to oldest last

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

    return { slope, rSquared };
  }
}

export const overtrainingDetector = new OvertrainingDetectorService();