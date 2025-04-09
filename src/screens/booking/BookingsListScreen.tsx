import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Linking,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format, isAfter, parseISO } from 'date-fns';
import { getPastBookings, cancelBooking } from '../../services/supabase/bookingService';
import { fetchCenterDetails } from '../../services/supabase/centerService';
import { useAuth } from '../../services/authContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { BookingsStackParamList } from '../../navigation/BookingsStack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';

// Define booking interface
interface Booking {
  id: string;
  centerId: string;
  centerName: string;
  date: string;
  timeSlot: string;
  price: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'in-progress';
  createdAt: string;
  sessionType?: string;
  userDisplayName?: string;
  hasBeenRescheduled: boolean;
  attendanceMarked?: boolean;
  attendanceTime?: any;
  centerAddress?: string;
  centerLocation?: { latitude: number; longitude: number };
  bookingId?: string;
  userId?: string;
  paymentMethod?: string;
}

export default function BookingsListScreen() {
  const navigation = useNavigation<StackNavigationProp<BookingsStackParamList, 'BookingsList'>>();
  const { user, isAuthenticated, isGuestMode } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const filterAnimatedValue = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Convert 12-hour format to 24-hour format
  const convertTo24Hour = (timeStr: string): { hours: number, minutes: number } => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(num => parseInt(num));
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return { hours, minutes };
  };

  // Load user bookings
  const loadBookings = async () => {
    try {
      if (!isAuthenticated || !user) {
        console.error('User not authenticated for loading bookings');
        Alert.alert('Authentication Required', 'Please log in to view your bookings.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      setLoading(true);
      const userBookings = await getPastBookings(user.id);
      
      // Process bookings to determine if they're past
      const processedBookings = userBookings.map((booking: any) => {
        const bookingDate = parseISO(booking.date);
        const { hours, minutes } = convertTo24Hour(booking.timeSlot);
        bookingDate.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        now.setSeconds(0, 0); // Reset seconds and milliseconds for fair comparison
        
        // Check if booking is in the past
        const isPast = bookingDate < now;
        
        return {
          ...booking,
          // Only mark as completed if it's confirmed and in the past
          status: booking.status === 'confirmed' && isPast ? 'completed' : booking.status
        };
      });
      
      // Sort bookings: confirmed future dates first, then past/completed/cancelled
      const sortedBookings = processedBookings.sort((a: any, b: any) => {
        const dateA = parseISO(a.date);
        const timeA = convertTo24Hour(a.timeSlot);
        dateA.setHours(timeA.hours, timeA.minutes, 0, 0);
        
        const dateB = parseISO(b.date);
        const timeB = convertTo24Hour(b.timeSlot);
        dateB.setHours(timeB.hours, timeB.minutes, 0, 0);
        
        const now = new Date();
        now.setSeconds(0, 0);
        
        const aIsFuture = dateA > now && a.status === 'confirmed';
        const bIsFuture = dateB > now && b.status === 'confirmed';
        
        if (aIsFuture && !bIsFuture) return -1;
        if (!aIsFuture && bIsFuture) return 1;
        
        // If both are future or both are past, sort by date
        return dateA.getTime() - dateB.getTime();
      });
      
      setBookings(sortedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load your bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!isAuthenticated || !user) {
      console.error('User not authenticated for cancelling booking');
      Alert.alert('Authentication Required', 'Please log in to cancel your booking.');
      return;
    }
    
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? The amount will be refunded to your wallet.',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Show loading state
              setLoading(true);
              
              // Cancel booking and get refund amount
              const result = await cancelBooking(bookingId, user.id);
              
              // Refresh the bookings list
              await loadBookings();
              
              // Show success message with refund amount
              Alert.alert(
                'Booking Cancelled',
                `Your booking has been cancelled successfully.\n\n₹${result.message.includes('₹') ? result.message.split('₹')[1].split(' ')[0] : '0'} has been refunded to your wallet.`,
                [
                  {
                    text: 'OK'
                  }
                ]
              );
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Navigate to booking details
  const handleViewBookingDetails = (booking: Booking) => {
    navigation.navigate('BookingDetails', { 
      bookingId: booking.id,
      bookingData: {
        id: booking.id,
        bookingId: booking.bookingId || booking.id, // Use generated ID if available, fallback to document ID
        centerName: booking.centerName,
        date: booking.date,
        timeSlot: booking.timeSlot,
        price: booking.price.toString(),
        status: booking.status,
        sessionType: booking.sessionType,
        centerId: booking.centerId,
        centerAddress: booking.centerAddress,
        centerLocation: booking.centerLocation,
        userDisplayName: booking.userDisplayName,
        userId: booking.userId,
        paymentMethod: booking.paymentMethod || 'Wallet',
        createdAt: booking.createdAt
      }
    });
  };
  
  // Filter bookings based on active filter
  const getFilteredBookings = () => {
    const now = new Date();
    now.setSeconds(0, 0); // Reset seconds and milliseconds for fair comparison
    
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.date);
      const { hours, minutes } = convertTo24Hour(booking.timeSlot);
      bookingDate.setHours(hours, minutes, 0, 0);
      
      // For upcoming bookings: must be confirmed AND in the future
      if (activeFilter === 'upcoming') {
        return booking.status === 'confirmed' && bookingDate > now;
      }
      
      // For past bookings: either completed/cancelled OR confirmed but in the past
      if (activeFilter === 'past') {
        return booking.status === 'completed' || 
               booking.status === 'cancelled' || 
               (booking.status === 'confirmed' && bookingDate <= now);
      }
      
      // For 'all', return everything
      return true;
    });
  };

  // Format date to readable string
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'EEE, MMM d');
  };

  // Check if a booking is in the past
  const isBookingPast = (dateString: string, timeSlot: string) => {
    const now = new Date();
    now.setSeconds(0, 0); // Reset seconds and milliseconds for fair comparison
    const bookingDate = parseISO(dateString);
    
    // Set booking date hours and minutes based on time slot
    const { hours, minutes } = convertTo24Hour(timeSlot);
    bookingDate.setHours(hours, minutes, 0, 0);
    
    return !isAfter(bookingDate, now);
  };

  // Check if booking can be cancelled (more than 1 hour before)
  const canCancel = (dateString: string, timeSlot: string) => {
    const now = new Date();
    now.setSeconds(0, 0); // Reset seconds and milliseconds for fair comparison
    const bookingDate = parseISO(dateString);
    
    // Parse time slot to set hours and minutes
    const { hours, minutes } = convertTo24Hour(timeSlot);
    bookingDate.setHours(hours, minutes, 0, 0);
    
    // Check if booking is more than 1 hour away
    const hoursDiff = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 1;
  };

  // Helper function to format time until booking
  const getTimeUntilBooking = (dateString: string, timeSlot: string): string => {
    const now = new Date();
    const bookingDate = new Date(dateString);
    
    // Parse time slot to set hours
    const { hours, minutes } = convertTo24Hour(timeSlot);
    bookingDate.setHours(hours, minutes);
    
    // Calculate difference in milliseconds
    const diffMs = bookingDate.getTime() - now.getTime();
    
    if (diffMs < 0) return '';
    
    // Convert to days/hours
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  };

  // Handler to open Google Maps directions
  const handleGetDirections = async (centerId: string) => {
    try {
      // Show loading indicator
      setLoading(true);
      
      // Fetch center details to get coordinates
      const centerDetails = await fetchCenterDetails(centerId);
      
      if (centerDetails?.latitude && centerDetails?.longitude) {
        // Format for Google Maps URL
        const url = `https://www.google.com/maps/dir/?api=1&destination=${centerDetails.latitude},${centerDetails.longitude}`;
        Linking.openURL(url).catch(err => {
          console.error('Error opening Google Maps:', err);
          Alert.alert('Error', 'Unable to open Google Maps. Please try again.');
        });
      } else {
        Alert.alert('Error', 'Location coordinates not available for this center.');
      }
    } catch (error) {
      console.error('Error getting directions:', error);
      Alert.alert('Error', 'Unable to retrieve center location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if QR scanner should be available (within 1 hour of booking)
  const isQrScannerAvailable = (dateString: string, timeSlot: string): boolean => {
    const now = new Date();
    const bookingDate = new Date(dateString);
    const { hours, minutes } = convertTo24Hour(timeSlot);
    bookingDate.setHours(hours, minutes);
    
    // Calculate time difference in minutes
    const diffMs = bookingDate.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    
    // Return true if booking is within the next hour
    return diffMinutes <= 60 && diffMinutes > -60; // Allow scanning up to 1 hour after start time
  };

  // Render each booking item
  const renderBookingItem = ({ item }: { item: Booking }) => {
    const isConfirmed = item.status === 'confirmed';
    const isCancelled = item.status === 'cancelled';
    const bookingDate = parseISO(item.date);
    const { hours, minutes } = convertTo24Hour(item.timeSlot);
    bookingDate.setHours(hours, minutes, 0, 0);
    const now = new Date();
    now.setSeconds(0, 0); // Reset seconds and milliseconds for fair comparison
    const isPast = !isAfter(bookingDate, now);
    
    return (
      <TouchableOpacity 
        style={[
          styles.bookingCard,
          isCancelled && styles.cancelledBookingCard,
          isPast && !isCancelled && styles.pastBookingCard
        ]}
        onPress={() => handleViewBookingDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingHeaderLeft}>
            <Text style={styles.centerName} numberOfLines={1}>{item.centerName}</Text>
            {item.sessionType && (
              <Text style={styles.sessionType}>{item.sessionType}</Text>
            )}
          </View>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge, 
              isCancelled ? styles.cancelledBadge : 
              isPast ? styles.completedBadge : 
              styles.confirmedBadge
            ]}>
              <Text style={[
                styles.statusText,
                isCancelled ? styles.cancelledText :
                isPast ? styles.completedText :
                styles.confirmedText
              ]}>
                {isCancelled ? 'Cancelled' : 
                 isPast ? 'Completed' : 
                 'Confirmed'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="calendar-outline" size={16} color="#118347" />
            </View>
            <Text style={styles.detailText}>{format(bookingDate, 'EEE, MMM d')}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="time-outline" size={16} color="#118347" />
            </View>
            <Text style={styles.detailText}>{item.timeSlot}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="wallet-outline" size={16} color="#118347" />
            </View>
            <Text style={styles.detailText}>₹{item.price}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render filter tabs
  const renderFilterTabs = () => {
    // Count bookings for each category
    const upcomingCount = bookings.filter(booking => {
      const bookingDate = parseISO(booking.date);
      const { hours, minutes } = convertTo24Hour(booking.timeSlot);
      bookingDate.setHours(hours, minutes, 0, 0);
      const now = new Date();
      now.setSeconds(0, 0); // Reset seconds and milliseconds for fair comparison
      return booking.status === 'confirmed' && isAfter(bookingDate, now);
    }).length;
    
    const pastCount = bookings.filter(booking => {
      const bookingDate = parseISO(booking.date);
      const { hours, minutes } = convertTo24Hour(booking.timeSlot);
      bookingDate.setHours(hours, minutes, 0, 0);
      const now = new Date();
      now.setSeconds(0, 0); // Reset seconds and milliseconds for fair comparison
      return booking.status === 'completed' || 
             booking.status === 'cancelled' || 
             (booking.status === 'confirmed' && !isAfter(bookingDate, now));
    }).length;
    
    return (
      <>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'all' && styles.activeFilterTab]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[
            styles.filterText, 
            activeFilter === 'all' && styles.activeFilterText
          ]}>
            All ({bookings.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'upcoming' && styles.activeFilterTab]}
          onPress={() => setActiveFilter('upcoming')}
        >
          <Text style={[
            styles.filterText, 
            activeFilter === 'upcoming' && styles.activeFilterText
          ]}>
            Upcoming ({upcomingCount})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'past' && styles.activeFilterTab]}
          onPress={() => setActiveFilter('past')}
        >
          <Text style={[
            styles.filterText, 
            activeFilter === 'past' && styles.activeFilterText
          ]}>
            Past ({pastCount})
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  // Add section for list components
  const ListHeaderComponent = () => {
    if (activeFilter === 'all') return null;
    
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>
          {activeFilter === 'upcoming' ? 'Your Upcoming Bookings' : 'Your Past Bookings'}
        </Text>
        {activeFilter === 'upcoming' && (
          <Text style={styles.sectionSubtext}>
            Bookings can be cancelled up to 4 hours before the session
          </Text>
        )}
      </View>
    );
  };

  // Empty state component
  const EmptyBookingsList = () => {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons 
            name={activeFilter === 'upcoming' ? 'calendar-outline' : activeFilter === 'past' ? 'time-outline' : 'fitness-outline'} 
            size={44} 
            color="#fff" 
          />
        </View>
        <Text style={styles.emptyTitle}>
          {activeFilter === 'all' 
            ? "No Bookings Yet" 
            : activeFilter === 'upcoming' 
              ? "No Upcoming Bookings" 
              : "No Past Activity"}
        </Text>
        <Text style={styles.emptyText}>
          {activeFilter === 'all' 
            ? "You don't have any bookings yet. Start by booking a fitness center."
            : activeFilter === 'upcoming'
              ? "You don't have any upcoming bookings. Book a fitness center to get started!"
              : "You haven't completed any sessions yet. Your history will appear here."}
        </Text>
      </View>
    );
  };

  useEffect(() => {
    // Animate filter tab change
    Animated.spring(filterAnimatedValue, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40
    }).start(() => {
      filterAnimatedValue.setValue(0);
    });
  }, [activeFilter]);

  // Use this effect to check user status when component mounts
  useEffect(() => {
    if (isGuestMode) {
      // No longer need to show auth sheet here since it's handled at the tab navigation level
    }
  }, [isGuestMode]);

  // Return the screen content - guests will never see this since tab navigation intercepts
  return (
    <View style={styles.container}>
      <AppHeader 
        title="My Bookings"
        showBackButton={false}
      />

      <View style={styles.filterContainer}>
        {renderFilterTabs()}
      </View>

      {loading && bookings.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#118347" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredBookings()}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingItem}
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
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={EmptyBookingsList}
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
  filterTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingHorizontal: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: '#F5F5F5',
  },
  activeFilterTab: {
    backgroundColor: '#E8F5EE',
  },
  filterText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#118347',
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  pastBookingCard: {
    backgroundColor: '#F8FAFF',
    borderColor: '#F0F0F0',
  },
  cancelledBookingCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  bookingHeaderLeft: {
    flex: 1,
  },
  centerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 15,
    color: '#666666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#F5F5F5',
  },
  confirmedBadge: {
    backgroundColor: '#E8F5EE',
  },
  completedBadge: {
    backgroundColor: '#F5F5F5',
  },
  cancelledBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  confirmedText: {
    color: '#118347',
  },
  completedText: {
    color: '#666666',
  },
  cancelledText: {
    color: '#EF4444',
  },
  bookingDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIconContainer: {
    marginRight: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  timeUntilText: {
    color: '#118347',
    fontWeight: '600',
  },
  qrInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  qrIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  qrTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  qrTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#118347',
    marginBottom: 2,
  },
  qrDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  scanQrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  scanQrButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#118347',
    marginRight: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  directionsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#118347',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  bookNowButton: {
    backgroundColor: '#118347',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  bookNowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  rescheduledBadge: {
    backgroundColor: '#F0F0FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  rescheduledText: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
  },
}); 