/**
 * Image utility functions for React Native
 * Handles image conversion and processing
 */

import * as FileSystem from 'expo-file-system';

/**
 * Convert image URI to base64 string
 * @param uri - Local file URI or remote URL
 * @returns Base64 encoded image string (without data URI prefix)
 */
export async function imageUriToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return base64;
  } catch (error) {
    console.error('[ImageUtils] Failed to convert image to base64:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Upload image to Supabase Storage
 * @param supabase - Supabase client
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param uri - Local file URI
 * @returns Public URL of uploaded image
 */
export async function uploadImageToSupabase(
  supabase: any,
  bucket: string,
  path: string,
  uri: string
): Promise<string> {
  try {
    // Convert to base64
    const base64 = await imageUriToBase64(uri);
    
    // Convert base64 to blob
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    const blob = await response.blob();
    
    // Upload to Supabase
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    console.error('[ImageUtils] Failed to upload image:', error);
    throw new Error('Failed to upload image');
  }
}
