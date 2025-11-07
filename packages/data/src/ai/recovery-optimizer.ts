import { supabase } from '../supabase/client-mobile';
import { performanceAnalytics, ExercisePerformanceData } from './performance-analytics';

export interface RecoveryAnalysis {
  userId: string;
  overallRecoveryHealth: number; // 0-100 score
  recoveryStatus: 'optimal' | 'adequate' | 'concerning' | 'critical';
  restPeriodAnalysis: RestPeriodAnalysis;
  fatiguePatterns: FatiguePattern[];
  recoveryRecommendations: RecoveryRecommendation[];
  trainingLoadAssessment: TrainingLoadAssessment;
  analysisSummary: string;
  detailedInsights: string;
}

export interface RestPeriodAnalysis {
  averageRestDays: number;
  optimalRestDays: number;
  restConsistency: number; // 0-100
  restPeriodTrends: RestPeriodTrend[];
  problematicExercises: string[]; // Exercise IDs needing more rest
}

export interface RestPeriodTrend {
  exerciseId: string;
  exerciseName: string;
  currentRestDays: number;
  recommendedRestDays: number;
  performanceImpact: number; // -1 to 1 (negative = declining performance)
  trendDirection: 'improving' | 'stable' | 'declining';
}

export interface FatiguePattern {
  pattern: 'accumulating' | 'cycling' | 'stable' | 'recovering';
  severity: number; // 0-1
  duration: number; // weeks
  exercisesAffected: string[];
  description: string;
  recommendedAction: string;
}

export interface RecoveryRecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'rest_periods' | 'training_frequency' | 'volume_adjustment' | 'deload' | 'nutrition' | 'sleep';
  title: string;
  description: string;
  expectedBenefit: string;
  implementation: string[];
  timeframe: string;
}

export interface TrainingLoadAssessment {
  currentLoad: number;
  sustainableLoad: number;
  loadTrend: 'increasing' | 'stable' | 'decreasing';
  loadBalance: number; // 0-100 (how balanced across muscle groups)
  overtrainedMuscles: string[];
  undertrainedMuscles: string[];
  loadDistribution: MuscleGroupLoad[];
}

export interface MuscleGroupLoad {
  muscleGroup: string;
  currentVolume: number;
  optimalVolume: number;
  loadPercentage: number; // 0-200 (100 = optimal)
  lastTrained: string; // ISO date
  recoveryStatus: 'fresh' | 'optimal' | 'fatigued' | 'overtrained';
}

class RecoveryOptimizerService {
  /**
   * Comprehensive recovery analysis for a user
   */
  async analyzeRecovery(userId: string): Promise<RecoveryAnalysis | null> {
    try {
      // Get user's recent workout history
      const recentSessions = await this.getRecentSessions(userId, 12); // Last 12 weeks
      if (recentSessions.length < 3) return null;

      // Analyze rest periods between sessions
      const restPeriodAnalysis = await this.analyzeRestPeriods(userId, recentSessions);

      // Analyze fatigue patterns
      const fatiguePatterns = await this.analyzeFatiguePatterns(userId, recentSessions);

      // Assess training load
      const trainingLoadAssessment = await this.assessTrainingLoad(userId, recentSessions);

      // Generate recovery recommendations
      const recoveryRecommendations = this.generateRecoveryRecommendations(
        restPeriodAnalysis,
        fatiguePatterns,
        trainingLoadAssessment
      );

      // Calculate overall recovery health score
      const overallRecoveryHealth = this.calculateRecoveryHealthScore(
        restPeriodAnalysis,
        fatiguePatterns,
        trainingLoadAssessment
      );

      const recoveryStatus = this.determineRecoveryStatus(overallRecoveryHealth);

      // Create analysis summaries
      const analysisSummary = this.createAnalysisSummary(recoveryStatus, overallRecoveryHealth);
      const detailedInsights = this.createDetailedInsights(
        restPeriodAnalysis,
        fatiguePatterns,
        trainingLoadAssessment
      );

      return {
        userId,
        overallRecoveryHealth,
        recoveryStatus,
        restPeriodAnalysis,
        fatiguePatterns,
        recoveryRecommendations,
        trainingLoadAssessment,
        analysisSummary,
        detailedInsights
      };
    } catch (error) {
      console.error('Error analyzing recovery:', error);
      return null;
    }
  }

  /**
   * Analyze rest periods between workout sessions
   */
  private async analyzeRestPeriods(userId: string, sessions: any[]): Promise<RestPeriodAnalysis> {
    const restPeriods: number[] = [];
    const exerciseRestPeriods: Map<string, number[]> = new Map();

    // Calculate rest days between consecutive sessions
    for (let i = 1; i < sessions.length; i++) {
      const currentSession = new Date(sessions[i].session_date);
      const previousSession = new Date(sessions[i - 1].session_date);
      const restDays = Math.round((currentSession.getTime() - previousSession.getTime()) / (1000 * 60 * 60 * 24));

      restPeriods.push(restDays);

      // Track rest periods per exercise
      const exerciseIds = sessions[i].exercise_ids || [];
      exerciseIds.forEach((exerciseId: string) => {
        if (!exerciseRestPeriods.has(exerciseId)) {
          exerciseRestPeriods.set(exerciseId, []);
        }
        exerciseRestPeriods.get(exerciseId)!.push(restDays);
      });
    }

    const averageRestDays = restPeriods.length > 0
      ? restPeriods.reduce((sum, days) => sum + days, 0) / restPeriods.length
      : 0;

    // Calculate optimal rest days based on training frequency
    const sessionsPerWeek = this.calculateSessionsPerWeek(sessions);
    const optimalRestDays = this.getOptimalRestDays(sessionsPerWeek);

    // Analyze rest period consistency
    const restConsistency = this.calculateRestConsistency(restPeriods, optimalRestDays);

    // Analyze rest period trends per exercise
    const restPeriodTrends = await this.analyzeExerciseRestTrends(userId, exerciseRestPeriods, optimalRestDays);

    // Identify problematic exercises
    const problematicExercises = restPeriodTrends
      .filter(trend => trend.performanceImpact < -0.3)
      .map(trend => trend.exerciseId);

    return {
      averageRestDays,
      optimalRestDays,
      restConsistency,
      restPeriodTrends,
      problematicExercises
    };
  }

  /**
   * Analyze fatigue patterns across training history
   */
  private async analyzeFatiguePatterns(userId: string, sessions: any[]): Promise<FatiguePattern[]> {
    const patterns: FatiguePattern[] = [];

    if (sessions.length < 6) return patterns;

    // Analyze performance trends to detect fatigue patterns
    const performanceData = await this.getPerformanceTrends(userId, sessions);

    // Detect accumulating fatigue
    const accumulatingFatigue = this.detectAccumulatingFatigue(performanceData);
    if (accumulatingFatigue) {
      patterns.push(accumulatingFatigue);
    }

    // Detect fatigue cycling
    const fatigueCycling = this.detectFatigueCycling(performanceData);
    if (fatigueCycling) {
      patterns.push(fatigueCycling);
    }

    // Detect stable/recovering patterns
    const stablePattern = this.detectStablePattern(performanceData);
    if (stablePattern) {
      patterns.push(stablePattern);
    }

    return patterns;
  }

  /**
   * Assess current training load and distribution
   */
  private async assessTrainingLoad(userId: string, sessions: any[]): Promise<TrainingLoadAssessment> {
    // Calculate current training load
    const currentLoad = this.calculateCurrentTrainingLoad(sessions);

    // Estimate sustainable load based on recovery patterns
    const sustainableLoad = this.calculateSustainableLoad(sessions);

    // Analyze load trend
    const loadTrend = this.analyzeLoadTrend(sessions);

    // Assess muscle group balance
    const muscleGroupLoads = await this.analyzeMuscleGroupBalance(userId, sessions);
    const loadBalance = this.calculateLoadBalance(muscleGroupLoads);

    // Identify over/undertrained muscles
    const overtrainedMuscles = muscleGroupLoads
      .filter(muscle => muscle.loadPercentage > 150)
      .map(muscle => muscle.muscleGroup);

    const undertrainedMuscles = muscleGroupLoads
      .filter(muscle => muscle.loadPercentage < 70)
      .map(muscle => muscle.muscleGroup);

    return {
      currentLoad,
      sustainableLoad,
      loadTrend,
      loadBalance,
      overtrainedMuscles,
      undertrainedMuscles,
      loadDistribution: muscleGroupLoads
    };
  }

  /**
   * Generate personalized recovery recommendations
   */
  private generateRecoveryRecommendations(
    restAnalysis: RestPeriodAnalysis,
    fatiguePatterns: FatiguePattern[],
    loadAssessment: TrainingLoadAssessment
  ): RecoveryRecommendation[] {
    const recommendations: RecoveryRecommendation[] = [];

    // Rest period recommendations
    if (restAnalysis.averageRestDays < restAnalysis.optimalRestDays * 0.8) {
      recommendations.push({
        type: 'immediate',
        priority: 'high',
        category: 'rest_periods',
        title: 'Increase Rest Between Sessions',
        description: `Your average rest period of ${restAnalysis.averageRestDays.toFixed(1)} days is shorter than the optimal ${restAnalysis.optimalRestDays.toFixed(1)} days for your training frequency.`,
        expectedBenefit: 'Improved recovery, better performance, reduced injury risk',
        implementation: [
          'Schedule workouts every 4-5 days instead of 3-4 days',
          'Consider splitting intense sessions across the week',
          'Monitor how you feel - energy levels should improve'
        ],
        timeframe: 'Start this week'
      });
    }

    // Fatigue-based recommendations
    fatiguePatterns.forEach(pattern => {
      if (pattern.pattern === 'accumulating' && pattern.severity > 0.6) {
        recommendations.push({
          type: 'immediate',
          priority: 'urgent',
          category: 'deload',
          title: 'Schedule a Deload Week',
          description: 'Accumulating fatigue detected. A recovery week will restore strength gains and prevent overtraining.',
          expectedBenefit: 'Reset fatigue levels, restore motivation, improve long-term progress',
          implementation: [
            'Reduce training volume by 40-60% for 5-7 days',
            'Maintain exercise frequency but lower intensity',
            'Focus on technique and mobility work'
          ],
          timeframe: 'Within the next 3-5 days'
        });
      }
    });

    // Training load recommendations
    if (loadAssessment.currentLoad > loadAssessment.sustainableLoad * 1.2) {
      recommendations.push({
        type: 'short_term',
        priority: 'high',
        category: 'volume_adjustment',
        title: 'Reduce Training Volume',
        description: `Your current training load (${loadAssessment.currentLoad.toFixed(0)}) exceeds your sustainable capacity (${loadAssessment.sustainableLoad.toFixed(0)}).`,
        expectedBenefit: 'Better recovery, sustained progress, reduced burnout risk',
        implementation: [
          'Decrease sets per exercise by 1-2',
          'Reduce weekly training frequency by 1 session',
          'Focus on quality over quantity'
        ],
        timeframe: 'Next 2-3 weeks'
      });
    }

    // Muscle balance recommendations
    if (loadAssessment.loadBalance < 60) {
      recommendations.push({
        type: 'short_term',
        priority: 'medium',
        category: 'training_frequency',
        title: 'Balance Muscle Group Training',
        description: 'Some muscle groups are overtrained while others are undertrained, creating imbalances.',
        expectedBenefit: 'Reduced injury risk, better overall development, improved posture',
        implementation: [
          `Increase focus on: ${loadAssessment.undertrainedMuscles.join(', ')}`,
          `Reduce volume for: ${loadAssessment.overtrainedMuscles.join(', ')}`,
          'Ensure each major muscle group is trained 2-3 times per week'
        ],
        timeframe: 'Next training cycle'
      });
    }

    // Long-term recovery optimization
    if (restAnalysis.restConsistency < 70) {
      recommendations.push({
        type: 'long_term',
        priority: 'medium',
        category: 'training_frequency',
        title: 'Establish Consistent Training Schedule',
        description: 'Inconsistent rest periods make it harder to optimize recovery and progress.',
        expectedBenefit: 'More predictable progress, better planning, improved recovery',
        implementation: [
          'Set fixed training days each week',
          'Plan rest days strategically around work/life demands',
          'Track how consistent scheduling affects your energy levels'
        ],
        timeframe: 'Ongoing - establish within 4 weeks'
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall recovery health score
   */
  private calculateRecoveryHealthScore(
    restAnalysis: RestPeriodAnalysis,
    fatiguePatterns: FatiguePattern[],
    loadAssessment: TrainingLoadAssessment
  ): number {
    let score = 100;

    // Rest period quality (30% weight)
    const restQuality = Math.min(100, (restAnalysis.averageRestDays / restAnalysis.optimalRestDays) * 100);
    const restConsistencyBonus = restAnalysis.restConsistency * 0.2; // 0-20 points
    score -= (100 - restQuality) * 0.3;
    score += restConsistencyBonus;

    // Fatigue patterns (40% weight)
    const worstFatigue = Math.max(...fatiguePatterns.map(p => p.severity), 0);
    score -= worstFatigue * 40;

    // Training load sustainability (30% weight)
    const loadRatio = loadAssessment.currentLoad / loadAssessment.sustainableLoad;
    if (loadRatio > 1.2) {
      score -= (loadRatio - 1.2) * 25; // Penalty for excessive load
    } else if (loadRatio < 0.8) {
      score -= (0.8 - loadRatio) * 10; // Smaller penalty for undertraining
    }

    // Load balance bonus/penalty
    score += (loadAssessment.loadBalance - 50) * 0.2; // ±10 points based on balance

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Determine recovery status from health score
   */
  private determineRecoveryStatus(score: number): 'optimal' | 'adequate' | 'concerning' | 'critical' {
    if (score >= 80) return 'optimal';
    if (score >= 60) return 'adequate';
    if (score >= 40) return 'concerning';
    return 'critical';
  }

  /**
   * Create user-friendly analysis summary
   */
  private createAnalysisSummary(status: string, score: number): string {
    switch (status) {
      case 'optimal':
        return `✅ Your recovery is optimal (${score}/100). Keep up the great work - your training schedule supports excellent progress!`;
      case 'adequate':
        return `🟢 Your recovery is adequate (${score}/100). Small adjustments could optimize your training effectiveness.`;
      case 'concerning':
        return `🟡 Your recovery needs attention (${score}/100). Consider the recommendations below to prevent training stagnation.`;
      case 'critical':
        return `🚨 Your recovery is critical (${score}/100). Immediate action needed to prevent overtraining and injury.`;
      default:
        return `Your recovery health score is ${score}/100.`;
    }
  }

  /**
   * Create detailed insights for advanced users
   */
  private createDetailedInsights(
    restAnalysis: RestPeriodAnalysis,
    fatiguePatterns: FatiguePattern[],
    loadAssessment: TrainingLoadAssessment
  ): string {
    let insights = `Recovery Analysis Details:\n\n`;

    insights += `Rest Periods:\n`;
    insights += `• Average: ${restAnalysis.averageRestDays.toFixed(1)} days\n`;
    insights += `• Optimal: ${restAnalysis.optimalRestDays.toFixed(1)} days\n`;
    insights += `• Consistency: ${restAnalysis.restConsistency.toFixed(0)}%\n\n`;

    if (fatiguePatterns.length > 0) {
      insights += `Fatigue Patterns:\n`;
      fatiguePatterns.forEach(pattern => {
        insights += `• ${pattern.pattern.charAt(0).toUpperCase() + pattern.pattern.slice(1)} fatigue (${Math.round(pattern.severity * 100)}% severity)\n`;
      });
      insights += `\n`;
    }

    insights += `Training Load:\n`;
    insights += `• Current: ${loadAssessment.currentLoad.toFixed(0)}\n`;
    insights += `• Sustainable: ${loadAssessment.sustainableLoad.toFixed(0)}\n`;
    insights += `• Balance Score: ${loadAssessment.loadBalance.toFixed(0)}/100\n`;

    if (loadAssessment.overtrainedMuscles.length > 0) {
      insights += `• Overtrained: ${loadAssessment.overtrainedMuscles.join(', ')}\n`;
    }
    if (loadAssessment.undertrainedMuscles.length > 0) {
      insights += `• Undertrained: ${loadAssessment.undertrainedMuscles.join(', ')}\n`;
    }

    return insights;
  }

  // Helper methods

  private async getRecentSessions(userId: string, weeks: number): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));

    const { data, error } = await supabase
      .from('workout_sessions')
      .select(`
        id,
        session_date,
        set_logs(exercise_id)
      `)
      .eq('user_id', userId)
      .gte('session_date', cutoffDate.toISOString())
      .order('session_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(session => ({
      ...session,
      exercise_ids: session.set_logs?.map((log: any) => log.exercise_id) || []
    }));
  }

  private calculateSessionsPerWeek(sessions: any[]): number {
    if (sessions.length < 2) return 0;

    const firstDate = new Date(sessions[sessions.length - 1].session_date);
    const lastDate = new Date(sessions[0].session_date);
    const weeksDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7);

    return weeksDiff > 0 ? sessions.length / weeksDiff : 0;
  }

  private getOptimalRestDays(sessionsPerWeek: number): number {
    if (sessionsPerWeek <= 2) return 5; // 2 sessions/week = ~3.5 days between
    if (sessionsPerWeek <= 4) return 2.5; // 4 sessions/week = 1.75 days between
    return 1.5; // 6+ sessions/week = 1.17 days between
  }

  private calculateRestConsistency(restPeriods: number[], optimalRest: number): number {
    if (restPeriods.length === 0) return 100;

    const deviations = restPeriods.map(days => Math.abs(days - optimalRest));
    const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    const maxDeviation = optimalRest * 0.5; // 50% deviation allowed

    return Math.max(0, Math.min(100, 100 - (avgDeviation / maxDeviation) * 100));
  }

  private async analyzeExerciseRestTrends(
    userId: string,
    exerciseRestPeriods: Map<string, number[]>,
    optimalRest: number
  ): Promise<RestPeriodTrend[]> {
    const trends: RestPeriodTrend[] = [];

    for (const [exerciseId, restDays] of exerciseRestPeriods) {
      if (restDays.length < 2) continue;

      const avgRestDays = restDays.reduce((sum, days) => sum + days, 0) / restDays.length;

      // Get exercise performance data
      const performanceData = await performanceAnalytics.getExerciseAnalytics(userId, exerciseId, 10);
      if (!performanceData) continue;

      // Calculate performance trend during these rest periods
      const performanceImpact = this.calculatePerformanceImpact(performanceData, restDays, optimalRest);

      // Determine trend direction
      const trendDirection = performanceImpact > 0.1 ? 'improving' :
                           performanceImpact < -0.1 ? 'declining' : 'stable';

      trends.push({
        exerciseId,
        exerciseName: performanceData.exerciseName,
        currentRestDays: avgRestDays,
        recommendedRestDays: optimalRest,
        performanceImpact,
        trendDirection
      });
    }

    return trends;
  }

  private calculatePerformanceImpact(
    analytics: ExercisePerformanceData,
    restDays: number[],
    optimalRest: number
  ): number {
    // Simplified: better rest periods should correlate with better performance
    const avgRestDeviation = restDays.reduce((sum, days) => sum + Math.abs(days - optimalRest), 0) / restDays.length;
    const maxDeviation = optimalRest;

    // Convert deviation to performance impact (-1 to 1)
    return Math.max(-1, Math.min(1, 1 - (avgRestDeviation / maxDeviation) * 2));
  }

  private detectAccumulatingFatigue(performanceData: any[]): FatiguePattern | null {
    if (performanceData.length < 6) return null;

    // Look for declining performance over recent sessions
    const recent = performanceData.slice(0, 4);
    const earlier = performanceData.slice(4, 8);

    const recentAvg = recent.reduce((sum, p) => sum + p.performance, 0) / recent.length;
    const earlierAvg = earlier.length > 0 ? earlier.reduce((sum, p) => sum + p.performance, 0) / earlier.length : recentAvg;

    const decline = (earlierAvg - recentAvg) / earlierAvg;

    if (decline > 0.15) { // 15% decline
      return {
        pattern: 'accumulating',
        severity: Math.min(1, decline * 2),
        duration: recent.length,
        exercisesAffected: [], // Would need to be populated based on analysis
        description: `Performance declining by ${Math.round(decline * 100)}% over recent sessions`,
        recommendedAction: 'Implement deload week and increase rest periods'
      };
    }

    return null;
  }

  private detectFatigueCycling(performanceData: any[]): FatiguePattern | null {
    if (performanceData.length < 8) return null;

    // Look for oscillating performance (up-down-up-down pattern)
    let oscillations = 0;
    for (let i = 2; i < performanceData.length; i++) {
      const trend1 = performanceData[i-2].performance - performanceData[i-1].performance;
      const trend2 = performanceData[i-1].performance - performanceData[i].performance;

      if ((trend1 > 0 && trend2 < 0) || (trend1 < 0 && trend2 > 0)) {
        oscillations++;
      }
    }

    const oscillationRate = oscillations / (performanceData.length - 2);

    if (oscillationRate > 0.6) { // 60% of sessions show oscillation
      return {
        pattern: 'cycling',
        severity: oscillationRate,
        duration: performanceData.length,
        exercisesAffected: [],
        description: 'Performance oscillating - possible inconsistent recovery',
        recommendedAction: 'Stabilize rest periods and training consistency'
      };
    }

    return null;
  }

  private detectStablePattern(performanceData: any[]): FatiguePattern | null {
    if (performanceData.length < 4) return null;

    // Calculate performance variability
    const performances = performanceData.map(p => p.performance);
    const avg = performances.reduce((sum, p) => sum + p, 0) / performances.length;
    const variance = performances.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / performances.length;
    const cv = Math.sqrt(variance) / avg; // Coefficient of variation

    if (cv < 0.1) { // Less than 10% variation
      return {
        pattern: 'stable',
        severity: 0.1,
        duration: performanceData.length,
        exercisesAffected: [],
        description: 'Performance stable with low variability',
        recommendedAction: 'Continue current approach - recovery well managed'
      };
    }

    return null;
  }

  private calculateCurrentTrainingLoad(sessions: any[]): number {
    // Simplified load calculation: sessions per week × average exercises per session
    const sessionsPerWeek = this.calculateSessionsPerWeek(sessions);
    const avgExercisesPerSession = sessions.reduce((sum, session) =>
      sum + (session.exercise_ids?.length || 0), 0) / sessions.length;

    return sessionsPerWeek * avgExercisesPerSession;
  }

  private calculateSustainableLoad(sessions: any[]): number {
    // Estimate sustainable load based on consistency and rest periods
    const baseLoad = this.calculateCurrentTrainingLoad(sessions);
    const sessionsPerWeek = this.calculateSessionsPerWeek(sessions);

    // Adjust based on training frequency
    let sustainabilityFactor = 1;
    if (sessionsPerWeek > 5) sustainabilityFactor = 0.8;
    else if (sessionsPerWeek > 3) sustainabilityFactor = 0.9;
    else if (sessionsPerWeek < 2) sustainabilityFactor = 1.1;

    return baseLoad * sustainabilityFactor;
  }

  private analyzeLoadTrend(sessions: any[]): 'increasing' | 'stable' | 'decreasing' {
    if (sessions.length < 4) return 'stable';

    const recent = sessions.slice(0, Math.floor(sessions.length / 2));
    const earlier = sessions.slice(Math.floor(sessions.length / 2));

    const recentLoad = this.calculateCurrentTrainingLoad(recent);
    const earlierLoad = this.calculateCurrentTrainingLoad(earlier);

    const change = (recentLoad - earlierLoad) / earlierLoad;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private async analyzeMuscleGroupBalance(userId: string, sessions: any[]): Promise<MuscleGroupLoad[]> {
    // This would require mapping exercises to muscle groups
    // Simplified implementation - would need actual exercise data
    const muscleGroups = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'];

    return muscleGroups.map(group => ({
      muscleGroup: group,
      currentVolume: Math.random() * 100, // Placeholder
      optimalVolume: 80 + Math.random() * 40, // Placeholder
      loadPercentage: 80 + Math.random() * 40, // Placeholder
      lastTrained: new Date().toISOString(),
      recoveryStatus: 'optimal' as const
    }));
  }

  private calculateLoadBalance(muscleLoads: MuscleGroupLoad[]): number {
    const percentages = muscleLoads.map(m => m.loadPercentage);
    const avg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const variance = percentages.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / percentages.length;

    // Convert to balance score (lower variance = higher balance)
    return Math.max(0, Math.min(100, 100 - Math.sqrt(variance)));
  }

  private async getPerformanceTrends(userId: string, sessions: any[]): Promise<any[]> {
    // Simplified - would need actual performance calculation per session
    return sessions.map((session, index) => ({
      sessionId: session.id,
      performance: 0.8 + Math.random() * 0.4, // Placeholder performance score
      date: session.session_date
    }));
  }
}

export const recoveryOptimizer = new RecoveryOptimizerService();