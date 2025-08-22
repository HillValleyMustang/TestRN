import { Json } from "../json";

export type NotificationsRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string | null;
};
export type NotificationsInsert = {
  id?: string;
  title: string;
  message: string;
  type?: string;
  created_at?: string | null;
};
export type NotificationsUpdate = {
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  created_at?: string | null;
};