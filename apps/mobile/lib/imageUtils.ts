/**
 * Image utility functions for React Native
 * Handles image conversion and processing
 */

import * as FileSystem from 'expo-file-system/legacy';

/**
 * Convert image URI to base64 string
 * @param uri - Local file URI or remote URL
 * @returns Base64 encoded image string (without data URI prefix)
 */
export async function imageUriToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
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

    // Convert base64 to Uint8Array for React Native
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, bytes, {
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

/**
 * Create signed URL for Supabase Storage image
 * @param supabase - Supabase client
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param expiresIn - Expiration time in seconds (default: 60)
 * @returns Signed URL
 */
export async function createSignedUrl(
  supabase: any,
  bucket: string,
  path: string,
  expiresIn: number = 60
): Promise<string> {
  try {
    console.log('[ImageUtils] Creating signed URL for bucket:', bucket, 'path:', path, 'expiresIn:', expiresIn);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('[ImageUtils] Signed URL error:', error);
      throw error;
    }
    console.log('[ImageUtils] Signed URL created successfully');
    return data.signedUrl;
  } catch (error) {
    console.error('[ImageUtils] Failed to create signed URL:', error);
    console.error('[ImageUtils] Bucket:', bucket, 'Path:', path);
    throw new Error('Failed to create signed URL');
  }
}

/**
 * Validate image file size
 * @param uri - Local file URI
 * @param maxSizeMB - Maximum size in MB (default: 5)
 * @returns True if valid, throws error if invalid
 */
export async function validateImageSize(uri: string, maxSizeMB: number = 5): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri) as any;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (fileInfo.exists && fileInfo.size && fileInfo.size > maxSizeBytes) {
      throw new Error(`File size cannot exceed ${maxSizeMB}MB. Current size: ${(fileInfo.size / (1024 * 1024)).toFixed(2)}MB`);
    }

    return true;
  } catch (error) {
    console.error('[ImageUtils] Failed to validate image size:', error);
    throw error;
  }
}
