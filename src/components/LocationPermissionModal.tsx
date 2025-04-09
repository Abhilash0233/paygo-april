import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import LocationSearchScreen from '../screens/location/LocationSearchScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationPermissionModalProps {
  visible: boolean;
  onAllowLocation: () => void;
  onManualLocation: () => void;
  onClose?: () => void;
}

const { height } = Dimensions.get('window');

export default function LocationPermissionModal({
  visible,
  onAllowLocation,
  onManualLocation,
  onClose
}: LocationPermissionModalProps) {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Control animations based on visible prop
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5))
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease)
        })
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const handleLocationPermission = async () => {
    try {
      setIsLoading(true);
      
      // First check if location services are enabled
      const providerStatus = await Location.getProviderStatusAsync();
      if (!providerStatus.locationServicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable Location Services in your device settings to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                }
              }
            }
          ]
        );
        return;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        try {
          // Get current location
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 15000 // 15 second timeout
          });
          
          // Store the location
          const locationInfo = {
            coordinates: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            },
            source: 'precise', // Mark this as precise location
            timestamp: new Date().toISOString()
          };
          
          await AsyncStorage.setItem('lastSelectedLocation', JSON.stringify(locationInfo));
          onAllowLocation();
        } catch (locationError) {
          console.error('Error getting current location:', locationError);
          Alert.alert(
            'Location Error',
            'Unable to get your current location. Please try again or enter location manually.',
            [
              { text: 'Try Again', onPress: handleLocationPermission },
              { text: 'Enter Manually', onPress: () => setShowLocationSearch(true) }
            ]
          );
        }
      } else {
        Alert.alert(
          'Permission Required',
          'Location permission is required to find centers near you. Please enable it in settings or enter location manually.',
          [
            { 
              text: 'Enter Manually', 
              onPress: () => setShowLocationSearch(true)
            },
            { 
              text: 'Open Settings',
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
      }
    } catch (error) {
      console.error('Error getting location permission:', error);
      Alert.alert(
        'Error',
        'Failed to get location permission. Please try again or enter location manually.',
        [
          { text: 'Try Again', onPress: handleLocationPermission },
          { text: 'Enter Manually', onPress: () => setShowLocationSearch(true) }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = async (location: string, coordinates?: { latitude: number; longitude: number }) => {
    if (coordinates) {
      try {
        // Store the selected location
        const locationInfo = {
          name: location,
          coordinates,
          source: 'manual', // Mark this as manually entered location
          timestamp: new Date().toISOString()
        };
        await AsyncStorage.setItem('lastSelectedLocation', JSON.stringify(locationInfo));
      } catch (error) {
        console.error('Error storing selected location:', error);
      }
    }
    setShowLocationSearch(false);
    onManualLocation();
  };
  
  if (showLocationSearch) {
    return (
      <LocationSearchScreen
        onLocationSelect={handleLocationSelect}
        onClose={() => setShowLocationSearch(false)}
      />
    );
  }
  
  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <BlurView intensity={30} style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity
          style={styles.dismissArea}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.contentContainer,
            {
              paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.handle} />
          
          <View style={styles.content}>
            <View style={styles.header}>
              <Ionicons name="location-outline" size={40} color="#118347" />
              <Text style={styles.title}>Enable Location Services</Text>
              <Text style={styles.subtitle}>
                Allow location access to find fitness centers near you
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.allowButton]}
                onPress={handleLocationPermission}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.allowButtonText}>Allow Location Access</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.manualButton]}
                onPress={() => setShowLocationSearch(true)}
                disabled={isLoading}
              >
                <Ionicons name="search" size={20} color="#118347" style={styles.buttonIcon} />
                <Text style={styles.manualButtonText}>Enter Location Manually</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dismissArea: {
    flex: 1,
  },
  contentContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDD',
    marginBottom: 10,
  },
  content: {
    width: '100%',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    minHeight: 56,
  },
  allowButton: {
    backgroundColor: '#118347',
    borderColor: '#118347',
  },
  allowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  manualButton: {
    backgroundColor: '#FFFFFF',
  },
  manualButtonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
}); 