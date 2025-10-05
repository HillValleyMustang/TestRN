import { Json } from "../json";

export type UserNotificationsRow = {
  id: string;
  user_id: string;
  notification_id: string;
  read_at: string | null;
};
export type UserNotificationsInsert = {
  id?: string;
  user_id: string;
  notification_id: string;
  read_at?: string | null;
};
export type UserNotificationsUpdate = {
  id?: string;
  user_id?: string;
  notification_id?: string;
  read_at?: string | null;
};