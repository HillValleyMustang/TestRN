/**
 * Hook to calculate user fitness level from total points
 * Levels: Rookie < 50, Warrior 50-149, Champion 150-299, Legend 300-499, Titan 500+
 */

export interface LevelInfo {
  levelName: 'Rookie' | 'Warrior' | 'Champion' | 'Legend' | 'Titan';
  color: string;
  backgroundColor: string;
  progressToNext: number;
  nextThreshold: number | null;
}

export function useLevelFromPoints(totalPoints: number = 0): LevelInfo {
  let levelName: LevelInfo['levelName'];
  let color: string;
  let backgroundColor: string;
  let nextThreshold: number | null;

  if (totalPoints < 50) {
    levelName = 'Rookie';
    color = '#6B7280';
    backgroundColor = '#F3F4F6';
    nextThreshold = 50;
  } else if (totalPoints < 150) {
    levelName = 'Warrior';
    color = '#3B82F6';
    backgroundColor = '#DBEAFE';
    nextThreshold = 150;
  } else if (totalPoints < 300) {
    levelName = 'Champion';
    color = '#A855F7';
    backgroundColor = '#F3E8FF';
    nextThreshold = 300;
  } else if (totalPoints < 500) {
    levelName = 'Legend';
    color = '#EAB308';
    backgroundColor = '#FEF9C3';
    nextThreshold = 500;
  } else {
    levelName = 'Titan';
    color = '#EF4444';
    backgroundColor = '#FEE2E2';
    nextThreshold = null;
  }

  const currentThreshold = totalPoints < 50 ? 0 : totalPoints < 150 ? 50 : totalPoints < 300 ? 150 : totalPoints < 500 ? 300 : 500;
  const progress = nextThreshold
    ? ((totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    : 100;

  return {
    levelName,
    color,
    backgroundColor,
    progressToNext: Math.min(Math.max(progress, 0), 100),
    nextThreshold,
  };
}
