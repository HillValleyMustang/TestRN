import { supabase } from '../supabase/client-mobile';

export interface PerformanceTrend {
  exerciseId: string;
  trend: 'improving' | 'plateauing' | 'declining';
  confidence: number; // 0-100
  velocity: number; // rate of change per week
  projectedValue: number; // predicted value in 4 weeks
  predictionInterval: {
    lower: number;
    upper: number;
  };
  dataPoints: number;
  timeRange: {
    start: string;
    end: string;
  };
}

export interface PerformancePrediction {
  exerciseId: string;
  currentPerformance: {
    weight: number;
    reps: number;
    volume: number;
    date: string;
  };
  predictions: {
    '1week': {
      weight: number;
      reps: number;
      volume: number;
      confidence: number;
    };
    '2weeks': {
      weight: number;
      reps: number;
      volume: number;
      confidence: number;
    };
    '4weeks': {
      weight: number;
      reps: number;
      volume: number;
      confidence: number;
    };
  };
  limitingFactors: string[];
  optimalProgression: {
    suggestedWeight: number;
    suggestedReps: number;
    reasoning: string[];
  };
}

export interface TrainingEfficiency {
  userId: string;
  overallEfficiency: number; // 0-100
  strengthGains: number; // rate of strength improvement
  volumeProgression: number; // rate of volume increase
  recoveryEfficiency: number; // how well user recovers
  consistencyScore: number; // training consistency
  factors: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  recommendations: string[];
}

class PerformanceForecasterService {
  /**
   * Analyze performance trends for an exercise
   */
  async analyzePerformanceTrend(
    userId: string,
    exerciseId: string,
    weeks: number = 12
  ): Promise<PerformanceTrend> {
    const sessions = await this.getExerciseSessions(userId, exerciseId, weeks);

    if (sessions.length < 3) {
      return {
        exerciseId,
        trend: 'plateauing',
        confidence: 0,
        velocity: 0,
        projectedValue: 0,
        predictionInterval: { lower: 0, upper: 0 },
        dataPoints: sessions.length,
        timeRange: { start: '', end: '' }
      };
    }

    // Extract volume data points
    const dataPoints = sessions.map(session => ({
      date: new Date(session.date),
      volume: session.bestVolume
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate linear trend
    const volumes = dataPoints.map(dp => dp.volume);
    const trend = this.calculateLinearTrend(volumes);

    // Determine trend direction
    let trendDirection: 'improving' | 'plateauing' | 'declining';
    if (trend.slope > 0.02) {
      trendDirection = 'improving';
    } else if (trend.slope < -0.02) {
      trendDirection = 'declining';
    } else {
      trendDirection = 'plateauing';
    }

    // Project future performance
    const lastVolume = volumes[volumes.length - 1];
    const weeksToProject = 4;
    const projectedValue = lastVolume + (trend.slope * weeksToProject * volumes.length / weeks);

    // Calculate prediction interval (simplified)
    const standardError = this.calculateStandardError(volumes, trend);
    const confidenceInterval = 1.96 * standardError; // 95% confidence

    return {
      exerciseId,
      trend: trendDirection,
      confidence: Math.round(trend.rSquared * 100),
      velocity: trend.slope,
      projectedValue: Math.max(0, projectedValue),
      predictionInterval: {
        lower: Math.max(0, projectedValue - confidenceInterval),
        upper: projectedValue + confidenceInterval
      },
      dataPoints: sessions.length,
      timeRange: {
        start: dataPoints[0].date.toISOString(),
        end: dataPoints[dataPoints.length - 1].date.toISOString()
      }
    };
  }

  /**
   * Generate detailed performance prediction
   */
  async generatePerformancePrediction(
    userId: string,
    exerciseId: string
  ): Promise<PerformancePrediction> {
    const sessions = await this.getExerciseSessions(userId, exerciseId, 12);

    if (sessions.length === 0) {
      throw new Error('Insufficient data for performance prediction');
    }

    const currentPerformance = sessions[0]; // Most recent session
    const trend = await this.analyzePerformanceTrend(userId, exerciseId, 8);

    // Generate predictions for different timeframes
    const predictions = {
      '1week': this.generateTimeframePrediction(currentPerformance, trend, 1),
      '2weeks': this.generateTimeframePrediction(currentPerformance, trend, 2),
      '4weeks': this.generateTimeframePrediction(currentPerformance, trend, 4)
    };

    // Identify limiting factors
    const limitingFactors = this.identifyLimitingFactors(sessions, trend);

    // Calculate optimal progression
    const optimalProgression = this.calculateOptimalProgression(
      currentPerformance,
      trend,
      limitingFactors
    );

    return {
      exerciseId,
      currentPerformance: {
        weight: currentPerformance.bestWeight,
        reps: currentPerformance.bestReps,
        volume: currentPerformance.bestVolume,
        date: currentPerformance.date
      },
      predictions,
      limitingFactors,
      optimalProgression
    };
  }

  /**
   * Analyze overall training efficiency
   */
  async analyzeTrainingEfficiency(userId: string): Promise<TrainingEfficiency> {
    const sessions = await this.getAllUserSessions(userId, 12);

    if (sessions.length < 4) {
      return {
        userId,
        overallEfficiency: 0,
        strengthGains: 0,
        volumeProgression: 0,
        recoveryEfficiency: 0,
        consistencyScore: 0,
        factors: { positive: [], negative: [], neutral: [] },
        recommendations: ['Need more training data for analysis']
      };
    }

    // Calculate efficiency metrics
    const strengthGains = this.calculateStrengthGainsRate(sessions);
    const volumeProgression = this.calculateVolumeProgressionRate(sessions);
    const recoveryEfficiency = this.calculateRecoveryEfficiency(sessions);
    const consistencyScore = this.calculateConsistencyScore(sessions);

    // Overall efficiency is a weighted average
    const overallEfficiency = Math.round(
      (strengthGains * 0.3) +
      (volumeProgression * 0.2) +
      (recoveryEfficiency * 0.25) +
      (consistencyScore * 0.25)
    );

    // Identify factors affecting efficiency
    const factors = this.identifyEfficiencyFactors(sessions, {
      strengthGains,
      volumeProgression,
      recoveryEfficiency,
      consistencyScore
    });

    // Generate recommendations
    const recommendations = this.generateEfficiencyRecommendations({
      overallEfficiency,
      strengthGains,
      volumeProgression,
      recoveryEfficiency,
      consistencyScore
    });

    return {
      userId,
      overallEfficiency,
      strengthGains,
      volumeProgression,
      recoveryEfficiency,
      consistencyScore,
      factors,
      recommendations
    };
  }

  // Helper methods

  private async getExerciseSessions(userId: string, exerciseId: string, weeks: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));

    const { data, error } = await supabase
      .from('set_logs')
      .select(`
        weight_kg,
        reps,
        created_at,
        session_id,
        workout_sessions!inner(session_date)
      `)
      .eq('exercise_id', exerciseId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by session and find best set per session
    const sessionGroups: { [key: string]: any[] } = {};
    (data || []).forEach(log => {
      const sessionId = log.session_id;
      if (!sessionGroups[sessionId]) {
        sessionGroups[sessionId] = [];
      }
      sessionGroups[sessionId].push(log);
    });

    return Object.entries(sessionGroups).map(([sessionId, logs]) => {
      const bestSet = logs.reduce((best, log) => {
        const volume = (log.weight_kg || 0) * (log.reps || 0);
        const bestVolume = (best.weight_kg || 0) * (best.reps || 0);
        return volume > bestVolume ? log : best;
      });

      return {
        sessionId,
        date: bestSet.created_at,
        bestWeight: bestSet.weight_kg || 0,
        bestReps: bestSet.reps || 0,
        bestVolume: (bestSet.weight_kg || 0) * (bestSet.reps || 0),
        totalSets: logs.length
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private async getAllUserSessions(userId: string, weeks: number) {
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
    return data || [];
  }

  private calculateLinearTrend(values: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

    const x = Array.from({ length: n }, (_, i) => i);
    const y = [...values].reverse(); // Most recent last for proper trend

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

    return { slope, intercept, rSquared };
  }

  private calculateStandardError(values: number[], trend: { slope: number; intercept: number }): number {
    const n = values.length;
    if (n < 3) return 0;

    const x = Array.from({ length: n }, (_, i) => i);
    const y = [...values].reverse();

    const residuals = y.map((val, i) => {
      const predicted = trend.slope * x[i] + trend.intercept;
      return val - predicted;
    });

    const sumSquaredResiduals = residuals.reduce((sum, res) => sum + res * res, 0);
    const variance = sumSquaredResiduals / (n - 2);
    return Math.sqrt(variance);
  }

  private generateTimeframePrediction(
    currentPerformance: any,
    trend: PerformanceTrend,
    weeksAhead: number
  ) {
    const baseVolume = currentPerformance.bestVolume;
    const predictedVolume = baseVolume + (trend.velocity * weeksAhead);

    // Estimate weight and reps from predicted volume
    // This is a simplified estimation - in reality would use historical patterns
    const volumeIncrease = predictedVolume / baseVolume;
    const predictedWeight = currentPerformance.bestWeight * Math.pow(volumeIncrease, 0.7);
    const predictedReps = Math.max(1, currentPerformance.bestReps * Math.pow(volumeIncrease, 0.3));

    // Confidence decreases with time
    const confidence = Math.max(10, trend.confidence * Math.pow(0.9, weeksAhead));

    return {
      weight: Math.round(predictedWeight * 4) / 4, // Round to nearest 0.25kg
      reps: Math.round(predictedReps),
      volume: Math.round(predictedVolume),
      confidence: Math.round(confidence)
    };
  }

  private identifyLimitingFactors(sessions: any[], trend: PerformanceTrend): string[] {
    const factors: string[] = [];

    if (trend.confidence < 50) {
      factors.push('Insufficient data for reliable prediction');
    }

    if (trend.trend === 'declining') {
      factors.push('Recent performance decline may indicate fatigue');
    }

    if (sessions.length > 0 && sessions[0].totalSets < 3) {
      factors.push('Low set volume may limit progression');
    }

    // Check for consistency issues
    const volumes = sessions.map(s => s.bestVolume);
    const consistency = this.calculateConsistency(volumes);
    if (consistency < 70) {
      factors.push('Inconsistent performance may affect predictions');
    }

    return factors;
  }

  private calculateOptimalProgression(
    currentPerformance: any,
    trend: PerformanceTrend,
    limitingFactors: string[]
  ) {
    const baseWeight = currentPerformance.bestWeight;
    const baseReps = currentPerformance.bestReps;

    let suggestedWeight = baseWeight;
    let suggestedReps = baseReps;
    const reasoning: string[] = [];

    // Adjust based on trend
    if (trend.trend === 'improving') {
      // Can be more aggressive
      suggestedWeight = baseWeight * 1.05; // 5% increase
      suggestedReps = Math.max(6, baseReps - 1); // Slight rep decrease
      reasoning.push('Performance improving - can handle progressive overload');
    } else if (trend.trend === 'plateauing') {
      // Conservative approach
      suggestedWeight = baseWeight * 1.025; // 2.5% increase
      suggestedReps = baseReps; // Maintain reps
      reasoning.push('Performance plateauing - focus on consistency');
    } else {
      // Declining - be very conservative
      suggestedWeight = baseWeight * 1.01; // 1% increase
      suggestedReps = Math.min(15, baseReps + 1); // Slight rep increase
      reasoning.push('Performance declining - prioritize recovery');
    }

    // Adjust for limiting factors
    if (limitingFactors.includes('Recent performance decline may indicate fatigue')) {
      suggestedWeight = Math.min(suggestedWeight, baseWeight * 1.02);
      reasoning.push('Reducing progression due to potential fatigue');
    }

    return {
      suggestedWeight: Math.round(suggestedWeight * 4) / 4,
      suggestedReps: Math.round(suggestedReps),
      reasoning
    };
  }

  private calculateStrengthGainsRate(sessions: any[]): number {
    if (sessions.length < 4) return 0;

    // Calculate rate of strength improvement across all exercises
    const exerciseTrends: { [key: string]: number[] } = {};

    sessions.forEach(session => {
      session.set_logs?.forEach((log: any) => {
        const exerciseId = log.exercise_id;
        const volume = (log.weight_kg || 0) * (log.reps || 0);

        if (!exerciseTrends[exerciseId]) {
          exerciseTrends[exerciseId] = [];
        }
        exerciseTrends[exerciseId].push(volume);
      });
    });

    // Calculate average trend across exercises
    const trends = Object.values(exerciseTrends)
      .filter(volumes => volumes.length >= 3)
      .map(volumes => this.calculateLinearTrend(volumes).slope);

    if (trends.length === 0) return 0;

    const avgTrend = trends.reduce((sum, trend) => sum + trend, 0) / trends.length;
    return Math.max(0, Math.min(100, avgTrend * 1000)); // Scale to 0-100
  }

  private calculateVolumeProgressionRate(sessions: any[]): number {
    const volumes = sessions.map(session => {
      return session.set_logs?.reduce((sum: number, log: any) =>
        sum + ((log.weight_kg || 0) * (log.reps || 0)), 0) || 0;
    }).filter(volume => volume > 0);

    if (volumes.length < 3) return 0;

    const trend = this.calculateLinearTrend(volumes);
    return Math.max(0, Math.min(100, trend.slope * 100));
  }

  private calculateRecoveryEfficiency(sessions: any[]): number {
    if (sessions.length < 3) return 50;

    // Calculate rest periods and performance consistency
    const restPeriods: number[] = [];
    for (let i = 1; i < sessions.length; i++) {
      const currentDate = new Date(sessions[i - 1].session_date);
      const previousDate = new Date(sessions[i].session_date);
      const daysDiff = Math.round((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      restPeriods.push(daysDiff);
    }

    const avgRestDays = restPeriods.reduce((sum, days) => sum + days, 0) / restPeriods.length;
    const optimalRest = 3.5; // days

    // Efficiency based on how close to optimal rest user gets
    const restEfficiency = Math.max(0, 100 - Math.abs(avgRestDays - optimalRest) * 20);

    return Math.round(restEfficiency);
  }

  private calculateConsistencyScore(sessions: any[]): number {
    const sessionVolumes = sessions.map(session => {
      return session.set_logs?.reduce((sum: number, log: any) =>
        sum + ((log.weight_kg || 0) * (log.reps || 0)), 0) || 0;
    }).filter(volume => volume > 0);

    return this.calculateConsistency(sessionVolumes);
  }

  private calculateConsistency(values: number[]): number {
    if (values.length < 2) return 100;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100; // Coefficient of variation

    return Math.max(0, Math.min(100, 100 - cv));
  }

  private identifyEfficiencyFactors(sessions: any[], metrics: any) {
    const factors = {
      positive: [] as string[],
      negative: [] as string[],
      neutral: [] as string[]
    };

    if (metrics.strengthGains > 70) {
      factors.positive.push('Excellent strength progression rate');
    } else if (metrics.strengthGains < 30) {
      factors.negative.push('Slow strength gains - may need progression adjustment');
    }

    if (metrics.consistencyScore > 80) {
      factors.positive.push('Highly consistent training schedule');
    } else if (metrics.consistencyScore < 50) {
      factors.negative.push('Inconsistent training affecting progress');
    }

    if (metrics.recoveryEfficiency > 75) {
      factors.positive.push('Good recovery efficiency between sessions');
    } else if (metrics.recoveryEfficiency < 50) {
      factors.negative.push('Poor recovery between sessions');
    }

    return factors;
  }

  private generateEfficiencyRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.strengthGains < 40) {
      recommendations.push('Consider increasing training intensity or frequency');
    }

    if (metrics.consistencyScore < 60) {
      recommendations.push('Focus on establishing a consistent training schedule');
    }

    if (metrics.recoveryEfficiency < 60) {
      recommendations.push('Increase rest days between sessions for better recovery');
    }

    if (metrics.volumeProgression < 30) {
      recommendations.push('Gradually increase training volume for better adaptations');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current training approach - efficiency is good');
    }

    return recommendations;
  }
}

export const performanceForecaster = new PerformanceForecasterService();