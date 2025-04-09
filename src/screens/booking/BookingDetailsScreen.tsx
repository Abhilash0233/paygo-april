import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BookingsStackParamList } from '../../navigation/BookingsStack';
import { useAuth } from '../../services/authContext';
import { fetchCenterDetails } from '../../services/supabase/centerService';
import { cancelBooking } from '../../services/supabase/bookingService';
import CancellationSuccessOverlay from '../../components/CancellationSuccessOverlay';
import AppHeader from '../../components/AppHeader';

interface BookingDetails {
  id: string;
  centerName: string;
  date: string;
  timeSlot: string;
  price: string;
  status: string;
  sessionType?: string;
  centerId: string;
  centerAddress?: string;
  centerLocation?: {
    latitude: number;
    longitude: number;
  };
  userDisplayName?: string;
  userId?: string;
  paymentMethod?: string;
  createdAt?: string;
  categoryType?: string;
  bookingId?: string;
}

type BookingDetailsNavigationProp = StackNavigationProp<BookingsStackParamList, 'BookingDetails'>;
type BookingDetailsRouteProp = RouteProp<BookingsStackParamList, 'BookingDetails'>;

export default function BookingDetailsScreen() {
  const navigation = useNavigation<BookingDetailsNavigationProp>();
  const route = useRoute<BookingDetailsRouteProp>();
  const { bookingData } = route.params || {};
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  
  // Handle opening maps for directions
  const handleGetDirections = () => {
    if (!booking?.centerLocation) {
      Alert.alert('Error', 'Location coordinates not available for this center');
      return;
    }

    const { latitude, longitude } = booking.centerLocation;
    const label = encodeURIComponent(booking.centerName);
    
    let url: string;
    if (Platform.OS === 'ios') {
      // Apple Maps
      url = `maps://app?daddr=${latitude},${longitude}&q=${label}`;
    } else {
      // Google Maps
      url = `google.navigation:q=${latitude},${longitude}&q=${label}`;
    }

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps web URL if native maps app doesn't work
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${label}`;
        Linking.openURL(webUrl);
      }
    }).catch((err) => {
      console.error('Error opening maps:', err);
      Alert.alert('Error', 'Could not open maps application');
    });
  };
  
  // Load booking details
  useEffect(() => {
    const loadBookingDetails = async () => {
      try {
        setLoading(true);
        
        if (!route.params || !route.params.bookingData) {
          console.error('No booking data provided in navigation params');
          Alert.alert('Error', 'Could not load booking details. Missing data.');
          navigation.goBack();
          return;
        }
        
        const { bookingData } = route.params;
        if (!bookingData.id || !bookingData.centerName || !bookingData.date || !bookingData.timeSlot) {
          console.error('Incomplete booking data provided:', bookingData);
          Alert.alert('Error', 'Booking details are incomplete');
          navigation.goBack();
          return;
        }

        // Fetch center details to get location data
        const centerDetails = await fetchCenterDetails(bookingData.centerId);
        
        // Create booking object with center details
        const bookingWithLocation: BookingDetails = {
          ...bookingData,
          centerAddress: centerDetails?.address || bookingData.centerAddress,
          centerLocation: centerDetails ? {
            latitude: centerDetails.latitude as number,
            longitude: centerDetails.longitude as number
          } : undefined
        };
        
        setBooking(bookingWithLocation);
      } catch (error) {
        console.error('Error loading booking details:', error);
        Alert.alert('Error', 'Could not load booking details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    
    loadBookingDetails();
  }, [bookingData, route.params]);
  
  // Format date for display
  const formatBookingDate = (dateString: string) => {
    return format(parseISO(dateString), 'EEE, MMM d');
  };
  
  // Handle booking cancellation
  const handleCancelBooking = () => {
    if (!booking) return;

    if (!canCancel(booking.date, booking.timeSlot)) {
      Alert.alert(
        'Cannot Cancel Booking',
        `Cancellation is not available as your session starts in ${getTimeUntilBooking(booking.date, booking.timeSlot)}.\n\nOnly bookings more than 1 hour before the session can be cancelled.`
      );
      return;
    }

    setShowCancelModal(true);
  };

  // Handle actual cancellation
  const handleConfirmCancellation = async () => {
    try {
      setIsCancelling(true);
      
      console.log('Cancelling booking:', booking?.id);
      const result = await cancelBooking(booking?.id || '', user?.id || '');

      // Update for Supabase implementation
      const successMessage = result.message || 'Booking cancelled successfully';
      
      // Show success overlay
      setShowCancelSuccess(true);
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', 'There was a problem cancelling your booking. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle close of success overlay
  const handleCloseSuccessOverlay = () => {
    setShowCancelSuccess(false);
    // Navigate back to bookings list
    navigation.goBack();
  };
  
  // Helper function to convert 12-hour time to 24-hour format
  function convertTo24Hour(timeSlot: string) {
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) {
      return { hours: hours + 12, minutes };
    } else if (period === 'AM' && hours === 12) {
      return { hours: 0, minutes };
    }
    return { hours, minutes };
  }

  // Check if booking can be cancelled (more than 1 hour before)
  const canCancel = (dateString: string, timeSlot: string) => {
    const now = new Date();
    now.setSeconds(0, 0); // Reset seconds and milliseconds for fair comparison
    const bookingDate = parseISO(dateString);
    
    // Parse time slot to set hours and minutes
    const { hours, minutes } = convertTo24Hour(timeSlot);
    bookingDate.setHours(hours, minutes, 0, 0);
    
    // Calculate time difference in minutes
    const diffInMinutes = differenceInMinutes(bookingDate, now);
    return diffInMinutes > 60;
  };

  // Get time until booking
  const getTimeUntilBooking = (dateString: string, timeSlot: string): string => {
    const now = new Date();
    const bookingDate = parseISO(dateString);
    
    // Parse time slot to set hours and minutes
    const { hours, minutes } = convertTo24Hour(timeSlot);
    bookingDate.setHours(hours, minutes, 0, 0);
    
    // Calculate time difference
    const diffInHours = differenceInHours(bookingDate, now);
    const diffInMinutes = differenceInMinutes(bookingDate, now) % 60;
    
    if (diffInHours > 0) {
      return `${diffInHours}h ${diffInMinutes}m`;
    }
    return `${diffInMinutes}m`;
  };
  
  return (
    <View style={styles.container}>
      <AppHeader
        title="Booking Details"
        showBackButton={true}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#118347" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      ) : booking ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Banner */}
          <View style={[
            styles.statusBanner,
            booking.status === 'cancelled' ? styles.cancelledBanner :
            booking.status === 'completed' ? styles.completedBanner :
            styles.confirmedBanner
          ]}>
            <Text style={styles.statusText}>
              {booking.status === 'cancelled' ? 'Cancelled' :
               booking.status === 'completed' ? 'Completed' :
               'Confirmed'}
            </Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Center Info */}
            <View style={styles.section}>
              <Text style={styles.centerName}>{booking.centerName}</Text>
              <View style={styles.categoryContainer}>
                <Text style={styles.categoryType}>
                  {booking.sessionType || 'Session'}
                </Text>
                {booking.categoryType && (
                  <>
                    <View style={styles.categoryDot} />
                    <Text style={styles.categoryType}>{booking.categoryType}</Text>
                  </>
                )}
              </View>
            </View>

            {/* Essential Details */}
            <View style={styles.essentialDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Booking ID</Text>
                <Text style={styles.detailValue}>{booking.bookingId || `BK${booking.id.substring(0, 8).toUpperCase()}`}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {formatBookingDate(booking.date)} • {booking.timeSlot}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Amount Paid</Text>
                <Text style={styles.detailValue}>₹{booking.price}</Text>
              </View>
            </View>

            {/* Location Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.address}>{booking.centerAddress || 'Address not available'}</Text>
              
              {/* Action Buttons - Side by Side */}
              <View style={styles.actionButtonsRow}>
                {booking.centerLocation && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.directionsButton]}
                    onPress={handleGetDirections}
                  >
                    <Ionicons name="navigate-outline" size={20} color="#118347" />
                    <Text style={styles.directionsText}>Directions</Text>
                  </TouchableOpacity>
                )}
                
                {booking.status === 'confirmed' && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.qrButton]}
                    onPress={() => navigation.navigate('QRScanner', { 
                      bookingId: booking.bookingId || `BK${booking.id.substring(0, 8).toUpperCase()}`
                    })}
                  >
                    <Ionicons name="qr-code-outline" size={20} color="#fff" />
                    <Text style={styles.qrButtonText}>Show QR Code</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* User Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Details</Text>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{booking.userDisplayName || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{user?.phone_number || 'N/A'}</Text>
              </View>
            </View>

            {/* Cancellation Action */}
            {booking.status === 'confirmed' && (
              <View style={styles.actionsSection}>
                {canCancel(booking.date, booking.timeSlot) ? (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelBooking}
                  >
                    <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.cancellationNotice}>
                    Cancellation is not available as your session starts in {getTimeUntilBooking(booking.date, booking.timeSlot)}
                  </Text>
                )}
              </View>
            )}

            {/* Cancellation Policies */}
            <View style={styles.policiesSection}>
              <Text style={styles.policiesTitle}>Cancellation Policy</Text>
              <View style={styles.policyItems}>
                <View style={styles.policyItem}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#118347" />
                  <Text style={styles.policyText}>Free cancellation up to 1 hour before session</Text>
                </View>
                <View style={styles.policyItem}>
                  <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                  <Text style={styles.policyText}>No refund within 1 hour of session start</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Unable to load booking details</Text>
        </View>
      )}
      
      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowCancelModal(false)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Booking</Text>
              <TouchableOpacity
                onPress={() => setShowCancelModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMessage}>
              Are you sure you want to cancel this booking? Refund will be processed according to the cancellation policy.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setShowCancelModal(false)}
                disabled={isCancelling}
              >
                <Text style={styles.modalSecondaryButtonText}>No, Keep it</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleConfirmCancellation}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Cancellation Success Overlay */}
      <CancellationSuccessOverlay
        isVisible={showCancelSuccess}
        onClose={handleCloseSuccessOverlay}
        refundAmount={refundAmount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
  },
  confirmedBanner: {
    backgroundColor: '#E8F5EE',
  },
  completedBanner: {
    backgroundColor: '#F5F5F5',
  },
  cancelledBanner: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#118347',
  },
  mainContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  centerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryType: {
    fontSize: 15,
    color: '#666',
  },
  categoryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    marginHorizontal: 8,
  },
  essentialDetails: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailItem: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  address: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  directionsButton: {
    backgroundColor: '#F5F5F5',
  },
  directionsText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
    color: '#118347',
  },
  actionsSection: {
    gap: 12,
    marginTop: 8,
  },
  qrButton: {
    backgroundColor: '#118347',
  },
  qrButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  cancellationNotice: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.3,
  },
  modalMessage: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  modalSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    letterSpacing: -0.2,
  },
  modalPrimaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
  },
  modalPrimaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  policiesSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  policiesTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  policyItems: {
    gap: 12,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  policyText: {
    fontSize: 15,
    color: '#666',
    flex: 1,
  },
}); 