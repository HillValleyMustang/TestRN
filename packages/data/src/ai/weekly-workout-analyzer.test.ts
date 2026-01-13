/**
 * Tests for WeeklyWorkoutAnalyzer
 */

import { WeeklyWorkoutAnalyzer, type CompletedWorkout } from './weekly-workout-analyzer';

describe('WeeklyWorkoutAnalyzer', () => {
  describe('analyzeWeeklyCompletion', () => {
    it('should identify missing workouts in PPL program', () => {
      const completedWorkouts: CompletedWorkout[] = [
        { id: '1', name: 'Push', sessionId: '1' },
        { id: '2', name: 'Legs', sessionId: '2' }
      ];

      const result = WeeklyWorkoutAnalyzer.analyzeWeeklyCompletion('ppl', completedWorkouts);

      expect(result.missingWorkouts).toEqual(['Pull']);
      expect(result.isWeekComplete).toBe(false);
      expect(result.nextRecommendedWorkout).toBe('Pull');
      expect(result.recommendationReason).toBe('weekly_completion');
    });

    it('should identify all workouts complete in PPL program', () => {
      const completedWorkouts: CompletedWorkout[] = [
        { id: '1', name: 'Push', sessionId: '1' },
        { id: '2', name: 'Pull', sessionId: '2' },
        { id: '3', name: 'Legs', sessionId: '3' }
      ];

      const result = WeeklyWorkoutAnalyzer.analyzeWeeklyCompletion('ppl', completedWorkouts);

      expect(result.missingWorkouts).toEqual([]);
      expect(result.isWeekComplete).toBe(true);
      expect(result.nextRecommendedWorkout).toBeUndefined();
      expect(result.recommendationReason).toBe('normal_cycling');
    });

    it('should handle ULUL program correctly', () => {
      const completedWorkouts: CompletedWorkout[] = [
        { id: '1', name: 'Upper Body A', sessionId: '1' },
        { id: '2', name: 'Lower Body A', sessionId: '2' }
      ];

      const result = WeeklyWorkoutAnalyzer.analyzeWeeklyCompletion('ulul', completedWorkouts);

      expect(result.missingWorkouts).toEqual(['Upper Body B', 'Lower Body B']);
      expect(result.isWeekComplete).toBe(false);
      expect(result.nextRecommendedWorkout).toBe('Upper Body B');
    });

    it('should filter out ad-hoc workouts', () => {
      const completedWorkouts: CompletedWorkout[] = [
        { id: '1', name: 'Push', sessionId: '1' },
        { id: '2', name: 'Custom Cardio Session', sessionId: '2' },
        { id: '3', name: 'Ad-hoc Strength', sessionId: '3' }
      ];

      const result = WeeklyWorkoutAnalyzer.analyzeWeeklyCompletion('ppl', completedWorkouts);

      expect(result.completedWorkouts).toEqual(['push']);
      expect(result.missingWorkouts).toEqual(['Pull', 'Legs']);
    });

    it('should handle workout name variations', () => {
      const completedWorkouts: CompletedWorkout[] = [
        { id: '1', name: 'Push - Beginner', sessionId: '1' },
        { id: '2', name: 'Upper Body A (Modified)', sessionId: '2' }
      ];

      const pplResult = WeeklyWorkoutAnalyzer.analyzeWeeklyCompletion('ppl', completedWorkouts);
      expect(pplResult.completedWorkouts).toContain('push');

      const ululResult = WeeklyWorkoutAnalyzer.analyzeWeeklyCompletion('ulul', completedWorkouts);
      expect(ululResult.completedWorkouts).toContain('upper body a');
    });
  });

  describe('determineNextWorkoutWeeklyAware', () => {
    const mockTPathWorkouts = [
      { id: '1', template_name: 'Push', description: 'Push workout' },
      { id: '2', template_name: 'Pull', description: 'Pull workout' },
      { id: '3', template_name: 'Legs', description: 'Legs workout' }
    ];

    it('should recommend missing workout over normal cycling', () => {
      const completedWorkouts: CompletedWorkout[] = [
        { id: '1', name: 'Push', sessionId: '1' },
        { id: '3', name: 'Legs', sessionId: '3' }
      ];

      const recentWorkouts = [
        { session: { template_name: 'Push', completed_at: '2024-01-01' } },
        { session: { template_name: 'Legs', completed_at: '2024-01-03' } }
      ];

      const result = WeeklyWorkoutAnalyzer.determineNextWorkoutWeeklyAware(
        'ppl',
        recentWorkouts,
        mockTPathWorkouts,
        completedWorkouts
      );

      expect(result?.template_name).toBe('Pull');
    });

    it('should fall back to normal cycling when week is complete', () => {
      const completedWorkouts: CompletedWorkout[] = [
        { id: '1', name: 'Push', sessionId: '1' },
        { id: '2', name: 'Pull', sessionId: '2' },
        { id: '3', name: 'Legs', sessionId: '3' }
      ];

      const recentWorkouts = [
        { session: { template_name: 'Legs', completed_at: '2024-01-03' } }
      ];

      const result = WeeklyWorkoutAnalyzer.determineNextWorkoutWeeklyAware(
        'ppl',
        recentWorkouts,
        mockTPathWorkouts,
        completedWorkouts
      );

      // Should cycle back to Push after Legs
      expect(result?.template_name).toBe('Push');
    });

    it('should handle empty workout history', () => {
      const result = WeeklyWorkoutAnalyzer.determineNextWorkoutWeeklyAware(
        'ppl',
        [],
        mockTPathWorkouts,
        []
      );

      expect(result?.template_name).toBe('Push'); // First workout in program
    });
  });

  describe('getWeeklyWorkoutGoal', () => {
    it('should return correct goals for each program type', () => {
      expect(WeeklyWorkoutAnalyzer.getWeeklyWorkoutGoal('ppl')).toBe(3);
      expect(WeeklyWorkoutAnalyzer.getWeeklyWorkoutGoal('ulul')).toBe(4);
    });
  });
});