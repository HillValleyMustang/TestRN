 /**
 * Image utility functions for React Native
 * Handles image conversion and processing
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

// Private app directory for secure photo storage
const PHOTOS_DIR = FileSystem.documentDirectory + 'photos/';

// Goal physique photos directory
const GOAL_PHYSIQUE_DIR = FileSystem.documentDirectory + 'goal-physiques/';

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
 * Compress image for upload
 * @param uri - Local file URI
 * @param maxWidth - Maximum width (default: 1920)
 * @param maxHeight - Maximum height (default: 1920)
 * @param quality - JPEG quality 0-100 (default: 80)
 * @returns Compressed image URI
 */
export async function compressImage(
  uri: string,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<string> {
  try {
    console.log('[ImageUtils] Compressing image:', uri);

    // Get original image info to check if resizing is needed
    const fileInfo = await FileSystem.getInfoAsync(uri) as any;
    console.log('[ImageUtils] Original file size:', fileInfo.size, 'bytes');

    const response = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: Math.max(0, Math.min(1, quality)), // Ensure quality is between 0 and 1
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Check compressed file size
    const compressedInfo = await FileSystem.getInfoAsync(response.uri) as any;
    console.log('[ImageUtils] Compressed file size:', compressedInfo.size, 'bytes');

    console.log('[ImageUtils] Image compressed successfully:', response.uri);
    return response.uri;
  } catch (error) {
    console.error('[ImageUtils] Failed to compress image:', error);
    throw new Error('Failed to compress image');
  }
}

/**
 * Initialize the private photos directory
 * @returns Promise that resolves when directory is ready
 */
export async function initializePhotosDirectory(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
      console.log('[ImageUtils] Created private photos directory:', PHOTOS_DIR);
    }
  } catch (error) {
    console.error('[ImageUtils] Failed to initialize photos directory:', error);
    throw new Error('Failed to initialize secure photo storage');
  }
}

/**
 * Save a photo securely to the app's private directory
 * @param sourceUri - Source image URI (from camera or gallery)
 * @param photoId - Unique identifier for the photo
 * @param compress - Whether to compress the image (default: true)
 * @returns Local file URI of the saved photo
 */
export async function savePhotoSecurely(
  sourceUri: string,
  photoId: string,
  compress: boolean = true
): Promise<string> {
  try {
    // Ensure directory exists
    await initializePhotosDirectory();

    // Compress if requested
    let processedUri = sourceUri;
    if (compress) {
      console.log('[ImageUtils] Compressing photo before secure storage');
      processedUri = await compressImage(sourceUri);
    }

    // Generate secure filename
    const fileName = `photo_${photoId}_${Date.now()}.jpg`;
    const localUri = PHOTOS_DIR + fileName;

    // Copy processed image to secure location
    await FileSystem.copyAsync({
      from: processedUri,
      to: localUri,
    });

    console.log('[ImageUtils] Photo saved securely:', localUri);
    return localUri;
  } catch (error) {
    console.error('[ImageUtils] Failed to save photo securely:', error);
    throw new Error('Failed to save photo securely');
  }
}

/**
 * Retrieve a photo from secure storage
 * @param photoId - Unique identifier for the photo
 * @returns Local file URI if found, null if not found
 */
export async function getPhotoSecurely(photoId: string): Promise<string | null> {
  try {
    // List all files in photos directory
    const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);

    // Find file matching the photo ID pattern
    const photoFile = files.find(file => file.startsWith(`photo_${photoId}_`));

    if (!photoFile) {
      console.log('[ImageUtils] Photo not found:', photoId);
      return null;
    }

    const localUri = PHOTOS_DIR + photoFile;
    const fileInfo = await FileSystem.getInfoAsync(localUri);

    if (!fileInfo.exists) {
      console.log('[ImageUtils] Photo file does not exist:', localUri);
      return null;
    }

    console.log('[ImageUtils] Photo retrieved:', localUri);
    return localUri;
  } catch (error) {
    console.error('[ImageUtils] Failed to retrieve photo:', error);
    return null;
  }
}

/**
 * Delete a photo from secure storage
 * @param photoId - Unique identifier for the photo
 * @returns True if deleted, false if not found
 */
export async function deletePhotoSecurely(photoId: string): Promise<boolean> {
  try {
    // List all files in photos directory
    const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);

    // Find file matching the photo ID pattern
    const photoFile = files.find(file => file.startsWith(`photo_${photoId}_`));

    if (!photoFile) {
      console.log('[ImageUtils] Photo not found for deletion:', photoId);
      return false;
    }

    const localUri = PHOTOS_DIR + photoFile;
    await FileSystem.deleteAsync(localUri, { idempotent: true });

    console.log('[ImageUtils] Photo deleted securely:', localUri);
    return true;
  } catch (error) {
    console.error('[ImageUtils] Failed to delete photo:', error);
    return false;
  }
}

/**
 * Get all photos from secure storage
 * @returns Array of photo objects with id and uri
 */
export async function getAllPhotosSecurely(): Promise<Array<{ id: string; uri: string; createdAt: number }>> {
  try {
    const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
    const photos: Array<{ id: string; uri: string; createdAt: number }> = [];

    for (const file of files) {
      if (file.startsWith('photo_') && file.endsWith('.jpg')) {
        // Extract photo ID and timestamp from filename
        const match = file.match(/^photo_(.+)_(\d+)\.jpg$/);
        if (match) {
          const [, photoId, timestamp] = match;
          const localUri = PHOTOS_DIR + file;
          const fileInfo = await FileSystem.getInfoAsync(localUri);

          if (fileInfo.exists) {
            photos.push({
              id: photoId,
              uri: localUri,
              createdAt: parseInt(timestamp),
            });
          }
        }
      }
    }

    // Sort by creation time (newest first)
    photos.sort((a, b) => b.createdAt - a.createdAt);

    console.log('[ImageUtils] Retrieved', photos.length, 'photos from secure storage');
    return photos;
  } catch (error) {
    console.error('[ImageUtils] Failed to get all photos:', error);
    return [];
  }
}

/**
 * Initialize the goal physique photos directory
 * @returns Promise that resolves when directory is ready
 */
export async function initializeGoalPhysiqueDirectory(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(GOAL_PHYSIQUE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(GOAL_PHYSIQUE_DIR, { intermediates: true });
      console.log('[ImageUtils] Created goal physique photos directory:', GOAL_PHYSIQUE_DIR);
    }
  } catch (error) {
    console.error('[ImageUtils] Failed to initialize goal physique directory:', error);
    throw new Error('Failed to initialize goal physique storage');
  }
}

/**
 * Save a goal physique photo securely to local storage
 * @param sourceUri - Source image URI (compressed image)
 * @param goalPhysiqueId - Unique identifier for the goal physique
 * @returns Local file path for storage in database
 */
export async function saveGoalPhysiquePhoto(
  sourceUri: string,
  goalPhysiqueId: string
): Promise<string> {
  try {
    // Ensure directory exists
    await initializeGoalPhysiqueDirectory();

    // Generate secure filename
    const fileName = `goal_physique_${goalPhysiqueId}_${Date.now()}.jpg`;
    const localUri = GOAL_PHYSIQUE_DIR + fileName;

    // Copy compressed image to secure location
    await FileSystem.copyAsync({
      from: sourceUri,
      to: localUri,
    });

    // Return relative path for database storage (not full URI)
    const relativePath = `goal-physiques/${fileName}`;
    console.log('[ImageUtils] Goal physique photo saved securely:', relativePath);
    return relativePath;
  } catch (error) {
    console.error('[ImageUtils] Failed to save goal physique photo:', error);
    throw new Error('Failed to save goal physique photo');
  }
}

/**
 * Get goal physique photo from local storage
 * @param relativePath - Relative path stored in database
 * @returns Full local URI if found, null if not found
 */
export async function getGoalPhysiquePhoto(relativePath: string): Promise<string | null> {
  try {
    if (!relativePath) return null;

    // Handle both full URIs and relative paths
    let localUri: string;
    if (relativePath.startsWith('file://')) {
      // Already a full URI
      localUri = relativePath;
    } else {
      // Convert relative path to full local URI
      localUri = FileSystem.documentDirectory + relativePath;
    }

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(localUri);

    if (!fileInfo.exists) {
      console.log('[ImageUtils] Goal physique photo not found:', localUri);
      return null;
    }

    console.log('[ImageUtils] Goal physique photo retrieved:', localUri);
    return localUri;
  } catch (error) {
    console.error('[ImageUtils] Failed to retrieve goal physique photo:', error);
    console.error('[ImageUtils] Error details:', error);
    return null;
  }
}

/**
 * Delete a goal physique photo from local storage
 * @param relativePath - Relative path stored in database
 * @returns True if deleted, false if not found
 */
export async function deleteGoalPhysiquePhoto(relativePath: string): Promise<boolean> {
  try {
    if (!relativePath) return false;

    // Handle both full URIs and relative paths
    let localUri: string;
    if (relativePath.startsWith('file://')) {
      // Already a full URI
      localUri = relativePath;
    } else {
      // Convert relative path to full local URI
      localUri = FileSystem.documentDirectory + relativePath;
    }

    await FileSystem.deleteAsync(localUri, { idempotent: true });

    console.log('[ImageUtils] Goal physique photo deleted:', localUri);
    return true;
  } catch (error) {
    console.error('[ImageUtils] Failed to delete goal physique photo:', error);
    return false;
  }
}

/**
 * Clean up old photos from secure storage (keep only recent ones)
 * @param keepCount - Number of most recent photos to keep (default: 50)
 * @returns Number of photos deleted
 */
export async function cleanupOldPhotos(keepCount: number = 50): Promise<number> {
  try {
    const photos = await getAllPhotosSecurely();

    if (photos.length <= keepCount) {
      return 0; // No cleanup needed
    }

    // Sort by creation time (oldest first)
    const sortedPhotos = photos.sort((a, b) => a.createdAt - b.createdAt);

    // Delete oldest photos beyond the keep count
    const photosToDelete = sortedPhotos.slice(0, sortedPhotos.length - keepCount);
    let deletedCount = 0;

    for (const photo of photosToDelete) {
      const success = await deletePhotoSecurely(photo.id);
      if (success) {
        deletedCount++;
      }
    }

    console.log('[ImageUtils] Cleaned up', deletedCount, 'old photos');
    return deletedCount;
  } catch (error) {
    console.error('[ImageUtils] Failed to cleanup old photos:', error);
    return 0;
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
