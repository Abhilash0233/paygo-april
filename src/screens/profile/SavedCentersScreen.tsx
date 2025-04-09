/**
 * SavedCentersScreen - Displays a list of centers saved as favorites by the user
 * 
 * NOTE: Favorites functionality has been migrated to use Supabase instead of Firebase.
 * The fetching and removing of saved centers is now handled via the Supabase 'favorites' table.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/AppNavigator';
import AppHeader from '../../components/AppHeader';

import { getSavedCenters, unsaveCenter } from '../../services/supabase/favoriteService';
import { fetchCenterDetails, Center } from '../../services/supabase/centerService';
import { useAuth } from '../../services/authContext';

type SavedCentersNavigationProp = StackNavigationProp<SettingsStackParamList>;

const SavedCentersScreen = ({ navigation }: NativeStackScreenProps<ProfileStackParamList, 'SavedCenters'>) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedCenters, setSavedCenters] = useState<Center[]>([]);

  // Use this to load centers on initial mount
  useEffect(() => {
    loadSavedCenters();
  }, []);

  // Use this to reload centers when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[SavedCenters] Screen focused, reloading centers');
      loadSavedCenters();
      return () => {
        // cleanup if needed
      };
    }, [user?.id])
  );

  const loadSavedCenters = async () => {
    setIsLoading(true);
    try {
      if (!user?.id) {
        console.error('User ID is missing');
        return;
      }

      console.log(`[SavedCenters] Loading saved centers for user: ${user.id}`);
      
      // Get saved center IDs from favoriteService
      const savedCenterIds = await getSavedCenters(user.id);
      console.log(`[SavedCenters] Found ${savedCenterIds.length} saved centers:`, 
        savedCenterIds.map(c => c.id).join(', '));
      
      // Fetch full center details for each ID
      const centerDetails: Center[] = [];
      for (const savedCenter of savedCenterIds) {
        console.log(`[SavedCenters] Fetching details for center: ${savedCenter.id}`);
        const center = await fetchCenterDetails(savedCenter.id);
        if (center) {
          console.log(`[SavedCenters] Successfully fetched details for: ${center.name}`);
          centerDetails.push(center);
        } else {
          console.log(`[SavedCenters] No details found for center: ${savedCenter.id}`);
        }
      }

      console.log(`[SavedCenters] Loaded ${centerDetails.length} centers with details`);
      setSavedCenters(centerDetails);
    } catch (error) {
      console.error('[SavedCenters] Error loading saved centers:', error);
      Alert.alert('Error', 'Failed to load saved centers');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSavedCenters();
  };

  const handleUnsaveCenter = async (centerId: string) => {
    try {
      if (!user?.id) return;

      Alert.alert(
        'Remove from Saved',
        'Are you sure you want to remove this center from your saved list?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const success = await unsaveCenter(user.id, centerId);
              if (success) {
                // Remove from local state
                setSavedCenters(prev => prev.filter(center => center.id !== centerId));
              } else {
                Alert.alert('Error', 'Failed to remove center from saved list');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error unsaving center:', error);
      Alert.alert('Error', 'Failed to remove center from saved list');
    }
  };

  const handleViewCenter = useCallback((centerId: string) => {
    if (!centerId) return;
    
    // Navigate to CenterDetail using CommonActions for cross-stack navigation
    navigation.dispatch(
      CommonActions.navigate({
        name: 'CenterDetail',
        params: { centerId }
      })
    );
  }, [navigation]);

  const renderCenterItem = ({ item }: { item: Center }) => (
    <TouchableOpacity
      style={styles.centerItem}
      onPress={() => handleViewCenter(item.id)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.image || item.images?.[0] || 'https://via.placeholder.com/150' }}
        style={styles.centerImage}
        resizeMode="cover"
      />
      <View style={styles.centerInfo}>
        <View style={styles.centerHeaderRow}>
          <Text style={styles.centerName} numberOfLines={1}>
            {item.name}
          </Text>
          
          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => handleUnsaveCenter(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="heart" size={24} color="#FF5757" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.centerAddress} numberOfLines={1}>
            {item.address || item.location || 'Address not available'}
          </Text>
        </View>
        
        <View style={styles.detailsRow}>
          {item.price && (
            <View style={styles.priceContainer}>
              <Ionicons name="cash-outline" size={14} color="#118347" />
              <Text style={styles.priceText}>₹{item.price}</Text>
            </View>
          )}
          
          {typeof item.category === 'object' && item.category?.name ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category.name}</Text>
            </View>
          ) : (
            item.activities && item.activities.length > 0 && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.activities[0]}</Text>
              </View>
            )
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => {
    const navigation = useNavigation();
    
    const handleExploreCenters = () => {
      navigation.dispatch(
        CommonActions.navigate({
          name: 'HomeMain'
        })
      );
    };
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>No Saved Centers</Text>
        <Text style={styles.emptyMessage}>
          You haven't saved any fitness centers yet. Save your favorite centers to quickly access them later.
        </Text>
        <TouchableOpacity 
          style={styles.exploreCentersButton} 
          onPress={handleExploreCenters}
          activeOpacity={0.8}
        >
          <Text style={styles.exploreCentersButtonText}>Explore Centers</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Saved Centers"
        showBackButton={true}
      />
      
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#118347" />
          <Text style={styles.loadingText}>Loading saved centers...</Text>
        </View>
      ) : savedCenters.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={savedCenters}
          renderItem={renderCenterItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#118347']}
              tintColor="#118347"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  exploreCentersButton: {
    backgroundColor: '#118347',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreCentersButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  centerItem: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  centerImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0f0f0',
  },
  centerInfo: {
    padding: 16,
  },
  centerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  centerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  heartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 87, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  centerAddress: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#118347',
    marginLeft: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(17, 131, 71, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#118347',
    fontWeight: '500',
  },
});

export default SavedCentersScreen; 