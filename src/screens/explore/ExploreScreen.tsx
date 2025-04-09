import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  FlatList,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuth } from '../../services/authContext';

// Define the type for fitness center to fix TypeScript errors
interface FitnessCenter {
  id: string;
  name: string;
  distance: string;
  rating: number;
  activities: string[];
  price: string;
  image: string;
  categoryIds?: string[]; // Add optional categoryIds property
  category?: string;      // Add optional category property
}

// Sample data for fitness centers
const fitnessCenters: FitnessCenter[] = [
  { 
    id: '1', 
    name: 'Ultimate Fitness', 
    distance: '0.5 km',
    rating: 4.8,
    activities: ['Gym', 'Yoga', 'Zumba'],
    price: '$12/hr',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
    categoryIds: ['sQ6oSzSLjXMms5rkZas3', 'KAXkfpShsnvGZkOnmA1B', 'nTdXIRaJdi9bk2V5RFBp'],
    category: 'Gym'
  },
  { 
    id: '2', 
    name: 'Yoga Haven', 
    distance: '1.2 km',
    rating: 4.5,
    activities: ['Yoga', 'Meditation'],
    price: '$15/hr',
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'
  },
  { 
    id: '3', 
    name: 'SportZone', 
    distance: '2.1 km',
    rating: 4.7,
    activities: ['Badminton', 'Cricket', 'Swimming'],
    price: '$18/hr',
    image: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'
  },
  { 
    id: '4', 
    name: 'AquaLife Center', 
    distance: '3.5 km',
    rating: 4.4,
    activities: ['Swimming', 'Aqua Yoga'],
    price: '$20/hr',
    image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'
  },
  { 
    id: '5', 
    name: 'Total Fitness', 
    distance: '1.8 km',
    rating: 4.3,
    activities: ['Gym', 'Pickle Ball', 'Zumba'],
    price: '$10/hr',
    image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'
  },
];

// Sample data for activity filters
const activityFilters = [
  { id: '1', name: 'All', icon: 'grid-outline' },
  { id: '2', name: 'Gym', icon: 'fitness-outline' },
  { id: '3', name: 'Yoga', icon: 'body-outline' },
  { id: '4', name: 'Swimming', icon: 'water-outline' },
  { id: '5', name: 'Badminton', icon: 'tennisball-outline' },
  { id: '6', name: 'Cricket', icon: 'baseball-outline' },
  { id: '7', name: 'Zumba', icon: 'musical-notes-outline' },
  { id: '8', name: 'Pickle Ball', icon: 'basketball-outline' },
];

function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const navigation = useNavigation();
  const { isAuthenticated, user } = useAuth();
  
  // Handle book now press with authentication check
  const handleBookPress = () => {
    // Check if user is logged in
    if (!isAuthenticated || !user) {
      // Show login prompt for guest users
      Alert.alert(
        'Login Required',
        'Please login to book a slot at this fitness center.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Login', 
            onPress: () => {
              // Reset navigation to Auth stack
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'PhoneAuth' }],
                })
              );
            }
          }
        ]
      );
      return;
    }
    
    // Here you would navigate to booking flow for authenticated users
    // For now just show an alert since we don't have the full implementation in this file
    Alert.alert('Success', 'Navigating to booking...');
  };
  
  // Filter centers based on selected activity
  const filteredCenters = selectedFilter === 'All' 
    ? fitnessCenters 
    : fitnessCenters.filter(center => {
        // Check categoryIds first (preferred way)
        if (center.categoryIds && Array.isArray(center.categoryIds)) {
          // Map activity names to category IDs
          const activityToCategoryId: Record<string, string> = {
            'Gym': 'sQ6oSzSLjXMms5rkZas3',
            'Yoga': 'KAXkfpShsnvGZkOnmA1B',
            'Swimming': 'BUHmESFNcDQAegfe1KzG',
            'Badminton': 'gEKSpljWohdeHzvMsAaC', 
            'Cricket': 'WRBTK2Yeep3yU7aB0uWF',
            'Zumba': 'nTdXIRaJdi9bk2V5RFBp',
            'Pickle Ball': 'M0NXlQRIutO2fJzZg0sa'
          };
          
          const categoryId = activityToCategoryId[selectedFilter];
          if (categoryId) {
            return center.categoryIds.some((id: string) => 
              String(id).toLowerCase() === categoryId.toLowerCase()
            );
          }
        }
        
        // Fallback to category string if no match found in categoryIds
        if (typeof center.category === 'string') {
          return center.category.includes(selectedFilter);
        }
        
        // Last resort, check activities array
        return center.activities && center.activities.includes(selectedFilter);
      });

  const renderCenterItem = ({ item }: { item: typeof fitnessCenters[0] }) => (
    <TouchableOpacity style={styles.centerCard}>
      <Image
        source={{ uri: item.image }}
        style={styles.centerImage}
      />
      <View style={styles.centerInfo}>
        <Text style={styles.centerName}>{item.name}</Text>
        
        <View style={styles.centerActivities}>
          {item.activities.slice(0, 3).map((activity, index) => (
            <View key={`${item.id}-${activity}`} style={styles.activityBadge}>
              <Text style={styles.activityBadgeText}>{activity}</Text>
            </View>
          ))}
          {item.activities.length > 3 && (
            <Text style={styles.moreActivities}>+{item.activities.length - 3}</Text>
          )}
        </View>
        
        <View style={styles.centerMetaContainer}>
          <View style={styles.centerMeta}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.centerMetaText}>{item.distance}</Text>
          </View>
          <View style={styles.centerMeta}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.centerMetaText}>{item.rating}</Text>
          </View>
          <View style={styles.centerMeta}>
            <Ionicons name="cash-outline" size={14} color="#666" />
            <Text style={styles.centerMetaText}>{item.price}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={handleBookPress}
        >
          <Text style={styles.bookButtonText}>Book Slot</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSubtitle}>Find the perfect fitness center near you</Text>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search fitness centers, activities..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {activityFilters.map((filter) => (
            <TouchableOpacity 
              key={filter.id} 
              style={[
                styles.filterButton,
                selectedFilter === filter.name && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter.name)}
            >
              <Ionicons 
                name={filter.icon as any} 
                size={16} 
                color={selectedFilter === filter.name ? '#FFF' : '#666'} 
              />
              <Text 
                style={[
                  styles.filterText,
                  selectedFilter === filter.name && styles.filterTextActive
                ]}
              >
                {filter.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Results */}
      <FlatList
        data={filteredCenters}
        renderItem={renderCenterItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.centersList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    marginBottom: 12,
  },
  filtersScrollContent: {
    paddingHorizontal: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  filterButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  filterText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  filterTextActive: {
    color: '#FFF',
  },
  centersList: {
    padding: 16,
  },
  centerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  centerImage: {
    width: '100%',
    height: 160,
  },
  centerInfo: {
    padding: 16,
  },
  centerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  centerActivities: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  activityBadge: {
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  activityBadgeText: {
    fontSize: 12,
    color: '#0066CC',
  },
  moreActivities: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'center',
  },
  centerMetaContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  centerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  centerMetaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  bookButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ExploreScreen; 