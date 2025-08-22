import { Json } from "../json";

export type GetNotificationsWithReadStatusArgs = Record<PropertyKey, never>;
export type GetNotificationsWithReadStatusReturns = {
  created_at: string;
  id: string;
  is_read: boolean;
  message: string;
  title: string;
  type: string;
}[];