import { Json } from "../json";

export type UserAchievementsRow = {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string | null;
};
export type UserAchievementsInsert = {
  id?: string;
  user_id: string;
  achievement_id: string;
  unlocked_at?: string | null;
};
export type UserAchievementsUpdate = {
  id?: string;
  user_id?: string;
  achievement_id?: string;
  unlocked_at?: string | null;
};