import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';

// Import the booking service and auth context
import { getUpcomingBookings, getPastBookings, cancelBooking, Booking } from '../../services/supabase/bookingService';
import { useAuth } from '../../services/authContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

type BookingsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

function BookingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<BookingsScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!user) {
      setError("Please log in to view your bookings");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch both upcoming and past bookings
      const [upcomingData, pastData] = await Promise.all([
        getUpcomingBookings(user.id),
        getPastBookings(user.id)
      ]);
      
      // Combine and set bookings
      setBookings([...upcomingData, ...pastData]);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  // Fetch bookings when the screen is focused
  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchBookings();
    }, [fetchBookings])
  );

  // Handle booking cancellation
  const handleCancelBooking = async (bookingId: string) => {
    if (!user) return;

    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking? The amount will be refunded to your wallet.",
      [
        { 
          text: "No", 
          style: "cancel" 
        },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            try {
              const result = await cancelBooking(user.id, bookingId);
              
              if (result.success) {
                Alert.alert("Success", result.message);
                // Refresh bookings
                fetchBookings();
              } else {
                Alert.alert("Error", result.message);
              }
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert("Error", "Failed to cancel booking. Please try again.");
            }
          } 
        }
      ]
    );
  };

  // Filter bookings based on the active tab
  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') {
      return bookings;
    } else if (activeTab === 'upcoming') {
      return bookings.filter(booking => booking.status === 'confirmed');
    } else {
      return bookings.filter(booking => 
        booking.status === 'completed' || booking.status === 'cancelled'
      );
    }
  }, [bookings, activeTab]);

  const renderBookingItem = ({ item }: { item: Booking }) => {
    // Format date and time
    const formattedDate = format(new Date(item.date), 'MMM dd, yyyy');
    
    // Status color
    const statusColor = item.status === 'confirmed' 
      ? '#0066CC' 
      : item.status === 'completed' 
        ? '#34A853' 
        : '#F44336';
    
    const statusBgColor = item.status === 'confirmed' 
      ? 'rgba(0, 102, 204, 0.1)' 
      : item.status === 'completed' 
        ? 'rgba(52, 168, 83, 0.1)' 
        : 'rgba(244, 67, 54, 0.1)';

    // Get status display text
    const statusText = item.status === 'confirmed' 
      ? 'Upcoming' 
      : item.status === 'completed' 
        ? 'Completed' 
        : 'Cancelled';
    
    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.centerInfo}>
            {item.centerImage ? (
              <Image 
                source={{ uri: item.centerImage }} 
                style={styles.centerImage} 
                defaultSource={require('../../assets/placeholder.png')}
              />
            ) : (
              <View style={[styles.centerImage, styles.placeholderImage]}>
                <Ionicons name="business-outline" size={20} color="#999" />
              </View>
            )}
            <View>
              <Text style={styles.activityName}>{item.sessionType}</Text>
              <Text style={styles.centerName}>{item.centerName}</Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{formattedDate}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.timeSlot}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="wallet-outline" size={16} color="#666" />
            <Text style={styles.detailText}>₹{item.price}</Text>
          </View>
        </View>
        
        {item.status === 'confirmed' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => handleCancelBooking(item.bookingId)}
            >
              <Ionicons name="close-outline" size={16} color="#F44336" />
              <Text style={styles.cancelText}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>
      
      {/* Tab Filter */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]} 
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]} 
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchBookings}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        renderItem={renderBookingItem}
        keyExtractor={item => item.bookingId}
        contentContainerStyle={styles.bookingsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            colors={["#0066CC"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming' 
                ? 'No upcoming bookings'
                : activeTab === 'past'
                  ? 'No past bookings'
                  : 'No bookings found'}
            </Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => navigation.navigate('Main', { 
                screen: 'HomeStack',
                params: { screen: 'Home' }
              })}
            >
              <Text style={styles.exploreButtonText}>Find Activities</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#0066CC',
    fontWeight: '600',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    color: '#F44336',
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  bookingsList: {
    padding: 16,
    flexGrow: 1,
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  centerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  centerName: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookingDetails: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flex: 1,
  },
  cancelText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  exploreButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default BookingsScreen; 