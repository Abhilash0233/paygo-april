import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import CenterDetailScreen from '../screens/home/CenterDetailScreen';
import FitnessCategoryDetailScreen from '../screens/fitness/FitnessCategoryDetailScreen';
import { FitnessCategory } from '../screens/fitness/FitnessCategoryDetailScreen';
import BookingConfirmationScreen from '../screens/booking/BookingConfirmationScreen';

// Define the type for our home stack navigator
export type HomeStackParamList = {
  HomeMain: {
    showWelcomeOverlay?: boolean;
    isFirstTimeUser?: boolean;
    userId?: string;
  };
  CenterDetail: { 
    centerId: string;
    distance?: string;
    userCoordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  FitnessCategoryDetail: { category: FitnessCategory };
  BookingConfirmation: {
    bookingId: string;
    centerName: string;
    date: string;
    timeSlot: string;
    price: number;
    isRescheduled?: boolean;
    sessionType?: string;
    centerCategory?: string;
  };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen}
        initialParams={{
          showWelcomeOverlay: false,
          isFirstTimeUser: false,
          userId: undefined
        }}
      />
      <Stack.Screen name="CenterDetail" component={CenterDetailScreen} />
      <Stack.Screen name="FitnessCategoryDetail" component={FitnessCategoryDetailScreen} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    </Stack.Navigator>
  );
}

export default HomeStack; 