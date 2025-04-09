import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
  Animated,
  Pressable,
  StatusBar,
  Image,
  BlurView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import SkeletonView from './SkeletonView';

// Use wallet context
import { useWallet } from '../services/walletContext';

// Get screen dimensions for responsive sizing
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Define the booking preview data interface
interface BookingPreviewData {
  centerId: string;
  centerName: string;
  centerImage?: string;
  date: string;
  formattedDate: string;
  timeSlot: string;
  sessionType: {
    id: string;
    name: string;
    price: number;
    description: string;
  };
  totalAmount: number;
  walletBalance: number;
  centerCategory?: string;
  categoryType?: string; // Type of activity (e.g., Gym, Yoga, etc.)
}

interface BookingPreviewOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onBack: () => void; // Go back to booking screen
  previewData: BookingPreviewData;
  onConfirmBooking: (bookingData: BookingPreviewData) => void;
  isBookingLoading: boolean;
}

export default function BookingPreviewOverlay({ 
  isVisible, 
  onClose, 
  onBack,
  previewData,
  onConfirmBooking,
  isBookingLoading
}: BookingPreviewOverlayProps) {
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [isImageLoading, setIsImageLoading] = useState(true);
  
  // State for booking in progress
  const [isBookingInProgress, setIsBookingInProgress] = React.useState(false);
  
  // State for error message
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  
  // Wallet context
  const { walletBalance, refreshWalletBalance } = useWallet();
  
  // Check if wallet has sufficient balance
  const hasSufficientBalance = walletBalance >= previewData.totalAmount;

  // Slide in animation when visible changes
  useEffect(() => {
    if (isVisible) {
      // Clear any previous error message when overlay becomes visible
      setErrorMessage(null);
      
      // Slide up animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Reset booking in progress state when overlay is hidden
      setIsBookingInProgress(false);
      
      // Slide down animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible]);
  
  // Handle confirm booking
  const handleConfirmBooking = () => {
    // Clear any previous error
    setErrorMessage(null);
    
    if (!hasSufficientBalance) {
      handleAddMoney();
      return;
    }
    
    setIsBookingInProgress(true);
    
    try {
      // Pass booking data to parent for confirmation
      onConfirmBooking(previewData);
    } catch (error) {
      console.error('Error initiating booking:', error);
      setErrorMessage('Failed to process booking. Please try again.');
      setIsBookingInProgress(false);
    }
  };
  
  // Add handler for wallet recharge navigation
  const handleAddMoney = () => {
    // Close the overlay first
    onClose();
    
    // Navigate to wallet recharge screen with required amount
    navigation.dispatch(
      CommonActions.navigate({
        name: 'WalletRecharge',
        params: {
          requiredAmount: previewData.totalAmount,
          returnToBooking: true,
          bookingData: {
            centerId: previewData.centerId,
            centerName: previewData.centerName,
            date: previewData.date,
            timeSlot: previewData.timeSlot,
            sessionType: previewData.sessionType
          }
        }
      })
    );
  };
  
  // Format day from date string
  const formatDay = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEEE');
  };
  
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onBack}
    >
      <StatusBar barStyle="dark-content" />
      
      {/* Semi-transparent background overlay */}
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: overlayOpacity }
        ]}
      >
        <Pressable 
          style={styles.overlayPressable}
          onPress={onClose}
        />
      </Animated.View>
      
      {/* Sliding content */}
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerHandle} />
          <TouchableOpacity 
            onPress={onBack} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Summary</Text>
          <TouchableOpacity 
            onPress={onClose} 
            style={styles.closeButton}
          >
            <Ionicons name="close" size={22} color="#333" />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {/* Center Image */}
          <View style={styles.imageContainer}>
            {isImageLoading && (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color="#118347" />
              </View>
            )}
            <Image
              source={{ uri: previewData.centerImage }}
              style={[
                styles.centerImage,
                isImageLoading && styles.hiddenImage
              ]}
              resizeMode="cover"
              onLoadStart={() => setIsImageLoading(true)}
              onLoadEnd={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />
          </View>
          
          {/* Booking Details Section */}
          <View style={[styles.section, styles.bookingDetailsSection]}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            
            <View style={styles.bookingDetailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="business-outline" size={18} color="#666" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Center</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>{previewData.centerName}</Text>
            </View>
            
            <View style={styles.bookingDetailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="calendar-outline" size={18} color="#666" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Date</Text>
              </View>
              <Text style={styles.detailValue}>
                {previewData.formattedDate} ({formatDay(previewData.date)})
              </Text>
            </View>
            
            <View style={styles.bookingDetailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="time-outline" size={18} color="#666" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Time</Text>
              </View>
              <Text style={styles.detailValue}>{previewData.timeSlot}</Text>
            </View>
          </View>
          
          {/* Payment Details Section */}
          <View style={[styles.section, styles.bookingDetailsSection, styles.paymentSection]}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            
            <View style={styles.bookingDetailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="fitness-outline" size={18} color="#666" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>{previewData.sessionType.name}</Text>
              </View>
              <Text style={styles.detailValue}>₹{previewData.totalAmount}</Text>
            </View>
            
            <View style={styles.bookingDetailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="cash-outline" size={18} color="#333" style={styles.detailIcon} />
                <Text style={[styles.detailLabel, styles.totalLabel]}>Total Amount</Text>
              </View>
              <Text style={styles.totalValue}>₹{previewData.totalAmount}</Text>
            </View>
            
            <View style={styles.walletBalanceRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="wallet-outline" size={18} color="#666" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Wallet Balance</Text>
              </View>
              <Text style={[
                styles.walletBalance,
                !hasSufficientBalance && styles.insufficientBalance
              ]}>
                ₹{walletBalance}
              </Text>
            </View>
            
            {!hasSufficientBalance && (
              <View style={styles.insufficientBalanceBox}>
                <View style={styles.insufficientBalanceHeader}>
                  <Ionicons name="alert-circle-outline" size={18} color="#D32F2F" />
                  <Text style={styles.insufficientBalanceTitle}>Insufficient Balance</Text>
                </View>
                <Text style={styles.insufficientBalanceWarning}>
                  You need ₹{(previewData.totalAmount - walletBalance).toFixed(2)} more to complete this booking.
                </Text>
                <TouchableOpacity 
                  style={styles.addMoneyInlineButton}
                  onPress={handleAddMoney}
                >
                  <Ionicons name="wallet-outline" size={16} color="#FFFFFF" style={{marginRight: 4}} />
                  <Text style={styles.addMoneyInlineButtonText}>Add Money Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Divider */}
          <View style={styles.divider} />
          
          {/* Cancellation Policy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cancellation Policy</Text>
            
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#118347" style={styles.policyIcon} />
              <Text style={styles.policyText}>Free cancellation up to 4 hours before the session</Text>
            </View>
            
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#118347" style={styles.policyIcon} />
              <Text style={styles.policyText}>50% refund for cancellations between 2-4 hours before the session</Text>
            </View>
            
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#118347" style={styles.policyIcon} />
              <Text style={styles.policyText}>No refund for cancellations within 2 hours of the session</Text>
            </View>
          </View>
          
          {/* Error message */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            </View>
          )}
          
          {/* Extra space at the bottom for the fixed footer */}
          <View style={{ height: 100 }} />
        </ScrollView>
        
        {/* Footer with confirm button */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerPriceContainer}>
              <Text style={styles.footerPriceLabel}>Total</Text>
              <Text style={styles.footerPrice}>₹{previewData.totalAmount}</Text>
            </View>
            
            {!hasSufficientBalance ? (
              <TouchableOpacity 
                style={styles.addMoneyButton}
                onPress={handleAddMoney}
              >
                <Ionicons name="wallet-outline" size={18} color="#FFFFFF" style={{marginRight: 6}} />
                <Text style={styles.addMoneyButtonText}>Add Money</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  isBookingInProgress && styles.disabledButton
                ]}
                onPress={handleConfirmBooking}
                disabled={isBookingInProgress}
              >
                {isBookingInProgress ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  overlayPressable: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: screenHeight * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 0,
  },
  headerHandle: {
    position: 'absolute',
    top: 8,
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
  },
  scrollContainer: {
    flexGrow: 0,
    maxHeight: screenHeight * 0.55,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 0,
    paddingVertical: 12,
  },
  bookingDetailsSection: {
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    padding: 14,
  },
  paymentSection: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 4,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  bookingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  walletBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
  },
  detailValue: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  totalRow: {
    marginTop: 8,
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#118347',
  },
  sessionTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  sessionTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    maxWidth: '90%',
  },
  sessionPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#118347',
  },
  walletInfoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
  },
  walletBalanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 14,
    color: '#666',
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#118347',
  },
  insufficientBalance: {
    color: '#D32F2F',
  },
  insufficientBalanceBox: {
    marginTop: 12,
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    borderRadius: 6,
    padding: 10,
  },
  insufficientBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  insufficientBalanceTitle: {
    color: '#D32F2F',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  insufficientBalanceWarning: {
    color: '#D32F2F',
    fontSize: 13,
    marginBottom: 8,
  },
  addMoneyInlineButton: {
    backgroundColor: '#118347',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addMoneyInlineButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  policyIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  policyText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorMessage: {
    color: '#D32F2F',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerPriceContainer: {
    flex: 1,
  },
  footerPriceLabel: {
    fontSize: 14,
    color: '#666',
  },
  footerPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  addMoneyButton: {
    backgroundColor: '#118347',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 16,
  },
  addMoneyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#118347',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 16,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#F5F5F5', // Light background while loading
  },
  centerImage: {
    width: '100%',
    height: '100%',
  },
  hiddenImage: {
    opacity: 0,
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
}); 