import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, Platform, TextInput, Modal, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStack';
import LocationSearchScreen from '../location/LocationSearchScreen';
import { LinearGradient } from 'expo-linear-gradient';
import LocationHeader from '../../components/LocationHeader';
import * as Location from 'expo-location';
import { Center, fetchCenters, fetchCenterDetails, fetchFeaturedCenters } from '../../firebase/services/centerService';
import { useWallet } from '../../services/walletContext';

// Sample data for popular fitness centers with expanded details
const popularCenters = [
  { 
    id: '1', 
    name: 'Ultimate Fitness', 
    location: 'Koramangala, 5th Block',
    fullAddress: '123 5th Block, Koramangala\nBangalore, Karnataka 560095',
    distance: '0.5 km',
    price: '₹800/session',
    activities: ['Gym', 'Yoga', 'Zumba'],
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
    featured: true,
    rating: 4.8,
    reviews: 245,
    description: 'State-of-the-art fitness center offering a wide range of equipment and classes. Our facility includes cardio machines, free weights, and dedicated areas for functional training. Professional trainers are available for personalized guidance.',
    hours: 'Open until 10 PM',
    amenities: ['Personal Training', 'Locker Rooms', 'Showers', 'Sauna', 'Parking', 'Wifi', 'Cafe', 'AC'],
    thingsToKnow: [
      'Please arrive 10 minutes before your session',
      'Bring your own water bottle and towel',
      'Wear comfortable workout clothes and shoes',
      'Carry your ID proof for first-time visit',
      'Inform trainers about any health conditions'
    ],
    images: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'
    ]
  },
  { 
    id: '2', 
    name: 'Yoga Haven', 
    location: 'Bandra West',
    distance: '1.2 km',
    price: '₹600/session',
    activities: ['Yoga', 'Meditation'],
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
    featured: true,
    rating: 4.7,
    reviews: 189,
    description: 'Find peace and balance at Yoga Haven. Our studio offers a variety of yoga classes for all levels in a serene environment.',
    hours: 'Open 6:00 AM - 9:00 PM',
    amenities: ['Mats Provided', 'Meditation Room', 'Changing Rooms', 'Water Station'],
    images: [
      'https://images.unsplash.com/photo-1545205597-3d9d02c29597?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1588286840104-8957b019727f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'
    ]
  },
  { 
    id: '3', 
    name: 'SportZone', 
    location: 'Juhu Beach',
    distance: '2.1 km',
    price: '₹1200/session',
    activities: ['Badminton', 'Cricket', 'Swimming'],
    image: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
    featured: false,
    rating: 4.6,
    reviews: 156,
    description: 'SportZone offers multiple sports facilities including badminton courts, cricket nets, and a swimming pool.',
    hours: 'Open 6:00 AM - 10:00 PM',
    amenities: ['Equipment Rental', 'Coaching', 'Changing Rooms', 'Cafeteria'],
    images: [
      'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1562771379-eafdca7a02f8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'
    ]
  },
  { 
    id: '4', 
    name: 'AquaLife Center', 
    location: 'Marine Drive',
    distance: '3.5 km',
    price: '₹900/session',
    activities: ['Swimming', 'Aqua Yoga'],
    image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
    featured: false,
    rating: 4.5,
    reviews: 128,
    description: 'AquaLife Center features an Olympic-sized swimming pool and offers swimming lessons and aqua fitness classes for all ages.',
    hours: 'Open 6:00 AM - 8:00 PM',
    amenities: ['Heated Pool', 'Swimming Lessons', 'Locker Rooms', 'Towel Service'],
    images: [
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'
    ]
  },
  { 
    id: '5', 
    name: 'Total Fitness', 
    location: 'Powai',
    distance: '1.8 km',
    price: '₹750/session',
    activities: ['Gym', 'Pickle Ball', 'Zumba'],
    image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
    featured: false,
    rating: 4.4,
    reviews: 112,
    description: 'Total Fitness offers a comprehensive fitness experience with gym facilities, group classes, and recreational sports.',
    hours: 'Open 24 hours',
    amenities: ['24/7 Access', 'Group Classes', 'Personal Trainers', 'Juice Bar'],
    images: [
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'
    ]
  }
];

// Sample data for upcoming sessions
const upcomingSessions = [
  {
    id: '1',
    activity: 'Yoga',
    center: 'Yoga Haven',
    time: 'Today, 6:00 PM',
    status: 'Confirmed'
  },
  {
    id: '2',
    activity: 'Swimming',
    center: 'AquaLife',
    time: 'Tomorrow, 8:00 AM',
    status: 'Pending'
  }
];

// Sample data for activity types
const activityTypes = [
  { id: '0', name: 'All', icon: 'grid' },
  { id: '1', name: 'Gym', icon: 'fitness' },
  { id: '2', name: 'Yoga', icon: 'body' },
  { id: '3', name: 'Swimming', icon: 'water' },
  { id: '4', name: 'Badminton', icon: 'tennisball' },
  { id: '5', name: 'Cricket', icon: 'baseball' },
  { id: '6', name: 'Zumba', icon: 'musical-notes' },
  { id: '7', name: 'Pickle Ball', icon: 'basketball' }
];

// Sample user data
const userData = {
  name: "John",
};

// Update the extractLocationShortForm function to provide more detailed location info
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

// Update the formatDistanceInKm function to correctly display distances
const formatDistanceInKm = (distanceText: string | undefined): string => {
  if (!distanceText) return '';
  
  // Extract the numeric part and unit from the distance string
  const match = distanceText.match(/^([\d.]+)([a-z]+)$/);
  if (!match) return distanceText;
  
  const [_, value, unit] = match;
  const numericValue = parseFloat(value);
  
  // Always show as km with one decimal place, minimum 0.1km
  if (numericValue < 0.1) {
    return '0.1km';
  }
  
  // Round to 1 decimal place for a cleaner display
  return `${numericValue.toFixed(1)}km`;
};

// Location display component
const LocationDisplay = ({ location, onPress }: { location: string; onPress: () => void }) => {
  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 1, maxWidth: '80%' }}>
      <Text style={{ fontSize: 12, color: '#666' }}>Your Location</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
        <Ionicons name="location-outline" size={16} color="#118347" />
        <Text 
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ 
            fontSize: 14, 
            fontWeight: '600', 
            color: '#333', 
            marginHorizontal: 4,
            flex: 1 
          }}
        >
          {location}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#118347" />
      </View>
    </TouchableOpacity>
  );
};

// Update the navigation type
type HomeNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNavigationProp>();
  const rootNavigation = useNavigation();
  const [userLocation, setUserLocation] = useState('Loading location...');
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationSearchVisible, setLocationSearchVisible] = useState(false);
  const [tabSelected, setTabSelected] = useState<string | null>(null);
  const { walletBalance, isLoading: isWalletLoading } = useWallet();
  
  // State for Firebase data
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<Location.LocationObject | null>(null);

  // Get user location
  useEffect(() => {
    const getUserLocation = async () => {
      setIsLocationLoading(true);
      try {
        console.log('Requesting location permissions...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('Location permission denied');
          setUserLocation('Location access denied');
          // Use a default location in case permission is denied (optional)
          // You can remove this if you don't want to set default coordinates
          const defaultLocation: Location.LocationObject = {
            coords: {
              latitude: 28.6139, // Default to New Delhi
              longitude: 77.2090,
              altitude: null,
              accuracy: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          };
          setUserCoordinates(defaultLocation);
          setIsLocationLoading(false);
          return;
        }
        
        console.log('Location permission granted, getting current position...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        console.log(`Got user location: lat=${location.coords.latitude}, lng=${location.coords.longitude}`);
        setUserCoordinates(location);
        
        // Get address from coordinates
        try {
          const geocodeResult = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          
          if (geocodeResult.length > 0) {
            const address = geocodeResult[0];
            console.log('Geocode result:', address);
            
            // Create a more detailed location string
            const parts = [];
            if (address.street) parts.push(address.street);
            if (address.name) parts.push(address.name);
            if (address.district) parts.push(address.district);
            if (address.city) parts.push(address.city);
            
            const formattedLocation = parts.join(', ');
            setUserLocation(formattedLocation || 'Current Location');
          }
        } catch (geocodeError) {
          console.error('Error getting address from coordinates:', geocodeError);
          setUserLocation('Current Location');
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setUserLocation('Location unavailable');
      } finally {
        setIsLocationLoading(false);
      }
    };
    
    getUserLocation();
  }, []);
  
  // Fetch centers data from Firebase
  useEffect(() => {
    const loadCentersData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Starting to fetch center data...');
        if (userCoordinates) {
          console.log(`User coordinates available for distance calculation: ${userCoordinates.coords.latitude}, ${userCoordinates.coords.longitude}`);
        } else {
          console.log('No user coordinates available, distances will not be calculated');
        }
        
        // Fetch all centers
        const allCenters = await fetchCenters(userCoordinates || undefined);
        
        // Log detailed distance information for debugging
        console.log('Centers with distance information:');
        allCenters.forEach(center => {
          console.log(`${center.name}: lat=${center.latitude}, lng=${center.longitude}, distance=${center.distance || 'N/A'}`);
        });
        
        // Check if we have any centers
        if (allCenters.length === 0) {
          console.log('No centers returned from Firebase, using fallback data');
          setCenters(popularCenters);
        } else {
          console.log(`Loaded ${allCenters.length} centers from Firebase with distances`);
          setCenters(allCenters);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading centers data:', err);
        setError('Failed to load fitness centers');
        setLoading(false);
        
        // Fallback to mock data
        console.log('Using fallback data due to error');
        setCenters(popularCenters);
      }
    };
    
    loadCentersData();
  }, [userCoordinates]);
  
  // Other handlers remain the same
  const handleCenterPress = async (center: Center) => {
    try {
      // Navigate to CenterDetail
      navigation.navigate('CenterDetail', { 
        centerId: center.id 
      });
    } catch (error) {
      console.error('Error navigating to center details:', error);
    }
  };

  const openLocationSearch = () => {
    setLocationSearchVisible(true);
  };

  const handleLocationSelect = async (location: string) => {
    setUserLocation(location);
    setLocationSearchVisible(false);
    
    try {
      // Geocode the selected location to get coordinates
      const geocodeResults = await Location.geocodeAsync(location);
      
      if (geocodeResults.length > 0) {
        const { latitude, longitude } = geocodeResults[0];
        
        // Create a location object to match the structure expected by centerService
        const locationObject: Location.LocationObject = {
          coords: {
            latitude,
            longitude,
            altitude: null,
            accuracy: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        };
        
        // Update user coordinates which will trigger a reload of centers with distances
        setUserCoordinates(locationObject);
      }
    } catch (error) {
      console.error('Error geocoding selected location:', error);
    }
  };

  const filteredCenters = tabSelected
    ? centers.filter(center => center.activities?.includes(tabSelected) || false)
    : centers;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Location Search Modal */}
      {locationSearchVisible && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={locationSearchVisible}
          onRequestClose={() => setLocationSearchVisible(false)}
        >
          <LocationSearchScreen
            onLocationSelect={handleLocationSelect}
            onClose={() => setLocationSearchVisible(false)}
          />
        </Modal>
      )}
      
      {/* Sticky Header with status bar overlaid */}
      <View style={[styles.stickyHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <LocationHeader 
            location={userLocation}
            onPress={openLocationSearch}
            isLoading={isLocationLoading}
          />
          
          <View style={styles.headerRightContainer}>
            {/* Wallet */}
            <TouchableOpacity 
              style={styles.walletContainer}
              onPress={() => {
                // Navigate to Profile tab
                rootNavigation.navigate('Profile');
              }}
            >
              <Ionicons name="wallet-outline" size={20} color="#333" />
              {isWalletLoading ? (
                <ActivityIndicator size="small" color="#333" style={{ marginLeft: 8 }} />
              ) : (
                <Text style={styles.walletText}>₹{walletBalance.toLocaleString()}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Welcome, <Text style={styles.highlightedText}>{userData.name}</Text> 👋
          </Text>
          <Text style={styles.welcomeSubtext}>what would you like to do today?</Text>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search fitness centers, activities..."
              placeholderTextColor="#999"
              onChangeText={text => {
                console.log('Search:', text);
              }}
            />
          </View>
        </View>
        
        {/* Activity Categories */}
        <View style={styles.activitiesGrid}>
          <TouchableOpacity 
            style={[styles.activityGridItem, tabSelected === null && styles.activitySelected]}
            onPress={() => setTabSelected(null)}
          >
            <View style={[
              styles.activityIconContainer,
              tabSelected === null && styles.selectedIconContainer
            ]}>
              <Ionicons name="grid-outline" size={24} color={tabSelected === null ? "#FFFFFF" : "#118347"} />
            </View>
            <Text style={styles.activityName}>All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.activityGridItem, tabSelected === 'Gym' && styles.activitySelected]}
            onPress={() => setTabSelected('Gym')}
          >
            <View style={[
              styles.activityIconContainer,
              tabSelected === 'Gym' && styles.selectedIconContainer
            ]}>
              <Ionicons name="fitness" size={24} color={tabSelected === 'Gym' ? "#FFFFFF" : "#118347"} />
            </View>
            <Text style={styles.activityName}>Gym</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.activityGridItem, tabSelected === 'Yoga' && styles.activitySelected]}
            onPress={() => setTabSelected('Yoga')}
          >
            <View style={[
              styles.activityIconContainer,
              tabSelected === 'Yoga' && styles.selectedIconContainer
            ]}>
              <Ionicons name="body" size={24} color={tabSelected === 'Yoga' ? "#FFFFFF" : "#118347"} />
            </View>
            <Text style={styles.activityName}>Yoga</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.activityGridItem, tabSelected === 'Swimming' && styles.activitySelected]}
            onPress={() => setTabSelected('Swimming')}
          >
            <View style={[
              styles.activityIconContainer,
              tabSelected === 'Swimming' && styles.selectedIconContainer
            ]}>
              <Ionicons name="water" size={24} color={tabSelected === 'Swimming' ? "#FFFFFF" : "#118347"} />
            </View>
            <Text style={styles.activityName}>Swimming</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.activityGridItem, tabSelected === 'Badminton' && styles.activitySelected]}
            onPress={() => setTabSelected('Badminton')}
          >
            <View style={[
              styles.activityIconContainer,
              tabSelected === 'Badminton' && styles.selectedIconContainer
            ]}>
              <Ionicons name="tennisball" size={24} color={tabSelected === 'Badminton' ? "#FFFFFF" : "#118347"} />
            </View>
            <Text style={styles.activityName}>Badminton</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.activityGridItem, tabSelected === 'Cricket' && styles.activitySelected]}
            onPress={() => setTabSelected('Cricket')}
          >
            <View style={[
              styles.activityIconContainer,
              tabSelected === 'Cricket' && styles.selectedIconContainer
            ]}>
              <Ionicons name="baseball" size={24} color={tabSelected === 'Cricket' ? "#FFFFFF" : "#118347"} />
            </View>
            <Text style={styles.activityName}>Cricket</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.activityGridItem, tabSelected === 'Zumba' && styles.activitySelected]}
            onPress={() => setTabSelected('Zumba')}
          >
            <View style={[
              styles.activityIconContainer,
              tabSelected === 'Zumba' && styles.selectedIconContainer
            ]}>
              <Ionicons name="musical-notes" size={24} color={tabSelected === 'Zumba' ? "#FFFFFF" : "#118347"} />
            </View>
            <Text style={styles.activityName}>Zumba</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.activityGridItem, tabSelected === 'Pickle Ball' && styles.activitySelected]}
            onPress={() => setTabSelected('Pickle Ball')}
          >
            <View style={[
              styles.activityIconContainer,
              tabSelected === 'Pickle Ball' && styles.selectedIconContainer
            ]}>
              <Ionicons name="basketball" size={24} color={tabSelected === 'Pickle Ball' ? "#FFFFFF" : "#118347"} />
            </View>
            <Text style={styles.activityName}>Pickle Ball</Text>
          </TouchableOpacity>
        </View>
        
        {/* Promotional Banner */}
        <View style={styles.promoBannerContainer}>
          <View style={styles.promoBanner}>
            <LinearGradient
              colors={['#F5F5F5', '#EFEFEF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoBannerBackground}
            />
            <View style={styles.promoBannerIconWrapper}>
              <View style={styles.promoBannerIconContainer}>
                <Ionicons name="information-outline" size={20} color="#888888" />
              </View>
            </View>
            <View style={styles.promoBannerContent}>
              <Text style={styles.promoBannerText}>
                Your first 2 gym bookings are <Text style={styles.promoBannerHighlight}>FREE</Text>
              </Text>
              <Text style={styles.promoBannerSubtext}>Limited period offer. T&C apply</Text>
            </View>
          </View>
        </View>
        
        {/* Nearby Fitness Centers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Centres</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.centersContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#118347" />
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={40} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : centers.filter(center => 
              tabSelected === null || 
              (center.activities && center.activities.includes(tabSelected))
            ).length > 0 ? (
              <View style={styles.centersContainer}>
                {filteredCenters.map((center) => (
                  <TouchableOpacity 
                    key={center.id} 
                    style={styles.centerCard}
                    onPress={() => handleCenterPress(center)}
                  >
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ 
                          uri: center.image || 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1470&auto=format&fit=crop'
                        }}
                        style={styles.centerImage}
                        resizeMode="cover"
                      />
                      {center.category && (
                        <View style={styles.categoryChip}>
                          <Text style={styles.categoryChipText}>
                            {typeof center.category === 'string' 
                              ? center.category 
                              : (center.category as any).name || 'General'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.centerDetails}>
                      <View style={styles.centerNameRow}>
                        <Text style={styles.centerName} numberOfLines={1}>
                          {center.name}
                        </Text>
                        {center.distance && (
                          <View style={styles.distanceBadge}>
                            <Ionicons name="navigate-outline" size={11} color="#118347" />
                            <Text style={styles.distanceText}>{formatDistanceInKm(center.distance)}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.addressPriceRow}>
                        <View style={styles.centerLocation}>
                          <Ionicons name="location-outline" size={16} color="#888" />
                          <View style={styles.locationTextContainer}>
                            <Text style={styles.centerLocationSecondaryText} numberOfLines={1}>
                              {extractLocationShortForm(center.location).secondary || extractLocationShortForm(center.location).primary}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.centerPriceText}>
                          ₹{center.dealPrice || "0"}/Session
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={40} color="#DDD" />
                <Text style={styles.noResultsText}>No centres found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try a different category or location
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  stickyHeader: {
    backgroundColor: 'rgba(17, 131, 71, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginLeft: 0,
    marginRight: 0,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  walletText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  headerSubtext: {
    fontSize: 12,
    color: '#666',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 4,
    color: '#333',
    flex: 1,
    maxWidth: '70%',
  },
  welcomeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  nameText: {
    fontWeight: 'bold',
    color: '#118347',
  },
  welcomeQuestion: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    color: '#118347',
    fontSize: 14,
  },
  featuredCentersScroll: {
    marginTop: 0,
    marginBottom: 8,
  },
  featuredCentersContent: {
    paddingRight: 16,
    paddingVertical: 8,
  },
  featuredCenterCard: {
    width: 330,
    height: 180,
    borderRadius: 7,
    overflow: 'hidden',
    marginRight: 20,
    position: 'relative',
  },
  featuredCenterImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  premiumBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#8A2BE2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  darkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  featuredCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  featuredCenterName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featuredCenterPrice: {
    marginTop: 8,
  },
  activityScroll: {
    marginTop: 12,
    marginBottom: 8,
  },
  activityItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  activityIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(17, 131, 71, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  centersContainer: {
    marginTop: 8,
    paddingBottom: 4,
  },
  centerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  imageContainer: {
    position: 'relative',
  },
  centerImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  centerDetails: {
    padding: 16,
  },
  centerNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  centerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  addressPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  centerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 4,
  },
  centerLocationSecondaryText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    fontWeight: '400',
  },
  centerPriceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  categoryChip: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(51, 51, 51, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 8,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  highlightedText: {
    fontWeight: 'bold',
    color: '#118347',
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  carouselContainer: {
    height: 300,
    position: 'relative',
  },
  carouselImage: {
    width,
    height: 300,
    resizeMode: 'cover',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instagramButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  paginationDots: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
  },
  detailsScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  detailSection: {
    marginBottom: 24,
  },
  centerDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 4,
  },
  centerDetailLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  centerDetailLocationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  metaInfoContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  metaInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  metaInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    marginLeft: 0,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginLeft: 0,
  },
  amenitiesGrid: {
    marginTop: 8,
    marginLeft: 0,
    marginRight: 0,
  },
  amenityRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
  },
  amenityIconContainer: {
    marginRight: 10,
  },
  amenityLabel: {
    fontSize: 14,
    color: '#333',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
  },
  priceUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  bookButton: {
    backgroundColor: '#118347',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomIndicator: {
    position: 'absolute',
    bottom: 8,
    width: '100%',
    alignItems: 'center',
  },
  indicatorLine: {
    width: 60,
    height: 4,
    backgroundColor: '#000',
    opacity: 0.2,
    borderRadius: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 16,
  },
  directionsButton: {
    alignSelf: 'flex-start',
  },
  directionsButtonText: {
    fontSize: 14,
    color: '#118347',
    fontWeight: '600',
  },
  thingsToKnowContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginLeft: 0,
    marginRight: 0,
  },
  thingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  thingIconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  thingText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  activitiesSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  activitiesGrid: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  activityGridItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  activitySelected: {
    opacity: 1,
  },
  selectedIconContainer: {
    backgroundColor: '#118347',
  },
  promoBannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
    marginTop: 4,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  promoBannerBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.6,
  },
  backgroundIcon: {
    position: 'absolute',
    right: -10,
    bottom: -15,
  },
  promoBannerIconWrapper: {
    marginRight: 12,
  },
  promoBannerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBannerContent: {
    flex: 1,
  },
  promoBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555555',
    marginBottom: 2,
  },
  promoBannerHighlight: {
    fontWeight: '600',
    color: '#555555',
    fontSize: 14,
  },
  promoBannerSubtext: {
    fontSize: 12,
    color: '#999999',
  },
  featuredScrollContent: {
    paddingRight: 16,
    paddingVertical: 8,
  },
  overlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  featuredCenterContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  featuredCenterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  featuredCenterRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredCenterRatingText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  featuredCenterLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featuredCenterLocationText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  featuredCenterPriceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  noFeaturedContainer: {
    width: 150,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginRight: 12,
  },
  noFeaturedText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  centerDetailImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 16,
  },
  centerDetailContent: {
    flex: 1,
  },
  centerDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  centerDetailRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerDetailRatingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  activitiesContainer: {
    marginTop: 8,
  },
  activitiesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  activitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activityChip: {
    backgroundColor: 'rgba(17, 131, 71, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  activityChipText: {
    fontSize: 12,
    color: '#118347',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#118347',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  centerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F5A623',
    marginLeft: 4,
  },
  centerMetaContainer: {
    flexDirection: 'column',
  },
  loadingContainerHorizontal: {
    width: 150,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  centerDetailMeta: {
    marginTop: 12,
  },
  distanceBadge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
    marginLeft: 3,
  },
  modalDistanceBadge: {
    backgroundColor: 'rgba(17, 131, 71, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  modalDistanceText: {
    color: '#118347',
    fontWeight: '600',
    fontSize: 13,
  },
});

export default HomeScreen; 