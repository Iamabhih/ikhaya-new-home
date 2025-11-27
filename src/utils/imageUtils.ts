/**
 * Image Utilities
 *
 * Centralized utility functions for handling image URLs and paths
 * across the application.
 */

// Import the Supabase URL from the client configuration
// This ensures we have a single source of truth for the URL
const SUPABASE_URL = "https://kauostzhxqoxggwqgtym.supabase.co";

/**
 * Convert an image path to a full Supabase storage URL
 *
 * @param imagePath - The image path (can be relative or already a full URL)
 * @returns The full public URL to the image
 *
 * @example
 * // Relative path
 * getSupabaseImageUrl('product-images/12345.jpg')
 * // Returns: https://xxx.supabase.co/storage/v1/object/public/product-images/12345.jpg
 *
 * @example
 * // Already a full URL
 * getSupabaseImageUrl('https://example.com/image.jpg')
 * // Returns: https://example.com/image.jpg
 */
export const getSupabaseImageUrl = (imagePath: string): string => {
  if (!imagePath) return '/placeholder.svg';

  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Convert relative path to full Supabase storage URL
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;

  return `${SUPABASE_URL}/storage/v1/object/public/${cleanPath}`;
};

/**
 * Get the public URL for an image in the product-images bucket
 *
 * @param filename - The filename or path within the product-images bucket
 * @returns The full public URL
 */
export const getProductImageUrl = (filename: string): string => {
  if (!filename) return '/placeholder.svg';

  // If already a full URL, return as-is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }

  const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename;

  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${cleanFilename}`;
};

/**
 * Extract the filename from a Supabase storage URL
 *
 * @param url - The full Supabase storage URL
 * @returns The filename portion of the URL
 */
export const extractFilenameFromUrl = (url: string): string | null => {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts[pathParts.length - 1] || null;
  } catch {
    // If URL parsing fails, try simple string extraction
    const parts = url.split('/');
    return parts[parts.length - 1] || null;
  }
};

/**
 * Check if a URL is a Supabase storage URL
 *
 * @param url - The URL to check
 * @returns True if the URL is a Supabase storage URL
 */
export const isSupabaseStorageUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes('supabase.co/storage/v1/object');
};

/**
 * Get the bucket name from a Supabase storage URL
 *
 * @param url - The Supabase storage URL
 * @returns The bucket name or null if not found
 */
export const getBucketFromUrl = (url: string): string | null => {
  if (!isSupabaseStorageUrl(url)) return null;

  try {
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Generate optimized image URL with transformation parameters
 * Note: Supabase doesn't support image transformations by default,
 * but this can be extended if using a CDN or image optimization service
 *
 * @param url - The original image URL
 * @param options - Transformation options
 * @returns The potentially transformed URL
 */
export const getOptimizedImageUrl = (
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): string => {
  // Currently just returns the original URL
  // Can be extended to add CDN transformation parameters
  return getSupabaseImageUrl(url);
};

/**
 * Validate that a URL points to a valid image format
 *
 * @param url - The URL to validate
 * @returns True if the URL appears to be an image
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const lowercaseUrl = url.toLowerCase();

  return imageExtensions.some(ext => lowercaseUrl.includes(ext));
};
