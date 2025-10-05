export type AchievementCategory = 
  | 'workouts'
  | 'strength'
  | 'consistency'
  | 'weight'
  | 'volume';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  requirement: {
    type: 'workout_count' | 'streak_days' | 'total_volume' | 'max_weight' | 'weight_lost' | 'weight_gained';
    value: number;
    exercise_id?: string;
  };
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_workout',
    name: 'Getting Started',
    description: 'Complete your first workout',
    category: 'workouts',
    icon: '🎯',
    requirement: { type: 'workout_count', value: 1 },
    tier: 'bronze',
  },
  {
    id: 'workout_10',
    name: 'Committed',
    description: 'Complete 10 workouts',
    category: 'workouts',
    icon: '💪',
    requirement: { type: 'workout_count', value: 10 },
    tier: 'bronze',
  },
  {
    id: 'workout_25',
    name: 'Regular',
    description: 'Complete 25 workouts',
    category: 'workouts',
    icon: '🔥',
    requirement: { type: 'workout_count', value: 25 },
    tier: 'silver',
  },
  {
    id: 'workout_50',
    name: 'Dedicated',
    description: 'Complete 50 workouts',
    category: 'workouts',
    icon: '⭐',
    requirement: { type: 'workout_count', value: 50 },
    tier: 'silver',
  },
  {
    id: 'workout_100',
    name: 'Century',
    description: 'Complete 100 workouts',
    category: 'workouts',
    icon: '💯',
    requirement: { type: 'workout_count', value: 100 },
    tier: 'gold',
  },
  {
    id: 'workout_250',
    name: 'Elite',
    description: 'Complete 250 workouts',
    category: 'workouts',
    icon: '👑',
    requirement: { type: 'workout_count', value: 250 },
    tier: 'platinum',
  },
  {
    id: 'streak_3',
    name: 'Getting Consistent',
    description: 'Maintain a 3-day workout streak',
    category: 'consistency',
    icon: '🔥',
    requirement: { type: 'streak_days', value: 3 },
    tier: 'bronze',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day workout streak',
    category: 'consistency',
    icon: '📅',
    requirement: { type: 'streak_days', value: 7 },
    tier: 'silver',
  },
  {
    id: 'streak_14',
    name: 'Two Weeks Strong',
    description: 'Maintain a 14-day workout streak',
    category: 'consistency',
    icon: '🎖️',
    requirement: { type: 'streak_days', value: 14 },
    tier: 'silver',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day workout streak',
    category: 'consistency',
    icon: '🏆',
    requirement: { type: 'streak_days', value: 30 },
    tier: 'gold',
  },
  {
    id: 'streak_100',
    name: 'Unstoppable',
    description: 'Maintain a 100-day workout streak',
    category: 'consistency',
    icon: '🌟',
    requirement: { type: 'streak_days', value: 100 },
    tier: 'platinum',
  },
  {
    id: 'volume_10000',
    name: 'Volume Beginner',
    description: 'Lift 10,000 kg total volume',
    category: 'volume',
    icon: '🏋️',
    requirement: { type: 'total_volume', value: 10000 },
    tier: 'bronze',
  },
  {
    id: 'volume_50000',
    name: 'Volume Enthusiast',
    description: 'Lift 50,000 kg total volume',
    category: 'volume',
    icon: '💪',
    requirement: { type: 'total_volume', value: 50000 },
    tier: 'silver',
  },
  {
    id: 'volume_100000',
    name: 'Volume Beast',
    description: 'Lift 100,000 kg total volume',
    category: 'volume',
    icon: '🔱',
    requirement: { type: 'total_volume', value: 100000 },
    tier: 'gold',
  },
  {
    id: 'volume_250000',
    name: 'Volume Legend',
    description: 'Lift 250,000 kg total volume',
    category: 'volume',
    icon: '👹',
    requirement: { type: 'total_volume', value: 250000 },
    tier: 'platinum',
  },
  {
    id: 'bench_100',
    name: 'Bench Press Novice',
    description: 'Bench press 100 kg',
    category: 'strength',
    icon: '🏋️‍♂️',
    requirement: { type: 'max_weight', value: 100, exercise_id: 'bench_press' },
    tier: 'silver',
  },
  {
    id: 'squat_100',
    name: 'Squat Strength',
    description: 'Squat 100 kg',
    category: 'strength',
    icon: '🦵',
    requirement: { type: 'max_weight', value: 100, exercise_id: 'squat' },
    tier: 'silver',
  },
  {
    id: 'deadlift_100',
    name: 'Deadlift Power',
    description: 'Deadlift 100 kg',
    category: 'strength',
    icon: '💀',
    requirement: { type: 'max_weight', value: 100, exercise_id: 'deadlift' },
    tier: 'silver',
  },
  {
    id: 'bench_150',
    name: 'Bench Press Intermediate',
    description: 'Bench press 150 kg',
    category: 'strength',
    icon: '🏋️‍♂️',
    requirement: { type: 'max_weight', value: 150, exercise_id: 'bench_press' },
    tier: 'gold',
  },
  {
    id: 'squat_150',
    name: 'Squat Master',
    description: 'Squat 150 kg',
    category: 'strength',
    icon: '🦵',
    requirement: { type: 'max_weight', value: 150, exercise_id: 'squat' },
    tier: 'gold',
  },
  {
    id: 'deadlift_200',
    name: 'Deadlift Beast',
    description: 'Deadlift 200 kg',
    category: 'strength',
    icon: '💀',
    requirement: { type: 'max_weight', value: 200, exercise_id: 'deadlift' },
    tier: 'gold',
  },
];

export const getAchievementsByCategory = (category: AchievementCategory): Achievement[] => {
  return ACHIEVEMENTS.filter(a => a.category === category);
};

export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find(a => a.id === id);
};

export const getTierColor = (tier: Achievement['tier']): string => {
  const colors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  };
  return colors[tier];
};
