/**
 * Supabase Center Service
 * 
 * This file contains functions to handle center data in Supabase, mirroring the functionality
 * of the Firebase centerService but using Supabase as the data source.
 */

import { supabase, getServiceRoleClient } from '../../config/supabaseConfig';
import * as Location from 'expo-location';

// Define Center interface to match the Firebase implementation
export interface Center {
  id: string;
  name: string;
  location: string;
  city?: string;
  state?: string;
  distance?: string;
  category?: {
    id: string;
    name: string;
    color?: string;
  } | string;
  categoryIds?: string[];
  activities?: string[];
  amenities?: string[];
  facilities?: string[];
  image?: string;
  thumbnailImage?: string;
  images?: string[];
  rating?: number;
  reviews?: number;
  price?: string;
  pricePerSession?: number;
  trainerPrice?: number;
  latitude?: string | number;
  longitude?: string | number;
  rawDistance?: number;
  favorite?: boolean;
  featured?: boolean;
  address?: string;
  dealPrice?: number;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  hasTrainer?: boolean;
  instagramUsername?: string;
  instagramUrl?: string;
  womenOnly?: boolean;
  operationHours?: Record<string, {
    open: string;
    close: string;
    isOpen: boolean;
  }>;
  capacity?: number;
  createdAt?: string;
}

// Define pagination response interface
export interface PaginatedResponse<T> {
  items: T[];
  lastVisible: any | null;
  hasMore: boolean;
}

/**
 * Calculate distance between coordinates in kilometers using Haversine formula
 */
export const calculateDistance = (
  point1: { latitude: number, longitude: number },
  point2: { latitude: number, longitude: number }
): number => {
  try {
    // Validate coordinates
    if (
      isNaN(point1.latitude) || isNaN(point1.longitude) || 
      isNaN(point2.latitude) || isNaN(point2.longitude)
    ) {
      console.error('Invalid coordinates (NaN values)');
      return Infinity;
  }
  
  // Earth's radius in kilometers
  const R = 6371;
    const dLat = toRadians(point2.latitude - point1.latitude);
    const dLon = toRadians(point2.longitude - point1.longitude);
  const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(point1.latitude)) * Math.cos(toRadians(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  } catch (error) {
    console.error('Error calculating distance:', error);
    return Infinity;
  }
};

// Helper function to convert degrees to radians
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for display
 */
export const formatDistance = (distanceInKm: number): string => {
  if (!isFinite(distanceInKm)) return 'Unknown distance';
  
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)} m`;
  } else if (distanceInKm < 10) {
    return `${distanceInKm.toFixed(1)} km`;
  } else {
    return `${Math.round(distanceInKm)} km`;
  }
};

/**
 * Helper function to format Supabase URLs properly
 */
const formatSupabaseUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  
  const SUPABASE_URL = 'https://qzbuzimlrhcchgnldnrv.supabase.co';
  
  // If it's already a full URL, return it
  if (url.startsWith('http')) {
    return url;
  }
  
  // If it's a partial Supabase storage path, add the base URL
  if (url.startsWith('/storage/v1/object/public/')) {
    return `${SUPABASE_URL}${url}`;
  }
  
  // If it's a Supabase storage path without the leading slash
  if (url.startsWith('storage/v1/object/public/')) {
    return `${SUPABASE_URL}/${url}`;
  }
  
  // Handle the case where we have a center ID but not a full path
  if (url.startsWith('CTR-')) {
    return `${SUPABASE_URL}/storage/v1/object/public/center-images/${url}/thumbnail/thumbnail.png`;
  }
  
  return url;
};

/**
 * Process images for a center
 * This function formats image URLs with the correct Supabase URL prefix
 */
const processAllCenterImages = (centerData: any): any => {
  const centerId = centerData.id;
  
  try {
    // Format image URLs
    if (centerData.image_url) {
      centerData.image_url = formatSupabaseUrl(centerData.image_url);
    }
    
    if (centerData.thumbnail_url) {
      centerData.thumbnail_url = formatSupabaseUrl(centerData.thumbnail_url);
    } else if (centerId && centerId.startsWith('CTR-')) {
      // If no thumbnail, use the center ID to construct the expected path
      centerData.thumbnail_url = formatSupabaseUrl(`/storage/v1/object/public/center-images/${centerId}/thumbnail/thumbnail.png`);
    }
    
    return centerData;
  } catch (error) {
    console.error(`Error processing images for center ${centerId}:`, error);
    return centerData;
  }
};

/**
 * Fetch centers from Supabase with pagination
 */
export const fetchCenters = async (
  userLocation?: Location.LocationObject,
  pageSize: number = 10,
  lastItemId?: string | null,
  categoryId?: string | null
): Promise<PaginatedResponse<Center>> => {
  try {
    console.log('Fetching paginated centers from Supabase...');
    
    // Start building the query
    let query = supabase
      .from('centers')
      .select('*')
      .order('created_at', { ascending: false }); // Default sorting by creation date
    
    // Filter by category if specified
    if (categoryId) {
      console.log(`Filtering by category ID: ${categoryId}`);
      query = query.eq('category_id', categoryId);
    }
    
    // Pagination using range
    if (lastItemId) {
      // We need to get the created_at value for the last item to implement cursor pagination
      const { data: lastItem } = await supabase
        .from('centers')
        .select('created_at')
        .eq('id', lastItemId)
        .single();
      
      if (lastItem && lastItem.created_at) {
        query = query.lt('created_at', lastItem.created_at);
      }
    }
    
    // Set limit to pageSize + 1 to check if there are more items
    query = query.limit(pageSize + 1);
    
    // Execute the query
    const { data: centresData, error } = await query;
    
    if (error) {
      console.error('Error fetching centers:', error);
      return { items: [], lastVisible: null, hasMore: false };
    }
    
    if (!centresData || centresData.length === 0) {
      console.log('No centers found in Supabase');
      return { items: [], lastVisible: null, hasMore: false };
    }
    
    // Remove the extra item we used to check for more
    const hasMore = centresData.length > pageSize;
    const items = centresData.slice(0, pageSize);
    const lastVisible = items.length > 0 ? items[items.length - 1].id : null;
    
    console.log(`Successfully fetched ${items.length} centers from Supabase`);
    
    // Process centers data and format image URLs
    const processedItems = items.map((data) => {
      // Process the center data to ensure image URLs are properly formatted
      data = processAllCenterImages(data);
      
      // Handle category_id (singular) from database and map to categoryIds (plural) for compatibility
      let categoryIds: string[] = [];
      if (data.category_id) {
        // If we have a single category_id, convert it to an array
        categoryIds = [data.category_id];
      } else if (data.category_ids) {
        // For backward compatibility if we have category_ids
        let ids = data.category_ids;
        if (typeof ids === 'string') {
          try {
            ids = JSON.parse(ids);
          } catch (e) {
            ids = ids.split(',').map((id: string) => id.trim());
          }
        }
        categoryIds = ids;
      }
      
      // Convert string categories to object if possible
      let category = data.category;
      if (typeof category === 'string') {
        try {
          const parsed = JSON.parse(category);
          if (parsed && typeof parsed === 'object') {
            category = parsed;
          }
        } catch (e) {
          // Keep as string if can't parse
        }
      }
      
      // Convert activities from string to array if needed
      let activities = data.activities || [];
      if (typeof activities === 'string') {
        try {
          activities = JSON.parse(activities);
        } catch (e) {
          activities = activities.split(',').map((a: string) => a.trim());
        }
      }
      
      // Convert facilities from string to array if needed
      let facilities = data.facilities || [];
      if (typeof facilities === 'string') {
        try {
          facilities = JSON.parse(facilities);
        } catch (e) {
          facilities = facilities.split(',').map((f: string) => f.trim());
        }
      }
      
      // Process gallery images
      let images: string[] = [];
      // We'll fetch gallery images from center_gallery in a separate call if needed
      
      // Convert operation_hours from string to object if needed
      let operationHours = data.operation_hours || {};
      if (typeof operationHours === 'string') {
        try {
          operationHours = JSON.parse(operationHours);
        } catch (e) {
          console.error(`Could not parse operation hours for center ${data.id}:`, e);
          operationHours = {};
        }
      }
      
      const image = formatSupabaseUrl(data.image_url) || '';
      const thumbnailImage = formatSupabaseUrl(data.thumbnail_url) || formatSupabaseUrl(data.image_url) || '';
      
      return {
        id: data.id,
        name: data.name || data.id,
        location: data.address || '',
        city: data.city || '',
        state: data.state || '',
        category: category,
        categoryIds: categoryIds,
        activities: activities,
        amenities: [], // Will be fetched separately from center_amenities
        facilities: facilities,
        image: image,
        thumbnailImage: thumbnailImage,
        images: [],
        rating: data.rating || 4.5,
        reviews: data.review_count || Math.floor(Math.random() * 100) + 20,
        price: data.price_per_session ? `₹${data.price_per_session}` : (data.deal_price ? `₹${data.deal_price}` : '₹₹'),
        pricePerSession: data.price_per_session || 0,
        trainerPrice: data.trainer_price || 0,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        address: data.address || '',
        dealPrice: data.deal_price || 0,
        description: data.description || '',
        contactPhone: data.phone_number || '',
        contactEmail: data.email || '',
        website: data.website || '',
        hasTrainer: data.has_trainer || false,
        instagramUsername: data.instagram_username || '',
        instagramUrl: '',
        womenOnly: data.is_women_only || false,
        capacity: 0,
        operationHours: operationHours,
        createdAt: data.created_at || '',
        featured: false
      } as Center;
    });
    
    // Calculate distance if user location is available
    let centers: Center[] = processedItems;
    
    if (userLocation?.coords) {
      console.log(`Calculating distances using user coordinates: lat=${userLocation.coords.latitude}, lng=${userLocation.coords.longitude}`);
      centers = centers.map(center => {
        if (center.latitude && center.longitude) {
          // Ensure latitude and longitude are numbers
          const centerLat = typeof center.latitude === 'string' ? parseFloat(center.latitude) : center.latitude;
          const centerLng = typeof center.longitude === 'string' ? parseFloat(center.longitude) : center.longitude;
          
          // Skip if invalid coordinates
          if (isNaN(centerLat) || isNaN(centerLng)) {
            console.log(`Invalid coordinates for center ${center.id} (${center.name}): lat=${center.latitude}, lng=${center.longitude}`);
            return {
              ...center,
              distance: 'Unknown distance',
              rawDistance: Infinity
            };
          }
          
          // Calculate distance using our function
          const distanceInKm = calculateDistance(
            { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude },
            { latitude: centerLat, longitude: centerLng }
          );
          
          console.log(`Distance for ${center.name}: ${distanceInKm.toFixed(2)}km`);
          
          return {
            ...center,
            distance: formatDistance(distanceInKm),
            rawDistance: distanceInKm
          };
        } else {
          console.log(`No coordinates available for ${center.name}, cannot calculate distance`);
          return {
            ...center,
            distance: 'Unknown distance',
            rawDistance: Infinity
          };
        }
      });
      
      // Sort by distance
      centers.sort((a, b) => {
        const distA = typeof a.rawDistance === 'number' ? a.rawDistance : Infinity;
        const distB = typeof b.rawDistance === 'number' ? b.rawDistance : Infinity;
        return distA - distB;
      });
    }
    
    // Additional logging for image URLs
    console.log('Image URLs for first center:', centers.length > 0 ? {
      name: centers[0].name,
      image: centers[0].image,
      thumbnailImage: centers[0].thumbnailImage,
      hasSupabaseUrl: centers[0].image?.includes('supabase.co') || centers[0].thumbnailImage?.includes('supabase.co')
    } : 'No centers');
    
    console.log(`Fetched ${centers.length} centers from Supabase`);
    
    return {
      items: centers,
      lastVisible,
      hasMore
    };
  } catch (error) {
    console.error('Error fetching centers from Supabase:', error);
    throw error;
  }
};

/**
 * Fetch a single center by ID with complete details
 */
export const fetchCenterDetails = async (centerId: string): Promise<Center | null> => {
  try {
    console.log(`Fetching center details from Supabase for ID: ${centerId}`);
    
    const { data, error } = await supabase
      .from('centers')
      .select('*')
      .eq('id', centerId)
      .single();
    
    if (error) {
      console.error('Error fetching center details:', error);
      return null;
    }
    
    if (!data) {
      console.log('No center found with ID:', centerId);
      return null;
    }
    
    // Fetch amenities from center_amenities table
    const { data: amenitiesData, error: amenitiesError } = await supabase
      .from('center_amenities')
      .select('*')
      .eq('center_id', centerId);
    
    if (amenitiesError) {
      console.error('Error fetching center amenities:', amenitiesError);
    }
    
    // Process amenities by type
    const amenities: string[] = [];
    const facilities: string[] = [];
    
    if (amenitiesData && amenitiesData.length > 0) {
      amenitiesData.forEach(item => {
        // Format the amenity name for display (replace underscores with spaces, capitalize first letter)
        const formattedName = item.name
          .split('_')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        if (item.type === 'equipment') {
          amenities.push(formattedName);
        } else if (item.type === 'facility') {
          facilities.push(formattedName);
        }
      });
    }
    
    console.log(`Fetched ${amenities.length} amenities and ${facilities.length} facilities for center ${centerId}`);
    
    // Process the center data to ensure image URLs are properly formatted
    const processedData = processAllCenterImages(data);
    
    // Handle category_id (singular) from database and map to categoryIds (plural) for compatibility
    let categoryIds: string[] = [];
    if (processedData.category_id) {
      // If we have a single category_id, convert it to an array
      categoryIds = [processedData.category_id];
    } else if (processedData.category_ids) {
      // For backward compatibility if we have category_ids
      let ids = processedData.category_ids;
      if (typeof ids === 'string') {
        try {
          ids = JSON.parse(ids);
        } catch (e) {
          ids = ids.split(',').map((id: string) => id.trim());
        }
      }
      categoryIds = ids;
    }
    
    // Convert string categories to object if possible
    let category = processedData.category;
    if (typeof category === 'string') {
      try {
        const parsed = JSON.parse(category);
        if (parsed && typeof parsed === 'object') {
          category = parsed;
        }
      } catch (e) {
        // Keep as string if can't parse
      }
    }
    
    // Convert activities from string to array if needed
    let activities = processedData.activities || [];
    if (typeof activities === 'string') {
      try {
        activities = JSON.parse(activities);
      } catch (e) {
        activities = activities.split(',').map((a: string) => a.trim());
      }
    }
    
    // For operation hours
    let operationHours = processedData.operation_hours || {};
    if (typeof operationHours === 'string') {
      try {
        operationHours = JSON.parse(operationHours);
      } catch (e) {
        console.error(`Could not parse operation hours for center ${processedData.id}:`, e);
        operationHours = {};
      }
    }
    
    // Process images
    const image = formatSupabaseUrl(processedData.image_url) || '';
    const thumbnailImage = formatSupabaseUrl(processedData.thumbnail_url) || formatSupabaseUrl(processedData.image_url) || '';
    
    // Process gallery images
    const { data: galleryData, error: galleryError } = await supabase
      .from('center_gallery')
      .select('image_url')
      .eq('center_id', centerId);
    
    let images: string[] = [];
    if (!galleryError && galleryData) {
      images = galleryData
        .map(item => formatSupabaseUrl(item.image_url))
        .filter((url): url is string => typeof url === 'string');
    }
    
    // Ensure latitude and longitude are numbers
    const latitude = typeof processedData.latitude === 'string' 
      ? parseFloat(processedData.latitude) 
      : (processedData.latitude || 0);
      
    const longitude = typeof processedData.longitude === 'string' 
      ? parseFloat(processedData.longitude) 
      : (processedData.longitude || 0);
    
    return {
      id: processedData.id,
      name: processedData.name || processedData.id,
      location: processedData.address || '',
      city: processedData.city || '',
      state: processedData.state || '',
      category: category,
      categoryIds: categoryIds,
      activities: activities,
      amenities: amenities,
      facilities: facilities,
      image: image,
      thumbnailImage: thumbnailImage,
      images: images,
      rating: processedData.rating || 4.5,
      reviews: processedData.review_count || Math.floor(Math.random() * 100) + 20,
      price: processedData.price_per_session ? `₹${processedData.price_per_session}` : (processedData.deal_price ? `₹${processedData.deal_price}` : '₹₹'),
      pricePerSession: processedData.price_per_session || 0,
      trainerPrice: processedData.trainer_price || 0,
      latitude: latitude,
      longitude: longitude,
      address: processedData.address || '',
      dealPrice: processedData.deal_price || 0,
      description: processedData.description || '',
      contactPhone: processedData.phone_number || '',
      contactEmail: processedData.email || '',
      website: processedData.website || '',
      hasTrainer: processedData.has_trainer || false,
      instagramUsername: processedData.instagram_username || '',
      instagramUrl: '',
      womenOnly: processedData.is_women_only || false,
      capacity: 0,
      operationHours: operationHours,
      createdAt: processedData.created_at || '',
      featured: false
    } as Center;
  } catch (error) {
    console.error('Error fetching center details from Supabase:', error);
    return null;
  }
};

/**
 * Update image URLs for a center in Supabase
 */
export const updateCenterImageUrls = async (
  centerId: string,
  imageUrls: {
    mainImage?: string;
    thumbnailImage?: string;
    galleryImages?: string[];
  }
): Promise<boolean> => {
  try {
    console.log(`Updating image URLs for center ${centerId}`);
    
    const updateData: any = {};
    
    if (imageUrls.mainImage) {
      updateData.image_url = imageUrls.mainImage;
    }
    
    if (imageUrls.thumbnailImage) {
      updateData.thumbnail_url = imageUrls.thumbnailImage;
    }
    
    const { error } = await supabase
      .from('centers')
      .update(updateData)
      .eq('id', centerId);
    
    if (error) {
      console.error(`Error updating image URLs for center ${centerId}:`, error);
      return false;
    }
    
    // Handle gallery images separately
    if (imageUrls.galleryImages && imageUrls.galleryImages.length > 0) {
      // First delete existing gallery images
      const { error: deleteError } = await supabase
        .from('center_gallery')
        .delete()
        .eq('center_id', centerId);
      
      if (deleteError) {
        console.error(`Error deleting gallery images for center ${centerId}:`, deleteError);
      }
      
      // Insert new gallery images
      const galleryImages = imageUrls.galleryImages.map((imageUrl, index) => ({
        center_id: centerId,
        image_url: imageUrl,
        created_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await supabase
        .from('center_gallery')
        .insert(galleryImages);
      
      if (insertError) {
        console.error(`Error inserting gallery images for center ${centerId}:`, insertError);
        return false;
      }
    }
    
    console.log(`Successfully updated image URLs for center ${centerId}`);
    return true;
  } catch (error) {
    console.error(`Error updating image URLs for center ${centerId}:`, error);
    return false;
  }
}; 