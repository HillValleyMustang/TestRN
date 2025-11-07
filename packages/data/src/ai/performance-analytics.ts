import { supabase } from '../supabase/client-mobile';

export interface ExercisePerformanceData {
  exerciseId: string;
  exerciseName: string;
  totalSessions: number;
  firstSessionDate: string;
  lastSessionDate: string;
  bestSet: {
    weight: number;
    reps: number;
    volume: number;
    date: string;
    sessionId: string;
  };
  progressionMetrics: {
    averageWeightIncrease: number;
    averageRepIncrease: number;
    progressionVelocity: number; // kg/week
    consistencyScore: number; // 0-1
    plateauRisk: number; // 0-1
  };
  volumeProgression: Array<{
    date: string;
    totalVolume: number;
    averageWeight: number;
    averageReps: number;
    sessionCount: number;
  }>;
  strengthCurve: Array<{
    date: string;
    maxWeight: number;
    maxReps: number;
    estimated1RM: number;
  }>;
  workoutFrequency: {
    averageSessionsPerWeek: number;
    consistencyPattern: 'regular' | 'irregular' | 'declining' | 'increasing';
    restDayAverage: number;
  };
  recoveryIndicators: {
    averageRestBetweenSessions: number;
    performanceAfterRest: number[]; // Performance % after different rest periods
    fatiguePatterns: Array<{
      date: string;
      fatigueScore: number; // Based on volume vs previous performance
    }>;
  };
}

export interface UserAnalyticsSummary {
  totalWorkouts: number;
  totalExercises: number;
  activeExercises: number;
  averageSessionVolume: number;
  progressionHealthScore: number; // 0-100
  plateauExercises: string[]; // Exercise IDs at risk
  recommendedFocus: {
    priorityExercises: string[];
    recoveryNeeded: boolean;
    periodizationPhase: 'accumulation' | 'intensification' | 'realization' | 'deload';
  };
  periodizationPhase: 'accumulation' | 'intensification' | 'realization' | 'deload';
  totalWorkoutsForPhase: number;
}

export interface ProgressionPattern {
  type: 'linear' | 'exponential' | 'plateau' | 'erratic' | 'recovery';
  confidence: number;
  description: string;
  recommendedAction: string;
  projectedProgression: Array<{
    weeks: number;
    predictedWeight: number;
    predictedReps: number;
  }>;
}

class PerformanceAnalyticsService {
  /**
   * Get comprehensive performance analytics for a specific exercise
   */
  async getExerciseAnalytics(
    userId: string,
    exerciseId: string,
    maxSessions: number = 50
  ): Promise<ExercisePerformanceData | null> {
    try {
      // Get all historical sessions containing this exercise
      const { data: sessionData, error: sessionError } = await supabase
        .from('set_logs')
        .select(`
          session_id,
          weight_kg,
          reps,
          created_at,
          workout_sessions!inner(
            session_date,
            completed_at
          )
        `)
        .eq('exercise_id', exerciseId)
        .not('workout_sessions.completed_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(maxSessions * 3); // Get enough for multiple sets per session

      if (sessionError || !sessionData || sessionData.length === 0) {
        return null;
      }

      // Group by session and calculate session-level metrics
      const sessionGroups = this.groupSetsBySession(sessionData);
      const sessions = Object.values(sessionGroups)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (sessions.length === 0) return null;

      // Calculate comprehensive analytics
      const progressionMetrics = this.calculateProgressionMetrics(sessions);
      const volumeProgression = this.calculateVolumeProgression(sessions);
      const strengthCurve = this.calculateStrengthCurve(sessions);
      const workoutFrequency = this.analyzeWorkoutFrequency(sessions);
      const recoveryIndicators = this.analyzeRecoveryPatterns(sessions);

      // Get exercise name
      const { data: exerciseData } = await supabase
        .from('exercises')
        .select('name')
        .eq('id', exerciseId)
        .single();

      return {
        exerciseId,
        exerciseName: exerciseData?.name || 'Unknown Exercise',
        totalSessions: sessions.length,
        firstSessionDate: sessions[0].date,
        lastSessionDate: sessions[sessions.length - 1].date,
        bestSet: this.findBestSet(sessions),
        progressionMetrics,
        volumeProgression,
        strengthCurve,
        workoutFrequency,
        recoveryIndicators
      };
    } catch (error) {
      console.error('Error getting exercise analytics:', error);
      return null;
    }
  }

  /**
   * Get overall user analytics summary
   */
  async getUserAnalyticsSummary(userId: string): Promise<UserAnalyticsSummary | null> {
    try {
      // Get all completed sessions
      const { data: sessions, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('id, session_date, completed_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('session_date', { ascending: false })
        .limit(100);

      if (sessionError || !sessions) return null;

      const totalWorkouts = sessions.length;

      // Get all exercises used
      const { data: exerciseUsage, error: exerciseError } = await supabase
        .from('set_logs')
        .select('exercise_id, exercises(name)')
        .in('session_id', sessions.map(s => s.id))
        .order('created_at', { ascending: false });

      if (exerciseError) return null;

      const uniqueExercises = [...new Set(exerciseUsage?.map(e => e.exercise_id) || [])];
      const totalExercises = uniqueExercises.length;

      // Calculate average session volume
      let totalVolume = 0;
      for (const session of sessions.slice(0, 20)) { // Last 20 sessions
        const { data: sets } = await supabase
          .from('set_logs')
          .select('weight_kg, reps')
          .eq('session_id', session.id);

        const sessionVolume = sets?.reduce((sum, set) =>
          sum + ((set.weight_kg || 0) * (set.reps || 0)), 0
        ) || 0;
        totalVolume += sessionVolume;
      }

      const averageSessionVolume = sessions.length > 0 ? totalVolume / Math.min(sessions.length, 20) : 0;

      // Analyze exercise health
      const exerciseHealthScores = await Promise.all(
        uniqueExercises.map(async (exerciseId) => {
          const analytics = await this.getExerciseAnalytics(userId, exerciseId, 20);
          return {
            exerciseId,
            healthScore: analytics ? this.calculateExerciseHealthScore(analytics) : 0,
            plateauRisk: analytics?.progressionMetrics.plateauRisk || 0
          };
        })
      );

      const activeExercises = exerciseHealthScores.filter(e => e.healthScore > 30).length;
      const plateauExercises = exerciseHealthScores
        .filter(e => e.plateauRisk > 0.7)
        .map(e => e.exerciseId);

      const averageHealthScore = exerciseHealthScores.reduce((sum, e) => sum + e.healthScore, 0) / exerciseHealthScores.length;
      const progressionHealthScore = Math.round(averageHealthScore);

      // Determine periodization phase
      const periodizationPhase = this.determinePeriodizationPhase(sessions.length, averageHealthScore);

      return {
        totalWorkouts,
        totalExercises,
        activeExercises,
        averageSessionVolume,
        progressionHealthScore,
        plateauExercises,
        recommendedFocus: {
          priorityExercises: exerciseHealthScores
            .sort((a, b) => b.healthScore - a.healthScore)
            .slice(0, 3)
            .map(e => e.exerciseId),
          recoveryNeeded: averageHealthScore < 40,
          periodizationPhase
        },
        periodizationPhase,
        totalWorkoutsForPhase: totalWorkouts
      };
    } catch (error) {
      console.error('Error getting user analytics summary:', error);
      return null;
    }
  }

  /**
   * Analyze progression patterns for an exercise
   */
  async analyzeProgressionPattern(
    userId: string,
    exerciseId: string
  ): Promise<ProgressionPattern | null> {
    const analytics = await this.getExerciseAnalytics(userId, exerciseId, 30);
    if (!analytics || analytics.totalSessions < 5) return null;

    const { progressionMetrics, strengthCurve } = analytics;

    // Analyze progression velocity trend
    const recentSessions = strengthCurve.slice(-10);
    const velocityTrend = this.calculateVelocityTrend(recentSessions);

    // Determine pattern type
    let pattern: ProgressionPattern;

    if (velocityTrend > 0.5) {
      pattern = {
        type: 'linear',
        confidence: 0.8,
        description: 'Consistent linear progression with steady improvement',
        recommendedAction: 'Continue current approach with gradual increases',
        projectedProgression: this.projectLinearProgression(recentSessions, 8)
      };
    } else if (velocityTrend < -0.3) {
      pattern = {
        type: 'plateau',
        confidence: 0.9,
        description: 'Progress has stalled, potential plateau detected',
        recommendedAction: 'Consider deload week, technique review, or increased volume',
        projectedProgression: this.projectPlateauRecovery(recentSessions, 8)
      };
    } else if (progressionMetrics.consistencyScore < 0.4) {
      pattern = {
        type: 'erratic',
        confidence: 0.7,
        description: 'Inconsistent progression with variable performance',
        recommendedAction: 'Focus on consistency, ensure adequate recovery between sessions',
        projectedProgression: this.projectErraticStabilization(recentSessions, 8)
      };
    } else {
      pattern = {
        type: 'recovery',
        confidence: 0.6,
        description: 'Recovering from previous setback, showing signs of improvement',
        recommendedAction: 'Maintain current conservative approach',
        projectedProgression: this.projectRecoveryProgression(recentSessions, 8)
      };
    }

    return pattern;
  }

  // Helper methods

  private groupSetsBySession(setData: any[]): { [sessionId: string]: any } {
    const groups: { [sessionId: string]: any } = {};

    setData.forEach(set => {
      const sessionId = set.session_id;
      if (!groups[sessionId]) {
        groups[sessionId] = {
          sessionId,
          date: set.workout_sessions.session_date,
          sets: []
        };
      }
      groups[sessionId].sets.push({
        weight: set.weight_kg || 0,
        reps: set.reps || 0,
        volume: (set.weight_kg || 0) * (set.reps || 0)
      });
    });

    // Calculate session-level metrics
    Object.values(groups).forEach((session: any) => {
      const sets = session.sets;
      session.totalVolume = sets.reduce((sum: number, set: any) => sum + set.volume, 0);
      session.averageWeight = sets.reduce((sum: number, set: any) => sum + set.weight, 0) / sets.length;
      session.averageReps = sets.reduce((sum: number, set: any) => sum + set.reps, 0) / sets.length;
      session.maxWeight = Math.max(...sets.map((s: any) => s.weight));
      session.maxReps = Math.max(...sets.map((s: any) => s.reps));
      session.estimated1RM = this.estimate1RM(session.maxWeight, session.maxReps);
    });

    return groups;
  }

  private calculateProgressionMetrics(sessions: any[]): ExercisePerformanceData['progressionMetrics'] {
    if (sessions.length < 2) {
      return {
        averageWeightIncrease: 0,
        averageRepIncrease: 0,
        progressionVelocity: 0,
        consistencyScore: 0,
        plateauRisk: 0
      };
    }

    // Calculate weight and rep progression
    let totalWeightIncrease = 0;
    let totalRepIncrease = 0;
    let progressionPoints = 0;

    for (let i = 1; i < sessions.length; i++) {
      const current = sessions[i];
      const previous = sessions[i - 1];

      const weightIncrease = current.maxWeight - previous.maxWeight;
      const repIncrease = current.maxReps - previous.maxReps;

      totalWeightIncrease += Math.max(0, weightIncrease); // Only count improvements
      totalRepIncrease += Math.max(0, repIncrease);

      if (weightIncrease > 0 || repIncrease > 0) {
        progressionPoints++;
      }
    }

    const averageWeightIncrease = totalWeightIncrease / (sessions.length - 1);
    const averageRepIncrease = totalRepIncrease / (sessions.length - 1);
    const consistencyScore = progressionPoints / (sessions.length - 1);

    // Calculate progression velocity (kg per week)
    const firstDate = new Date(sessions[0].date);
    const lastDate = new Date(sessions[sessions.length - 1].date);
    const weeksDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7);

    const totalWeightProgression = sessions[sessions.length - 1].maxWeight - sessions[0].maxWeight;
    const progressionVelocity = weeksDiff > 0 ? totalWeightProgression / weeksDiff : 0;

    // Calculate plateau risk (recent stagnation)
    const recentSessions = sessions.slice(-5);
    let stagnantSessions = 0;

    for (let i = 1; i < recentSessions.length; i++) {
      const current = recentSessions[i];
      const previous = recentSessions[i - 1];
      const improvement = (current.maxWeight - previous.maxWeight) / previous.maxWeight;

      if (improvement < 0.02) { // Less than 2% improvement
        stagnantSessions++;
      }
    }

    const plateauRisk = recentSessions.length > 1 ? stagnantSessions / (recentSessions.length - 1) : 0;

    return {
      averageWeightIncrease,
      averageRepIncrease,
      progressionVelocity,
      consistencyScore,
      plateauRisk
    };
  }

  private calculateVolumeProgression(sessions: any[]): ExercisePerformanceData['volumeProgression'] {
    // Group sessions by week
    const weeklyData: { [week: string]: any[] } = {};

    sessions.forEach(session => {
      const date = new Date(session.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = [];
      }
      weeklyData[weekKey].push(session);
    });

    return Object.entries(weeklyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, weekSessions]) => ({
        date,
        totalVolume: weekSessions.reduce((sum, s) => sum + s.totalVolume, 0),
        averageWeight: weekSessions.reduce((sum, s) => sum + s.averageWeight, 0) / weekSessions.length,
        averageReps: weekSessions.reduce((sum, s) => sum + s.averageReps, 0) / weekSessions.length,
        sessionCount: weekSessions.length
      }));
  }

  private calculateStrengthCurve(sessions: any[]): ExercisePerformanceData['strengthCurve'] {
    return sessions.map(session => ({
      date: session.date,
      maxWeight: session.maxWeight,
      maxReps: session.maxReps,
      estimated1RM: session.estimated1RM
    }));
  }

  private analyzeWorkoutFrequency(sessions: any[]): ExercisePerformanceData['workoutFrequency'] {
    if (sessions.length < 2) {
      return {
        averageSessionsPerWeek: 0,
        consistencyPattern: 'irregular',
        restDayAverage: 0
      };
    }

    // Calculate session frequency
    const firstDate = new Date(sessions[0].date);
    const lastDate = new Date(sessions[sessions.length - 1].date);
    const totalDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    const totalWeeks = totalDays / 7;
    const averageSessionsPerWeek = sessions.length / totalWeeks;

    // Analyze consistency pattern
    const intervals: number[] = [];
    for (let i = 1; i < sessions.length; i++) {
      const daysBetween = (new Date(sessions[i].date).getTime() - new Date(sessions[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(daysBetween);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const consistencyPattern = this.determineConsistencyPattern(avgInterval, intervals);

    return {
      averageSessionsPerWeek,
      consistencyPattern,
      restDayAverage: avgInterval - 1 // Subtract 1 for the workout day
    };
  }

  private analyzeRecoveryPatterns(sessions: any[]): ExercisePerformanceData['recoveryIndicators'] {
    const restPeriods: number[] = [];
    const performanceAfterRest: { [restDays: number]: number[] } = {};

    for (let i = 1; i < sessions.length; i++) {
      const restDays = Math.floor(
        (new Date(sessions[i].date).getTime() - new Date(sessions[i - 1].date).getTime()) /
        (1000 * 60 * 60 * 24)
      );

      restPeriods.push(restDays);

      // Calculate performance relative to previous session
      const currentPerformance = sessions[i].estimated1RM;
      const previousPerformance = sessions[i - 1].estimated1RM;
      const performanceRatio = currentPerformance / previousPerformance;

      if (!performanceAfterRest[restDays]) {
        performanceAfterRest[restDays] = [];
      }
      performanceAfterRest[restDays].push(performanceRatio);
    }

    const averageRestBetweenSessions = restPeriods.length > 0
      ? restPeriods.reduce((sum, rest) => sum + rest, 0) / restPeriods.length
      : 0;

    // Calculate average performance after different rest periods
    const performanceAfterRestArray = Object.entries(performanceAfterRest)
      .map(([restDays, ratios]) => ({
        restDays: parseInt(restDays),
        averagePerformance: ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length
      }))
      .sort((a, b) => a.restDays - b.restDays);

    // Calculate fatigue patterns (simplified)
    const fatiguePatterns = sessions.map((session, index) => {
      if (index === 0) return { date: session.date, fatigueScore: 0 };

      const restDays = Math.floor(
        (new Date(session.date).getTime() - new Date(sessions[index - 1].date).getTime()) /
        (1000 * 60 * 60 * 24)
      );

      // Simple fatigue calculation based on volume and rest
      const volumeRatio = session.totalVolume / sessions[index - 1].totalVolume;
      const fatigueScore = Math.max(0, Math.min(1, (volumeRatio - 0.8) / 0.4)); // 0-1 scale

      return {
        date: session.date,
        fatigueScore
      };
    });

    return {
      averageRestBetweenSessions,
      performanceAfterRest: performanceAfterRestArray.map(p => p.averagePerformance),
      fatiguePatterns
    };
  }

  private findBestSet(sessions: any[]): ExercisePerformanceData['bestSet'] {
    let bestSet = {
      weight: 0,
      reps: 0,
      volume: 0,
      date: '',
      sessionId: ''
    };

    sessions.forEach(session => {
      session.sets.forEach((set: any) => {
        if (set.volume > bestSet.volume) {
          bestSet = {
            weight: set.weight,
            reps: set.reps,
            volume: set.volume,
            date: session.date,
            sessionId: session.sessionId
          };
        }
      });
    });

    return bestSet;
  }

  private estimate1RM(weight: number, reps: number): number {
    // Epley formula: weight * (1 + reps/30)
    return weight * (1 + reps / 30);
  }

  private determineConsistencyPattern(avgInterval: number, intervals: number[]): 'regular' | 'irregular' | 'declining' | 'increasing' {
    if (intervals.length < 3) return 'irregular';

    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const standardDeviation = Math.sqrt(variance);

    // High consistency if SD is low relative to mean
    if (standardDeviation / avgInterval < 0.3) {
      return 'regular';
    }

    // Check for trends
    const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
    const secondHalf = intervals.slice(Math.floor(intervals.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    if (secondHalfAvg > firstHalfAvg * 1.2) {
      return 'declining'; // Taking longer between sessions
    } else if (firstHalfAvg > secondHalfAvg * 1.2) {
      return 'increasing'; // Sessions getting closer together
    }

    return 'irregular';
  }

  private calculateExerciseHealthScore(analytics: ExercisePerformanceData): number {
    const { progressionMetrics, totalSessions, workoutFrequency } = analytics;

    let score = 50; // Base score

    // Progression velocity (0-20 points)
    if (progressionMetrics.progressionVelocity > 0.5) score += 20;
    else if (progressionMetrics.progressionVelocity > 0.2) score += 15;
    else if (progressionMetrics.progressionVelocity > 0) score += 10;
    else if (progressionMetrics.progressionVelocity < -0.2) score -= 10;

    // Consistency (0-15 points)
    score += progressionMetrics.consistencyScore * 15;

    // Experience (0-10 points)
    if (totalSessions > 20) score += 10;
    else if (totalSessions > 10) score += 7;
    else if (totalSessions > 5) score += 4;

    // Frequency bonus (0-5 points)
    if (workoutFrequency.consistencyPattern === 'regular') score += 5;
    else if (workoutFrequency.consistencyPattern === 'increasing') score += 3;

    // Plateau penalty (0--10 points)
    score -= progressionMetrics.plateauRisk * 10;

    return Math.max(0, Math.min(100, score));
  }

  private determinePeriodizationPhase(
    totalWorkouts: number,
    averageHealthScore: number
  ): 'accumulation' | 'intensification' | 'realization' | 'deload' {
    if (averageHealthScore < 40) return 'deload';
    if (totalWorkouts < 10) return 'accumulation';
    if (averageHealthScore > 70) return 'realization';
    return 'intensification';
  }

  private calculateVelocityTrend(sessions: Array<{ date: string; maxWeight: number }>): number {
    if (sessions.length < 3) return 0;

    // Calculate linear regression slope
    const n = sessions.length;
    const sumX = sessions.reduce((sum, _, i) => sum + i, 0);
    const sumY = sessions.reduce((sum, s) => sum + s.maxWeight, 0);
    const sumXY = sessions.reduce((sum, s, i) => sum + i * s.maxWeight, 0);
    const sumXX = sessions.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgWeight = sumY / n;

    // Normalize slope by average weight to get relative trend
    return slope / avgWeight;
  }

  private projectLinearProgression(
    sessions: Array<{ date: string; maxWeight: number; maxReps: number }>,
    weeks: number
  ): Array<{ weeks: number; predictedWeight: number; predictedReps: number }> {
    const recent = sessions.slice(-3);
    const avgWeightIncrease = recent.reduce((sum, s, i) =>
      i > 0 ? sum + (s.maxWeight - recent[i - 1].maxWeight) : sum, 0
    ) / (recent.length - 1);

    const avgRepChange = recent.reduce((sum, s, i) =>
      i > 0 ? sum + (s.maxReps - recent[i - 1].maxReps) : sum, 0
    ) / (recent.length - 1);

    const currentWeight = recent[recent.length - 1].maxWeight;
    const currentReps = recent[recent.length - 1].maxReps;

    const projections = [];
    for (let i = 1; i <= weeks; i++) {
      projections.push({
        weeks: i,
        predictedWeight: currentWeight + (avgWeightIncrease * i),
        predictedReps: Math.max(1, currentReps + (avgRepChange * i))
      });
    }

    return projections;
  }

  private projectPlateauRecovery(
    sessions: Array<{ date: string; maxWeight: number; maxReps: number }>,
    weeks: number
  ): Array<{ weeks: number; predictedWeight: number; predictedReps: number }> {
    // Conservative recovery projection
    const currentWeight = sessions[sessions.length - 1].maxWeight;
    const currentReps = sessions[sessions.length - 1].maxReps;

    const projections = [];
    for (let i = 1; i <= weeks; i++) {
      // Gradual recovery with 60% of previous progression rate
      const recoveryRate = 0.6;
      const weightIncrease = (currentWeight * 0.02 * recoveryRate) * i; // 1.2% per week
      const repIncrease = Math.floor(i * 0.5); // 0.5 reps per week

      projections.push({
        weeks: i,
        predictedWeight: currentWeight + weightIncrease,
        predictedReps: Math.max(1, currentReps + repIncrease)
      });
    }

    return projections;
  }

  private projectErraticStabilization(
    sessions: Array<{ date: string; maxWeight: number; maxReps: number }>,
    weeks: number
  ): Array<{ weeks: number; predictedWeight: number; predictedReps: number }> {
    // Stabilize around current levels
    const currentWeight = sessions[sessions.length - 1].maxWeight;
    const currentReps = sessions[sessions.length - 1].maxReps;

    const projections = [];
    for (let i = 1; i <= weeks; i++) {
      // Very conservative stabilization
      const weightIncrease = (currentWeight * 0.005) * i; // 0.5% per week
      const repIncrease = Math.floor(i * 0.2); // 0.2 reps per week

      projections.push({
        weeks: i,
        predictedWeight: currentWeight + weightIncrease,
        predictedReps: Math.max(1, currentReps + repIncrease)
      });
    }

    return projections;
  }

  private projectRecoveryProgression(
    sessions: Array<{ date: string; maxWeight: number; maxReps: number }>,
    weeks: number
  ): Array<{ weeks: number; predictedWeight: number; predictedReps: number }> {
    // Moderate recovery with potential for acceleration
    const currentWeight = sessions[sessions.length - 1].maxWeight;
    const currentReps = sessions[sessions.length - 1].maxReps;

    const projections = [];
    for (let i = 1; i <= weeks; i++) {
      // Accelerating recovery
      const accelerationFactor = Math.min(1.5, 1 + (i * 0.1)); // Up to 50% acceleration
      const weightIncrease = (currentWeight * 0.015 * accelerationFactor) * i;
      const repIncrease = Math.floor(i * 0.8 * accelerationFactor);

      projections.push({
        weeks: i,
        predictedWeight: currentWeight + weightIncrease,
        predictedReps: Math.max(1, currentReps + repIncrease)
      });
    }

    return projections;
  }
}

export const performanceAnalytics = new PerformanceAnalyticsService();