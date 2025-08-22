import { Json } from "../json";

export type ActivityLogsRow = {
  activity_type: string;
  avg_time: number | null;
  created_at: string | null;
  distance: string | null;
  id: string;
  is_pb: boolean | null;
  log_date: string;
  time: string | null;
  user_id: string | null;
};
export type ActivityLogsInsert = {
  activity_type: string;
  avg_time?: number | null;
  created_at?: string | null;
  distance?: string | null;
  id?: string;
  is_pb?: boolean | null;
  log_date: string;
  time?: string | null;
  user_id?: string | null;
};
export type ActivityLogsUpdate = {
  activity_type?: string;
  avg_time?: number | null;
  created_at?: string | null;
  distance?: string | null;
  id?: string;
  is_pb?: boolean | null;
  log_date?: string;
  time?: string | null;
  user_id?: string | null;
};