/**
 * YouTube Helper Functions
 * Utilities for extracting video IDs and generating thumbnails from YouTube URLs
 */

/**
 * Extracts YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Direct 11-character ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    // Standard watch URL
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    // Short URL
    /(?:youtu\.be\/)([^&\n?#]+)/,
    // Embed URL
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    // Direct 11-char ID (YouTube IDs are always 11 characters)
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generates YouTube thumbnail URL from video URL or ID
 * Returns high-quality thumbnail (hqdefault)
 */
export function getYouTubeThumbnailUrl(videoUrlOrId: string): string | null {
  const videoId = extractYouTubeId(videoUrlOrId);

  if (!videoId) return null;

  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Validates if a string is a valid YouTube URL or ID
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}
