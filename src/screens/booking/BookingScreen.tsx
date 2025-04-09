import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { format, addDays } from 'date-fns';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Update import to use Supabase service instead of Firebase
import { fetchCenterDetails, Center } from '../../services/supabase/centerService';
import { saveBooking } from '../../services/supabase/bookingService';
import { deductFromWallet } from '../../services/walletService';

// Types
import { RootStackParamList } from '../../navigation/AppNavigator';

// Add useWallet import
import { useWallet } from '../../services/walletContext';

// Add LoginOverlay and useAuth
import { useAuth } from '../../services/authContext';
import LoginOverlay from '../../components/LoginOverlay';

// Define types
type BookingScreenRouteProp = RouteProp<RootStackParamList, 'Booking'>;
type BookingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Booking'>;

interface SessionType {
  id: string;
  name: string;
  duration: string;
  description: string;
  price: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// Time slots available for booking
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

// Define interfaces for operation hours data structure
interface TimeSlotRange {
  startTime?: string;
  endTime?: string;
  open?: string;
  close?: string;
}

interface DayData {
  isOpen: boolean;
  timeSlots?: TimeSlotRange[];
  open?: string;
  close?: string;
}

// Session types will now be dynamically created based on center data
const getSessionTypes = (center: Center | null): SessionType[] => {
  if (!center) return [];
  
  const sessionTypes: SessionType[] = [
    {
      id: 'single',
      name: 'Single Session',
      duration: '1 hour',
      description: 'One-time workout session with access to all facilities',
      price: center.pricePerSession || 200
    }
  ];
  
  // Add personal training option if center has trainer
  if (center.hasTrainer) {
    sessionTypes.push({
      id: 'personal',
      name: 'Personal Training',
      duration: '1 hour',
      description: 'One-on-one training session with a certified trainer',
      price: center.trainerPrice || 400
    });
  }
  
  return sessionTypes;
};

// Function to get time slots from center's operation hours
const getTimeSlots = (center: Center | null, selectedDate: Date) => {
  if (!center || !center.operationHours) {
    console.log('No operation hours data available, using default time slots');
    return TIME_SLOTS; // Fallback to default time slots
  }
  
  const dayName = format(selectedDate, 'EEEE').toLowerCase();
  console.log(`Getting time slots for day: ${dayName}`);
  
  // Add better debug logging
  if (center.operationHours) {
    console.log('Operation hours available:', Object.keys(center.operationHours));
  }
  
  const dayData = center.operationHours[dayName] as DayData;
  
  if (!dayData) {
    console.log(`No operation hours found for ${dayName}`);
    return TIME_SLOTS; // Fallback to default time slots
  }
  
  if (!dayData.isOpen) {
    console.log(`Center is closed on ${dayName}`);
    return []; // Center is closed on this day
  }
  
  // Check if selected date is today
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  
  console.log(`Is today: ${isToday}, Current time: ${currentHour}:${currentMinutes}`);
  
  // Generate hourly slots based on the operating hours
  const generatedTimeSlots: TimeSlot[] = [];
  
  // Helper function to format time slot text
  const formatTimeSlot = (hour: number): string => {
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    const amPm = hour >= 12 ? 'PM' : 'AM';
    return `${formattedHour < 10 ? '0' : ''}${formattedHour}:00 ${amPm}`;
  };
  
  // Helper function to parse hour from time string
  const parseHour = (timeStr: string): number => {
    if (!timeStr) return NaN;
    
    // Handle both "14:00" and "14" formats
    const hourPart = timeStr.includes(':') ? timeStr.split(':')[0] : timeStr;
    return parseInt(hourPart, 10);
  };
  
  // Check if we have timeSlots array (new format) or open/close properties (old format)
  if (dayData.timeSlots && Array.isArray(dayData.timeSlots) && dayData.timeSlots.length > 0) {
    console.log(`Processing ${dayData.timeSlots.length} time slot ranges for ${dayName}`);
    
    // Process each time slot range
    dayData.timeSlots.forEach((slot: TimeSlotRange, index: number) => {
      console.log(`Processing slot range ${index + 1}:`, slot);
      
      const openTime = slot.startTime || slot.open || '';
      const closeTime = slot.endTime || slot.close || '';
      
      if (!openTime || !closeTime) {
        console.log('Invalid time slot data, skipping', slot);
        return;
      }
      
      // Parse hour values directly
      const openHour = parseHour(openTime);
      const closeHour = parseHour(closeTime);
      
      // Validate hours are numbers
      if (isNaN(openHour) || isNaN(closeHour)) {
        console.log('Invalid hours format in slot, skipping', slot);
        return;
      }
      
      console.log(`Valid time range: ${openHour}:00 - ${closeHour}:00`);
      
      // Generate slots at hourly intervals
      for (let hour = openHour; hour < closeHour; hour++) {
        const timeString = formatTimeSlot(hour);
        
        // Skip past times if today
        if (isToday && hour <= currentHour) {
          console.log(`Skipping past time slot: ${timeString}`);
          continue;
        }
        
        // Check if this slot already exists (avoid duplicates)
        const slotExists = generatedTimeSlots.some(s => s.time === timeString);
        if (!slotExists) {
          generatedTimeSlots.push({
            time: timeString,
            available: true // In a real app, check availability against existing bookings
          });
          console.log(`Added time slot: ${timeString}`);
        }
      }
    });
  } else {
    console.log('Using legacy format for operation hours');
    // Handle legacy format where open and close are direct properties of dayData
    let openTime = dayData.open || '';
    let closeTime = dayData.close || '';
    
    if (!openTime || !closeTime) {
      console.log('No open/close time data available, using default time slots');
      return TIME_SLOTS;
    }
    
    // Parse hour values directly
    const openHour = parseHour(openTime);
    const closeHour = parseHour(closeTime);
    
    // Validate hours are numbers
    if (isNaN(openHour) || isNaN(closeHour)) {
      console.log('Invalid hours format, using default time slots');
      return TIME_SLOTS;
    }
    
    console.log(`Valid time range (legacy format): ${openHour}:00 - ${closeHour}:00`);
    
    // Generate slots at hourly intervals
    for (let hour = openHour; hour < closeHour; hour++) {
      const timeString = formatTimeSlot(hour);
      
      // Skip past times if today
      if (isToday && hour <= currentHour) {
        console.log(`Skipping past time slot: ${timeString}`);
        continue;
      }
      
      generatedTimeSlots.push({
        time: timeString,
        available: true // In a real app, check availability against existing bookings
      });
      console.log(`Added time slot: ${timeString}`);
    }
  }
  
  if (generatedTimeSlots.length === 0) {
    console.log('No valid time slots generated, using filtered default slots');
    return TIME_SLOTS.filter(slot => {
      const slotHour = parseInt(slot.time.split(':')[0]);
      const isPM = slot.time.includes('PM');
      const hour24 = isPM && slotHour !== 12 ? slotHour + 12 : (!isPM && slotHour === 12 ? 0 : slotHour);
      return isToday ? hour24 > currentHour : true;
    });
  }
  
  // Sort time slots by time
  generatedTimeSlots.sort((a, b) => {
    const timeA = a.time;
    const timeB = b.time;
    
    const hourA = parseInt(timeA.split(':')[0]);
    const hourB = parseInt(timeB.split(':')[0]);
    
    const isPMA = timeA.includes('PM');
    const isPMB = timeB.includes('PM');
    
    const hour24A = isPMA && hourA !== 12 ? hourA + 12 : (!isPMA && hourA === 12 ? 0 : hourA);
    const hour24B = isPMB && hourB !== 12 ? hourB + 12 : (!isPMB && hourB === 12 ? 0 : hourB);
    
    return hour24A - hour24B;
  });
  
  console.log(`Generated ${generatedTimeSlots.length} time slots for ${dayName}`);
  return generatedTimeSlots;
};

interface BookingScreenProps {
  navigation: NavigationProp<any>;
}

export default function BookingScreen({ navigation }: BookingScreenProps) {
  const insets = useSafeAreaInsets();
  const route = useRoute<BookingScreenRouteProp>();
  const { centerId, isRescheduling = false, originalBookingId = null } = route.params || {};
  const originalDate = route.params?.originalDate;
  const originalTimeSlot = route.params?.originalTimeSlot;
  
  // Add wallet context
  const { walletBalance, isLoading: isWalletLoading, refreshWalletBalance } = useWallet();
  
  // Add auth context
  const { isAuthenticated, user } = useAuth();
  
  // State variables
  const [center, setCenter] = useState<Center | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(60); // Default 1 hour
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType | null>(null);
  const [totalAmount, setTotalAmount] = useState(0); // Will be updated based on selection
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(TIME_SLOTS);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [isCenterClosed, setIsCenterClosed] = useState(false);
  const [activeTimeTab, setActiveTimeTab] = useState<'morning' | 'evening'>('morning');
  
  // Add state for login overlay
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [loginReturnParams, setLoginReturnParams] = useState<any>(null);
  
  // Load center details
  useEffect(() => {
    const loadCenterDetails = async () => {
      try {
        setLoading(true);
        const centerData = await fetchCenterDetails(centerId);
        if (centerData) {
          setCenter(centerData);
          
          // Update session types based on center data
          const availableSessionTypes = getSessionTypes(centerData);
          setSessionTypes(availableSessionTypes);
          
          // Set default session type
          if (availableSessionTypes.length > 0) {
            setSelectedSessionType(availableSessionTypes[0]);
            setTotalAmount(availableSessionTypes[0].price);
          }
          
          // Update time slots based on center's operation hours
          const availableTimeSlots = getTimeSlots(centerData, selectedDate);
          if (availableTimeSlots.length > 0) {
            setTimeSlots(availableTimeSlots);
          }
        } else {
          Alert.alert('Error', 'Center not found');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error loading center details:', error);
        Alert.alert('Error', 'Could not load center details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    
    loadCenterDetails();
  }, [centerId, navigation]);
  
  // Update time slots when date changes
  useEffect(() => {
    if (center) {
      const availableTimeSlots = getTimeSlots(center, selectedDate);
      if (availableTimeSlots.length > 0) {
        setTimeSlots(availableTimeSlots);
        setSelectedTime(''); // Reset selected time slot
        setIsCenterClosed(false);
      } else {
        // Center is closed
        setTimeSlots([]);
        setIsCenterClosed(true);
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
  
  // Handle continue to payment
  const handleContinueToPayment = () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Incomplete Selection', 'Please select date and time to continue');
      return;
    }

    const previewData = {
      centerId: centerId,
      centerName: center?.name || 'Unknown Center',
      centerImage: center?.images?.[0],
      date: format(selectedDate, 'yyyy-MM-dd'),
      formattedDate: format(selectedDate, 'dd MMM yyyy'),
      timeSlot: selectedTime,
      sessionType: {
        id: selectedSessionType?.id || 'single',
        name: selectedSessionType?.name || 'Single Session',
        price: selectedSessionType?.price || totalAmount,
        description: selectedSessionType?.description || ''
      },
      totalAmount: totalAmount,
      walletBalance: walletBalance,
      isRescheduling: isRescheduling,
      originalBookingId: originalBookingId
    };

    navigation.navigate('BookingPreview', { previewData });
  };
  
  // Handle back button press
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Check if wallet has sufficient balance
  const hasSufficientBalance = walletBalance >= totalAmount;
  
  // Add check in time slot selection to prevent selecting the same date and time when rescheduling
  const handleTimeSlotSelect = (slot: TimeSlot) => {
    // When rescheduling, prevent selecting the same date and time as the original booking
    if (isRescheduling && originalDate && originalTimeSlot) {
      const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
      if (formattedSelectedDate === originalDate && slot.time === originalTimeSlot) {
        Alert.alert(
          "Same Time Not Allowed",
          "When rescheduling, you must select a different date or time from your original booking.",
          [{ text: "OK" }]
        );
        return;
      }
    }
    
    setSelectedTime(slot.time);
  };
  
  const handlePreviewBooking = () => {
    if (!selectedDate || !selectedTime || !selectedSessionType) {
      Alert.alert('Please select all booking details');
      return;
    }

    // Check if user is authenticated before proceeding
    if (!isAuthenticated || !user) {
      // Show login overlay for guest users
      setLoginReturnParams({
        centerId: centerId,
        returnScreen: 'Booking',
        centerName: center?.name || 'Unknown Center',
        centerImage: center?.images?.[0]
      });
      setShowLoginOverlay(true);
      return;
    }

    const formattedDate = format(selectedDate, 'dd MMM yyyy');
    const dateISOString = format(selectedDate, 'yyyy-MM-dd');

    // Create complete preview data with all required parameters
    const previewData = {
      centerId: centerId,
      centerName: center?.name || 'Unknown Center',
      centerImage: center?.images?.[0],
      thumbnail: center?.thumbnailImage || center?.images?.[0],
      centerCategory: center?.category || 'Fitness',
      date: dateISOString,
      formattedDate: formattedDate,
      timeSlot: selectedTime,
      sessionType: {
        id: selectedSessionType.id,
        name: selectedSessionType.name,
        price: selectedSessionType.price,
        description: selectedSessionType.description
      },
      totalAmount: selectedSessionType.price,
      walletBalance: walletBalance,
      isRescheduling: isRescheduling,
      originalBookingId: originalBookingId,
      categoryType: center?.category || 'Fitness'
    };

    // Log navigation attempt
    console.log('Navigating to BookingPreview with data:', JSON.stringify(previewData, null, 2));

    // Navigate to the preview screen
    navigation.navigate('BookingPreview', previewData);
  };
  
  // Filter time slots based on active tab
  const getFilteredTimeSlots = () => {
    return timeSlots.filter(slot => {
      const hour = parseInt(slot.time.split(':')[0]);
      const isPM = slot.time.includes('PM');
      const time24h = isPM && hour !== 12 
        ? hour + 12 
        : (!isPM && hour === 12 ? 0 : hour);
      
      return activeTimeTab === 'morning' 
        ? time24h >= 6 && time24h < 12 
        : time24h >= 12 && time24h < 22;
    });
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: '#666666',
      textAlign: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      flex: 1,
      textAlign: 'center',
    },
    rightPlaceholder: {
      width: 40,
    },
    content: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 3.84,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 16,
    },
    dateScroll: {
      marginBottom: 8,
    },
    dateContainer: {
      width: 72,
      height: 84,
      marginRight: 12,
      borderRadius: 12,
      overflow: 'hidden',
    },
    dateButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8F9FA',
      padding: 8,
    },
    dateButtonSelected: {
      backgroundColor: '#118347',
    },
    dateText: {
      fontSize: 24,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 4,
    },
    dateTextSelected: {
      color: '#FFFFFF',
    },
    dayText: {
      fontSize: 14,
      color: '#666666',
    },
    dayTextSelected: {
      color: '#FFFFFF',
    },
    timeSlotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -6,
    },
    timeSlot: {
      width: '33.33%',
      paddingHorizontal: 6,
      paddingVertical: 6,
    },
    timeSlotButton: {
      height: 44,
      borderRadius: 8,
      backgroundColor: '#F8F9FA',
      justifyContent: 'center',
      alignItems: 'center',
    },
    timeSlotButtonSelected: {
      backgroundColor: '#118347',
    },
    timeSlotButtonDisabled: {
      backgroundColor: '#F0F0F0',
    },
    timeSlotText: {
      fontSize: 14,
      color: '#000000',
      fontWeight: '500',
    },
    timeSlotTextSelected: {
      color: '#FFFFFF',
    },
    timeSlotTextDisabled: {
      color: '#999999',
    },
    sessionTypeContainer: {
      marginBottom: 8,
    },
    sessionTypeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      marginBottom: 12,
    },
    sessionTypeSelected: {
      backgroundColor: 'rgba(17, 131, 71, 0.1)',
      borderWidth: 1,
      borderColor: '#118347',
    },
    sessionTypeInfo: {
      flex: 1,
      marginLeft: 12,
    },
    sessionTypeName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 4,
    },
    sessionTypeNameSelected: {
      color: '#118347',
    },
    sessionTypeDescription: {
      fontSize: 14,
      color: '#666666',
    },
    sessionTypeDescriptionSelected: {
      color: '#444444',
    },
    sessionTypePrice: {
      fontSize: 16,
      fontWeight: '600',
      color: '#118347',
    },
    sessionTypePriceSelected: {
      color: '#118347',
    },
    footer: {
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
    },
    continueButton: {
      height: 56,
      backgroundColor: '#118347',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    continueButtonDisabled: {
      backgroundColor: '#E0E0E0',
    },
    continueButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginRight: 8,
    },
    closedCenterContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      marginTop: 8,
    },
    closedCenterText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333333',
      marginTop: 16,
      textAlign: 'center',
    },
    closedCenterSubText: {
      fontSize: 14,
      color: '#666666',
      marginTop: 8,
      textAlign: 'center',
    },
    timeTabContainer: {
      flexDirection: 'row',
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      padding: 4,
      marginBottom: 16,
    },
    timeTabButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 6,
    },
    timeTabButtonActive: {
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    timeTabText: {
      fontSize: 14,
      color: '#666666',
      fontWeight: '500',
    },
    timeTabTextActive: {
      color: '#118347',
      fontWeight: '600',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#118347" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={true}
      />
      
      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Session</Text>
        <View style={styles.rightPlaceholder} />
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Selection Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Date</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.dateScroll}
          >
            {getNextDays().map((date, index) => (
              <View key={index} style={styles.dateContainer}>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && styles.dateButtonSelected
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[
                    styles.dateText,
                    selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && styles.dateTextSelected
                  ]}>
                    {format(date, 'd')}
                  </Text>
                  <Text style={[
                    styles.dayText,
                    selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && styles.dayTextSelected
                  ]}>
                    {formatDayName(date)}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Time Selection Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Time</Text>
          
          {isCenterClosed ? (
            <View style={styles.closedCenterContainer}>
              <Ionicons name="time-outline" size={48} color="#666666" />
              <Text style={styles.closedCenterText}>Center is closed on this date</Text>
              <Text style={styles.closedCenterSubText}>Please select another date to continue</Text>
            </View>
          ) : (
            <>
              {/* Time Tab Buttons */}
              <View style={styles.timeTabContainer}>
                <TouchableOpacity 
                  style={[
                    styles.timeTabButton,
                    activeTimeTab === 'morning' && styles.timeTabButtonActive
                  ]}
                  onPress={() => setActiveTimeTab('morning')}
                >
                  <Text style={[
                    styles.timeTabText,
                    activeTimeTab === 'morning' && styles.timeTabTextActive
                  ]}>Morning</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.timeTabButton,
                    activeTimeTab === 'evening' && styles.timeTabButtonActive
                  ]}
                  onPress={() => setActiveTimeTab('evening')}
                >
                  <Text style={[
                    styles.timeTabText,
                    activeTimeTab === 'evening' && styles.timeTabTextActive
                  ]}>Evening</Text>
                </TouchableOpacity>
              </View>

              {/* Time Slots Grid */}
              <View style={styles.timeSlotGrid}>
                {getFilteredTimeSlots().map((slot, index) => (
                  <View key={index} style={styles.timeSlot}>
                    <TouchableOpacity
                      style={[
                        styles.timeSlotButton,
                        selectedTime === slot.time && styles.timeSlotButtonSelected,
                        !slot.available && styles.timeSlotButtonDisabled
                      ]}
                      onPress={() => handleTimeSlotSelect(slot)}
                      disabled={!slot.available}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        selectedTime === slot.time && styles.timeSlotTextSelected,
                        !slot.available && styles.timeSlotTextDisabled
                      ]}>
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Session Type Card - Only show if center is open */}
        {!isCenterClosed && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Session Type</Text>
            <View style={styles.sessionTypeContainer}>
              {getSessionTypes(center).map((type, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.sessionTypeButton,
                    selectedSessionType?.id === type.id && styles.sessionTypeSelected
                  ]}
                  onPress={() => setSelectedSessionType(type)}
                >
                  <Ionicons 
                    name={type.id === 'personal' ? 'person-outline' : 'fitness-outline'} 
                    size={24} 
                    color={selectedSessionType?.id === type.id ? '#118347' : '#118347'} 
                  />
                  <View style={styles.sessionTypeInfo}>
                    <Text style={[
                      styles.sessionTypeName,
                      selectedSessionType?.id === type.id && styles.sessionTypeNameSelected
                    ]}>
                      {type.name}
                    </Text>
                    <Text style={[
                      styles.sessionTypeDescription,
                      selectedSessionType?.id === type.id && styles.sessionTypeDescriptionSelected
                    ]}>
                      {type.description}
                    </Text>
                  </View>
                  <Text style={[
                    styles.sessionTypePrice,
                    selectedSessionType?.id === type.id && styles.sessionTypePriceSelected
                  ]}>
                    ₹{type.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer with Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedDate || !selectedTime || !selectedSessionType || isCenterClosed) && styles.continueButtonDisabled
          ]}
          onPress={handlePreviewBooking}
          disabled={!selectedDate || !selectedTime || !selectedSessionType || isCenterClosed}
        >
          <Text style={styles.continueButtonText}>
            {isCenterClosed ? 'Center is Closed' : 'Continue to Preview'}
          </Text>
          {!isCenterClosed && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
      
      {/* Login Overlay for guest users */}
      <LoginOverlay 
        visible={showLoginOverlay}
        onClose={() => setShowLoginOverlay(false)}
        returnScreen="Booking"
        returnParams={loginReturnParams}
      />
    </SafeAreaView>
  );
} 