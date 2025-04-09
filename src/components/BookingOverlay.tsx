import React, { useEffect, useState, useRef } from 'react';
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
  Modal,
  Animated,
  Pressable,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { format, addDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

// Firebase services
import { fetchCenterDetails, subscribeToCenterUpdates, Center } from '../firebase/services/centerService';

// Use wallet context
import { useWallet } from '../services/walletContext';

// Get screen dimensions for responsive sizing
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Time slots available for booking (same as BookingScreen)
const TIME_SLOTS = [
  { time: '06:00 AM', available: true },
  { time: '07:00 AM', available: true },
  { time: '08:00 AM', available: true },
  { time: '09:00 AM', available: true },
  { time: '10:00 AM', available: true },
  { time: '11:00 AM', available: true },
  { time: '04:00 PM', available: true },
  { time: '05:00 PM', available: false },
  { time: '06:00 PM', available: true },
  { time: '07:00 PM', available: true },
  { time: '08:00 PM', available: true },
];

// Define TimeSlot and DaySchedule interfaces for better type safety
interface TimeSlot {
  open?: string;
  close?: string;
  startTime?: string;
  endTime?: string;
}

interface DaySchedule {
  isOpen: boolean;
  timeSlots: TimeSlot[];
}

// Note: We're using the Center interface directly from centerService.ts
// which already includes the operationHours property

interface SessionType {
  id: string;
  name: string;
  duration: string;
  description: string;
  price: number;
}

// Session types will now be dynamically created based on center data
const getSessionTypes = (center: Center | null): SessionType[] => {
  if (!center) return [];
  
  const sessionTypes: SessionType[] = [
    {
      id: 'single',
      name: 'Single Session',
      duration: '',
      description: 'One-time workout session with access to all facilities',
      price: center.pricePerSession || 200
    }
  ];
  
  // Add personal training option if center has trainer
  if (center.hasTrainer) {
    sessionTypes.push({
      id: 'personal',
      name: 'Personal Training',
      duration: '',
      description: 'One-on-one training session with a certified trainer',
      price: center.trainerPrice || 400
    });
  }
  
  return sessionTypes;
};

// Function to get time slots from center's operation hours
const getTimeSlots = (center: Center | null, selectedDate: Date) => {
  if (!center) {
    console.log('No center data provided to getTimeSlots');
    return TIME_SLOTS;
  }

  if (!center.operationHours) {
    console.log('No operation hours data available for center:', center.name);
    
    // Check if it's today before returning default slots
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    if (isToday) {
      // Filter default slots for today to remove past hours
      const currentHour = new Date().getHours();
      const currentMinutes = new Date().getMinutes();
      console.log(`Current time: ${currentHour}:${currentMinutes}`);
      
      const filteredDefaultSlots = TIME_SLOTS.filter(slot => {
        const slotHour = parseInt(slot.time.split(':')[0]);
        const isPM = slot.time.includes('PM');
        // Convert to 24-hour format for comparison
        const slotHour24 = isPM && slotHour !== 12 ? slotHour + 12 : (!isPM && slotHour === 12 ? 0 : slotHour);
        
        // If it's the current hour, only include if we're before the 30-minute mark
        if (slotHour24 === currentHour) {
          return currentMinutes < 30;
        }
        
        // Include if the slot hour is in the future
        return slotHour24 > currentHour;
      });
      
      console.log(`Filtered default slots for today: ${filteredDefaultSlots.length} remaining`);
      return filteredDefaultSlots;
    }
    
    console.log('Using default time slots for future date');
    return TIME_SLOTS; // Fallback to default time slots for future dates
  }
  
  const dayName = format(selectedDate, 'EEEE').toLowerCase();
  console.log(`Getting time slots for day: ${dayName} from operation hours data`);
  
  // Handle case where this day might not exist in operationHours
  if (!center.operationHours[dayName]) {
    console.log(`No data for ${dayName} in operation hours`);
    return TIME_SLOTS; // Fallback to default time slots
  }
  
  const dayData = center.operationHours[dayName];
  console.log(`Day data for ${dayName}:`, JSON.stringify(dayData));
  
  if (!dayData || !dayData.isOpen || !dayData.timeSlots || dayData.timeSlots.length === 0) {
    console.log(`Center is closed or no time slots for ${dayName}`);
    return []; // Center is closed on this day
  }
  
  // Check if selected date is today
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const currentHour = isToday ? new Date().getHours() : 0;
  const currentMinutes = isToday ? new Date().getMinutes() : 0;
  
  console.log(`Is today: ${isToday}, Current hour: ${currentHour}:${currentMinutes}`);
  
  // Generate hourly slots based on the operating hours
  const generatedTimeSlots: { time: string; available: boolean }[] = [];
  
  dayData.timeSlots.forEach((slot: any, index: number) => {
    console.log(`Processing slot ${index}:`, JSON.stringify(slot));
    
    const openTime = slot.open || slot.startTime;
    const closeTime = slot.close || slot.endTime;
    
    if (!openTime || !closeTime) {
      console.log('Skipping invalid slot without open/close times');
      return;
    }
    
    // Convert time strings to hour numbers
    const openHour = parseInt(openTime.split(':')[0]);
    const closeHour = parseInt(closeTime.split(':')[0]);
    
    console.log(`Processing hours from ${openHour} to ${closeHour}`);
    
    // Generate hourly slots from opening to closing time
    for (let hour = openHour; hour < closeHour; hour++) {
      // Skip past slots if it's today
      if (isToday && hour <= currentHour) {
        // If it's the current hour, only skip if we're past the 30-minute mark
        if (hour < currentHour || currentMinutes >= 30) {
          console.log(`Skipping past time slot: ${hour}:00`);
          continue;
        }
      }
      
      const formattedHour = hour <= 12 ? hour : hour - 12;
      const period = hour < 12 ? 'AM' : 'PM';
      const timeSlot = `${formattedHour === 0 ? 12 : formattedHour}:00 ${period}`;
      
      // Check for duplicates before adding
      const isDuplicate = generatedTimeSlots.some(existing => existing.time === timeSlot);
      if (!isDuplicate) {
        console.log(`Adding time slot: ${timeSlot}`);
        generatedTimeSlots.push({
          time: timeSlot,
          available: true
        });
      } else {
        console.log(`Skipping duplicate time slot: ${timeSlot}`);
      }
    }
  });
  
  console.log(`Generated ${generatedTimeSlots.length} time slots for ${dayName}`);
  
  // Always return the generated slots, which may be empty for today if all slots are in the past
  if (generatedTimeSlots.length > 0) {
    return generatedTimeSlots;
  }
  
  // If no slots were generated but it's not because the center is closed,
  // it might be because all slots are in the past (for today) or there's a data issue
  if (isToday) {
    console.log('All available slots for today have passed');
    return []; // Return empty for today if all slots are in the past
  }
  
  console.log('No slots generated from operation hours, falling back to defaults');
  return TIME_SLOTS; // Fall back to default slots for future dates with data issues
};

interface BookingOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  centerId: string;
  onShowPreview: (previewData: any) => void;
}

export default function BookingOverlay({ 
  isVisible, 
  onClose, 
  centerId,
  onShowPreview 
}: BookingOverlayProps) {
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Add wallet context
  const { walletBalance, isLoading: isWalletLoading, refreshWalletBalance } = useWallet();
  
  // State variables
  const [center, setCenter] = useState<Center | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType | null>(null);
  const [totalAmount, setTotalAmount] = useState(0); // Will be updated based on selection
  const [timeSlots, setTimeSlots] = useState(TIME_SLOTS);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [activeTimeTab, setActiveTimeTab] = useState<TimeTab>('morning');
  const [unsubscribeFn, setUnsubscribeFn] = useState<(() => void) | undefined>(undefined);

  // Slide in animation when visible changes
  useEffect(() => {
    if (isVisible) {
      // Start loading data
      loadCenterDetails();
      
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
  
  // Add new useEffect for real-time updates
  useEffect(() => {
    if (isVisible && centerId) {
      // Initial fetch to quickly load the UI
      loadCenterDetails();
      
      try {
        // Set up real-time listener for center updates
        console.log('Setting up real-time center updates listener');
        const unsubscribe = subscribeToCenterUpdates(centerId, (updatedCenter) => {
          if (updatedCenter) {
            console.log('Received real-time update for center:', updatedCenter.name);
            setCenter(updatedCenter);
            
            // Update time slots based on updated center operation hours
            const availableTimeSlots = getTimeSlots(updatedCenter, selectedDate);
            console.log('Updated time slots after center change:', availableTimeSlots.length);
            setTimeSlots(availableTimeSlots);
            
            // Update session types based on updated center data
            const availableSessionTypes = getSessionTypes(updatedCenter);
            setSessionTypes(availableSessionTypes);
            
            // Ensure selected session type is still valid after update
            if (selectedSessionType && !availableSessionTypes.some(type => type.id === selectedSessionType.id)) {
              // If current selected type no longer exists, select the first available one
              if (availableSessionTypes.length > 0) {
                setSelectedSessionType(availableSessionTypes[0]);
                setTotalAmount(availableSessionTypes[0].price);
              } else {
                setSelectedSessionType(null);
                setTotalAmount(0);
              }
            }
          }
        });
        
        setUnsubscribeFn(() => unsubscribe);
      } catch (error) {
        console.error('Error setting up real-time updates:', error);
      }
      
      // Cleanup function to unsubscribe when component unmounts or becomes invisible
      return () => {
        if (unsubscribeFn) {
          console.log('Unsubscribing from center updates');
          unsubscribeFn();
          setUnsubscribeFn(undefined);
        }
      };
    }
  }, [isVisible, centerId]);
  
  // Add cleanup effect for when component unmounts
  useEffect(() => {
    return () => {
      if (unsubscribeFn) {
        console.log('Final cleanup: Unsubscribing from center updates');
        unsubscribeFn();
      }
    };
  }, [unsubscribeFn]);
  
  // Load center details
  const loadCenterDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching center details for ID:', centerId);
      const centerData = await fetchCenterDetails(centerId);
      if (centerData) {
        console.log('Center details fetched successfully:', centerData.name);
        console.log('Operation hours data:', JSON.stringify(centerData.operationHours || 'No operation hours data'));
        setCenter(centerData);
        
        // Update session types based on center data
        const availableSessionTypes = getSessionTypes(centerData);
        console.log('Available session types:', availableSessionTypes.length);
        setSessionTypes(availableSessionTypes);
        
        // Set default session type
        if (availableSessionTypes.length > 0) {
          setSelectedSessionType(availableSessionTypes[0]);
          setTotalAmount(availableSessionTypes[0].price);
          console.log('Set default session type:', availableSessionTypes[0].name, 'price:', availableSessionTypes[0].price);
        }
        
        // Update time slots based on center's operation hours
        const today = new Date();
        console.log('Getting time slots for date:', format(selectedDate, 'yyyy-MM-dd'), 'Today is:', format(today, 'yyyy-MM-dd'));
        const availableTimeSlots = getTimeSlots(centerData, selectedDate);
        console.log('Available time slots:', availableTimeSlots.length);
        if (availableTimeSlots.length > 0) {
          console.log('Sample time slots:', availableTimeSlots.slice(0, 3).map(slot => slot.time));
          setTimeSlots(availableTimeSlots);
        } else {
          console.log('No time slots available for selected date');
        }
      } else {
        console.error('Center not found with ID:', centerId);
        Alert.alert('Error', 'Center not found');
        onClose();
      }
    } catch (error) {
      console.error('Error loading center details:', error);
      Alert.alert('Error', 'Could not load center details');
      onClose();
    } finally {
      setLoading(false);
    }
  };
  
  // Update time slots when date changes
  useEffect(() => {
    if (center) {
      const availableTimeSlots = getTimeSlots(center, selectedDate);
      setTimeSlots(availableTimeSlots);
      setSelectedTimeSlot(''); // Reset selected time slot
      
      if (availableTimeSlots.length === 0) {
        // Check if it's today
        const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        if (isToday) {
          // If today and no slots, it means all slots are in the past
          Alert.alert('No Available Slots', 'All time slots for today have passed. Please select another date.');
        } else {
          // For other days, it means the center is closed
          Alert.alert('Center Closed', 'This center is closed on the selected date. Please choose another date.');
        }
      }
    }
  }, [selectedDate, center]);
  
  // Update total amount when session type changes
  useEffect(() => {
    if (selectedSessionType) {
      setTotalAmount(selectedSessionType.price);
    }
  }, [selectedSessionType]);
  
  // Generate dates for the next 7 days
  const getNextDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
      days.push(date);
    }
    return days;
  };
  
  // Format day name (shorter version)
  const formatDayName = (date: Date) => {
    return format(date, 'EEE').substring(0, 3);
  };
  
  // Handle continue to preview
  const handleContinueToPreview = () => {
    if (timeSlots.length === 0) {
      Alert.alert('No Available Time Slots', 'Please select a date with available time slots.');
      return;
    }
    
    if (!selectedDate || !selectedTimeSlot || !selectedSessionType) {
      Alert.alert('Incomplete Selection', 'Please select date, time and session type to continue');
      return;
    }

    // Show preview overlay instead of navigating
    const previewData = {
      centerId,
      centerName: center?.name || 'Unknown Center',
      centerImage: center?.image,
      date: format(selectedDate, 'yyyy-MM-dd'),
      formattedDate: format(selectedDate, 'dd MMM yyyy'),
      timeSlot: selectedTimeSlot,
      sessionType: selectedSessionType,
      totalAmount: selectedSessionType.price,
      walletBalance
    };
    
    onShowPreview(previewData);
  };
  
  // Add handler for wallet recharge navigation
  const handleAddMoney = () => {
    // Close the overlay first
    onClose();
    
    // Navigate to wallet recharge screen
    navigation.dispatch(
      CommonActions.navigate({
        name: 'WalletRecharge',
        params: {
          requiredAmount: totalAmount
        }
      })
    );
  };
  
  // Check if wallet has sufficient balance
  const hasSufficientBalance = walletBalance >= totalAmount;
  
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" />
      
      {/* Dimmed background */}
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: overlayOpacity }
        ]}
      >
        <Pressable style={styles.overlayPress} onPress={onClose} />
      </Animated.View>
      
      {/* Content slide-up panel */}
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        {/* Handle indicator and title in same container */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
          <Text style={styles.title}>Book Session</Text>
        </View>
        
        {/* Close button */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
          hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#118347" />
            <Text style={styles.loadingText}>Loading booking information...</Text>
          </View>
        ) : (
          <>
            <ScrollView 
              style={styles.scrollContainer} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Date Selection */}
              <View style={[styles.section, styles.firstSection]}>
                <Text style={styles.sectionTitle}>Select Date</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateScrollContent}
                >
                  {getNextDays().map((date, index) => {
                    const isSelected = format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dateOption,
                          isSelected && styles.selectedDateOption,
                        ]}
                        onPress={() => setSelectedDate(date)}
                      >
                        <Text style={[
                          styles.dayName,
                          isSelected && styles.selectedDayName
                        ]}>
                          {formatDayName(date)}
                        </Text>

                        <Text style={[
                          styles.dayNumber,
                          isSelected && styles.selectedDayNumber
                        ]}>
                          {format(date, 'd')}
                        </Text>
                        
                        {isToday && (
                          <Text style={styles.todayLabel}>Today</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              
              {/* Divider */}
              <View style={styles.divider} />
              
              {/* Time Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Time</Text>
                {timeSlots.length > 0 ? (
                  <>
                    {/* Time tabs */}
                    <View style={styles.timeTabsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.timeTab,
                          activeTimeTab === 'morning' && styles.timeTabActive
                        ]}
                        onPress={() => setActiveTimeTab('morning')}
                      >
                        <Ionicons 
                          name="sunny-outline" 
                          size={18} 
                          color={activeTimeTab === 'morning' ? '#118347' : '#666'} 
                          style={styles.timeTabIcon}
                        />
                        <Text 
                          style={[
                            styles.timeTabText, 
                            activeTimeTab === 'morning' && styles.timeTabTextActive
                          ]}
                        >
                          Morning
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.timeTab,
                          activeTimeTab === 'afternoon' && styles.timeTabActive
                        ]}
                        onPress={() => setActiveTimeTab('afternoon')}
                      >
                        <Ionicons 
                          name="partly-sunny-outline" 
                          size={18} 
                          color={activeTimeTab === 'afternoon' ? '#118347' : '#666'} 
                          style={styles.timeTabIcon}
                        />
                        <Text 
                          style={[
                            styles.timeTabText, 
                            activeTimeTab === 'afternoon' && styles.timeTabTextActive
                          ]}
                        >
                          Afternoon
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.timeTab,
                          activeTimeTab === 'evening' && styles.timeTabActive
                        ]}
                        onPress={() => setActiveTimeTab('evening')}
                      >
                        <Ionicons 
                          name="moon-outline" 
                          size={18} 
                          color={activeTimeTab === 'evening' ? '#118347' : '#666'} 
                          style={styles.timeTabIcon}
                        />
                        <Text 
                          style={[
                            styles.timeTabText, 
                            activeTimeTab === 'evening' && styles.timeTabTextActive
                          ]}
                        >
                          Evening
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Filtered time slots based on active tab */}
                    <View style={styles.timeGrid}>
                      {(() => {
                        console.log('Rendering time slots, total available:', timeSlots.length);
                        const filteredSlots = timeSlots.filter(slot => {
                          const hour = parseInt(slot.time.split(':')[0]);
                          const isPM = slot.time.includes('PM');
                          const time24h = isPM && hour !== 12 
                            ? hour + 12 
                            : (!isPM && hour === 12 ? 0 : hour);
                          
                          if (activeTimeTab === 'morning') return time24h >= 6 && time24h < 12;
                          if (activeTimeTab === 'afternoon') return time24h >= 12 && time24h < 17;
                          return time24h >= 17 && time24h < 22; // evening
                        });
                        
                        console.log(`Filtered time slots for ${activeTimeTab}: ${filteredSlots.length}`);
                        
                        return filteredSlots.map((slot, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.timeOption,
                              selectedTimeSlot === slot.time && styles.selectedTimeOption,
                              !slot.available && styles.unavailableTimeOption
                            ]}
                            onPress={() => {
                              console.log('Selected time slot:', slot.time);
                              slot.available && setSelectedTimeSlot(slot.time);
                            }}
                            disabled={!slot.available}
                          >
                            <Text style={[
                              styles.timeText,
                              selectedTimeSlot === slot.time && styles.selectedTimeText,
                              !slot.available && styles.unavailableTimeText
                            ]}>
                              {slot.time}
                            </Text>
                          </TouchableOpacity>
                        ));
                      })()}
                    </View>
                  </>
                ) : (
                  <View style={styles.noTimeSlotsContainer}>
                    <Ionicons name="time-outline" size={32} color="#999" />
                    <Text style={styles.noTimeSlotsText}>
                      {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ? "All time slots for today have passed."
                        : "No available time slots for this date."}
                    </Text>
                    <Text style={styles.noTimeSlotsSubText}>
                      Please select another date.
                    </Text>
                  </View>
                )}
              </View>

              {/* Divider */}
              <View style={styles.divider} />
              
              {/* Session Type Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Session Type</Text>
                
                {sessionTypes.map((type, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.sessionTypeOption,
                      selectedSessionType?.id === type.id && styles.selectedSessionTypeOption
                    ]}
                    onPress={() => setSelectedSessionType(type)}
                  >
                    <View style={styles.sessionTypeContent}>
                      <View style={styles.sessionTypeHeader}>
                        <View>
                          <Text style={styles.sessionTypeName}>{type.name}</Text>
                          {type.duration ? (
                            <Text style={styles.sessionTypeDuration}>{type.duration}</Text>
                          ) : null}
                        </View>
                        <Text style={[
                          styles.sessionTypePrice,
                          selectedSessionType?.id === type.id && styles.selectedSessionTypePrice
                        ]}>₹{type.price}</Text>
                      </View>
                      <Text style={styles.sessionTypeDescription}>{type.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Extra space at the bottom for the fixed footer */}
              <View style={{ height: 150 }} />
            </ScrollView>
            
            {/* Updated footer with wallet balance */}
            <View style={styles.footer}>
              <View style={styles.walletInfoContainer}>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalAmount}>₹{totalAmount}</Text>
                </View>
                
                <View style={styles.walletContainer}>
                  <Text style={styles.walletLabel}>Wallet Balance</Text>
                  <Text style={[
                    styles.walletBalance, 
                    !hasSufficientBalance && styles.insufficientBalance
                  ]}>
                    ₹{walletBalance}
                  </Text>
                </View>
              </View>
              
              {/* Show Add Money button if balance is insufficient */}
              {!hasSufficientBalance && (
                <TouchableOpacity 
                  style={styles.addMoneyButton}
                  onPress={handleAddMoney}
                >
                  <Ionicons name="wallet-outline" size={18} color="#333" style={{marginRight: 6}} />
                  <Text style={styles.addMoneyButtonText}>Add Money</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  (!selectedDate || !selectedTimeSlot || !selectedSessionType || isBookingInProgress || timeSlots.length === 0) && 
                  styles.disabledButton
                ]}
                onPress={handleContinueToPreview}
                disabled={!selectedDate || !selectedTimeSlot || !selectedSessionType || isBookingInProgress || timeSlots.length === 0}
              >
                {isBookingInProgress ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.continueButtonText}>
                      {timeSlots.length === 0 ? 'No Available Time Slots' : 'Continue to Preview'}
                    </Text>
                    {timeSlots.length > 0 && (
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{marginLeft: 8}} />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  overlayPress: {
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
  handleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  scrollContainer: {
    flexGrow: 0,
    maxHeight: screenHeight * 0.8,
  },
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: 16,
  },
  section: {
    paddingVertical: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
  },
  dateScrollContent: {
    paddingVertical: 0,
  },
  dateOption: {
    width: 70,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  selectedDateOption: {
    backgroundColor: '#E7F2EB',
    borderColor: '#118347',
  },
  todayLabel: {
    fontSize: 10,
    color: '#118347',
    fontWeight: '600',
    marginTop: 4,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  selectedDayName: {
    color: '#118347',
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  selectedDayNumber: {
    color: '#118347',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  timeTabsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    padding: 4,
  },
  timeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeTabIcon: {
    marginRight: 4,
  },
  timeTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  timeTabTextActive: {
    color: '#118347',
    fontWeight: '600',
  },
  timeOption: {
    width: '31%',
    paddingVertical: 12,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  selectedTimeOption: {
    backgroundColor: '#118347',
    borderColor: '#118347',
  },
  unavailableTimeOption: {
    backgroundColor: '#F5F5F5',
    opacity: 0.5,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedTimeText: {
    color: '#FFF',
  },
  unavailableTimeText: {
    color: '#999',
  },
  noTimeSlotsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  noTimeSlotsText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  noTimeSlotsSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
    textAlign: 'center',
  },
  sessionTypeOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 16,
  },
  sessionTypeContent: {
    flex: 1,
  },
  selectedSessionTypeOption: {
    borderColor: '#118347',
    backgroundColor: '#F0FAF5',
  },
  sessionTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  sessionTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  sessionTypeDuration: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sessionTypePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#555',
  },
  selectedSessionTypePrice: {
    color: '#118347',
  },
  sessionTypeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
  walletInfoContainer: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  walletContainer: {
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
  addMoneyButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addMoneyButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#118347',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  firstSection: {
    paddingTop: 10,
    paddingBottom: 20,
  },
}); 
