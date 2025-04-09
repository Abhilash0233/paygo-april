import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import BookingsListScreen from '../screens/booking/BookingsListScreen';
import BookingDetailsScreen from '../screens/booking/BookingDetailsScreen';
// Import QRScanner if it exists, or create a placeholder
import QRScannerScreen from '../screens/booking/QRScannerScreen';

// Define stack param types
export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetails: {
    bookingId: string;
    bookingData: {
      id: string;
      bookingId: string; // The generated booking ID
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
    };
  };
  QRScanner: { bookingId: string };
  HomeScreen: undefined; // Added for navigation from empty state
  Booking: { 
    centerId: string; 
    isRescheduling?: boolean; 
    originalBookingId?: string;
    originalDate?: string;
    originalTimeSlot?: string;
  };
  BookingPreview: {
    centerId: string;
    centerName: string;
    centerImage?: string;
    date: string;
    formattedDate: string;
    timeSlot: string;
    sessionType: any;
    totalAmount: number;
    walletBalance: number;
    isRescheduling?: boolean;
    originalBookingId?: string;
  };
};

const Stack = createStackNavigator<BookingsStackParamList>();

function BookingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="BookingsList" component={BookingsListScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
    </Stack.Navigator>
  );
}

export default BookingsStack; 