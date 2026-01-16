export const ACHIEVEMENT_IDS = {
  FIRST_WORKOUT: 'first_workout',
  TEN_DAY_STREAK: 'ten_day_streak',
  TWENTY_FIVE_WORKOUTS: 'twenty_five_workouts',
  FIFTY_WORKOUTS: 'fifty_workouts',
  PERFECT_WEEK: 'perfect_week',
  BEAST_MODE: 'beast_mode',
  WEEKEND_WARRIOR: 'weekend_warrior',
  EARLY_BIRD: 'early_bird',
  THIRTY_DAY_STREAK: 'thirty_day_streak',
  VOLUME_MASTER: 'volume_master',
  CENTURY_CLUB: 'century_club',
  AI_APPRENTICE: 'ai_apprentice',
};

export const ACHIEVEMENT_DISPLAY_INFO: Record<string, { name: string; icon: string; description: string }> = {
  [ACHIEVEMENT_IDS.FIRST_WORKOUT]: { 
    name: 'First Workout', 
    icon: '🏃', 
    description: 'Complete your very first workout session.' 
  },
  [ACHIEVEMENT_IDS.TEN_DAY_STREAK]: { 
    name: '10 Day Streak', 
    icon: '🔥', 
    description: 'Log an activity for 10 consecutive days.' 
  },
  [ACHIEVEMENT_IDS.TWENTY_FIVE_WORKOUTS]: { 
    name: '25 Workouts', 
    icon: '💪', 
    description: 'Complete 25 workout sessions.' 
  },
  [ACHIEVEMENT_IDS.FIFTY_WORKOUTS]: { 
    name: '50 Workouts', 
    icon: '🏆', 
    description: 'Complete 50 workout sessions.' 
  },
  [ACHIEVEMENT_IDS.PERFECT_WEEK]: { 
    name: 'Perfect Week', 
    icon: '🗓️', 
    description: 'Complete all workouts in your active Transformation Path within a single week.' 
  },
  [ACHIEVEMENT_IDS.BEAST_MODE]: { 
    name: 'Beast Mode', 
    icon: '💥', 
    description: 'Complete two or more workout sessions in a single day.' 
  },
  [ACHIEVEMENT_IDS.WEEKEND_WARRIOR]: { 
    name: 'Weekend Warrior', 
    icon: '🎉', 
    description: 'Log 10 activities on a Saturday or Sunday.' 
  },
  [ACHIEVEMENT_IDS.EARLY_BIRD]: { 
    name: 'Early Bird', 
    icon: '🌅', 
    description: 'Log 10 activities before 8 AM.' 
  },
  [ACHIEVEMENT_IDS.THIRTY_DAY_STREAK]: { 
    name: 'Consistency King', 
    icon: '👑', 
    description: 'Log an activity for 30 consecutive days.' 
  },
  [ACHIEVEMENT_IDS.VOLUME_MASTER]: { 
    name: 'Volume Master', 
    icon: '🏋️', 
    description: 'Log a total of 100 sets across all your workouts.' 
  },
  [ACHIEVEMENT_IDS.CENTURY_CLUB]: {
    name: 'Century Club',
    icon: '💯',
    description: 'Reach 1000 total points (equivalent to 200 workouts).'
  },
  [ACHIEVEMENT_IDS.AI_APPRENTICE]: { 
    name: 'AI Apprentice', 
    icon: '🤖', 
    description: 'Use the AI Coach at least once a week for 3 consecutive weeks.' 
  },
};

export const achievementsList = [
  { id: ACHIEVEMENT_IDS.FIRST_WORKOUT, name: 'First Workout', icon: '🏃' },
  { id: ACHIEVEMENT_IDS.AI_APPRENTICE, name: 'AI Apprentice', icon: '🤖' },
  { id: ACHIEVEMENT_IDS.TEN_DAY_STREAK, name: '10 Day Streak', icon: '🔥' },
  { id: ACHIEVEMENT_IDS.THIRTY_DAY_STREAK, name: 'Consistency King', icon: '👑' },
  { id: ACHIEVEMENT_IDS.TWENTY_FIVE_WORKOUTS, name: '25 Workouts', icon: '💪' },
  { id: ACHIEVEMENT_IDS.FIFTY_WORKOUTS, name: '50 Workouts', icon: '🏆' },
  { id: ACHIEVEMENT_IDS.CENTURY_CLUB, name: 'Century Club', icon: '💯' },
  { id: ACHIEVEMENT_IDS.PERFECT_WEEK, name: 'Perfect Week', icon: '🗓️' },
  { id: ACHIEVEMENT_IDS.BEAST_MODE, name: 'Beast Mode', icon: '💥' },
  { id: ACHIEVEMENT_IDS.WEEKEND_WARRIOR, name: 'Weekend Warrior', icon: '🎉' },
  { id: ACHIEVEMENT_IDS.EARLY_BIRD, name: 'Early Bird', icon: '🌅' },
  { id: ACHIEVEMENT_IDS.VOLUME_MASTER, name: 'Volume Master', icon: '🏋️' },
];
