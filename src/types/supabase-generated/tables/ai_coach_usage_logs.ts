import { Json } from "../json";

export type AiCoachUsageLogsRow = {
  id: string;
  user_id: string | null;
  used_at: string | null;
};
export type AiCoachUsageLogsInsert = {
  id?: string;
  user_id?: string | null;
  used_at?: string | null;
};
export type AiCoachUsageLogsUpdate = {
  id?: string;
  user_id?: string | null;
  used_at?: string | null;
};