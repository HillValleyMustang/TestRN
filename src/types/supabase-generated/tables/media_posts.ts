import { Json } from "../json";

export type MediaPostsRow = {
  id: string;
  title: string;
  description: string | null;
  video_url: string; // Changed from youtube_video_id
  creator_name: string | null;
  created_at: string;
};
export type MediaPostsInsert = {
  id?: string;
  title: string;
  description?: string | null;
  video_url: string; // Changed from youtube_video_id
  creator_name?: string | null;
  created_at?: string;
};
export type MediaPostsUpdate = {
  id?: string;
  title?: string;
  description?: string | null;
  video_url?: string; // Changed from youtube_video_id
  creator_name?: string | null;
  created_at?: string;
};