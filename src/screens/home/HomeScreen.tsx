import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { 
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Alert,
  Linking
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import LocationSearchScreen from '../location/LocationSearchScreen';
import { LinearGradient } from 'expo-linear-gradient';
import LocationHeader from '../../components/LocationHeader';
import * as Location from 'expo-location';
import { useWallet } from '../../services/walletContext';
import { getUserProfile as getUserProfileService } from '../../services/supabase/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationPermissionModal from '../../components/LocationPermissionModal';
import { UserProfile } from '../../services/supabase/userService';
import { useAuth, AuthContext } from '../../services/authContext';
import UpcomingBookingCard from '../../components/UpcomingBookingCard';
import { CommonActions } from '@react-navigation/native';
import LoginOverlay from '../../components/LoginOverlay';
import WelcomeOverlay from '../../components/WelcomeOverlay';
import { MainTabParamList } from '../../navigation/AppNavigator';
import { getUserByPhoneNumber, createOrUpdateUserProfile } from '../../services/supabase/userService';
import { ADMIN_PHONE_NUMBER } from '../../services/twilioService';
// Import Supabase services
import { 
  fetchCenters as supabaseFetchCenters, 
  fetchCenterDetails as supabaseFetchCenterDetails,
} from '../../services/supabase/centerService';
// Import categories from Supabase
import { fetchCategories as supabaseFetchCategories } from '../../services/supabase/categoryService';
// Import the image helpers
import { getCenterImageUrl, getCategoryPlaceholder as getImageCategoryPlaceholder, checkImageUrlValidity } from '../../utils/imageHelpers';
import { supabase } from '../../config/supabaseConfig';

// Define location interface
interface CenterLocation {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  city?: string;
  state?: string;
}

// Define our Center type
interface Center {
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
  image?: string;
  thumbnailImage?: string;
  rating?: number;
  reviews?: number;
  price?: string;
  pricePerSession?: number;
  latitude?: string | number;
  longitude?: string | number;
  rawDistance?: number; // Changed from required to optional
}

// Update the navigation type
type MainStackParamList = {
  Profile: {
    screen: 'Wallet';
  };
};

type HomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList & HomeStackParamList & {
    Main: { screen: keyof MainTabParamList; params?: any }
  }, 
  'HomeMain'
>;

// Helper function to extract location parts
const extractLocationShortForm = (address: string): { primary: string; secondary: string } => {
  const addressParts = address.split(',').map(part => part.trim());
  
  // If there are at least 2 parts, use them as primary and secondary
  if (addressParts.length >= 2) {
    return {
      primary: addressParts[0],
      secondary: addressParts.slice(1, 3).join(', ')
    };
  }
  
  // If there's only one part, use it as primary and set secondary to empty
  return {
    primary: addressParts[0] || '',
    secondary: ''
  };
};

// Helper function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (
  coords1: { latitude: number; longitude: number },
  coords2: { latitude: number; longitude: number }
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(coords2.latitude - coords1.latitude);
  const dLon = deg2rad(coords2.longitude - coords1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coords1.latitude)) * Math.cos(deg2rad(coords2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

// Helper function to convert degrees to radians
const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Helper function to format distance for display
const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  } else {
    return `${distance.toFixed(1)} km`;
  }
};

// Add this function to get icon names for categories
const getCategoryIcon = (categoryName: string): keyof typeof Ionicons.glyphMap => {
  const name = categoryName.toLowerCase();
  
  switch (name) {
    case 'gym': return 'fitness-outline';
    case 'yoga': return 'leaf-outline';
    case 'swimming': return 'water-outline';
    case 'sports': return 'basketball-outline';
    case 'martial arts': return 'body-outline';
    case 'dance': return 'musical-notes-outline';
    case 'aerobics': return 'pulse-outline';
    case 'pilates': return 'body-outline';
    default: return 'barbell-outline';
  }
};

// Add a helper function to extract street and locality
const extractStreetAndLocality = (address: string): string => {
  if (!address) return 'Location unavailable';
  
  // Split address by commas
  const parts = address.split(',').map(part => part.trim());
  
  // If there are multiple parts, take the first two (street and locality typically)
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  
  // If there's only one part, return it
  return parts[0];
};

// Add a helper function to extract numeric distance value from distance string
const getDistanceValue = (distanceStr: string | undefined): number => {
  if (!distanceStr || distanceStr === 'N/A' || distanceStr === 'Unknown distance') {
    return Number.MAX_VALUE; // Place unknown distances at the end
  }
  
  try {
    // Extract the numeric part and convert to a common unit (meters)
    const numericPart = parseFloat(distanceStr.replace(/[^0-9.]/g, ''));
    
    if (distanceStr.includes('km')) {
      return numericPart * 1000; // Convert km to meters
    } else if (distanceStr.includes('m')) {
      return numericPart; // Already in meters
    }
    
    return numericPart; // Default case
  } catch (error) {
    console.log('Error parsing distance:', error);
    return Number.MAX_VALUE;
  }
};

// Update the type for location selection
interface SelectedLocation {
  name: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  city?: string | null;
  state?: string | null;
}

// Update types for categories
interface Category {
  id: string;
  name: string;
  color: string;
  image?: string | null;
}

// Update the ImageSkeleton component
const ImageSkeleton = () => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={styles.skeletonImageContainer}>
      <Animated.View
        style={[
          styles.skeletonImage,
          {
            transform: [{ translateX }],
            backgroundColor: '#E1E9EE',
          },
        ]}
      />
      <Animated.View
        style={[
          styles.skeletonShimmer,
          {
            transform: [{ translateX }],
            backgroundColor: '#F0F3F5',
          },
        ]}
      />
    </View>
  );
};

// Add this new component before the HomeScreen component
const CenterCard = React.memo(({ 
  item, 
  onPress,
  userCoordinates
}: { 
  item: Center; 
  onPress: () => void;
  userCoordinates?: {
    latitude: number;
    longitude: number;
  } | null;
}) => {
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);
  const [imageURL, setImageURL] = React.useState<string | null>(null);
  const [categoryInfo, setCategoryInfo] = React.useState<{name: string, color: string} | null>(null);
  
  // Load category information when component mounts
  React.useEffect(() => {
    const loadCategoryInfo = async () => {
      try {
        // If we already have category info as an object, use it
        if (typeof item.category === 'object' && item.category.name) {
          setCategoryInfo({
            name: item.category.name,
            color: item.category.color || '#118347' // Default green if no color
          });
          return;
        }
        
        // If we have categoryIds, use the first one - in the database it's category_id
        const categoryId = item.categoryIds && item.categoryIds.length > 0 
          ? item.categoryIds[0]
          : (item as any).category_id; // Use type assertion for backward compatibility
        
        if (categoryId) {
          console.log(`[CenterCard] Fetching category for ID: ${categoryId}`);
          
          const { data, error } = await supabase
            .from('categories')
            .select('name, color')
            .eq('id', categoryId)
            .single();
            
          if (error) {
            console.error(`[CenterCard] Error fetching category: ${error.message}`);
          } else if (data) {
            console.log(`[CenterCard] Found category: ${data.name}`);
            setCategoryInfo({
              name: data.name,
              color: data.color || '#118347'
            });
          }
        } 
        // If we have category as a string, use that
        else if (typeof item.category === 'string') {
          setCategoryInfo({
            name: item.category,
            color: getCategoryColor(item.category)
          });
        }
      } catch (error) {
        console.error(`[CenterCard] Error loading category info: ${error}`);
      }
    };
    
    loadCategoryInfo();
  }, [item.category, item.categoryIds]); // Changed from item.category_id to item.categoryIds
  
  // Pre-validate the image URL when the component mounts or when item changes
  React.useEffect(() => {
    const validateAndSetImageUrl = async () => {
      try {
        // First get the URL
        const url = getImageUrl();
        
        // Set the URL immediately to start loading
        setImageURL(url);
        
        // Check if the image is valid in the background
        const isValid = await checkImageUrlValidity(url);
        
        // If not valid, mark as error and use a placeholder
        if (!isValid) {
          console.log(`[CenterCard] Image URL invalid for ${item.name}: ${url}`);
          setImageError(true);
          setImageLoading(false);
          
          // Set a valid placeholder URL
          const categoryPlaceholder = getCategoryPlaceholder();
          const placeholderUrl = categoryPlaceholder ? 
            `${SUPABASE_URL}${categoryPlaceholder}` : defaultPlaceholder;
          setImageURL(placeholderUrl);
        }
      } catch (error) {
        console.error(`[CenterCard] Error validating image for ${item.name}:`, error);
        setImageError(true);
        setImageLoading(false);
      }
    };
    
    validateAndSetImageUrl();
  }, [item.id, item.thumbnailImage, item.image]);
  
  // Format distance display with better fallback
  const renderDistance = () => {
    if (item.distance && item.distance !== 'Unknown distance') {
      // Ensure distance is properly formatted and shown
      console.log(`Rendering distance for ${item.name}: ${item.distance}`);
      return (
        <View style={styles.featuredDistance}>
          <Ionicons name="navigate-outline" size={14} color="#118347" />
          <Text style={styles.featuredDistanceText}>{item.distance}</Text>
        </View>
      );
    }
    
    // If we have coordinates but no distance, try to calculate it
    if (userCoordinates && item.latitude && item.longitude) {
      try {
        const lat1 = userCoordinates.latitude;
        const lon1 = userCoordinates.longitude;
        const lat2 = typeof item.latitude === 'string' ? parseFloat(item.latitude) : item.latitude;
        const lon2 = typeof item.longitude === 'string' ? parseFloat(item.longitude) : item.longitude;
        
        if (!isNaN(lat2) && !isNaN(lon2)) {
          const distance = calculateDistance(
            { latitude: lat1, longitude: lon1 },
            { latitude: lat2, longitude: lon2 }
          );
          
          const formattedDistance = formatDistance(distance);
          console.log(`Calculated distance for ${item.name}: ${formattedDistance}`);
          
          return (
            <View style={styles.featuredDistance}>
              <Ionicons name="navigate-outline" size={14} color="#118347" />
              <Text style={styles.featuredDistanceText}>{formattedDistance}</Text>
            </View>
          );
        }
      } catch (error) {
        console.error(`Error calculating distance for ${item.name}:`, error);
      }
    }
    
    // If no distance, show a generic message
    return (
      <View style={styles.featuredDistance}>
        <Ionicons name="location-outline" size={14} color="#777777" />
        <Text style={[styles.featuredDistanceText, { color: '#777777' }]}>View location</Text>
      </View>
    );
  };

  // Supabase project URL for storage URLs
  const SUPABASE_URL = 'https://xydbgppuiqzrzepkpkuq.supabase.co';
  
  // Category-specific placeholder images
  const getCategoryPlaceholder = () => {
    if (!item.category) return null;
    
    const categoryName = typeof item.category === 'object' 
      ? item.category.name?.toLowerCase() 
      : typeof item.category === 'string'
        ? item.category.toLowerCase()
        : '';
        
    switch (categoryName) {
      case 'gym':
        return '/storage/v1/object/public/center-images/placeholders/gym-placeholder.jpg';
      case 'yoga':
        return '/storage/v1/object/public/center-images/placeholders/yoga-placeholder.jpg';
      case 'swimming':
        return '/storage/v1/object/public/center-images/placeholders/swimming-placeholder.jpg';
      case 'sports':
        return '/storage/v1/object/public/center-images/placeholders/sports-placeholder.jpg';
      default:
        return '/storage/v1/object/public/center-images/placeholders/default-center.jpg';
    }
  };
  
  // Default placeholder image from Supabase storage
  const defaultPlaceholder = `${SUPABASE_URL}/storage/v1/object/public/center-images/placeholders/default-center.jpg`;
  
  // Get the image URL with fallback hierarchy
  const getImageUrl = () => {
    // If we already had an error loading the image, use Supabase placeholders
    if (imageError) {
      const categoryPlaceholder = getCategoryPlaceholder();
      return categoryPlaceholder ? `${SUPABASE_URL}${categoryPlaceholder}` : defaultPlaceholder;
    }
    
    try {
      // Try the thumbnail first, then regular image, then fallback to placeholder
      const thumbnailUrl = item.thumbnailImage;
      const mainImageUrl = item.image;
      
      // Debug logging for image URLs
      console.log(`[CenterCard] Processing image for center ${item.id}|${item.name}:`, {
        thumbnailUrl,
        mainImageUrl
      });
      
      // For centers with IDs in the format CTR-XXXX, use the helper function
      if (item.id && item.id.startsWith('CTR-')) {
        // Get the direct Supabase thumbnail path using the helper
        const directThumbnailPath = getCenterImageUrl(item.id, 'thumbnail');
        
        console.log(`[CenterCard] Generated thumbnail path for ${item.name}: ${directThumbnailPath}`);
        
        // Prioritize the thumbnailImage if it exists
        if (thumbnailUrl && thumbnailUrl.trim() !== '') {
          console.log(`[CenterCard] Using provided thumbnailImage for ${item.name}: ${thumbnailUrl}`);
          
          // Make sure Supabase URLs are properly formatted
          if (thumbnailUrl.includes('/storage/v1/object/public/') && !thumbnailUrl.includes('http')) {
            return `${SUPABASE_URL}${thumbnailUrl}`;
          }
          return thumbnailUrl;
        } 
        // Then try main image
        else if (mainImageUrl && mainImageUrl.trim() !== '') {
          console.log(`[CenterCard] Using main image for ${item.name}: ${mainImageUrl}`);
          
          // Make sure Supabase URLs are properly formatted
          if (mainImageUrl.includes('/storage/v1/object/public/') && !mainImageUrl.includes('http')) {
            return `${SUPABASE_URL}${mainImageUrl}`;
          }
          return mainImageUrl;
        } 
        // Finally use the generated thumbnail path
        else {
          console.log(`[CenterCard] Using generated thumbnail path for ${item.name}: ${directThumbnailPath}`);
          return directThumbnailPath;
        }
      }
      
      // For centers without the CTR- format, follow the same hierarchy
      if (thumbnailUrl && thumbnailUrl.trim() !== '') {
        // Make sure Supabase URLs are properly formatted
        if (thumbnailUrl.includes('/storage/v1/object/public/') && !thumbnailUrl.includes('http')) {
          return `${SUPABASE_URL}${thumbnailUrl}`;
        }
        return thumbnailUrl;
      } else if (mainImageUrl && mainImageUrl.trim() !== '') {
        // Make sure Supabase URLs are properly formatted
        if (mainImageUrl.includes('/storage/v1/object/public/') && !mainImageUrl.includes('http')) {
          return `${SUPABASE_URL}${mainImageUrl}`;
        }
        return mainImageUrl;
      } else {
        // Use category-specific placeholder as last resort
        const categoryPlaceholder = getCategoryPlaceholder();
        const fallbackUrl = categoryPlaceholder ? 
          `${SUPABASE_URL}${categoryPlaceholder}` : defaultPlaceholder;
        console.log(`[CenterCard] Using fallback image for ${item.name}: ${fallbackUrl}`);
        return fallbackUrl;
      }
    } catch (error) {
      console.error(`[CenterCard] Error in getImageUrl for ${item.name}:`, error);
      const categoryPlaceholder = getCategoryPlaceholder();
      return categoryPlaceholder ? `${SUPABASE_URL}${categoryPlaceholder}` : defaultPlaceholder;
    }
  };

  // Log when component renders
  console.log(`[CenterCard] Rendering center ${item.name} with image URL:`, imageURL);

  // Get category color - now takes a category name as optional parameter
  const getCategoryColor = (categoryNameParam?: string) => {
    // If we have category info from async loading, use that
    if (categoryInfo?.color) {
      return categoryInfo.color;
    }
    
    if (!item.category && !categoryNameParam) return '#118347'; // Default green color
    
    if (typeof item.category === 'object' && item.category.color) {
      return item.category.color;
    }
    
    // Map common categories to specific colors
    const categoryName = categoryNameParam || (
      typeof item.category === 'object' 
        ? item.category.name?.toLowerCase() 
        : typeof item.category === 'string'
          ? item.category.toLowerCase()
          : ''
    );
    
    switch (categoryName.toLowerCase()) {
      case 'yoga': return '#118347'; // Green
      case 'gym': return '#FF6B00'; // Orange
      case 'swimming': return '#0080FF'; // Blue
      case 'sports': return '#E63946'; // Red
      case 'cricket': return '#2E8B57'; // Sea Green
      case 'badminton': return '#8A2BE2'; // Blue Violet  
      case 'pickle ball': return '#FF8C00'; // Dark Orange
      case 'zumba': return '#FF69B4'; // Hot Pink
      case 'martial arts': return '#6A0DAD'; // Purple
      case 'dance': return '#FF69B4'; // Pink
      default: return '#118347'; // Default green
    }
  };

  // Get the category name to display
  const getCategoryName = (): string => {
    // If we have category info from async loading, use that
    if (categoryInfo?.name) {
      return categoryInfo.name;
    }
    
    // Otherwise fall back to the original logic
    if (typeof item.category === 'object' && item.category.name) {
      return item.category.name;
    }
    
    if (typeof item.category === 'string') {
      return item.category;
    }
    
    return '';
  };

  return (
    <TouchableOpacity
      style={styles.centerCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {imageLoading && <ImageSkeleton />}
        {imageURL && (
          <Image
            source={{ uri: imageURL }}
            style={[
              styles.featuredImage,
              imageLoading && { opacity: 0 }
            ]}
            onLoadStart={() => {
              console.log(`[CenterCard] Started loading image for ${item.name}:`, imageURL);
              setImageLoading(true);
              setImageError(false);
            }}
            onLoadEnd={() => {
              console.log(`[CenterCard] Finished loading image for ${item.name}`);
              setImageLoading(false);
            }}
            onError={(error) => {
              console.log(`[CenterCard] Image failed to load for center ${item.id}: ${item.name}`);
              console.log(`[CenterCard] Failed URL:`, imageURL);
              console.log(`[CenterCard] Error details:`, error.nativeEvent);
              setImageError(true);
              setImageLoading(false);
              
              // Try with a placeholder instead
              const categoryPlaceholder = getCategoryPlaceholder();
              const placeholderUrl = categoryPlaceholder ? 
                `${SUPABASE_URL}${categoryPlaceholder}` : defaultPlaceholder;
              
              // Only update if not already using the placeholder
              if (imageURL !== placeholderUrl) {
                setImageURL(placeholderUrl);
              }
            }}
          />
        )}
        {getCategoryName() && (
          <View style={[styles.categoryBadge, { backgroundColor: categoryInfo?.color || getCategoryColor() }]}>
            <Text style={styles.categoryBadgeText}>
              {getCategoryName()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.featuredContent}>
        <View style={styles.nameDistanceContainer}>
          <Text style={styles.featuredName}>{item.name}</Text>
          {renderDistance()}
        </View>
        
        <View style={styles.locationPriceContainer}>
          <View style={styles.featuredLocation}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.featuredLocationText}>
              {extractStreetAndLocality(item.location)}
            </Text>
          </View>
          <Text style={styles.featuredPriceText}>{item.price}</Text>
        </View>
        {/* Add Category Chip */}
        {getCategoryName() && (
          <View style={styles.categoryChipContainer}>
            <View style={[styles.categoryChip, { backgroundColor: categoryInfo?.color || getCategoryColor() }]}>
              <Ionicons 
                name={getCategoryIcon(getCategoryName())} 
                size={12} 
                color="#fff" 
                style={styles.categoryChipIcon} 
              />
              <Text style={styles.categoryChipText}>{getCategoryName()}</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// Add this new component before the HomeScreen component
const EndOfListMessage = () => (
  <View style={styles.endOfListContainer}>
    <Ionicons name="location-outline" size={40} color="#CCCCCC" />
    <Text style={styles.endOfListText}>You've explored all centers in this area</Text>
    <Text style={styles.endOfListSubtext}>
      Try searching in a different location or check back later for new centers
    </Text>
  </View>
);

function HomeScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isGuestMode, user } = useAuth();
  const { walletBalance, isLoading: isWalletLoading, refreshWalletBalance } = useWallet();
  const { user: authUser } = useContext(AuthContext);
  
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>({
    name: 'Loading location...',
  });
  
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Center[]>([]);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationSearchVisible, setLocationSearchVisible] = useState(false);
  
  // State for data
  const [centers, setCenters] = useState<Center[]>([]);
  const [allCenters, setAllCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{latitude: number, longitude: number} | null>(null);
  
  // User data with actual profile information
  const [userData, setUserData] = useState<{name: string}>({
    name: 'User'
  });
  
  // Additional state for UI enhancements
  const [refreshing, setRefreshing] = useState(false);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  
  // Add state for category filtering
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Add state to track if we're forcing wallet display
  const [forceWalletDisplay, setForceWalletDisplay] = useState(false);
  
  // Add state to track if wallet refresh has been attempted
  const [hasAttemptedWalletRefresh, setHasAttemptedWalletRefresh] = useState(false);
  
  // Add state for dynamic categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<Category[]>([]);
  
  // Remove all workout and fitness tracker related state variables
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  
  // Add this inside the component, near the beginning where other state variables are defined
  const [locationRetries, setLocationRetries] = useState(0);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Add state for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const CENTERS_PER_PAGE = 10;
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [lastVisibleCenter, setLastVisibleCenter] = useState<any>(null);
  const [hasMoreCenters, setHasMoreCenters] = useState(true);
  const ITEMS_PER_PAGE = 10;
  
  // Add state for filtered centers
  const [filteredCenters, setFilteredCenters] = useState<Center[]>([]);
  
  // Add state for sign in overlay
  
  // Add state for location permission overlay
  const [showLocationPermissionOverlay, setShowLocationPermissionOverlay] = useState(false);
  
  // Add useFocusEffect to refresh user data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // This function runs when the screen comes into focus
      console.log("[HomeScreen] Screen focused - refreshing user data");
      
      const refreshUserData = async () => {
        try {
          // Try to get the user from auth context first
          if (user && user.id) {
            console.log("[HomeScreen] Refreshing user data from Auth Context for ID:", user.id);
            
            // If the auth context has user data, use it directly
            if (user.display_name) {
              console.log("[HomeScreen] Using display_name from Auth Context:", user.display_name);
              setUserData({ name: user.display_name });
            } else {
              // If no display_name in context, fetch the profile directly
              console.log("[HomeScreen] No display_name in Auth Context, fetching profile directly");
              const authProfile = await getUserProfileService(user.id);
              
              if (authProfile) {
                console.log("[HomeScreen] Fetched user profile successfully");
                // Use the globally defined processUserProfile function
                processUserProfile(authProfile);
              } else {
                console.log("[HomeScreen] Failed to fetch user profile, checking phone as fallback");
                
                // Try to get user by phone number as a fallback
                const storedPhone = await AsyncStorage.getItem('user_phone');
                if (storedPhone) {
                  console.log("[HomeScreen] Found phone in AsyncStorage:", storedPhone);
                  const profileByPhone = await getUserByPhoneNumber(storedPhone);
                  
                  if (profileByPhone) {
                    console.log("[HomeScreen] Found user by phone number!");
                    processUserProfile(profileByPhone);
                    return;
                  }
                }
                
                // Last resort: use phone from user object if available
                if (user.phone_number) {
                  processUserProfile({ phone_number: user.phone_number });
                }
              }
            }
          } else {
            console.log("[HomeScreen] No user in Auth Context");
          }
        } catch (error) {
          console.error("[HomeScreen] Error refreshing user data on focus:", error);
        }
      };
      
      refreshUserData();
      
      return () => {
        // This runs when the screen loses focus (cleanup)
      };
    }, [user])  // Re-run if user changes
  );

  // Fetch user profile for welcome message with improved handling
  useEffect(() => {
    // Define the processUserProfile function here to fix the reference error
    const processUserProfile = (profile: any) => {
      let userName = 'User';
      
      // Debug: Log the exact profile data we received
      console.log(`[HomeScreen] Received profile data:`, JSON.stringify(profile, null, 2));
      
      // First priority: display_name field from Supabase
      if (profile.display_name && profile.display_name.trim()) {
        userName = profile.display_name.trim();
        console.log("[HomeScreen] Using display_name from Supabase:", userName);
      } 
      // Second priority: displayName field (camel case)
      else if (profile.displayName && profile.displayName.trim()) {
        userName = profile.displayName.trim();
        console.log("[HomeScreen] Using displayName (camel case):", userName);
      } 
      // Third priority: username field
      else if (profile.username && profile.username.trim()) {
        userName = profile.username.trim();
        console.log("[HomeScreen] Using username:", userName);
      } 
      // Last resort: phone number
      else if (profile.phone_number || profile.phoneNumber) {
        // Try both formats of phone number field
        const phoneNumber = profile.phone_number || profile.phoneNumber;
        const lastDigits = phoneNumber.slice(-4);
        userName = `User ${lastDigits}`;
        console.log("[HomeScreen] Using phone fallback:", userName);
      }
      
      console.log("[HomeScreen] Final username to display:", userName);
      setUserData({ name: userName });
    };

    const fetchUserProfile = async () => {
      try {
        // Try multiple ways to get user data
        // 1. Try from auth context first (most reliable)
        if (user && user.id) {
          console.log("[HomeScreen] Getting user from Auth Context:", user.id);
          
          // Check for snake_case first (Supabase format), then camelCase (legacy format)
          if (user.display_name) {
            console.log("[HomeScreen] Using display_name from Auth Context:", user.display_name);
            setUserData({ name: user.display_name });
            return;
          }
          
          // If no display_name in context, try to fetch full profile
          const authProfile = await getUserProfileService(user.id);
          if (authProfile) {
            processUserProfile(authProfile);
            return;
          }
        }
        
        // 2. Try from Firebase current user
        //const currentUser = getAuth().currentUser;
        const session = await supabase.auth.getSession();
        const currentUser = session.data.session?.user;
        console.log("[HomeScreen] Current Supabase user:", currentUser?.id);
        
        if (currentUser) {
          console.log("[HomeScreen] Fetching user profile for ID:", currentUser.id);
          const profile = await getUserProfileService(currentUser.id);
          
          console.log("[HomeScreen] Profile data received:", profile ? "yes" : "no");
          
          if (profile) {
            processUserProfile(profile);
            return;
          } else {
            console.log("[HomeScreen] No profile found for current user");
          }
        } else {
          console.log("[HomeScreen] No current user found in Firebase auth");
        }
        
        // 3. Try from AsyncStorage as last resort
        try {
          const storedUser = await AsyncStorage.getItem('currentUser');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            console.log("[HomeScreen] Found user in AsyncStorage:", parsedUser?.id);
            if (parsedUser.id) {
              const profile = await getUserProfileService(parsedUser.id);
              if (profile) {
                processUserProfile(profile);
                return;
              }
            }
          }

          // 4. Try from user_phone in AsyncStorage
          const storedPhone = await AsyncStorage.getItem('user_phone');
          if (storedPhone) {
            console.log("[HomeScreen] Found phone in AsyncStorage, trying to find user:", storedPhone);
            // Use the imported function directly instead of dynamic import
            const profileByPhone = await getUserByPhoneNumber(storedPhone);
            
            if (profileByPhone) {
              console.log("[HomeScreen] Found user by phone number!");
              processUserProfile(profileByPhone);
              return;
            }
          }
        } catch (storageError) {
          console.log("[HomeScreen] Error retrieving user from storage:", storageError);
        }
        
        // If we reach here, we couldn't get a profile
        console.log("[HomeScreen] Using default 'User' fallback after all attempts failed");
      } catch (error) {
        console.error("[HomeScreen] Error fetching user profile:", error);
        // Keep default "User" name in case of error
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // Define the processUserProfile function used in useFocusEffect
  const processUserProfile = (profile: any) => {
    let userName = 'User';
    
    // Debug: Log the exact profile data we received
    console.log(`[HomeScreen] Received profile data:`, JSON.stringify(profile, null, 2));
    
    // First priority: display_name field from Supabase
    if (profile.display_name && profile.display_name.trim()) {
      userName = profile.display_name.trim();
      console.log("[HomeScreen] Using display_name from Supabase:", userName);
    } 
    // Second priority: displayName field (camel case)
    else if (profile.displayName && profile.displayName.trim()) {
      userName = profile.displayName.trim();
      console.log("[HomeScreen] Using displayName (camel case):", userName);
    } 
    // Third priority: username field
    else if (profile.username && profile.username.trim()) {
      userName = profile.username.trim();
      console.log("[HomeScreen] Using username:", userName);
    } 
    // Last resort: phone number
    else if (profile.phone_number || profile.phoneNumber) {
      // Try both formats of phone number field
      const phoneNumber = profile.phone_number || profile.phoneNumber;
      const lastDigits = phoneNumber.slice(-4);
      userName = `User ${lastDigits}`;
      console.log("[HomeScreen] Using phone fallback:", userName);
    }
    
    console.log("[HomeScreen] Final username to display:", userName);
    setUserData({ name: userName });
  };

  // Add a useEffect to check location permission on component mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  // Define the location permission check function
  const checkLocationPermission = async () => {
    try {
      console.log('Checking location permission...');
      
      // First check if we have a stored location
      const storedLocation = await AsyncStorage.getItem('lastSelectedLocation');
      const locationData = storedLocation ? JSON.parse(storedLocation) : null;
      
      // Check if stored location is still valid (less than 30 minutes old)
      const isStoredLocationValid = locationData && 
        (new Date().getTime() - new Date(locationData.timestamp).getTime()) < 30 * 60 * 1000;
      
      if (isStoredLocationValid) {
        console.log('Using stored location:', locationData);
        setSelectedLocation({
          name: locationData.name,
          coordinates: locationData.coordinates,
          city: locationData.city,
          state: locationData.state
        });
        // Load centers with stored location
        loadCenters();
        return;
      }

      // If no valid stored location, check permission
      const { status } = await Location.getForegroundPermissionsAsync();
        
      if (status !== 'granted') {
        console.log(`Location permission not granted: ${status}`);
        // Only show location permission overlay if we don't have a valid stored location
        setShowLocationPermissionOverlay(true);
      } else {
        console.log('Location permission already granted');
        // Get current location and load centers
        const locationObj = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        });
        
        const userLocation = {
          latitude: locationObj.coords.latitude,
          longitude: locationObj.coords.longitude
        };
        
        setUserCoordinates(userLocation);
        
        const locationInfo = await getLocationInfoFromCoordinates(userLocation);
        
        setSelectedLocation({
          name: locationInfo.name,
          coordinates: userLocation,
          city: locationInfo.city,
          state: locationInfo.state
        });
        
        // Save the location for future use
        await AsyncStorage.setItem('lastSelectedLocation', JSON.stringify({
          name: locationInfo.name,
          coordinates: userLocation,
          city: locationInfo.city,
          state: locationInfo.state,
          timestamp: new Date().toISOString()
        }));
        
        // Load centers with the current location
        loadCenters();
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      setLocationError('Failed to check location permission');
      // Still try to load centers even if permission check fails
      loadCenters();
    }
  };

  // Handle location permission result
  const handleLocationPermissionResult = async (granted: boolean) => {
    setShowLocationPermissionOverlay(false);
    
    if (granted) {
      console.log('Location permission granted by user');
      // Reload centers with new permission
      loadCenters();
        } else {
      console.log('Location permission denied by user');
      setLocationError('Location access denied');
      // Update the location header to show we need permission
      setSelectedLocation({
        name: 'Location access needed'
      });
      // Still load centers but without location data
      loadCenters();
    }
  };

  // Update the filterCentersByLocation function to be more lenient
  const filterCentersByLocation = (centers: Center[], city?: string | null, state?: string | null): Center[] => {
    if (!city && !state) {
      console.log('No city or state provided, returning all centers');
      return centers;
    }

    console.log(`Filtering centers for city: ${city}, state: ${state}`);
    console.log(`Total centers before filtering: ${centers.length}`);

    const filteredCenters = centers.filter(center => {
      if (!center.location) {
        console.log(`Center ${center.name} has no location data`);
        return false;
      }

      const centerCity = center.city?.toLowerCase();
      const centerState = center.state?.toLowerCase();
      const searchCity = city?.toLowerCase();
      const searchState = state?.toLowerCase();

      // Log each center's location for debugging
      console.log(`Center: ${center.name}`);
      console.log(`Center City: ${centerCity}, Center State: ${centerState}`);
      console.log(`Search City: ${searchCity}, Search State: ${searchState}`);

      // More lenient matching - match if either city or state matches
      const cityMatch = !searchCity || centerCity?.includes(searchCity);
      const stateMatch = !searchState || centerState?.includes(searchState);

      const matches = cityMatch || stateMatch;
      console.log(`Center ${center.name} matches: ${matches}`);
      return matches;
    });

    console.log(`Total centers after filtering: ${filteredCenters.length}`);
    return filteredCenters;
  };

  // Add a function to load centers from Supabase with fallback to Firebase
  const loadCentersFromSupabase = async (
    refresh: boolean = false,
    isFiltered: boolean = false,
    filterCategoryId?: string | null,
    loadMore: boolean = false
  ) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (!loadMore) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      console.log('Loading centers from Supabase, refresh:', refresh, 'filtered:', isFiltered, 'loadMore:', loadMore);
      
      // Get pagination data
      const pageSize = 10; // Number of items per page
      const lastItem = loadMore && lastVisibleCenter ? lastVisibleCenter : null;
      const categoryToUse = filterCategoryId !== undefined ? filterCategoryId : selectedCategoryId;
      
      // Fetch from Supabase
      console.log('Fetching centers from Supabase...');
      
      // Create a proper LocationObject for Expo's Location API format
      // This ensures distances are calculated properly
      let locationObject: Location.LocationObject | undefined = undefined;
      
      if (userCoordinates && userCoordinates.latitude && userCoordinates.longitude) {
        console.log('Using user coordinates for distance calculation:', userCoordinates);
        // Create a proper LocationObject that matches what the API expects
        locationObject = {
          coords: {
            latitude: userCoordinates.latitude,
            longitude: userCoordinates.longitude,
            // Include nullable fields required by LocationObject type
            altitude: null,
            accuracy: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        };
      }
      
      // Log the location being passed for debugging
      console.log('Location object being sent to fetchSupabaseCenters:', 
        locationObject ? 
          `Lat: ${locationObject.coords.latitude}, Lng: ${locationObject.coords.longitude}` : 
          'No location available'
      );
      
      const response = await supabaseFetchCenters(
        locationObject, 
        pageSize,
        lastItem?.id,
        categoryToUse
      );
      
      console.log(`Fetched ${response.items.length} centers from Supabase`);
      
      // Process the response
      const newCenters = response.items as Center[];
      
      // Log distance info for debugging
      if (newCenters.length > 0) {
        console.log('Distance for first center:', newCenters[0]?.distance);
        console.log('Raw distance for first center:', newCenters[0]?.rawDistance);
        console.log('First center coordinates:', {
          latitude: newCenters[0]?.latitude,
          longitude: newCenters[0]?.longitude
        });
      }
      
      // Update state based on loading mode
      if (loadMore && !refresh) {
        // Add new centers to existing list
        setCenters(prevCenters => [...prevCenters, ...newCenters]);
      } else {
        // Replace centers with new list
        setCenters(newCenters);
      }
      
      // Update pagination data
      setLastVisibleCenter(response.lastVisible);
      setHasMoreCenters(response.hasMore);
      
      // If this was a refresh, also update filteredCenters
      if (categoryToUse) {
        setFilteredCenters(prevFilteredCenters => {
          if (loadMore && !refresh) {
            return [...prevFilteredCenters, ...newCenters];
          } else {
            return newCenters;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching centers from Supabase:', error);
      setError('Failed to load centers. Please try again.');
    } finally {
      // Reset loading states
      if (refresh) {
        setRefreshing(false);
      } else if (!loadMore) {
        setLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // Update the existing loadCenters function to only use Supabase
  const loadCenters = async (
    refresh: boolean = false,
    isFiltered: boolean = false,
    filterCategoryId?: string | null,
    loadMore: boolean = false
  ) => {
    try {
      // Only load from Supabase - no Firebase fallback
      await loadCentersFromSupabase(refresh, isFiltered, filterCategoryId, loadMore);
    } catch (error) {
      console.error('Error loading centers:', error);
      // Handle errors appropriately
      setError('Failed to load centers. Please try again.');
    } finally {
      // Reset loading states
      if (refresh) {
        setRefreshing(false);
      } else if (!loadMore) {
        setLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };
  
  // Function to extract unique categories from centers
  const extractUniqueCategories = async (centers: Center[]) => {
    try {
      console.log('Extracting unique categories from centers...');
      const uniqueCategories = new Set<string>();
      
      // Extract category IDs from centers
      centers.forEach(center => {
        if (center.categoryIds && Array.isArray(center.categoryIds)) {
          center.categoryIds.forEach(id => {
            if (id) uniqueCategories.add(id);
          });
        }
      });
      
      const categoryIds = Array.from(uniqueCategories);
      console.log(`Found ${categoryIds.length} unique category IDs:`, categoryIds);
      
      if (categoryIds.length === 0) {
        console.log('No category IDs found in centers');
        setCategories([]);
        setDynamicCategories([]);
        return;
      }
      
      // Fetch all categories from Supabase
      const allCategories = await supabaseFetchCategories();
      
      if (!allCategories || allCategories.length === 0) {
        console.log('No categories found in Supabase');
        setDefaultCategories();
        return;
      }
      
      // Filter categories to only those used by centers
      const validCategories = allCategories
        .filter((cat: Category) => categoryIds.includes(cat.id))
        .map((cat: Category) => ({
          id: cat.id,
          name: cat.name || 'Unknown Category',
          color: cat.color || '#118347',
          image: cat.image || null
        }));
      
      console.log('Successfully fetched categories:', validCategories);
      
      // Update both category states
      setCategories(validCategories);
      setDynamicCategories(validCategories);
      
    } catch (error) {
      console.error('Error in extractUniqueCategories:', error);
      setDefaultCategories();
    }
  };
  
  // Helper function to set default categories
  const setDefaultCategories = () => {
    const defaultCategories: Category[] = [
      { id: '1', name: 'Gym', color: '#118347' },
      { id: '2', name: 'Yoga', color: '#118347' },
      { id: '3', name: 'Swimming', color: '#118347' },
      { id: '4', name: 'Sports', color: '#118347' }
    ];
    setCategories(defaultCategories);
    setDynamicCategories(defaultCategories);
  };
  
  // Supabase categories fetch function
  const fetchCategories = async (): Promise<Category[]> => {
    try {
      console.log('Fetching categories from Supabase...');
      const categoriesData = await supabaseFetchCategories();
      
      if (!categoriesData || categoriesData.length === 0) {
        console.log('No categories found in Supabase');
        setDefaultCategories();
        return [];
      }
      
      const formattedCategories = categoriesData.map((cat: Category) => ({
        id: cat.id,
        name: cat.name || 'Unknown Category',
        color: cat.color || '#118347',
        image: cat.image || null
      }));
      
      console.log(`Successfully fetched ${formattedCategories.length} categories from Supabase`);
      return formattedCategories;
    } catch (error) {
      console.error('Error fetching categories from Supabase:', error);
      return [];
    }
  };
  
  // Update activity types using Supabase centers
  const updateActivityTypesFromSupabase = () => {
    const activities = new Set<string>();
    centers.forEach(center => {
      if (center.activities && Array.isArray(center.activities)) {
        center.activities.forEach(activity => {
          if (activity) activities.add(activity);
        });
      }
    });
    
    // Convert to sorted array
    setActivityTypes(Array.from(activities).sort());
  };
  
  // Replace old function with new Supabase-only version
  const updateActivityTypesFromFirebase = updateActivityTypesFromSupabase;
  
  // Handle location search
  const handleLocationSearch = () => {
    setLocationSearchVisible(true);
  };

  // Add function to geocode location name
  const geocodeLocationName = async (locationName: string) => {
    try {
      console.log('Geocoding location name:', locationName);
      // Attempt to geocode the location name to get coordinates
      const geocodeResult = await Location.geocodeAsync(locationName);
      
      if (geocodeResult && geocodeResult.length > 0) {
        const { latitude, longitude } = geocodeResult[0];
        console.log(`Geocoded coordinates: lat=${latitude}, lng=${longitude}`);
        
        // Update coordinates and reload centers
        setUserCoordinates({ latitude, longitude });
        
        // Save the geocoded location
        AsyncStorage.setItem('lastSelectedLocation', JSON.stringify({
          name: locationName,
          coordinates: { latitude, longitude },
          timestamp: new Date().toISOString()
        }));
        
        // Reload centers with the new coordinates
        loadCentersForLocation({ latitude, longitude });
      } else {
        console.log('Failed to geocode location name');
        // If geocoding fails, still try to load centers but they won't have accurate distances
        loadCenters();
      }
    } catch (error) {
      console.error('Error geocoding location name:', error);
      // Fall back to loading all centers
      loadCenters();
    }
  };

  // Add function to load centers for a specific location
  const loadCentersForLocation = async (coordinates: { latitude: number; longitude: number }) => {
    try {
      console.log('Loading centers for location:', coordinates);
      setLoading(true);
      setError(null);
      
      // Create a proper LocationObject that matches what the API expects
      const locationObject: Location.LocationObject = {
        coords: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          // Include nullable fields required by LocationObject type
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };
      
      // Use Supabase centers with the location object
      const response = await supabaseFetchCenters(locationObject);
      const fetchedCenters = response.items;
      
      console.log(`Fetched ${fetchedCenters.length} centers with location data`);
      
      // Update the centers state with the new centers that include distance data
      setCenters(fetchedCenters);
      setLastVisibleCenter(response.lastVisible);
      setHasMoreCenters(response.hasMore);
      
      // Update categories based on these centers
      extractUniqueCategories(fetchedCenters);
      
      // Also update activity types
      updateActivityTypesFromSupabase();
      
    } catch (error) {
      console.error('Error loading centers for location:', error);
      setError('Failed to load centers for your location');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    console.log(`[HomeScreen] Category selected: ${categoryId}`);
    
    // If the same category is selected, clear the filter and load all centers
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
      console.log('[HomeScreen] Clearing category filter');
      loadCenters(true); // Reload all centers
    } else {
      // Set the selected category and reload centers with this category filter
      setSelectedCategoryId(categoryId);
      console.log(`[HomeScreen] Loading centers for category: ${categoryId}`);
      loadCenters(true, true, categoryId); // Reload centers with category filter
    }
  };
  
  // Filter centers based on selected category
  const categoryFilteredCenters = useMemo(() => {
    console.log(`[HomeScreen] categoryFilteredCenters running with ${centers.length} centers and selectedCategoryId: ${selectedCategoryId}`);
    
    // Debug: Log all centers and their categories
    if (centers.length > 0 && selectedCategoryId) {
      console.log('[HomeScreen] Available centers and their categories:');
      centers.forEach(center => {
        const catInfo = typeof center.category === 'object' 
          ? `${center.category?.name} (${center.category?.id})` 
          : center.category;
        const catIds = center.categoryIds ? center.categoryIds.join(', ') : 'none';
        console.log(`- ${center.name}: category=${catInfo}, categoryIds=[${catIds}]`);
      });
    }
    
    let result = [...centers];
    
    // Apply category filter if needed
    if (selectedCategoryId) {
      // Find the selected category from dynamic categories
      const selectedCategory = dynamicCategories.find(cat => cat.id === selectedCategoryId);
      
      if (selectedCategory && selectedCategory.name) {
        const categoryName = selectedCategory.name.toLowerCase();
        // Filter centers by category - improved logic with better logging
        console.log(`[HomeScreen] Filtering centers by category: ${categoryName}`);
        console.log(`[HomeScreen] Centers before filtering: ${result.length}`);
        
        result = result.filter(center => {
          // Case 1: If center has category as an object with name property
          if (typeof center.category === 'object' && center.category && center.category.name) {
            const match = center.category.name.toLowerCase() === categoryName;
            if (match) console.log(`[HomeScreen] Matched center by object name: ${center.name}`);
            return match;
          }
          
          // Case 2: If center has category as string
          if (typeof center.category === 'string') {
            const match = center.category.toLowerCase() === categoryName;
            if (match) console.log(`[HomeScreen] Matched center by string category: ${center.name}`);
            return match;
          }
          
          // Case 3: If center has categoryIds array that might match the selected ID
          if (center.categoryIds && center.categoryIds.includes(selectedCategoryId)) {
            console.log(`[HomeScreen] Matched center by categoryIds: ${center.name}`);
            return true;
          }
          
          // Case 4: Check for category_id property (support for legacy data model)
          if ((center as any).category_id === selectedCategoryId) {
            console.log(`[HomeScreen] Matched center by category_id: ${center.name}`);
            return true;
          }
          
          return false;
        });
        
        console.log(`[HomeScreen] Centers after filtering: ${result.length}`);
        
        // If no centers match, log a warning
        if (result.length === 0) {
          console.warn(`[HomeScreen] No centers found for category: ${categoryName}`);
          
          // Log all centers and their categories for debugging
          centers.forEach(center => {
            const catName = typeof center.category === 'object' 
              ? center.category?.name 
              : typeof center.category === 'string' 
                ? center.category 
                : 'unknown';
            console.log(`Center: ${center.name}, Category: ${catName}`);
          });
        }
      }
    }
    
    // Sort by distance (closest first)
    return result.sort((a, b) => {
      return getDistanceValue(a.distance) - getDistanceValue(b.distance);
    });
  }, [centers, selectedCategoryId, dynamicCategories]);
  
  // Empty state component
  const EmptyStateView = ({ message }: { message: string }) => (
    <View style={styles.noCentersContainer}>
      <Ionicons name="business-outline" size={48} color="#ccc" />
      <Text style={styles.noCentersText}>{message}</Text>
      <Text style={styles.noCentersSubtext}>
        {selectedLocation.city && message.includes("No centers available") ? 
          `We are not in ${selectedLocation.city} yet. We're expanding to new locations every month!` :
          "Try searching in a different location or check back later for new centers."}
      </Text>
      <TouchableOpacity 
        style={styles.resetFilterButton}
        onPress={onRefresh}
      >
        <Text style={styles.resetFilterButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  // Replace the useEffect for loading centers with useFocusEffect
  useFocusEffect(
    useCallback(() => {
      const loadInitialData = async () => {
        // Only load if centers array is empty
        if (centers.length === 0) {
          console.log('Centers list is empty, loading data...');
          await loadCenters(true);
        } else {
          console.log('Centers list already loaded, skipping fetch');
        }
      };

      loadInitialData();
    }, []) // Empty dependency array since we check centers.length inside
  );

  // Keep the refresh functionality for manual refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCenters(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Add effect to refresh wallet balance when screen loads
  useEffect(() => {
    // Skip if we've already attempted a refresh
    if (hasAttemptedWalletRefresh) return;
    
    console.log('[HomeScreen] Attempting wallet refresh');
    
    const loadWallet = async () => {
      try {
        setHasAttemptedWalletRefresh(true);
        await refreshWalletBalance();
        console.log('[HomeScreen] Wallet refreshed successfully');
      } catch (error) {
        console.error('[HomeScreen] Error refreshing wallet:', error);
        // Force display on error
        setForceWalletDisplay(true);
      }
    };
    
    loadWallet();
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isWalletLoading) {
        console.log('[HomeScreen] Wallet loading timeout - forcing display');
        setForceWalletDisplay(true);
      }
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [refreshWalletBalance]);

  // Function to handle search input
  const handleSearchInput = (text: string) => {
    setSearchText(text);
    
    if (text.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    // Filter centers based on search text
    const filteredCenters = centers.filter(center => {
      const searchLower = text.toLowerCase();
      // Search by name, location, and activities
      return (
        center.name.toLowerCase().includes(searchLower) ||
        (center.location && center.location.toLowerCase().includes(searchLower)) ||
        (center.category && 
         typeof center.category !== 'string' && 
         center.category.name && 
         center.category.name.toLowerCase().includes(searchLower)) ||
        (center.activities && 
         center.activities.some(activity => 
           activity.toLowerCase().includes(searchLower)
         ))
      );
    });
    
    setSearchResults(filteredCenters);
  };

  // Function to clear search
  const clearSearch = () => {
    setSearchText('');
    setSearchResults([]);
  };

  // Function to handle search item selection
  const handleSearchItemPress = (center: Center) => {
    // Close search modal
    setShowSearch(false);
    clearSearch();
    
    // Navigate to center details with proper params
    navigation.navigate('CenterDetail', { centerId: center.id });
  };

  // Modify the search result rendering to maintain the same loading pattern
  const renderSearchItem = ({ item }: { item: Center }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      onPress={() => handleSearchItemPress(item)}
    >
      <View style={styles.searchItemImageContainer}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.searchItemImage}
          />
        ) : (
          <View style={styles.searchItemPlaceholder}>
            <Ionicons name="fitness-outline" size={24} color="#999" />
          </View>
        )}
      </View>
      <View style={styles.searchItemInfo}>
        <Text style={styles.searchItemName}>{item.name}</Text>
        <Text style={styles.searchItemLocation}>
          {extractStreetAndLocality(item.location)}
        </Text>
        <Text style={styles.searchItemCategory}>
          {typeof item.category === 'object' ? item.category.name : item.category}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Update this function to use the fetchCategories function instead of a separate implementation
  const loadCategories = async () => {
    try {
      console.log('Loading categories...');
      
      // Use the fetchCategories function defined above (Supabase version)
      const categoriesData = await fetchCategories();
      
      if (!categoriesData || categoriesData.length === 0) {
        console.log('No categories found');
        setDefaultCategories();
        return;
      }
      
      console.log(`Successfully fetched ${categoriesData.length} categories`);
      
      // Use the categories data
      setCategories(categoriesData);
      setDynamicCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
      setDefaultCategories();
    }
  };

  // Add useEffect to load categories on mount
  useEffect(() => {
    loadCategories();
  }, []); // Empty dependency array means this runs once on mount

  // Update the handleWalletPress function
  const handleWalletPress = () => {
    if (!isAuthenticated) {
      setLoginOverlayConfig({
        returnScreen: 'ProfileStack' as any,
        returnParams: {
          screen: 'Wallet'
        }
      });
      setShowLoginOverlay(true);
      return;
    }

    // Navigate directly to ProfileStack instead of through Main
    navigation.navigate('ProfileStack' as any, {
      screen: 'Wallet'
    });
  };

  // Update the handleBookingsPress function
  const handleBookingsPress = () => {
    if (!isAuthenticated) {
      setLoginOverlayConfig({
        returnScreen: 'ProfileStack' as any,
        returnParams: {
          screen: 'Bookings'
        }
      });
      setShowLoginOverlay(true);
      return;
    }

    // Navigate directly to ProfileStack instead of through Main
    navigation.navigate('ProfileStack' as any, {
      screen: 'Bookings'
    });
  };

  // Add the sign in handler
  const handleSignIn = async () => {
    try {
      // Use Supabase auth context or navigate to auth screen
      console.log("Navigating to auth screen using Supabase");
      navigation.navigate('PhoneAuth');
    } catch (error) {
      console.error('Error navigating to sign in:', error);
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    }
  };

  const [hasBookings, setHasBookings] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [hasUpcomingBooking, setHasUpcomingBooking] = useState(false);
  const [upcomingBooking, setUpcomingBooking] = useState<{
    id: string;
    date: string;
    timeSlot: string;
    centerName: string;
  } | null>(null);

  const handleBookNowPress = (centerData: Center) => {
    if (isAuthenticated && user) {
      // Navigate to CenterDetail with appropriate types
      navigation.navigate('CenterDetail', {
        centerId: centerData.id,
        distance: centerData.distance,
        userCoordinates: userCoordinates ? {
          latitude: userCoordinates.latitude,
          longitude: userCoordinates.longitude
        } : undefined
      });
    } else {
      // For LoginScreen, which isn't in the type definitions, use type assertion
      // This is a temporary fix until the navigation types are updated
      (navigation as any).navigate('LoginScreen', {
        returnScreen: 'CenterDetail',
        returnParams: {
          centerId: centerData.id,
          distance: centerData.distance,
          userCoordinates: userCoordinates ? {
            latitude: userCoordinates.latitude,
            longitude: userCoordinates.longitude
          } : undefined
        }
      });
    }
  };

  // Add returnScreen and returnParams state variables
  const [returnScreen, setReturnScreen] = useState<string | null>(null);
  const [returnParams, setReturnParams] = useState<any>(null);

  // Remove duplicate handleSignIn function
  
  const handleContinueAsGuest = async () => {
    setLoading(true);
    
    try {
      // Instead of using Firebase anonymous auth, use Supabase anonymous mode
      // Set user mode to guest in AsyncStorage
      await AsyncStorage.setItem('userMode', 'guest');
      
      // Update auth context to recognize guest mode
      // This would be handled by your AuthContext provider
      
      // If there's a return screen, navigate to it
      if (returnScreen) {
        navigation.navigate(returnScreen as keyof RootStackParamList, returnParams);
      } else {
        // Otherwise navigate to Home screen
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          })
        );
      }
    } catch (error) {
      console.error('Error continuing as guest:', error);
      Alert.alert('Error', 'Failed to continue as guest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Replace Firebase fetchUpcomingBooking with Supabase version
  const fetchUpcomingBooking = async () => {
    try {
      if (!isAuthenticated || !user?.id) {
        setHasUpcomingBooking(false);
        setUpcomingBooking(null);
        return;
      }

      // TODO: Implement Supabase version of fetchUpcomingBooking
      console.log('Need to implement fetchUpcomingBooking with Supabase');
      
      /*
      // Placeholder for Supabase implementation
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*, centers(*)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .limit(1);
      
      if (error) {
        console.error('Error fetching upcoming booking from Supabase:', error);
        setHasUpcomingBooking(false);
        setUpcomingBooking(null);
        return;
      }
      
      if (!bookings || bookings.length === 0) {
        setHasUpcomingBooking(false);
        setUpcomingBooking(null);
        return;
      }
      
      const bookingData = bookings[0];
      const centerData = bookingData.centers;
      
      if (!centerData) {
        setHasUpcomingBooking(false);
        setUpcomingBooking(null);
        return;
      }
      
      const booking = {
        id: bookingData.id,
        date: new Date(bookingData.session_date).toLocaleDateString(),
        timeSlot: bookingData.time_slot,
        centerName: centerData.name
      };
      
      setUpcomingBooking(booking);
      setHasUpcomingBooking(true);
      */
      
      // For now, just set no upcoming booking
      setHasUpcomingBooking(false);
      setUpcomingBooking(null);

    } catch (error) {
      console.error('Error fetching upcoming booking:', error);
      setHasUpcomingBooking(false);
      setUpcomingBooking(null);
    }
  };

  // Add useEffect to fetch upcoming booking when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchUpcomingBooking();
    }, [isAuthenticated, user?.id])
  );

  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [loginOverlayConfig, setLoginOverlayConfig] = useState<{
    returnScreen?: keyof RootStackParamList;
    returnParams?: any;
  }>({});

  // Add a state variable for tracking location source
  const [locationSource, setLocationSource] = useState<'precise' | 'manual' | null>(null);

  // Update the useEffect section where lastSelectedLocation is loaded
  useEffect(() => {
    const loadStoredLocation = async () => {
      try {
        const storedLocation = await AsyncStorage.getItem('lastSelectedLocation');
        if (storedLocation) {
          const locationData = JSON.parse(storedLocation);
          if (locationData.source) {
            setLocationSource(locationData.source);
          }
        }
      } catch (error) {
        console.error('Error loading stored location source:', error);
      }
    };
    
    loadStoredLocation();
  }, []);

  // Add the missing getLocationInfoFromCoordinates function
  const getLocationInfoFromCoordinates = async (coordinates: {latitude: number, longitude: number}) => {
    try {
      console.log('Reverse geocoding coordinates:', coordinates);
      const result = await Location.reverseGeocodeAsync({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      });
      
      if (result.length > 0) {
        const locationData = result[0];
        const city = locationData.city || locationData.subregion;
        const state = locationData.region;
        
        // Create a formatted location name
        let name = '';
        if (city) name += city;
        if (state) {
          if (name) name += `, ${state}`;
          else name = state;
        }
        if (!name) name = 'Unknown location';
        
        console.log(`Geocoded location: ${name} (City: ${city}, State: ${state})`);
        
        return {
          name,
          city,
          state
        };
      }
      
      console.log('No results from reverse geocoding');
      return { name: 'Unknown location', city: null, state: null };
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return { name: 'Unknown location', city: null, state: null };
    }
  };

  // Add missing location extraction functions
  const extractCityFromLocation = (location: string): string => {
    if (!location) return '';
    
    // Split location by commas and extract what's likely to be the city
    const parts = location.split(',').map(part => part.trim());
    
    // City is typically the second-to-last part in most address formats
    // "123 Main St, Hyderabad, Telangana" -> "Hyderabad"
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    
    // If there's only one part, return it
    return parts[0] || '';
  };

  const extractStateFromLocation = (location: string): string => {
    if (!location) return '';
    
    // Split location by commas and extract what's likely to be the state
    const parts = location.split(',').map(part => part.trim());
    
    // State is typically the last part in most address formats
    // "123 Main St, Hyderabad, Telangana" -> "Telangana"
    if (parts.length >= 1) {
      return parts[parts.length - 1];
    }
    
    return '';
  };

  // Fix the sort function syntax
  const centersWithDistance = [...centers]; // Create a copy of centers to sort
  centersWithDistance.sort((a, b) => {
    const distA = getDistanceValue(a.distance);
    const distB = getDistanceValue(b.distance);
    return distA - distB;
  });

  // Add loadMoreCenters function
  const loadMoreCenters = async () => {
    if (isLoadingMore || !hasMoreCenters || loading) {
      return;
    }
    
    setIsLoadingMore(true);
    await loadCenters(false);
  };

  // Add handleLocationSelected function
  const handleLocationSelected = async (locationName: string, coordinates?: { latitude: number; longitude: number }) => {
    try {
      console.log(`Location selected: ${locationName}`, coordinates);
      setLoading(true);
      
      // Update the selected location immediately for UI feedback
      setSelectedLocation({
        name: locationName,
        coordinates: coordinates
      });
      
      // Close the location search modal
      setLocationSearchVisible(false);
      
      let locationCoords = coordinates;
      let locationInfo = { name: locationName, city: '', state: '' };
      
      // If coordinates are not provided, geocode the location name
      if (!coordinates) {
        try {
          const geocodeResult = await Location.geocodeAsync(locationName);
          if (geocodeResult && geocodeResult.length > 0) {
            locationCoords = {
              latitude: geocodeResult[0].latitude,
              longitude: geocodeResult[0].longitude
            };
          }
        } catch (error) {
          console.error('Error geocoding location name:', error);
        }
      }
      
      if (locationCoords) {
        // Get city and state information
        try {
          const geocodeResponse = await Location.reverseGeocodeAsync({
            latitude: locationCoords.latitude,
            longitude: locationCoords.longitude
          });
          
          if (geocodeResponse && geocodeResponse.length > 0) {
            const address = geocodeResponse[0];
            locationInfo = {
              name: locationName,
              city: address.city || address.subregion || '',
              state: address.region || ''
            };
          }
        } catch (error) {
          console.error('Error reverse geocoding coordinates:', error);
        }
        
        // Update user coordinates
        setUserCoordinates(locationCoords);
        
        // Update selected location with full information
        const newSelectedLocation = {
          name: locationName,
          coordinates: locationCoords,
          city: locationInfo.city,
          state: locationInfo.state
        };
        
        // Update location source
        setLocationSource('manual');
        
        setSelectedLocation(newSelectedLocation);
        
        // Save location to AsyncStorage
        await AsyncStorage.setItem('lastSelectedLocation', JSON.stringify({
          ...newSelectedLocation,
          source: 'manual',
          timestamp: new Date().toISOString()
        }));
        
        // Load centers with the new location
        await loadCenters(true);
      }
    } catch (error) {
      console.error('Error handling location selection:', error);
      Alert.alert(
        'Location Error',
        'Unable to set location. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Update the handleCenterPress function to pass distance and userCoordinates
  const handleCenterPress = (center: Center) => {
    // Navigate to center details screen with proper parameters
    navigation.navigate('CenterDetail', {
      centerId: center.id,
      distance: center.distance,
      userCoordinates: userCoordinates ? {
        latitude: userCoordinates.latitude,
        longitude: userCoordinates.longitude
      } : undefined
    });
  };

  // Update the initialization effect to handle failures gracefully
  useEffect(() => {
    const initializeHomeScreen = async () => {
      try {
        console.log('Initializing HomeScreen...');
        
        // Check for location permission and load centers
        await checkLocationPermission();
        
        // Load categories in parallel
        const categoriesPromise = fetchCategories();
        
        // Load user wallet balance if authenticated
        if (isAuthenticated && user?.id) {
          refreshWalletBalance();
        }
        
        // Wait for categories to load
        const fetchedCategories = await categoriesPromise;
        if (fetchedCategories.length > 0) {
          setCategories(fetchedCategories);
          setDynamicCategories(fetchedCategories);
        }
        
        // Ensure we're not stuck in loading state
        setTimeout(() => {
          setLoading(false);
          setIsLocationLoading(false);
        }, 5000); // Set a maximum loading time of 5 seconds
      } catch (error) {
        console.error('Error initializing HomeScreen:', error);
        
        // Fall back to showing some data even on error
        setLoading(false);
        setIsLocationLoading(false);
        
        // Try to load centers anyway
        try {
          loadCenters();
        } catch (fallbackError) {
          console.error('Error in fallback loading:', fallbackError);
        }
      }
    };
    
    initializeHomeScreen();
    
    // Cleanup function
    return () => {
      console.log('HomeScreen unmounting...');
    };
  }, [isAuthenticated, user?.id]);

  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [welcomeUserId, setWelcomeUserId] = useState<string | null>(null);

  // Check for route params with overlay instructions
  useEffect(() => {
    console.log('[HomeScreen] Checking route params:', JSON.stringify(route.params, null, 2));
    if (route.params) {
      console.log('[HomeScreen] Route params received:', JSON.stringify(route.params, null, 2));
      const { showWelcomeOverlay: showWelcome, isFirstTimeUser: isFirst, userId: uid } = route.params as any;
      
      console.log('[HomeScreen] Extracted welcome params:', { showWelcome, isFirst, uid });
      
      if (showWelcome) {
        console.log('[HomeScreen] Showing welcome overlay with params:', { isFirst, uid });
        setShowWelcomeOverlay(true);
        setIsFirstTimeUser(isFirst || false);
        setWelcomeUserId(uid || user?.id || null);
      }
    }
  }, [route.params, user?.id]);

  // Additional check for new users based on auth context
  useEffect(() => {
    const checkNewUser = async () => {
      try {
        console.log('[HomeScreen] Running checkNewUser with user:', user ? user.id : 'null', 'is_first_time_user:', user?.is_first_time_user);
        
        // If we have a user, and the welcome overlay isn't already showing from route params
        if (user && !showWelcomeOverlay) {
          // Always show welcome overlay for admin user
          if (user.phone_number === ADMIN_PHONE_NUMBER) {
            console.log('[HomeScreen] Admin user detected, showing welcome overlay');
            setShowWelcomeOverlay(true);
            setIsFirstTimeUser(false);
            return;
          }
          
          // Check if we've already shown the welcome message
          const isFirstTimeFlag = await AsyncStorage.getItem(`user_${user.id}_first_time`);
          
          // If this is the first app open for this user
          if ((isFirstTimeFlag === null || isFirstTimeFlag === 'true') && user.is_first_time_user) {
            console.log('[HomeScreen] First time user detected, showing welcome overlay');
            setShowWelcomeOverlay(true);
            setIsFirstTimeUser(true);
            
            // Mark this user as having seen the welcome overlay
            await AsyncStorage.setItem(`user_${user.id}_first_time`, 'false');
            console.log(`[HomeScreen] Marked user ${user.id} as no longer first time`);
          } else {
            console.log(`[HomeScreen] Not showing welcome overlay. isFirstTimeFlag=${isFirstTimeFlag}, user.is_first_time_user=${user.is_first_time_user}`);
          }
        }
      } catch (error) {
        console.error('[HomeScreen] Error in checkNewUser:', error);
      }
    };
    
    checkNewUser();
  }, [user, showWelcomeOverlay]);

  // Calculate header height for content positioning
  const headerHeight = useMemo(() => {
    // Base header height (10px bottom padding + ~40px content) + status bar height
    return 50 + insets.top;
  }, [insets.top]);

  // Update the welcome section to remove all shadow animation effects
  const renderWelcomeSection = () => {
    return (
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.welcomeText}>
              G'day, <Text style={{ color: '#118347' }}>{isGuestMode ? 'Guest' : userData.name}</Text> 👋
            </Text>
            <Text style={styles.welcomeSubtext}>
              Find your perfect workout spot!
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.searchIconButton}
            onPress={() => setShowSearch(true)}
          >
            <Ionicons name="search" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Make sure to create a handleRefresh function if it doesn't exist
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCenters(true);
    setRefreshing(false);
  }, []);

  // Fix handleOpenWallet function to use correct navigation
  const handleOpenWallet = () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setLoginOverlayConfig({
        returnScreen: 'ProfileStack' as any,
        returnParams: {
          screen: 'Wallet'
        }
      });
      setShowLoginOverlay(true);
      return;
    }

    // Use type assertion to bypass the type checking
    navigation.navigate('Main' as any, {
      screen: 'ProfileStack' as any,
      params: {
        screen: 'Wallet'
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom }]} edges={['right', 'left']}>
      <StatusBar 
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      
      {/* Welcome Overlay */}
      <WelcomeOverlay 
        visible={showWelcomeOverlay}
        isFirstTimeUser={isFirstTimeUser}
        userId={welcomeUserId || ""}
        onClose={() => {
          console.log('[HomeScreen] Closing welcome overlay');
          setShowWelcomeOverlay(false);
        }}
      />
      
      {/* Location Search Screen */}
      {locationSearchVisible && (
        <View style={StyleSheet.absoluteFill}>
          <LocationSearchScreen
            onLocationSelect={handleLocationSelected}
            onClose={() => setLocationSearchVisible(false)}
          />
        </View>
      )}
      
      {/* Location Permission Overlay */}
      {showLocationPermissionOverlay && (
        <View style={StyleSheet.absoluteFill}>
          <LocationPermissionModal
            visible={true}
            onAllowLocation={() => handleLocationPermissionResult(true)}
            onManualLocation={() => handleLocationPermissionResult(false)}
          />
        </View>
      )}
      
      {/* Header with shadow wrapper - extend to top of screen */}
      <View style={styles.headerShadowWrapper}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <LocationHeader 
            location={selectedLocation.name}
            onPress={() => setLocationSearchVisible(true)}
            isLoading={isLocationLoading}
          />
          
          <TouchableOpacity 
            style={styles.walletButton}
            onPress={handleOpenWallet}
          >
            <View style={styles.walletContainer}>
              <Ionicons name="wallet-outline" size={20} color="#118347" />
              <Text style={styles.walletText}>₹{walletBalance}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Main Content */}
      {loading ? (
        <View style={[styles.loadingContainer, { paddingTop: headerHeight + 70 }]}>
          <ActivityIndicator size="large" color="#118347" />
        </View>
      ) : (
        <FlatList
          data={categoryFilteredCenters}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <CenterCard
              item={item}
              onPress={() => handleCenterPress(item)}
              userCoordinates={userCoordinates || undefined}
            />
          )}
          contentContainerStyle={[styles.centersList, { paddingTop: headerHeight + 4 }]} // Adjusted paddingTop
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          scrollEventThrottle={16}
          ListHeaderComponent={() => (
            <>
              {/* Welcome section at the top of the list content */}
              {renderWelcomeSection()}
              
              {/* Categories Display - Grid Style */}
              <View style={styles.categoriesContainer}>
                <View style={styles.categoriesGrid}>
                  {/* Categories rows */}
                  <View style={styles.categoryRow}>
                    {/* All Categories option */}
                    <TouchableOpacity 
                      style={[styles.categoryGridItem, !selectedCategoryId && styles.selectedCategoryItem]}
                      onPress={() => setSelectedCategoryId(null)}
                    >
                      <View style={[
                        styles.categoryIconContainer, 
                        !selectedCategoryId && styles.selectedCategoryIconContainer
                      ]}>
                        <Ionicons 
                          name="apps-outline" 
                          size={24} 
                          color={!selectedCategoryId ? "#fff" : "#118347"} 
                        />
                      </View>
                      <Text style={[
                        styles.categoryItemText, 
                        !selectedCategoryId && styles.selectedCategoryText
                      ]}>
                        All
                      </Text>
                    </TouchableOpacity>
                    
                    {/* First 3 categories */}
                    {dynamicCategories.slice(0, 3).map((category) => (
                      <TouchableOpacity 
                        key={category.id}
                        style={[styles.categoryGridItem, selectedCategoryId === category.id && styles.selectedCategoryItem]}
                        onPress={() => handleCategoryChange(category.id)}
                      >
                        <View style={[
                          styles.categoryIconContainer, 
                          selectedCategoryId === category.id && styles.selectedCategoryIconContainer
                        ]}>
                          <Ionicons 
                            name={getCategoryIcon(category.name || '')} 
                            size={24} 
                            color={selectedCategoryId === category.id ? "#fff" : "#118347"} 
                          />
                        </View>
                        <Text style={[
                          styles.categoryItemText, 
                          selectedCategoryId === category.id && styles.selectedCategoryText
                        ]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Second row with the next 4 categories */}
                  <View style={styles.categoryRow}>
                    {dynamicCategories.slice(3, 7).map((category) => (
                      <TouchableOpacity 
                        key={category.id}
                        style={[styles.categoryGridItem, selectedCategoryId === category.id && styles.selectedCategoryItem]}
                        onPress={() => handleCategoryChange(category.id)}
                      >
                        <View style={[
                          styles.categoryIconContainer, 
                          selectedCategoryId === category.id && styles.selectedCategoryIconContainer
                        ]}>
                          <Ionicons 
                            name={getCategoryIcon(category.name || '')} 
                            size={24} 
                            color={selectedCategoryId === category.id ? "#fff" : "#118347"} 
                          />
                        </View>
                        <Text style={[
                          styles.categoryItemText, 
                          selectedCategoryId === category.id && styles.selectedCategoryText
                        ]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Nearby Centers Section Header */}
              <View style={styles.sectionHeaderContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {selectedCategoryId 
                      ? `${(dynamicCategories.find(c => c.id === selectedCategoryId) || {}).name || 'Filtered'} Centers` 
                      : selectedLocation.city 
                        ? `Centers in ${selectedLocation.city}` 
                        : 'Nearby Centers'}
                  </Text>
                  
                  {/* Add clear filter button when category is selected */}
                  {selectedCategoryId && (
                    <TouchableOpacity 
                      style={styles.clearFilterButton}
                      onPress={() => setSelectedCategoryId(null)}
                    >
                      <Text style={styles.clearFilterText}>Clear Filter</Text>
                      <Ionicons name="close-circle" size={16} color="#118347" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}
          ListEmptyComponent={() => (
            <EmptyStateView message={selectedCategoryId 
              ? `No ${(dynamicCategories.find(c => c.id === selectedCategoryId) || {}).name || 'such'} centers in this area.` 
              : "No centers available in this location."} 
            />
          )}
          onEndReached={loadMoreCenters}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#118347"
            />
          }
          ListFooterComponent={() => (
            <>
              {isLoadingMore && (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#118347" />
                </View>
              )}
              {!isLoadingMore && !hasMoreCenters && categoryFilteredCenters.length > 0 && (
                <EndOfListMessage />
              )}
            </>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Search Modal */}
      <Modal
        visible={showSearch}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowSearch(false)}
      >
        <View style={styles.searchModalContainer}>
          <StatusBar 
            barStyle="dark-content"
            backgroundColor="transparent"
            translucent={true}
          />
          <View style={styles.searchModalHeader}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={handleSearchInput}
                placeholder="Search for fitness centers..."
                placeholderTextColor="#999"
                autoFocus={true}
                clearButtonMode="while-editing"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.searchCloseButton}
              onPress={() => {
                setShowSearch(false);
                clearSearch();
              }}
            >
              <Text style={styles.searchCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Search Results */}
          <View style={styles.searchResultsContainer}>
            {searchText.trim() !== '' ? (
              searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  renderItem={renderSearchItem}
                  keyExtractor={(item, index) => `search-${item.id}-${index}`}
                  contentContainerStyle={styles.searchResultsList}
                />
              ) : (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={48} color="#CCCCCC" />
                  <Text style={styles.noResultsText}>No centers found</Text>
                  <Text style={styles.noResultsSubtext}>
                    Try a different search term or category
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.emptySearchContainer}>
                <Ionicons name="search-outline" size={48} color="#EEEEEE" />
                <Text style={styles.emptySearchText}>Search for fitness centers</Text>
                <Text style={styles.emptySearchSubtext}>
                  Type in the name, location, or activity
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add LoginOverlay */}
      <LoginOverlay
        visible={showLoginOverlay}
        onClose={() => setShowLoginOverlay(false)}
        returnScreen={loginOverlayConfig.returnScreen}
        returnParams={loginOverlayConfig.returnParams}
      />
    </SafeAreaView>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  headerShadowWrapper: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'white',
  },
  walletButton: {
    marginLeft: 8,
  },
  walletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  walletText: {
    marginLeft: 4,
    color: '#118347',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 0,
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#f7f7f7',
    marginTop: 8,   // Changed from 12px to 8px
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  locationTextContainer: {
    marginLeft: 6,
    marginRight: 4,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  locationSecondaryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  seeAllText: {
    color: '#118347',
    fontSize: 14,
    fontWeight: '600',
  },
  centersContainer: {
    paddingTop: 12,
  },
  centersList: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Increased padding for iOS to fix grey area
    paddingHorizontal: 12,
  },
  centerCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '100%', // Ensure full width within the container
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  skeletonImageContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  skeletonImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#E1E9EE',
  },
  skeletonShimmer: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    backgroundColor: '#F0F3F5',
    opacity: 0.5,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  featuredContent: {
    padding: 12,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featuredName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  featuredLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredLocationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: 'normal',
  },
  featuredDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    minWidth: 60,
    justifyContent: 'flex-end',
  },
  featuredDistanceText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'normal',
    marginLeft: 4,
  },
  featuredPrice: {
    marginTop: 4,
  },
  featuredPriceText: {
    fontSize: 14,
    color: '#118347',
    fontWeight: '600',
  },
  loader: {
    marginVertical: 20,
  },
  noCentersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    height: 200,
  },
  noCentersText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noCentersSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  resetFilterButton: {
    marginTop: 16,
    paddingVertical: 8, 
    paddingHorizontal: 16,
    backgroundColor: '#118347',
    borderRadius: 20,
  },
  resetFilterButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(17, 131, 71, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  categoriesContainer: {
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 8,  // Reduced from 14 to 8
  },
  categoriesGrid: {
    marginTop: 8,
    marginBottom: 8,
    width: '100%',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'center', // Center the items in the row
    marginBottom: 16,
  },
  categoryGridItem: {
    alignItems: 'center',
    width: '25%', // Use percentage instead of calculated width
    paddingHorizontal: 5, // Add some spacing between items
  },
  selectedCategoryItem: {
    opacity: 1,
  },
  categoryIconContainer: {
    width: 60, // Original size
    height: 60, // Original size
    borderRadius: 30, // Original size
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8f5ee',
    marginBottom: 8,
  },
  selectedCategoryIconContainer: {
    backgroundColor: '#118347',
  },
  categoryItemText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#118347',
    fontWeight: '500',
  },
  locationPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  nameDistanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  // Search Modal Styles
  searchModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Increased padding for status bar
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  searchCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  searchCloseButtonText: {
    fontSize: 16,
    color: '#118347',
    fontWeight: '500',
  },
  searchResultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchResultsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchItemImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    marginRight: 16,
  },
  searchItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  searchItemPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  searchItemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  searchItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  searchItemLocation: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 2,
  },
  searchItemCategory: {
    fontSize: 12,
    color: '#118347',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333333',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  upcomingBookingWrapper: {
    marginBottom: 16,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  welcomeModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  welcomeModalHeaderGradient: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  welcomeModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeModalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#118347',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeModalHeaderIconText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  welcomeModalHeaderText: {
    flex: 1,
    marginLeft: 10,
  },
  welcomeModalTitle: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  welcomeModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  welcomeModalContent: {
    marginTop: 20,
  },
  welcomeModalDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  welcomeFeatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  welcomeFeatureItem: {
    flex: 1,
    alignItems: 'center',
  },
  welcomeFeatureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#118347',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  welcomeFeatureTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  welcomeFeatureDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  welcomeModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  welcomeModalCloseButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#118347',
    borderRadius: 20,
  },
  welcomeModalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeModalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A5D31',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  welcomeModalActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 5,
  },
  welcomeModalActionIcon: {
    marginLeft: 5,
  },
  welcomeFeatureContent: {
    flex: 1,
    marginLeft: 12,
  },
  endOfListContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
    marginTop: 8,
    borderRadius: 12,
  },
  endOfListText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  endOfListSubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  nameText: {
    color: '#118347',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  sectionHeaderContainer: {
    paddingHorizontal: 12, // Reduce from 16px to 12px
    marginBottom: 12,
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptySearchText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333333',
    marginTop: 16,
  },
  emptySearchSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  categoryChipContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryChipIcon: {
    marginRight: 4,
  },
  categoryChipText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  clearFilterText: {
    fontSize: 12,
    color: '#118347',
    marginRight: 4,
  },
});


