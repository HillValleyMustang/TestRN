import { Json } from "../json";

export type BodyFatReferenceImagesRow = {
  id: string;
  percentage: number;
  image_url: string;
  description: string | null;
  created_at: string | null;
};
export type BodyFatReferenceImagesInsert = {
  id?: string;
  percentage: number;
  image_url: string;
  description?: string | null;
  created_at?: string | null;
};
export type BodyFatReferenceImagesUpdate = {
  id?: string;
  percentage?: number;
  image_url?: string;
  description?: string | null;
  created_at?: string | null;
};