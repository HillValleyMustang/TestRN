import { Json } from "../json";

export type MediaPostsRow = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  creator_name: string | null;
  created_at: string;
  category: string | null; // ADDED
};
export type MediaPostsInsert = {
  id?: string;
  title: string;
  description?: string | null;
  video_url: string;
  creator_name?: string | null;
  created_at?: string;
  category?: string | null; // ADDED
};
export type MediaPostsUpdate = {
  id?: string;
  title?: string;
  description?: string | null;
  video_url?: string;
  creator_name?: string | null;
  created_at?: string;
  category?: string | null; // ADDED
};