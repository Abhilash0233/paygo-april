import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  Dimensions,
  Animated,
  Easing,
  Pressable,
  LayoutAnimation,
  UIManager,
  PanResponder
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginOverlay from '../../components/LoginOverlay';
import { saveBooking } from '../../services/supabase/bookingService';
import { deductFromWallet, getUserWalletBalance } from '../../services/walletService';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useWallet } from '../../services/walletContext';
import { useAuth } from '../../services/authContext';

// Add navigation state persistence key
const BOOKING_STATE_KEY = '@paygo/pending_booking';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Define types
type BookingPreviewRouteProp = RouteProp<RootStackParamList, 'BookingPreview'>;

// Update the RootStackParamList to include returnFromRecharge
type BookingPreviewParams = {
  centerId: string;
  centerName: string;
  centerImage?: string;
  thumbnail?: string;
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
  isRescheduling?: boolean;
  originalBookingId?: string;
  returnFromRecharge?: boolean;
  centerCategory?: string;
  categoryType?: string; // Type of activity (e.g., Gym, Yoga, etc.)
};

type BookingPreviewNavigationProp = StackNavigationProp<RootStackParamList, 'BookingPreview'>;

export default function BookingPreviewScreen() {
  const navigation = useNavigation<BookingPreviewNavigationProp>();
  const route = useRoute<BookingPreviewRouteProp>();
  const { 
    centerId, 
    centerName, 
    centerImage,
    thumbnail,
    date, 
    formattedDate, 
    timeSlot, 
    sessionType, 
    totalAmount,
    walletBalance: initialWalletBalance,
    isRescheduling,
    originalBookingId,
    returnFromRecharge,
    centerCategory
  } = route.params;
  
  // Get auth state
  const { isAuthenticated, user } = useAuth();
  
  // Wallet context
  const { walletBalance, refreshWalletBalance } = useWallet();
  
  // State
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);
  
  // Add animation value for modal
  const [slideAnim] = useState(new Animated.Value(0));

  // Add state for insufficient balance warning
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);

  // Add state for policy expansion
  const [isPolicyExpanded, setIsPolicyExpanded] = useState(false);
  const [rotateAnimation] = useState(new Animated.Value(0));

  // Pan responder for gesture handling
  const panY = useRef(new Animated.Value(0)).current;
  const lastGestureDy = useRef(0);

  const resetPositionAnim = Animated.timing(panY, {
    toValue: 0,
    duration: 250,
    useNativeDriver: true,
    easing: Easing.out(Easing.ease),
  });

  const closeAnim = Animated.timing(panY, {
    toValue: 400,
    duration: 250,
    useNativeDriver: true,
    easing: Easing.out(Easing.ease),
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture vertical gestures that start from the handle area
        const isVerticalGesture = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        const startedFromTop = evt.nativeEvent.locationY < 100; // Adjust this value based on your handle area height
        return isVerticalGesture && startedFromTop;
      },
      onPanResponderGrant: () => {
        // Use setValue(0) without offset for simpler handling
        panY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > screenHeight * 0.4) {
          handleDismiss();
        } else {
          // Spring back to original position
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  // Effect to handle animations
  useEffect(() => {
    // Reset animation value when returning from recharge
    if (returnFromRecharge) {
      slideAnim.setValue(0);
    }
    
    // Enhanced opening animation with spring for more natural feel
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      mass: 0.8,
      stiffness: 100,
    }).start();
  }, [returnFromRecharge]); // Add returnFromRecharge as dependency

  // Add a flag to track if we've already refreshed the wallet after recharge
  const [hasRefreshedAfterRecharge, setHasRefreshedAfterRecharge] = useState(false);

  // Effect to refresh wallet balance when returning from recharge
  useEffect(() => {
    if (returnFromRecharge && !hasRefreshedAfterRecharge) {
      console.log('[BookingPreview] Refreshing wallet balance after recharge');
      refreshWalletBalance();
      // Reset insufficient balance warning
      setShowInsufficientBalance(walletBalance < sessionType.price);
      // Mark that we've refreshed to prevent loop
      setHasRefreshedAfterRecharge(true);
    }
  }, [returnFromRecharge, refreshWalletBalance, walletBalance, sessionType.price, hasRefreshedAfterRecharge]);

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Run close animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start(() => {
      navigation.goBack();
    });
  }, [navigation]);

  // Add state for guest mode
  const [isGuestTransition, setIsGuestTransition] = useState(false);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);

  // Enhanced authentication check with state persistence
  useEffect(() => {
    const checkAuthAndRestoreState = async () => {
      if (!isAuthenticated || !user) {
        console.log('User not authenticated, handling guest flow');
        
        // Store current booking state
        const bookingState = {
          centerId,
          centerName,
          centerImage,
          date,
          timeSlot,
          sessionType,
          isRescheduling,
          originalBookingId,
          returnScreen: 'BookingPreview'
        };
        
        try {
          await AsyncStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(bookingState));
          console.log('Booking state saved successfully');
        } catch (error) {
          console.error('Error saving booking state:', error);
        }

        setIsGuestTransition(true);
        setShowLoginOverlay(true);
      } else if (isAuthenticated && !isGuestTransition) {
        // Only check for pending booking if the user is authenticated and not in a guest transition
        try {
          const pendingBooking = await AsyncStorage.getItem(BOOKING_STATE_KEY);
          if (pendingBooking) {
            console.log('Found pending booking state, restoring...');
            const bookingData = JSON.parse(pendingBooking);
            
            // Clear the stored state
            await AsyncStorage.removeItem(BOOKING_STATE_KEY);
            
            // If we're not already on the correct booking, navigate to it
            if (bookingData.centerId !== centerId || bookingData.date !== date) {
              navigation.replace('BookingPreview', bookingData);
            }
          }
        } catch (error) {
          console.error('Error restoring booking state:', error);
        }
      }
    };
    
    checkAuthAndRestoreState();
  }, [isAuthenticated, user, navigation, isGuestTransition]);

  // Function to confirm booking
  const confirmBooking = useCallback(async () => {
    if (isBookingInProgress) return;
    
    try {
      setIsBookingInProgress(true);
      
      // Ensure user is authenticated
      if (!user || !user.id) {
        console.error("User not authenticated or missing ID");
        Alert.alert('Authentication Required', 'Please log in to make a booking');
        setIsBookingInProgress(false);
        return;
      }
      
      // Log which user ID we're using for the booking
      console.log(`Using user ID for booking: ${user.id}`);
      
      // Refresh wallet balance before proceeding
      console.log('Refreshing wallet balance before booking');
      await refreshWalletBalance();
      
      // Wallet balance check
      console.log(`Wallet balance: ${walletBalance}, Required: ${sessionType.price}`);
      if (walletBalance < sessionType.price) {
        console.log('Insufficient balance for booking');
        Alert.alert(
          'Insufficient Balance',
          `You need at least ₹${sessionType.price} in your wallet to make this booking. Would you like to add money to your wallet?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setIsBookingInProgress(false),
            },
            {
              text: 'Add Money',
              onPress: () => {
                setIsBookingInProgress(false);
                setShowInsufficientBalance(true);
                // Navigate to recharge screen with return params
                navigation.navigate('WalletRecharge', {
                  returnScreen: 'BookingPreview',
                  requiredAmount: sessionType.price,
                  returnParams: {
                    ...route.params,
                    returnFromRecharge: true,
                  },
                });
              },
            },
          ]
        );
        return;
      }
      
      // Using the new Supabase booking service
      // The saveBooking function now handles wallet deduction internally
      console.log(`Creating booking for ${sessionType.name} at ${centerName}`);
      
      // Log all parameters for debugging
      console.log('Booking parameters:', {
        userId: user.id,
        centerId,
        date,
        timeSlot,
        sessionType: sessionType.name,
        price: sessionType.price,
        centerName
      });
      
      const bookingResult = await saveBooking(
        user.id,
        centerId,
        date,
        timeSlot,
        sessionType.name,
        sessionType.price,
        centerName
      );
      
      if (!bookingResult) {
        console.error('Booking failed: saveBooking returned null');
        throw new Error('Booking service returned null result');
      }
      
      if (!bookingResult.bookingId) {
        console.error('Booking failed: No booking ID in result', bookingResult);
        throw new Error('No booking ID returned from booking service');
      }

      console.log('Booking confirmed successfully:', bookingResult);

      // Refresh wallet balance after successful booking
      console.log('Refreshing wallet balance after booking');
      await refreshWalletBalance();
      
      // Navigate to confirmation screen with all required parameters
      const confirmationParams = {
        bookingId: bookingResult.bookingId,
        centerName,
        centerImage,
        date,
        timeSlot,
        sessionType: sessionType.name,
        price: sessionType.price,
        isRescheduled: isRescheduling || false,
        centerCategory: centerCategory || 'Fitness'
      };
      
      console.log('Navigating to BookingConfirmation with:', JSON.stringify(confirmationParams, null, 2));
      
      navigation.replace('BookingConfirmation', confirmationParams);
      
    } catch (error) {
      console.error('Error confirming booking:', error);
      
      // More detailed error message based on error type
      let errorMessage = 'We encountered an error while processing your booking. Please try again.';
      let errorTitle = 'Booking Failed';
      let shouldRetry = true;
      
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
        
        if (error.message.includes('User profile not found')) {
          errorMessage = 'Your user profile could not be found. Please ensure your account is properly set up.';
          errorTitle = 'Profile Error';
        } else if (error.message.includes('wallet') || error.message.includes('balance')) {
          errorMessage = 'There was an issue with your wallet balance. Please try adding money to your wallet first.';
          errorTitle = 'Wallet Error';
        } else if (error.message.includes('foreign key constraint') || error.message.includes('user_id')) {
          errorMessage = 'There appears to be an issue with your user account. Please log out and log back in, then try again.';
          errorTitle = 'Account Error';
          shouldRetry = false;
        } else if (error.message.includes('returned null')) {
          errorMessage = 'The booking service is currently unavailable. Please try again later.';
          errorTitle = 'Service Error';
        }
      }
      
      // Create alert buttons based on error type
      const alertButtons = [];
      
      if (shouldRetry) {
        alertButtons.push({ 
          text: 'Try Again',
          onPress: () => confirmBooking()
        });
      }
      
      alertButtons.push({
        text: 'Cancel',
        style: 'cancel' as 'cancel'
      });
      
      Alert.alert(
        errorTitle,
        errorMessage,
        alertButtons
      );
    } finally {
      setIsBookingInProgress(false);
    }
  }, [
    user,
    isBookingInProgress,
    walletBalance,
    sessionType.price,
    sessionType.name,
    route.params,
    navigation,
    centerId,
    centerName,
    centerImage,
    date,
    timeSlot,
    isRescheduling,
    originalBookingId,
    refreshWalletBalance,
    centerCategory
  ]);
  
  // Handle back button press
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Show loading if checking authentication
  if (!isAuthenticated && !user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#118347" />
        <Text style={styles.loadingText}>Checking authentication status...</Text>
      </SafeAreaView>
    );
  }
  
  const togglePolicy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext({
      duration: 200,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setIsPolicyExpanded(!isPolicyExpanded);
    Animated.timing(rotateAnimation, {
      toValue: isPolicyExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isPolicyExpanded]);

  const rotateInterpolate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  
  const [isImageLoading, setIsImageLoading] = useState(true);
  
  // Function to handle the confirm booking button press
  const handleConfirmBooking = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Check if user is authenticated
    if (!user || isGuestTransition) {
      const bookingState = {
        centerId,
        centerName,
        centerImage,
        date,
        timeSlot,
        sessionType,
        isRescheduling,
        originalBookingId,
        returnScreen: 'BookingPreview'
      };

      setShowLoginOverlay(true);
      return;
    }
    
    // User is authenticated, proceed with booking
    confirmBooking();
  }, [
    user,
    isGuestTransition,
    centerId,
    centerName,
    centerImage,
    date,
    timeSlot,
    sessionType,
    isRescheduling,
    originalBookingId,
    confirmBooking
  ]);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
        ]}
      >
        <Pressable 
          style={StyleSheet.absoluteFill}
          onPress={handleDismiss}
        />
      </Animated.View>
      <Animated.View 
        style={[
          styles.content,
          {
            transform: [
              {
                translateY: Animated.add(
                  slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                  panY
                ),
              },
            ],
            opacity: slideAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.7, 1],
            }),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle} />
        
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Booking Preview</Text>
        </View>
        <TouchableOpacity 
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
        
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Booking Details Section */}
          <View style={styles.section}>
            {thumbnail ? (
              <View style={styles.imageContainer}>
                {isImageLoading && (
                  <View style={styles.imageLoadingContainer}>
                    <ActivityIndicator size="small" color="#118347" />
                  </View>
                )}
                <Image 
                  source={{ uri: thumbnail }} 
                  style={[
                    styles.centerImage,
                    isImageLoading && { opacity: 0 }
                  ]}
                  resizeMode="cover"
                  onLoadStart={() => setIsImageLoading(true)}
                  onLoadEnd={() => setIsImageLoading(false)}
                  onError={(e) => {
                    console.log('Error loading thumbnail:', e.nativeEvent.error);
                    console.log('Attempted thumbnail URL:', thumbnail);
                    setIsImageLoading(false);
                  }}
                />
              </View>
            ) : (
              <View style={[styles.centerImage, { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="fitness-outline" size={32} color="#999" />
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Center</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{centerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>{formattedDate}, {timeSlot}</Text>
            </View>
            <View style={[styles.detailRow, styles.noBorder]}>
              <Text style={styles.detailLabel}>Session</Text>
              <Text style={styles.detailValue}>{sessionType.name}</Text>
            </View>
          </View>
          
          {/* Payment Section */}
          <View style={styles.section}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount</Text>
              <Text style={styles.totalAmount}>₹{sessionType.price}</Text>
        </View>
        
            <View style={styles.walletSection}>
              <View style={styles.walletInfo}>
                <View style={styles.walletIconContainer}>
                  <Ionicons 
                    name="wallet-outline" 
                    size={20} 
                    color={walletBalance < sessionType.price ? '#FF4B4B' : '#118347'} 
                  />
          </View>
                <View>
                  <Text style={styles.walletBalanceLabel}>Balance</Text>
            <Text style={[
                    styles.walletBalance,
                    { color: walletBalance < sessionType.price ? '#FF4B4B' : '#118347' }
            ]}>
              ₹{walletBalance}
            </Text>
          </View>
        </View>
        
              {walletBalance < sessionType.price && (
                <TouchableOpacity
                  style={styles.addMoneyButton}
                  onPress={() => {
                    const requiredAmount = sessionType.price - walletBalance;
                    navigation.navigate('WalletRecharge', {
                      requiredAmount,
                      returnScreen: 'BookingPreview',
                      returnParams: { ...route.params, returnFromRecharge: true }
                    });
                  }}
                >
                  <Text style={styles.addMoneyText}>Add ₹{sessionType.price - walletBalance}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Add guest mode indicator if needed */}
          {!isAuthenticated && (
            <View style={styles.guestModeContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#666" />
              <Text style={styles.guestModeText}>
                Sign in to complete your booking
              </Text>
            </View>
          )}

          {/* Policy Section - Moved inside ScrollView */}
          <View style={styles.policyContainer}>
            <TouchableOpacity 
              style={styles.policyButton}
              onPress={togglePolicy}
              activeOpacity={0.7}
            >
              <View style={styles.policyHeader}>
                <Ionicons name="information-circle-outline" size={20} color="#666" />
                <Text style={styles.policyTitle}>Cancellation Policy</Text>
                <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </Animated.View>
              </View>
            </TouchableOpacity>

            {isPolicyExpanded && (
              <View style={styles.policyDetails}>
                <Text style={styles.policyText}>• Free cancellation up to 2 hours before session</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (isBookingInProgress || walletBalance < sessionType.price || !isAuthenticated) && 
              styles.disabledButton
            ]}
            onPress={handleConfirmBooking}
            disabled={isBookingInProgress || walletBalance < sessionType.price || !isAuthenticated}
          >
            {isBookingInProgress ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
                <Text style={styles.confirmButtonText}>
                  {!isAuthenticated ? 'Sign In to Book' :
                    walletBalance < sessionType.price ? 'Add Money' : 'Confirm'}
                </Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <LoginOverlay
        visible={showLoginOverlay}
        onClose={() => setShowLoginOverlay(false)}
        returnScreen="BookingPreview"
        returnParams={{
          centerId,
          centerName,
          centerImage,
          date,
          timeSlot,
          sessionType,
          isRescheduling,
          originalBookingId
        }}
      />
    </View>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  scrollContainer: {
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 0,
  },
  section: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
  },
  detailValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  noBorder: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#118347',
  },
  walletSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletBalanceLabel: {
    fontSize: 13,
    color: '#666',
  },
  walletBalance: {
    fontSize: 18,
    fontWeight: '600',
  },
  addMoneyButton: {
    backgroundColor: '#E8F5EE',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  addMoneyText: {
    color: '#118347',
    fontSize: 15,
    fontWeight: '600',
  },
  policyContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    marginBottom: 20,
  },
  policyButton: {
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  policyTitle: {
    fontSize: 15,
    color: '#000',
    flex: 1,
  },
  policyDetails: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#F8F8F8',
  },
  policyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  confirmButton: {
    backgroundColor: '#118347',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  guestModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  guestModeText: {
    flex: 1,
    fontSize: 14,
    color: '#B95000',
  },
  imageContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
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
  centerImage: {
    height: 180,
    borderRadius: 12,
  },
}); 
