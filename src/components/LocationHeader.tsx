import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationHeaderProps {
  location: string;
  onPress: () => void;
  isLoading?: boolean;
  locationSource?: 'precise' | 'manual' | null;
}

const LocationHeader: React.FC<LocationHeaderProps> = ({ 
  location, 
  onPress, 
  isLoading = false,
  locationSource = null 
}) => {
  // Determine the appropriate icon based on location source
  const getLocationIcon = () => {
    if (isLoading) {
      return <ActivityIndicator size="small" color="#118347" style={styles.loadingIndicator} />;
    }
    
    if (locationSource === 'precise') {
      return <Ionicons name="navigate" size={16} color="#118347" />;
    }
    
    if (locationSource === 'manual') {
      return <Ionicons name="search" size={16} color="#118347" />;
    }
    
    // Default
    return <Ionicons name="location-outline" size={16} color="#118347" />;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.headerSubtext}>Your Location</Text>
      <View style={styles.locationRow}>
        {getLocationIcon()}
        <Text 
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.locationText}
        >
          {isLoading ? 'Detecting location...' : location}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#118347" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: '60%',
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
  },
  loadingIndicator: {
    width: 16,
    height: 16,
  }
});

export default LocationHeader; 