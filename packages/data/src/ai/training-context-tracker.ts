import { supabase } from '../supabase/client-mobile';

export interface SessionContext {
  sessionId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // minutes
  exercisesCompleted: number;
  totalSets: number;
  totalVolume: number; // weight × reps across all sets
  averageIntensity: number; // average weight used
  restPeriods: number[]; // rest times between sets in seconds
  completionRate: number; // percentage of planned exercises completed
}

export interface RestPeriodAnalysis {
  averageRestDays: number;
  optimalRestDays: number;
  restConsistency: number; // 0-100
  restPeriodTrend: 'increasing' | 'stable' | 'decreasing';
  problematicPatterns: RestPatternIssue[];
  recommendedAdjustments: RestRecommendation[];
}

export interface RestPatternIssue {
  pattern: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  suggestion: string;
}

export interface RestRecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  action: string;
  rationale: string;
  expectedBenefit: string;
}

export interface TrainingLoadMetrics {
  currentLoad: number;
  sustainableLoad: number;
  loadTrend: 'increasing' | 'stable' | 'decreasing';
  loadIntensity: 'low' | 'moderate' | 'high' | 'very_high';
  recoveryDemand: number; // 0-100 (higher = more recovery needed)
  overtrainingRisk: 'low' | 'moderate' | 'high' | 'critical';
  loadBalance: MuscleGroupBalance[];
}

export interface MuscleGroupBalance {
  muscleGroup: string;
  currentVolume: number;
  targetVolume: number;
  balanceRatio: number; // 0-200 (100 = optimal)
  lastTrained: string;
  recoveryStatus: 'fresh' | 'optimal' | 'fatigued' | 'overtrained';
}

export interface TrainingContextSummary {
  userId: string;
  analysisPeriod: {
    startDate: string;
    endDate: string;
    totalSessions: number;
  };
  sessionMetrics: {
    averageDuration: number;
    durationTrend: 'increasing' | 'stable' | 'decreasing';
    averageExercises: number;
    averageVolume: number;
    completionRate: number;
  };
  restPeriodAnalysis: RestPeriodAnalysis;
  trainingLoadMetrics: TrainingLoadMetrics;
  recoveryFactors: {
    currentRecoveryDemand: number;
    recoveryEfficiency: number; // how well user recovers between sessions
    fatigueAccumulation: number;
    recommendedRestDays: number;
  };
  insights: TrainingInsight[];
  recommendations: TrainingRecommendation[];
}

export interface TrainingInsight {
  type: 'positive' | 'neutral' | 'concerning';
  category: 'duration' | 'frequency' | 'intensity' | 'recovery' | 'balance';
  title: string;
  description: string;
  metric?: string;
  trend?: 'improving' | 'stable' | 'declining';
}

export interface TrainingRecommendation {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'session_duration' | 'training_frequency' | 'rest_periods' | 'volume_adjustment' | 'exercise_balance';
  title: string;
  description: string;
  action: string;
  timeframe: string;
  expectedOutcome: string;
}

class TrainingContextTrackerService {
  /**
   * Track session start
   */
  async startSessionTracking(sessionId: string, userId: string): Promise<void> {
    const sessionContext: Partial<SessionContext> = {
      sessionId,
      userId,
      startTime: new Date().toISOString(),
      exercisesCompleted: 0,
      totalSets: 0,
      totalVolume: 0,
      averageIntensity: 0,
      restPeriods: [],
      completionRate: 0
    };

    // Store in local state or database
    // This would integrate with existing session tracking
    console.log('Started tracking session:', sessionId);
  }

  /**
   * Track session completion with metrics
   */
  async completeSessionTracking(
    sessionId: string,
    userId: string,
    sessionData: {
      duration: number;
      exercisesCompleted: number;
      totalSets: number;
      totalVolume: number;
      averageIntensity: number;
      restPeriods: number[];
      plannedExercises: number;
    }
  ): Promise<void> {
    const completionRate = sessionData.plannedExercises > 0
      ? (sessionData.exercisesCompleted / sessionData.plannedExercises) * 100
      : 100;

    const sessionContext: SessionContext = {
      sessionId,
      userId,
      startTime: new Date(Date.now() - sessionData.duration * 60000).toISOString(),
      endTime: new Date().toISOString(),
      duration: sessionData.duration,
      exercisesCompleted: sessionData.exercisesCompleted,
      totalSets: sessionData.totalSets,
      totalVolume: sessionData.totalVolume,
      averageIntensity: sessionData.averageIntensity,
      restPeriods: sessionData.restPeriods,
      completionRate
    };

    // Store session context for analysis
    console.log('Completed session tracking:', sessionContext);
  }

  /**
   * Analyze rest periods between sessions
   */
  async analyzeRestPeriods(userId: string, weeks: number = 8): Promise<RestPeriodAnalysis> {
    const sessions = await this.getRecentSessions(userId, weeks);

    if (sessions.length < 2) {
      return {
        averageRestDays: 0,
        optimalRestDays: 3,
        restConsistency: 100,
        restPeriodTrend: 'stable',
        problematicPatterns: [],
        recommendedAdjustments: []
      };
    }

    // Calculate rest days between sessions
    const restDays: number[] = [];
    for (let i = 1; i < sessions.length; i++) {
      const currentDate = new Date(sessions[i].session_date);
      const previousDate = new Date(sessions[i - 1].session_date);
      const daysDiff = Math.round((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      restDays.push(daysDiff);
    }

    const averageRestDays = restDays.reduce((sum, days) => sum + days, 0) / restDays.length;

    // Calculate sessions per week to determine optimal rest
    const totalDays = weeks * 7;
    const sessionsPerWeek = (sessions.length / weeks);
    const optimalRestDays = this.calculateOptimalRestDays(sessionsPerWeek);

    // Analyze consistency
    const restConsistency = this.calculateRestConsistency(restDays, optimalRestDays);

    // Analyze trend
    const restPeriodTrend = this.analyzeRestTrend(restDays);

    // Identify problematic patterns
    const problematicPatterns = this.identifyRestPatternIssues(restDays, optimalRestDays, sessionsPerWeek);

    // Generate recommendations
    const recommendedAdjustments = this.generateRestRecommendations(
      averageRestDays,
      optimalRestDays,
      restConsistency,
      problematicPatterns
    );

    return {
      averageRestDays,
      optimalRestDays,
      restConsistency,
      restPeriodTrend,
      problematicPatterns,
      recommendedAdjustments
    };
  }

  /**
   * Calculate training load metrics
   */
  async calculateTrainingLoad(userId: string, weeks: number = 4): Promise<TrainingLoadMetrics> {
    const sessions = await this.getRecentSessions(userId, weeks);

    if (sessions.length === 0) {
      return {
        currentLoad: 0,
        sustainableLoad: 50,
        loadTrend: 'stable',
        loadIntensity: 'low',
        recoveryDemand: 20,
        overtrainingRisk: 'low',
        loadBalance: []
      };
    }

    // Calculate current load based on volume and frequency
    const sessionsPerWeek = sessions.length / weeks;
    const avgVolumePerSession = sessions.reduce((sum, session) =>
      sum + (session.total_volume || 0), 0) / sessions.length;

    const currentLoad = this.calculateLoadScore(sessionsPerWeek, avgVolumePerSession);

    // Estimate sustainable load based on consistency and patterns
    const sustainableLoad = this.calculateSustainableLoad(sessions, currentLoad);

    // Analyze load trend
    const loadTrend = this.analyzeLoadTrend(sessions);

    // Determine intensity level
    const loadIntensity = this.categorizeLoadIntensity(currentLoad, sustainableLoad);

    // Calculate recovery demand
    const recoveryDemand = this.calculateRecoveryDemand(currentLoad, sustainableLoad, sessionsPerWeek);

    // Assess overtraining risk
    const overtrainingRisk = this.assessOvertrainingRisk(currentLoad, sustainableLoad, recoveryDemand);

    // Analyze muscle group balance
    const loadBalance = await this.analyzeMuscleGroupBalance(userId, sessions);

    return {
      currentLoad,
      sustainableLoad,
      loadTrend,
      loadIntensity,
      recoveryDemand,
      overtrainingRisk,
      loadBalance
    };
  }

  /**
   * Calculate actual training frequency from workout history
   */
  async calculateActualTrainingFrequency(userId: string, weeks: number = 12): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));

      const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select('session_date')
        .eq('user_id', userId)
        .gte('session_date', cutoffDate.toISOString())
        .not('completed_at', 'is', null)
        .order('session_date', { ascending: true });

      if (error) throw error;

      if (!sessions || sessions.length < 2) {
        return 3; // Default to 3x/week if insufficient data
      }

      // Count unique workout dates (in case of multiple sessions per day)
      const uniqueDates = new Set(
        sessions.map(session => new Date(session.session_date).toDateString())
      );

      // Calculate sessions per week
      const totalWeeks = weeks;
      const sessionsPerWeek = uniqueDates.size / totalWeeks;

      // Round to nearest 0.5 and clamp to reasonable range
      const frequency = Math.max(1, Math.min(7, Math.round(sessionsPerWeek * 2) / 2));

      return frequency;
    } catch (error) {
      console.error('[TrainingContextTracker] Error calculating training frequency:', error);
      return 3; // Fallback to 3x/week
    }
  }

  /**
   * Generate comprehensive training context summary
   */
  async generateTrainingContextSummary(userId: string): Promise<TrainingContextSummary> {
    const analysisPeriod = {
      startDate: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString(), // 8 weeks ago
      endDate: new Date().toISOString(),
      totalSessions: 0 // Will be set below
    };

    // Get session metrics
    const sessions = await this.getRecentSessions(userId, 8);
    analysisPeriod.totalSessions = sessions.length;

    const sessionMetrics = this.calculateSessionMetrics(sessions);

    // Get rest period analysis
    const restPeriodAnalysis = await this.analyzeRestPeriods(userId, 8);

    // Get training load metrics
    const trainingLoadMetrics = await this.calculateTrainingLoad(userId, 4);

    // Calculate recovery factors
    const recoveryFactors = this.calculateRecoveryFactors(
      restPeriodAnalysis,
      trainingLoadMetrics,
      sessionMetrics
    );

    // Generate insights
    const insights = this.generateTrainingInsights(
      sessionMetrics,
      restPeriodAnalysis,
      trainingLoadMetrics,
      recoveryFactors
    );

    // Generate recommendations
    const recommendations = this.generateTrainingRecommendations(
      sessionMetrics,
      restPeriodAnalysis,
      trainingLoadMetrics,
      recoveryFactors
    );

    return {
      userId,
      analysisPeriod,
      sessionMetrics,
      restPeriodAnalysis,
      trainingLoadMetrics,
      recoveryFactors,
      insights,
      recommendations
    };
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
        completed_at,
        set_logs(
          weight_kg,
          reps,
          exercise_id
        )
      `)
      .eq('user_id', userId)
      .gte('session_date', cutoffDate.toISOString())
      .not('completed_at', 'is', null)
      .order('session_date', { ascending: false });

    if (error) throw error;

    // Calculate metrics for each session
    return (data || []).map(session => {
      const totalVolume = session.set_logs?.reduce((sum: number, log: any) =>
        sum + ((log.weight_kg || 0) * (log.reps || 0)), 0) || 0;

      const totalSets = session.set_logs?.length || 0;
      const uniqueExercises = new Set(session.set_logs?.map((log: any) => log.exercise_id) || []).size;

      return {
        ...session,
        total_volume: totalVolume,
        total_sets: totalSets,
        unique_exercises: uniqueExercises
      };
    });
  }

  private calculateOptimalRestDays(sessionsPerWeek: number): number {
    if (sessionsPerWeek >= 5) return 1.5; // 6+ sessions/week = ~1.2 days between
    if (sessionsPerWeek >= 3) return 2.5; // 3-4 sessions/week = ~2 days between
    if (sessionsPerWeek >= 2) return 3.5; // 2 sessions/week = ~3.5 days between
    return 5; // 1 session/week = 6-7 days between
  }

  private calculateRestConsistency(restDays: number[], optimalRest: number): number {
    if (restDays.length === 0) return 100;

    const deviations = restDays.map(days => Math.abs(days - optimalRest));
    const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    const maxAcceptableDeviation = optimalRest * 0.5; // 50% deviation allowed

    return Math.max(0, Math.min(100, 100 - (avgDeviation / maxAcceptableDeviation) * 100));
  }

  private analyzeRestTrend(restDays: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (restDays.length < 3) return 'stable';

    const recent = restDays.slice(0, Math.floor(restDays.length / 2));
    const earlier = restDays.slice(Math.floor(restDays.length / 2));

    const recentAvg = recent.reduce((sum, days) => sum + days, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, days) => sum + days, 0) / earlier.length;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private identifyRestPatternIssues(
    restDays: number[],
    optimalRest: number,
    sessionsPerWeek: number
  ): RestPatternIssue[] {
    const issues: RestPatternIssue[] = [];

    // Check for too frequent training
    const tooFrequent = restDays.some(days => days < 1);
    if (tooFrequent) {
      issues.push({
        pattern: 'insufficient_recovery',
        severity: 'high',
        description: 'Training sessions too close together',
        impact: 'Increased injury risk and reduced performance',
        suggestion: 'Increase rest days between sessions to at least 48 hours'
      });
    }

    // Check for inconsistent scheduling
    const consistency = this.calculateRestConsistency(restDays, optimalRest);
    if (consistency < 60) {
      issues.push({
        pattern: 'inconsistent_scheduling',
        severity: 'medium',
        description: 'Irregular rest periods between workouts',
        impact: 'Makes recovery optimization difficult',
        suggestion: 'Establish a consistent training schedule'
      });
    }

    // Check for overtraining pattern (too many sessions)
    if (sessionsPerWeek > 5) {
      issues.push({
        pattern: 'overtraining_frequency',
        severity: 'high',
        description: 'Training frequency exceeds recovery capacity',
        impact: 'High risk of overtraining and injury',
        suggestion: 'Reduce to 4-5 sessions per week maximum'
      });
    }

    return issues;
  }

  private generateRestRecommendations(
    averageRest: number,
    optimalRest: number,
    consistency: number,
    issues: RestPatternIssue[]
  ): RestRecommendation[] {
    const recommendations: RestRecommendation[] = [];

    if (averageRest < optimalRest * 0.8) {
      recommendations.push({
        type: 'immediate',
        action: 'Increase rest days between sessions',
        rationale: `Current average rest of ${averageRest.toFixed(1)} days is below optimal ${optimalRest.toFixed(1)} days`,
        expectedBenefit: 'Better recovery and improved performance'
      });
    }

    if (consistency < 70) {
      recommendations.push({
        type: 'short_term',
        action: 'Establish consistent training schedule',
        rationale: 'Inconsistent rest periods make it harder to optimize recovery',
        expectedBenefit: 'More predictable progress and better planning'
      });
    }

    issues.forEach(issue => {
      recommendations.push({
        type: issue.severity === 'high' ? 'immediate' : 'short_term',
        action: issue.suggestion,
        rationale: issue.description,
        expectedBenefit: 'Reduced injury risk and better long-term progress'
      });
    });

    return recommendations;
  }

  private calculateLoadScore(sessionsPerWeek: number, avgVolumePerSession: number): number {
    // Simplified load calculation
    // Volume per session × sessions per week × intensity factor
    const baseLoad = avgVolumePerSession * sessionsPerWeek;
    const intensityFactor = avgVolumePerSession > 1000 ? 1.2 : 1.0; // Higher volume = higher intensity

    return Math.round(baseLoad * intensityFactor);
  }

  private calculateSustainableLoad(sessions: any[], currentLoad: number): number {
    // Estimate sustainable load based on consistency and recovery patterns
    const consistencyFactor = sessions.length > 10 ? 1.0 : 0.8; // More consistent = higher sustainable load
    const recoveryFactor = 0.85; // Conservative estimate

    return Math.round(currentLoad * consistencyFactor * recoveryFactor);
  }

  private analyzeLoadTrend(sessions: any[]): 'increasing' | 'stable' | 'decreasing' {
    if (sessions.length < 4) return 'stable';

    const recent = sessions.slice(0, Math.floor(sessions.length / 2));
    const earlier = sessions.slice(Math.floor(sessions.length / 2));

    const recentLoad = recent.reduce((sum, s) => sum + (s.total_volume || 0), 0) / recent.length;
    const earlierLoad = earlier.reduce((sum, s) => sum + (s.total_volume || 0), 0) / earlier.length;

    const change = (recentLoad - earlierLoad) / earlierLoad;

    if (change > 0.15) return 'increasing';
    if (change < -0.15) return 'decreasing';
    return 'stable';
  }

  private categorizeLoadIntensity(currentLoad: number, sustainableLoad: number): 'low' | 'moderate' | 'high' | 'very_high' {
    const ratio = currentLoad / sustainableLoad;

    if (ratio < 0.7) return 'low';
    if (ratio < 0.9) return 'moderate';
    if (ratio < 1.1) return 'high';
    return 'very_high';
  }

  private calculateRecoveryDemand(currentLoad: number, sustainableLoad: number, sessionsPerWeek: number): number {
    const loadRatio = currentLoad / sustainableLoad;
    const frequencyFactor = Math.min(sessionsPerWeek / 3, 2); // More sessions = more recovery needed

    return Math.min(100, Math.round((loadRatio * frequencyFactor) * 50));
  }

  private assessOvertrainingRisk(
    currentLoad: number,
    sustainableLoad: number,
    recoveryDemand: number
  ): 'low' | 'moderate' | 'high' | 'critical' {
    const loadRatio = currentLoad / sustainableLoad;
    const riskScore = (loadRatio - 1) * 50 + recoveryDemand;

    if (riskScore < 30) return 'low';
    if (riskScore < 60) return 'moderate';
    if (riskScore < 80) return 'high';
    return 'critical';
  }

  private async analyzeMuscleGroupBalance(userId: string, sessions: any[]): Promise<MuscleGroupBalance[]> {
    // This would require mapping exercises to muscle groups
    // Simplified implementation
    const muscleGroups = ['Pectorals', 'Lats', 'Deltoids', 'Biceps', 'Quadriceps', 'Core'];

    return muscleGroups.map(group => ({
      muscleGroup: group,
      currentVolume: Math.random() * 2000 + 500, // Placeholder
      targetVolume: 1500,
      balanceRatio: 80 + Math.random() * 40,
      lastTrained: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      recoveryStatus: 'optimal' as const
    }));
  }

  private calculateSessionMetrics(sessions: any[]) {
    if (sessions.length === 0) {
      return {
        averageDuration: 0,
        durationTrend: 'stable' as const,
        averageExercises: 0,
        averageVolume: 0,
        completionRate: 0
      };
    }

    const averageDuration = sessions.reduce((sum, s) => sum + (s.duration || 45), 0) / sessions.length;
    const averageExercises = sessions.reduce((sum, s) => sum + (s.unique_exercises || 0), 0) / sessions.length;
    const averageVolume = sessions.reduce((sum, s) => sum + (s.total_volume || 0), 0) / sessions.length;
    const completionRate = 95; // Placeholder - would need planned vs actual data

    // Analyze duration trend
    const durationTrend = this.analyzeDurationTrend(sessions);

    return {
      averageDuration: Math.round(averageDuration),
      durationTrend,
      averageExercises: Math.round(averageExercises),
      averageVolume: Math.round(averageVolume),
      completionRate
    };
  }

  private analyzeDurationTrend(sessions: any[]): 'increasing' | 'stable' | 'decreasing' {
    if (sessions.length < 3) return 'stable';

    const recent = sessions.slice(0, Math.floor(sessions.length / 2));
    const earlier = sessions.slice(Math.floor(sessions.length / 2));

    const recentAvg = recent.reduce((sum, s) => sum + (s.duration || 45), 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, s) => sum + (s.duration || 45), 0) / earlier.length;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateRecoveryFactors(
    restAnalysis: RestPeriodAnalysis,
    loadMetrics: TrainingLoadMetrics,
    sessionMetrics: any
  ) {
    const currentRecoveryDemand = loadMetrics.recoveryDemand;
    const recoveryEfficiency = Math.max(0, 100 - (100 - restAnalysis.restConsistency) * 0.5);
    const fatigueAccumulation = Math.min(100, loadMetrics.recoveryDemand * 1.2);
    const recommendedRestDays = restAnalysis.optimalRestDays;

    return {
      currentRecoveryDemand,
      recoveryEfficiency,
      fatigueAccumulation,
      recommendedRestDays
    };
  }

  private generateTrainingInsights(
    sessionMetrics: any,
    restAnalysis: RestPeriodAnalysis,
    loadMetrics: TrainingLoadMetrics,
    recoveryFactors: any
  ): TrainingInsight[] {
    const insights: TrainingInsight[] = [];

    // Session duration insights
    if (sessionMetrics.durationTrend === 'increasing') {
      insights.push({
        type: 'neutral',
        category: 'duration',
        title: 'Session Duration Increasing',
        description: 'Your workouts are getting longer, which may indicate improving work capacity',
        metric: `${sessionMetrics.averageDuration} minutes average`,
        trend: 'improving'
      });
    }

    // Rest period insights
    if (restAnalysis.restConsistency > 80) {
      insights.push({
        type: 'positive',
        category: 'recovery',
        title: 'Consistent Recovery Pattern',
        description: 'Your rest periods between sessions are well-optimized',
        metric: `${restAnalysis.restConsistency}% consistency`,
        trend: 'stable'
      });
    } else if (restAnalysis.restConsistency < 60) {
      insights.push({
        type: 'concerning',
        category: 'recovery',
        title: 'Inconsistent Rest Periods',
        description: 'Irregular rest between sessions may affect recovery',
        metric: `${restAnalysis.restConsistency}% consistency`,
        trend: 'stable'
      });
    }

    // Training load insights
    if (loadMetrics.overtrainingRisk === 'high' || loadMetrics.overtrainingRisk === 'critical') {
      insights.push({
        type: 'concerning',
        category: 'intensity',
        title: 'High Training Load',
        description: 'Current training intensity may exceed recovery capacity',
        metric: `${loadMetrics.currentLoad} load vs ${loadMetrics.sustainableLoad} sustainable`,
        trend: 'stable'
      });
    }

    return insights;
  }

  private generateTrainingRecommendations(
    sessionMetrics: any,
    restAnalysis: RestPeriodAnalysis,
    loadMetrics: TrainingLoadMetrics,
    recoveryFactors: any
  ): TrainingRecommendation[] {
    const recommendations: TrainingRecommendation[] = [];

    // Rest period recommendations
    if (restAnalysis.averageRestDays < restAnalysis.optimalRestDays * 0.9) {
      recommendations.push({
        priority: 'high',
        category: 'rest_periods',
        title: 'Optimize Rest Between Sessions',
        description: `Your average rest period of ${restAnalysis.averageRestDays.toFixed(1)} days is below the optimal ${restAnalysis.optimalRestDays.toFixed(1)} days for your training frequency.`,
        action: 'Schedule workouts with more recovery time between sessions',
        timeframe: 'Next 1-2 weeks',
        expectedOutcome: 'Better recovery, improved performance, reduced injury risk'
      });
    }

    // Training load recommendations
    if (loadMetrics.currentLoad > loadMetrics.sustainableLoad * 1.1) {
      recommendations.push({
        priority: 'urgent',
        category: 'volume_adjustment',
        title: 'Reduce Training Volume',
        description: 'Your current training load exceeds sustainable levels, increasing overtraining risk.',
        action: 'Decrease sets per exercise by 1-2 or reduce weekly sessions by 1',
        timeframe: 'Immediately',
        expectedOutcome: 'Restored recovery capacity, sustainable long-term progress'
      });
    }

    // Session duration recommendations
    if (sessionMetrics.averageDuration > 90) {
      recommendations.push({
        priority: 'medium',
        category: 'session_duration',
        title: 'Review Session Length',
        description: 'Long workout sessions may indicate inefficiency or excessive volume.',
        action: 'Focus on quality over quantity, consider splitting intense sessions',
        timeframe: 'Next training cycle',
        expectedOutcome: 'More efficient training, better recovery between sessions'
      });
    }

    return recommendations;
  }
}

export const trainingContextTracker = new TrainingContextTrackerService();