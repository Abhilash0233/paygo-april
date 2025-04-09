import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  FlatList,
  Dimensions,
  Modal,
  Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Google Places API Key
const GOOGLE_PLACES_API_KEY = 'AIzaSyAMwlL4g68Fl70jzZS8rDbHmLnI-7wN_ec';

interface LocationItem {
  id: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

interface GooglePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface LocationSearchScreenProps {
  onLocationSelect: (location: string, coordinates?: { latitude: number; longitude: number }) => void;
  onClose: () => void;
}

// Define our fixed cities
const CITY_OPTIONS: LocationItem[] = [
  { id: 'hyderabad', mainText: 'Hyderabad', secondaryText: 'Telangana', fullText: 'Hyderabad, Telangana' },
];

// Get window dimensions
const { width, height } = Dimensions.get('window');

// Function to fetch place predictions from Google Places API
const fetchPlacePredictions = async (
  query: string, 
  userLocation?: { latitude: number, longitude: number }
): Promise<LocationItem[]> => {
  if (!query || query.length < 2) return [];

  try {
    // Try the Places API (New) endpoint first
    let apiUrl = `https://places.googleapis.com/v1/places:searchText`;
    
    // Create request body for Places API (New)
    const requestBody = {
      textQuery: query,
      locationBias: userLocation ? {
        circle: {
          center: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude
          },
          radius: 50000.0
        }
      } : undefined,
      languageCode: "en",
      regionCode: "in", // India
      includedType: "locality"
    };
    
    console.log('Calling Places API (New):', JSON.stringify(requestBody));
    
    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.id'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data).substring(0, 200) + '...');
    
    // Handle successful response from Places API (New)
    if (data.places && data.places.length > 0) {
      return data.places.map((place: any) => {
        const displayName = place.displayName?.text || '';
        const formattedAddress = place.formattedAddress || '';
        
        // Extract city/region from formatted address
        const addressParts = formattedAddress.split(',').map((part: string) => part.trim());
        const secondaryText = addressParts.length > 1 ? 
          addressParts.slice(1).join(', ') : formattedAddress;
        
        return {
          id: place.id,
          mainText: displayName,
          secondaryText: secondaryText,
          fullText: formattedAddress
        };
      });
    }
    
    // If no results or API fails, fall back to local search
    return getFallbackResults(query);
    
  } catch (error) {
    console.error('Error fetching predictions:', error);
    // Fall back to local search on error
    return getFallbackResults(query);
  }
};

// Fallback function with pre-defined local results
const getFallbackResults = (query: string): LocationItem[] => {
  // Filter cities based on query
  return CITY_OPTIONS.filter(city => {
    const normalizedQuery = query.toLowerCase();
    const normalizedMain = city.mainText.toLowerCase();
    const normalizedSecondary = city.secondaryText.toLowerCase();
    
    return (
      normalizedMain.includes(normalizedQuery) || 
      normalizedSecondary.includes(normalizedQuery) ||
      (normalizedMain + ' ' + normalizedSecondary).includes(normalizedQuery)
    );
  });
};

// Add this helper function at the top level
async function checkLocationServicesEnabled(): Promise<boolean> {
  const providerStatus = await Location.getProviderStatusAsync();
  return providerStatus.locationServicesEnabled;
}

function LocationSearchScreen({ onLocationSelect, onClose }: LocationSearchScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [areaInput, setAreaInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  const insets = useSafeAreaInsets();
  
  // State for location search
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | undefined>(undefined);

  // Get user location for better suggestions
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
        }
      } catch (error) {
        console.log('Error getting location for suggestions:', error);
      }
    };
    
    getUserLocation();
  }, []);

  // Handle searching when query changes
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    
    setIsSearching(true);
    
    // Debounce API calls
    const timer = setTimeout(async () => {
      const predictions = await fetchPlacePredictions(searchQuery, userLocation);
      setSuggestions(predictions);
      setIsSearching(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, userLocation]);

  // Handle getting current location
  const handleGetCurrentLocation = async () => {
    try {
      // First check if location services are enabled
      const locationEnabled = await checkLocationServicesEnabled();
      if (!locationEnabled) {
        Alert.alert(
          "Location Services Disabled",
          "Please enable Location Services in your device settings to use this feature.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Open Settings", 
              onPress: () => Platform.OS === 'ios' ? 
                Linking.openURL('app-settings:') : 
                Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
            }
          ]
        );
        return;
      }

      // Then check permission status
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          "Location Permission Required",
          "We need location access to find centers near you. Please enable location access in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return;
      }

      setCurrentLocationLoading(true);

      // Get location with timeout
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Location request timed out')), 15000)
      );

      const location = await Promise.race([
        locationPromise,
        timeoutPromise
      ]) as Location.LocationObject;

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address from coordinates
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (geocode && geocode.length > 0) {
        const address = geocode[0];
        const locationString = [
          address.district || address.subregion || address.city,
          address.city || address.region,
          address.country
        ]
          .filter(Boolean)
          .join(', ');
        
        onLocationSelect(locationString, { latitude, longitude });
      } else {
        throw new Error('Could not determine address from location');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      
      // Provide more specific error messages based on the error
      let errorMessage = "Could not get your current location. Please try again or enter a location manually.";
      
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          errorMessage = "Location request timed out. Please check if you have a clear view of the sky and try again.";
        } else if (error.message.includes('Location request failed')) {
          errorMessage = "Unable to get your location. Please make sure you have a stable internet connection and try again.";
        }
      }
      
      Alert.alert(
        "Location Error",
        errorMessage,
        [{ text: "OK" }]
      );
    } finally {
      setCurrentLocationLoading(false);
    }
  };

  // Handle item selection
  const handleSelectItem = async (item: LocationItem) => {
    try {
      setCurrentLocationLoading(true);
      
      // Try to geocode the location to get coordinates
      const geocodeResults = await Location.geocodeAsync(item.fullText);
      
      if (geocodeResults && geocodeResults.length > 0) {
        const coordinates = {
          latitude: geocodeResults[0].latitude,
          longitude: geocodeResults[0].longitude
        };
        console.log('Geocoded coordinates for', item.fullText, coordinates);
        
        // Pass both location name and coordinates
        onLocationSelect(item.fullText, coordinates);
      } else {
        // If geocoding fails, just pass the location name
        console.log('Failed to geocode location:', item.fullText);
        onLocationSelect(item.fullText);
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
      onLocationSelect(item.fullText);
    } finally {
      setCurrentLocationLoading(false);
    }
  };
  
  // Toggle request form visibility
  const toggleRequestForm = () => {
    setShowForm(!showForm);
    
    // Reset form when closing
    if (showForm) {
      setCityInput('');
      setAreaInput('');
    }
  };
  
  // Handle submit location request
  const handleSubmitLocationRequest = () => {
    if (!cityInput.trim()) {
      Alert.alert("Please enter a city name");
      return;
    }
    
    setIsSubmitting(true);
    
    // Here you would typically send this data to your backend
    // For now we'll just simulate a backend call
    setTimeout(() => {
      setIsSubmitting(false);
      setHasSubmitted(true);
      
      // Clear the inputs after submission
      setCityInput('');
      setAreaInput('');
      
      // Show confirmation to user
      Alert.alert(
        "Thank You!", 
        "We've received your request and will consider expanding to your area soon.",
        [{ text: "OK" }]
      );
      
      // Close the form after successful submission
      setTimeout(() => {
        setShowForm(false);
        setHasSubmitted(false);
      }, 1500);
    }, 1000);
  };
  
  // Render location item
  const renderLocationItem = ({ item }: { item: LocationItem }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => handleSelectItem(item)}
    >
      <Ionicons name="location-outline" size={18} color="#118347" style={styles.locationIcon} />
      <View style={styles.locationTextContainer}>
        <Text style={styles.locationItemMainText}>{item.mainText}</Text>
        <Text style={styles.locationItemSecondaryText}>{item.secondaryText}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          
          {/* Header */}
          <SafeAreaView style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Location</Text>
          </SafeAreaView>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for your location..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setShowSearchResults(text.length > 0);
                }}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {showSearchResults ? (
              // Search Results
              <View style={styles.searchResultsContainer}>
                {isSearching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#118347" />
                    <Text style={styles.loadingText}>Searching locations...</Text>
                  </View>
                ) : suggestions.length > 0 ? (
                  <FlatList
                    data={suggestions}
                    renderItem={renderLocationItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                ) : searchQuery.length > 0 ? (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={40} color="#DDD" />
                    <Text style={styles.noResultsText}>No locations found</Text>
                    <Text style={styles.noResultsSubtext}>
                      Try a different search term or select from available cities
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <>
                {/* Current Location Option */}
                <TouchableOpacity 
                  style={styles.currentLocationButton}
                  onPress={handleGetCurrentLocation}
                  disabled={currentLocationLoading}
                >
                  <View style={styles.locationIconContainer}>
                    <Ionicons name="locate" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.locationTextContainer}>
                    <Text style={styles.currentLocationText}>Use Current Location</Text>
                    <Text style={styles.currentLocationSubtext}>
                      Get centers near you automatically
                    </Text>
                  </View>
                  {currentLocationLoading && (
                    <ActivityIndicator size="small" color="#118347" style={styles.loader} />
                  )}
                </TouchableOpacity>

                {/* Available Cities Section */}
                <View style={styles.citiesSection}>
                  <Text style={styles.sectionTitle}>Available Cities</Text>
                  <View style={styles.cityGrid}>
                    <TouchableOpacity 
                      style={styles.cityButton}
                      onPress={() => onLocationSelect('Hyderabad, Telangana', { latitude: 17.385044, longitude: 78.486671 })}
                    >
                      <View style={styles.cityButtonContent}>
                        <Ionicons name="location" size={24} color="#118347" />
                        <Text style={styles.cityButtonText}>Hyderabad</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Coming Soon Cities */}
                    <View style={styles.comingSoonSection}>
                      <Text style={styles.comingSoonTitle}>Coming Soon to</Text>
                      <View style={styles.comingSoonCities}>
                        <View style={styles.comingSoonCity}>
                          <Ionicons name="time-outline" size={20} color="#666" />
                          <Text style={styles.comingSoonCityText}>Warangal</Text>
                        </View>
                        <View style={styles.comingSoonCity}>
                          <Ionicons name="time-outline" size={20} color="#666" />
                          <Text style={styles.comingSoonCityText}>Nizamabad</Text>
                        </View>
                        <View style={styles.comingSoonCity}>
                          <Ionicons name="time-outline" size={20} color="#666" />
                          <Text style={styles.comingSoonCityText}>Karimnagar</Text>
                        </View>
                        <View style={styles.comingSoonCity}>
                          <Ionicons name="time-outline" size={20} color="#666" />
                          <Text style={styles.comingSoonCityText}>Nalgonda</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  content: {
    flex: 1,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#118347',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  currentLocationSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  loader: {
    marginLeft: 8,
  },
  citiesSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  cityGrid: {
    gap: 16,
  },
  cityButton: {
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cityButtonContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#118347',
    marginLeft: 12,
  },
  comingSoonSection: {
    marginTop: 24,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  comingSoonCities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  comingSoonCity: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  comingSoonCityText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  locationIcon: {
    marginRight: 12,
  },
  locationItemMainText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  locationItemSecondaryText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  searchResultsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  noResultsContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
});

export default LocationSearchScreen; 