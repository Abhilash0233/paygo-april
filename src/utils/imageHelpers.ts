import { Platform } from 'react-native';

/**
 * Supabase URL for storage
 * Update this if your Supabase instance changes
 */
const SUPABASE_URL = 'https://qzbuzimlrhcchgnldnrv.supabase.co';

/**
 * Get a center image URL from Supabase Storage using the updated path structure
 * 
 * @param centerId - The center ID (e.g., CTR-2025-XXXX)
 * @param type - The image type ('thumbnail' or 'gallery')
 * @param filename - Optional filename for gallery images (default: 'thumbnail.png' for thumbnails)
 * @returns The full URL to the image in Supabase Storage
 */
export const getCenterImageUrl = (
  centerId: string, 
  type: 'thumbnail' | 'gallery' | 'main' = 'thumbnail',
  filename?: string
): string => {
  // Validate input
  if (!centerId || !centerId.startsWith('CTR-')) {
    console.warn(`Invalid center ID format: ${centerId}. Expected format: CTR-YYYY-XXXX`);
    return getDefaultCenterImage(type);
  }

  // Use the updated path structure for center images
  // For thumbnails: center-images/{centerId}/thumbnail/thumbnail.png
  // For gallery: center-images/{centerId}/gallery/{filename}
  if (type === 'thumbnail') {
    const path = `/storage/v1/object/public/center-images/${centerId}/thumbnail/thumbnail.png`;
    return `${SUPABASE_URL}${path}`;
  } else if (type === 'gallery' && filename) {
    const path = `/storage/v1/object/public/center-images/${centerId}/gallery/${filename}`;
    return `${SUPABASE_URL}${path}`;
  } else if (type === 'main') {
    // Main image is typically the first gallery image or a specific main image
    const path = `/storage/v1/object/public/center-images/${centerId}/main/main.png`;
    return `${SUPABASE_URL}${path}`;
  }

  // Fallback to default
  return getDefaultCenterImage(type);
};

/**
 * Get multiple gallery image URLs for a center
 * 
 * @param centerId - The center ID
 * @param count - Number of gallery images to generate
 * @returns Array of gallery image URLs
 */
export const getCenterGalleryUrls = (centerId: string, count: number = 3): string[] => {
  if (!centerId || !centerId.startsWith('CTR-')) {
    return [getDefaultCenterImage('gallery')];
  }

  const galleryImages: string[] = [];
  
  // Generate URLs for specified number of gallery images
  for (let i = 1; i <= count; i++) {
    galleryImages.push(getCenterImageUrl(centerId, 'gallery', `image_${i}.png`));
  }
  
  return galleryImages;
};

/**
 * Get the thumbnail URL for a center
 * 
 * @param centerId - The center ID
 * @returns The thumbnail URL
 */
export const getCenterThumbnailUrl = (centerId: string): string => {
  return getCenterImageUrl(centerId, 'thumbnail');
};

/**
 * Check if an image URL is valid by attempting to fetch it
 * This enhanced version includes timeout and better error handling
 * 
 * @param imageUrl - The URL to check
 * @param timeout - Timeout in milliseconds (default: 3000ms)
 * @returns Promise resolving to true if valid, false otherwise
 */
export const checkImageUrlValidity = async (imageUrl: string, timeout: number = 3000): Promise<boolean> => {
  if (!imageUrl) return false;
  
  // AbortController for timeout implementation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Use a HEAD request first which is faster as it doesn't download the image content
    const response = await fetch(imageUrl, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // If HEAD request succeeded, the image is valid
    if (response.ok) {
      console.log(`[imageHelpers] Image validated via HEAD: ${imageUrl.substring(0, 100)}...`);
      return true;
    }
    
    // If HEAD failed but it might be because the server doesn't support HEAD requests
    // Try a GET request but with a smaller timeout
    if (response.status === 405) { // Method Not Allowed
      console.log(`[imageHelpers] Server doesn't support HEAD, trying GET: ${imageUrl.substring(0, 100)}...`);
      
      // Abort the previous request if it's still pending
      controller.abort();
      
      // Create a new controller for the GET request
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), timeout / 2);
      
      try {
        const getResponse = await fetch(imageUrl, { 
          method: 'GET',
          signal: getController.signal
        });
        
        clearTimeout(getTimeoutId);
        return getResponse.ok;
      } catch (getError) {
        clearTimeout(getTimeoutId);
        console.error(`[imageHelpers] GET validation error: ${getError}`);
        return false;
      }
    }
    
    console.log(`[imageHelpers] Image validation failed for: ${imageUrl.substring(0, 100)}..., status: ${response.status}`);
    return false;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Handle timeout separately for better logging
    if (error?.name === 'AbortError') {
      console.warn(`[imageHelpers] Image validation timed out after ${timeout}ms: ${imageUrl.substring(0, 100)}...`);
    } else {
      console.error(`[imageHelpers] Error checking image validity: ${error}`, error);
    }
    
    return false;
  }
};

/**
 * Ensure center has valid image URLs
 * 
 * @param center - The center object
 * @returns The center with validated image URLs
 */
export const ensureCenterImages = (center: any): any => {
  if (!center) return center;
  
  const updatedCenter = { ...center };
  
  // Ensure thumbnail image
  if (!updatedCenter.thumbnailImage && updatedCenter.id) {
    updatedCenter.thumbnailImage = getCenterThumbnailUrl(updatedCenter.id);
  }
  
  // Ensure gallery images
  if ((!updatedCenter.images || updatedCenter.images.length === 0) && updatedCenter.id) {
    updatedCenter.images = getCenterGalleryUrls(updatedCenter.id, 3);
  }
  
  return updatedCenter;
};

/**
 * Get default center image based on type
 * 
 * @param type - Image type
 * @returns Default image URL
 */
export const getDefaultCenterImage = (type: 'thumbnail' | 'gallery' | 'main'): string => {
  return `${SUPABASE_URL}/storage/v1/object/public/center-images/placeholders/default-center.jpg`;
};

/**
 * Get category-specific placeholder image
 * 
 * @param category - Category name or object
 * @returns Category-specific placeholder URL
 */
export const getCategoryPlaceholder = (category: any): string => {
  const categoryName = typeof category === 'object' 
    ? category?.name?.toLowerCase() 
    : typeof category === 'string'
      ? category.toLowerCase()
      : '';
      
  switch (categoryName) {
    case 'gym':
      return `${SUPABASE_URL}/storage/v1/object/public/center-images/placeholders/gym-placeholder.jpg`;
    case 'yoga':
      return `${SUPABASE_URL}/storage/v1/object/public/center-images/placeholders/yoga-placeholder.jpg`;
    case 'swimming':
      return `${SUPABASE_URL}/storage/v1/object/public/center-images/placeholders/swimming-placeholder.jpg`;
    case 'sports':
      return `${SUPABASE_URL}/storage/v1/object/public/center-images/placeholders/sports-placeholder.jpg`;
    default:
      return `${SUPABASE_URL}/storage/v1/object/public/center-images/placeholders/default-center.jpg`;
  }
}; 