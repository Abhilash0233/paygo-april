import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LocationPermissionModal from '../components/LocationPermissionModal';
import LoginOverlay from '../components/LoginOverlay';
import { useAuth } from '../services/authContext';

type RootStackParamList = {
  HomeScreen: undefined;
  ManualLocationScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: NavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const [username, setUsername] = useState('makings_me');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationName, setLocationName] = useState('Loading location...');
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const { isGuestMode } = useAuth();

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      setShowLocationModal(true);
    } else {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      // Here you would typically reverse geocode to get the location name
      setLocationName('Current Location');
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationName('Location unavailable');
    }
  };

  const handleAllowLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setShowLocationModal(false);
      getCurrentLocation();
    }
  };

  const handleManualLocation = () => {
    setShowLocationModal(false);
    navigation.navigate('ManualLocationScreen');
  };

  const handleSignIn = () => {
    setShowLoginOverlay(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.locationButton}>
            <Ionicons name="location-outline" size={20} color="#118347" />
            <Text style={styles.locationText}>{locationName}</Text>
            <Ionicons name="chevron-down" size={20} color="#666666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.walletButton}>
            <Ionicons name="wallet-outline" size={20} color="#118347" />
            <Text style={styles.walletAmount}>₹0</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome, <Text style={styles.username}>{username}</Text> 👋
          </Text>
          <Text style={styles.subtitle}>
            what would you like to do today?
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for fitness centers..."
            placeholderTextColor="#666666"
          />
        </View>

        <View style={styles.categorySection}>
          <TouchableOpacity style={styles.categoryButton}>
            <View style={styles.categoryIcon}>
              <Ionicons name="grid" size={24} color="#118347" />
            </View>
            <Text style={styles.categoryText}>All</Text>
          </TouchableOpacity>
          {/* Add more category buttons as needed */}
        </View>

        <View style={styles.nearbySection}>
          <Text style={styles.sectionTitle}>Nearby Centers</Text>
          {/* Add nearby centers list here */}
        </View>
      </ScrollView>

      <LocationPermissionModal
        visible={showLocationModal}
        onAllowLocation={handleAllowLocation}
        onManualLocation={handleManualLocation}
      />

      {/* Add Sign In button for guest users */}
      {isGuestMode && (
        <View style={styles.signInContainer}>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={handleSignIn}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Login Overlay */}
      <LoginOverlay
        visible={showLoginOverlay}
        onClose={() => setShowLoginOverlay(false)}
        returnScreen="Main"
        returnParams={{ screen: 'HomeStack' }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 16,
    color: '#111111',
    marginHorizontal: 4,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  walletAmount: {
    fontSize: 16,
    color: '#118347',
    fontWeight: '600',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  welcomeText: {
    fontSize: 28,
    color: '#111111',
    marginBottom: 4,
  },
  username: {
    color: '#118347',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111111',
  },
  categorySection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  categoryButton: {
    alignItems: 'center',
    width: 72,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#111111',
  },
  nearbySection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 16,
  },
  signInContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  signInButton: {
    backgroundColor: '#118347',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 